/**
 * Seed script — adds common fruits as global snacks to Firestore.
 *
 * Usage:
 *   npm run seed:fruits
 *
 * Prerequisites:
 *   scripts/serviceAccount.json must be present.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccountPath = join(__dirname, "serviceAccount.json");
let serviceAccount: object;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
} catch {
  console.error(
    "❌  Could not read scripts/serviceAccount.json\n" +
      "    Download it from Firebase Console → Project Settings → Service Accounts"
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });
const db = getFirestore();

// ─── Fruit Snacks ─────────────────────────────────────────────────────────────
// Apple and Blueberries already exist in Firestore.
// This script adds the remaining 13 to reach a pool of 15 common fruits.

interface FruitSnack {
  id: string;
  name: string;
}

const FRUIT_SNACKS: FruitSnack[] = [
  { id: "snack_banana",      name: "Banana"      },
  { id: "snack_strawberry",  name: "Strawberry"  },
  { id: "snack_mango",       name: "Mango"       },
  { id: "snack_grapes",      name: "Grapes"      },
  { id: "snack_watermelon",  name: "Watermelon"  },
  { id: "snack_orange",      name: "Orange"      },
  { id: "snack_peach",       name: "Peach"       },
  { id: "snack_pineapple",   name: "Pineapple"   },
  { id: "snack_raspberry",   name: "Raspberry"   },
  { id: "snack_kiwi",        name: "Kiwi"        },
  { id: "snack_pear",        name: "Pear"        },
  { id: "snack_cherries",    name: "Cherries"    },
  { id: "snack_cantaloupe",  name: "Cantaloupe"  },
];

async function run() {
  console.log(`\n🍓  Seeding ${FRUIT_SNACKS.length} fruit snacks to globalIngredients…\n`);

  const batch = db.batch();

  for (const fruit of FRUIT_SNACKS) {
    const ref = db.collection("globalIngredients").doc(fruit.id);
    batch.set(ref, {
      name: fruit.name,
      category: "Produce",
      perishable: true,
      isSnack: true,
      photoUrl: null,
      bookmarkedFromId: null,
      globalStatus: "approved",
      customUnits: [],
    });
    console.log(`  ✓  ${fruit.id.padEnd(22)} ${fruit.name}`);
  }

  await batch.commit();
  console.log(`\n✅  Done. Wrote ${FRUIT_SNACKS.length} fruit snacks.\n`);
}

run().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
