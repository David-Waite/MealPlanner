# Companion App — Calendar Screen

> Last updated: March 2026

---

## Overview

The calendar screen is the main screen of the companion app. It mirrors the web app's weekly planner but is designed for vertical, infinite scrolling on a phone — closer to how iOS Calendar looks in day view than a traditional weekly grid.

The user scrolls vertically through days. Within each day, meals are grouped into columns by meal type (Breakfast, Lunch, Dinner, Snacks, etc.). Each planned meal or snack is represented by a card.

---

## Layout

### Top-level structure

```
┌─────────────────────────────┐
│  Header (date / week nav)   │
├─────────────────────────────┤
│                             │
│   Day Block — Mon 28 Mar    │
│   ┌─────────┬─────────┐     │
│   │Breakfast│  Lunch  │     │
│   │  Card   │  Card   │     │
│   └─────────┴─────────┘     │
│   ┌─────────┬─────────┐     │
│   │ Dinner  │ Snacks  │     │
│   │  Card   │  Card   │     │
│   └─────────┴─────────┘     │
│                             │
│   Day Block — Tue 29 Mar    │
│   ...                       │
│                             │
└─────────────────────────────┘
```

### Day block

Each day is rendered as a self-contained block with:
- A sticky date header while that day is in view (e.g. **Mon 28 Mar**)
- A grid of meal-type columns beneath it

The day block height grows to fit its content — days with no meals are still shown but appear compact (just the date header with an empty state).

### Meal-type columns

Columns map directly to the app's `mealColumns` array (user-configurable: Breakfast, Lunch, Dinner, Snacks, etc.). The column order matches the web app exactly.

Within each column, cards stack vertically. A column with no cards for that day shows nothing (or a subtle empty pill — TBD).

### Infinite scroll

- Scroll starts at today (or the nearest day with planned meals).
- Past days are loaded upward; future days load downward.
- Load in chunks of 14 days in each direction. Trigger the next load when the user is within 3 days of the loaded boundary.
- No hard limit on how far the user can scroll in either direction.

---

## Cards

There are two card types: **Meal cards** (for planned meals) and **Snack cards** (for planned snacks). They share the same visual shell but display different content.

### Meal card

Displays a planned recipe from the user's meal library.

```
┌───────────────────────────────┐
│  [photo — 16:9 or square]     │
│                               │
├───────────────────────────────┤
│  Thai Basil Chicken Bowls     │  ← meal name, 2 lines max then truncate
│                               │
│  🟢 David  🔵 Sarah           │  ← user avatars (initial + colour circle)
└───────────────────────────────┘
```

**Data needed:**
- `PlannedMeal.mealId` → look up `Meal` from recipes collection
  - `Meal.name` — card title
  - `Meal.photoUrl` — cover image (show placeholder if null)
  - `Meal.servings` — used for portion display (optional, lower priority)
- `PlannedMeal.assignedUsers[]` — array of user IDs → look up each `User`
  - `User.initials` — shown inside the avatar circle
  - `User.color` — the circle background colour

**Display rules:**
- Photo fills the top of the card. If no photo, show a neutral grey placeholder with a fork-and-knife icon.
- Meal name is 1–2 lines, semibold. Truncate with ellipsis at 2 lines.
- User avatars are small circles (28–32pt diameter) arranged in a horizontal row below the name. If there are more than 4 users, show the first 3 then a "+N" overflow circle.
- Tapping the card opens the recipe detail view (out of scope for this doc).

---

### Snack card

Displays a planned snack (a single ingredient, not a recipe).

```
┌───────────────────────────────┐
│  [photo — 16:9 or square]     │
│                               │
├───────────────────────────────┤
│  Apple                        │  ← ingredient name
│  2 × unit                     │  ← quantity × unit (e.g. "2 × unit")
│                               │
│  🟢 David  🔵 Sarah           │  ← same avatar row as meal card
└───────────────────────────────┘
```

**Data needed:**
- `PlannedSnack.ingredientId` → look up ingredient
  - From `globalIngredients/{id}` or `users/{uid}/localIngredients/{id}`
  - `ingredient.name` — card title
  - `ingredient.photoUrl` — cover image (nullable)
- `PlannedSnack.quantity` — base quantity per person (multiply by active user count for display)
- `PlannedSnack.unit` — `UnitRef` (see unit resolution below)
- `PlannedSnack.assignedUsers[]` — same as meal card

**Display rules:**
- Same photo treatment as meal cards.
- Show quantity as `{n} × {unit}` below the name (e.g. "2 × unit", "1 × cup"). If quantity is 1 and unit is "unit", just show nothing or hide the line — keep it clean.
- Same avatar row.

---

## User avatars

Users are lightweight colour-coded profiles (not auth accounts). They are stored per-user-account under `users/{uid}/users/{userId}`.

```
User {
  id:       string   // local ID e.g. "u1"
  initials: string   // e.g. "DA"
  color:    string   // CSS hex e.g. "#4CAF50"
}
```

Render each avatar as a filled circle with the `color` as background and `initials` as white text inside.

---

## Unit resolution

`PlannedSnack.unit` is a `UnitRef` — a discriminated union:

```ts
type UnitRef =
  | { type: "core";   unit: CoreUnit }       // standard unit: "unit", "cup", "g", etc.
  | { type: "custom"; customUnitId: string } // e.g. "clove" for garlic
```

For display on a card, just show the label:
- `type: "core"` → use `unit` directly as the label string.
- `type: "custom"` → look up `CustomUnit` by `customUnitId` in the `customUnits` collection and use `CustomUnit.label`.

Full unit conversion (metric ↔ imperial) is only needed in the shopping list, not on calendar cards.

---

## Firebase Data Structure

