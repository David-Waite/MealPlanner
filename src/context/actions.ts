import type { Meal, PlannedMeal } from "../types";

// A "Discriminated Union" for all possible state changes
export type Action =
  | { type: "ADD_MEAL"; payload: Meal }
  | { type: "UPDATE_MEAL"; payload: Meal }
  | { type: "DELETE_MEAL"; payload: { mealId: string } }
  | { type: "ADD_PLANNED_MEAL"; payload: PlannedMeal }
  | { type: "REMOVE_PLANNED_MEAL"; payload: { instanceId: string } }
  | { type: "SET_SELECTED_USERS"; payload: string[] }
  | { type: "SET_SELECTED_DATES"; payload: string[] }
  | { type: "SET_SELECTED_INSTANCE"; payload: string | null };
