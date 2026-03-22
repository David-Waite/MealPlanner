import React, { useMemo, useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import type {
  Ingredient,
  Meal,
  PlannedMeal,
  UnitRef,
  MetricUnit,
  ImperialUnit,
  IngredientCategory,
  CustomUnit,
  ShoppingListSettings,
} from "../../types";
import { CATEGORY_ORDER } from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import {
  syncShoppingList,
  toggleShoppingListItem,
} from "../../lib/cloudSync";
import type { FirestoreShoppingListItem } from "../../lib/firestoreTypes";
import { Modal } from "../../components/Modal/Modal";
import { Button } from "../../components/Button/Button";
import styles from "./ShoppingList.module.css";

// --- Conversion maps ---

const METRIC_TO_IMPERIAL: Partial<Record<MetricUnit, { factor: number; unit: ImperialUnit }>> = {
  g:  { factor: 0.035274, unit: "oz" },
  kg: { factor: 2.20462,  unit: "lb" },
  ml: { factor: 0.033814, unit: "fl oz" },
  l:  { factor: 2.11338,  unit: "pint" },
};

const IMPERIAL_TO_METRIC: Partial<Record<ImperialUnit, { factor: number; unit: MetricUnit }>> = {
  oz:       { factor: 28.3495,  unit: "g" },
  lb:       { factor: 453.592,  unit: "g" },
  "fl oz":  { factor: 29.5735,  unit: "ml" },
  pint:     { factor: 473.176,  unit: "ml" },
};

// --- Unit resolution ---

interface ResolvedUnit {
  displayQuantity: number;
  displayUnit: string;
}

function resolveUnit(
  unitRef: UnitRef,
  quantity: number,
  customUnits: CustomUnit[],
  settings: ShoppingListSettings
): ResolvedUnit {
  if (unitRef.type === "core") {
    const unit = unitRef.unit;

    if (settings.unitSystem === "imperial") {
      const conv = METRIC_TO_IMPERIAL[unit as MetricUnit];
      if (conv) return { displayQuantity: quantity * conv.factor, displayUnit: conv.unit };
    } else {
      const conv = IMPERIAL_TO_METRIC[unit as ImperialUnit];
      if (conv) return { displayQuantity: quantity * conv.factor, displayUnit: conv.unit };
    }

    return { displayQuantity: quantity, displayUnit: unit };
  }

  const cu = customUnits.find((c) => c.id === unitRef.customUnitId);
  if (!cu) return { displayQuantity: quantity, displayUnit: "?" };

  if (!settings.showCustomLabels && cu.metricEquivalent && cu.metricUnit) {
    const rawQuantity = quantity * cu.metricEquivalent;
    const tempRef: UnitRef = { type: "core", unit: cu.metricUnit };
    return resolveUnit(tempRef, rawQuantity, customUnits, settings);
  }

  return { displayQuantity: quantity, displayUnit: cu.label };
}

// --- Date helper ---

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
};

// --- Aggregation types ---

interface AggregatedItemDetail {
  date: string;
  formattedDate: string;
  amount: number;
  mealName: string;
  unitRef: UnitRef;
}

interface AggregatedItem {
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  perishable: boolean;
  totalQuantity: number;
  unitRef: UnitRef;
  details: AggregatedItemDetail[];
}

type GroupedList = { category: IngredientCategory; items: AggregatedItem[] }[];

// --- Aggregation logic ---

const generateShoppingList = (
  plan: PlannedMeal[],
  meals: Meal[],
  allIngredients: Ingredient[],
  selectedDates: string[]
): GroupedList => {
  if (selectedDates.length === 0) return [];

  const filteredPlan = plan.filter((p) => selectedDates.includes(p.date));
  const aggMap = new Map<string, AggregatedItem>();

  for (const plannedMeal of filteredPlan) {
    const mealDetails = meals.find((m) => m.id === plannedMeal.mealId);
    if (!mealDetails) continue;

    const multiplier = plannedMeal.assignedUsers.length / mealDetails.servings;

    for (const ingredient of mealDetails.ingredients) {
      const { ingredientId, unit: unitRef } = ingredient;
      const amountToAdd = ingredient.quantity * multiplier;
      const masterIng = allIngredients.find((i) => i.id === ingredientId);
      if (!masterIng) continue;

      const detailEntry: AggregatedItemDetail = {
        date: plannedMeal.date,
        formattedDate: formatDate(plannedMeal.date),
        amount: amountToAdd,
        mealName: mealDetails.name,
        unitRef,
      };

      if (!aggMap.has(ingredientId)) {
        aggMap.set(ingredientId, {
          ingredientId,
          name: masterIng.name,
          category: masterIng.category,
          perishable: masterIng.perishable,
          unitRef,
          totalQuantity: amountToAdd,
          details: [detailEntry],
        });
      } else {
        const existing = aggMap.get(ingredientId)!;
        existing.totalQuantity += amountToAdd;

        const existingDetail = existing.details.find(
          (d) => d.date === plannedMeal.date && d.mealName === mealDetails.name
        );
        if (existingDetail) {
          existingDetail.amount += amountToAdd;
        } else {
          existing.details.push(detailEntry);
        }
      }
    }
  }

  const grouped = new Map<IngredientCategory, AggregatedItem[]>();
  for (const item of aggMap.values()) {
    if (!grouped.has(item.category)) grouped.set(item.category, []);
    grouped.get(item.category)!.push(item);
  }

  const sortedGroups = Array.from(grouped.entries()).sort(([catA], [catB]) => {
    const iA = CATEGORY_ORDER.indexOf(catA);
    const iB = CATEGORY_ORDER.indexOf(catB);
    return (iA === -1 ? Infinity : iA) - (iB === -1 ? Infinity : iB);
  });

  return sortedGroups.map(([category, items]) => ({ category, items }));
};

