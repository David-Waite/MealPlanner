# MealPlanner — User Flows

> Last updated: March 2026

Each flow maps the step-by-step journey through the app for a specific goal. These feed directly into the wireframes.

---

## Flow Index

| # | Flow | Persona | Priority |
|---|---|---|---|
| 1 | First-time setup | Planner | P0 |
| 2 | Plan the week | Planner, Solo | P0 |
| 3 | Create a new meal | Planner, Solo | P0 |
| 4 | Generate a shopping list | Planner, Solo | P0 |
| 5 | Add a meal mid-week | Planner, Solo | P1 |
| 6 | Handle a night out | Planner | P1 |
| 7 | Favourite a meal | Planner, Solo | P1 |
| 8 | Save a friend's recipe | Planner | P2 |

---

## Flow 1 — First-Time Setup

**Goal:** Get from a blank app to a state where the user can start planning.
**Persona:** The Weekly Planner
**Trigger:** User opens the app for the first time.

```
1. Land on app — no sign in required
   └─ Calendar view loads with demo recipes pre-loaded in the library
       └─ Demo recipes cover a range of meal types (breakfast, lunch, dinner)

2. User explores without an account
   ├─ Can drag demo meals onto the calendar
   ├─ Can generate a shopping list from demo meals
   ├─ Can add household members (stored locally)
   └─ State lives in the browser — nothing is lost unless they clear storage

3. Auth gate — triggered when user tries to:
   ├─ Sync to companion app → "Sign up to sync your list"
   ├─ Add friends → "Sign up to connect with friends"
   └─ (Implicit) Use on another device → "Sign up to save to the cloud"
       └─ Sign-up prompt appears in context, not as a full-page wall
       └─ Creating meals, snacks, planning — all work locally without an account

4. User chooses Sign Up
   ├─ Enter email, password, display name
   └─ Submit
       ├─ Success → local state (plan, household members) migrated to cloud
       └─ Error (email taken, weak password) → inline error, stay on form

5. Back in the app — now signed in
   ├─ Previously planned meals and household members are preserved
   ├─ Demo recipes remain in library until user removes them
   └─ User continues with whatever action triggered sign-up
```

