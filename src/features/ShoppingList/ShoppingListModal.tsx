import React, { useMemo } from "react";
import type { Ingredient, Meal, PlannedMeal, Unit } from "../../types";
import { useAppState } from "../../context/hooks";
import { Modal } from "../../components/Modal/Modal";
import styles from "./ShoppingList.module.css";

// --- Type Definitions for Aggregated List ---
interface AggregatedItem {
  ingredientId: string;
  name: string;
  category: string;
  totalQuantity: number;
  unit: Unit;
  // For the accordion breakdown
  details: {
    date: string;
    mealName: string;
    amount: number;
  }[];
}

type GroupedList = {
  category: string;
  items: AggregatedItem[];
}[];

// --- Aggregation Logic ---
const generateShoppingList = (
  plan: PlannedMeal[],
  meals: Meal[],
  allIngredients: Ingredient[],
  selectedDates: string[]
): GroupedList => {
  if (selectedDates.length === 0) {
    return [];
  }

  // 1. Filter plan by selected dates
  const filteredPlan = plan.filter((p) => selectedDates.includes(p.date));

  // 2. Aggregate ingredients
  const aggMap = new Map<string, AggregatedItem>();

  for (const plannedMeal of filteredPlan) {
    const mealDetails = meals.find((m) => m.id === plannedMeal.mealId);
    if (!mealDetails) continue;

    // Calculate proportional multiplier
    const multiplier = plannedMeal.assignedUsers.length / mealDetails.servings;

    for (const ingredient of mealDetails.ingredients) {
      const ingredientId = ingredient.ingredientId;
      const amountToAdd = ingredient.quantity * multiplier;

      // Get master ingredient details
      const masterIng = allIngredients.find((i) => i.id === ingredientId);
      if (!masterIng) continue;

      const detailEntry = {
        date: plannedMeal.date,
        mealName: mealDetails.name,
        amount: amountToAdd,
      };

      if (!aggMap.has(ingredientId)) {
        // Add new item to map
        aggMap.set(ingredientId, {
          ingredientId: ingredientId,
          name: masterIng.name,
          category: masterIng.category,
          unit: ingredient.unit,
          totalQuantity: amountToAdd,
          details: [detailEntry],
        });
      } else {
        // Update existing item in map
        const existing = aggMap.get(ingredientId)!;
        existing.totalQuantity += amountToAdd;
        existing.details.push(detailEntry);
        // Note: This assumes units are consistent.
        // A real app might need unit conversion!
      }
    }
  }

  // 3. Group by category
  const grouped = new Map<string, AggregatedItem[]>();
  for (const item of aggMap.values()) {
    if (!grouped.has(item.category)) {
      grouped.set(item.category, []);
    }
    grouped.get(item.category)!.push(item);
  }

  // 4. Convert to final array structure
  return Array.from(grouped.entries()).map(([category, items]) => ({
    category,
    items,
  }));
};

// --- The Component ---
interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { plan, meals, ingredients, selectedDates } = useAppState();

  // Recalculate list only when data changes
  const shoppingList = useMemo(
    () => generateShoppingList(plan, meals, ingredients, selectedDates),
    [plan, meals, ingredients, selectedDates]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Shopping List">
      <div className={styles.container}>
        {selectedDates.length === 0 && (
          <p className={styles.placeholder}>
            Select one or more days on the planner (use Shift+Click for
            multiple) to generate a shopping list.
          </p>
        )}
        {shoppingList.map((group) => (
          <div key={group.category} className={styles.categoryGroup}>
            <h3 className={styles.categoryTitle}>{group.category}</h3>
            <ul className={styles.itemList}>
              {group.items.map((item) => (
                <li key={item.ingredientId} className={styles.item}>
                  <details className={styles.accordion}>
                    <summary className={styles.itemSummary}>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemQuantity}>
                        {/* Format to 1 decimal place */}
                        {item.totalQuantity.toFixed(1)} {item.unit}
                      </span>
                    </summary>
                    <div className={styles.itemDetails}>
                      {item.details.map((d, index) => (
                        <div key={index} className={styles.detailRow}>
                          <span>
                            {d.date} ({d.mealName})
                          </span>
                          <span>
                            {d.amount.toFixed(1)} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
};
