# MealPlanner — Feature Document

> Last updated: March 2026

---

## Product Vision

A desktop household meal planning tool that turns a weekly meal plan into a precise shopping list. The web app is the planning surface — you build your week, assign meals to people, and get a shopping list with exactly what you need. A separate React Native companion app (out of scope here) handles in-store shopping and in-kitchen recipe viewing.

**The core loop:**
> Add meals to your library → drag them onto the weekly calendar → assign household members → generate a shopping list

Everything in the product either supports this loop or is a secondary feature.

---

## Scope

| Platform | Status |
|---|---|
| Web app (desktop) | In scope — this document |
| Companion app (React Native, iOS) | Out of scope — separate project |

The web app is desktop-first. Mobile responsiveness is not a priority.

---

## Users

A small household — one or more people sharing a single account. Members are lightweight profiles (name, initials, colour) rather than separate accounts. A typical household is 1–2 people, but the system should support up to ~6.

---

## Feature Areas

### 1. Meal Library

The library is where all meals live before they go on the calendar. Creating a meal with its full ingredient list is the foundation of everything else — no ingredients, no shopping list.

#### 1.1 Create / Edit Meal

**In scope:**
- Name, description
- **Multiple photos** — one main cover photo (used on cards and the planner) plus additional photos (step photos, finished dish, etc.)
- Servings (base serving size the recipe is written for)
- Ingredients with quantity and unit (metric and imperial core units + custom units per ingredient e.g. "clove" for garlic)
- Fractional quantities throughout — displayed as ¼ ½ ¾ ⅓ ⅔ etc., never as decimals
- Step-by-step instructions
- Tags (Cuisine, Diet, Meal Type, Cook Time)
- Save to personal library

**Out of scope / deferred:**
- Nutritional information
- Estimated cost per serving
- Video instructions

---

#### 1.2 Recipe Scaling

Scaling is set manually per planned meal instance — you tell the recipe how many servings you're cooking for, and it shows you the adjusted quantities alongside the originals. This is especially useful in the companion app (in-kitchen view) but the web app should support setting it.

**In scope:**
- On a planned meal card, set the number of servings being cooked
- Recipe detail view shows both base quantities and scaled quantities when viewed from a planned meal context
- Fractional quantities only — no decimals (e.g. ½ tsp not 0.5 tsp)
- Scaling also feeds into shopping list quantities per meal

**Example:**
> Recipe serves 4. You set servings to 2 for Tuesday. Ingredients shown at ½× with the original in brackets.

**Companion app note:** The full in-kitchen scaling experience (step through recipe, adjust live) is a companion app feature. The web app just needs to support setting it.

---

#### 1.3 Meal Detail View

A read-only view of a meal's full recipe — cover photo, additional photos, description, tags, servings, ingredient list, instructions. Accessible by clicking any meal card in the app.

**In scope:**
- All recipe fields
- Photo gallery (cover + additional photos)
- Edit button (own recipes only) → opens edit form
- Scaled quantities when accessed from a planned meal context

**Status:** Built (basic version). Multiple photos and scaling context to be added.

---

#### 1.4 Snacks

Lightweight items (fruit, protein bar, yoghurt) that sit on the calendar like meals but without a full recipe.

**In scope:**
- Create / edit snacks
- Name, category, photo, perishable flag
- Drag onto calendar
- Favourites

**Status:** Partially built. Edit from library was unreachable — fixed.

---

#### 1.5 Ingredient Database

Ingredients underpin everything — recipes, snacks, and the shopping list all reference them.

**How it works:**
- `globalIngredients` is a shared Firestore collection seeded with common cooking ingredients (one-time, deferred task using USDA Foundation Foods as a base)
- Users can create custom local ingredients at any time
- Users can submit a local ingredient for global review — admin approves it and it becomes available to everyone
- This creates a natural crowdsourced loop: one user adds a new protein bar, admin approves it, their friends don't have to add it themselves

**In scope:**
- Search across global ingredients when building a recipe
- Create custom local ingredients (always available, no approval needed)
- Submit a local ingredient for global review
- Admin approves/rejects submitted ingredients
- Perishable flag on all ingredients
- Custom units per ingredient (e.g. "clove", "rasher")
- Category tagging (Produce, Meat, Dairy, Pantry, Snacks, Frozen, Other)

**Note:** The admin pipeline for *recipes* (global recipe discovery/submission) is cut — scope creep. The admin pipeline for *ingredients* is kept — it serves the core loop.

**Out of scope:**
- Nutritional data per ingredient
- Seeding from third-party database (deferred)

---

### 2. Meal Planner (Calendar)

The calendar is the main workspace. You build the week by placing meals into slots, assign household members, and the shopping list is derived from what's here.

#### 2.1 Calendar Grid

**In scope:**
- Infinite scroll calendar (day rows, meal type columns)
- **Custom columns** — add, remove, rename meal type columns (Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner are defaults)
- Select one or more dates (click, shift+click range, drag select)
- Drag meal / snack from library into a slot
- Multiple meals per slot
- Visual indicator on library cards showing remaining servings to plan for selected dates

**Deferred:**
- Recurring meal templates (e.g. "every Monday is pasta night")
- Week/month view toggle

---

#### 2.2 Planned Meal Card

**In scope:**
- Meal cover photo and name
- Assign household members (drives portion scaling)
- Set servings for this instance (drives recipe scaling)
- Remove from slot
- Click to open recipe detail view

---

#### 2.3 Portion & User Assignment

Core feature. Assigning household members to a meal drives shopping list quantities.

