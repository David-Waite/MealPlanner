import React, { useMemo, useState } from "react"; // <-- Import useState
import type {
  Ingredient,
  Meal,
  PlannedMeal,
  Unit,
  IngredientCategory,
} from "../../types";
import { CATEGORY_ORDER } from "../../types";
import { useAppState } from "../../context/hooks";
import { Modal } from "../../components/Modal/Modal";
import { Button } from "../../components/Button/Button"; // <-- Import Button
import styles from "./ShoppingList.module.css";

// --- Date Formatting Helper ---
/**
 * Formats an ISO date string (YYYY-MM-DD) to "Mon 14"
 * @param isoDate The date string to format
 */
const formatDate = (isoDate: string): string => {
  // Add T00:00:00 to ensure date is parsed in local time, not UTC
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
  });
};

// --- Type Definitions for Aggregated List ---
interface AggregatedItemDetail {
  date: string;
  formattedDate: string;
  amount: number;
  mealName: string; // <-- ADDED THIS BACK
}
interface AggregatedItem {
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  perishable: boolean; // <-- NEW: Added this flag
  totalQuantity: number;
  unit: Unit;
  details: AggregatedItemDetail[];
}

type GroupedList = {
  category: IngredientCategory;
  items: AggregatedItem[];
}[];

// --- Aggregation Logic (FOR UI) ---
const generateShoppingList = (
  plan: PlannedMeal[],
  meals: Meal[],
  allIngredients: Ingredient[],
  selectedDates: string[]
): GroupedList => {
  if (selectedDates.length === 0) {
    return [];
  }

  const filteredPlan = plan.filter((p) => selectedDates.includes(p.date));
  const aggMap = new Map<string, AggregatedItem>();

  for (const plannedMeal of filteredPlan) {
    const mealDetails = meals.find((m) => m.id === plannedMeal.mealId);
    if (!mealDetails) continue;

    const multiplier = plannedMeal.assignedUsers.length / mealDetails.servings;

    for (const ingredient of mealDetails.ingredients) {
      const ingredientId = ingredient.ingredientId;
      const amountToAdd = ingredient.quantity * multiplier;

      const masterIng = allIngredients.find((i) => i.id === ingredientId);
      if (!masterIng) continue;

      // --- UPDATED: Detail entry now includes mealName ---
      const detailEntry: AggregatedItemDetail = {
        date: plannedMeal.date,
        formattedDate: formatDate(plannedMeal.date),
        amount: amountToAdd,
        mealName: mealDetails.name, // <-- ADDED THIS BACK
      };

      if (!aggMap.has(ingredientId)) {
        aggMap.set(ingredientId, {
          ingredientId: ingredientId,
          name: masterIng.name,
          category: masterIng.category,
          perishable: masterIng.perishable, // <-- NEW: Pass the flag
          unit: ingredient.unit,
          totalQuantity: amountToAdd,
          details: [detailEntry],
        });
      } else {
        const existing = aggMap.get(ingredientId)!;
        existing.totalQuantity += amountToAdd;

        // --- UPDATED LOGIC ---
        // Check if an entry for this exact day AND meal already exists
        const existingDetail = existing.details.find(
          (d) => d.date === plannedMeal.date && d.mealName === mealDetails.name // <-- UPDATED CHECK
        );

        if (existingDetail) {
          // It exists, just add to the amount
          existingDetail.amount += amountToAdd;
        } else {
          // It doesn't exist, add a new detail entry
          existing.details.push(detailEntry);
        }
        // --- END UPDATED LOGIC ---
      }
    }
  }

  // Group by category
  const grouped = new Map<IngredientCategory, AggregatedItem[]>();
  for (const item of aggMap.values()) {
    if (!grouped.has(item.category)) {
      grouped.set(item.category, []);
    }
    grouped.get(item.category)!.push(item);
  }

  // Convert to array and Sort by the defined CATEGORY_ORDER
  const sortedGroups = Array.from(grouped.entries());

  sortedGroups.sort(([catA], [catB]) => {
    const indexA = CATEGORY_ORDER.indexOf(catA);
    const indexB = CATEGORY_ORDER.indexOf(catB);
    const finalIndexA = indexA === -1 ? Infinity : indexA;
    const finalIndexB = indexB === -1 ? Infinity : indexB;
    return finalIndexA - finalIndexB;
  });

  // Map to final structure
  return sortedGroups.map(([category, items]) => ({
    category,
    items,
  }));
};

