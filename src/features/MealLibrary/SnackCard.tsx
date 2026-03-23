import React from "react";
import type { Ingredient, IngredientCategory } from "../../types";
import styles from "./SnackCard.module.css";

const CATEGORY_GRADIENTS: Record<IngredientCategory, string> = {
  "Produce":              "linear-gradient(135deg, #68d391 0%, #38a169 100%)",
  "Meat":                 "linear-gradient(135deg, #fc8181 0%, #c53030 100%)",
  "Dairy":                "linear-gradient(135deg, #63b3ed 0%, #2b6cb0 100%)",
  "Pantry":               "linear-gradient(135deg, #f6ad55 0%, #c05621 100%)",
  "Snacks":               "linear-gradient(135deg, #b794f4 0%, #6b46c1 100%)",
  "Household & Cleaning": "linear-gradient(135deg, #a0aec0 0%, #4a5568 100%)",
  "Frozen":               "linear-gradient(135deg, #76e4f7 0%, #2c7a7b 100%)",
  "Other":                "linear-gradient(135deg, #cbd5e0 0%, #718096 100%)",
};

interface SnackCardProps {
  ingredient: Ingredient;
  onEdit?: () => void;
  onBookmark?: () => void;
  isBookmarking?: boolean;
  isBookmarked?: boolean;
}

export const SnackCard: React.FC<SnackCardProps> = ({
  ingredient,
  onEdit,
  onBookmark,
  isBookmarking,
  isBookmarked,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", `snack:${ingredient.id}`);
    e.dataTransfer.effectAllowed = "copy";
  };

  const initial = ingredient.name.trim()[0]?.toUpperCase() ?? "?";
  const gradient = CATEGORY_GRADIENTS[ingredient.category] ?? CATEGORY_GRADIENTS["Other"];
  const isPending = ingredient.globalStatus === "pending";

  return (
    <div className={styles.card} draggable="true" onDragStart={handleDragStart}>
      {/* Image area */}
      <div className={styles.imageWrapper}>
        {ingredient.photoUrl ? (
          <img
            src={ingredient.photoUrl}
            alt={ingredient.name}
            className={styles.photo}
            draggable="false"
          />
        ) : (
          <div className={styles.placeholder} style={{ background: gradient }}>
            <span className={styles.placeholderInitial}>{initial}</span>
          </div>
        )}

        {/* Hover overlay: drag hint + action button */}
        <div className={styles.overlay}>
          <span className={styles.dragHint}>⠿ drag</span>
          {onEdit && (
            <button
              className={styles.actionBtn}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(); }}
              draggable="false"
              title="Edit snack"
            >
              Edit
            </button>
          )}
          {onBookmark && (
            <button
              className={`${styles.actionBtn} ${isBookmarked ? styles.actionBtnBookmarked : ""}`}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onBookmark(); }}
              draggable="false"
              disabled={isBookmarking || isBookmarked}
              title={isBookmarked ? "Already in My Snacks" : "Add to My Snacks"}
            >
              {isBookmarked ? "Saved" : isBookmarking ? "…" : "+ Mine"}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className={styles.info}>
        <span className={styles.name}>{ingredient.name}</span>
        <div className={styles.meta}>
          <span className={styles.category}>{ingredient.category}</span>
          {isPending && <span className={styles.pendingBadge}>Pending</span>}
        </div>
      </div>
    </div>
  );
};
