import React, { useState, useEffect } from "react";
import type {
  Meal,
  RecipeIngredient,
  UnitRef,
  CoreUnit,
  MetricUnit,
  CustomUnit,
} from "../../types";
import {
  METRIC_UNITS,
  IMPERIAL_UNITS,
  COOKING_UNITS,
} from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { Modal } from "../../components/Modal/Modal";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Form/Input";
import { Select } from "../../components/Form/Select";
import { FormGroup } from "../../components/Form/FormGroup";
import styles from "./MealFormModal.module.css";

interface MealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Meal | null;
}

type FormIngredient = Omit<RecipeIngredient, "ingredientId"> & {
  tempId: string;
  ingredientId: string | null;
};

// Sentinel value in the <select> that triggers the custom unit creator
const CREATE_CUSTOM_SENTINEL = "__create_custom__";

interface NewCustomUnitDraft {
  label: string;
  metricEquivalent: string;
  metricUnit: MetricUnit;
}

const defaultDraft = (): NewCustomUnitDraft => ({
  label: "",
  metricEquivalent: "",
  metricUnit: "g",
});

export const MealFormModal: React.FC<MealFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { ingredients: allIngredients, customUnits } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // --- Form State ---
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [photoUrl, setPhotoUrl] = useState("");
  const [tagsString, setTagsString] = useState("");
  const [formIngredients, setFormIngredients] = useState<FormIngredient[]>([]);

  // tempId of the row currently showing the custom unit creator, or null
  const [creatingForTempId, setCreatingForTempId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewCustomUnitDraft>(defaultDraft());

  // --- Effect to load initial data ---
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setServings(initialData.servings);
      setPhotoUrl(initialData.photoUrl);
      setFormIngredients(
        initialData.ingredients.map((ing) => ({ ...ing, tempId: crypto.randomUUID() }))
      );
      setTagsString(initialData.tags ? initialData.tags.join(", ") : "");
    } else {
      setName("");
      setServings(1);
      setPhotoUrl("");
      setTagsString("");
      setFormIngredients([]);
    }
    setCreatingForTempId(null);
    setDraft(defaultDraft());
  }, [initialData, isOpen]);

  // --- Ingredient Row Handlers ---
  const addIngredientRow = () => {
    setFormIngredients([
      ...formIngredients,
      {
        tempId: crypto.randomUUID(),
        ingredientId: null,
        quantity: 1,
        unit: { type: "core", unit: "unit" },
      },
    ]);
  };

  const updateIngredient = (tempId: string, field: string, value: unknown) => {
    setFormIngredients(
      formIngredients.map((ing) =>
        ing.tempId === tempId ? { ...ing, [field]: value } : ing
      )
    );
  };

  const removeIngredient = (tempId: string) => {
    setFormIngredients(formIngredients.filter((ing) => ing.tempId !== tempId));
    if (creatingForTempId === tempId) {
      setCreatingForTempId(null);
      setDraft(defaultDraft());
    }
  };

  // --- Unit dropdown change handler ---
  const handleUnitChange = (tempId: string, value: string) => {
    if (value === CREATE_CUSTOM_SENTINEL) {
      setCreatingForTempId(tempId);
      setDraft(defaultDraft());
      return;
    }

    // Check if it's a custom unit ID
    const isCustom = customUnits.some((cu) => cu.id === value);
    if (isCustom) {
      updateIngredient(tempId, "unit", { type: "custom", customUnitId: value } satisfies UnitRef);
    } else {
      updateIngredient(tempId, "unit", { type: "core", unit: value as CoreUnit } satisfies UnitRef);
    }

    if (creatingForTempId === tempId) {
      setCreatingForTempId(null);
      setDraft(defaultDraft());
    }
  };

  // --- Custom unit creator: confirm ---
  const handleAddCustomUnit = (forTempId: string) => {
    const row = formIngredients.find((i) => i.tempId === forTempId);
    if (!row || !row.ingredientId || !draft.label.trim()) return;

    const newUnit: CustomUnit = {
      id: crypto.randomUUID(),
      label: draft.label.trim(),
      ingredientId: row.ingredientId,
      ...(draft.metricEquivalent && {
        metricEquivalent: Number(draft.metricEquivalent),
        metricUnit: draft.metricUnit,
      }),
    };

    dispatch({ type: "ADD_CUSTOM_UNIT", payload: newUnit });
    updateIngredient(forTempId, "unit", { type: "custom", customUnitId: newUnit.id } satisfies UnitRef);
    setCreatingForTempId(null);
    setDraft(defaultDraft());
  };

  // --- Helper: get the current select value for a row ---
  const getUnitSelectValue = (unit: UnitRef): string => {
    if (unit.type === "core") return unit.unit;
    return unit.customUnitId;
  };

  // --- Form Submit ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalIngredients: RecipeIngredient[] = [];
    for (const ing of formIngredients) {
      if (!ing.ingredientId || ing.quantity <= 0) {
        alert("Please fill out all ingredient fields and quantities.");
        return;
      }
      finalIngredients.push({
        ingredientId: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      });
    }

    const mealPayload: Meal = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      name,
      servings,
      photoUrl,
      ingredients: finalIngredients,
      tags: tagsString.split(",").map((t) => t.trim()).filter((t) => t !== ""),
    };

    if (initialData) {
      dispatch({ type: "UPDATE_MEAL", payload: mealPayload });
    } else {
      dispatch({ type: "ADD_MEAL", payload: mealPayload });
    }

    onClose();
  };

  if (!user) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Sign in required">
        <p style={{ marginBottom: "var(--spacing-4)", color: "var(--color-text-secondary)" }}>
          You need to be signed in to create or edit recipes.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Meal" : "Create New Meal"}
    >
      <form onSubmit={handleSubmit}>
        <FormGroup label="Meal Name" htmlFor="mealName">
          <Input
            id="mealName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormGroup>

        <div className={styles.row}>
          <FormGroup label="Servings" htmlFor="servings">
            <Input
              id="servings"
              type="number"
              min="1"
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              required
            />
          </FormGroup>
          <FormGroup label="Photo URL" htmlFor="photoUrl">
            <Input
              id="photoUrl"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="e.g., /media/my-photo.png"
            />
          </FormGroup>
        </div>

        <FormGroup label="Tags (comma separated)" htmlFor="tags">
          <Input
            id="tags"
            value={tagsString}
            onChange={(e) => setTagsString(e.target.value)}
            placeholder="e.g., spicy, chicken, dinner"
          />
        </FormGroup>

        <h3 className={styles.subtitle}>Ingredients</h3>
        <div className={styles.ingredientList}>
          {formIngredients.map((ing) => {
            const ingredientCustomUnits = ing.ingredientId
              ? customUnits.filter((cu) => cu.ingredientId === ing.ingredientId)
              : [];
            const isCreating = creatingForTempId === ing.tempId;

            return (
              <div key={ing.tempId}>
                <div className={styles.ingredientRow}>
                  {/* Ingredient selector */}
                  <Select
                    value={ing.ingredientId || ""}
                    onChange={(e) => {
                      updateIngredient(ing.tempId, "ingredientId", e.target.value);
                      // Reset unit to core "unit" when ingredient changes
                      updateIngredient(ing.tempId, "unit", { type: "core", unit: "unit" } satisfies UnitRef);
                      if (isCreating) {
                        setCreatingForTempId(null);
                        setDraft(defaultDraft());
                      }
                    }}
                  >
                    <option value="" disabled>Select ingredient...</option>
                    {allIngredients.map((masterIng) => (
                      <option key={masterIng.id} value={masterIng.id}>
                        {masterIng.name}
                      </option>
                    ))}
                  </Select>

                  {/* Quantity */}
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ing.quantity}
                    onChange={(e) =>
                      updateIngredient(ing.tempId, "quantity", Number(e.target.value))
                    }
                    className={styles.quantityInput}
                  />

                  {/* Unit selector */}
                  <Select
                    value={getUnitSelectValue(ing.unit)}
                    onChange={(e) => handleUnitChange(ing.tempId, e.target.value)}
                    className={styles.unitSelect}
                  >
                    <optgroup label="Metric">
                      {METRIC_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </optgroup>
                    <optgroup label="Imperial">
                      {IMPERIAL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </optgroup>
                    <optgroup label="Cooking">
                      {COOKING_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </optgroup>
                    {ingredientCustomUnits.length > 0 && (
                      <optgroup label="Custom">
                        {ingredientCustomUnits.map((cu) => (
                          <option key={cu.id} value={cu.id}>{cu.label}</option>
                        ))}
                      </optgroup>
                    )}
                    {ing.ingredientId && (
                      <optgroup label="">
                        <option value={CREATE_CUSTOM_SENTINEL}>+ Create custom unit…</option>
                      </optgroup>
                    )}
                  </Select>

                  <Button variant="danger" onClick={() => removeIngredient(ing.tempId)}>
                    &times;
                  </Button>
                </div>

                {/* Inline custom unit creator */}
                {isCreating && (
                  <div className={styles.customUnitCreator}>
                    <span className={styles.customUnitLabel}>New unit for this ingredient:</span>
                    <Input
                      placeholder="Label (e.g. clove)"
                      value={draft.label}
                      onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                      className={styles.customUnitLabelInput}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Metric qty (optional)"
                      value={draft.metricEquivalent}
                      onChange={(e) => setDraft({ ...draft, metricEquivalent: e.target.value })}
                      className={styles.customUnitEquivInput}
                    />
                    <Select
                      value={draft.metricUnit}
                      onChange={(e) => setDraft({ ...draft, metricUnit: e.target.value as MetricUnit })}
                      className={styles.customUnitMetricSelect}
                    >
                      {METRIC_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </Select>
                    <Button
                      variant="primary"
                      onClick={() => handleAddCustomUnit(ing.tempId)}
                      disabled={!draft.label.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => { setCreatingForTempId(null); setDraft(defaultDraft()); }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button
          variant="secondary"
          onClick={addIngredientRow}
          className={styles.addIngredientBtn}
        >
          + Add Ingredient
        </Button>

        <footer className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {initialData ? "Save Changes" : "Create Meal"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
};
