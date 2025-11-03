import React from "react";
import { useAppState, useAppDispatch } from "../../context/hooks"; // <-- Import dispatch
import { Avatar } from "../../components/Avatar/Avatar";
import styles from "./UserSelector.module.css";

export const UserSelector: React.FC = () => {
  const { users, selectedUserIds } = useAppState();
  const dispatch = useAppDispatch(); // <-- Add dispatch

  // --- NEW: Handler to toggle user selection ---
  const handleUserToggle = (userId: string) => {
    const isSelected = selectedUserIds.includes(userId);
    let newSelectedIds: string[];

    if (isSelected) {
      // Remove user (but don't allow empty selection)
      newSelectedIds = selectedUserIds.filter((id) => id !== userId);
      if (newSelectedIds.length === 0) {
        newSelectedIds = [userId]; // Keep at least one selected
      }
    } else {
      // Add user (for multi-select)
      newSelectedIds = [...selectedUserIds, userId];
    }

    dispatch({ type: "SET_SELECTED_USERS", payload: newSelectedIds });
  };

  return (
    <div className={styles.userSelector}>
      {users.map((user) => (
        // --- NEW: Add onClick wrapper ---
        <div key={user.id} onClick={() => handleUserToggle(user.id)}>
          <Avatar
            initials={user.initials}
            bgColor={user.color}
            selected={selectedUserIds.includes(user.id)}
          />
        </div>
      ))}
    </div>
  );
};
