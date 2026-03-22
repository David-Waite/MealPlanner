import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  where,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { recipeConverter } from "./firestoreTypes";
import type { FirestoreRecipe, FirestoreShoppingListItem, FirestoreShoppingList } from "./firestoreTypes";
import type { AppState, Meal, CustomUnit, ShoppingListSettings } from "../types";

// localStorage key — value is the uid that was last synced on this device.
// Used to skip redundant syncs on subsequent sign-ins.
export const CLOUD_SYNCED_KEY = "mealplanner_cloud_synced";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mealToFirestore(
  meal: Meal,
  uid: string,
  allCustomUnits: CustomUnit[]
): FirestoreRecipe {
  const usedIngredientIds = new Set(meal.ingredients.map((i) => i.ingredientId));
  const relevantCustomUnits = allCustomUnits.filter((cu) =>
    usedIngredientIds.has(cu.ingredientId)
  );
  const now = Timestamp.now();

  return {
    id: meal.id,
    ownerId: uid,
    name: meal.name,
    servings: meal.servings,
    description: null,
    instructions: [],
    photoUrl: meal.photoUrl || null,
    tags: meal.tags || [],
    ingredients: meal.ingredients,
    customUnits: relevantCustomUnits,
    visibility: "private",
    globalStatus: "none",
    rejectionReason: null,
    sharedWith: [],
    bookmarkedFromId: null,
    originalOwnerId: null,
    createdAt: now,
    updatedAt: now,
    localUpdatedAt: meal.localUpdatedAt || 0,
  };
}

function firestoreRecipeToMeal(recipe: FirestoreRecipe): Meal {
  return {
    id: recipe.id,
    name: recipe.name,
    servings: recipe.servings,
    photoUrl: recipe.photoUrl || "",
    tags: recipe.tags,
    ingredients: recipe.ingredients,
    localUpdatedAt: recipe.localUpdatedAt,
  };
}

// ---------------------------------------------------------------------------
// migrateLocalToCloud
// Runs once after sign-up. Pushes all local state to Firestore.
// ---------------------------------------------------------------------------

export async function migrateLocalToCloud(
  uid: string,
  state: AppState
): Promise<void> {
  // Write user document (plan, customUnits, settings)
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      customUnits: state.customUnits,
      plan: state.plan,
      selectedUserIds: state.selectedUserIds,
      shoppingListSettings: state.shoppingListSettings,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  // Write recipes in batches (Firestore max 500 ops per batch)
  const BATCH_SIZE = 490;
  for (let i = 0; i < state.meals.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = state.meals.slice(i, i + BATCH_SIZE);
    chunk.forEach((meal) => {
      const recipeRef = doc(
        collection(db, "recipes").withConverter(recipeConverter),
        meal.id
      );
      batch.set(recipeRef, mealToFirestore(meal, uid, state.customUnits));
    });
    await batch.commit();
  }

  localStorage.setItem(CLOUD_SYNCED_KEY, uid);
}

// ---------------------------------------------------------------------------
// syncFromCloud
// Runs on sign-in when this device hasn't synced yet.
// Merges Firestore recipes with local recipes — higher localUpdatedAt wins.
// Returns the merged meals + customUnits to be dispatched into app state.
// ---------------------------------------------------------------------------

export async function syncFromCloud(
  uid: string,
  localMeals: Meal[],
  localCustomUnits: CustomUnit[]
): Promise<{ meals: Meal[]; customUnits: CustomUnit[] }> {
  const recipesRef = collection(db, "recipes").withConverter(recipeConverter);
  const q = query(recipesRef, where("ownerId", "==", uid));
  const snapshot = await getDocs(q);
  const cloudRecipes = snapshot.docs.map((d) => d.data());

  const localMap = new Map(localMeals.map((m) => [m.id, m]));
  const cloudMap = new Map(cloudRecipes.map((r) => [r.id, r]));
  const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);

  const mergedMeals: Meal[] = [];
  const batch = writeBatch(db);
  let batchCount = 0;

  for (const id of allIds) {
    const local = localMap.get(id);
    const cloud = cloudMap.get(id);

    if (local && !cloud) {
      // Only local — push to Firestore
      const recipeRef = doc(
        collection(db, "recipes").withConverter(recipeConverter),
        id
      );
      batch.set(recipeRef, mealToFirestore(local, uid, localCustomUnits));
      batchCount++;
      mergedMeals.push(local);
    } else if (cloud && !local) {
      // Only in Firestore — bring into local state
      mergedMeals.push(firestoreRecipeToMeal(cloud));
    } else if (local && cloud) {
      if ((local.localUpdatedAt || 0) >= cloud.localUpdatedAt) {
        // Local is newer or equal — local wins, push update to Firestore
        const recipeRef = doc(
          collection(db, "recipes").withConverter(recipeConverter),
          id
        );
        batch.set(recipeRef, mealToFirestore(local, uid, localCustomUnits));
        batchCount++;
        mergedMeals.push(local);
      } else {
        // Cloud is newer — use cloud version
        mergedMeals.push(firestoreRecipeToMeal(cloud));
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  // Merge customUnits: local takes priority, add any from cloud not in local
  const customUnitMap = new Map(localCustomUnits.map((cu) => [cu.id, cu]));
  cloudRecipes.forEach((r) =>
    r.customUnits.forEach((cu) => {
      if (!customUnitMap.has(cu.id)) customUnitMap.set(cu.id, cu);
    })
  );

  localStorage.setItem(CLOUD_SYNCED_KEY, uid);

  return {
    meals: mergedMeals,
    customUnits: Array.from(customUnitMap.values()),
  };
}

// ---------------------------------------------------------------------------
// syncShoppingList
// Archives any existing active list for this user, then writes a new one.
// Returns the new Firestore document ID.
// ---------------------------------------------------------------------------

export async function syncShoppingList(
  uid: string,
  listName: string,
  items: FirestoreShoppingListItem[],
  settings: ShoppingListSettings
): Promise<string> {
  // Archive existing active lists
  const q = query(
    collection(db, "shoppingLists"),
    where("ownerId", "==", uid),
    where("status", "==", "active")
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    const batch = writeBatch(db);
    existing.docs.forEach((d) => batch.update(d.ref, { status: "archived" }));
    await batch.commit();
  }

  // Write new active list
  const listRef = doc(collection(db, "shoppingLists"));
  const listData: Omit<FirestoreShoppingList, "id"> = {
    ownerId: uid,
    name: listName,
    syncedAt: Timestamp.now(),
    status: "active",
    settings,
    items,
  };
  await setDoc(listRef, listData);
  return listRef.id;
}

// ---------------------------------------------------------------------------
// toggleShoppingListItem
// Updates a single item's checked state in an active shopping list.
// ---------------------------------------------------------------------------

export async function toggleShoppingListItem(
  listId: string,
  items: FirestoreShoppingListItem[],
  ingredientId: string,
  checked: boolean
): Promise<void> {
  const listRef = doc(db, "shoppingLists", listId);
  const updatedItems = items.map((item) =>
    item.id === ingredientId ? { ...item, checked } : item
  );
  await updateDoc(listRef, { items: updatedItems });
}
