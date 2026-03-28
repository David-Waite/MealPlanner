# MealPlanner — Core Actions

> Last updated: March 2026

Core actions are the things each persona must be able to do in the app. They drive what gets prioritised in the UI, what gets buried, and what gets cut.

---

## How to read this document

Each action has a **priority** and the **personas** it applies to.

**Priority:**
- `P0` — Without this the app doesn't work. Must be fast and frictionless.
- `P1` — Core to the value of the app. Important but not blocking.
- `P2` — Nice to have. Supports the experience but not critical.

---

## Action Map

### Planning

| Action | Priority | Personas |
|---|---|---|
| Drag a meal onto the calendar | P0 | Planner, Solo |
| Assign household members to a planned meal | P0 | Planner |
| Remove a meal from the calendar | P0 | Planner, Solo |
| Select a date or range of dates | P0 | Planner, Solo |
| Set servings for a planned meal | P1 | Planner, Solo |
| View the full week at a glance | P1 | Planner, Partner, Solo |
| Add / remove a meal type column | P2 | Planner |

---

### Meal Library

| Action | Priority | Personas |
|---|---|---|
| Search for a meal in the library | P0 | Planner, Solo |
| Create a new meal with ingredients | P0 | Planner, Solo |
| View a meal's full recipe detail | P0 | Planner, Partner, Solo |
| Edit an existing meal | P1 | Planner, Solo |
| Delete a meal | P1 | Planner, Solo |
| Favourite a meal | P1 | Planner, Solo |
| Filter meals by tag | P2 | Planner, Solo |

---

### Ingredients

| Action | Priority | Personas |
|---|---|---|
| Search global ingredients when building a recipe | P0 | Planner, Solo |
| Create a custom local ingredient | P1 | Planner, Solo |
| Submit a custom ingredient for global review | P2 | Planner, Solo |

---

### Shopping List

| Action | Priority | Personas |
|---|---|---|
| Generate a shopping list from the current plan | P0 | Planner, Solo |
| View ingredients grouped by category | P0 | Planner, Partner, Solo |
| See which dates perishables are needed | P1 | Planner, Solo |
| Toggle perishable dates on/off | P1 | Planner, Solo |
| Check off items while shopping | P1 | Partner, Solo |
| Sync the list to the companion app | P1 | Planner |
| Toggle metric / imperial units | P2 | Planner, Solo |
| Toggle custom unit labels | P2 | Planner, Solo |

---

### Snacks

| Action | Priority | Personas |
|---|---|---|
| Drag a snack onto the calendar | P1 | Planner, Solo |
| Create a new snack | P1 | Planner, Solo |
| Edit an existing snack | P1 | Planner, Solo |
| Favourite a snack | P2 | Planner, Solo |

---

### Household

| Action | Priority | Personas |
|---|---|---|
| Add a household member | P1 | Planner |
| Select which members are active | P1 | Planner |
| Edit a household member's name / colour | P2 | Planner |

---

### Account

| Action | Priority | Personas |
|---|---|---|
| Sign up | P0 | All |
| Sign in | P0 | All |
| Reset password | P1 | All |
| Sign out | P2 | All |

---

### Social (Nice-to-have)

| Action | Priority | Personas |
|---|---|---|
| Save a friend's recipe to your library | P2 | Planner |
| Share a recipe with a friend | P2 | Planner |
| View friends' recipes | P2 | Planner |

---

## What this tells us

**The P0 actions define the critical path:**
> Search library → drag meal onto calendar → assign people → generate shopping list

Every P0 action needs to be reachable in as few steps as possible, with no friction.

**Actions that don't appear for any persona:**
- Global recipe discovery (browse/submit/approve recipes) — confirmed cut
- Admin recipe pipeline — confirmed cut
- Aisle ordering in shopping list — out of scope

**The Partner persona is almost entirely P1/P2 on the web app.** This confirms the web app doesn't need to be designed around her — her primary surface is the companion app. She should be able to use the web app without getting lost, but it doesn't need to be optimised for her.

**The social actions are all P2.** They should be accessible but never in the way of the core path. The current implementation (behind a sidebar view switch) is the right call.