// --- Text export ---

const generateNotesText = (
  list: GroupedList,
  customUnits: CustomUnit[],
  settings: ShoppingListSettings
): string => {
  let text = "";

  for (const group of list) {
    for (const item of group.items) {
      if (item.perishable) {
        const dayMap = new Map<string, { formattedDate: string; totalAmount: number; unitRef: UnitRef }>();
        for (const detail of item.details) {
          if (!dayMap.has(detail.date)) {
            dayMap.set(detail.date, { formattedDate: detail.formattedDate, totalAmount: 0, unitRef: detail.unitRef });
          }
          dayMap.get(detail.date)!.totalAmount += detail.amount;
        }
        for (const data of dayMap.values()) {
          const { displayQuantity, displayUnit } = resolveUnit(data.unitRef, data.totalAmount, customUnits, settings);
          text += `${formatQuantity(displayQuantity)} ${displayUnit} ${item.name} (${data.formattedDate})\n`;
        }
      } else {
        const { displayQuantity, displayUnit } = resolveUnit(item.unitRef, item.totalQuantity, customUnits, settings);
        text += `${formatQuantity(displayQuantity)} ${displayUnit} ${item.name}\n`;
      }
    }
  }
  return text.trim();
};

const formatQuantity = (n: number): string => {
  return parseFloat(n.toFixed(2)).toString();
};

