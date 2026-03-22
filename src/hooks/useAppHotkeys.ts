import { useEffect } from "react";
import { useAppDispatch, useAppState } from "../context/hooks";
import { useAuth } from "../context/AuthContext";
import { deletePlanEntryFromCloud } from "../lib/cloudSync";

export const useAppHotkeys = () => {
  const dispatch = useAppDispatch();
  const { selectedPlannedMealInstanceId } = useAppState();
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        selectedPlannedMealInstanceId &&
        (e.key === "Delete" || e.key === "Backspace")
      ) {
        e.preventDefault();

        dispatch({
          type: "REMOVE_PLANNED_MEAL",
          payload: { instanceId: selectedPlannedMealInstanceId },
        });
        dispatch({ type: "SET_SELECTED_INSTANCE", payload: null });

        if (user) {
          deletePlanEntryFromCloud(user.uid, selectedPlannedMealInstanceId).catch(
            console.error
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPlannedMealInstanceId, dispatch, user]);
};
