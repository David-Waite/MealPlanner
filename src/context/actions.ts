import type { Meal, PlannedMeal, PlannedSnack, CustomUnit, Ingredient, ShoppingListSettings, User, FavouriteItem } from "../types";

export type MergeCloudPayload = {
  meals: Meal[];
  customUnits: CustomUnit[];
  plan: PlannedMeal[];
  snacks?: PlannedSnack[];
  users?: User[];
  ingredients?: Ingredient[];
  favourites?: FavouriteItem[];
};

export type Action =
  | { type: "ADD_MEAL"; payload: Meal }
  | { type: "UPDATE_MEAL"; payload: Meal }
  | { type: "DELETE_MEAL"; payload: { mealId: string } }
  | { type: "ADD_PLANNED_MEAL"; payload: PlannedMeal }
  | { type: "REMOVE_PLANNED_MEAL"; payload: { instanceId: string } }
  | { type: "UPDATE_PLANNED_MEAL"; payload: PlannedMeal }
  | { type: "ADD_PLANNED_SNACK"; payload: PlannedSnack }
  | { type: "REMOVE_PLANNED_SNACK"; payload: { instanceId: string } }
  | { type: "UPDATE_PLANNED_SNACK"; payload: PlannedSnack }
  | { type: "ADD_USER"; payload: User }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "DELETE_USER"; payload: { userId: string } }
  | { type: "SET_SELECTED_USERS"; payload: string[] }
  | { type: "SET_SELECTED_DATES"; payload: string[] }
  | { type: "SET_SELECTED_INSTANCE"; payload: string | null }
  | { type: "ADD_INGREDIENT"; payload: Ingredient }
  | { type: "UPDATE_INGREDIENT"; payload: Ingredient }
  | { type: "ADD_CUSTOM_UNIT"; payload: CustomUnit }
  | { type: "UPDATE_CUSTOM_UNIT"; payload: CustomUnit }
  | { type: "DELETE_CUSTOM_UNIT"; payload: { customUnitId: string } }
  | { type: "SET_SHOPPING_LIST_SETTINGS"; payload: Partial<ShoppingListSettings> }
  | { type: "TOGGLE_FAVOURITE"; payload: FavouriteItem }
  | { type: "MERGE_CLOUD_DATA"; payload: MergeCloudPayload };
