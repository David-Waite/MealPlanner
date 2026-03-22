import React, { useState } from "react";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { savePlanEntryToCloud } from "../../lib/cloudSync";
import { PlannedMealCard } from "./PlannedMealCard";
import styles from "./MealPlannerGrid.module.css";

interface MealSlotProps {
  date: string;
  mealType: string;
}

export const MealSlot: React.FC<MealSlotProps> = ({ date, mealType }) => {
  const { plan, selectedUserIds } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [isHovering, setIsHovering] = useState(false);

  // Filter the plan to find meals for this slot
  const mealsInSlot = plan.filter(
    (p) => p.date === date && p.mealType === mealType
  );

  // --- Drag & Drop Handlers ---

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // This is VITAL to allow dropping
    e.dataTransfer.dropEffect = "copy";
    setIsHovering(true);
  };

  const handleDragLeave = () => {
    setIsHovering(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);

    // Get the mealId from the drag event
    const mealId = e.dataTransfer.getData("text/plain");

    if (mealId) {
      const newPlannedMeal = {
        instanceId: crypto.randomUUID(),
        mealId: mealId,
        date: date,
        mealType: mealType,
        assignedUsers: selectedUserIds,
      };

      dispatch({ type: "ADD_PLANNED_MEAL", payload: newPlannedMeal });
      if (user) {
        savePlanEntryToCloud(user.uid, newPlannedMeal).catch(console.error);
      }
    }
  };

  return (
    <div
      className={`${styles.cell} ${isHovering ? styles.cellHovering : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.slotContent}>
        {mealsInSlot.map((plannedMeal) => (
          <PlannedMealCard
            key={plannedMeal.instanceId}
            plannedMeal={plannedMeal}
          />
        ))}
        {mealsInSlot.length === 0 && <div className={styles.emptySlot}></div>}
      </div>
    </div>
  );
};
