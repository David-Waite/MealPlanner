# MealPlanner — Tickets

> Last updated: March 2026
> Derived from: feature-doc.md, user-flows.md, core-actions.md, and implementation audit.

---

## Priority Legend

- `P0` — Broken core loop. Do first.
- `P1` — Core feature missing or incomplete.
- `P2` — Nice to have, lower urgency.
- `REMOVE` — Exists in code, should be deleted per feature doc decisions.
- `CLEANUP` — Dead code, no product impact.

---

## P0 — Broken Core Loop

---

### TICKET-01 · Include snacks in shopping list generation

**Area:** Shopping List
**Status:** Bug — open

Snacks placed on the calendar are completely excluded from the shopping list. `generateShoppingList` in `ShoppingListModal.tsx` only processes `PlannedMeal[]` — it never reads `state.snacks` (`PlannedSnack[]`).

**What needs to happen:**
- Pass `snacks` and the snack ingredient data into `generateShoppingList`
- Aggregate snack ingredients alongside meal ingredients
- Apply the same category grouping and unit resolution

---

### TICKET-02 · Fix quantity display — fractions not decimals

**Area:** Shopping List, Recipe Detail
**Status:** Bug — open

`formatQuantity()` in `ShoppingListModal.tsx` uses `parseFloat(n.toFixed(2))` which outputs decimals (e.g. `0.5 tsp`, `1.33 cups`). Per the feature doc, all quantities must display as fractions (½ tsp, 1⅓ cups).

**What needs to happen:**
- Replace `formatQuantity` with a fraction formatter (e.g. `0.5` → `½`, `1.333` → `1⅓`, `0.25` → `¼`)
- Apply consistently across the shopping list and recipe detail view
- Common fractions to support: ¼ ½ ¾ ⅓ ⅔ ⅛ ⅜ ⅝ ⅞

---

## P1 — Core Features Missing or Incomplete

---

### TICKET-03 · Perishable date toggle in shopping list UI

**Area:** Shopping List
**Status:** Not implemented

The feature doc specifies that perishable ingredients show the date(s) they're needed, with a toggle to show/hide. The text export already handles this correctly (splits perishables by date). The UI doesn't — it shows a single date only for single-instance items regardless of perishable flag, and there's no toggle.

**What needs to happen:**
- Add a "Show dates" toggle to the shopping list settings bar
- When on: perishable ingredients show each date they're needed (e.g. *Wed, Fri*)
- When off: all items show without dates (default — cleaner view)
- Non-perishables never show dates regardless of toggle state

---

### TICKET-04 · Shopping list sync — auto status indicator, not manual button

**Area:** Shopping List
**Status:** Partially implemented — wrong behaviour

Currently the sync is a manual "Sync to App" button. Per the user flows, when signed in the list should automatically be available in the companion app — the UI should show a sync status indicator ("Synced"), not require the user to press a button each time.

**What needs to happen:**
- When signed in: auto-sync the shopping list to Firestore whenever the plan or selected dates change
- Replace the "Sync to App" button with a status badge: `Synced` / `Syncing…` / `Sync failed`
- When not signed in: show "Sign up to sync to your phone" prompt in place of the badge

---

### TICKET-05 · Recipe scaling per planned meal instance

**Area:** Planner, Recipe Detail
**Status:** Not implemented

Per the feature doc, users can set the number of servings being cooked for a specific planned meal instance. This drives both the shopping list quantities and the scaled quantities shown in the recipe detail view.

**What needs to happen:**
- On the planned meal card, expose a "Servings" input (separate from the portions field, or replace it with clearer labelling)
- Recipe detail view: when opened from a planned meal context, show scaled ingredient quantities alongside base quantities
- Scaling formula: `(plannedServings / baseServings) × ingredientQuantity`
- Display as fractions (see TICKET-02)

---

### TICKET-06 · Custom calendar column management UI

**Area:** Planner
**Status:** Data model exists, no UI

`mealColumns` exists in `AppState` and drives the grid columns. There is no UI to add, remove, or rename columns.

**What needs to happen:**
- Settings or inline UI to add a new column (e.g. "Pre-workout")
- Rename existing columns
- Remove a column (with confirmation if it has planned meals)
- Persist changes to Firestore if signed in

---

### TICKET-07 · Password reset flow

**Area:** Auth
**Status:** Not implemented

`AuthModal.tsx` has sign-in and sign-up tabs but no "Forgot password" link. Firebase Auth supports `sendPasswordResetEmail` but it is not wired up.

**What needs to happen:**
- "Forgot password?" link on the sign-in tab
- Input for email address, submit sends Firebase reset email
- Confirmation message shown after submission

---

### TICKET-08 · Auth gate refinement — unauthenticated experience

**Area:** Auth, Onboarding
**Status:** Partially working — not intentionally designed

The app technically works without an account (local state + seed data), but this isn't designed as an intentional onboarding experience. The auth gate is not clearly signposted.

