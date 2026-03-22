import React, { useReducer, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { appReducer } from "./reducer";
import { loadState, saveState } from "./persistence";
import { syncFromCloud } from "../lib/cloudSync";
import { AppStateContext, AppDispatchContext } from "./context";

// Load from localStorage once on startup (covers the signed-out case)
const persistentState = loadState();

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, persistentState);

  // Keep a ref so the auth listener always reads the latest state,
  // not a stale closure from when the effect was registered.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Only persist to localStorage when the user is NOT signed in.
  // When signed in, Firestore is the source of truth.
  useEffect(() => {
    if (!auth.currentUser) {
      saveState(state);
    }
  }, [state]);

  // Auto-sync from Firestore whenever auth state resolves to a signed-in user.
  // This fires on:
  //   • Page load when the user is already signed in (persistent session)
  //   • After the user signs in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AppStateContext] onAuthStateChanged fired. user:", user ? user.uid : "null");
      if (user) {
        console.log("[AppStateContext] Starting syncFromCloud for uid:", user.uid);
        try {
          const merged = await syncFromCloud(
            user.uid,
            stateRef.current.meals,
            stateRef.current.customUnits
          );
          console.log("[AppStateContext] syncFromCloud succeeded. meals:", merged.meals.length, "plan:", merged.plan.length, "customUnits:", merged.customUnits.length);
          dispatch({ type: "MERGE_CLOUD_DATA", payload: merged });
        } catch (err) {
          console.error("[AppStateContext] Cloud sync failed:", err);
        }
      } else {
        console.log("[AppStateContext] User signed out — skipping cloud sync.");
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};
