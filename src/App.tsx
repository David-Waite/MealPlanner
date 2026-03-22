import { useState } from "react";
import styles from "./App.module.css";
import { MealLibrarySidebar } from "./features/MealLibrary/MealLibrarySidebar";
import { MealPlannerGrid } from "./features/MealPlanner/MealPlannerGrid";
import { UserSelector } from "./features/UserManagement/UserSelector";
import { ShoppingListButton } from "./features/ShoppingList/ShoppingListButton";
import { ShoppingListModal } from "./features/ShoppingList/ShoppingListModal";
import { AuthModal } from "./features/Auth/AuthModal";
import { useAuth } from "./context/AuthContext";
import { useAppHotkeys } from "./hooks/useAppHotkeys";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import { Button } from "./components/Button/Button";

function App() {
  const { user } = useAuth();
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useAppHotkeys();

  return (
    <>
      <div className={styles.appContainer}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>ShopSmart</div>
          <div className={styles.userSelectorContainer}>
            <UserSelector />
          </div>
          <div className={styles.headerRight}>
            <ShoppingListButton onClick={() => setIsShoppingListOpen(true)} />
            {user ? (
              <div className={styles.authUser}>
                <span className={styles.authDisplayName}>
                  {user.displayName || user.email}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => signOut(auth)}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <Button variant="primary" onClick={() => setIsAuthOpen(true)}>
                Sign in
              </Button>
            )}
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
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
export default App;