**What needs to happen:**
- Ensure creating meals, snacks, and planning all work without an account (local storage only)
- Auth gate only appears when user tries to: sync to companion app, add friends, or access their plan on another device
- Sign-up prompt appears in context at the gate point (not a full-screen wall)
- On sign-up: local state (plan, meals, household members) migrates to cloud seamlessly

---

### TICKET-09 · Demo recipes — intentional unauthenticated experience

**Area:** Onboarding
**Status:** Seed data exists but not intentionally designed

`initialState.ts` has 15 seed meals but they aren't labelled as demo content and the experience isn't designed around them.

**What needs to happen:**
- Curate the seed meals to ~10–15 high-quality demo recipes covering breakfast, lunch, dinner
- Label them clearly as demo content in the UI (e.g. small "Demo" badge on cards)
- Users can delete demo meals or keep them
- Demo meals are not submitted to Firestore on sign-up (they're seed data, not user-created)

---

## P2 — Nice to Have

---

### TICKET-10 · Multiple photos on meals

**Area:** Meal Library
**Status:** Not implemented

Per the feature doc, meals should support one cover photo plus additional photos (step photos, finished dish, etc.).

**What needs to happen:**
- Add `additionalPhotos: string[]` to the `Meal` type
- `MealFormModal`: allow uploading multiple additional photos after the cover photo
- `RecipeDetailModal`: show a photo gallery (cover + additional)
- Firestore: persist `additionalPhotos` array on the recipe document

---

### TICKET-11 · Show rejection reason to recipe owner

**Area:** Meal Library
**Status:** Data exists, not surfaced

`rejectionReason` is stored on rejected recipe documents and mapped to the `Meal` type, but `MealCard` only shows a "Pending review" badge with no way to see why a recipe was rejected.

**What needs to happen:**
- On meal cards with `globalStatus === "rejected"`, show a "Rejected" badge
- Tooltip or expandable area shows the rejection reason text

---

## REMOVE — Cut per Feature Doc

---

### TICKET-12 · Remove global recipe discovery (Discover view)

**Area:** Meal Library Sidebar
**Status:** Fully built — to be removed

Global recipe browsing and submission is confirmed out of scope (scope creep). The Discover view is the third tab in the sidebar view switcher.

**What needs to happen:**
- Remove the "Discover" option from the sidebar view switcher
- Remove all Discover-related state, hooks, and rendering from `MealLibrarySidebar.tsx`
- Remove `loadGlobalRecipes` usage (can keep the function in `cloudSync.ts` or delete it)
- Remove `discoverMeals`, `discoverLoading`, `discoverLoaded`, `discoverSearch`, `discoverSelectedTags` state

---

### TICKET-13 · Remove admin recipe pipeline — keep ingredient pipeline

**Area:** Admin
**Status:** Fully built — partially to be removed

Per the feature doc, the admin pipeline for recipes (approve/reject global recipe submissions) is cut. The ingredient pipeline (approve/reject ingredient submissions) is kept.

**What needs to happen:**
- Remove "New Recipes" and "Recipe Updates" queues from `AdminPage.tsx`
- Remove `approveRecipe`, `rejectRecipe`, `rejectRecipeUpdate` from `AdminPage.tsx`
- Keep "New Snacks" and "Snack Updates" queues
- Remove "Submit globally" and "Suggest global update" buttons from `MealFormModal.tsx`
- Remove `handleSubmitGlobally` and `handleSuggestGlobalUpdate` functions from `MealFormModal.tsx`

---

## CLEANUP — Dead Code

---

### TICKET-14 · Delete unused planned card components

**Area:** Codebase
**Status:** Dead files

`PlannedMealCard.tsx` and `PlannedSnackCard.tsx` exist in `/src/features/MealPlanner/` but are not imported anywhere. `PlannedItemCard.tsx` replaced both.

**What needs to happen:**
- Delete `PlannedMealCard.tsx`
- Delete `PlannedSnackCard.tsx`

---

## Summary

| Ticket | Area | Priority | Effort |
|---|---|---|---|
| TICKET-01 | Snacks in shopping list | P0 | Medium |
| TICKET-02 | Fraction quantity display | P0 | Small |
| TICKET-03 | Perishable date toggle | P1 | Small |
| TICKET-04 | Shopping list auto-sync | P1 | Medium |
| TICKET-05 | Recipe scaling per meal | P1 | Large |
| TICKET-06 | Custom column UI | P1 | Medium |
| TICKET-07 | Password reset | P1 | Small |
| TICKET-08 | Auth gate refinement | P1 | Medium |
| TICKET-09 | Demo recipes | P1 | Small |
| TICKET-10 | Multiple photos | P2 | Medium |
| TICKET-11 | Rejection reason display | P2 | Small |
| TICKET-12 | Remove Discover view | REMOVE | Small |
| TICKET-13 | Remove recipe admin pipeline | REMOVE | Small |
| TICKET-14 | Delete dead components | CLEANUP | Tiny |
