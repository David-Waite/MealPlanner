// --- Core Data Models ---

// UPDATED to be more flexible
export type Unit =
  | "g"
  | "ml"
  | "unit"
  | "tsp" // teaspoon
  | "tbsp" // tablespoon
  | "cup"
  | "oz"
  | "lb"
  | "pint"
  | "large"
  | "medium"
  | "small"
  | "can"; // e.g., 1 can of beans

export interface Ingredient {
  id: string; // e.g., 'ing_chicken_breast'
  name: string; // 'Chicken Breast'
  category: string; // 'Meat', 'Vegetable', 'Pantry'
}

export interface RecipeIngredient {
  ingredientId: string; // 'ing_chicken_breast'
  quantity: number; // 200
  unit: Unit; // 'g'
}

export interface Meal {
  id: string; // e.g., 'meal_spicy_turkey'
  name: string; // 'Spicy Spaghetti & Turkey Meat Sauce'
  photoUrl: string; // '/media/spaghetti.png'
  servings: number; // Total servings this recipe makes (e.g., 4)
  ingredients: RecipeIngredient[];
}

export interface User {
  id: string; // e.g., 'user_a'
  initials: string; // 'GA'
  color: string; // '#4A90E2'
}

export interface PlannedMeal {
  instanceId: string; // A unique ID for *this specific plan*
  mealId: string; // 'meal_spicy_turkey' (links to the Meal)
  date: string; // '2025-10-27' (ISO date string)
  mealType: string; // 'Breakfast', 'Lunch', 'Dinner'
  assignedUsers: string[]; // ['user_a', 'user_b']
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
