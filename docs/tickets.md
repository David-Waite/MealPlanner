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
- When on: perishable ingredients show each date they're needed (e.g. _Wed, Fri_)
- When off: all items show without dates (default — cleaner view)
- Non-perishables never show dates regardless of toggle state

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
