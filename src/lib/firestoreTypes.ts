import { Timestamp, QueryDocumentSnapshot } from "firebase/firestore";
import type { FirestoreDataConverter, SnapshotOptions, DocumentData } from "firebase/firestore";
import type { RecipeIngredient, CustomUnit, UnitRef } from "../types";

// ---------------------------------------------------------------------------
// User document  (users/{userId})
// ---------------------------------------------------------------------------

export interface FirestoreUser {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const userConverter: FirestoreDataConverter<FirestoreUser> = {
  toFirestore(user: FirestoreUser): DocumentData {
    const { uid, ...data } = user;
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): FirestoreUser {
    const data = snapshot.data(options);
    return {
      uid: snapshot.id,
      username: data.username,
      displayName: data.displayName,
      email: data.email,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

// ---------------------------------------------------------------------------
// Recipe document  (recipes/{recipeId})
// ---------------------------------------------------------------------------

export type RecipeVisibility = "private" | "friends" | "global";
export type RecipeGlobalStatus = "none" | "pending" | "approved" | "rejected";

export interface FirestoreRecipe {
  id: string;
  ownerId: string;
  name: string;
  servings: number;
  description: string | null;      // required for global submission
  instructions: string[];          // ordered steps; required for global
  photoUrl: string | null;         // Firebase Storage URL; required for global
  tags: string[];                  // required for global
  ingredients: RecipeIngredient[];
  customUnits: CustomUnit[];
  visibility: RecipeVisibility;
  globalStatus: RecipeGlobalStatus;
  rejectionReason: string | null;
  sharedWith: string[];            // userIds for per-recipe friend sharing
  bookmarkedFromId: string | null; // original recipeId if this is a bookmarked copy
  originalOwnerId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  localUpdatedAt: number;          // client Date.now() — used for merge conflict resolution
}

export const recipeConverter: FirestoreDataConverter<FirestoreRecipe> = {
  toFirestore(recipe: FirestoreRecipe): DocumentData {
    const { id, ...data } = recipe;
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): FirestoreRecipe {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ownerId: data.ownerId,
      name: data.name,
      servings: data.servings ?? 1,
      description: data.description ?? null,
      instructions: data.instructions ?? [],
      photoUrl: data.photoUrl ?? null,
      tags: data.tags ?? [],
      ingredients: data.ingredients ?? [],
      customUnits: data.customUnits ?? [],
      visibility: data.visibility ?? "private",
      globalStatus: data.globalStatus ?? "none",
      rejectionReason: data.rejectionReason ?? null,
      sharedWith: data.sharedWith ?? [],
      bookmarkedFromId: data.bookmarkedFromId ?? null,
      originalOwnerId: data.originalOwnerId ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      localUpdatedAt: data.localUpdatedAt ?? 0,
    };
  },
};

// ---------------------------------------------------------------------------
// Shopping list document  (shoppingLists/{listId})
// ---------------------------------------------------------------------------

export interface FirestoreShoppingListItemDetail {
  mealName: string;
  quantity: number;
  unitRef: UnitRef;
}

export interface FirestoreShoppingListItem {
  id: string;
  ingredientName: string;
  category: string;
  totalQuantity: number;
  unitRef: UnitRef;
  checked: boolean;
  details: FirestoreShoppingListItemDetail[];
}

export interface FirestoreShoppingList {
  id: string;
  ownerId: string;
  name: string;
  syncedAt: Timestamp;
  status: "active" | "archived";
  settings: {
    unitSystem: "metric" | "imperial";
    showCustomLabels: boolean;
  };
  items: FirestoreShoppingListItem[];
}

export const shoppingListConverter: FirestoreDataConverter<FirestoreShoppingList> =
  {
    toFirestore(list: FirestoreShoppingList): DocumentData {
      const { id, ...data } = list;
      return data;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): FirestoreShoppingList {
      const data = snapshot.data(options);
      return {
        id: snapshot.id,
        ownerId: data.ownerId,
        name: data.name,
        syncedAt: data.syncedAt,
        status: data.status ?? "active",
        settings: data.settings ?? {
          unitSystem: "metric",
          showCustomLabels: true,
        },
        items: data.items ?? [],
      };
    },
  };

// ---------------------------------------------------------------------------
// Friendship document  (friendships/{friendshipId})
// ---------------------------------------------------------------------------

export type FriendshipStatus = "pending" | "accepted" | "declined";

export interface FirestoreFriendship {
  id: string;
  userIds: [string, string];
  requesterId: string;
  status: FriendshipStatus;
  shareAll: Record<string, boolean>; // { [userId]: true } means that user shares all recipes
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const friendshipConverter: FirestoreDataConverter<FirestoreFriendship> =
  {
    toFirestore(friendship: FirestoreFriendship): DocumentData {
      const { id, ...data } = friendship;
      return data;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): FirestoreFriendship {
      const data = snapshot.data(options);
      return {
        id: snapshot.id,
        userIds: data.userIds,
        requesterId: data.requesterId,
        status: data.status ?? "pending",
        shareAll: data.shareAll ?? {},
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    },
  };
