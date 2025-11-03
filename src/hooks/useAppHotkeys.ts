import { useEffect } from "react";
import { useAppDispatch, useAppState } from "../context/hooks";

export const useAppHotkeys = () => {
  const dispatch = useAppDispatch();
  const { selectedPlannedMealInstanceId } = useAppState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we have a selected meal and the user hits Delete/Backspace
      if (
        selectedPlannedMealInstanceId &&
        (e.key === "Delete" || e.key === "Backspace")
      ) {
        // Prevent backspace from navigating the browser back
        e.preventDefault();

        dispatch({
          type: "REMOVE_PLANNED_MEAL",
          payload: { instanceId: selectedPlannedMealInstanceId },
        });

        // Deselect the instance after deleting it
        dispatch({ type: "SET_SELECTED_INSTANCE", payload: null });
      }
    };

    // Add the event listener to the whole window
    window.addEventListener("keydown", handleKeyDown);

    // Clean up the listener when the component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPlannedMealInstanceId, dispatch]); // Re-run if the selected instance changes
};
