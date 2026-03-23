# Seed Script

Populates `globalIngredients` in Firestore with the canonical ingredient catalogue.

## First-time setup

1. Go to [Firebase Console](https://console.firebase.google.com) → your project → **Project Settings** → **Service Accounts**
2. Click **Generate new private key** and download the JSON file
3. Rename it to `serviceAccount.json` and place it in this `scripts/` folder

> **Never commit `serviceAccount.json`** — it is already in `.gitignore`

## Run

```bash
npm run seed
```

The script is **idempotent** — safe to run multiple times. It uses `set()` so re-running
overwrites existing documents with the same data.

## What it seeds

- **`globalIngredients/{id}`** — one document per ingredient, containing:
  - `id`, `name`, `category`, `perishable`
  - `customUnits[]` — ingredient-specific units (e.g. `clove` for garlic)

## After running

Once you confirm the data looks correct in the Firebase Console, the
`MOCK_INGREDIENTS` and `MOCK_CUSTOM_UNITS` arrays have already been removed
from `src/context/initialState.ts` — the app now loads ingredients from
Firestore on sign-in.
