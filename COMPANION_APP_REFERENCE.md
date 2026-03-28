# MealPlanner — Companion App Reference

> This document is a complete reference for Claude agents building a companion app to the MealPlanner web application. It covers all features, TypeScript types, Firestore data structures, and sync logic.

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [TypeScript Types](#2-typescript-types)
3. [Firestore Collections & Document Shapes](#3-firestore-collections--document-shapes)
4. [State Management](#4-state-management)
5. [Data Synchronization](#5-data-synchronization)
6. [Feature: Meal Library](#6-feature-meal-library)
7. [Feature: Meal Planner Grid](#7-feature-meal-planner-grid)
8. [Feature: Recipe Builder (Steps)](#8-feature-recipe-builder-steps)
9. [Feature: Shopping List](#9-feature-shopping-list)
10. [Feature: Friends & Sharing](#10-feature-friends--sharing)
11. [Feature: Favourites](#11-feature-favourites)
12. [Feature: Snacks](#12-feature-snacks)
13. [Feature: User Management (Household)](#13-feature-user-management-household)
14. [Feature: Authentication & Admin](#14-feature-authentication--admin)
15. [Cloud Sync Functions Reference](#15-cloud-sync-functions-reference)
16. [Persistence Strategy](#16-persistence-strategy)
17. [Key UI Patterns](#17-key-ui-patterns)

---

## 1. App Overview

MealPlanner is a React 18 web application (TypeScript, CSS Modules, Firebase) that helps households plan meals, manage recipes, track ingredients, and generate shopping lists.

**Main Areas:**
- **Meal Library** — A resizable left sidebar with three views: the user's own recipes (Library), globally published recipes (Discover), and friends' shared recipes (Friends).
- **Meal Planner Grid** — A virtualized infinite-scroll calendar grid where meals and snacks are planned per day and meal type (e.g. Breakfast, Lunch, Dinner).
- **Shopping List** — Aggregates ingredients from planned meals over a selected date range, with unit conversion, checked state, and cloud persistence.
- **Friends** — Friend requests, accept/decline, and recipe sharing controls.
- **Admin Panel** — Review queue for global recipe and snack submissions (admin users only).

**Tech Stack:**
- React 18 + TypeScript
- Firebase (Auth, Firestore, Storage)
- Redux-style Context + Reducer (no external state library)
- CSS Modules

---

## 2. TypeScript Types

All types live in `src/types/index.ts`.

### Units

```ts
type MetricUnit  = "g" | "kg" | "ml" | "l";
type ImperialUnit = "oz" | "lb" | "fl oz" | "pint";
type CookingUnit = "¼ tsp" | "½ tsp" | "tsp" | "½ tbsp" | "tbsp" | "cup" | "unit";
type CoreUnit    = MetricUnit | ImperialUnit | CookingUnit;

// UnitRef is the discriminated union used everywhere a unit is stored:
type UnitRef =
  | { type: "core"; unit: CoreUnit }
  | { type: "custom"; customUnitId: string };

interface CustomUnit {
  id: string;
  label: string;
  ingredientId: string;      // which ingredient this unit is for
  metricEquivalent?: number; // e.g. 240 (ml per cup)
  metricUnit?: MetricUnit;
}
```

### Ingredients

```ts
type IngredientCategory =
  | "Produce" | "Meat" | "Dairy" | "Pantry"
  | "Snacks" | "Household & Cleaning" | "Frozen" | "Other";

type GlobalStatus = "none" | "pending" | "approved" | "rejected" | "pending_update";

interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  perishable: boolean;
  isSnack?: boolean;         // true → appears in Snacks section
  photoUrl?: string;
  source?: "global" | "local";
  bookmarkedFromId?: string; // ID of the globalIngredient this was cloned from
  globalStatus?: GlobalStatus;
  customUnits?: CustomUnit[]; // units specific to this ingredient
}
```

### Meals / Recipes

```ts
type RecipeVisibility = "private" | "friends" | "global";

interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: UnitRef;
}

interface RecipeStepIngredient {
  ingredientId: string;
  quantity: number;
  unit: UnitRef;
}

interface RecipeStep {
  text: string;                             // plain text of the instruction
  stepIngredients: RecipeStepIngredient[];  // ingredients allocated to this step
}

interface Meal {
  id: string;
  name: string;
  photoUrl: string;
  servings: number;
  ingredients: RecipeIngredient[];
  tags: string[];
  description?: string;
  instructions?: string[];   // legacy flat string array (still written for back-compat)
  steps?: RecipeStep[];      // structured steps with inline ingredient allocation
  globalStatus?: GlobalStatus;
  visibility?: RecipeVisibility;
  bookmarkedFromId?: string | null;   // set when user bookmarks a global recipe
  originalOwnerId?: string | null;
  rejectionReason?: string | null;
  ownerDisplayName?: string;          // denormalized display name for UI
  localUpdatedAt?: number;            // Date.now() — used for conflict resolution
  sharedWith?: string[];              // list of friend UIDs with direct access
}
```

### Planning

```ts
interface PlannedMeal {
  instanceId: string;       // uuid — unique per planning event
  mealId: string;           // references Meal.id
  date: string;             // "YYYY-MM-DD"
  mealType: string;         // column name, e.g. "Dinner"
  assignedUsers: string[];  // User.id values
  portions?: number;        // multiplier on servings (default 1)
}

interface PlannedSnack {
  instanceId: string;
  ingredientId: string;     // references Ingredient.id
  quantity: number;
  unit: UnitRef;
  date: string;             // "YYYY-MM-DD"
  mealType: string;
  assignedUsers: string[];
}
```

### Household Users

```ts
interface User {
  id: string;
  initials: string;
  color: string;            // hex or CSS color
}
```

### App State

```ts
interface FavouriteItem {
  id: string;
  type: "meal" | "snack";
}

interface ShoppingListSettings {
  unitSystem: "metric" | "imperial";
  showCustomLabels: boolean;
}

interface AppState {
  meals: Meal[];
  ingredients: Ingredient[];
  users: User[];
  customUnits: CustomUnit[];
  plan: PlannedMeal[];
  snacks: PlannedSnack[];
  selectedUserIds: string[];
  selectedDates: string[];
  selectedPlannedMealInstanceId: string | null;
  mealColumns: string[];          // ordered list of meal type column names
  shoppingListSettings: ShoppingListSettings;
  favourites: FavouriteItem[];
}
```

---

## 3. Firestore Collections & Document Shapes

### Top-Level Collections

| Collection | Document ID | Purpose |
|---|---|---|
| `users` | `{uid}` | User profile + settings |
| `friendships` | auto-ID | Bidirectional friend relationships |
| `globalRecipes` | `{recipeId}` | Publicly approved recipes |
| `globalIngredients` | `{ingredientId}` | Publicly approved snack ingredients |

### User Document — `users/{uid}`

```
{
  uid: string,
  username: string,              // unique, used for friend search
  displayName: string,
  email: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isAdmin?: boolean,             // grants access to AdminPage
  users: User[],                 // household members
  customUnits: CustomUnit[],     // all custom units across all recipes
  mealColumns: string[],         // ordered meal type columns
  shoppingListSettings: { unitSystem, showCustomLabels },
  favourites: FavouriteItem[],
}
```

### User Subcollections

#### `users/{uid}/recipes/{recipeId}`

```
{
  id: string,
  ownerId: string,
  name: string,
  servings: number,
  description?: string,
  photoUrl: string,
  tags: string[],
  ingredients: RecipeIngredient[],
  instructions?: string[],       // legacy flat step texts
  steps?: RecipeStep[],          // structured steps (newer format)
  customUnits: CustomUnit[],     // only units used by this recipe's ingredients
  visibility: "private" | "friends" | "global",
  globalStatus: GlobalStatus,
  rejectionReason?: string,
  sharedWith: string[],          // friend UIDs
  bookmarkedFromId?: string,     // globalRecipes/{id} if bookmarked
  originalOwnerId?: string,
  ownerDisplayName?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  localUpdatedAt: number,        // milliseconds epoch
}
```

#### `users/{uid}/plan/{instanceId}`

```
{
  instanceId: string,
  mealId: string,
  date: string,          // "YYYY-MM-DD"
  mealType: string,
  assignedUsers: string[],
  portions?: number,
}
```

#### `users/{uid}/snacks/{instanceId}`

```
{
  instanceId: string,
  ingredientId: string,
  quantity: number,
  unit: UnitRef,
  date: string,
  mealType: string,
  assignedUsers: string[],
}
```

#### `users/{uid}/shoppingLists/{listId}`

```
{
  id: string,
  name: string,
  syncedAt: Timestamp,
  status: "active" | "archived",
  settings: { unitSystem, showCustomLabels },
  items: [
    {
      id: string,
      ingredientName: string,
      category: IngredientCategory,
      totalQuantity: number,
      unitRef: UnitRef,
      checked: boolean,
      lastDate: string,
      lastFormattedDate: string,
      details: [
        {
          date: string,
          formattedDate: string,
          mealName: string,
          quantity: number,
          unitRef: UnitRef,
        }
      ]
    }
  ]
}
```

#### `users/{uid}/localIngredients/{ingredientId}`

Unreviewed snack/ingredient submissions by this user.

```
{
  id: string,
  name: string,
  category: IngredientCategory,
  perishable: boolean,
  isSnack?: boolean,
  photoUrl?: string,
  globalStatus: GlobalStatus,   // "pending" | "rejected" | etc.
  bookmarkedFromId?: string,
  customUnits?: CustomUnit[],
}
```

### `friendships/{friendshipId}`

```
{
  id: string,
  userIds: [string, string],    // both participant UIDs
  requesterId: string,
  status: "pending" | "accepted" | "declined",
  shareAll: {
    [uid]: boolean,             // whether this user shares all their recipes
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**Notes:**
- Query with `where("userIds", "array-contains", uid)` to get all friendships for a user.
- `shareAll[uid] = true` means that uid shares all their recipes with the other person. When toggled, a batch update sets `sharedWith` on every one of their recipes.

### `globalRecipes/{recipeId}`

Same shape as `users/{uid}/recipes/{recipeId}` but only contains `approved` recipes copied here by the admin approval function.

### `globalIngredients/{ingredientId}`

Same shape as `users/{uid}/localIngredients/{ingredientId}` but only contains approved snacks.

---

## 4. State Management

The app uses a Redux-style pattern with React Context — no external library.

### Contexts

| Context | Hook | Contents |
|---|---|---|
| `AppStateContext` | `useAppState()` | The full `AppState` object (read-only) |
| `AppDispatchContext` | `useAppDispatch()` | Dispatch function |
| `AuthContext` | `useAuth()` | `{ user: FirebaseUser \| null, isAdmin: boolean }` |

### Action Types

```ts
// Meals
"ADD_MEAL" | "UPDATE_MEAL" | "DELETE_MEAL"

// Plan
"ADD_PLANNED_MEAL" | "REMOVE_PLANNED_MEAL" | "UPDATE_PLANNED_MEAL"

// Snacks
"ADD_PLANNED_SNACK" | "REMOVE_PLANNED_SNACK" | "UPDATE_PLANNED_SNACK"

// Ingredients
"ADD_INGREDIENT" | "UPDATE_INGREDIENT"

// Custom Units
"ADD_CUSTOM_UNIT" | "UPDATE_CUSTOM_UNIT" | "DELETE_CUSTOM_UNIT"

// Users (household)
"ADD_USER" | "UPDATE_USER" | "DELETE_USER"

// UI State
"SET_SELECTED_USERS" | "SET_SELECTED_DATES" | "SET_SELECTED_INSTANCE"

// Settings
"SET_SHOPPING_LIST_SETTINGS" | "TOGGLE_FAVOURITE"

// Columns
"ADD_MEAL_COLUMN" | "RENAME_MEAL_COLUMN" | "REMOVE_MEAL_COLUMN"

// Cloud merge (called once on sign-in)
"MERGE_CLOUD_DATA"
```

### Reducer Behaviour Notes

- `ADD_MEAL` / `UPDATE_MEAL` automatically stamp `localUpdatedAt: Date.now()`.
- `DELETE_USER` cascades: removes from `users[]`, `selectedUserIds`, plan assignments, snack assignments.
- `RENAME_MEAL_COLUMN` / `REMOVE_MEAL_COLUMN` cascade through all `plan[]` and `snacks[]` entries.
- `MERGE_CLOUD_DATA` replaces entire slices (meals, customUnits, plan, snacks, ingredients, users, favourites, mealColumns) with merged values.

---

## 5. Data Synchronization

### Before Sign-In

- All state persists to **localStorage** (key: `"shopSmartState"`).
- No Firestore reads or writes.
- On app load: `loadState()` in `persistence.ts` reads and migrates localStorage.
- Migration handles legacy unit format (plain strings → `UnitRef` objects).

### On Sign-In

1. `onAuthStateChanged` fires.
2. `syncFromCloud(uid, localMeals, localCustomUnits)` is called.
3. Cloud recipes are fetched from `users/{uid}/recipes`.
4. **Conflict resolution** per recipe: `localUpdatedAt` timestamp wins. If local >= cloud → push local to Firestore. If cloud > local → use cloud version.
5. Cloud plan and snacks overwrite local completely.
6. Global ingredients + user's `localIngredients` are loaded.
7. `MERGE_CLOUD_DATA` is dispatched to update React state.
8. From this point on, **localStorage is not used** — Firestore is the source of truth.

### While Signed In (Live Mutations)

Every mutation in the UI triggers a direct Firestore write:

| Action | Firestore call |
|---|---|
| Add / Edit meal | `saveRecipeToCloud(uid, meal, customUnits)` |
| Delete meal | `deleteRecipeFromCloud(uid, recipeId)` |
| Add / remove plan entry | `savePlanEntryToCloud` / `deletePlanEntryFromCloud` |
| Toggle favourite | `saveFavourites(uid, favourites)` |
| Add household user | `saveHouseholdUsers(uid, users)` |
| Rename / remove column | `renameMealColumnInCloud` / `removeMealColumnFromCloud` (batch) |
| Save shopping list | `syncShoppingList(uid, name, items, settings)` |

---

## 6. Feature: Meal Library

**Location:** `src/features/MealLibrary/`

### Three Views

| View | Contents | Source |
|---|---|---|
| Library | User's own recipes + snacks | `users/{uid}/recipes` + `ingredients` where `isSnack=true` |
| Discover | Globally approved recipes + snacks | `globalRecipes` + `globalIngredients` |
| Friends | Recipes shared by accepted friends | Collection group query: `recipes where sharedWith array-contains uid` |

### MealFormModal — Recipe Editor

Tabs within the form:

1. **Details** — Name, servings, photo, description.
2. **Ingredients** — Add/remove ingredient rows. Each row: ingredient (combobox), quantity (number), unit (select with metric/imperial/cooking/custom groups).
   - Can create custom units inline (e.g. "1 fillet").
3. **Recipe** (formerly "Instructions") — Rich step editor:
   - Remaining ingredient pills at top (shows how much of each ingredient is unallocated).
   - Each step uses `StepRichEditor` (contenteditable) — supports `@mention` dropdown with arrow-key navigation to link ingredients inline as styled chips.
   - After picking an ingredient via `@`, an inline qty + unit form appears; on confirm the chip is embedded in the step text.
   - "Update ingredient list" button syncs step totals back to the master ingredient list.
4. **Tags** — Select from predefined tag groups (Diet, Cuisine, Meal Type, Prep).
5. **Sharing** — Private / Friends / Global visibility. Per-friend access toggles.

### RecipeDetailModal — Read-Only View

Displays: hero image, title, attribution (`ownerDisplayName`), description, meta pills (servings, tags), ingredients list with formatted quantities, structured steps with inline ingredient pills per step.

### MealCard

- Displays recipe photo, name, tags, servings.
- Favourite toggle button.
- Serving tracker: shows how many servings are planned vs. total.
- Drag: sets `dataTransfer` with meal ID so it can be dropped onto planner grid.
- Owner: if `bookmarkedFromId` is set, shows bookmark icon.

### Recipe Tags (predefined)

```ts
const RECIPE_TAGS = {
  "Diet":      ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo"],
  "Cuisine":   ["Italian", "Asian", "Mexican", "Mediterranean", "American", "Indian"],
  "Meal Type": ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"],
  "Prep":      ["Quick", "Batch Cook", "Meal Prep", "One Pot", "Slow Cooker"],
}
```

### Global Recipe Submission Lifecycle

```
private
  → submit → globalStatus: "pending", visibility: "global"
  → admin approves → globalStatus: "approved", copied to globalRecipes/{id}
  → admin rejects → globalStatus: "rejected", rejectionReason: string

approved (in globalRecipes)
  → owner suggests update → globalStatus: "pending_update"
  → admin approves update → globalStatus: "approved", globalRecipes copy updated
  → admin rejects update → globalStatus: "approved" (reverted)
```

---

## 7. Feature: Meal Planner Grid

**Location:** `src/features/MealPlanner/`

### Grid Structure

- Virtual scroll window: 10,000 days (5,000 before + 5,000 after today).
- Each **row** = one date.
- Each **column** = one meal type (from `mealColumns` in state).
- A row's height dynamically adjusts to the tallest column on that date.

### PlannedMeal Card

- Shows meal name, assigned user avatars.
- Click → opens `RecipeDetailModal`.
- Assign/unassign users by clicking avatars.
- Edit portions (multiplier).
- Delete button (removes from plan + Firestore).

### PlannedSnack Card

- Shows snack name, quantity, unit.
- Assign/unassign users.
- Delete button.

### Drop Zones

- `MealSlot` is a drop target (accepts `dragover` + `drop`).
- On drop: reads `dataTransfer`, identifies if it's a meal or snack, dispatches `ADD_PLANNED_MEAL` or `ADD_PLANNED_SNACK`.

### Snack Picker

- Button in each cell opens `SnackPicker` modal.
- User searches snack ingredients, sets quantity + unit, confirms.
- Dispatches `ADD_PLANNED_SNACK`.

### Column Management

- Add column: appends to `mealColumns`.
- Rename column: batch updates all `PlannedMeal.mealType` and `PlannedSnack.mealType` in Firestore.
- Remove column: batch deletes all plan/snack entries for that column.

### Date Selection

- User selects a date range in the planner header.
- `selectedDates` in state drives the shopping list aggregation.

---

## 8. Feature: Recipe Builder (Steps)

**Location:** `src/features/MealLibrary/StepRichEditor.tsx`

The recipe step editor uses a `contenteditable` div (not `<textarea>`) to support inline styled content.

### StepRichEditor Props

```ts
interface Props {
  text: string;
  stepIngredients: InlineStepIngredient[];
  placeholder: string;
  allIngredients: Ingredient[];
  recipeIngredients: RecipeIngredientEntry[]; // from the recipe's ingredient list
  customUnits: CustomUnit[];
  onFocus: () => void;
  onChange: (text: string, stepIngredients: InlineStepIngredient[]) => void;
}
```

### Exported Handle

```ts
interface StepEditorHandle {
  insertIngredient: (ingredientId: string, qty: number, unit: UnitRef) => void;
}
```

Exposed via `forwardRef` + `useImperativeHandle`. Allows the parent (`MealFormModal`) to programmatically insert an ingredient chip (e.g. when a remaining-pill is clicked).

### Inline Ingredient Chip Data Model

```ts
interface InlineStepIngredient {
  tempId: string;        // uuid, ephemeral — not saved to Firestore
  ingredientId: string;
  quantity: number;
  unit: UnitRef;
}
```

Chips are serialised as `RecipeStepIngredient` (without `tempId`) when the form is submitted.

### How @mention Works

1. User types `@` → the editor detects `@(\w*)` before cursor in the text node.
2. A dropdown appears with matching recipe ingredients.
3. Arrow keys navigate, Enter confirms, Escape dismisses.
4. On selection: the `@query` text is replaced with a `contentEditable="false"` pending span.
5. A React portal renders `PendingIngForm` into that span: qty input + unit select + confirm/cancel buttons.
6. On confirm: the pending span is replaced with a styled chip `<span data-ing-id>`.
7. `extractContent()` walks the DOM to rebuild the `text` string and `stepIngredients[]`.

### Remaining Ingredient Pills

Shown above all steps. Computed as:

```
remaining[ingredientId] = masterQuantity - SUM(all step stepIngredients for that id)
```

Pill states:
- **partial** (positive remaining) — clickable, inserts chip into the active step.
- **done** (≈0 remaining) — shows ✓.
- **over** (negative remaining) — shows ↑ warning.

---

## 9. Feature: Shopping List

**Location:** `src/features/ShoppingList/`

### Aggregation Logic

For each `PlannedMeal` whose `date` is in `selectedDates`:

```
multiplier = assignedUsers.length / meal.servings
adjustedQty = ingredient.quantity * multiplier
```

For each `PlannedSnack` whose `date` is in `selectedDates`:

```
adjustedQty = snack.quantity (not scaled)
```

Quantities are summed per ingredient, grouped by `IngredientCategory`.

### Unit Conversion

- If `ShoppingListSettings.unitSystem = "imperial"` and ingredient uses metric: converts.
- If `showCustomLabels = false` and unit is custom with a `metricEquivalent`: converts to metric qty.

### Persistence

- On "Save list": archives the previous active list (sets `status: "archived"`), writes the new one as `status: "active"`.
- Shopping list items have `checked: boolean` per item.
- Checked state is updated via `toggleShoppingListItem()`.

---

## 10. Feature: Friends & Sharing

**Location:** `src/features/Friends/FriendsModal.tsx`

### Three Tabs

| Tab | Contents |
|---|---|
| Friends | Accepted friends, share-all toggle per friend |
| Requests | Incoming pending requests (accept/decline) |
| Find | Search users by username prefix |

### Friend Search

- Queries `users` collection by `username` prefix (Firestore range query: `>= query`, `<= query + "\uf8ff"`).
- Excludes current user and existing friends.

### Share-All

When `shareAll[uid]` is toggled to `true` for a friend:
1. All of the user's recipes are batch-updated: `sharedWith = arrayUnion(friendUid)`.
2. `friendships/{id}.shareAll[uid] = true` is set.

When toggled to `false`:
1. All recipes are batch-updated: `sharedWith = arrayRemove(friendUid)`.

### Per-Recipe Sharing

In `MealFormModal` → Sharing tab:
- A list of accepted friends with toggle buttons.
- On submit, `meal.sharedWith` includes selected friend UIDs.

### Loading Friends' Recipes

```ts
// Collection group query across ALL users' recipe subcollections:
collectionGroup(db, "recipes")
  .where("sharedWith", "array-contains", uid)
  .where("visibility", "==", "friends")
```

---

## 11. Feature: Favourites

`favourites: FavouriteItem[]` in `AppState`.

```ts
interface FavouriteItem {
  id: string;
  type: "meal" | "snack";
}
```

- Toggle via `TOGGLE_FAVOURITE` action.
- Persisted to `users/{uid}.favourites` on every change.
- In Meal Library, a "Favourites" filter tab shows only favourited items.
- `MealCard` and `SnackCard` show a star button.

---

## 12. Feature: Snacks

Snacks are `Ingredient` objects with `isSnack: true`. They are planned separately from meals using `PlannedSnack`.

### Sources

- **Global snacks**: `globalIngredients` where `isSnack: true` + `globalStatus: "approved"`.
- **User's local snacks**: `users/{uid}/localIngredients` where `isSnack: true`.
- **Bookmarked snacks**: Local copy of a global snack (has `bookmarkedFromId`).

### SnackFormModal

Fields: Name, category, perishable flag, photo, custom units.

### Snack Submission Lifecycle

Same `GlobalStatus` lifecycle as recipes:
```
local → "pending" → "approved" (copied to globalIngredients) | "rejected"
approved → "pending_update" → "approved" | reverted to "approved"
```

### Planning Snacks

- Drag `SnackCard` onto grid cell → `ADD_PLANNED_SNACK`.
- Or: click the snack picker button in a grid cell → `SnackPicker` modal.

---

## 13. Feature: User Management (Household)

`users: User[]` in `AppState` represents household members (not Firebase Auth users).

```ts
interface User {
  id: string;       // uuid
  initials: string; // auto-generated from name, e.g. "JD"
  color: string;    // one of 10 preset hex colours
}
```

- **Add user**: Creates new `User`, dispatches `ADD_USER`, calls `saveHouseholdUsers`.
- **Edit user**: Update name/color, re-derive initials.
- **Delete user**: Cascades — removes from `selectedUserIds`, removes from all `plan[].assignedUsers` and `snacks[].assignedUsers`.
- **Select / Deselect**: Clicking an avatar in the header toggles `selectedUserIds`. The planner filters display by selected users.
- **Assignment**: In `PlannedMealCard` / `PlannedSnackCard`, click user avatars to assign/unassign.
- **Shopping multiplier**: `assignedUsers.length / meal.servings` determines quantity scaling.

---

## 14. Feature: Authentication & Admin

### Auth

- Firebase Auth with email/password.
- `AuthContext` provides `{ user: User | null, isAdmin: boolean }`.
- `isAdmin` is read from `users/{uid}.isAdmin` (boolean field, set manually in Firestore).
- On first sign-in: `migrateLocalToCloud(uid, state)` pushes all local data to Firestore.

### Admin Panel

- Accessible only when `isAdmin: true`.
- Replaces the main app view when the admin link is clicked.
- **Pending Recipes tab**: Lists all recipes across all users with `globalStatus: "pending" | "pending_update"`.
  - Approve → copies to `globalRecipes`, sets `globalStatus: "approved"`.
  - Reject → sets `globalStatus: "rejected"`, writes `rejectionReason`.
- **Pending Snacks tab**: Same flow for snack ingredients.

---

## 15. Cloud Sync Functions Reference

All functions are in `src/lib/cloudSync.ts`.

### Recipes

| Function | Signature | Description |
|---|---|---|
| `saveRecipeToCloud` | `(uid, meal, customUnits)` | Write/upsert recipe doc |
| `deleteRecipeFromCloud` | `(uid, recipeId)` | Delete recipe doc |
| `submitGlobalRecipe` | `(recipeId, uid)` | Set visibility="global", status="pending" |
| `suggestRecipeUpdate` | `(uid, meal, customUnits)` | Set status="pending_update" |
| `bookmarkRecipe` | `(recipe, uid)` | Copy global recipe to user subcollection with new ID |
| `loadGlobalRecipes` | `()` | Fetch all from `globalRecipes` |
| `loadFriendsRecipes` | `(uid)` | Collection group query by sharedWith |
| `approveRecipe` | `(recipeId, ownerId)` | Admin: approve + copy to globalRecipes |
| `rejectRecipe` | `(recipeId, ownerId, reason)` | Admin: reject with reason |
| `rejectRecipeUpdate` | `(recipeId, ownerId)` | Admin: revert pending_update → approved |

### Plan

| Function | Signature | Description |
|---|---|---|
| `savePlanEntryToCloud` | `(uid, plannedMeal)` | Upsert plan doc |
| `deletePlanEntryFromCloud` | `(uid, instanceId)` | Delete plan doc |
| `savePlannedSnackToCloud` | `(uid, snack)` | Upsert snack plan doc |
| `deletePlannedSnackFromCloud` | `(uid, instanceId)` | Delete snack plan doc |

### Ingredients / Snacks

| Function | Signature | Description |
|---|---|---|
| `saveLocalIngredient` | `(uid, ingredient)` | Write to localIngredients |
| `updateLocalIngredient` | `(uid, ingredient)` | Update localIngredient |
| `submitSnackForReview` | `(uid, ingredientId)` | Set status="pending" |
| `suggestSnackUpdate` | `(uid, ingredient)` | Set status="pending_update" |
| `bookmarkSnack` | `(uid, snack)` | Copy globalIngredient to localIngredients |
| `loadGlobalSnacks` | `()` | Fetch approved snacks |
| `approveSnack` | `(ingredientId, ownerId)` | Admin: approve + copy to globalIngredients |
| `rejectSnack` | `(ingredientId, ownerId)` | Admin: reject |

### Friends

| Function | Signature | Description |
|---|---|---|
| `searchUsersByUsername` | `(query, currentUid)` | Prefix search on users.username |
| `sendFriendRequest` | `(uid, targetUid)` | Create pending friendship |
| `respondToFriendRequest` | `(friendshipId, accept)` | Accept or decline |
| `setShareAll` | `(friendshipId, uid, friendUid, value)` | Toggle share-all, batch update recipes |

### User / Settings

| Function | Signature | Description |
|---|---|---|
| `saveHouseholdUsers` | `(uid, users)` | Write users[] to user doc |
| `saveFavourites` | `(uid, favourites)` | Write favourites[] to user doc |
| `saveMealColumns` | `(uid, mealColumns)` | Write mealColumns[] to user doc |
| `renameMealColumnInCloud` | `(uid, oldName, newName)` | Batch update plan + snacks mealType |
| `removeMealColumnFromCloud` | `(uid, name)` | Batch delete plan + snacks for column |
| `syncShoppingList` | `(uid, name, items, settings)` | Archive old active list, write new |
| `toggleShoppingListItem` | `(uid, listId, items, id, checked)` | Update item checked state |

### Converters (Internal)

```ts
mealToFirestore(meal, uid, customUnits): FirestoreRecipe
firestoreRecipeToMeal(recipe): Meal
```

---

## 16. Persistence Strategy

### localStorage (unauthenticated)

- Key: `"shopSmartState"`
- Shape mirrors `AppState` (with migration for legacy formats).
- Written synchronously after every state change.
- Read once on app startup via `loadState()`.

### Firestore (authenticated)

- **Initial sync**: On sign-in, `syncFromCloud()` merges cloud + local state.
- **Live writes**: Each mutation calls the appropriate cloud function immediately after dispatching to local state.
- **No real-time listeners** on recipes or plan (polling-free; write-on-change pattern).
- **Exception**: `FriendsModal` uses `onSnapshot` on the `friendships` query while open.
- **Exception**: `ShoppingListModal` can use `onSnapshot` on the active shopping list.

### Conflict Resolution

Only applies to recipes:
- Field used: `localUpdatedAt` (milliseconds epoch from `Date.now()`).
- If local `localUpdatedAt >= cloud localUpdatedAt` → keep local, push to cloud.
- If cloud `localUpdatedAt > local` → use cloud version.

---

## 17. Key UI Patterns

### Modals

- All modals use `createPortal(content, document.body)`.
- Click-outside (on overlay) closes modal.
- `e.stopPropagation()` on modal panel prevents close when clicking inside.
- Escape key support via `onKeyDown` on overlay or document listener.

### Drag & Drop (Web API)

- `MealCard` / `SnackCard`: `onDragStart` sets `dataTransfer.setData("text/plain", id)` and a type identifier.
- `MealSlot`: `onDragOver` calls `e.preventDefault()`, `onDrop` reads the ID and dispatches.

### Resizable Sidebar

- The library sidebar width is controlled by a drag handle.
- Width is stored in local React state (not persisted).
- `mousemove` listener during drag, `mouseup` to release.

### Image Upload (Firebase Storage)

- Path pattern: `recipes/{uid}/{recipeId}/photo.{ext}` for recipe photos.
- Uses `uploadBytesResumable` for progress tracking.
- Progress displayed as a percentage bar in the form.
- URL written to `Meal.photoUrl` after `getDownloadURL`.

### Infinite Scroll Grid

- Virtual rendering: only visible rows are rendered to DOM.
- 10,000-day window centered on today.
- `scrollTop` is set on mount to position at today.
- Dynamic row heights computed based on max items in any column.

### Quantity Formatting

```ts
// Fractions map:
{ 0.25: "¼", 0.5: "½", 0.75: "¾", 0.333: "⅓", 0.667: "⅔" }
// Whole + fraction: 1.5 → "1 ½"
// Plain integer: 2 → "2"
// Decimal fallback: 1.3 → "1.3"
```

---

*Generated 2026-03-28. Reflects the current state of the MealPlanner web app as implemented.*
