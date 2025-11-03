import type { AppState } from "../types";
import { initialState } from "./initialState";

const STORAGE_KEY = "shopSmartState";

// Saves the entire app state to localStorage
export const saveState = (state: AppState): void => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error("Could not save state", err);
  }
};

// Loads the state from localStorage
export const loadState = (): AppState => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return initialState; // No state found, return default
    }
    const parsedState = JSON.parse(serializedState);

    // We return the parsed state, but ensure all top-level keys
    // from initialState are present in case our data shape changed.
    return { ...initialState, ...parsedState };
  } catch (err) {
    console.warn("Could not load state, returning default", err);
    return initialState;
  }
};
