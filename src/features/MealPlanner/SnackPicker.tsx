import React, { useState, useMemo, useRef, useEffect } from "react";
import type { Ingredient, UnitRef, CustomUnit } from "../../types";
import { COOKING_UNITS, METRIC_UNITS, IMPERIAL_UNITS } from "../../types";
import styles from "./SnackPicker.module.css";

interface SnackPickerProps {
  ingredients: Ingredient[];
  customUnits: CustomUnit[];
  selectedUserIds: string[];
  onAdd: (ingredientId: string, quantity: number, unit: UnitRef) => void;
  onClose: () => void;
}

const ALL_CORE_UNITS = [...COOKING_UNITS, ...METRIC_UNITS, ...IMPERIAL_UNITS];

export const SnackPicker: React.FC<SnackPickerProps> = ({
  ingredients,
  customUnits,
  onAdd,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<UnitRef>({ type: "core", unit: "unit" });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ingredients.slice(0, 20);
    return ingredients.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 20);
  }, [ingredients, search]);

  // When ingredient is selected, reset unit to its first custom unit or "unit"
  const handleSelect = (ing: Ingredient) => {
    setSelected(ing);
    setQuantity("1");
    const ingCustomUnits = customUnits.filter((cu) => cu.ingredientId === ing.id);
    if (ingCustomUnits.length > 0) {
      setUnit({ type: "custom", customUnitId: ingCustomUnits[0].id });
    } else {
      setUnit({ type: "core", unit: "unit" });
    }
  };

  const handleConfirm = () => {
    if (!selected) return;
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return;
    onAdd(selected.id, qty, unit);
  };

  const ingCustomUnits = selected
    ? customUnits.filter((cu) => cu.ingredientId === selected.id)
    : [];

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Add Snack</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        {!selected ? (
          /* ── Step 1: search & pick ingredient ── */
          <>
            <input
              ref={inputRef}
              className={styles.searchInput}
              placeholder="Search ingredients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ul className={styles.list}>
              {filtered.length === 0 && (
                <li className={styles.emptyMsg}>No ingredients found</li>
              )}
              {filtered.map((ing) => (
                <li
                  key={ing.id}
                  className={styles.listItem}
                  onClick={() => handleSelect(ing)}
                >
                  <span className={styles.ingName}>{ing.name}</span>
                  <span className={styles.ingCategory}>{ing.category}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          /* ── Step 2: set quantity + unit ── */
          <div className={styles.quantityStep}>
            <button className={styles.backBtn} onClick={() => setSelected(null)}>
              ← Back
            </button>
            <div className={styles.selectedName}>{selected.name}</div>

            <div className={styles.qtyRow}>
              <input
                className={styles.qtyInput}
                type="number"
                min="0.1"
                step="0.5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
              <select
                className={styles.unitSelect}
                value={unit.type === "core" ? `core:${unit.unit}` : `custom:${unit.customUnitId}`}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith("core:")) {
                    setUnit({ type: "core", unit: val.slice(5) as import("../../types").CoreUnit });
                  } else {
                    setUnit({ type: "custom", customUnitId: val.slice(7) });
                  }
                }}
              >
                {ingCustomUnits.length > 0 && (
                  <optgroup label="Custom">
                    {ingCustomUnits.map((cu) => (
                      <option key={cu.id} value={`custom:${cu.id}`}>
                        {cu.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Standard">
                  {ALL_CORE_UNITS.map((u) => (
                    <option key={u} value={`core:${u}`}>{u}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button
              className={styles.addBtn}
              onClick={handleConfirm}
              disabled={!quantity || parseFloat(quantity) <= 0}
            >
              Add to plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
