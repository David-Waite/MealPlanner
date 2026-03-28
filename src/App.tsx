import { useState, useEffect, useRef } from "react";
import styles from "./App.module.css";
import { MealLibrarySidebar } from "./features/MealLibrary/MealLibrarySidebar";
import { MealPlannerGrid } from "./features/MealPlanner/MealPlannerGrid";
import { UserSelector } from "./features/UserManagement/UserSelector";
import { ShoppingListButton } from "./features/ShoppingList/ShoppingListButton";
import { ShoppingListModal } from "./features/ShoppingList/ShoppingListModal";
import { AuthModal } from "./features/Auth/AuthModal";
import { FriendsModal } from "./features/Friends/FriendsModal";
import { AdminPage } from "./features/Admin/AdminPage";
import { AccountDropdown } from "./features/Auth/AccountDropdown";
import { useAuth } from "./context/AuthContext";
import { useAppLoading } from "./context/hooks";
import { useAppHotkeys } from "./hooks/useAppHotkeys";
import { useFriendsPending } from "./hooks/useFriendsPending";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import { Button } from "./components/Button/Button";

function App() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const isSyncing = useAppLoading();
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(
    typeof window !== "undefined" && window.location.pathname === "/admin",
  );
  const pendingFriendCount = useFriendsPending();
  const [sidebarWidth, setSidebarWidth] = useState(520);
  const isResizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const handleResizeStart = (e: React.MouseEvent) => {
    isResizing.current = true;
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = e.clientX - resizeStartX.current;
      setSidebarWidth(
        Math.min(720, Math.max(280, resizeStartWidth.current + delta)),
      );
    };
    const onMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useAppHotkeys();

  if (authLoading || isSyncing) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingTitle}>ShopSmart</div>
          <div className={styles.loadingSpinner} />
        </div>
      </div>
    );
  }

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
                <AccountDropdown
                  displayName={user.displayName}
                  email={user.email}
                  isAdmin={isAdmin}
                  pendingFriendCount={pendingFriendCount}
                  onFriends={() => setIsFriendsOpen(true)}
                  onAdmin={() => setShowAdmin(true)}
                  onSignOut={() => signOut(auth)}
                />
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
      <div
        className={styles.appContainer}
        style={{ gridTemplateColumns: `${sidebarWidth}px 1fr` }}
      >
        <header className={styles.header}>
          <div className={styles.headerTitle}>ShopSmart</div>
          <div className={styles.userSelectorContainer}>
            <UserSelector />
          </div>
          <div className={styles.headerRight}>
            <ShoppingListButton onClick={() => setIsShoppingListOpen(true)} />
            {user ? (
              <AccountDropdown
                displayName={user.displayName}
                email={user.email}
                isAdmin={isAdmin}
                pendingFriendCount={pendingFriendCount}
                onFriends={() => setIsFriendsOpen(true)}
                onAdmin={() => setShowAdmin(true)}
                onSignOut={() => signOut(auth)}
              />
            ) : (
              <Button variant="primary" onClick={() => setIsAuthOpen(true)}>
                Sign in
              </Button>
            )}
          </div>
        </header>

        <aside className={styles.sidebar}>
          <MealLibrarySidebar />
          <div
            className={styles.resizeHandle}
            onMouseDown={handleResizeStart}
          />
        </aside>

        <main className={styles.mainContent}>
          <MealPlannerGrid />
        </main>
      </div>

      <ShoppingListModal
        isOpen={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
      />
      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
      />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
export default App;
