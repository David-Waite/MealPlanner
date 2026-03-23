import React, { useState, useRef, useEffect } from "react";
import type { PlannedSnack, UnitRef, CustomUnit } from "../../types";
import { COOKING_UNITS, METRIC_UNITS, IMPERIAL_UNITS } from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { saveSnackToCloud, deleteSnackFromCloud } from "../../lib/cloudSync";
import { FRACTIONS, formatQty } from "./fractions";
import styles from "./PlannedSnackCard.module.css";

const ALL_CORE_UNITS = [...COOKING_UNITS, ...METRIC_UNITS, ...IMPERIAL_UNITS];

function formatUnit(unit: UnitRef, customUnits: CustomUnit[]): string {
  if (unit.type === "core") return unit.unit;
  const cu = customUnits.find((c) => c.id === unit.customUnitId);
  return cu ? cu.label : "unit";
}

interface PlannedSnackCardProps {
  plannedSnack: PlannedSnack;
}

export const PlannedSnackCard: React.FC<PlannedSnackCardProps> = ({ plannedSnack }) => {
  const { ingredients, users, customUnits } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // User picker state
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const userPickerRef = useRef<HTMLDivElement>(null);

  // Qty edit popover state
  const [isQtyOpen, setIsQtyOpen] = useState(false);
  const [editQty, setEditQty] = useState(String(plannedSnack.quantity));
  const [editUnit, setEditUnit] = useState<UnitRef>(plannedSnack.unit);
  const qtyRef = useRef<HTMLDivElement>(null);

  const ingredient = ingredients.find((i) => i.id === plannedSnack.ingredientId);
  const assignedUsers = users.filter((u) => plannedSnack.assignedUsers.includes(u.id));
  const ingCustomUnits = (ingredient?.customUnits ?? []).length > 0
    ? ingredient!.customUnits!
    : customUnits.filter((cu) => cu.ingredientId === plannedSnack.ingredientId);

  // Close on outside click
  useEffect(() => {
    if (!isUserPickerOpen && !isQtyOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isUserPickerOpen && userPickerRef.current && !userPickerRef.current.contains(target)) {
        setIsUserPickerOpen(false);
      }
      if (isQtyOpen && qtyRef.current && !qtyRef.current.contains(target)) {
        setIsQtyOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserPickerOpen, isQtyOpen]);

  const saveUpdate = (updated: PlannedSnack) => {
    dispatch({ type: "UPDATE_PLANNED_SNACK", payload: updated });
    if (user) saveSnackToCloud(user.uid, updated).catch(console.error);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: "REMOVE_PLANNED_SNACK", payload: { instanceId: plannedSnack.instanceId } });
    if (user) deleteSnackFromCloud(user.uid, plannedSnack.instanceId).catch(console.error);
  };

  const handleUserToggle = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    const isAssigned = plannedSnack.assignedUsers.includes(userId);
    const newAssignedUsers = isAssigned
      ? plannedSnack.assignedUsers.filter((id) => id !== userId)
      : [...plannedSnack.assignedUsers, userId];
    saveUpdate({ ...plannedSnack, assignedUsers: newAssignedUsers });
  };

  const handleQtySave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const qty = parseFloat(editQty);
    if (!qty || qty <= 0) return;
    saveUpdate({ ...plannedSnack, quantity: qty, unit: editUnit });
    setIsQtyOpen(false);
  };

  const openQty = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditQty(String(plannedSnack.quantity));
    setEditUnit(plannedSnack.unit);
    setIsQtyOpen(true);
  };

  const unitLabel = formatUnit(plannedSnack.unit, customUnits);
  const isWeightUnit = plannedSnack.unit.type === "core" &&
    (["g", "kg", "ml", "l", "oz", "lb"].includes(plannedSnack.unit.unit));
  const showFractions = !isWeightUnit;

  return (
    <div className={styles.card}>
      <div className={styles.snackIcon}>🍎</div>

      <div className={styles.cardContent}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{ingredient?.name ?? "Unknown"}</span>
          {/* Qty pill — click to edit */}
          <div className={styles.qtyArea} ref={qtyRef}>
            <button className={styles.qtyPill} onClick={openQty} title="Edit quantity">
              {formatQty(plannedSnack.quantity)} {unitLabel}
            </button>

            {/* Qty edit popover */}
            {isQtyOpen && (
              <div className={styles.qtyPopover} onClick={(e) => e.stopPropagation()}>
                {showFractions && (
                  <div className={styles.fractionsRow}>
                    {FRACTIONS.map((f) => (
                      <button
                        key={f.label}
                        className={`${styles.fractionBtn} ${parseFloat(editQty) === f.value ? styles.fractionBtnActive : ""}`}
                        onClick={(e) => { e.stopPropagation(); setEditQty(String(f.value)); }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className={styles.qtyInputRow}>
                <input
                  className={styles.qtyInput}
                  type="number"
                  min="0.1"
                  step={isWeightUnit ? "10" : "0.25"}
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  autoFocus
                />
                <select
                  className={styles.qtyUnitSelect}
                  value={editUnit.type === "core" ? `core:${editUnit.unit}` : `custom:${editUnit.customUnitId}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("core:")) {
                      setEditUnit({ type: "core", unit: val.slice(5) as import("../../types").CoreUnit });
                    } else {
                      setEditUnit({ type: "custom", customUnitId: val.slice(7) });
                    }
                  }}
                >
                  {ingCustomUnits.length > 0 && (
                    <optgroup label="Custom">
                      {ingCustomUnits.map((cu) => (
                        <option key={cu.id} value={`custom:${cu.id}`}>{cu.label}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Standard">
                    {ALL_CORE_UNITS.map((u) => (
                      <option key={u} value={`core:${u}`}>{u}</option>
                    ))}
                  </optgroup>
                </select>
                <button className={styles.qtySaveBtn} onClick={handleQtySave}>✓</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User picker */}
        <div className={styles.userPickerArea} ref={userPickerRef}>
          <div
            className={styles.userAvatars}
            onClick={(e) => { e.stopPropagation(); setIsUserPickerOpen((p) => !p); }}
          >
            {assignedUsers.map((u) => (
              <div key={u.id} className={styles.miniAvatar} style={{ backgroundColor: u.color }}>
                {u.initials}
              </div>
            ))}
            <div className={styles.addUserBtn}>{assignedUsers.length === 0 ? "+ Add" : "+"}</div>
          </div>

          {isUserPickerOpen && (
            <div className={styles.userPicker} onClick={(e) => e.stopPropagation()}>
              {users.map((u) => {
                const isAssigned = plannedSnack.assignedUsers.includes(u.id);
                return (
                  <button
                    key={u.id}
                    className={`${styles.pickerUser} ${isAssigned ? styles.pickerUserActive : ""}`}
                    style={isAssigned ? { backgroundColor: u.color, borderColor: u.color } : { borderColor: u.color }}
                    onClick={(e) => handleUserToggle(e, u.id)}
                  >
                    {u.initials}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button className={styles.removeButton} onClick={handleRemove}>&times;</button>
    </div>
  );
};
