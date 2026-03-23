import React, { useState, useRef, useEffect } from "react";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/Avatar/Avatar";
import { saveHouseholdUsers } from "../../lib/cloudSync";
import styles from "./UserSelector.module.css";

// Preset palette for new user colours
const COLOR_PALETTE = [
  "#4A90E2", "#D0021B", "#7ED321", "#F5A623",
  "#9B59B6", "#1ABC9C", "#E67E22", "#E91E63",
  "#00BCD4", "#FF5722",
];

function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

export const UserSelector: React.FC = () => {
  const { users, selectedUserIds } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const formRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close form on outside click
  useEffect(() => {
    if (!isFormOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setIsFormOpen(false);
        setNewName("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFormOpen]);

  // Auto-focus input when form opens
  useEffect(() => {
    if (isFormOpen) inputRef.current?.focus();
  }, [isFormOpen]);

  const handleUserToggle = (userId: string) => {
    const isSelected = selectedUserIds.includes(userId);
    let newSelectedIds: string[];
    if (isSelected) {
      newSelectedIds = selectedUserIds.filter((id) => id !== userId);
      if (newSelectedIds.length === 0) newSelectedIds = [userId];
    } else {
      newSelectedIds = [...selectedUserIds, userId];
    }
    dispatch({ type: "SET_SELECTED_USERS", payload: newSelectedIds });
  };

  const handleAddUser = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const newUser = {
      id: `u_${Date.now()}`,
      initials: generateInitials(trimmed),
      color: newColor,
    };

    dispatch({ type: "ADD_USER", payload: newUser });

    // Auto-select the new user
    dispatch({ type: "SET_SELECTED_USERS", payload: [...selectedUserIds, newUser.id] });

    // Persist to cloud
    if (user) {
      saveHouseholdUsers(user.uid, [...users, newUser]).catch(console.error);
    }

    setNewName("");
    setNewColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setIsFormOpen(false);
  };

  const handleDeleteUser = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (users.length <= 1) return; // keep at least one
    dispatch({ type: "DELETE_USER", payload: { userId } });
    if (user) {
      saveHouseholdUsers(user.uid, users.filter((u) => u.id !== userId)).catch(console.error);
    }
  };

  return (
    <div className={styles.userSelector}>
      {users.map((u) => (
        <div key={u.id} className={styles.avatarWrapper}>
          <div onClick={() => handleUserToggle(u.id)}>
            <Avatar
              initials={u.initials}
              bgColor={u.color}
              selected={selectedUserIds.includes(u.id)}
            />
          </div>
          {users.length > 1 && (
            <button
              className={styles.deleteUserBtn}
              onClick={(e) => handleDeleteUser(e, u.id)}
              title={`Remove ${u.initials}`}
            >
              &times;
            </button>
          )}
        </div>
      ))}

      {/* Add new user */}
      <div className={styles.addWrapper} ref={formRef}>
        <button
          className={styles.addUserCircle}
          onClick={() => setIsFormOpen((v) => !v)}
          title="Add person"
        >
          +
        </button>

        {isFormOpen && (
          <div className={styles.addForm}>
            <p className={styles.addFormTitle}>Add person</p>
            <input
              ref={inputRef}
              type="text"
              className={styles.nameInput}
              placeholder="Name (e.g. Sarah)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddUser(); if (e.key === "Escape") setIsFormOpen(false); }}
              maxLength={30}
            />
            {/* Preview initials */}
            {newName.trim() && (
              <div className={styles.initialsPreview} style={{ backgroundColor: newColor }}>
                {generateInitials(newName)}
              </div>
            )}
            {/* Colour palette */}
            <div className={styles.palette}>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  className={`${styles.paletteColor} ${newColor === c ? styles.paletteColorActive : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <button
              className={styles.addBtn}
              onClick={handleAddUser}
              disabled={!newName.trim()}
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
