import React, { useReducer, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { appReducer } from "./reducer";
import { loadState, saveState } from "./persistence";
import { syncFromCloud } from "../lib/cloudSync";
import { AppStateContext, AppDispatchContext, AppLoadingContext } from "./context";

// Load from localStorage once on startup (covers the signed-out case)
const persistentState = loadState();

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, persistentState);
  const [isSyncing, setIsSyncing] = useState(true);

  // Keep a ref so the auth listener always reads the latest state,
  // not a stale closure from when the effect was registered.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Persist to localStorage on every state change.
  // This keeps the local snapshot fresh so that on next page load,
  // syncFromCloud doesn't treat stale local data as "new" and re-add
  // meals/items the user deleted while signed in.
  useEffect(() => {
    saveState(state);
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
          dispatch({
            type: "MERGE_CLOUD_DATA",
            payload: {
              meals: merged.meals,
              customUnits: merged.customUnits,
              plan: merged.plan,
              snacks: merged.snacks,
              ingredients: merged.ingredients,
              ...(merged.users ? { users: merged.users } : {}),
              ...(merged.favourites ? { favourites: merged.favourites } : {}),
              ...(merged.mealColumns ? { mealColumns: merged.mealColumns } : {}),
            },
          });
        } catch (err) {
          console.error("[AppStateContext] Cloud sync failed:", err);
        }
      } else {
        console.log("[AppStateContext] User signed out — skipping cloud sync.");
      }
      setIsSyncing(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AppLoadingContext.Provider value={isSyncing}>
      <AppStateContext.Provider value={state}>
        <AppDispatchContext.Provider value={dispatch}>
          {children}
        </AppDispatchContext.Provider>
      </AppStateContext.Provider>
    </AppLoadingContext.Provider>
  );
};
