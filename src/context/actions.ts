import type { Meal, PlannedMeal, CustomUnit, ShoppingListSettings } from "../types";

export type Action =
  | { type: "ADD_MEAL"; payload: Meal }
  | { type: "UPDATE_MEAL"; payload: Meal }
  | { type: "DELETE_MEAL"; payload: { mealId: string } }
  | { type: "ADD_PLANNED_MEAL"; payload: PlannedMeal }
  | { type: "REMOVE_PLANNED_MEAL"; payload: { instanceId: string } }
  | { type: "SET_SELECTED_USERS"; payload: string[] }
  | { type: "SET_SELECTED_DATES"; payload: string[] }
  | { type: "SET_SELECTED_INSTANCE"; payload: string | null }
  | { type: "ADD_CUSTOM_UNIT"; payload: CustomUnit }
  | { type: "UPDATE_CUSTOM_UNIT"; payload: CustomUnit }
  | { type: "DELETE_CUSTOM_UNIT"; payload: { customUnitId: string } }
  | { type: "SET_SHOPPING_LIST_SETTINGS"; payload: Partial<ShoppingListSettings> }
  | { type: "MERGE_CLOUD_DATA"; payload: { meals: Meal[]; customUnits: CustomUnit[] } };
