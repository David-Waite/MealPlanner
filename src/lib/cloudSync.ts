import {
  collection,
  collectionGroup,
  doc,
  writeBatch,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  deleteDoc,
  Timestamp,
  updateDoc,
  limit,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  recipeConverter,
  plannedMealConverter,
  friendshipConverter,
  userConverter,
  globalIngredientConverter,
} from "./firestoreTypes";
import type {
  FirestoreRecipe,
  FirestoreShoppingListItem,
  FirestoreShoppingList,
  FirestoreUser,
} from "./firestoreTypes";
import type { AppState, Meal, PlannedMeal, CustomUnit, ShoppingListSettings, User, Ingredient } from "../types";

// localStorage key — value is the uid that was last synced on this device.
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
    description: meal.description ?? null,
    instructions: meal.instructions ?? [],
    photoUrl: meal.photoUrl || null,
    tags: meal.tags || [],
    ingredients: meal.ingredients,
    customUnits: relevantCustomUnits,
    visibility: meal.visibility ?? "private",
    globalStatus: meal.globalStatus ?? "none",
    rejectionReason: meal.rejectionReason ?? null,
    sharedWith: meal.sharedWith || [],
    bookmarkedFromId: meal.bookmarkedFromId ?? null,
    originalOwnerId: meal.originalOwnerId ?? null,
    createdAt: now,
    updatedAt: now,
    localUpdatedAt: meal.localUpdatedAt || 0,
  };
}

export function firestoreRecipeToMeal(recipe: FirestoreRecipe): Meal {
  return {
    id: recipe.id,
    name: recipe.name,
    servings: recipe.servings,
    photoUrl: recipe.photoUrl || "",
    tags: recipe.tags,
    ingredients: recipe.ingredients,
    description: recipe.description ?? undefined,
    instructions: recipe.instructions?.length ? recipe.instructions : undefined,
    globalStatus: recipe.globalStatus,
    visibility: recipe.visibility,
    bookmarkedFromId: recipe.bookmarkedFromId,
    originalOwnerId: recipe.originalOwnerId,
    rejectionReason: recipe.rejectionReason,
    localUpdatedAt: recipe.localUpdatedAt,
    sharedWith: recipe.sharedWith,
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
  // Write user document (profile settings — plan lives in subcollection)
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      customUnits: state.customUnits,
      users: state.users,
      shoppingListSettings: state.shoppingListSettings,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  const BATCH_SIZE = 490;

  // Write recipes to users/{uid}/recipes subcollection
  for (let i = 0; i < state.meals.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    state.meals.slice(i, i + BATCH_SIZE).forEach((meal) => {
      const recipeRef = doc(
        collection(db, "users", uid, "recipes").withConverter(recipeConverter),
        meal.id
      );
      batch.set(recipeRef, mealToFirestore(meal, uid, state.customUnits));
    });
    await batch.commit();
  }

  // Write plan entries to users/{uid}/plan subcollection
  for (let i = 0; i < state.plan.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    state.plan.slice(i, i + BATCH_SIZE).forEach((plannedMeal) => {
      const ref = doc(collection(db, "users", uid, "plan"), plannedMeal.instanceId);
      batch.set(ref, {
        mealId: plannedMeal.mealId,
        date: plannedMeal.date,
        mealType: plannedMeal.mealType,
        assignedUsers: plannedMeal.assignedUsers,
      });
    });
    await batch.commit();
  }

  localStorage.setItem(CLOUD_SYNCED_KEY, uid);
}

// ---------------------------------------------------------------------------
// syncFromCloud
// Runs on sign-in when this device hasn't synced yet.
// Merges Firestore recipes with local recipes — higher localUpdatedAt wins.
// Cloud plan overwrites local plan.
// Returns merged meals, customUnits, and plan to dispatch into app state.
// ---------------------------------------------------------------------------

export async function syncFromCloud(
  uid: string,
  localMeals: Meal[],
  localCustomUnits: CustomUnit[]
): Promise<{ meals: Meal[]; customUnits: CustomUnit[]; plan: PlannedMeal[]; users: User[] | null; ingredients: Ingredient[] }> {
  console.log("[syncFromCloud] Starting for uid:", uid, "| localMeals:", localMeals.length, "| localCustomUnits:", localCustomUnits.length);
  // Read recipes from subcollection
  const recipesRef = collection(db, "users", uid, "recipes").withConverter(recipeConverter);
  console.log("[syncFromCloud] Reading recipes from users/", uid, "/recipes ...");
  const snapshot = await getDocs(query(recipesRef));
  console.log("[syncFromCloud] Got", snapshot.docs.length, "recipes from Firestore");
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
      // Only local — push to Firestore subcollection
      const recipeRef = doc(
        collection(db, "users", uid, "recipes").withConverter(recipeConverter),
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
          collection(db, "users", uid, "recipes").withConverter(recipeConverter),
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
    console.log("[syncFromCloud] Writing", batchCount, "local-only recipes up to Firestore...");
    await batch.commit();
  }

  // Merge customUnits: local takes priority, add any from cloud not in local
  const customUnitMap = new Map(localCustomUnits.map((cu) => [cu.id, cu]));
  cloudRecipes.forEach((r) =>
    r.customUnits.forEach((cu) => {
      if (!customUnitMap.has(cu.id)) customUnitMap.set(cu.id, cu);
    })
  );

  // Read plan from subcollection — cloud overwrites local
  console.log("[syncFromCloud] Reading plan from users/", uid, "/plan ...");
  const planRef = collection(db, "users", uid, "plan").withConverter(plannedMealConverter);
  const planSnap = await getDocs(query(planRef));
  console.log("[syncFromCloud] Got", planSnap.docs.length, "plan entries from Firestore");
  const plan: PlannedMeal[] = planSnap.docs.map((d) => {
    const p = d.data();
    return {
      instanceId: p.instanceId,
      mealId: p.mealId,
      date: p.date,
      mealType: p.mealType,
      assignedUsers: p.assignedUsers,
    };
  });

  // Read user document to get household users array
  const userDocRef = doc(db, "users", uid);
  const userDocSnap = await getDoc(userDocRef);
  const cloudUsers: User[] | null = userDocSnap.exists()
    ? (userDocSnap.data().users ?? null)
    : null;

  // Load ingredients: global catalogue + user's local (unreviewed) ingredients
  const [globalIngSnap, localIngSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "globalIngredients").withConverter(globalIngredientConverter),
        orderBy("name")
      )
    ),
    getDocs(
      collection(db, "users", uid, "localIngredients").withConverter(globalIngredientConverter)
    ),
  ]);

  // Global ingredients first, local ingredients override/extend (same-ID wins for local)
  const ingredientMap = new Map<string, Ingredient>();
  globalIngSnap.docs.forEach((d) => ingredientMap.set(d.id, d.data()));
  localIngSnap.docs.forEach((d) => ingredientMap.set(d.id, d.data()));

  const ingredients = Array.from(ingredientMap.values());

  // Fold ingredient customUnits into the flat customUnits map
  // (this replaces the old approach of embedding them on recipe docs)
  ingredients.forEach((ing) => {
    (ing.customUnits ?? []).forEach((cu) => {
      if (!customUnitMap.has(cu.id)) customUnitMap.set(cu.id, cu);
    });
  });

  localStorage.setItem(CLOUD_SYNCED_KEY, uid);

  return {
    meals: mergedMeals,
    customUnits: Array.from(customUnitMap.values()),
    plan,
    users: cloudUsers,
    ingredients,
  };
}

