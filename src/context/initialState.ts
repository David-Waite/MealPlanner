import type { AppState, Ingredient, Meal } from "../types";

// Let's add mock ingredients (now with an explicit type)
const MOCK_INGREDIENTS: Ingredient[] = [
  // Original Ingredients
  { id: "ing1", name: "Ground Turkey", category: "Meat" },
  { id: "ing2", name: "Spaghetti", category: "Pantry" },
  { id: "ing3", name: "Tomato Sauce", category: "Pantry" },
  { id: "ing4", name: "Chicken Breast", category: "Meat" },
  { id: "ing5", name: "Rice (Cooked)", category: "Pantry" },
  { id: "ing6", name: "Teriyaki Sauce", category: "Pantry" },

  // From Tuna Salad
  { id: "ing_quinoa", name: "Quinoa", category: "Pantry" },
  { id: "ing_kosher_salt", name: "Kosher Salt", category: "Pantry" },
  {
    id: "ing_extra_virgin_olive_oil",
    name: "Extra-Virgin Olive Oil",
    category: "Pantry",
  },
  {
    id: "ing_fresh_lemon_juice",
    name: "Fresh Lemon Juice",
    category: "Produce",
  },
  { id: "ing_garlic_cloves", name: "Garlic Cloves", category: "Produce" },
  {
    id: "ing_freshly_ground_black_pepper",
    name: "Black Pepper",
    category: "Pantry",
  },
  {
    id: "ing_albacore_tuna_canned",
    name: "Canned Albacore Tuna",
    category: "Pantry",
  },
  { id: "ing_cucumber", name: "Cucumber", category: "Produce" },
  { id: "ing_cherry_tomatoes", name: "Cherry Tomatoes", category: "Produce" },
  {
    id: "ing_chopped_fresh_parsley",
    name: "Fresh Parsley",
    category: "Produce",
  },
  { id: "ing_chopped_fresh_dill", name: "Fresh Dill", category: "Produce" },
  { id: "ing_scallions", name: "Scallions", category: "Produce" },

  // From Taco Salad
  { id: "ing_taco_seasoning", name: "Taco Seasoning", category: "Pantry" },
  {
    id: "ing_plain_greek_yogurt",
    name: "Plain Greek Yogurt",
    category: "Dairy",
  },
  {
    id: "ing_chopped_fresh_cilantro",
    name: "Fresh Cilantro",
    category: "Produce",
  },
  { id: "ing_fresh_lime_juice", name: "Lime Juice", category: "Produce" },
  {
    id: "ing_canned_black_beans",
    name: "Canned Black Beans",
    category: "Pantry",
  },
  { id: "ing_corn", name: "Corn (Fresh or Frozen)", category: "Produce" },
  { id: "ing_red_onion", name: "Red Onion", category: "Produce" },
  { id: "ing_romaine_lettuce", name: "Romaine Lettuce", category: "Produce" },

  // From Curry
  { id: "ing_yellow_onion", name: "Yellow Onion", category: "Produce" },
  { id: "ing_fresh_ginger", name: "Fresh Ginger", category: "Produce" },
  { id: "ing_curry_powder", name: "Curry Powder", category: "Pantry" },
  { id: "ing_turmeric", name: "Turmeric", category: "Pantry" },
  {
    id: "ing_canned_diced_tomatoes",
    name: "Canned Diced Tomatoes",
    category: "Pantry",
  },
  {
    id: "ing_canned_chickpeas",
    name: "Canned Chickpeas",
    category: "Pantry",
  },
  {
    id: "ing_canned_coconut_milk",
    name: "Canned Coconut Milk",
    category: "Pantry",
  },
  { id: "ing_green_beans", name: "Green Beans", category: "Produce" },

  // From Gnocchi
  { id: "ing_gnocchi", name: "Shelf-Stable Gnocchi", category: "Pantry" },
  {
    id: "ing_red_pepper_flakes",
    name: "Red Pepper Flakes",
    category: "Pantry",
  },
  { id: "ing_heavy_cream", name: "Heavy Cream", category: "Dairy" },
  { id: "ing_parmesan_cheese", name: "Parmesan Cheese", category: "Dairy" },
  { id: "ing_spinach", name: "Spinach", category: "Produce" },
  { id: "ing_fresh_basil", name: "Fresh Basil", category: "Produce" },

  // From Salmon
  { id: "ing_salmon_fillet", name: "Salmon Fillet", category: "Meat" },
  { id: "ing_unsalted_butter", name: "Unsalted Butter", category: "Dairy" },
  { id: "ing_chicken_broth", name: "Chicken Broth", category: "Pantry" },
  { id: "ing_lemon", name: "Lemon", category: "Produce" },

  // From Meatballs
  { id: "ing_ground_chicken", name: "Ground Chicken", category: "Meat" },
  { id: "ing_breadcrumbs", name: "Breadcrumbs", category: "Pantry" },
  { id: "ing_dried_oregano", name: "Dried Oregano", category: "Pantry" },
  { id: "ing_tzatziki", name: "Tzatziki", category: "Dairy" },
  { id: "ing_pita_bread", name: "Pita Bread", category: "Pantry" },

  // From Sheet Pan
  { id: "ing_broccoli", name: "Broccoli", category: "Produce" },
  { id: "ing_baby_potatoes", name: "Baby Potatoes", category: "Produce" },
  { id: "ing_garlic_powder", name: "Garlic Powder", category: "Pantry" },
  { id: "ing_kielbasa_sausage", name: "Kielbasa Sausage", category: "Meat" },

  // From Fried Rice
  { id: "ing_sesame_oil", name: "Sesame Oil", category: "Pantry" },
  {
    id: "ing_frozen_peas_carrots",
    name: "Frozen Peas & Carrots",
    category: "Frozen",
  },
  { id: "ing_large_eggs", name: "Large Eggs", category: "Dairy" },
  { id: "ing_soy_sauce", name: "Soy Sauce", category: "Pantry" },
];

