import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { PlannedMeal, PlannedSnack, UnitRef, CustomUnit } from "../../types";
import { COOKING_UNITS, METRIC_UNITS, IMPERIAL_UNITS } from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import {
  savePlanEntryToCloud,
  deletePlanEntryFromCloud,
  saveSnackToCloud,
  deleteSnackFromCloud,
} from "../../lib/cloudSync";
import { FRACTIONS, formatQty } from "./fractions";
import styles from "./PlannedItemCard.module.css";

const ALL_CORE_UNITS = [...COOKING_UNITS, ...METRIC_UNITS, ...IMPERIAL_UNITS];

function formatUnit(unit: UnitRef, customUnits: CustomUnit[]): string {
  if (unit.type === "core") return unit.unit;
  const cu = customUnits.find((c) => c.id === unit.customUnitId);
  return cu ? cu.label : "unit";
}

type Props =
  | { kind: "meal"; plannedMeal: PlannedMeal; plannedSnack?: never }
  | { kind: "snack"; plannedSnack: PlannedSnack; plannedMeal?: never };

export const PlannedItemCard: React.FC<Props> = ({ kind, plannedMeal, plannedSnack }) => {
  const { meals, ingredients, users, customUnits, selectedPlannedMealInstanceId } =
    useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // Portal popover anchors
  const [qtyAnchor, setQtyAnchor] = useState<DOMRect | null>(null);
  const [userAnchor, setUserAnchor] = useState<DOMRect | null>(null);

  // Edit state
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState<UnitRef>({ type: "core", unit: "unit" });
  const [editPortions, setEditPortions] = useState("");

  // ── Derived values ──
  let name = "";
  let assignedUserIds: string[] = [];
  let photoUrl: string | undefined;
  let isSelected = false;
  let snackIngCustomUnits: CustomUnit[] = [];
  let isWeightUnit = false;
  let qtyLabel = "";

  if (kind === "meal") {
    const meal = meals.find((m) => m.id === plannedMeal!.mealId);
    name = meal?.name ?? "Unknown meal";
    photoUrl = meal?.photoUrl;
    assignedUserIds = plannedMeal!.assignedUsers;
    isSelected = selectedPlannedMealInstanceId === plannedMeal!.instanceId;
    qtyLabel = `${formatQty(plannedMeal!.portions ?? 1)}×`;
  } else {
    const ingredient = ingredients.find((i) => i.id === plannedSnack!.ingredientId);
    name = ingredient?.name ?? "Unknown";
    assignedUserIds = plannedSnack!.assignedUsers;
    const ingCU =
      (ingredient?.customUnits ?? []).length > 0
        ? ingredient!.customUnits!
        : customUnits.filter((cu) => cu.ingredientId === plannedSnack!.ingredientId);
    snackIngCustomUnits = ingCU;
    isWeightUnit =
      plannedSnack!.unit.type === "core" &&
      ["g", "kg", "ml", "l", "oz", "lb"].includes(plannedSnack!.unit.unit);
    qtyLabel = `${formatQty(plannedSnack!.quantity)} ${formatUnit(plannedSnack!.unit, customUnits)}`;
  }

  const assignedUsers = users.filter((u) => assignedUserIds.includes(u.id));
  const showFractions = kind === "meal" || !isWeightUnit;
  const editValue = kind === "meal" ? editPortions : editQty;
  const setEditValue = kind === "meal"
    ? (v: string) => setEditPortions(v)
    : (v: string) => setEditQty(v);

  // ── Close popovers on outside click or scroll ──
  useEffect(() => {
    if (!qtyAnchor && !userAnchor) return;
    const close = () => {
      setQtyAnchor(null);
      setUserAnchor(null);
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", close);
      window.addEventListener("scroll", close, true);
    }, 30);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [qtyAnchor, userAnchor]);

  // ── Handlers ──
  const saveUpdate = (updated: PlannedMeal | PlannedSnack) => {
    if (kind === "meal") {
      dispatch({ type: "UPDATE_PLANNED_MEAL", payload: updated as PlannedMeal });
      if (user) savePlanEntryToCloud(user.uid, updated as PlannedMeal).catch(console.error);
    } else {
      dispatch({ type: "UPDATE_PLANNED_SNACK", payload: updated as PlannedSnack });
      if (user) saveSnackToCloud(user.uid, updated as PlannedSnack).catch(console.error);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (kind === "meal") {
      dispatch({ type: "REMOVE_PLANNED_MEAL", payload: { instanceId: plannedMeal!.instanceId } });
      if (user)
        deletePlanEntryFromCloud(user.uid, plannedMeal!.instanceId).catch(console.error);
    } else {
      dispatch({
        type: "REMOVE_PLANNED_SNACK",
        payload: { instanceId: plannedSnack!.instanceId },
      });
      if (user)
        deleteSnackFromCloud(user.uid, plannedSnack!.instanceId).catch(console.error);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (kind !== "meal") return;
    e.stopPropagation();
    dispatch({ type: "SET_SELECTED_INSTANCE", payload: plannedMeal!.instanceId });
  };

  const openQtyPopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (kind === "meal") {
      setEditPortions(String(plannedMeal!.portions ?? 1));
    } else {
      setEditQty(String(plannedSnack!.quantity));
      setEditUnit(plannedSnack!.unit);
    }
    setQtyAnchor(rect);
    setUserAnchor(null);
  };

  const openUserPopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setUserAnchor(rect);
    setQtyAnchor(null);
  };

  const handleQtySave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (kind === "meal") {
      const p = parseFloat(editPortions);
      if (!p || p <= 0) return;
      saveUpdate({ ...plannedMeal!, portions: p });
    } else {
      const qty = parseFloat(editQty);
      if (!qty || qty <= 0) return;
      saveUpdate({ ...plannedSnack!, quantity: qty, unit: editUnit });
    }
    setQtyAnchor(null);
  };

  const handleUserToggle = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (kind === "meal") {
      const isAssigned = plannedMeal!.assignedUsers.includes(userId);
      const newUsers = isAssigned
        ? plannedMeal!.assignedUsers.filter((id) => id !== userId)
        : [...plannedMeal!.assignedUsers, userId];
      saveUpdate({ ...plannedMeal!, assignedUsers: newUsers });
    } else {
      const isAssigned = plannedSnack!.assignedUsers.includes(userId);
      const newUsers = isAssigned
        ? plannedSnack!.assignedUsers.filter((id) => id !== userId)
        : [...plannedSnack!.assignedUsers, userId];
      saveUpdate({ ...plannedSnack!, assignedUsers: newUsers });
    }
  };

  // Clamp popover so it never goes off-screen
  const clampLeft = (preferred: number, width = 230) =>
    Math.max(8, Math.min(preferred, window.innerWidth - width - 8));

  return (
    <div
      className={`${styles.card} ${kind === "snack" ? styles.snackCard : styles.mealCard} ${
        isSelected ? styles.selected : ""
      }`}
      onClick={handleCardClick}
    >
      {/* Thumbnail */}
      <div className={styles.thumb}>
        {kind === "meal" && photoUrl ? (
          <img src={photoUrl} alt={name} className={styles.thumbImg} />
        ) : (
          <span className={styles.thumbIcon}>{kind === "snack" ? "🍎" : "🍽️"}</span>
        )}
      </div>

      {/* Content */}
      <div className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.name} title={name}>
            {name}
          </span>
          <button
            className={`${styles.qtyChip} ${
              kind === "snack" ? styles.qtyChipSnack : styles.qtyChipMeal
            }`}
            onClick={openQtyPopover}
            title="Edit quantity"
          >
            {qtyLabel}
          </button>
        </div>

        <div className={styles.bottomRow}>
          <div
            className={styles.avatarRow}
            onClick={openUserPopover}
            title="Assign people"
          >
            {assignedUsers.map((u) => (
              <div
                key={u.id}
                className={styles.avatar}
                style={{ backgroundColor: u.color }}
              >
                {u.initials}
              </div>
            ))}
            <div className={styles.addUserChip}>
              {assignedUsers.length === 0 ? "+ Add" : "+"}
            </div>
          </div>
        </div>
      </div>

      {/* Remove */}
      <button className={styles.removeBtn} onClick={handleRemove} title="Remove">
        &times;
      </button>

      {/* ── Qty / Portions popover (portal) ── */}
      {qtyAnchor &&
        createPortal(
          <div
            className={styles.popover}
            style={{
              top: qtyAnchor.bottom + 6,
              left: clampLeft(qtyAnchor.right, 230),
              transform: "translateX(-100%)",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {showFractions && (
              <div className={styles.fractionsRow}>
                {FRACTIONS.map((f) => (
                  <button
                    key={f.label}
                    className={`${styles.fracBtn} ${
                      parseFloat(editValue) === f.value ? styles.fracBtnActive : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditValue(String(f.value));
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            <div className={styles.inputRow}>
              <input
                className={styles.qtyInput}
                type="number"
                min="0.1"
                step={isWeightUnit ? "10" : "0.25"}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              />
              {kind === "snack" ? (
                <select
                  className={styles.unitSelect}
                  value={
                    editUnit.type === "core"
                      ? `core:${editUnit.unit}`
                      : `custom:${editUnit.customUnitId}`
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("core:")) {
                      setEditUnit({
                        type: "core",
                        unit: val.slice(5) as import("../../types").CoreUnit,
                      });
                    } else {
                      setEditUnit({ type: "custom", customUnitId: val.slice(7) });
                    }
                  }}
                >
                  {snackIngCustomUnits.length > 0 && (
                    <optgroup label="Custom">
                      {snackIngCustomUnits.map((cu) => (
                        <option key={cu.id} value={`custom:${cu.id}`}>
                          {cu.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Standard">
                    {ALL_CORE_UNITS.map((u) => (
                      <option key={u} value={`core:${u}`}>
                        {u}
                      </option>
                    ))}
                  </optgroup>
                </select>
              ) : (
                <span className={styles.portionsLabel}>portions</span>
              )}
              <button className={styles.saveBtn} onClick={handleQtySave}>
                ✓
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* ── User picker popover (portal) ── */}
      {userAnchor &&
        createPortal(
          <div
            className={styles.popover}
            style={{
              top: userAnchor.bottom + 6,
              left: clampLeft(userAnchor.left, users.length * 44 + 20),
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.userPickerRow}>
              {users.map((u) => {
                const isAssigned = assignedUserIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    className={`${styles.pickerUser} ${
                      isAssigned ? styles.pickerUserActive : ""
                    }`}
                    style={
                      isAssigned
                        ? { backgroundColor: u.color, borderColor: u.color }
                        : { borderColor: u.color }
                    }
                    onClick={(e) => handleUserToggle(e, u.id)}
                    title={u.initials}
                  >
                    {u.initials}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
