import React, { useMemo } from "react";
import type { Meal } from "../../types";
import { useAppState } from "../../context/hooks";
import styles from "./MealLibrary.module.css";

interface MealCardProps {
  meal: Meal;
  onEdit: () => void;
  onDelete: () => void;
  isFavourited?: boolean;
  onFavourite?: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onEdit,
  onDelete,
  isFavourited,
  onFavourite,
}) => {
  const { plan, selectedDates } = useAppState();

  const servingsToPlan = useMemo(() => {
    const filteredPlan = plan.filter((p) => selectedDates.includes(p.date));
    const planForThisMeal = filteredPlan.filter((p) => p.mealId === meal.id);
    const totalPlannedServings = planForThisMeal.reduce(
      (sum, p) => sum + p.assignedUsers.length,
      0
    );
    if (totalPlannedServings === 0) return meal.servings;
    const remainder = totalPlannedServings % meal.servings;
    if (remainder === 0) return 0;
    return meal.servings - remainder;
  }, [meal, plan, selectedDates]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", meal.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className={styles.mealCard} draggable="true" onDragStart={handleDragStart}>
      <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
        {onFavourite && (
          <button
            className={`${styles.actionButton} ${isFavourited ? styles.starBtnActive : ""}`}
            onClick={onFavourite}
            draggable="false"
            title={isFavourited ? "Remove from Favourites" : "Add to Favourites"}
          >
            {isFavourited ? "★" : "☆"}
          </button>
        )}
        <button className={styles.actionButton} onClick={onEdit} draggable="false">
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

      <span className={`${styles.servingsTracker} ${servingsToPlan === 0 ? styles.servingsComplete : ""}`}>
        {servingsToPlan}
      </span>

      {meal.photoUrl && (
        <img src={meal.photoUrl} alt={meal.name} className={styles.cardImage} draggable="false" />
      )}
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{meal.name}</h3>
        {meal.ownerDisplayName && (
          <span className={styles.cardAttribution}>by {meal.ownerDisplayName}</span>
        )}
        {meal.tags && meal.tags.length > 0 && (
          <div className={styles.cardTags}>
            {meal.tags.map((tag) => (
              <span key={tag} className={styles.cardTag}>{tag}</span>
            ))}
          </div>
        )}
        {meal.globalStatus === "pending" && (
          <span className={styles.pendingBadge}>Pending review</span>
        )}
      </div>
    </div>
  );
};
