import type { AppState, Ingredient, Meal } from "../types";

// Let's add mock ingredients (now with an explicit type)
const MOCK_INGREDIENTS: Ingredient[] = [
  { id: "ing_quinoa", name: "Quinoa", category: "Pantry" },

  // --- New Ingredients from Recipe ---
  { id: "ing_spaghetti", name: "Spaghetti", category: "Pantry" },
  { id: "ing_evoo", name: "Extra-Virgin Olive Oil", category: "Pantry" },
  { id: "ing_red_onion", name: "Red Onion", category: "Produce" },
  { id: "ing_kosher_salt", name: "Kosher Salt", category: "Pantry" },
  { id: "ing_black_pepper", name: "Black Pepper", category: "Pantry" },
  { id: "ing_zucchini", name: "Zucchini", category: "Produce" },
  { id: "ing_garlic", name: "Garlic", category: "Produce" },
  { id: "ing_ground_turkey", name: "Ground Turkey", category: "Meat" },
  { id: "ing_tomato_paste", name: "Tomato Paste", category: "Pantry" },
  { id: "ing_gochujang", name: "Gochujang", category: "Pantry" },
  { id: "ing_tomato_puree", name: "Tomato Puree", category: "Pantry" },
  {
    id: "ing_worcestershire",
    name: "Worcestershire Sauce",
    category: "Pantry",
  },
  {
    id: "ing_italian_seasoning",
    name: "Italian Seasoning",
    category: "Pantry",
  },
  {
    id: "ing_red_pepper_flakes",
    name: "Red Pepper Flakes",
    category: "Pantry",
  },
  {
    id: "ing_soy_sauce_reduced",
    name: "Reduced-Sodium Soy Sauce",
    category: "Pantry",
  },
  { id: "ing_oyster_sauce", name: "Oyster Sauce", category: "Pantry" },
  {
    id: "ing_light_brown_sugar",
    name: "Light Brown Sugar",
    category: "Pantry",
  },
  { id: "ing_canola_oil", name: "Canola Oil", category: "Pantry" },
  { id: "ing_thai_chile", name: "Thai Chile", category: "Produce" },
  { id: "ing_shallot", name: "Shallot", category: "Produce" },
  { id: "ing_ground_chicken", name: "Ground Chicken", category: "Meat" },
  { id: "ing_green_beans", name: "Green Beans", category: "Produce" },
  { id: "ing_red_bell_pepper", name: "Red Capsuim", category: "Produce" },
  { id: "ing_thai_basil", name: "Fresh Thai Basil", category: "Produce" },
  { id: "ing_rice", name: "Rice", category: "Pantry" },
  { id: "ing_olive_oil_spray", name: "Olive Oil Spray", category: "Pantry" },
  { id: "ing_honey", name: "Honey", category: "Pantry" },
  { id: "ing_ginger", name: "Fresh Ginger", category: "Produce" },
  { id: "ing_salmon_fillet", name: "Salmon Fillet", category: "Meat" },
  { id: "ing_broccolini", name: "Broccolini", category: "Produce" },
  { id: "ing_lemon", name: "Lemon", category: "Produce" },
  {
    id: "img_chicken_thighs_boneless",
    name: "Boneless Skinless Chicken Thighs",
    category: "Meat",
  },
  { id: "ing_broccoli", name: "Broccoli", category: "Produce" },
  { id: "ing_lime", name: "Lime", category: "Produce" },
  { id: "ing_jalapeno", name: "Jalapeño", category: "Produce" },
  { id: "ing_cilantro", name: "Fresh Cilantro", category: "Produce" },
  { id: "ing_lime_juice", name: "Lime Juice", category: "Pantry" },
  { id: "ing_mayonnaise", name: "Mayonnaise", category: "Pantry" },
  { id: "ing_greek_yogurt", name: "Greek Yogurt", category: "Dairy" },
  { id: "ing_ground_cumin", name: "Ground Cumin", category: "Pantry" },

  { id: "ing_spinach_tortilla", name: "Spinach Tortillas", category: "Pantry" },
  { id: "ing_ranch_dressing", name: "Ranch Dressing", category: "Pantry" },
  { id: "ing_sliced_turkey", name: "Sliced Turkey", category: "Meat" },
  { id: "ing_baby_arugula", name: "Baby Arugula", category: "Produce" },
  { id: "ing_avocado", name: "Avocado", category: "Produce" },

  {
    id: "ing_adobo_sauce",
    name: "Adobo Sauce (from canned chipotles)",
    category: "Pantry",
  },
  {
    id: "ing_rotisserie_chicken",
    name: "Shredded Rotisserie Chicken",
    category: "Meat",
  },
  { id: "ing_taco_seasoning", name: "Taco Seasoning", category: "Pantry" },
  {
    id: "ing_pickled_jalapenos",
    name: "Sliced Pickled Jalapeños",
    category: "Pantry",
  },
  {
    id: "ing_corn_kernels",
    name: "Corn Kernels (frozen or canned)",
    category: "Frozen",
  },
  { id: "ing_black_beans", name: "Canned Black Beans", category: "Pantry" },
  {
    id: "ing_mexican_cheese_blend",
    name: "Shredded Mexican Cheese Blend",
    category: "Dairy",
  },
  { id: "ing_grape_tomatoes", name: "Grape Tomatoes", category: "Produce" },
  { id: "ing_romaine_lettuce", name: "Romaine Lettuce", category: "Produce" },
  {
    id: "ing_tortilla_chips",
    name: "Baked Tortilla Chips",
    category: "Snacks",
  },
  { id: "ing_tuna_canned", name: "Canned Tuna", category: "Pantry" },
  { id: "ing_cucumber", name: "Cucumber", category: "Produce" },
  { id: "ing_cherry_tomatoes", name: "Cherry Tomatoes", category: "Produce" },
  { id: "ing_parsley", name: "Fresh Parsley", category: "Produce" },
  { id: "ing_dill", name: "Fresh Dill", category: "Produce" },
  { id: "ing_scallions", name: "Scallions", category: "Produce" },
  { id: "ing_lemon_wedge", name: "Lemon Wedge", category: "Produce" },

  { id: "ing_banana", name: "Banana", category: "Produce" },
  { id: "ing_apple", name: "Apple", category: "Produce" },
  { id: "ing_kiwi", name: "Kiwi Fruit", category: "Produce" },
  { id: "ing_coffee", name: "Coffee", category: "Pantry" },
  { id: "ing_light_milk", name: "Light Milk", category: "Dairy" },
];

