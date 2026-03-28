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
  isSnack?: boolean;
  photoUrl?: string;
  source?: "global" | "local";       // set at load time — not persisted
  bookmarkedFromId?: string;         // set when bookmarking a global snack
  globalStatus?: GlobalStatus;       // review status for user-submitted snacks
  customUnits?: CustomUnit[];
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: UnitRef;
}

export interface RecipeStepIngredient {
  ingredientId: string;
  quantity: number;
  unit: UnitRef;
}

export interface RecipeStep {
  text: string;
  stepIngredients: RecipeStepIngredient[];
}

export type GlobalStatus = "none" | "pending" | "approved" | "rejected" | "pending_update";
export type RecipeVisibility = "private" | "friends" | "global";

export interface Meal {
  id: string;
  name: string;
  photoUrl: string;
  servings: number;
  ingredients: RecipeIngredient[];
  tags: string[];
  description?: string;
  instructions?: string[];
  steps?: RecipeStep[];
  globalStatus?: GlobalStatus;
  visibility?: RecipeVisibility;
  bookmarkedFromId?: string | null;
  originalOwnerId?: string | null;
  rejectionReason?: string | null;
  ownerDisplayName?: string;        // resolved at read time for friend/global/bookmarked cards
  localUpdatedAt?: number;          // client Date.now() — used for cloud merge conflict resolution
  sharedWith?: string[];            // userIds that can read this recipe
}

// Predefined tag taxonomy (EPIC-3-3)
export const RECIPE_TAGS: Record<string, string[]> = {
  "Cuisine":   ["Italian", "Asian", "Mexican", "American", "Mediterranean"],
  "Diet":      ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free"],
  "Meal Type": ["Breakfast", "Lunch", "Dinner", "Snack"],
  "Cook Time": ["Under 30 min", "Under 1 hour", "Over 1 hour"],
};

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
  portions?: number; // how many portions planned; default 1
}

export interface PlannedSnack {
  instanceId: string;
  ingredientId: string;
  quantity: number;
  unit: UnitRef;
  date: string;
  mealType: string;
  assignedUsers: string[];
}

// --- Favourites ---

export interface FavouriteItem {
  id: string;
  type: "meal" | "snack";
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
  snacks: PlannedSnack[];

  selectedUserIds: string[];
  selectedDates: string[];
  selectedPlannedMealInstanceId: string | null;

  mealColumns: string[];
  shoppingListSettings: ShoppingListSettings;
  favourites: FavouriteItem[];
}
