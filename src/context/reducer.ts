import type { AppState } from "../types";
import type { Action } from "./actions";

export const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    // --- Meal Actions ---
    case "ADD_MEAL":
      // ... (existing code)
      return {
        ...state,
        meals: [...state.meals, action.payload],
      };

    case "UPDATE_MEAL":
      // ... (existing code)
      return {
        ...state,
        meals: state.meals.map((meal) =>
          meal.id === action.payload.id ? action.payload : meal
        ),
      };

    case "DELETE_MEAL":
      // ... (existing code)
      return {
        ...state,
        plan: state.plan.filter((p) => p.mealId !== action.payload.mealId),
        meals: state.meals.filter((meal) => meal.id !== action.payload.mealId),
      };

    // --- PlannedMeal Actions ---
    case "ADD_PLANNED_MEAL":
      // ... (existing code)
      return {
        ...state,
        plan: [...state.plan, action.payload],
      };

    // --- NEW ---
    case "REMOVE_PLANNED_MEAL":
      return {
        ...state,
        plan: state.plan.filter(
          (p) => p.instanceId !== action.payload.instanceId
        ),
      };

    // --- UI Actions ---
    case "SET_SELECTED_USERS":
      // ... (existing code)
      return {
        ...state,
        selectedUserIds: action.payload,
      };

    case "SET_SELECTED_DATES":
      // ... (existing code)
      return {
        ...state,
        selectedDates: action.payload,
      };

    // --- NEW ---
    case "SET_SELECTED_INSTANCE":
      return {
        ...state,
        selectedPlannedMealInstanceId: action.payload,
      };

    default:
      return state;
  }
};
