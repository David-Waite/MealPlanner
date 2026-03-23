import React, { useState } from "react";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { savePlanEntryToCloud, saveSnackToCloud } from "../../lib/cloudSync";
import { PlannedItemCard } from "./PlannedItemCard";
import type { UnitRef } from "../../types";
import styles from "./MealPlannerGrid.module.css";

interface MealSlotProps {
  date: string;
  mealType: string;
}

export const MealSlot: React.FC<MealSlotProps> = ({ date, mealType }) => {
  const { plan, snacks, ingredients, customUnits, selectedUserIds } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [isHovering, setIsHovering] = useState(false);

  const mealsInSlot = plan.filter((p) => p.date === date && p.mealType === mealType);
  const snacksInSlot = snacks.filter((s) => s.date === date && s.mealType === mealType);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsHovering(true);
  };

  const handleDragLeave = () => setIsHovering(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);
    const data = e.dataTransfer.getData("text/plain");

    if (data.startsWith("snack:")) {
      const ingredientId = data.slice(6);
      const ingredient = ingredients.find((i) => i.id === ingredientId);
      if (!ingredient) return;

      const ingCustomUnits =
        (ingredient.customUnits ?? []).length > 0
          ? ingredient.customUnits!
          : customUnits.filter((cu) => cu.ingredientId === ingredientId);

      const defaultUnit: UnitRef =
        ingCustomUnits.length > 0
          ? { type: "custom", customUnitId: ingCustomUnits[0].id }
          : { type: "core", unit: "unit" };

      const newSnack = {
        instanceId: crypto.randomUUID(),
        ingredientId,
        quantity: 1,
        unit: defaultUnit,
        date,
        mealType,
        assignedUsers: selectedUserIds,
      };

      dispatch({ type: "ADD_PLANNED_SNACK", payload: newSnack });
      if (user) saveSnackToCloud(user.uid, newSnack).catch(console.error);
    } else if (data) {
      const newPlannedMeal = {
        instanceId: crypto.randomUUID(),
        mealId: data,
        date,
        mealType,
        assignedUsers: selectedUserIds,
      };
      dispatch({ type: "ADD_PLANNED_MEAL", payload: newPlannedMeal });
      if (user) savePlanEntryToCloud(user.uid, newPlannedMeal).catch(console.error);
    }
  };

  const isEmpty = mealsInSlot.length === 0 && snacksInSlot.length === 0;

  return (
    <div
      className={`${styles.cell} ${isHovering ? styles.cellHovering : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isEmpty ? (
        <div className={styles.emptySlot} />
      ) : (
        <div className={styles.slotContent}>
          {mealsInSlot.map((plannedMeal) => (
            <PlannedItemCard
              key={plannedMeal.instanceId}
              kind="meal"
              plannedMeal={plannedMeal}
            />
          ))}
          {snacksInSlot.map((plannedSnack) => (
            <PlannedItemCard
              key={plannedSnack.instanceId}
              kind="snack"
              plannedSnack={plannedSnack}
            />
          ))}
        </div>
      )}
    </div>
  );
};
