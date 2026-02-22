import React, { useState } from "react";
import type { Meal } from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { MealCard } from "./MealCard";
import { Button } from "../../components/Button/Button";
import { MealFormModal } from "./MealFormModal";
import styles from "./MealLibrary.module.css";

export const MealLibrarySidebar: React.FC = () => {
  const { meals } = useAppState();
  const dispatch = useAppDispatch();

  // --- Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // --- Search & Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleOpenNewMealModal = () => {
    setEditingMeal(null); // Clear any edit data
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (meal: Meal) => {
    setEditingMeal(meal); // Set the meal to edit
    setIsModalOpen(true);
  };

  const handleDeleteMeal = (mealId: string) => {
    // We'll use the browser's confirm for now
    if (window.confirm("Are you sure you want to delete this meal?")) {
      dispatch({ type: "DELETE_MEAL", payload: { mealId } });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMeal(null); // Clear edit data on close
  };

  const allTags = Array.from(
    new Set(meals.flatMap((meal) => meal.tags || []))
  ).sort();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredMeals = meals.filter((meal) => {
    const matchesSearch = meal.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => meal.tags?.includes(tag));
    return matchesSearch && matchesTags;
  });

  return (
    <>
      <div className={styles.sidebarWrapper}>
        <div className={styles.sidebarHeader}>
          <div className={styles.headerTop}>
            <h2 className={styles.sidebarTitle}>Meals</h2>
            <Button onClick={handleOpenNewMealModal} className={styles.newMealBtn}>
              + New Meal
            </Button>
          </div>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search meals..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {allTags.length > 0 && (
            <div className={styles.tagFilters}>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`${styles.tagFilter} ${
                    selectedTags.includes(tag) ? styles.tagFilterActive : ""
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  className={styles.clearTagsBtn}
                  onClick={() => setSelectedTags([])}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.scrollableArea}>
          <div className={styles.cardList}>
            {filteredMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onEdit={() => handleOpenEditModal(meal)}
                onDelete={() => handleDeleteMeal(meal.id)}
              />
            ))}
            {filteredMeals.length === 0 && (
              <div className={styles.noResults}>No meals found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Render the modal (it's hidden by default) */}
      <MealFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialData={editingMeal}
      />
    </>
  );
};