**End state:** User is signed up, local state is preserved, and they can continue where they left off.
**Edge cases:**
- User returns later without signing in → local state still available (browser storage)
- User signs in on a different device → only cloud-saved state is available (local-only state is not synced)
- User clears browser storage before signing up → demo meals remain (they're seeded, not local state), but any plan they built is lost

---

## Flow 2 — Plan the Week

**Goal:** Fill the week's calendar with meals for the household.
**Persona:** The Weekly Planner, The Solo Meal Prepper
**Trigger:** User opens the app to plan (typically Sunday evening).

```
1. Open app → calendar view with library sidebar

2. Make sure at least one household member is selected in the header
   └─ Selected members will be auto-assigned to any meal dragged onto the calendar

3. Browse the meal library (sidebar)
   ├─ Favourites section at the top — quick access to most-used meals
   ├─ Scroll through full library below
   ├─ Search by name
   └─ Filter by tag (cuisine, diet, meal type)

4. Drag a meal from the library onto a calendar slot
   ├─ Meal lands in the slot
   ├─ Assigned users default to currently selected household members
   └─ Servings default to base recipe servings

5. Adjust the planned meal (optional)
   ├─ Open user assignment → toggle which members are eating this meal
   ├─ Open portions → adjust servings being cooked
   └─ Click meal card → open recipe detail view

6. Repeat steps 3–5 until the week is planned
```

**Note:** Date selection (clicking dates on the calendar) is only used for generating the shopping list — it is not required for planning. Users drag directly onto whichever day they want.

**End state:** Week is filled with meals, each assigned to the right people.
**Edge cases:**
- Meal dragged to wrong slot → drag to correct slot, or remove and re-drag
- Not enough meals in library → proceed to Flow 3 mid-planning, come back
- Same meal on multiple days → drag again, each instance is independent

---

## Flow 3 — Create a New Meal

**Goal:** Add a meal to the library with full ingredients so it can be planned and shopped for.
**Persona:** The Weekly Planner, The Solo Meal Prepper
**Trigger:** Clicking "+ New" in the meal library, or prompted from an empty library state.

```
1. Click "+ New" in the library sidebar
   └─ Meal form opens

2. Add basic details
   ├─ Name (required)
   ├─ Description (optional)
   ├─ Cover photo (optional — drag and drop or file picker)
   ├─ Additional photos (optional)
   └─ Servings (required — sets the base for scaling)

3. Add ingredients
   ├─ Type in the ingredient search field
   │   ├─ Match found in global ingredients → select it
   │   └─ No match → option to create a custom local ingredient
   │       ├─ Enter name, category, perishable toggle
   │       └─ Saved locally, optionally submitted for global review later
   ├─ Set quantity and unit for each ingredient
   │   ├─ Choose from core units (g, kg, ml, tsp, tbsp, cup, unit…)
   │   └─ Or add a custom unit (e.g. "clove") with optional metric equivalent
   └─ Repeat until all ingredients added

4. Add instructions (optional but recommended)
   ├─ Type each step
   ├─ Reorder steps with up/down controls
   └─ Remove a step

5. Add tags (optional)
   └─ Select from taxonomy (Cuisine, Diet, Meal Type, Cook Time)

6. Save
   ├─ Meal appears in the library immediately
   └─ If signed in → saved to Firestore
```

**End state:** Meal is in the library, ready to be dragged onto the calendar.
**Edge cases:**
- User saves with no ingredients → meal appears in library but won't contribute to shopping list (no warning needed, they can edit later)
- Custom ingredient created → available immediately for this and future meals
- Photo upload fails → allow save without photo, show retry option

---

## Flow 4 — Generate a Shopping List

**Goal:** Turn the week's meal plan into a shopping list.
**Persona:** The Weekly Planner, The Solo Meal Prepper
**Trigger:** Clicking "Shopping List" in the header, after planning the week.

```
1. Click "Shopping List" in the header

2. Shopping list modal opens
   ├─ Ingredients aggregated from all meals + snacks on selected dates
   ├─ Scaled by assigned users and servings per meal
   └─ Grouped by category (Produce, Meat, Dairy, Pantry, etc.)

3. Review the list
   ├─ Scan for anything unexpected
   ├─ Toggle "Show dates" → perishables show which days they're needed
   │   e.g. Chicken breast — 400g (Wed, Fri)
   └─ Toggle metric / imperial if needed

4. Sync status indicator
   ├─ Signed in → shows "Synced" — list is automatically available in companion app
   └─ Not signed in → shows "Sign up to sync to your phone"

5. Copy to clipboard (always available, signed in or not)
   └─ Plain text version copied → paste into Notes, WhatsApp, etc.

6. Close modal and continue adjusting the plan if needed
   └─ List regenerates on next open based on current plan state
```

**End state:** Shopping list is either synced to the companion app or copied. User knows exactly what to buy.
**Edge cases:**
- No dates selected → prompt user to select dates on the calendar first
- Meal has no ingredients → that meal contributes nothing to the list (silent — user should know)
- Same ingredient in multiple meals → quantities are aggregated into one line item
- Snacks on the calendar → included in the list (currently a bug — to be fixed)

---

## Flow 5 — Add a Meal Mid-Week

**Goal:** Add a meal to the plan after the week has already been set up.
**Persona:** The Weekly Planner, The Solo Meal Prepper
**Trigger:** Plans change — want to add something new or swap a meal.

```
1. Click the specific date on the calendar to select it

2. Find the meal to add
   ├─ Search or browse the library
   └─ If the meal doesn't exist → Flow 3 (Create a new meal) then return

3. Drag the meal into the correct slot on that date

4. Adjust assignment and servings as needed

5. Regenerate shopping list (Flow 4) to account for the change
```

**End state:** Calendar updated, shopping list reflects the change.
**Notes:** This flow is essentially Flow 2 scoped to a single date. No special UI needed — the same interactions work.

---

## Flow 6 — Handle a Night Out

**Goal:** Account for one person not eating a planned meal so the shopping list quantity is correct.
**Persona:** The Weekly Planner
**Trigger:** One household member is eating out on a night that was previously planned for both.

```
1. Find the planned meal on the calendar

2. Open the user assignment popover on that meal card

3. Deselect the member who is eating out
   └─ Assigned users updated → now only 1 person

4. Shopping list quantities for that meal update automatically
   └─ Ingredients scaled to 1 person instead of 2
```

**End state:** Shopping list reflects the correct quantity for one person.
**Why this matters:** This is one of the core motivations for the app — buying exactly the right amount when plans change. The flow must be fast (2 taps from the calendar) with no friction.

---

## Flow 7 — Favourite a Meal

**Goal:** Mark a meal as a favourite so it's easy to find when planning.
**Persona:** The Weekly Planner, The Solo Meal Prepper
**Trigger:** User has a go-to meal they use regularly and wants faster access to it.

```
1. Hover over a meal card in the library
   └─ Action buttons appear (star, edit, delete)

2. Click the star button
   └─ Meal moves to the Favourites section at the top of the sidebar
       └─ Favourites persist across sessions (local storage / cloud if signed in)

3. Next planning session
   └─ Favourites section visible immediately at the top of the library
       └─ No scrolling or searching needed for regular meals
```

**Removing a favourite:**
```
1. Click the active star on any favourited meal card
   └─ Meal returns to the main library section
```

**End state:** Most-used meals are pinned at the top of the library, making weekly planning faster.
**Notes:** Favourites apply to both meals and snacks. The Favourites section shows meals and snacks together, with a toggle to filter between them.

---

## Flow 8 — Save a Friend's Recipe

**Goal:** Find a recipe a friend has shared and save it to your own library.
**Persona:** The Weekly Planner
**Trigger:** Friend mentions a meal they've been making, user wants to try it.

```
1. Open the sidebar view switcher → select "Friends"

2. Browse friends' recipes
   ├─ Filter by friend name
   └─ Filter by tag

3. Click a recipe card → recipe detail view opens
   └─ Read through ingredients and instructions

4. Click "+ Save" below the recipe card
   └─ Recipe copied to own library as a private meal

5. Return to Library view
   └─ Saved meal now appears in library, ready to plan
```

**End state:** Friend's recipe is in the user's library and can be dragged onto the calendar.
**Edge cases:**
- Already saved → button shows "Saved", disabled
- Not signed in → Friends view prompts sign in

---

## Flow Summary — What the Wireframes Need to Cover

| Screen / State | Flows it appears in |
|---|---|
| Calendar view (main) | 2, 5, 6 |
| Library sidebar — favourites section | 2, 5, 7 |
| Library sidebar — browse | 2, 5 |
| Library sidebar — search results | 2, 3, 5 |
| Meal form (create / edit) | 3 |
| Planned meal card (assignment + servings) | 2, 5, 6 |
| Shopping list modal | 4 |
| Recipe detail view | 2, 3, 8 |
| Auth (sign up / sign in) | 1 |
| Household setup | 1 |
| Friends sidebar view | 8 |
