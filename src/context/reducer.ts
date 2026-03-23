import type { AppState } from "../types";
import type { Action } from "./actions";

export const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    // --- Meal Actions ---
    case "ADD_MEAL":
      return {
        ...state,
        meals: [...state.meals, { ...action.payload, localUpdatedAt: Date.now() }],
      };

    case "UPDATE_MEAL":
      return {
        ...state,
        meals: state.meals.map((meal) =>
          meal.id === action.payload.id
            ? { ...action.payload, localUpdatedAt: Date.now() }
            : meal
        ),
      };

    case "DELETE_MEAL":
      return {
        ...state,
        plan: state.plan.filter((p) => p.mealId !== action.payload.mealId),
        meals: state.meals.filter((meal) => meal.id !== action.payload.mealId),
      };

    // --- PlannedMeal Actions ---
    case "ADD_PLANNED_MEAL":
      return { ...state, plan: [...state.plan, action.payload] };

    case "REMOVE_PLANNED_MEAL":
      return {
        ...state,
        plan: state.plan.filter(
          (p) => p.instanceId !== action.payload.instanceId
        ),
      };

    case "UPDATE_PLANNED_MEAL":
      return {
        ...state,
        plan: state.plan.map((p) =>
          p.instanceId === action.payload.instanceId ? action.payload : p
        ),
      };

    // --- PlannedSnack Actions ---
    case "ADD_PLANNED_SNACK":
      return { ...state, snacks: [...state.snacks, action.payload] };

    case "REMOVE_PLANNED_SNACK":
      return {
        ...state,
        snacks: state.snacks.filter(
          (s) => s.instanceId !== action.payload.instanceId
        ),
      };

    case "UPDATE_PLANNED_SNACK":
      return {
        ...state,
        snacks: state.snacks.map((s) =>
          s.instanceId === action.payload.instanceId ? action.payload : s
        ),
      };

    // --- User Management ---
    case "ADD_USER":
      return { ...state, users: [...state.users, action.payload] };

    case "DELETE_USER":
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.payload.userId),
        selectedUserIds: state.selectedUserIds.filter((id) => id !== action.payload.userId),
        plan: state.plan.map((p) => ({
          ...p,
          assignedUsers: p.assignedUsers.filter((id) => id !== action.payload.userId),
        })),
        snacks: state.snacks.map((s) => ({
          ...s,
          assignedUsers: s.assignedUsers.filter((id) => id !== action.payload.userId),
        })),
      };

    // --- UI Actions ---
    case "SET_SELECTED_USERS":
      return { ...state, selectedUserIds: action.payload };

    case "SET_SELECTED_DATES":
      return { ...state, selectedDates: action.payload };

    case "SET_SELECTED_INSTANCE":
      return { ...state, selectedPlannedMealInstanceId: action.payload };

    // --- Ingredient Actions ---
    case "ADD_INGREDIENT":
      return {
        ...state,
        ingredients: [...state.ingredients, action.payload],
      };

    case "UPDATE_INGREDIENT":
      return {
        ...state,
        ingredients: state.ingredients.map((i) =>
          i.id === action.payload.id ? action.payload : i
        ),
      };

    // --- Custom Unit Actions ---
    case "ADD_CUSTOM_UNIT":
      return { ...state, customUnits: [...state.customUnits, action.payload] };

    case "UPDATE_CUSTOM_UNIT":
      return {
        ...state,
        customUnits: state.customUnits.map((cu) =>
          cu.id === action.payload.id ? action.payload : cu
        ),
      };

    case "DELETE_CUSTOM_UNIT":
      return {
        ...state,
        customUnits: state.customUnits.filter(
          (cu) => cu.id !== action.payload.customUnitId
        ),
      };

    // --- Shopping List Settings ---
    case "SET_SHOPPING_LIST_SETTINGS":
      return {
        ...state,
        shoppingListSettings: {
          ...state.shoppingListSettings,
          ...action.payload,
        },
      };

    case "MERGE_CLOUD_DATA":
      return {
        ...state,
        meals: action.payload.meals,
        customUnits: action.payload.customUnits,
        plan: action.payload.plan,
        ...(action.payload.snacks !== undefined ? { snacks: action.payload.snacks } : {}),
        ...(action.payload.users ? { users: action.payload.users } : {}),
        ...(action.payload.ingredients ? { ingredients: action.payload.ingredients } : {}),
      };

    default:
      return state;
  }
};
