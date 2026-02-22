import React, { useMemo } from "react";
import type { Meal } from "../../types";
import { useAppState } from "../../context/hooks"; // <-- NEW
import styles from "./MealLibrary.module.css";

interface MealCardProps {
  meal: Meal;
  onEdit: () => void;
  onDelete: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onEdit,
  onDelete,
}) => {
  // --- NEW: Get plan and selected dates ---
  const { plan, selectedDates } = useAppState();

  // --- NEW: Modulo Tracker Logic ---
  const servingsToPlan = useMemo(() => {
    // 1. Filter plan by selected dates
    const filteredPlan = plan.filter((p) => selectedDates.includes(p.date));

    // 2. Filter for *this* meal
    const planForThisMeal = filteredPlan.filter((p) => p.mealId === meal.id);

    // 3. Sum total planned servings
    const totalPlannedServings = planForThisMeal.reduce(
      (sum, p) => sum + p.assignedUsers.length,
      0
    );

    if (totalPlannedServings === 0) {
      return meal.servings; // Show full amount if none are planned
    }

    const remainder = totalPlannedServings % meal.servings;

    if (remainder === 0) {
      return 0; // "Perfect" plan
    }

    return meal.servings - remainder; // Show amount left for *this batch*
  }, [meal, plan, selectedDates]);

  // Stop drag event from firing when clicking buttons
  const handleButtonStopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", meal.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      className={styles.mealCard}
      draggable="true"
      onDragStart={handleDragStart}
    >
      <div className={styles.cardActions} onClick={handleButtonStopPropagation}>
        <button
          className={styles.actionButton}
          onClick={onEdit}
          draggable="false"
        >
          Edit
        </button>
        <button
          className={`${styles.actionButton} ${styles.deleteButton}`}
          onClick={onDelete}
          draggable="false"
        >
          Del
        </button>
      </div>

      {/* UPDATED: Show dynamic serving count overlay */}
      <span
        className={`${styles.servingsTracker} ${
          servingsToPlan === 0 ? styles.servingsComplete : ""
        }`}
      >
        {servingsToPlan}
      </span>

      <img
        src={meal.photoUrl}
        alt={meal.name}
        className={styles.cardImage}
        draggable="false"
      />
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{meal.name}</h3>
        {meal.tags && meal.tags.length > 0 && (
          <div className={styles.cardTags}>
            {meal.tags.map((tag) => (
              <span key={tag} className={styles.cardTag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
