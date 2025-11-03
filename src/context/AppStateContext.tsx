import React, { useReducer, useEffect } from "react"; // <-- Import useEffect
import { appReducer } from "./reducer";
// Import our new persistence functions
import { loadState, saveState } from "./persistence";
import { AppStateContext, AppDispatchContext } from "./context";

// Load the state from localStorage ONCE on initial load
const persistentState = loadState();

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Use the loaded state as the initial state
  const [state, dispatch] = useReducer(appReducer, persistentState);

  // --- NEW: Save state to localStorage on every change ---
  useEffect(() => {
    saveState(state);
  }, [state]); // This effect runs whenever the 'state' object changes

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};
