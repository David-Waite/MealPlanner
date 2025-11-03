import React, { useState } from "react";
import styles from "./App.module.css";
import { MealLibrarySidebar } from "./features/MealLibrary/MealLibrarySidebar";
import { MealPlannerGrid } from "./features/MealPlanner/MealPlannerGrid";
import { UserSelector } from "./features/UserManagement/UserSelector";
import { ShoppingListButton } from "./features/ShoppingList/ShoppingListButton";
import { ShoppingListModal } from "./features/ShoppingList/ShoppingListModal";
import { useAppHotkeys } from "./hooks/useAppHotkeys";

function App() {
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

  useAppHotkeys();

  return (
    <>
      <div className={styles.appContainer}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>ShopSmart</div>
          <div className={styles.userSelectorContainer}>
            <UserSelector />
          </div>
          <div className={styles.shoppingListButtonContainer}>
            <ShoppingListButton onClick={() => setIsShoppingListOpen(true)} />
          </div>
        </header>

        <aside className={styles.sidebar}>
          <MealLibrarySidebar />
        </aside>

        <main className={styles.mainContent}>
          <MealPlannerGrid />
        </main>
      </div>

      <ShoppingListModal
        isOpen={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
      />
    </>
  );
}
export default App;
