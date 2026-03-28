# MealPlanner — User Personas

> Last updated: March 2026

---

## Overview

Three personas cover the realistic user base for this app. They share the same product but interact with it very differently.

| Persona | Role | Primary surface |
|---|---|---|
| **The Weekly Planner** | Drives meal planning for the household | Web app |
| **The Household Partner** | Participates in the plan, does the shopping | Companion app + occasional web |
| **The Solo Meal Prepper** | Plans and shops entirely for themselves | Web app |

---

## Persona 1 — The Weekly Planner

> *"I just want to know what we're eating this week and not think about it again until Sunday."*

### Profile
**Name:** David
**Situation:** Lives with a partner. Works full time. Cooks most nights but hates the mental overhead of deciding what to eat every day and doing a disorganised shop.

### Goals
- Plan the full week of meals in one sitting (Sunday evening)
- Know exactly what to buy and in what quantities
- Avoid food waste — buy only what's needed, when it's needed
- Build up a library of go-to meals so planning gets faster over time

### Pain Points
- Forgetting to account for nights one person is eating out — buying too much
- Buying perishables too early and having them go off before the meal
- Supermarket visits without a proper list — buying the wrong things or forgetting items
- Starting from scratch every week instead of reusing past meals

### How They Use the App
1. Opens the web app on Sunday
2. Selects the week on the calendar
3. Drags meals from their library onto each day — adjusting who's eating each night
4. Notices chicken is planned for Tuesday and Friday — opens the shopping list, sees it flagged as perishable with dates
5. Generates the shopping list, syncs it to the companion app
6. Occasionally creates a new meal after trying something new during the week

### What Success Looks Like
The weekly plan takes under 10 minutes. The shopping list is accurate to what they actually need. No food wasted, no last-minute "what are we having?" conversations.

### Key Features They Depend On
- Drag and drop planner
- Household member assignment (accounts for nights out)
- Perishable date display in shopping list
- Shopping list sync to companion app
- Library of saved meals

---

## Persona 2 — The Household Partner

> *"I just need to know what we're having and what to grab at the shops."*

### Profile
**Name:** Sarah
**Situation:** Lives with The Weekly Planner. Shares the household but doesn't drive the meal planning. Often does the supermarket run.

### Goals
- Know what meals are planned without having to ask
- Have a clear shopping list ready on her phone when she's at the supermarket
- Occasionally suggest or add a meal she wants that week

### Pain Points
- Getting a shopping list sent over WhatsApp as a photo or text — hard to check things off while walking around a store
- Not knowing which nights she's been assigned a meal vs. nights she's eating out
- Bad supermarket signal making web apps unreliable mid-shop

### How They Use the App
- Primarily uses the **companion app** in-store — checklist view, checks off items as she shops
- Occasionally opens the web app to see what's planned for the week or drag a meal she wants onto the calendar
- Rarely creates meals or manages the library

### What Success Looks Like
She opens the companion app in the supermarket car park. The list is already there, organised by category, with the perishables flagged. She checks everything off and leaves. Done.

### Key Features They Depend On
- Companion app checklist (out of scope here)
- Shopping list sync from web app → companion app
- Household member assignment (knows which meals she's eating)
- Read access to the weekly plan

### Notes for Design
Sarah is a secondary user of the **web app** but a primary user of the **companion app**. The web app doesn't need to be optimised for her but it shouldn't confuse her if she does open it. She should be able to see the plan and the shopping list without needing to understand the full feature set.

---

## Persona 3 — The Solo Meal Prepper

> *"I cook in batches for the week. I need to know exactly how much of everything to buy for one person."*

### Profile
**Name:** Alex
**Situation:** Lives alone. Meal preps on Sundays — cooks 2–3 recipes in bulk and portions them out for the week. Conscious about not over-buying.

### Goals
- Scale every recipe down to exactly one person's portions
- Never buy more than needed
- Rotate a core set of meals to keep things interesting without constant planning effort

### Pain Points
- Recipe books and websites always serve 4 — mental arithmetic to scale down is tedious and error-prone
- Buying a full bunch of herbs for a recipe that needs one sprig
- Re-entering the same meals every week

### How They Use the App
1. Has a library of ~15–20 go-to meals
2. Plans 3–4 meals per week and maps them across multiple days (e.g. chicken stir fry on Tuesday, portioned out for Wednesday lunch too)
3. Sets servings to 1 on each planned meal — shopping list quantities scale accordingly
4. Generates the list and shops once a week

### What Success Looks Like
The shopping list shows exactly the right quantities for one person across the week. No leftovers of ingredients he'll never use. Planning takes 5 minutes because he's reusing the same meals.

### Key Features They Depend On
- Recipe scaling (set servings per planned meal instance)
- Precise fractional quantities in the shopping list
- A solid library of saved meals to reuse
- Single-user assignment (no household complexity)

---

## Cross-Persona Themes

These needs appear across all three personas and should be treated as non-negotiable:

| Theme | Why it matters |
|---|---|
| **Accuracy** | The shopping list must reflect exactly what's needed — wrong quantities mean waste or a second trip |
| **Speed** | Planning should be fast — drag and drop, not form filling |
| **Clarity** | The shopping list should be immediately readable in a supermarket — good grouping, no clutter |
| **Reliability** | The companion app needs to work offline or in low-signal environments |
