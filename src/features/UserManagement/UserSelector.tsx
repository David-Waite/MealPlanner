import React, { useState, useRef, useEffect } from "react";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/Avatar/Avatar";
import { saveHouseholdUsers } from "../../lib/cloudSync";
import type { User } from "../../types";
import styles from "./UserSelector.module.css";

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

type PopoverMode = "add" | "edit";

interface PopoverState {
  mode: PopoverMode;
  editingUser?: User;
}

export const UserSelector: React.FC = () => {
  const { users, selectedUserIds } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // Shared popover state
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [colorValue, setColorValue] = useState(COLOR_PALETTE[0]);
  const formRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = popover !== null;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Auto-focus input when popover opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 30);
  }, [isOpen]);

  const openAdd = () => {
    setNameValue("");
    setColorValue(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setPopover({ mode: "add" });
  };

  const openEdit = (u: User) => {
    setNameValue(u.initials);
    setColorValue(u.color);
    setPopover({ mode: "edit", editingUser: u });
  };

  const handleUserClick = (userId: string) => {
    const isSelected = selectedUserIds.includes(userId);
    let newIds: string[];
    if (isSelected) {
      newIds = selectedUserIds.filter((id) => id !== userId);
      if (newIds.length === 0) newIds = [userId];
    } else {
      newIds = [...selectedUserIds, userId];
    }
    dispatch({ type: "SET_SELECTED_USERS", payload: newIds });
  };

  const handleAddUser = () => {
    const trimmed = nameValue.trim();
    if (!trimmed) return;

    const newUser: User = {
      id: `u_${Date.now()}`,
      initials: generateInitials(trimmed),
      color: colorValue,
    };

    dispatch({ type: "ADD_USER", payload: newUser });
    dispatch({ type: "SET_SELECTED_USERS", payload: [...selectedUserIds, newUser.id] });
    if (user) saveHouseholdUsers(user.uid, [...users, newUser]).catch(console.error);
    setPopover(null);
  };

  const handleSaveEdit = () => {
    const trimmed = nameValue.trim();
    if (!trimmed || !popover?.editingUser) return;

    const updated: User = {
      ...popover.editingUser,
      initials: trimmed.length <= 3 ? trimmed.toUpperCase() : generateInitials(trimmed),
      color: colorValue,
    };

    dispatch({ type: "UPDATE_USER", payload: updated });
    if (user) {
      saveHouseholdUsers(user.uid, users.map((u) => u.id === updated.id ? updated : u))
        .catch(console.error);
    }
    setPopover(null);
  };

  const handleDeleteUser = () => {
    if (!popover?.editingUser) return;
    if (users.length <= 1) return;
    const userId = popover.editingUser.id;
    dispatch({ type: "DELETE_USER", payload: { userId } });
    // If the deleted user was the only selected one, select the first remaining user
    const remainingSelected = selectedUserIds.filter((id) => id !== userId);
    if (remainingSelected.length === 0) {
      const fallback = users.find((u) => u.id !== userId);
      if (fallback) dispatch({ type: "SET_SELECTED_USERS", payload: [fallback.id] });
    }
    if (user) {
      saveHouseholdUsers(user.uid, users.filter((u) => u.id !== userId)).catch(console.error);
    }
    setPopover(null);
  };

  const previewInitials = nameValue.trim()
    ? nameValue.trim().length <= 3
      ? nameValue.trim().toUpperCase()
      : generateInitials(nameValue)
    : null;

  const isAdd = popover?.mode === "add";

  return (
    <div className={styles.userSelector}>
      {users.map((u) => (
        <div key={u.id} className={styles.avatarWrapper}>
          <div
            onClick={() => handleUserClick(u.id)}
            onDoubleClick={() => openEdit(u)}
            className={styles.avatarClickTarget}
            title="Click to toggle · Double-click to edit"
          >
            <Avatar
              initials={u.initials}
              bgColor={u.color}
              selected={selectedUserIds.includes(u.id)}
            />
          </div>
        </div>
      ))}

      {/* Add button + shared popover anchor */}
      <div className={styles.addWrapper} ref={formRef}>
        <button
          className={styles.addUserCircle}
          onClick={isOpen && isAdd ? () => setPopover(null) : openAdd}
          title="Add person"
        >
          +
        </button>

        {isOpen && (
          <div className={styles.popover}>
            <p className={styles.popoverTitle}>
              {isAdd ? "Add person" : "Edit person"}
            </p>

            <input
              ref={inputRef}
              type="text"
              className={styles.nameInput}
              placeholder={isAdd ? "Name (e.g. Sarah)" : "Name or initials"}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { if (isAdd) handleAddUser(); else handleSaveEdit(); }
                if (e.key === "Escape") setPopover(null);
              }}
              maxLength={30}
            />

            {previewInitials && (
              <div className={styles.initialsPreview} style={{ backgroundColor: colorValue }}>
                {previewInitials}
              </div>
            )}

            <div className={styles.palette}>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  className={`${styles.paletteColor} ${colorValue === c ? styles.paletteColorActive : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColorValue(c)}
                />
              ))}
            </div>

            {isAdd ? (
              <button
                className={styles.addBtn}
                onClick={handleAddUser}
                disabled={!nameValue.trim()}
              >
                Add
              </button>
            ) : (
              <div className={styles.editActions}>
                <button
                  className={styles.deleteBtn}
                  onClick={handleDeleteUser}
                  disabled={users.length <= 1}
                  title={users.length <= 1 ? "Can't delete the only person" : undefined}
                >
                  Delete
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={handleSaveEdit}
                  disabled={!nameValue.trim()}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