**In scope:**
- Assign any subset of household members per planned meal
- Set servings being cooked per planned meal instance
- Scaling logic: `(assignedUsers / baseServings) × ingredient quantity`

**Example:**
> Recipe serves 4. You assign 2 people, servings set to 2. Shopping list gets 1× ingredients (full recipe).
> Recipe serves 4. You assign 2 people, servings set to 1. Shopping list gets 0.5× ingredients.

---

### 3. Shopping List

The primary output of the app. Used at the supermarket — needs to be clear and accurate.

#### 3.1 List Generation

**In scope:**
- Generate from all meals **and snacks** planned across selected dates
- Scale quantities by assigned users and servings per meal
- Group by ingredient category
- Aggregate the same ingredient across multiple meals
- Unit conversion toggle (metric / imperial)
- Custom unit label toggle (show "2 cloves" vs. "8g")

**Bug to fix:**
- Snacks currently excluded from shopping list generation

---

#### 3.2 Perishables & Dates

Perishables show which days they're needed. Non-perishables never show dates.

**In scope:**
- Perishable ingredients display the date(s) they're needed in the list
- Toggle to show/hide dates on perishables — default off for a cleaner view
- Non-perishables always shown without dates

**Example (dates visible):**
> **Chicken breast** — 400g *(Wed, Fri)*
> **Pasta** — 300g

**Example (dates hidden):**
> **Chicken breast** — 400g
> **Pasta** — 300g

---

#### 3.3 Checklist & Sync

**In scope:**
- Check items off as you shop
- Sync to Firestore for companion app to read
- Archive previous lists

**Out of scope (web app):**
- Real-time two-person sync while shopping (companion app)
- Aisle ordering

---

### 4. Household Users

**In scope:**
- Add up to ~6 household members (name, initials, colour)
- Select active members in the header
- Edit member details

**Out of scope:**
- Separate logins per member
- Permission levels
- Per-member dietary preferences (deferred)

---

### 5. Social & Discovery (Nice-to-have)

Secondary features. Not in the way of the core loop — accessible via a view switch, not surfaced by default.

#### 5.1 Friends & Recipe Sharing

- Share recipes with specific friends
- View and save friends' recipes
- Friends view is behind a sidebar view switch — not prominent

**Status:** Built. Recent fixes — friend recipes no longer editable by non-owners, Save to library added.

---

#### 5.2 Global Recipe Discovery

**Decision: Cut.** Global recipe discovery (browse/submit/approve recipes) is scope creep. The admin pipeline is kept for *ingredients* only — not recipes.

---

### 6. Auth & Account

#### 6.1 Try Before You Sign Up

Users should be able to experience the full core loop without creating an account. The app loads with a set of curated demo recipes so there is something to plan with immediately. Local state (plan, household members, settings) is stored in the browser.

The full app — creating meals, planning the calendar, generating a shopping list — works without an account. Everything saves to local browser storage.

An account is only required when the user wants to:
- Sync their plan / shopping list to the companion app
- Add friends
- Save their library and plan to the cloud (so it's available on other devices)

At those moments, a sign-up prompt is shown in context — not a wall before the app loads.

**On sign-up:** local state (plan, demo meals added, household members) is migrated to the new account so nothing is lost.

**Demo recipes:**
- A curated set of ~10–15 recipes pre-loaded for all unauthenticated users
- Product-owned, not user-generated
- Cover a range of meal types so the app feels useful immediately
- Clearly labelled as demo content (users can delete or replace them)

#### 6.2 Account

**In scope:**
- Email / password sign in and sign up
- **Password reset flow** (not yet built)
- Cloud sync — recipes, plan, household members, favourites, shopping list settings
- Merge local state on first sign-in

---

## Known Bugs & Issues

| Issue | Priority | Status |
|---|---|---|
| Snacks not included in shopping list generation | High | Open |
| No password reset flow | Medium | Open |
| Custom column UI not built (data model exists) | Medium | Open |
| Multiple photos not supported on meals | Low | Open |
| Rejection reason not shown to recipe owner | Low | Open |
| Friend recipes editable by non-owners | High | Fixed |
| No "Save to library" for friend recipes | High | Fixed |
| Snack edit unreachable from library | Medium | Fixed |

---

## Out of Scope (this app)

- In-store shopping mode (companion app)
- In-kitchen step-by-step recipe view (companion app)
- Live scaling while cooking (companion app)
- Push notifications
- Nutritional tracking
- Budget / cost tracking
- Barcode scanning
- AI meal suggestions
- Grocery delivery integration
- Mobile web support

---

## Decisions Log

| Question | Decision |
|---|---|
| Multiple photos on meals? | Yes — one cover photo + additional photos |
| Recipe scaling — automatic or manual? | Manual, set per planned meal. Fractional display only. |
| Fractional quantities display? | Fractions only (¼ ½ ¾ ⅓ ⅔) — never decimals |
| Custom calendar columns in scope? | Yes |
| Global recipe pipeline — keep or cut? | Cut (scope creep). Admin pipeline kept for ingredients only — crowdsourced, quality-gated |
| Ingredient database approach? | Seed from USDA Foundation Foods (deferred). Users submit custom ingredients for admin approval — natural library growth |
| Auth gate — when to require sign up? | Only when syncing to companion app, adding friends, or saving to cloud. Everything else (create meals/snacks, plan, shopping list) works locally without an account |
| Demo recipes — replace global recipes? | Yes. ~10–15 product-owned curated recipes pre-loaded for all users. Not user-generated. |
| Friends feature prominence? | Current placement is fine — behind a view switch, not in the way |
