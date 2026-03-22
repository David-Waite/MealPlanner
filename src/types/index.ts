// --- Core Data Models ---

export type IngredientCategory =
  | "Produce"
  | "Meat"
  | "Dairy"
  | "Pantry"
  | "Snacks"
  | "Household & Cleaning"
  | "Frozen"
  | "Other";

export const CATEGORY_ORDER: IngredientCategory[] = [
  "Produce",
  "Meat",
  "Dairy",
  "Pantry",
  "Snacks",
  "Household & Cleaning",
  "Frozen",
  "Other",
];

// --- Unit System ---

export type MetricUnit = "g" | "kg" | "ml" | "l";
export type ImperialUnit = "oz" | "lb" | "fl oz" | "pint";
export type CookingUnit = "¼ tsp" | "½ tsp" | "tsp" | "½ tbsp" | "tbsp" | "cup" | "unit";

export type CoreUnit = MetricUnit | ImperialUnit | CookingUnit;

export const METRIC_UNITS: MetricUnit[] = ["g", "kg", "ml", "l"];
export const IMPERIAL_UNITS: ImperialUnit[] = ["oz", "lb", "fl oz", "pint"];
export const COOKING_UNITS: CookingUnit[] = ["¼ tsp", "½ tsp", "tsp", "½ tbsp", "tbsp", "cup", "unit"];

// A custom unit is tied to a specific ingredient (e.g. "clove" for garlic)
export interface CustomUnit {
  id: string;
  label: string;
  ingredientId: string;
  metricEquivalent?: number; // e.g. 4
  metricUnit?: MetricUnit;   // e.g. "g"
}

// A unit reference is either a standard core unit or a custom ingredient-specific unit
export type UnitRef =
  | { type: "core"; unit: CoreUnit }
  | { type: "custom"; customUnitId: string };

// --- Ingredient & Meal ---

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  perishable: boolean;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: UnitRef;
}

export interface Meal {
  id: string;
  name: string;
  photoUrl: string;
  servings: number;
  ingredients: RecipeIngredient[];
  tags: string[];
  localUpdatedAt?: number; // client Date.now() — used for cloud merge conflict resolution
}

export interface User {
  id: string;
  initials: string;
  color: string;
}

export interface PlannedMeal {
  instanceId: string;
  mealId: string;
  date: string;
  mealType: string;
  assignedUsers: string[];
}

// --- Shopping List Settings ---

export interface ShoppingListSettings {
  unitSystem: "metric" | "imperial";
  showCustomLabels: boolean;
}

// --- Application State ---

export interface AppState {
  meals: Meal[];
  ingredients: Ingredient[];
  users: User[];
  customUnits: CustomUnit[];

  plan: PlannedMeal[];

  selectedUserIds: string[];
  selectedDates: string[];
  selectedPlannedMealInstanceId: string | null;

  mealColumns: string[];
  shoppingListSettings: ShoppingListSettings;
}