// --- Component ---

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SyncStatus = "idle" | "syncing" | "synced" | "error";

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({ isOpen, onClose }) => {
  const { plan, meals, ingredients, customUnits, selectedDates, shoppingListSettings } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [copied, setCopied] = useState(false);

  // --- Sync state ---
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [activeListId, setActiveListId] = useState<string | null>(null);
  // Live items from Firestore — used for checked state and for writing updates
  const [syncedItems, setSyncedItems] = useState<FirestoreShoppingListItem[]>([]);

  const shoppingList = useMemo(
    () => generateShoppingList(plan, meals, ingredients, selectedDates),
    [plan, meals, ingredients, selectedDates]
  );

  // Reset sync when selected dates change (list is now stale)
  useEffect(() => {
    setActiveListId(null);
    setSyncStatus("idle");
    setSyncedItems([]);
  }, [selectedDates]);

  // Subscribe to Firestore when an active list is synced
  useEffect(() => {
    if (!activeListId) return;

    const listRef = doc(db, "users", user!.uid, "shoppingLists", activeListId);
    const unsubscribe = onSnapshot(listRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setSyncedItems(data.items ?? []);
    });

    return unsubscribe;
  }, [activeListId]);

  const updateSettings = (patch: Partial<ShoppingListSettings>) => {
    dispatch({ type: "SET_SHOPPING_LIST_SETTINGS", payload: patch });
  };

  // --- Sync handler ---
  const handleSync = async () => {
    if (!user) return;
    setSyncStatus("syncing");

    const items: FirestoreShoppingListItem[] = shoppingList.flatMap((group) =>
      group.items.map((item) => {
        const sortedDetails = [...item.details].sort((a, b) =>
          a.date.localeCompare(b.date)
        );
        const lastDetail = sortedDetails[sortedDetails.length - 1];
        return {
          id: item.ingredientId,
          ingredientName: item.name,
          category: item.category,
          totalQuantity: item.totalQuantity,
          unitRef: item.unitRef,
          checked: false,
          lastDate: lastDetail.date,
          lastFormattedDate: lastDetail.formattedDate,
          details: sortedDetails.map((d) => ({
            mealName: d.mealName,
            date: d.date,
            formattedDate: d.formattedDate,
            quantity: d.amount,
            unitRef: d.unitRef,
          })),
        };
      })
    );

    const listName =
      selectedDates.length === 1
        ? `Shopping — ${formatDate(selectedDates[0])}`
        : `Shopping — ${formatDate(selectedDates[0])} to ${formatDate(selectedDates[selectedDates.length - 1])}`;

    try {
      const listId = await syncShoppingList(
        user.uid,
        listName,
        items,
        shoppingListSettings
      );
      setActiveListId(listId);
      setSyncStatus("synced");
    } catch (err) {
      console.error("[ShoppingList] Sync failed:", err);
      setSyncStatus("error");
    }
  };

  // --- Item check/uncheck (synced mode) ---
  const handleToggleItem = async (ingredientId: string) => {
    if (!activeListId) return;
    const current = syncedItems.find((i) => i.id === ingredientId);
    const newChecked = !(current?.checked ?? false);

    // Optimistic update
    setSyncedItems((prev) =>
      prev.map((item) =>
        item.id === ingredientId ? { ...item, checked: newChecked } : item
      )
    );

    try {
      await toggleShoppingListItem(user!.uid, activeListId, syncedItems, ingredientId, newChecked);
    } catch (err) {
      console.error("[ShoppingList] Toggle failed:", err);
      // Revert optimistic update on failure
      setSyncedItems((prev) =>
        prev.map((item) =>
          item.id === ingredientId ? { ...item, checked: !newChecked } : item
        )
      );
    }
  };

  // --- Copy to clipboard ---
  const handleCopyToClipboard = () => {
    const textToCopy = generateNotesText(shoppingList, customUnits, shoppingListSettings);
    if (!textToCopy) return;

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
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }

    document.body.removeChild(textArea);
  };

  const isSynced = syncStatus === "synced" && activeListId !== null;
  const checkedMap = new Map(syncedItems.map((i) => [i.id, i.checked]));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Shopping List">
      <div className={styles.contentWrapper}>

        {/* Options panel */}
        <div className={styles.optionsPanel}>
          <div className={styles.optionGroup}>
            <span className={styles.optionGroupLabel}>Units</span>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="unitSystem"
                value="metric"
                checked={shoppingListSettings.unitSystem === "metric"}
                onChange={() => updateSettings({ unitSystem: "metric" })}
              />
              Metric
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="unitSystem"
                value="imperial"
                checked={shoppingListSettings.unitSystem === "imperial"}
                onChange={() => updateSettings({ unitSystem: "imperial" })}
              />
              Imperial
            </label>
          </div>
          <div className={styles.optionGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={shoppingListSettings.showCustomLabels}
                onChange={(e) => updateSettings({ showCustomLabels: e.target.checked })}
              />
              Show custom unit labels
            </label>
          </div>
          {isSynced && (
            <div className={styles.syncBadge}>
              Live sync active
            </div>
          )}
        </div>

        <div className={styles.container}>
          {selectedDates.length === 0 && (
            <p className={styles.placeholder}>
              Select one or more days on the planner (use Shift+Click for multiple) to generate a shopping list.
            </p>
          )}
          {shoppingList.map((group) => (
            <div key={group.category} className={styles.categoryGroup}>
              <h3 className={styles.categoryTitle}>{group.category}</h3>
              <ul className={styles.itemList}>
                {group.items.map((item) => {
                  const { displayQuantity, displayUnit } = resolveUnit(
                    item.unitRef, item.totalQuantity, customUnits, shoppingListSettings
                  );
                  const isSingleInstance = item.details.length === 1;
                  const title = isSingleInstance ? item.name : `${item.name} (x${item.details.length})`;
                  const dateDisplay = isSingleInstance ? item.details[0].formattedDate : "";
                  const isChecked = isSynced && (checkedMap.get(item.ingredientId) ?? false);

                  return (
                    <li
                      key={item.ingredientId}
                      className={`${styles.item} ${isChecked ? styles.itemChecked : ""}`}
                    >
                      <details className={styles.accordion}>
                        <summary className={styles.itemSummary}>
                          <span className={styles.itemName}>
                            {isSynced && (
                              <input
                                type="checkbox"
                                className={styles.syncCheckbox}
                                checked={isChecked}
                                onChange={() => handleToggleItem(item.ingredientId)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            {title}
                          </span>
                          <span className={styles.itemDate}>{dateDisplay}</span>
                          <span className={styles.itemQuantity}>
                            {formatQuantity(displayQuantity)} {displayUnit}
                          </span>
                        </summary>
                        <div className={styles.itemDetails}>
                          {item.details.map((d, index) => {
                            const detail = resolveUnit(d.unitRef, d.amount, customUnits, shoppingListSettings);
                            return (
                              <div key={index} className={styles.detailRow}>
                                <span className={styles.checklistLabel}>
                                  <span>{d.formattedDate} ({d.mealName})</span>
                                </span>
                                <span className={styles.detailAmount}>
                                  {formatQuantity(detail.displayQuantity)} {detail.displayUnit}
                                </span>
                              </div>
                            );
                          })}
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

      <div className={styles.footer}>
        {user && (
          <Button
            variant="primary"
            onClick={handleSync}
            disabled={shoppingList.length === 0 || syncStatus === "syncing"}
          >
            {syncStatus === "syncing"
              ? "Syncing…"
              : syncStatus === "synced"
              ? "Re-sync"
              : syncStatus === "error"
              ? "Sync failed — retry"
              : "Sync to App"}
          </Button>
        )}
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