// Let's add mock meals (now with an explicit type)
const MOCK_MEALS: Meal[] = [
  // Original Meals
  {
    id: "meal1",
    name: "Spicy Spaghetti & Turkey Meat Sauce",
    photoUrl: "/media/spicy-spaghetti-turkey-meat-sauce.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "", quantity: 500, unit: "g" },
      { ingredientId: "ing2", quantity: 400, unit: "g" },
      { ingredientId: "ing3", quantity: 1, unit: "unit" },
    ],
  },
  {
    id: "meal2",
    name: "Thai Basil Chicken Bowls",
    photoUrl: "/media/thai-basil-chicken-bowls.jpg",
    servings: 2,
    ingredients: [
      { ingredientId: "ing4", quantity: 300, unit: "g" },
      { ingredientId: "ing5", quantity: 200, unit: "g" },
      { ingredientId: "ing6", quantity: 50, unit: "ml" },
    ],
  },
  // New Meals from Images
  {
    id: "meal_lemony_quinoa_tuna_salad",
    name: "Lemony Quinoa Tuna Salad",
    photoUrl: "/media/lemony-quinoa-tuna-salad.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_quinoa", quantity: 1, unit: "cup" },
      { ingredientId: "ing_kosher_salt", quantity: 1, unit: "tsp" },
      {
        ingredientId: "ing_extra_virgin_olive_oil",
        quantity: 0.5,
        unit: "cup",
      },
      { ingredientId: "ing_fresh_lemon_juice", quantity: 2, unit: "tbsp" },
      { ingredientId: "ing_garlic_cloves", quantity: 2, unit: "unit" },
      {
        ingredientId: "ing_freshly_ground_black_pepper",
        quantity: 0.25,
        unit: "tsp",
      },
      { ingredientId: "ing_albacore_tuna_canned", quantity: 2, unit: "can" }, // 5-oz cans
      { ingredientId: "ing_cucumber", quantity: 1, unit: "unit" }, // 1 large
      { ingredientId: "ing_cherry_tomatoes", quantity: 1, unit: "pint" },
      {
        ingredientId: "ing_chopped_fresh_parsley",
        quantity: 0.25,
        unit: "cup",
      },
      { ingredientId: "ing_chopped_fresh_dill", quantity: 0.5, unit: "cup" },
      { ingredientId: "ing_scallions", quantity: 2, unit: "unit" },
    ],
  },
  {
    id: "meal_chicken_taco_salad_jars",
    name: "Chicken Taco Salad Jars",
    photoUrl: "/media/chicken-taco-salad-jars.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_extra_virgin_olive_oil", quantity: 1, unit: "tbsp" },
      { ingredientId: "ing4", quantity: 1, unit: "lb" }, // Re-using ing4: Chicken Breast
      { ingredientId: "ing_taco_seasoning", quantity: 1, unit: "tbsp" },
      { ingredientId: "ing_kosher_salt", quantity: 0.5, unit: "tsp" },
      {
        ingredientId: "ing_freshly_ground_black_pepper",
        quantity: 0.25,
        unit: "tsp",
      },
      { ingredientId: "ing_plain_greek_yogurt", quantity: 1, unit: "cup" },
      {
        ingredientId: "ing_chopped_fresh_cilantro",
        quantity: 0.25,
        unit: "cup",
      },
      { ingredientId: "ing_fresh_lime_juice", quantity: 2, unit: "tbsp" },
      { ingredientId: "ing_canned_black_beans", quantity: 1, unit: "can" }, // 15-oz can
      { ingredientId: "ing_corn", quantity: 1, unit: "cup" },
      { ingredientId: "ing_cherry_tomatoes", quantity: 1, unit: "cup" },
      { ingredientId: "ing_red_onion", quantity: 0.5, unit: "unit" }, // 1/2 of a unit
      { ingredientId: "ing_romaine_lettuce", quantity: 4, unit: "cup" },
    ],
  },
];

export const initialState: AppState = {
  // Master data
  meals: MOCK_MEALS,
  ingredients: MOCK_INGREDIENTS,
  users: [
    { id: "u1", initials: "GA", color: "#4A90E2" },
    { id: "u2", initials: "J", color: "#D0021B" },
  ],

  // The plan
  plan: [],

  // UI State
  selectedUserIds: ["u1"],
  selectedDates: [],
  selectedPlannedMealInstanceId: null,

  // App settings
  mealColumns: [
    "Breakfast",
    "Morning Snack",
    "Lunch",
    "Afternoon Snack",
    "Dinner",
  ],
};