// ---------------------------------------------------------------------------
// syncShoppingList
// Archives any existing active list, then writes a new one.
// Returns the new Firestore document ID.
// ---------------------------------------------------------------------------

export async function syncShoppingList(
  uid: string,
  listName: string,
  items: FirestoreShoppingListItem[],
  settings: ShoppingListSettings
): Promise<string> {
  const listsCol = collection(db, "users", uid, "shoppingLists");

  // Archive existing active lists
  const q = query(listsCol, where("status", "==", "active"));
  const existing = await getDocs(q);
  if (!existing.empty) {
    const batch = writeBatch(db);
    existing.docs.forEach((d) => batch.update(d.ref, { status: "archived" }));
    await batch.commit();
  }

  // Write new active list
  const listRef = doc(listsCol);
  const listData: Omit<FirestoreShoppingList, "id"> = {
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
  uid: string,
  listId: string,
  items: FirestoreShoppingListItem[],
  ingredientId: string,
  checked: boolean
): Promise<void> {
  const listRef = doc(db, "users", uid, "shoppingLists", listId);
  const updatedItems = items.map((item) =>
    item.id === ingredientId ? { ...item, checked } : item
  );
  await updateDoc(listRef, { items: updatedItems });
}

// ---------------------------------------------------------------------------
// searchUsersByUsername
// Returns users whose username starts with the query string (prefix search).
// ---------------------------------------------------------------------------

export async function searchUsersByUsername(
  queryStr: string,
  currentUid: string
): Promise<FirestoreUser[]> {
  if (queryStr.trim().length < 2) return [];
  const lower = queryStr.trim().toLowerCase();
  const usersRef = collection(db, "users").withConverter(userConverter);
  const q = query(
    usersRef,
    where("username", ">=", lower),
    where("username", "<=", lower + "\uf8ff"),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data()).filter((u) => u.uid !== currentUid);
}

// ---------------------------------------------------------------------------
// sendFriendRequest
// ---------------------------------------------------------------------------

export async function sendFriendRequest(
  uid: string,
  targetUid: string
): Promise<void> {
  const ref = doc(collection(db, "friendships").withConverter(friendshipConverter));
  await setDoc(ref, {
    id: ref.id,
    userIds: [uid, targetUid],
    requesterId: uid,
    status: "pending",
    shareAll: {},
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

// ---------------------------------------------------------------------------
// respondToFriendRequest
// ---------------------------------------------------------------------------

export async function respondToFriendRequest(
  friendshipId: string,
  accept: boolean
): Promise<void> {
  await updateDoc(doc(db, "friendships", friendshipId), {
    status: accept ? "accepted" : "declined",
    updatedAt: Timestamp.now(),
  });
}

// ---------------------------------------------------------------------------
// setShareAll
// Toggles share-all for the current user in a friendship.
// When enabled, adds friendUid to ALL of uid's recipes' sharedWith arrays.
// When disabled, removes friendUid from ALL.
// ---------------------------------------------------------------------------

export async function setShareAll(
  friendshipId: string,
  uid: string,
  friendUid: string,
  value: boolean
): Promise<void> {
  // Fetch all of this user's recipes from their subcollection
  const recipesSnap = await getDocs(
    collection(db, "users", uid, "recipes").withConverter(recipeConverter)
  );

  // Batch update sharedWith on every recipe
  const BATCH_SIZE = 490;
  const recipeDocs = recipesSnap.docs;
  for (let i = 0; i < recipeDocs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    recipeDocs.slice(i, i + BATCH_SIZE).forEach((d) => {
      const current: string[] = d.data().sharedWith || [];
      const updated = value
        ? current.includes(friendUid) ? current : [...current, friendUid]
        : current.filter((id) => id !== friendUid);
      batch.update(d.ref, { sharedWith: updated });
    });
    await batch.commit();
  }

  // Update the friendship doc's shareAll field
  await updateDoc(doc(db, "friendships", friendshipId), {
    [`shareAll.${uid}`]: value,
    updatedAt: Timestamp.now(),
  });
}

// ---------------------------------------------------------------------------
// submitGlobalRecipe
// Sets visibility → "global" and globalStatus → "pending" on the user's recipe.
// ---------------------------------------------------------------------------

export async function submitGlobalRecipe(recipeId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid, "recipes", recipeId), {
    visibility: "global",
    globalStatus: "pending",
    rejectionReason: null,
    updatedAt: Timestamp.now(),
  });
}

// ---------------------------------------------------------------------------
// approveRecipe
// Admin only. Updates the user's recipe to "approved" and copies it to
// the top-level globalRecipes collection.
// ---------------------------------------------------------------------------

export async function approveRecipe(recipeId: string, ownerId: string): Promise<void> {
  const recipeRef = doc(
    collection(db, "users", ownerId, "recipes").withConverter(recipeConverter),
    recipeId
  );

  // Get the recipe so we can copy it to globalRecipes
  const recipeSnap = await getDoc(recipeRef);
  if (!recipeSnap.exists()) throw new Error("Recipe not found");
  const recipe = recipeSnap.data();

  const now = Timestamp.now();

  // Update status on the owner's copy
  await updateDoc(recipeRef, {
    globalStatus: "approved",
    rejectionReason: null,
    updatedAt: now,
  });

  // Copy to top-level globalRecipes collection
  const globalRef = doc(
    collection(db, "globalRecipes").withConverter(recipeConverter),
    recipeId
  );
  await setDoc(globalRef, {
    ...recipe,
    globalStatus: "approved",
    visibility: "global",
    rejectionReason: null,
    updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// rejectRecipe
// Admin only. Updates the user's recipe to "rejected" with an optional reason.
// ---------------------------------------------------------------------------

export async function rejectRecipe(
  recipeId: string,
  ownerId: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db, "users", ownerId, "recipes", recipeId), {
    globalStatus: "rejected",
    rejectionReason: reason || null,
    updatedAt: Timestamp.now(),
  });
}

// ---------------------------------------------------------------------------
// bookmarkRecipe
// Copies a global recipe into the current user's recipes subcollection.
// ---------------------------------------------------------------------------

export async function bookmarkRecipe(
  recipe: FirestoreRecipe & { ownerDisplayName: string },
  uid: string
): Promise<FirestoreRecipe> {
  const newId = crypto.randomUUID();
  const now = Timestamp.now();
  const copy: FirestoreRecipe = {
    ...recipe,
    id: newId,
    ownerId: uid,
    visibility: "private",
    globalStatus: "none",
    sharedWith: [],
    bookmarkedFromId: recipe.id,
    originalOwnerId: recipe.ownerId,
    createdAt: now,
    updatedAt: now,
    localUpdatedAt: Date.now(),
  };
  const ref = doc(
    collection(db, "users", uid, "recipes").withConverter(recipeConverter),
    newId
  );
  await setDoc(ref, copy);
  return copy;
}

// ---------------------------------------------------------------------------
// loadGlobalRecipes
// Returns all recipes from the globalRecipes collection with ownerDisplayName.
// ---------------------------------------------------------------------------

export async function loadGlobalRecipes(): Promise<
  Array<FirestoreRecipe & { ownerDisplayName: string }>
> {
  const snap = await getDocs(
    collection(db, "globalRecipes").withConverter(recipeConverter)
  );

  if (snap.empty) return [];

  const ownerIds = [...new Set(snap.docs.map((d) => d.data().ownerId))];
  const displayNames: Record<string, string> = {};
  await Promise.all(
    ownerIds.map(async (ownerId) => {
      const userSnap = await getDoc(doc(db, "users", ownerId));
      if (userSnap.exists()) {
        displayNames[ownerId] = (userSnap.data() as { displayName: string }).displayName;
      }
    })
  );

  return snap.docs.map((d) => {
    const r = d.data();
    return { ...r, ownerDisplayName: displayNames[r.ownerId] || r.ownerId };
  });
}

// ---------------------------------------------------------------------------
// loadFriendsRecipes
// Returns all recipes shared with uid across all users' recipe subcollections.
// Uses a collection group query — requires a Firestore composite index on
// (sharedWith array-contains + __name__).
// ---------------------------------------------------------------------------

export async function loadFriendsRecipes(
  uid: string
): Promise<Array<FirestoreRecipe & { ownerDisplayName: string }>> {
  console.log("[loadFriendsRecipes] Starting collectionGroup query for uid:", uid);
  const sharedSnap = await getDocs(
    query(
      collectionGroup(db, "recipes").withConverter(recipeConverter),
      where("sharedWith", "array-contains", uid)
    )
  );
  console.log("[loadFriendsRecipes] Got", sharedSnap.docs.length, "shared recipes");

  if (sharedSnap.empty) return [];

  const ownerIds = [...new Set(sharedSnap.docs.map((d) => d.data().ownerId))];
  const displayNames: Record<string, string> = {};
  await Promise.all(
    ownerIds.map(async (ownerId) => {
      const userSnap = await getDoc(doc(db, "users", ownerId));
      if (userSnap.exists()) {
        displayNames[ownerId] = (userSnap.data() as { displayName: string }).displayName;
      }
    })
  );

  return sharedSnap.docs.map((d) => {
    const r = d.data();
    return { ...r, ownerDisplayName: displayNames[r.ownerId] || r.ownerId };
  });
}

// ---------------------------------------------------------------------------
// Real-time mutation helpers
// Called directly after each local dispatch when the user is signed in,
// so Firestore stays in sync without relying on localStorage.
// ---------------------------------------------------------------------------

export async function saveRecipeToCloud(
  uid: string,
  meal: Meal,
  allCustomUnits: CustomUnit[]
): Promise<void> {
  const ref = doc(
    collection(db, "users", uid, "recipes").withConverter(recipeConverter),
    meal.id
  );
  await setDoc(ref, mealToFirestore(meal, uid, allCustomUnits));
}

export async function deleteRecipeFromCloud(
  uid: string,
  recipeId: string
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "recipes", recipeId));
}

export async function savePlanEntryToCloud(
  uid: string,
  plannedMeal: PlannedMeal
): Promise<void> {
  const ref = doc(db, "users", uid, "plan", plannedMeal.instanceId);
  await setDoc(ref, {
    mealId: plannedMeal.mealId,
    date: plannedMeal.date,
    mealType: plannedMeal.mealType,
    assignedUsers: plannedMeal.assignedUsers,
  });
}

export async function deletePlanEntryFromCloud(
  uid: string,
  instanceId: string
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "plan", instanceId));
}

export async function saveHouseholdUsers(
  uid: string,
  users: User[]
): Promise<void> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { users });
}