// --- UPDATED: Text Generation for Clipboard (now PLAIN TEXT) ---
// This function will now RE-AGGREGATE the data to match the export format
const generateNotesText = (list: GroupedList): string => {
  let text = "";

  for (const group of list) {
    for (const item of group.items) {
      // --- NEW: Check if item is perishable ---
      if (item.perishable) {
        // --- PERISHABLE: Use the original logic (breakdown by day) ---
        // 1. Create a temp map to aggregate by date ONLY
        const dayMap = new Map<
          string,
          { formattedDate: string; totalAmount: number }
        >();

        for (const detail of item.details) {
          if (!dayMap.has(detail.date)) {
            dayMap.set(detail.date, {
              formattedDate: detail.formattedDate,
              totalAmount: 0,
            });
          }
          dayMap.get(detail.date)!.totalAmount += detail.amount;
        }
        // --- End re-aggregate logic ---

        // 2. Loop over the new re-aggregated map
        for (const data of dayMap.values()) {
          // Format: amount unit item (date)
          const line = `${data.totalAmount.toFixed(1)} ${item.unit} ${
            item.name
          } (${data.formattedDate})\n`; // Add newline
          text += line;
        }
      } else {
        // --- NON-PERISHABLE: Use new logic (total sum) ---
        const line = `${item.totalQuantity.toFixed(1)} ${item.unit} ${
          item.name
        }\n`;
        text += line;
      }
      // --- END NEW LOGIC ---
    }
  }
  return text.trim();
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
  const [copied, setCopied] = useState(false); // <-- NEW state for copy feedback

  const shoppingList = useMemo(
    () => generateShoppingList(plan, meals, ingredients, selectedDates),
    [plan, meals, ingredients, selectedDates]
  );

  // --- Copy to Clipboard Handler (Unchanged) ---
  const handleCopyToClipboard = () => {
    const textToCopy = generateNotesText(shoppingList);
    if (!textToCopy) return;

    // Use document.execCommand for iFrame compatibility
    const textArea = document.createElement("textarea");
    textArea.value = textToCopy;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset feedback after 2s
      }
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }

    document.body.removeChild(textArea);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Shopping List">
      <div className={styles.contentWrapper}>
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
                {group.items.map((item) => {
                  const isSingleInstance = item.details.length === 1;
                  const title = isSingleInstance
                    ? item.name
                    : `${item.name} (x${item.details.length})`;
                  const dateDisplay = isSingleInstance
                    ? item.details[0].formattedDate
                    : "";

                  return (
                    <li key={item.ingredientId} className={styles.item}>
                      <details className={styles.accordion}>
                        <summary className={styles.itemSummary}>
                          <span className={styles.itemName}>{title}</span>
                          <span className={styles.itemDate}>{dateDisplay}</span>
                          <span className={styles.itemQuantity}>
                            {item.totalQuantity.toFixed(1)} {item.unit}
                          </span>
                        </summary>
                        <div className={styles.itemDetails}>
                          {item.details.map((d, index) => (
                            <div key={index} className={styles.detailRow}>
                              <label className={styles.checklistLabel}>
                                <input
                                  type="checkbox"
                                  className={styles.checkbox}
                                />
                                {/* --- UPDATED: Added meal name --- */}
                                <span>
                                  {d.formattedDate} ({d.mealName})
                                </span>
                              </label>
                              <span className={styles.detailAmount}>
                                {d.amount.toFixed(1)} {item.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {/* --- NEW: Footer with Copy Button --- */}
      <div className={styles.footer}>
        <Button
          variant="secondary"
          onClick={handleCopyToClipboard}
          disabled={shoppingList.length === 0}
        >
          {copied ? "Copied!" : "Copy to Notes"}
        </Button>
      </div>
    </Modal>
  );
};
