import type { AppState, CoreUnit, CustomUnit, UnitRef } from "../types";
import { initialState } from "./initialState";

const STORAGE_KEY = "shopSmartState";

// Maps legacy string units (old format) to CoreUnit where possible
const LEGACY_TO_CORE: Record<string, CoreUnit> = {
  g: "g", kg: "kg", ml: "ml", l: "l",
  oz: "oz", lb: "lb", "fl oz": "fl oz", pint: "pint",
  "¼ tsp": "¼ tsp", "½ tsp": "½ tsp", tsp: "tsp",
  "½ tbsp": "½ tbsp", tbsp: "tbsp", cup: "cup", unit: "unit",
};

// Converts meals that still use the old string unit format to the new UnitRef format.
// For non-standard string units (e.g. "cloves", "large", "can"), we look up a matching
// custom unit by ingredientId + label, or create a label-only one on the fly.
function migrateMeals(meals: any[], customUnits: CustomUnit[]): { meals: any[]; customUnits: CustomUnit[] } {
  const migratedCustomUnits = [...customUnits];

  const migratedMeals = meals.map((meal: any) => ({
    ...meal,
    ingredients: meal.ingredients.map((ing: any) => {
      // Already in new format
      if (ing.unit && typeof ing.unit === "object") return ing;

      const legacyUnit: string = ing.unit;
      const coreUnit = LEGACY_TO_CORE[legacyUnit];

      if (coreUnit) {
        return { ...ing, unit: { type: "core", unit: coreUnit } satisfies UnitRef };
      }

      // Non-standard unit — find or create a custom unit for this ingredient
      let existing = migratedCustomUnits.find(
        (cu) => cu.ingredientId === ing.ingredientId && cu.label === legacyUnit
      );

      if (!existing) {
        existing = {
          id: `migrated_${ing.ingredientId}_${legacyUnit}`,
          label: legacyUnit,
          ingredientId: ing.ingredientId,
        };
        migratedCustomUnits.push(existing);
      }

      return { ...ing, unit: { type: "custom", customUnitId: existing.id } satisfies UnitRef };
    }),
  }));

  return { meals: migratedMeals, customUnits: migratedCustomUnits };
}

export const saveState = (state: AppState): void => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error("Could not save state", err);
  }
};

export const loadState = (): AppState => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return initialState;
    }

    const parsedState = JSON.parse(serializedState);

    // Merge with initialState to fill in any new top-level keys
    let merged: AppState = { ...initialState, ...parsedState };

    // Ensure customUnits and shoppingListSettings exist (new fields)
    if (!merged.customUnits) merged = { ...merged, customUnits: initialState.customUnits };
    if (!merged.shoppingListSettings) merged = { ...merged, shoppingListSettings: initialState.shoppingListSettings };

    // Ensure every meal has localUpdatedAt (new field)
    merged = {
      ...merged,
      meals: merged.meals.map((m: any) =>
        m.localUpdatedAt !== undefined ? m : { ...m, localUpdatedAt: 0 }
      ),
    };

    // Migrate meals if they still use old string-based units
    const needsMigration = merged.meals.some(
      (m) => m.ingredients.some((i: any) => typeof i.unit === "string")
    );
    if (needsMigration) {
      const { meals, customUnits } = migrateMeals(merged.meals, merged.customUnits);
      merged = { ...merged, meals, customUnits };
    }

    return merged;
  } catch (err) {
    console.warn("Could not load state, returning default", err);
    return initialState;
  }
};
