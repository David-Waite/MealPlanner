import React, { useState, useEffect, useMemo } from "react";
import type { Meal, Ingredient } from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { MealCard } from "./MealCard";
import { SnackCard } from "./SnackCard";
import { SnackFormModal } from "./SnackFormModal";
import { Button } from "../../components/Button/Button";
import { MealFormModal } from "./MealFormModal";
import {
  loadFriendsRecipes,
  loadGlobalRecipes,
  bookmarkRecipe,
  firestoreRecipeToMeal,
  deleteRecipeFromCloud,
  loadGlobalSnacks,
  bookmarkSnack,
} from "../../lib/cloudSync";
import type { FirestoreRecipe, GlobalIngredient } from "../../lib/firestoreTypes";
import styles from "./MealLibrary.module.css";

type SidebarMode = "meals" | "snacks";
type MealsTab = "yours" | "discover";
type SnacksTab = "global" | "mine";
type DiscoverMeal = FirestoreRecipe & { ownerDisplayName: string };

export const MealLibrarySidebar: React.FC = () => {
  const { meals, ingredients } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // ── Top-level mode ──
  const [mode, setMode] = useState<SidebarMode>("meals");

  // ── Meals mode state ──
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [mealsTab, setMealsTab] = useState<MealsTab>("yours");
  const [mealSearch, setMealSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [friendMeals, setFriendMeals] = useState<Array<Meal & { ownerDisplayName: string }>>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [discoverMeals, setDiscoverMeals] = useState<DiscoverMeal[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverLoaded, setDiscoverLoaded] = useState(false);
  const [bookmarking, setBookmarking] = useState<string | null>(null);

  // ── Snacks mode state ──
  const [snacksTab, setSnacksTab] = useState<SnacksTab>("global");
  const [isSnackModalOpen, setIsSnackModalOpen] = useState(false);
  const [editingSnack, setEditingSnack] = useState<Ingredient | null>(null);
  const [snackSearch, setSnackSearch] = useState("");
  const [globalSnacks, setGlobalSnacks] = useState<GlobalIngredient[]>([]);
  const [globalSnacksLoading, setGlobalSnacksLoading] = useState(false);
  const [globalSnacksLoaded, setGlobalSnacksLoaded] = useState(false);
  const [bookmarkingSnack, setBookmarkingSnack] = useState<string | null>(null);

  // ── Snack modal handlers ──
  const handleOpenNewSnack = () => { setEditingSnack(null); setIsSnackModalOpen(true); };
  const handleOpenEditSnack = (ing: Ingredient) => { setEditingSnack(ing); setIsSnackModalOpen(true); };
  const handleCloseSnackModal = () => { setIsSnackModalOpen(false); setEditingSnack(null); };

  // ── Meals modal handlers ──
  const handleOpenNewMeal = () => { setEditingMeal(null); setIsMealModalOpen(true); };
  const handleOpenEditMeal = (meal: Meal) => { setEditingMeal(meal); setIsMealModalOpen(true); };
  const handleCloseMealModal = () => { setIsMealModalOpen(false); setEditingMeal(null); };

  const handleDeleteMeal = (mealId: string) => {
    if (window.confirm("Are you sure you want to delete this meal?")) {
      dispatch({ type: "DELETE_MEAL", payload: { mealId } });
      if (user) deleteRecipeFromCloud(user.uid, mealId).catch(console.error);
    }
  };

  // ── Load friends' recipes ──
  useEffect(() => {
    if (mode !== "meals" || mealsTab !== "yours" || !user || friendsLoaded) return;
    setFriendsLoading(true);
    loadFriendsRecipes(user.uid)
      .then((recipes) => {
        setFriendMeals(recipes.map((r) => ({ ...firestoreRecipeToMeal(r), ownerDisplayName: r.ownerDisplayName })));
        setFriendsLoaded(true);
      })
      .catch(console.error)
      .finally(() => setFriendsLoading(false));
  }, [mode, mealsTab, user, friendsLoaded]);

  // ── Load global/discover recipes ──
  useEffect(() => {
    if (mode !== "meals" || mealsTab !== "discover" || discoverLoaded) return;
    setDiscoverLoading(true);
    loadGlobalRecipes()
      .then((recipes) => { setDiscoverMeals(recipes); setDiscoverLoaded(true); })
      .catch(console.error)
      .finally(() => setDiscoverLoading(false));
  }, [mode, mealsTab, discoverLoaded]);

  // ── Reset caches on user change ──
  useEffect(() => {
    setFriendsLoaded(false); setFriendMeals([]);
    setDiscoverLoaded(false); setDiscoverMeals([]);
  }, [user?.uid]);

  // ── Load global snacks on demand ──
  useEffect(() => {
    if (mode !== "snacks" || snacksTab !== "global" || globalSnacksLoaded) return;
    setGlobalSnacksLoading(true);
    loadGlobalSnacks()
      .then((snacks) => { setGlobalSnacks(snacks); setGlobalSnacksLoaded(true); })
      .catch(console.error)
      .finally(() => setGlobalSnacksLoading(false));
  }, [mode, snacksTab, globalSnacksLoaded]);

  // ── Meals filtering ──
  const allTags = useMemo(
    () => Array.from(new Set(meals.flatMap((m) => m.tags || []))).sort(),
    [meals]
  );
  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const filteredOwnedMeals = meals.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(mealSearch.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.every((t) => m.tags?.includes(t));
    return matchesSearch && matchesTags;
  });
  const filteredFriendMeals = friendMeals.filter((m) =>
    m.name.toLowerCase().includes(mealSearch.toLowerCase())
  );
  const filteredDiscover = discoverMeals.filter((m) =>
    m.name.toLowerCase().includes(mealSearch.toLowerCase())
  );
  const bookmarkedIds = new Set(meals.map((m) => m.bookmarkedFromId).filter(Boolean));

  const handleBookmark = async (recipe: DiscoverMeal) => {
    if (!user) return;
    setBookmarking(recipe.id);
    try {
      const copy = await bookmarkRecipe(recipe, user.uid);
      dispatch({ type: "ADD_MEAL", payload: firestoreRecipeToMeal(copy) });
    } catch { alert("Failed to bookmark recipe."); }
    finally { setBookmarking(null); }
  };

  // ── Snack filtering ──
  const mySnacks = useMemo(
    () => ingredients.filter((i) => i.isSnack && i.source === "local"),
    [ingredients]
  );
  const bookmarkedSnackIds = useMemo(
    () => new Set(mySnacks.map((s) => s.bookmarkedFromId).filter(Boolean)),
    [mySnacks]
  );

  const filteredMySnacks = useMemo(() => {
    const q = snackSearch.trim().toLowerCase();
    if (!q) return mySnacks;
    return mySnacks.filter((i) => i.name.toLowerCase().includes(q));
  }, [mySnacks, snackSearch]);

  const filteredGlobalSnacks = useMemo(() => {
    const q = snackSearch.trim().toLowerCase();
    if (!q) return globalSnacks;
    return globalSnacks.filter((i) => i.name.toLowerCase().includes(q));
  }, [globalSnacks, snackSearch]);

  const handleBookmarkSnack = async (snack: GlobalIngredient) => {
    if (!user) return;
    setBookmarkingSnack(snack.id);
    try {
      const bookmarked = await bookmarkSnack(user.uid, snack);
      dispatch({
        type: "ADD_INGREDIENT",
        payload: { ...bookmarked, source: "local" as const },
      });
    } catch { alert("Failed to bookmark snack."); }
    finally { setBookmarkingSnack(null); }
  };

  return (
    <>
      <div className={styles.sidebarWrapper}>

        {/* ── Fixed header ── */}
        <div className={styles.sidebarHeader}>

          {/* Mode toggle */}
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${mode === "meals" ? styles.modeBtnActive : ""}`}
              onClick={() => setMode("meals")}
            >
              Meals
            </button>
            <button
              className={`${styles.modeBtn} ${mode === "snacks" ? styles.modeBtnActive : ""}`}
              onClick={() => setMode("snacks")}
            >
              Snacks
            </button>
          </div>

          {/* ── MEALS header controls ── */}
          {mode === "meals" && (
            <>
              <div className={styles.headerTop}>
                <h2 className={styles.sidebarTitle}>Meals</h2>
                <Button onClick={handleOpenNewMeal} className={styles.newMealBtn}>
                  + New Meal
                </Button>
              </div>

              <div className={styles.tabRow}>
                <button
                  className={`${styles.tabBtn} ${mealsTab === "yours" ? styles.tabBtnActive : ""}`}
                  onClick={() => setMealsTab("yours")}
                >
                  Your Recipes
                </button>
                <button
                  className={`${styles.tabBtn} ${mealsTab === "discover" ? styles.tabBtnActive : ""}`}
                  onClick={() => setMealsTab("discover")}
                >
                  Discover
                </button>
              </div>

              <div className={styles.searchContainer}>
                <input
                  type="text"
                  placeholder={mealsTab === "yours" ? "Search your recipes…" : "Search global recipes…"}
                  className={styles.searchInput}
                  value={mealSearch}
                  onChange={(e) => setMealSearch(e.target.value)}
                />
              </div>

              {mealsTab === "yours" && allTags.length > 0 && (
                <div className={styles.tagFilters}>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      className={`${styles.tagFilter} ${selectedTags.includes(tag) ? styles.tagFilterActive : ""}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                  {selectedTags.length > 0 && (
                    <button className={styles.clearTagsBtn} onClick={() => setSelectedTags([])}>
                      Clear
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── SNACKS header controls ── */}
          {mode === "snacks" && (
            <>
              <div className={styles.headerTop}>
                <h2 className={styles.sidebarTitle}>Snacks</h2>
                {snacksTab === "mine" && (
                  <button className={styles.newSnackBtn} onClick={handleOpenNewSnack}>
                    + New Snack
                  </button>
                )}
              </div>

              <div className={styles.tabRow}>
                <button
                  className={`${styles.tabBtn} ${snacksTab === "global" ? styles.tabBtnActive : ""}`}
                  onClick={() => setSnacksTab("global")}
                >
                  Global
                </button>
                <button
                  className={`${styles.tabBtn} ${snacksTab === "mine" ? styles.tabBtnActive : ""}`}
                  onClick={() => setSnacksTab("mine")}
                >
                  My Snacks
                </button>
              </div>

              <div className={styles.searchContainer}>
                <input
                  type="text"
                  placeholder={snacksTab === "global" ? "Search global snacks…" : "Search my snacks…"}
                  className={styles.searchInput}
                  value={snackSearch}
                  onChange={(e) => setSnackSearch(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Scrollable content ── */}
        <div className={styles.scrollableArea}>

          {/* MEALS content */}
          {mode === "meals" && mealsTab === "yours" && (
            <div className={styles.cardList}>
              {filteredOwnedMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onEdit={() => handleOpenEditMeal(meal)}
                  onDelete={() => handleDeleteMeal(meal.id)}
                />
              ))}
              {user && !friendsLoading && filteredFriendMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onEdit={() => handleOpenEditMeal(meal)}
                  onDelete={() => handleDeleteMeal(meal.id)}
                />
              ))}
              {filteredOwnedMeals.length === 0 && filteredFriendMeals.length === 0 && (
                <div className={styles.noResults}>
                  {meals.length === 0 ? "No meals yet — create one!" : "No meals found."}
                </div>
              )}
            </div>
          )}

          {mode === "meals" && mealsTab === "discover" && (
            <div className={styles.cardList}>
              {discoverLoading && <div className={styles.noResults}>Loading…</div>}
              {!discoverLoading && discoverLoaded && filteredDiscover.length === 0 && (
                <div className={styles.noResults}>
                  {discoverMeals.length === 0 ? "No global recipes yet." : "No recipes match your search."}
                </div>
              )}
              {filteredDiscover.map((recipe) => {
                const alreadyBookmarked = bookmarkedIds.has(recipe.id);
                return (
                  <div key={recipe.id} className={styles.discoverCard}>
                    {recipe.photoUrl && (
                      <img src={recipe.photoUrl} alt={recipe.name} className={styles.discoverCardImage} />
                    )}
                    <div className={styles.discoverCardContent}>
                      <span className={styles.discoverCardName}>{recipe.name}</span>
                      <span className={styles.discoverCardAttribution}>by {recipe.ownerDisplayName}</span>
                      {recipe.tags?.length > 0 && (
                        <div className={styles.cardTags}>
                          {recipe.tags.map((tag) => (
                            <span key={tag} className={styles.cardTag}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {user && (
                      <div className={styles.discoverCardFooter}>
                        <button
                          className={styles.bookmarkBtn}
                          disabled={alreadyBookmarked || bookmarking === recipe.id}
                          onClick={() => handleBookmark(recipe)}
                        >
                          {alreadyBookmarked ? "Bookmarked" : bookmarking === recipe.id ? "Saving…" : "Bookmark"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* SNACKS content — Global tab */}
          {mode === "snacks" && snacksTab === "global" && (
            <div className={styles.snackGrid}>
              {globalSnacksLoading && (
                <div className={styles.snackEmpty}>Loading…</div>
              )}
              {!globalSnacksLoading && filteredGlobalSnacks.length === 0 && (
                <div className={styles.snackEmpty}>
                  {globalSnacksLoaded && globalSnacks.length === 0
                    ? "No global snacks yet."
                    : "No snacks match your search."}
                </div>
              )}
              {filteredGlobalSnacks.map((snack) => {
                const isBookmarked = bookmarkedSnackIds.has(snack.id);
                return (
                  <SnackCard
                    key={snack.id}
                    ingredient={{ ...snack, source: "global" as const }}
                    onBookmark={user ? () => handleBookmarkSnack(snack) : undefined}
                    isBookmarking={bookmarkingSnack === snack.id}
                    isBookmarked={isBookmarked}
                  />
                );
              })}
            </div>
          )}

          {/* SNACKS content — My Snacks tab */}
          {mode === "snacks" && snacksTab === "mine" && (
            <div className={styles.snackGrid}>
              {filteredMySnacks.length === 0 && (
                <div className={styles.snackEmpty}>
                  {mySnacks.length === 0
                    ? "No snacks yet — bookmark from Global or add a new one."
                    : "No snacks match your search."}
                </div>
              )}
              {filteredMySnacks.map((ing) => (
                <SnackCard
                  key={ing.id}
                  ingredient={ing}
                  onEdit={() => handleOpenEditSnack(ing)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <MealFormModal
        isOpen={isMealModalOpen}
        onClose={handleCloseMealModal}
        initialData={editingMeal}
      />

      {isSnackModalOpen && (
        <SnackFormModal
          initialData={editingSnack}
          onClose={handleCloseSnackModal}
        />
      )}
    </>
  );
};
