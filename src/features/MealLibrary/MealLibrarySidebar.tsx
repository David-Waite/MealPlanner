import React, { useState, useEffect } from "react";
import type { Meal } from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { MealCard } from "./MealCard";
import { Button } from "../../components/Button/Button";
import { MealFormModal } from "./MealFormModal";
import {
  loadFriendsRecipes,
  loadGlobalRecipes,
  bookmarkRecipe,
  firestoreRecipeToMeal,
  deleteRecipeFromCloud,
} from "../../lib/cloudSync";
import type { FirestoreRecipe } from "../../lib/firestoreTypes";
import styles from "./MealLibrary.module.css";

type SidebarTab = "yours" | "discover";

type DiscoverMeal = FirestoreRecipe & { ownerDisplayName: string };

export const MealLibrarySidebar: React.FC = () => {
  const { meals } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // --- Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // --- Tab ---
  const [activeTab, setActiveTab] = useState<SidebarTab>("yours");

  // --- Search & Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // --- "Your Recipes" = owned meals + friends' shared meals ---
  const [friendMeals, setFriendMeals] = useState<Array<Meal & { ownerDisplayName: string }>>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  // --- Discover tab state ---
  const [discoverMeals, setDiscoverMeals] = useState<DiscoverMeal[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverLoaded, setDiscoverLoaded] = useState(false);
  const [bookmarking, setBookmarking] = useState<string | null>(null); // recipeId being bookmarked

  const handleOpenNewMealModal = () => {
    setEditingMeal(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (meal: Meal) => {
    setEditingMeal(meal);
    setIsModalOpen(true);
  };

  const handleDeleteMeal = (mealId: string) => {
    if (window.confirm("Are you sure you want to delete this meal?")) {
      dispatch({ type: "DELETE_MEAL", payload: { mealId } });
      if (user) {
        deleteRecipeFromCloud(user.uid, mealId).catch(console.error);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMeal(null);
  };

  // Load friends' shared recipes (lazy, once per user session)
  useEffect(() => {
    if (activeTab !== "yours" || !user || friendsLoaded) return;
    console.log("[MealLibrarySidebar] Loading friends recipes for uid:", user.uid);
    setFriendsLoading(true);
    loadFriendsRecipes(user.uid)
      .then((recipes) => {
        console.log("[MealLibrarySidebar] Friends recipes loaded:", recipes.length);
        setFriendMeals(
          recipes.map((r) => ({
            ...firestoreRecipeToMeal(r),
            ownerDisplayName: r.ownerDisplayName,
          }))
        );
        setFriendsLoaded(true);
      })
      .catch((err) => {
        console.error("[MealLibrarySidebar] loadFriendsRecipes error:", err);
        console.error("[MealLibrarySidebar] Error code:", (err as any)?.code, "| message:", (err as any)?.message);
      })
      .finally(() => setFriendsLoading(false));
  }, [activeTab, user, friendsLoaded]);

  // Load global/discover recipes (lazy, once per session)
  useEffect(() => {
    if (activeTab !== "discover" || discoverLoaded) return;
    setDiscoverLoading(true);
    loadGlobalRecipes()
      .then((recipes) => {
        setDiscoverMeals(recipes);
        setDiscoverLoaded(true);
      })
      .catch(console.error)
      .finally(() => setDiscoverLoading(false));
  }, [activeTab, discoverLoaded]);

  // Reset caches when user changes
  useEffect(() => {
    setFriendsLoaded(false);
    setFriendMeals([]);
    setDiscoverLoaded(false);
    setDiscoverMeals([]);
  }, [user?.uid]);

  // --- Tag filters (Your Recipes tab only) ---
  const allTags = Array.from(
    new Set(meals.flatMap((meal) => meal.tags || []))
  ).sort();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Owned meals (with search + tag filter)
  const filteredOwnedMeals = meals.filter((meal) => {
    const matchesSearch = meal.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => meal.tags?.includes(tag));
    return matchesSearch && matchesTags;
  });

  // Friends' shared meals (search only — no tag filter)
  const filteredFriendMeals = friendMeals.filter((meal) =>
    meal.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Discover meals (search only)
  const filteredDiscoverMeals = discoverMeals.filter((meal) =>
    meal.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // IDs already bookmarked (to disable bookmark button)
  const bookmarkedIds = new Set(meals.map((m) => m.bookmarkedFromId).filter(Boolean));

  const handleBookmark = async (recipe: DiscoverMeal) => {
    if (!user) return;
    setBookmarking(recipe.id);
    try {
      const copy = await bookmarkRecipe(recipe, user.uid);
      dispatch({ type: "ADD_MEAL", payload: firestoreRecipeToMeal(copy) });
    } catch (err) {
      console.error(err);
      alert("Failed to bookmark recipe. Please try again.");
    } finally {
      setBookmarking(null);
    }
  };

  return (
    <>
      <div className={styles.sidebarWrapper}>
        <div className={styles.sidebarHeader}>
          <div className={styles.headerTop}>
            <h2 className={styles.sidebarTitle}>Meals</h2>
            {activeTab === "yours" && (
              <Button onClick={handleOpenNewMealModal} className={styles.newMealBtn}>
                + New Meal
              </Button>
            )}
          </div>

          {/* Tab switcher */}
          <div className={styles.tabRow}>
            <button
              className={`${styles.tabBtn} ${activeTab === "yours" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("yours")}
            >
              Your Recipes
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "discover" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("discover")}
            >
              Discover
            </button>
          </div>

          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder={activeTab === "yours" ? "Search your recipes…" : "Search global recipes…"}
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {activeTab === "yours" && allTags.length > 0 && (
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
          {/* Your Recipes tab: owned + friends' shared */}
          {activeTab === "yours" && (
            <div className={styles.cardList}>
              {filteredOwnedMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onEdit={() => handleOpenEditModal(meal)}
                  onDelete={() => handleDeleteMeal(meal.id)}
                />
              ))}

              {/* Friends' shared meals */}
              {user && !friendsLoading && filteredFriendMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onEdit={() => handleOpenEditModal(meal)}
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

          {/* Discover tab: approved global recipes */}
          {activeTab === "discover" && (
            <div className={styles.cardList}>
              {discoverLoading && (
                <div className={styles.noResults}>Loading…</div>
              )}
              {!discoverLoading && discoverLoaded && filteredDiscoverMeals.length === 0 && (
                <div className={styles.noResults}>
                  {discoverMeals.length === 0
                    ? "No global recipes yet."
                    : "No recipes match your search."}
                </div>
              )}
              {filteredDiscoverMeals.map((recipe) => {
                const alreadyBookmarked = bookmarkedIds.has(recipe.id);
                return (
                  <div key={recipe.id} className={styles.discoverCard}>
                    {recipe.photoUrl && (
                      <img
                        src={recipe.photoUrl}
                        alt={recipe.name}
                        className={styles.discoverCardImage}
                      />
                    )}
                    <div className={styles.discoverCardContent}>
                      <span className={styles.discoverCardName}>{recipe.name}</span>
                      <span className={styles.discoverCardAttribution}>
                        by {recipe.ownerDisplayName}
                      </span>
                      {recipe.tags && recipe.tags.length > 0 && (
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
                          {alreadyBookmarked
                            ? "Bookmarked"
                            : bookmarking === recipe.id
                            ? "Saving…"
                            : "Bookmark"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <MealFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialData={editingMeal}
      />
    </>
  );
};