This is the complete Firestore structure relevant to the calendar screen. All user data lives under `users/{uid}`.

```
users/{uid}
│
├── (document)                     # FirestoreUser + settings
│   ├── username: string
│   ├── displayName: string
│   ├── email: string
│   ├── createdAt: Timestamp
│   ├── updatedAt: Timestamp
│   ├── mealColumns: string[]      # Ordered column names e.g. ["Breakfast","Lunch","Dinner","Snacks"]
│   ├── users: User[]              # Household member profiles (embedded array)
│   ├── customUnits: CustomUnit[]  # All custom units for this account
│   ├── shoppingListSettings: { unitSystem, showCustomLabels }
│   └── favourites: FavouriteItem[]
│
├── plan/{instanceId}              # PlannedMeal — one doc per placed meal
│   ├── mealId: string             # → recipes/{mealId}
│   ├── date: string               # ISO date "2026-03-28"
│   ├── mealType: string           # Column name e.g. "Breakfast"
│   ├── assignedUsers: string[]    # User IDs from the users subcollection
│   └── portions: number           # Default 1; multiplier for servings
│
├── snacks/{instanceId}            # PlannedSnack — one doc per placed snack
│   ├── ingredientId: string       # → globalIngredients/{id} or localIngredients/{id}
│   ├── quantity: number           # Per-person base quantity
│   ├── unit: UnitRef              # { type, unit } or { type, customUnitId }
│   ├── date: string               # ISO date "2026-03-28"
│   ├── mealType: string           # Column name e.g. "Snacks"
│   └── assignedUsers: string[]
│
├── recipes/{recipeId}             # Meal (recipe) — the full meal definition
│   ├── name: string
│   ├── photoUrl: string | null
│   ├── servings: number
│   ├── description: string | null
│   ├── instructions: string[]
│   ├── steps: RecipeStep[]        # Rich steps with per-step ingredient refs
│   ├── ingredients: RecipeIngredient[]
│   │   └── { ingredientId, quantity, unit: UnitRef }
│   ├── customUnits: CustomUnit[]
│   ├── tags: string[]
│   ├── visibility: "private" | "friends" | "global"
│   ├── globalStatus: string
│   ├── bookmarkedFromId: string | null
│   ├── originalOwnerId: string | null
│   ├── sharedWith: string[]
│   ├── createdAt: Timestamp
│   ├── updatedAt: Timestamp
│   └── localUpdatedAt: number     # Client ms timestamp for merge conflict resolution
│
├── users/{userId}                 # Household member profile (NOT an auth user)
│   ├── id: string                 # e.g. "u1"
│   ├── initials: string           # e.g. "DA"
│   └── color: string              # e.g. "#4CAF50"
│
├── localIngredients/{id}          # User-created snack ingredients
│   ├── name: string
│   ├── category: IngredientCategory
│   ├── perishable: boolean
│   ├── isSnack: boolean
│   ├── photoUrl: string | null
│   ├── bookmarkedFromId: string | null
│   ├── globalStatus: GlobalStatus
│   └── customUnits: CustomUnit[]
│
└── shoppingLists/{listId}         # Synced shopping lists (not needed for calendar)
    └── ...

globalIngredients/{id}             # Top-level collection — global snack ingredients
    ├── name: string
    ├── category: IngredientCategory
    ├── perishable: boolean
    ├── isSnack: boolean
    ├── photoUrl: string | null
    └── ...

friendships/{friendshipId}         # Top-level collection — bidirectional friend graph
    ├── userIds: [string, string]  # Auth UIDs of both users
    ├── requesterId: string
    ├── status: "pending" | "accepted" | "declined"
    └── shareAll: Record<string, boolean>
```

---

## Data fetching strategy for the calendar

### What to load on screen open

1. **Users** — `users/{uid}/users` (small collection, load all upfront)
2. **Plan** — `users/{uid}/plan` filtered by date range (current window ± 14 days)
3. **Snacks** — `users/{uid}/snacks` filtered by date range
4. **Recipes** — load lazily as `mealId`s appear in the plan. Cache by ID. Do not load the full collection.
5. **Ingredients** — load lazily by `ingredientId` from plan/snacks. Check `localIngredients` first, then `globalIngredients`.

### Date range queries

Both `plan` and `snacks` can be queried by date:

```
collection("users/{uid}/plan")
  .where("date", ">=", "2026-03-14")
  .where("date", "<=", "2026-04-11")
```

Date strings are ISO format `YYYY-MM-DD` so lexicographic comparison works correctly.

### Real-time vs. one-shot

Use `onSnapshot` listeners on the `plan` and `snacks` collections so the calendar updates live if the user makes changes on the web app while the phone app is open. Recipes and ingredients can be fetched once with `getDoc` (they rarely change mid-session).

---

## mealColumns ordering

The column order within each day matches the user's `mealColumns` array. This is stored on the user document in Firestore (`users/{uid}.mealColumns`) and is kept in sync by the web app on every add, rename, or remove.

The default order is: **Breakfast → Lunch → Dinner → Snacks**

The companion app should read `mealColumns` from the user document at startup and use that array to determine column order and visibility. Each `PlannedMeal.mealType` and `PlannedSnack.mealType` is a string that matches one of these column names.

---

## Edge cases

| Case | Behaviour |
|---|---|
| Meal has no photo | Show grey placeholder with a fork-and-knife icon |
| Snack ingredient not found | Skip the card (stale reference — can happen if ingredient was deleted) |
| `assignedUsers` contains a deleted user ID | Ignore that ID — filter to only user IDs present in the `users` subcollection |
| No meals on a given day | Show the date header with a subtle empty state (e.g. "Nothing planned") |
| `mealType` column no longer exists | Still render the card — put it in an "Other" fallback column |