const MOCK_MEALS: Meal[] = [
  {
    id: "meal1",
    name: "Spicy Spaghetti & Turkey Meat Sauce",
    photoUrl: "/media/spicy-spaghetti-turkey-meat-sauce.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_spaghetti", quantity: 280, unit: "g" },
      { ingredientId: "ing_evoo", quantity: 45, unit: "ml" },
      { ingredientId: "ing_red_onion", quantity: 1, unit: "large" },
      { ingredientId: "ing_kosher_salt", quantity: 15, unit: "ml" },
      { ingredientId: "ing_black_pepper", quantity: 5, unit: "ml" },
      { ingredientId: "ing_zucchini", quantity: 1, unit: "large" },
      { ingredientId: "ing_garlic", quantity: 3, unit: "cloves" },
      { ingredientId: "ing_ground_turkey", quantity: 450, unit: "g" },
      { ingredientId: "ing_tomato_paste", quantity: 83, unit: "ml" },
      { ingredientId: "ing_gochujang", quantity: 20, unit: "ml" },
      { ingredientId: "ing_tomato_puree", quantity: 1, unit: "can" },
      { ingredientId: "ing_worcestershire", quantity: 15, unit: "ml" },
      { ingredientId: "ing_italian_seasoning", quantity: 5, unit: "g" },
      { ingredientId: "ing_red_pepper_flakes", quantity: 1.5, unit: "g" },
    ],
  },
  {
    id: "meal2",
    name: "Thai Basil Chicken Bowls",
    photoUrl: "/media/thai-basil-chicken-bowls.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_soy_sauce_reduced", quantity: 45, unit: "ml" },
      { ingredientId: "ing_oyster_sauce", quantity: 30, unit: "ml" },
      { ingredientId: "ing_light_brown_sugar", quantity: 30, unit: "ml" },
      { ingredientId: "ing_canola_oil", quantity: 30, unit: "ml" },
      { ingredientId: "ing_garlic", quantity: 3, unit: "cloves" },
      { ingredientId: "ing_thai_chile", quantity: 1, unit: "medium" },
      { ingredientId: "ing_shallot", quantity: 1, unit: "medium" },
      { ingredientId: "ing_ground_chicken", quantity: 450, unit: "g" },
      { ingredientId: "ing_green_beans", quantity: 170, unit: "g" },
      { ingredientId: "ing_red_bell_pepper", quantity: 1, unit: "large" },
      { ingredientId: "ing_thai_basil", quantity: 1, unit: "cup" },
      { ingredientId: "ing_rice", quantity: 4, unit: "cup" },
    ],
  },
  {
    id: "meal3",
    name: "Honey-Soy Glazed Salmon with Broccolini",
    photoUrl: "/media/honey-soy-glazed-salmon-with-broccolini.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_olive_oil_spray", quantity: 1, unit: "unit" },
      { ingredientId: "ing_garlic", quantity: 2, unit: "cloves" },
      { ingredientId: "ing_honey", quantity: 30, unit: "ml" },
      { ingredientId: "ing_oyster_sauce", quantity: 30, unit: "ml" },
      { ingredientId: "ing_soy_sauce_reduced", quantity: 30, unit: "ml" },
      { ingredientId: "ing_ginger", quantity: 10, unit: "g" },
      { ingredientId: "ing_salmon_fillet", quantity: 4, unit: "unit" },
      { ingredientId: "ing_broccolini", quantity: 2, unit: "bunches" }, // 2 bunches
      { ingredientId: "ing_evoo", quantity: 30, unit: "ml" },
      { ingredientId: "ing_kosher_salt", quantity: 2.5, unit: "g" },
    ],
  },
  {
    id: "meal4",
    name: "Chile-Lime Cilantro Chicken with Lemony Pickled Onions",
    photoUrl: "/media/chile-lime-cilantro-chicken-lemony-pickled-onions.jpg",
    servings: 4, // Assumed 4 servings from 1.5 lbs chicken
    ingredients: [
      // Main Meal Ingredients
      { ingredientId: "ing_red_onion", quantity: 1, unit: "small" }, // "1 small"
      { ingredientId: "ing_lemon", quantity: 0.5, unit: "medium" },
      { ingredientId: "ing_olive_oil_spray", quantity: 1, unit: "unit" },
      {
        ingredientId: "img_chicken_thighs_boneless",
        quantity: 680,
        unit: "g",
      },
      { ingredientId: "ing_broccoli", quantity: 4, unit: "cup" },
      { ingredientId: "ing_evoo", quantity: 60, unit: "ml" },
      { ingredientId: "ing_rice", quantity: 4, unit: "cup" }, // "Steamed Rice, for serving"
      { ingredientId: "ing_lime", quantity: 2, unit: "medium" }, // "Lime wedges, for squeezing"

      // Sauce Ingredients (prefixed with 'ing_')
      { ingredientId: "ing_jalapeno", quantity: 1, unit: "large" }, // "1 large or 2 small"
      { ingredientId: "ing_cilantro", quantity: 1.5, unit: "cup" },
      { ingredientId: "ing_garlic", quantity: 1, unit: "cloves" }, // 1 clove
      { ingredientId: "ing_mayonnaise", quantity: 62, unit: "ml" },
      { ingredientId: "ing_greek_yogurt", quantity: 62, unit: "ml" },
      { ingredientId: "ing_ground_cumin", quantity: 5, unit: "g" },
      { ingredientId: "ing_kosher_salt", quantity: 10, unit: "g" },
    ],
  }, // --- Meal 5 (New) ---
  {
    id: "meal5",
    name: "Turkey Avo Ranch Wraps",
    photoUrl: "/media/turkey-avo-ranch-wraps.jpg",
    servings: 4, // Based on "4 ... tortillas"
    ingredients: [
      { ingredientId: "ing_spinach_tortilla", quantity: 4, unit: "unit" },
      { ingredientId: "ing_ranch_dressing", quantity: 125, unit: "ml" },
      { ingredientId: "ing_sliced_turkey", quantity: 250, unit: "g" },
      { ingredientId: "ing_baby_arugula", quantity: 2, unit: "cup" },
      { ingredientId: "ing_red_bell_pepper", quantity: 1, unit: "small" },
      { ingredientId: "ing_avocado", quantity: 2, unit: "medium" },
    ],
  },

  {
    id: "meal6",
    name: "Chicken Taco Salad Jars",
    photoUrl: "/media/chicken-taco-salad-jars.jpg",
    servings: 4, // Based on "Four ... jars"
    ingredients: [
      // Chicken
      { ingredientId: "ing_rotisserie_chicken", quantity: 1, unit: "unit" },
      { ingredientId: "ing_taco_seasoning", quantity: 15, unit: "g" },
      { ingredientId: "ing_pickled_jalapenos", quantity: 15, unit: "ml" },
      // Layers
      { ingredientId: "ing_corn_kernels", quantity: 1, unit: "cup" },
      { ingredientId: "ing_black_beans", quantity: 1, unit: "cup" },
      { ingredientId: "ing_mexican_cheese_blend", quantity: 125, unit: "g" },
      { ingredientId: "ing_grape_tomatoes", quantity: 125, unit: "g" },
      { ingredientId: "ing_avocado", quantity: 1, unit: "medium" },
      { ingredientId: "ing_romaine_lettuce", quantity: 4, unit: "cup" },
      // For Serving
      { ingredientId: "ing_tortilla_chips", quantity: 1, unit: "unit" },
    ],
  },
  {
    id: "meal7",
    name: "Lemony Quinoa Tuna Salad",
    photoUrl: "/media/lemony-quinoa-tuna-salad.jpg",
    servings: 4, // Assumed
    ingredients: [
      { ingredientId: "ing_quinoa", quantity: 250, unit: "g" },
      { ingredientId: "ing_kosher_salt", quantity: 5, unit: "g" },
      { ingredientId: "ing_evoo", quantity: 125, unit: "ml" },
      { ingredientId: "ing_lemon", quantity: 1, unit: "medium" },
      { ingredientId: "ing_garlic", quantity: 2, unit: "cloves" },
      { ingredientId: "ing_black_pepper", quantity: 1.25, unit: "g" },
      { ingredientId: "ing_tuna_canned", quantity: 2, unit: "can" },
      { ingredientId: "ing_cucumber", quantity: 1, unit: "large" },
      { ingredientId: "ing_cherry_tomatoes", quantity: 500, unit: "g" },
      { ingredientId: "ing_parsley", quantity: 0.6, unit: "cup" },
      { ingredientId: "ing_dill", quantity: 0.5, unit: "cup" },
      { ingredientId: "ing_scallions", quantity: 2, unit: "unit" },
      { ingredientId: "ing_lemon", quantity: 1, unit: "medium" },
    ],
  },
  {
    id: "meal8",
    name: "Banana",
    photoUrl: "/media/banana.jpg",
    servings: 1,
    ingredients: [{ ingredientId: "ing_banana", quantity: 1, unit: "unit" }],
  },

  // --- Meal 9 (New Snack) ---
  {
    id: "meal9",
    name: "Apple",
    photoUrl: "/media/apple.jpg",
    servings: 1,
    ingredients: [{ ingredientId: "ing_apple", quantity: 1, unit: "unit" }],
  },

  // --- Meal 10 (New Snack) ---
  {
    id: "meal10",
    name: "Kiwi Fruit",
    photoUrl: "/media/kiwi-fruit.jpg",
    servings: 1,
    ingredients: [{ ingredientId: "ing_kiwi", quantity: 1, unit: "unit" }],
  },

  // --- Meal 11 (New Coffee) ---
  {
    id: "meal11",
    name: "Coffee",
    photoUrl: "/media/coffee.jpg",
    servings: 1,
    ingredients: [
      { ingredientId: "ing_light_milk", quantity: 250, unit: "ml" },
    ],
  },
];

export const initialState: AppState = {
  // Master data
  meals: MOCK_MEALS,
  ingredients: MOCK_INGREDIENTS,
  users: [
    { id: "u1", initials: "CA", color: "#4A90E2" },
    { id: "u2", initials: "DA", color: "#D0021B" },
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
