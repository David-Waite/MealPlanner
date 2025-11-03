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

  return (
    <>
      <div className={styles.sidebarContainer}>
        <div className={styles.sidebarHeader}>
          <h2>Meals</h2>
          <Button onClick={handleOpenNewMealModal}>+ New Meal</Button>
        </div>
        <div className={styles.cardList}>
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onEdit={() => handleOpenEditModal(meal)}
              onDelete={() => handleDeleteMeal(meal.id)}
            />
          ))}
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
