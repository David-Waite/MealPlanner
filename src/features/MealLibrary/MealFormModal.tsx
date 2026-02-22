import React, { useState, useEffect } from "react";
import type { Meal, RecipeIngredient, Unit } from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { Modal } from "../../components/Modal/Modal";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Form/Input";
import { Select } from "../../components/Form/Select";
import { FormGroup } from "../../components/Form/FormGroup";
import styles from "./MealFormModal.module.css";

interface MealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Meal | null; // null for 'New', Meal object for 'Edit'
}

// This is the local state for a single ingredient in the form
type FormIngredient = Omit<RecipeIngredient, "ingredientId"> & {
  // Use 'ingredientId' or a temp ID for the key
  tempId: string;
  ingredientId: string | null;
};

export const MealFormModal: React.FC<MealFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { ingredients: allIngredients } = useAppState();
  const dispatch = useAppDispatch();

  // --- Form State ---
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [photoUrl, setPhotoUrl] = useState("");
  const [tagsString, setTagsString] = useState("");
  const [formIngredients, setFormIngredients] = useState<FormIngredient[]>([]);

  // --- Effect to load initial data when editing ---
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setServings(initialData.servings);
      setPhotoUrl(initialData.photoUrl);
      // Convert RecipeIngredient[] to FormIngredient[]
      setFormIngredients(
        initialData.ingredients.map((ing) => ({
          ...ing,
          tempId: crypto.randomUUID(),
        }))
      );
      setTagsString(initialData.tags ? initialData.tags.join(", ") : "");
    } else {
      // Reset form when opening for 'New Meal'
      setName("");
      setServings(1);
      setPhotoUrl("");
      setTagsString("");
      setFormIngredients([]);
    }
  }, [initialData, isOpen]); // Re-run when modal is opened

  // --- Ingredient Row Handlers ---
  const addIngredientRow = () => {
    setFormIngredients([
      ...formIngredients,
      {
        tempId: crypto.randomUUID(),
        ingredientId: null,
        quantity: 1,
        unit: "unit",
      },
    ]);
  };

  const updateIngredient = (tempId: string, field: string, value: any) => {
    setFormIngredients(
      formIngredients.map((ing) =>
        ing.tempId === tempId ? { ...ing, [field]: value } : ing
      )
    );
  };

  const removeIngredient = (tempId: string) => {
    setFormIngredients(formIngredients.filter((ing) => ing.tempId !== tempId));
  };

  // --- Form Submit ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate and build RecipeIngredient[]
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

    // Build the final Meal object
    const mealPayload: Meal = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      name,
      servings,
      photoUrl,
      ingredients: finalIngredients,
      tags: tagsString
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== ""),
    };

    // Dispatch the correct action
    if (initialData) {
      dispatch({ type: "UPDATE_MEAL", payload: mealPayload });
    } else {
      dispatch({ type: "ADD_MEAL", payload: mealPayload });
    }

    onClose(); // Close the modal
  };

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
          {formIngredients.map((ing) => (
            <div key={ing.tempId} className={styles.ingredientRow}>
              <Select
                value={ing.ingredientId || ""}
                onChange={(e) =>
                  updateIngredient(ing.tempId, "ingredientId", e.target.value)
                }
              >
                <option value="" disabled>
                  Select ingredient...
                </option>
                {allIngredients.map((masterIng) => (
                  <option key={masterIng.id} value={masterIng.id}>
                    {masterIng.name}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={ing.quantity}
                onChange={(e) =>
                  updateIngredient(
                    ing.tempId,
                    "quantity",
                    Number(e.target.value)
                  )
                }
                className={styles.quantityInput}
              />
              <Select
                value={ing.unit}
                onChange={(e) =>
                  updateIngredient(ing.tempId, "unit", e.target.value as Unit)
                }
                className={styles.unitSelect}
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="unit">unit</option>
              </Select>
              <Button
                variant="danger"
                onClick={() => removeIngredient(ing.tempId)}
              >
                &times;
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="secondary"
          onClick={addIngredientRow}
          className={styles.addIngredientBtn}
        >
          + Add Ingredient
        </Button>

        <footer className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialData ? "Save Changes" : "Create Meal"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
};
