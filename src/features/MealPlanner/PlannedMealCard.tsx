import React, { useState, useRef, useEffect } from "react";
import type { PlannedMeal } from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { savePlanEntryToCloud, deletePlanEntryFromCloud } from "../../lib/cloudSync";
import styles from "./PlannedMealCard.module.css";

interface PlannedMealCardProps {
  plannedMeal: PlannedMeal;
}

export const PlannedMealCard: React.FC<PlannedMealCardProps> = ({
  plannedMeal,
}) => {
  const { meals, users, selectedPlannedMealInstanceId } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const mealDetails = meals.find((m) => m.id === plannedMeal.mealId);
  const assignedUsers = users.filter((u) =>
    plannedMeal.assignedUsers.includes(u.id)
  );

  // Close picker on outside click
  useEffect(() => {
    if (!isPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPickerOpen]);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: "SET_SELECTED_INSTANCE",
      payload: plannedMeal.instanceId,
    });
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: "REMOVE_PLANNED_MEAL",
      payload: { instanceId: plannedMeal.instanceId },
    });
    if (user) {
      deletePlanEntryFromCloud(user.uid, plannedMeal.instanceId).catch(console.error);
    }
  };

  const handlePickerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPickerOpen((prev) => !prev);
  };

  const handleUserToggle = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    const isAssigned = plannedMeal.assignedUsers.includes(userId);
    const newAssignedUsers = isAssigned
      ? plannedMeal.assignedUsers.filter((id) => id !== userId)
      : [...plannedMeal.assignedUsers, userId];

    const updated: PlannedMeal = { ...plannedMeal, assignedUsers: newAssignedUsers };
    dispatch({ type: "UPDATE_PLANNED_MEAL", payload: updated });
    if (user) {
      savePlanEntryToCloud(user.uid, updated).catch(console.error);
    }
  };

  if (!mealDetails) {
    return <div className={styles.card}>Meal not found</div>;
  }

  const isSelected = selectedPlannedMealInstanceId === plannedMeal.instanceId;

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
      onClick={handleCardClick}
    >
      <img
        src={mealDetails.photoUrl}
        alt={mealDetails.name}
        className={styles.cardImage}
      />
      <div className={styles.cardContent}>
        <h4 className={styles.cardTitle}>{mealDetails.name}</h4>

        {/* User avatars + picker trigger */}
        <div className={styles.userPickerArea} ref={pickerRef}>
          <div className={styles.userAvatars} onClick={handlePickerToggle}>
            {assignedUsers.map((u) => (
              <div
                key={u.id}
                className={styles.miniAvatar}
                style={{ backgroundColor: u.color }}
              >
                {u.initials}
              </div>
            ))}
            <div className={styles.addUserBtn}>
              {assignedUsers.length === 0 ? "+ Add" : "+"}
            </div>
          </div>

          {/* Inline user picker popover */}
          {isPickerOpen && (
            <div className={styles.userPicker} onClick={(e) => e.stopPropagation()}>
              {users.map((u) => {
                const isAssigned = plannedMeal.assignedUsers.includes(u.id);
                return (
                  <button
                    key={u.id}
                    className={`${styles.pickerUser} ${isAssigned ? styles.pickerUserActive : ""}`}
                    style={isAssigned ? { backgroundColor: u.color, borderColor: u.color } : { borderColor: u.color }}
                    onClick={(e) => handleUserToggle(e, u.id)}
                    title={u.initials}
                  >
                    {u.initials}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button className={styles.removeButton} onClick={handleRemoveClick}>
        &times;
      </button>
    </div>
  );
};
