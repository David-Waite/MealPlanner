import { createContext } from "react";
import type { Dispatch } from "react";
import type { AppState } from "../types";
import type { Action } from "./actions";
import { initialState } from "./initialState";

// A safe default dispatch function to prevent errors
// if used outside a provider.
const defaultDispatch: Dispatch<Action> = () => {
  console.error("Tried to dispatch an action outside of AppStateProvider");
};

// Create and export the two context objects
export const AppStateContext = createContext<AppState>(initialState);
export const AppDispatchContext =
  createContext<Dispatch<Action>>(defaultDispatch);
