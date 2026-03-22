import { useState } from "react";
import styles from "./App.module.css";
import { MealLibrarySidebar } from "./features/MealLibrary/MealLibrarySidebar";
import { MealPlannerGrid } from "./features/MealPlanner/MealPlannerGrid";
import { UserSelector } from "./features/UserManagement/UserSelector";
import { ShoppingListButton } from "./features/ShoppingList/ShoppingListButton";
import { ShoppingListModal } from "./features/ShoppingList/ShoppingListModal";
import { AuthModal } from "./features/Auth/AuthModal";
import { FriendsModal } from "./features/Friends/FriendsModal";
import { AdminPage } from "./features/Admin/AdminPage";
import { useAuth } from "./context/AuthContext";
import { useAppHotkeys } from "./hooks/useAppHotkeys";
import { useFriendsPending } from "./hooks/useFriendsPending";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import { Button } from "./components/Button/Button";

function App() {
  const { user, isAdmin } = useAuth();
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(
    typeof window !== "undefined" && window.location.pathname === "/admin"
  );
  const pendingFriendCount = useFriendsPending();

  useAppHotkeys();


  if (showAdmin) {
    return (
      <>
        <div className={styles.appContainer}>
          <header className={styles.header}>
            <button
              className={styles.adminBackBtn}
              onClick={() => setShowAdmin(false)}
            >
              ← Back to Planner
            </button>
            <div />
            <div className={styles.headerRight}>
              {user ? (
                <div className={styles.authUser}>
                  <span className={styles.authDisplayName}>
                    {user.displayName || user.email}
                  </span>
                  <Button variant="secondary" onClick={() => signOut(auth)}>
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
          <div style={{ gridColumn: "1 / -1", overflow: "auto" }}>
            <AdminPage />
          </div>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </>
    );
  }

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
            {user && (
              <div className={styles.friendsBtnWrapper}>
                <button
                  className={styles.friendsBtn}
                  onClick={() => setIsFriendsOpen(true)}
                  title="Friends"
                >
                  Friends
                  {pendingFriendCount > 0 && (
                    <span className={styles.friendsBadge}>{pendingFriendCount}</span>
                  )}
                </button>
              </div>
            )}
            {isAdmin && (
              <button
                className={styles.adminBtn}
                onClick={() => setShowAdmin(true)}
                title="Admin"
              >
                Admin
              </button>
            )}
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
      <FriendsModal isOpen={isFriendsOpen} onClose={() => setIsFriendsOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
export default App;
