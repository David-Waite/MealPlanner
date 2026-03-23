/**
 * Seed script — populates globalIngredients in Firestore.
 *
 * Usage:
 *   npm run seed
 *
 * Prerequisites:
 *   1. Place your Firebase service account key at scripts/serviceAccount.json
 *      (download from Firebase Console → Project Settings → Service Accounts)
 *   2. Make sure firebase-admin and tsx are installed (npm install)
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccountPath = join(__dirname, "serviceAccount.json");
let serviceAccount: object;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
} catch {
  console.error(
    "❌  Could not read scripts/serviceAccount.json\n" +
      "    Download it from Firebase Console → Project Settings → Service Accounts\n" +
      "    and place it at scripts/serviceAccount.json"
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });
const db = getFirestore();

// ─── Seed Data ────────────────────────────────────────────────────────────────
// Source of truth. Once confirmed in Firestore, these arrays can be deleted
// from src/context/initialState.ts.

interface SeedCustomUnit {
  id: string;
  label: string;
  ingredientId: string;
  metricEquivalent?: number;
  metricUnit?: string;
}

interface SeedIngredient {
  id: string;
  name: string;
  category: string;
  perishable: boolean;
  customUnits: SeedCustomUnit[];
}

const CUSTOM_UNITS: SeedCustomUnit[] = [
  { id: "cu_garlic_clove",           label: "clove",   ingredientId: "ing_garlic",          metricEquivalent: 4,   metricUnit: "g" },
  { id: "cu_tomato_puree_can",       label: "can",     ingredientId: "ing_tomato_puree",    metricEquivalent: 400, metricUnit: "g" },
  { id: "cu_tuna_can",               label: "can",     ingredientId: "ing_tuna_canned",     metricEquivalent: 185, metricUnit: "g" },
  { id: "cu_broccolini_bunch",       label: "bunch",   ingredientId: "ing_broccolini",      metricEquivalent: 150, metricUnit: "g" },
  { id: "cu_red_onion_large",        label: "large",   ingredientId: "ing_red_onion",       metricEquivalent: 250, metricUnit: "g" },
  { id: "cu_red_onion_medium",       label: "medium",  ingredientId: "ing_red_onion",       metricEquivalent: 170, metricUnit: "g" },
  { id: "cu_red_onion_small",        label: "small",   ingredientId: "ing_red_onion",       metricEquivalent: 100, metricUnit: "g" },
  { id: "cu_zucchini_large",         label: "large",   ingredientId: "ing_zucchini",        metricEquivalent: 350, metricUnit: "g" },
  { id: "cu_thai_chile_medium",      label: "medium",  ingredientId: "ing_thai_chile",      metricEquivalent: 5,   metricUnit: "g" },
  { id: "cu_shallot_medium",         label: "medium",  ingredientId: "ing_shallot",         metricEquivalent: 60,  metricUnit: "g" },
  { id: "cu_red_bell_pepper_large",  label: "large",   ingredientId: "ing_red_bell_pepper", metricEquivalent: 200, metricUnit: "g" },
  { id: "cu_red_bell_pepper_medium", label: "medium",  ingredientId: "ing_red_bell_pepper", metricEquivalent: 150, metricUnit: "g" },
  { id: "cu_red_bell_pepper_small",  label: "small",   ingredientId: "ing_red_bell_pepper", metricEquivalent: 100, metricUnit: "g" },
  { id: "cu_green_bell_pepper_medium", label: "medium", ingredientId: "ing_green_bell_pepper", metricEquivalent: 150, metricUnit: "g" },
  { id: "cu_lemon_medium",           label: "medium",  ingredientId: "ing_lemon" },
  { id: "cu_lime_medium",            label: "medium",  ingredientId: "ing_lime" },
  { id: "cu_jalapeno_large",         label: "large",   ingredientId: "ing_jalapeno",        metricEquivalent: 45,  metricUnit: "g" },
  { id: "cu_jalapeno_medium",        label: "medium",  ingredientId: "ing_jalapeno",        metricEquivalent: 25,  metricUnit: "g" },
  { id: "cu_avocado_medium",         label: "medium",  ingredientId: "ing_avocado",         metricEquivalent: 150, metricUnit: "g" },
  { id: "cu_cucumber_large",         label: "large",   ingredientId: "ing_cucumber",        metricEquivalent: 300, metricUnit: "g" },
  { id: "cu_mixed_slaw_bag",         label: "bag",     ingredientId: "ing_mixed_slaw",      metricEquivalent: 400, metricUnit: "g" },
];

const RAW_INGREDIENTS = [
  { id: "ing_quinoa",               name: "Quinoa",                               category: "Pantry",   perishable: false },
  { id: "ing_spaghetti",            name: "Spaghetti",                            category: "Pantry",   perishable: false },
  { id: "ing_evoo",                 name: "Extra-Virgin Olive Oil",               category: "Pantry",   perishable: false },
  { id: "ing_red_onion",            name: "Red Onion",                            category: "Produce",  perishable: false },
  { id: "ing_kosher_salt",          name: "Kosher Salt",                          category: "Pantry",   perishable: false },
  { id: "ing_black_pepper",         name: "Black Pepper",                         category: "Pantry",   perishable: false },
  { id: "ing_zucchini",             name: "Zucchini",                             category: "Produce",  perishable: false },
  { id: "ing_garlic",               name: "Garlic",                               category: "Produce",  perishable: false },
  { id: "ing_ground_turkey",        name: "Ground Turkey",                        category: "Meat",     perishable: true  },
  { id: "ing_tomato_paste",         name: "Tomato Paste",                         category: "Pantry",   perishable: false },
  { id: "ing_gochujang",            name: "Gochujang",                            category: "Pantry",   perishable: false },
  { id: "ing_tomato_puree",         name: "Tomato Puree",                         category: "Pantry",   perishable: false },
  { id: "ing_worcestershire",       name: "Worcestershire Sauce",                 category: "Pantry",   perishable: false },
  { id: "ing_italian_seasoning",    name: "Italian Seasoning",                    category: "Pantry",   perishable: false },
  { id: "ing_red_pepper_flakes",    name: "Red Pepper Flakes",                    category: "Pantry",   perishable: false },
  { id: "ing_soy_sauce_reduced",    name: "Reduced-Sodium Soy Sauce",             category: "Pantry",   perishable: false },
  { id: "ing_oyster_sauce",         name: "Oyster Sauce",                         category: "Pantry",   perishable: false },
  { id: "ing_light_brown_sugar",    name: "Light Brown Sugar",                    category: "Pantry",   perishable: false },
  { id: "ing_canola_oil",           name: "Canola Oil",                           category: "Pantry",   perishable: false },
  { id: "ing_thai_chile",           name: "Thai Chile",                           category: "Produce",  perishable: false },
  { id: "ing_shallot",              name: "Shallot",                              category: "Produce",  perishable: false },
  { id: "ing_ground_chicken",       name: "Ground Chicken",                       category: "Meat",     perishable: true  },
  { id: "ing_green_beans",          name: "Green Beans",                          category: "Produce",  perishable: false },
  { id: "ing_red_bell_pepper",      name: "Red Capsicum",                         category: "Produce",  perishable: false },
  { id: "ing_thai_basil",           name: "Fresh Thai Basil",                     category: "Produce",  perishable: false },
  { id: "ing_rice",                 name: "Rice",                                 category: "Pantry",   perishable: false },
  { id: "ing_olive_oil_spray",      name: "Olive Oil Spray",                      category: "Pantry",   perishable: false },
  { id: "ing_honey",                name: "Honey",                                category: "Pantry",   perishable: false },
  { id: "ing_ginger",               name: "Fresh Ginger",                         category: "Produce",  perishable: false },
  { id: "ing_salmon_fillet",        name: "Salmon Fillet",                        category: "Meat",     perishable: true  },
  { id: "ing_broccolini",           name: "Broccolini",                           category: "Produce",  perishable: false },
  { id: "ing_lemon",                name: "Lemon",                                category: "Produce",  perishable: false },
  { id: "img_chicken_thighs_boneless", name: "Boneless Skinless Chicken Thighs", category: "Meat",     perishable: true  },
  { id: "ing_broccoli",             name: "Broccoli",                             category: "Produce",  perishable: false },
  { id: "ing_lime",                 name: "Lime",                                 category: "Produce",  perishable: false },
  { id: "ing_jalapeno",             name: "Jalapeño",                             category: "Produce",  perishable: false },
  { id: "ing_cilantro",             name: "Fresh Cilantro",                       category: "Produce",  perishable: false },
  { id: "ing_lime_juice",           name: "Lime Juice",                           category: "Pantry",   perishable: false },
  { id: "ing_mayonnaise",           name: "Mayonnaise",                           category: "Pantry",   perishable: false },
  { id: "ing_greek_yogurt",         name: "Greek Yogurt",                         category: "Dairy",    perishable: true  },
  { id: "ing_ground_cumin",         name: "Ground Cumin",                         category: "Pantry",   perishable: false },
  { id: "ing_spinach_tortilla",     name: "Spinach Tortillas",                    category: "Pantry",   perishable: false },
  { id: "ing_ranch_dressing",       name: "Ranch Dressing",                       category: "Pantry",   perishable: false },
  { id: "ing_sliced_turkey",        name: "Sliced Turkey",                        category: "Meat",     perishable: true  },
  { id: "ing_baby_arugula",         name: "Baby Arugula",                         category: "Produce",  perishable: false },
  { id: "ing_avocado",              name: "Avocado",                              category: "Produce",  perishable: false },
  { id: "ing_adobo_sauce",          name: "Adobo Sauce (from canned chipotles)",  category: "Pantry",   perishable: false },
  { id: "ing_rotisserie_chicken",   name: "Shredded Rotisserie Chicken",          category: "Meat",     perishable: true  },
  { id: "ing_taco_seasoning",       name: "Taco Seasoning",                       category: "Pantry",   perishable: false },
  { id: "ing_pickled_jalapenos",    name: "Sliced Pickled Jalapeños",             category: "Pantry",   perishable: false },
  { id: "ing_corn_kernels",         name: "Corn Kernels (frozen or canned)",      category: "Frozen",   perishable: false },
  { id: "ing_black_beans",          name: "Canned Black Beans",                   category: "Pantry",   perishable: false },
  { id: "ing_mexican_cheese_blend", name: "Shredded Mexican Cheese Blend",        category: "Dairy",    perishable: false },
  { id: "ing_grape_tomatoes",       name: "Grape Tomatoes",                       category: "Produce",  perishable: false },
  { id: "ing_romaine_lettuce",      name: "Romaine Lettuce",                      category: "Produce",  perishable: false },
  { id: "ing_tortilla_chips",       name: "Baked Tortilla Chips",                 category: "Snacks",   perishable: false },
  { id: "ing_tuna_canned",          name: "Canned Tuna",                          category: "Pantry",   perishable: false },
  { id: "ing_cucumber",             name: "Cucumber",                             category: "Produce",  perishable: false },
  { id: "ing_cherry_tomatoes",      name: "Cherry Tomatoes",                      category: "Produce",  perishable: false },
  { id: "ing_parsley",              name: "Fresh Parsley",                        category: "Produce",  perishable: false },
  { id: "ing_dill",                 name: "Fresh Dill",                           category: "Produce",  perishable: false },
  { id: "ing_scallions",            name: "Scallions",                            category: "Produce",  perishable: false },
  { id: "ing_lemon_wedge",          name: "Lemon Wedge",                          category: "Produce",  perishable: false },
  { id: "ing_banana",               name: "Banana",                               category: "Produce",  perishable: false },
  { id: "ing_apple",                name: "Apple",                                category: "Produce",  perishable: false },
  { id: "ing_kiwi",                 name: "Kiwi Fruit",                           category: "Produce",  perishable: false },
  { id: "ing_coffee",               name: "Coffee",                               category: "Pantry",   perishable: false },
  { id: "ing_light_milk",           name: "Light Milk",                           category: "Dairy",    perishable: false },
  { id: "ing_chili_powder",         name: "Chili Powder",                         category: "Pantry",   perishable: false },
  { id: "ing_garlic_powder",        name: "Garlic Powder",                        category: "Pantry",   perishable: false },
  { id: "ing_paprika",              name: "Paprika",                              category: "Pantry",   perishable: false },
  { id: "ing_onion_powder",         name: "Onion Powder",                         category: "Pantry",   perishable: false },
  { id: "ing_mahimahi_fillet",      name: "Mahimahi Fillet",                      category: "Meat",     perishable: true  },
  { id: "ing_green_bell_pepper",    name: "Green Bell Pepper",                    category: "Produce",  perishable: false },
  { id: "ing_corn_tortilla_chips",  name: "Corn Tortilla Chips",                  category: "Snacks",   perishable: false },
  { id: "ing_rice_vinegar",         name: "Rice Vinegar",                         category: "Pantry",   perishable: false },
  { id: "ing_toasted_sesame_oil",   name: "Toasted Sesame Oil",                   category: "Pantry",   perishable: false },
  { id: "ing_cabbage_shredded",     name: "Shredded Cabbage",                     category: "Produce",  perishable: false },
  { id: "ing_carrots_shredded",     name: "Shredded Carrots",                     category: "Produce",  perishable: false },
  { id: "ing_mint_fresh",           name: "Fresh Mint",                           category: "Produce",  perishable: false },
  { id: "ing_tortillas_mixed",      name: "Tortillas (Flour, Corn, or Almond)",   category: "Pantry",   perishable: false },
  { id: "ing_beef_sirloin",         name: "Thinly Sliced Beef Sirloin",           category: "Meat",     perishable: true  },
  { id: "ing_cornstarch",           name: "Cornstarch",                           category: "Pantry",   perishable: false },
  { id: "ing_broccoli_frozen",      name: "Frozen Broccoli Florets",              category: "Frozen",   perishable: false },
  { id: "ing_corn_tortillas",       name: "Corn Tortillas",                       category: "Pantry",   perishable: false },
  { id: "ing_frozen_fish",          name: "Frozen Fish Pieces",                   category: "Frozen",   perishable: false },
  { id: "ing_mixed_slaw",           name: "Mixed Slaw",                           category: "Produce",  perishable: true  },
  { id: "ing_sour_cream",           name: "Sour Cream",                           category: "Dairy",    perishable: true  },
  { id: "ing_hot_sauce",            name: "Hot Sauce",                            category: "Pantry",   perishable: false },
  { id: "ing_smoked_paprika",       name: "Smoked Paprika",                       category: "Pantry",   perishable: false },
  { id: "ing_chili_oil",            name: "Chili Oil",                            category: "Pantry",   perishable: false },
  { id: "ing_black_rice_vinegar",   name: "Chinese Black Rice Vinegar",           category: "Pantry",   perishable: false },
];

// ─── Build Seed Documents ──────────────────────────────────────────────────────

// Group custom units by ingredientId
const unitsByIngredient = new Map<string, SeedCustomUnit[]>();
for (const cu of CUSTOM_UNITS) {
  const arr = unitsByIngredient.get(cu.ingredientId) ?? [];
  arr.push(cu);
  unitsByIngredient.set(cu.ingredientId, arr);
}

// Build the final GlobalIngredient docs
const INGREDIENTS: SeedIngredient[] = RAW_INGREDIENTS.map((ing) => ({
  ...ing,
  customUnits: unitsByIngredient.get(ing.id) ?? [],
}));

// ─── Write to Firestore ────────────────────────────────────────────────────────

const BATCH_SIZE = 490;

async function run() {
  console.log(`\n🌱  Seeding ${INGREDIENTS.length} ingredients to globalIngredients…\n`);

  let written = 0;

  for (let i = 0; i < INGREDIENTS.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = INGREDIENTS.slice(i, i + BATCH_SIZE);

    for (const ingredient of chunk) {
      const ref = db.collection("globalIngredients").doc(ingredient.id);
      batch.set(ref, ingredient);
      console.log(`  ✓  ${ingredient.id.padEnd(34)} ${ingredient.name}`);
    }

    await batch.commit();
    written += chunk.length;
  }

  const totalUnits = INGREDIENTS.reduce((n, i) => n + i.customUnits.length, 0);
  console.log(`\n✅  Done. Wrote ${written} ingredients with ${totalUnits} custom units.\n`);
}

run().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
