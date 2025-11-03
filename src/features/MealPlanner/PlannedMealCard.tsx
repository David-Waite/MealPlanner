import React from "react";
import type { PlannedMeal } from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks"; // <-- Import dispatch
import styles from "./PlannedMealCard.module.css";

interface PlannedMealCardProps {
  plannedMeal: PlannedMeal;
}

export const PlannedMealCard: React.FC<PlannedMealCardProps> = ({
  plannedMeal,
}) => {
  const { meals, users, selectedPlannedMealInstanceId } = useAppState(); // <-- Get selected ID
  const dispatch = useAppDispatch(); // <-- NEW

  const mealDetails = meals.find((m) => m.id === plannedMeal.mealId);
  const assignedUsers = users.filter((u) =>
    plannedMeal.assignedUsers.includes(u.id)
  );

  // --- NEW: Click Handlers ---
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop click from bubbling up to the day selector
    dispatch({
      type: "SET_SELECTED_INSTANCE",
      payload: plannedMeal.instanceId,
    });
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop click from selecting the card
    dispatch({
      type: "REMOVE_PLANNED_MEAL",
      payload: { instanceId: plannedMeal.instanceId },
    });
  };

  if (!mealDetails) {
    return <div className={styles.card}>Meal not found</div>;
  }

  // Check if this card is the currently selected one
  const isSelected = selectedPlannedMealInstanceId === plannedMeal.instanceId;

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
      onClick={handleCardClick} // <-- NEW
    >
      <img
        src={mealDetails.photoUrl}
        alt={mealDetails.name}
        className={styles.cardImage}
      />
      <div className={styles.cardContent}>
        <h4 className={styles.cardTitle}>{mealDetails.name}</h4>
        <div className={styles.userAvatars}>
          {assignedUsers.map((user) => (
            <div
              key={user.id}
              className={styles.miniAvatar}
              style={{ backgroundColor: user.color }}
            >
              {user.initials}
            </div>
          ))}
        </div>
      </div>
      {/* --- NEW: Remove Button --- */}
      <button className={styles.removeButton} onClick={handleRemoveClick}>
        &times;
      </button>
    </div>
  );
};
