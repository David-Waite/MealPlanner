// --- Core Data Models ---

// NEW: Strongly-typed categories
export type IngredientCategory =
  | "Produce"
  | "Meat"
  | "Dairy"
  | "Pantry"
  | "Snacks"
  | "Household & Cleaning"
  | "Frozen"
  | "Other"; // Added 'Other' as a fallback

// NEW: The defined sort order for the shopping list
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

export type Unit =
  | "g"
  | "ml"
  | "unit"
  | "tsp"
  | "tbsp"
  | "cup"
  | "oz"
  | "lb"
  | "pint"
  | "can";

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory; // UPDATED from string
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: Unit;
}
export interface Meal {
  id: string;
  name: string;
  photoUrl: string;
  servings: number;
  ingredients: RecipeIngredient[];
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

// --- Application State ---

export interface AppState {
  // Master data lists
  meals: Meal[];
  ingredients: Ingredient[];
  users: User[];

  // The plan itself
  plan: PlannedMeal[];

  // UI state
  selectedUserIds: string[];
  selectedDates: string[];
  selectedPlannedMealInstanceId: string | null;

  // App settings
  mealColumns: string[];
}
