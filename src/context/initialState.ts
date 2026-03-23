import type { AppState, Meal } from "../types";

// Helper shorthands to keep meal ingredient lists readable
const core = (
  unit: import("../types").CoreUnit,
): import("../types").UnitRef => ({
  type: "core",
  unit,
});
const custom = (customUnitId: string): import("../types").UnitRef => ({
  type: "custom",
  customUnitId,
});


const MOCK_MEALS: Meal[] = [
  {
    id: "meal1",
    name: "Spicy Spaghetti & Turkey Meat Sauce",
    photoUrl: "/media/spicy-spaghetti-turkey-meat-sauce.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_spaghetti", quantity: 280, unit: core("g") },
      { ingredientId: "ing_evoo", quantity: 45, unit: core("ml") },
      {
        ingredientId: "ing_red_onion",
        quantity: 1,
        unit: custom("cu_red_onion_large"),
      },
      { ingredientId: "ing_kosher_salt", quantity: 15, unit: core("ml") },
      { ingredientId: "ing_black_pepper", quantity: 5, unit: core("ml") },
      {
        ingredientId: "ing_zucchini",
        quantity: 1,
        unit: custom("cu_zucchini_large"),
      },
      {
        ingredientId: "ing_garlic",
        quantity: 3,
        unit: custom("cu_garlic_clove"),
      },
      { ingredientId: "ing_ground_turkey", quantity: 450, unit: core("g") },
      { ingredientId: "ing_tomato_paste", quantity: 83, unit: core("ml") },
      { ingredientId: "ing_gochujang", quantity: 20, unit: core("ml") },
      {
        ingredientId: "ing_tomato_puree",
        quantity: 1,
        unit: custom("cu_tomato_puree_can"),
      },
      { ingredientId: "ing_worcestershire", quantity: 15, unit: core("ml") },
      { ingredientId: "ing_italian_seasoning", quantity: 5, unit: core("g") },
      { ingredientId: "ing_red_pepper_flakes", quantity: 1.5, unit: core("g") },
    ],
    tags: ["spicy", "pasta", "turkey", "dinner"],
  },
  {
    id: "meal2",
    name: "Thai Basil Chicken Bowls",
    photoUrl: "/media/thai-basil-chicken-bowls.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_soy_sauce_reduced", quantity: 45, unit: core("ml") },
      { ingredientId: "ing_oyster_sauce", quantity: 30, unit: core("ml") },
      { ingredientId: "ing_light_brown_sugar", quantity: 30, unit: core("ml") },
      { ingredientId: "ing_canola_oil", quantity: 30, unit: core("ml") },
      {
        ingredientId: "ing_garlic",
        quantity: 3,
        unit: custom("cu_garlic_clove"),
      },
      {
        ingredientId: "ing_thai_chile",
        quantity: 1,
        unit: custom("cu_thai_chile_medium"),
      },
      {
        ingredientId: "ing_shallot",
        quantity: 1,
        unit: custom("cu_shallot_medium"),
      },
      { ingredientId: "ing_ground_chicken", quantity: 450, unit: core("g") },
      { ingredientId: "ing_green_beans", quantity: 170, unit: core("g") },
      {
        ingredientId: "ing_red_bell_pepper",
        quantity: 1,
        unit: custom("cu_red_bell_pepper_large"),
      },
      { ingredientId: "ing_thai_basil", quantity: 1, unit: core("cup") },
      { ingredientId: "ing_rice", quantity: 4, unit: core("cup") },
    ],
    tags: ["chicken", "rice", "dinner", "thai"],
  },
  {
    id: "meal3",
    name: "Honey-Soy Glazed Salmon with Broccolini",
    photoUrl: "/media/honey-soy-glazed-salmon-with-broccolini.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_olive_oil_spray", quantity: 1, unit: core("unit") },
      {
        ingredientId: "ing_garlic",
        quantity: 2,
        unit: custom("cu_garlic_clove"),
      },
      { ingredientId: "ing_honey", quantity: 30, unit: core("ml") },
      { ingredientId: "ing_oyster_sauce", quantity: 30, unit: core("ml") },
      { ingredientId: "ing_soy_sauce_reduced", quantity: 30, unit: core("ml") },
      { ingredientId: "ing_ginger", quantity: 10, unit: core("g") },
      { ingredientId: "ing_salmon_fillet", quantity: 4, unit: core("unit") },
      {
        ingredientId: "ing_broccolini",
        quantity: 2,
        unit: custom("cu_broccolini_bunch"),
      },
      { ingredientId: "ing_evoo", quantity: 30, unit: core("ml") },
      { ingredientId: "ing_kosher_salt", quantity: 2.5, unit: core("g") },
    ],
    tags: ["fish", "salmon", "dinner", "healthy"],
  },
  {
    id: "meal4",
    name: "Chile-Lime Cilantro Chicken with Lemony Pickled Onions",
    photoUrl: "/media/chile-lime-cilantro-chicken-lemony-pickled-onions.jpg",
    servings: 4,
    ingredients: [
      {
        ingredientId: "ing_red_onion",
        quantity: 1,
        unit: custom("cu_red_onion_small"),
      },
      {
        ingredientId: "ing_lemon",
        quantity: 0.5,
        unit: custom("cu_lemon_medium"),
      },
      { ingredientId: "ing_olive_oil_spray", quantity: 1, unit: core("unit") },
      {
        ingredientId: "img_chicken_thighs_boneless",
        quantity: 680,
        unit: core("g"),
      },
      { ingredientId: "ing_broccoli", quantity: 4, unit: core("cup") },
      { ingredientId: "ing_evoo", quantity: 60, unit: core("ml") },
      { ingredientId: "ing_rice", quantity: 4, unit: core("cup") },
      { ingredientId: "ing_lime", quantity: 2, unit: custom("cu_lime_medium") },
      {
        ingredientId: "ing_jalapeno",
        quantity: 1,
        unit: custom("cu_jalapeno_large"),
      },
      { ingredientId: "ing_cilantro", quantity: 1.5, unit: core("cup") },
      {
        ingredientId: "ing_garlic",
        quantity: 1,
        unit: custom("cu_garlic_clove"),
      },
      { ingredientId: "ing_mayonnaise", quantity: 62, unit: core("ml") },
      { ingredientId: "ing_greek_yogurt", quantity: 62, unit: core("ml") },
      { ingredientId: "ing_ground_cumin", quantity: 5, unit: core("g") },
      { ingredientId: "ing_kosher_salt", quantity: 10, unit: core("g") },
    ],
    tags: ["chicken", "dinner", "citrus"],
  },
  {
    id: "meal5",
    name: "Turkey Avo Ranch Wraps",
    photoUrl: "/media/turkey-avo-ranch-wraps.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_spinach_tortilla", quantity: 4, unit: core("unit") },
      { ingredientId: "ing_ranch_dressing", quantity: 125, unit: core("ml") },
      { ingredientId: "ing_sliced_turkey", quantity: 250, unit: core("g") },
      { ingredientId: "ing_baby_arugula", quantity: 2, unit: core("cup") },
      {
        ingredientId: "ing_red_bell_pepper",
        quantity: 1,
        unit: custom("cu_red_bell_pepper_small"),
      },
      {
        ingredientId: "ing_avocado",
        quantity: 2,
        unit: custom("cu_avocado_medium"),
      },
    ],
    tags: ["turkey", "lunch", "wrap"],
  },
  {
    id: "meal6",
    name: "Chicken Taco Salad Jars",
    photoUrl: "/media/chicken-taco-salad-jars.jpg",
    servings: 4,
    ingredients: [
      {
        ingredientId: "ing_rotisserie_chicken",
        quantity: 1,
        unit: core("unit"),
      },
      { ingredientId: "ing_taco_seasoning", quantity: 15, unit: core("g") },
      { ingredientId: "ing_pickled_jalapenos", quantity: 15, unit: core("ml") },
      { ingredientId: "ing_corn_kernels", quantity: 1, unit: core("cup") },
      { ingredientId: "ing_black_beans", quantity: 1, unit: core("cup") },
      {
        ingredientId: "ing_mexican_cheese_blend",
        quantity: 125,
        unit: core("g"),
      },
      { ingredientId: "ing_grape_tomatoes", quantity: 125, unit: core("g") },
      {
        ingredientId: "ing_avocado",
        quantity: 1,
        unit: custom("cu_avocado_medium"),
      },
      { ingredientId: "ing_romaine_lettuce", quantity: 4, unit: core("cup") },
      { ingredientId: "ing_tortilla_chips", quantity: 1, unit: core("unit") },
    ],
    tags: ["chicken", "salad", "lunch", "mexican"],
  },
  {
    id: "meal7",
    name: "Lemony Quinoa Tuna Salad",
    photoUrl: "/media/lemony-quinoa-tuna-salad.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_quinoa", quantity: 250, unit: core("g") },
      { ingredientId: "ing_kosher_salt", quantity: 5, unit: core("g") },
      { ingredientId: "ing_evoo", quantity: 125, unit: core("ml") },
      {
        ingredientId: "ing_lemon",
        quantity: 1,
        unit: custom("cu_lemon_medium"),
      },
      {
        ingredientId: "ing_garlic",
        quantity: 2,
        unit: custom("cu_garlic_clove"),
      },
      { ingredientId: "ing_black_pepper", quantity: 1.25, unit: core("g") },
      {
        ingredientId: "ing_tuna_canned",
        quantity: 2,
        unit: custom("cu_tuna_can"),
      },
      {
        ingredientId: "ing_cucumber",
        quantity: 1,
        unit: custom("cu_cucumber_large"),
      },
      { ingredientId: "ing_cherry_tomatoes", quantity: 500, unit: core("g") },
      { ingredientId: "ing_parsley", quantity: 0.6, unit: core("cup") },
      { ingredientId: "ing_dill", quantity: 0.5, unit: core("cup") },
      { ingredientId: "ing_scallions", quantity: 2, unit: core("unit") },
      {
        ingredientId: "ing_lemon",
        quantity: 1,
        unit: custom("cu_lemon_medium"),
      },
    ],
    tags: ["fish", "tuna", "salad", "lunch", "healthy"],
  },
  {
    id: "meal8",
    name: "Banana",
    photoUrl: "/media/banana.jpg",
    servings: 1,
    ingredients: [
      { ingredientId: "ing_banana", quantity: 1, unit: core("unit") },
    ],
    tags: ["fruit", "snack"],
  },
  {
    id: "meal9",
    name: "Apple",
    photoUrl: "/media/apple.jpg",
    servings: 1,
    ingredients: [
      { ingredientId: "ing_apple", quantity: 1, unit: core("unit") },
    ],
    tags: ["fruit", "snack"],
  },
  {
    id: "meal10",
    name: "Kiwi Fruit",
    photoUrl: "/media/kiwi-fruit.jpg",
    servings: 1,
    ingredients: [
      { ingredientId: "ing_kiwi", quantity: 1, unit: core("unit") },
    ],
    tags: ["fruit", "snack"],
  },
  {
    id: "meal11",
    name: "Coffee",
    photoUrl: "/media/coffee.jpg",
    servings: 1,
    ingredients: [
      { ingredientId: "ing_light_milk", quantity: 250, unit: core("ml") },
    ],
    tags: ["drink", "caffeine"],
  },
  {
    id: "meal12",
    name: "Blackened Fish Bowls",
    photoUrl: "/media/blackened-fish-bowls.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_chili_powder", quantity: 25, unit: core("g") },
      { ingredientId: "ing_ground_cumin", quantity: 15, unit: core("g") },
      { ingredientId: "ing_garlic_powder", quantity: 10, unit: core("g") },
      { ingredientId: "ing_paprika", quantity: 10, unit: core("g") },
      { ingredientId: "ing_kosher_salt", quantity: 10, unit: core("g") },
      { ingredientId: "ing_onion_powder", quantity: 5, unit: core("g") },
      { ingredientId: "ing_black_pepper", quantity: 2.5, unit: core("g") },
      { ingredientId: "ing_mahimahi_fillet", quantity: 4, unit: core("unit") },
      { ingredientId: "ing_evoo", quantity: 30, unit: core("g") },
      {
        ingredientId: "ing_red_onion",
        quantity: 0.5,
        unit: custom("cu_red_onion_medium"),
      },
      {
        ingredientId: "ing_red_bell_pepper",
        quantity: 1,
        unit: custom("cu_red_bell_pepper_medium"),
      },
      {
        ingredientId: "ing_green_bell_pepper",
        quantity: 1,
        unit: custom("cu_green_bell_pepper_medium"),
      },
      { ingredientId: "ing_black_beans", quantity: 1, unit: core("cup") },
      { ingredientId: "ing_rice", quantity: 4, unit: core("cup") },
      { ingredientId: "ing_greek_yogurt", quantity: 1, unit: core("unit") },
      { ingredientId: "ing_cilantro", quantity: 25, unit: core("g") },
    ],
    tags: ["fish", "mahimahi", "dinner", "spicy"],
  },
  {
    id: "meal13",
    name: "Loaded Nachos",
    photoUrl: "/media/loaded-nachos.jpg",
    servings: 4,
    ingredients: [
      {
        ingredientId: "ing_corn_tortilla_chips",
        quantity: 340,
        unit: core("g"),
      },
      {
        ingredientId: "ing_mexican_cheese_blend",
        quantity: 225,
        unit: core("g"),
      },
      { ingredientId: "ing_evoo", quantity: 30, unit: core("ml") },
      {
        ingredientId: "ing_red_bell_pepper",
        quantity: 1,
        unit: custom("cu_red_bell_pepper_medium"),
      },
      {
        ingredientId: "ing_rotisserie_chicken",
        quantity: 1,
        unit: core("unit"),
      },
      { ingredientId: "ing_black_beans", quantity: 2, unit: core("cup") },
      { ingredientId: "ing_corn_kernels", quantity: 1, unit: core("cup") },
      { ingredientId: "ing_cilantro", quantity: 0.5, unit: core("cup") },
      { ingredientId: "ing_scallions", quantity: 1, unit: core("unit") },
      {
        ingredientId: "ing_jalapeno",
        quantity: 0.5,
        unit: custom("cu_jalapeno_medium"),
      },
      { ingredientId: "ing_chili_powder", quantity: 5, unit: core("g") },
      { ingredientId: "ing_kosher_salt", quantity: 2.5, unit: core("g") },
      { ingredientId: "ing_black_pepper", quantity: 2.5, unit: core("g") },
    ],
    tags: ["chicken", "snack", "mexican"],
  },
  {
    id: "meal14",
    name: "Sesame Ginger Chicken Wraps",
    photoUrl: "/media/sesame-ginger-chicken-wraps.jpeg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_ginger", quantity: 2, unit: core("tbsp") },
      {
        ingredientId: "ing_garlic",
        quantity: 2,
        unit: custom("cu_garlic_clove"),
      },
      {
        ingredientId: "ing_soy_sauce_reduced",
        quantity: 3,
        unit: core("tbsp"),
      },
      { ingredientId: "ing_rice_vinegar", quantity: 2, unit: core("tbsp") },
      {
        ingredientId: "ing_toasted_sesame_oil",
        quantity: 1,
        unit: core("tbsp"),
      },
      { ingredientId: "ing_kosher_salt", quantity: 5, unit: core("g") },
      { ingredientId: "ing_black_pepper", quantity: 5, unit: core("g") },
      {
        ingredientId: "ing_rotisserie_chicken",
        quantity: 3,
        unit: core("cup"),
      },
      { ingredientId: "ing_cabbage_shredded", quantity: 3, unit: core("cup") },
      { ingredientId: "ing_carrots_shredded", quantity: 1, unit: core("cup") },
      { ingredientId: "ing_parsley", quantity: 0.33, unit: core("cup") },
      { ingredientId: "ing_spinach_tortilla", quantity: 4, unit: core("unit") },
    ],
    tags: ["chicken", "lunch", "asian", "wrap"],
  },
  {
    id: "meal16",
    name: "Fried Fish Tacos",
    photoUrl: "/media/fried-fish-tacos.jpg",
    servings: 4,
    ingredients: [
      // Tortillas
      { ingredientId: "ing_corn_tortillas", quantity: 8, unit: core("unit") },
      // Fish
      { ingredientId: "ing_frozen_fish", quantity: 8, unit: core("unit") },
      // Crema
      { ingredientId: "ing_sour_cream", quantity: 123, unit: core("ml") },
      { ingredientId: "ing_mayonnaise", quantity: 115, unit: core("ml") },
      { ingredientId: "ing_smoked_paprika", quantity: 5, unit: core("g") },
      { ingredientId: "ing_chili_oil", quantity: 15, unit: core("ml") },
      {
        ingredientId: "ing_black_rice_vinegar",
        quantity: 22,
        unit: core("ml"),
      },
      {
        ingredientId: "ing_garlic",
        quantity: 2,
        unit: custom("cu_garlic_clove"),
      },
      // Slaw
      {
        ingredientId: "ing_mixed_slaw",
        quantity: 1,
        unit: custom("cu_mixed_slaw_bag"),
      },
      // Garnish
      { ingredientId: "ing_lime", quantity: 2, unit: custom("cu_lime_medium") },
    ],
    tags: ["fish", "tacos", "dinner", "mexican"],
  },
  {
    id: "meal15",
    name: "Take-In Beef with Broccoli",
    photoUrl: "/media/take-in-beef-with-broccoli.jpg",
    servings: 4,
    ingredients: [
      { ingredientId: "ing_beef_sirloin", quantity: 1, unit: core("lb") },
      {
        ingredientId: "ing_soy_sauce_reduced",
        quantity: 0.5,
        unit: core("cup"),
      },
      {
        ingredientId: "ing_light_brown_sugar",
        quantity: 2,
        unit: core("tbsp"),
      },
      {
        ingredientId: "ing_garlic",
        quantity: 3,
        unit: custom("cu_garlic_clove"),
      },
      { ingredientId: "ing_ginger", quantity: 1, unit: core("tbsp") },
      {
        ingredientId: "ing_toasted_sesame_oil",
        quantity: 1,
        unit: core("tbsp"),
      },
      { ingredientId: "ing_black_pepper", quantity: 0.25, unit: core("tsp") },
      { ingredientId: "ing_broccoli_frozen", quantity: 4, unit: core("cup") },
      { ingredientId: "ing_cornstarch", quantity: 1, unit: core("tbsp") },
      { ingredientId: "ing_rice", quantity: 4, unit: core("cup") },
      { ingredientId: "ing_scallions", quantity: 1, unit: core("unit") },
    ],
    tags: ["beef", "dinner", "asian", "freeze-friendly"],
  },
];

export const initialState: AppState = {
  meals: MOCK_MEALS,
  ingredients: [],   // populated from globalIngredients + localIngredients on sign-in
  customUnits: [],   // populated from ingredient docs on sign-in
  users: [
    { id: "u1", initials: "CA", color: "#4A90E2" },
    { id: "u2", initials: "DA", color: "#D0021B" },
  ],

  plan: [],
  snacks: [],

  selectedUserIds: ["u1"],
  selectedDates: [],
  selectedPlannedMealInstanceId: null,

  mealColumns: [
    "Breakfast",
    "Morning Snack",
    "Lunch",
    "Afternoon Snack",
    "Dinner",
  ],

  shoppingListSettings: {
    unitSystem: "metric",
    showCustomLabels: true,
  },
};
