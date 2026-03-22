import React, { useState, useRef, useEffect } from "react";
import type { Ingredient, IngredientCategory } from "../../types";
import { CATEGORY_ORDER } from "../../types";
import { Input } from "../../components/Form/Input";
import { Select } from "../../components/Form/Select";
import { Button } from "../../components/Button/Button";
import styles from "./MealFormModal.module.css";

interface IngredientComboboxProps {
  value: string | null;
  onChange: (ingredientId: string) => void;
  ingredients: Ingredient[];
  onNewIngredient: (ingredient: Ingredient) => void;
}

export const IngredientCombobox: React.FC<IngredientComboboxProps> = ({
  value,
  onChange,
  ingredients,
  onNewIngredient,
}) => {
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<IngredientCategory>("Produce");
  const [newPerishable, setNewPerishable] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep search text in sync with the selected ingredient name
  useEffect(() => {
    if (value) {
      const ing = ingredients.find((i) => i.id === value);
      setSearchText(ing?.name ?? "");
    } else {
      setSearchText("");
    }
  }, [value, ingredients]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        // Restore input to the selected ingredient name
        if (value) {
          const ing = ingredients.find((i) => i.id === value);
          setSearchText(ing?.name ?? "");
        } else {
          setSearchText("");
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, value, ingredients]);

  const filtered = ingredients
    .filter((i) => i.name.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const exactMatch = ingredients.some(
    (i) => i.name.toLowerCase() === searchText.trim().toLowerCase()
  );

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setIsCreating(false);
  };

  const handleOpenCreate = () => {
    setNewName(searchText.trim());
    setNewCategory("Produce");
    setNewPerishable(false);
    setIsCreating(true);
  };

  const handleConfirmCreate = () => {
    if (!newName.trim()) return;
    const newIng: Ingredient = {
      id: `ing_custom_${crypto.randomUUID()}`,
      name: newName.trim(),
      category: newCategory,
      perishable: newPerishable,
    };
    onNewIngredient(newIng);
    onChange(newIng.id);
    setIsOpen(false);
    setIsCreating(false);
  };

  return (
    <div ref={containerRef} className={styles.ingredientCombobox}>
      <Input
        value={searchText}
        onChange={(e) => {
          setSearchText(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search ingredients…"
      />

      {isOpen && (
        <div className={styles.comboboxDropdown}>
          {!isCreating ? (
            <>
              <div className={styles.comboboxList}>
                {filtered.length === 0 && (
                  <div className={styles.comboboxEmpty}>
                    No results for "{searchText}"
                  </div>
                )}
                {filtered.map((ing) => (
                  <button
                    key={ing.id}
                    type="button"
                    className={`${styles.comboboxOption} ${
                      ing.id === value ? styles.comboboxOptionSelected : ""
                    }`}
                    onMouseDown={() => handleSelect(ing.id)}
                  >
                    <span>{ing.name}</span>
                    <span className={styles.comboboxOptionCategory}>
                      {ing.category}
                    </span>
                  </button>
                ))}
              </div>

              {searchText.trim() && !exactMatch && (
                <button
                  type="button"
                  className={styles.comboboxCreateBtn}
                  onMouseDown={handleOpenCreate}
                >
                  + Create "{searchText.trim()}"
                </button>
              )}
            </>
          ) : (
            <div className={styles.comboboxCreateForm}>
              <div className={styles.comboboxCreateTitle}>New ingredient</div>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ingredient name"
              />
              <Select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as IngredientCategory)
                }
              >
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <label className={styles.comboboxPerishable}>
                <input
                  type="checkbox"
                  checked={newPerishable}
                  onChange={(e) => setNewPerishable(e.target.checked)}
                />
                Perishable (buy per meal date)
              </label>
              <div className={styles.comboboxCreateActions}>
                <Button
                  variant="primary"
                  onClick={handleConfirmCreate}
                  disabled={!newName.trim()}
                >
                  Create & select
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsCreating(false)}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
