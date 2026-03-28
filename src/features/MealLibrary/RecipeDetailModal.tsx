import React from "react";
import { createPortal } from "react-dom";
import type { Meal, RecipeIngredient } from "../../types";
import { useAppState } from "../../context/hooks";
import styles from "./RecipeDetailModal.module.css";

interface RecipeDetailModalProps {
  meal: Meal | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  meal,
  isOpen,
  onClose,
  onEdit,
  canEdit = false,
}) => {
  const { ingredients, customUnits } = useAppState();

  if (!isOpen || !meal) return null;

  const formatUnit = (ing: RecipeIngredient): string => {
    if (ing.unit.type === "core") return ing.unit.unit;
    const cu = customUnits.find((u) => u.id === ing.unit.customUnitId);
    return cu ? cu.label : "unit";
  };

  const getIngredientName = (id: string): string => {
    const found = ingredients.find((i) => i.id === id);
    return found ? found.name : id;
  };

  const formatQuantity = (qty: number): string => {
    const fractions: Record<number, string> = {
      0.25: "¼", 0.5: "½", 0.75: "¾",
      0.333: "⅓", 0.667: "⅔",
    };
    const rounded = Math.round(qty * 1000) / 1000;
    if (fractions[rounded]) return fractions[rounded];
    const whole = Math.floor(qty);
    const remainder = Math.round((qty - whole) * 1000) / 1000;
    if (whole > 0 && fractions[remainder]) return `${whole} ${fractions[remainder]}`;
    if (qty === Math.floor(qty)) return String(qty);
    return qty.toFixed(1).replace(/\.0$/, "");
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {meal.photoUrl && (
          <div className={styles.hero}>
            <img src={meal.photoUrl} alt={meal.name} className={styles.heroImg} />
          </div>
        )}

        <div className={styles.header} style={!meal.photoUrl ? { paddingTop: 24 } : undefined}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>{meal.name}</h2>
            {meal.ownerDisplayName && (
              <span className={styles.attribution}>by {meal.ownerDisplayName}</span>
            )}
            {meal.description && (
              <p className={styles.description}>{meal.description}</p>
            )}
            <div className={styles.meta}>
              <span className={styles.metaPill}>{meal.servings} serving{meal.servings !== 1 ? "s" : ""}</span>
              {meal.tags?.map((tag) => (
                <span key={tag} className={styles.metaTag}>{tag}</span>
              ))}
            </div>
          </div>
          <div className={styles.headerActions}>
            {canEdit && onEdit && (
              <button className={styles.editBtn} onClick={() => { onClose(); onEdit(); }}>
                Edit
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        <div className={styles.body}>
          {meal.ingredients && meal.ingredients.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Ingredients</h3>
              <ul className={styles.ingredientList}>
                {meal.ingredients.map((ing, idx) => (
                  <li key={idx} className={styles.ingredientItem}>
                    <span className={styles.ingredientQty}>
                      {formatQuantity(ing.quantity)} {formatUnit(ing)}
                    </span>
                    <span className={styles.ingredientName}>{getIngredientName(ing.ingredientId)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {meal.instructions && meal.instructions.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Instructions</h3>
              <ol className={styles.instructionList}>
                {meal.instructions.map((step, idx) => (
                  <li key={idx} className={styles.instructionItem}>
                    <span className={styles.stepNumber}>{idx + 1}</span>
                    <span className={styles.stepText}>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {(!meal.ingredients || meal.ingredients.length === 0) &&
           (!meal.instructions || meal.instructions.length === 0) && (
            <p className={styles.emptyBody}>No details added yet.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
