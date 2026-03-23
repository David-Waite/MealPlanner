import React, { useState, useEffect, useRef, useMemo } from "react";
import type { Meal, Ingredient } from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { MealCard } from "./MealCard";
import { SnackFormModal } from "./SnackFormModal";
import { MealFormModal } from "./MealFormModal";
import {
  loadFriendsRecipes,
  loadGlobalRecipes,
  bookmarkRecipe,
  firestoreRecipeToMeal,
  deleteRecipeFromCloud,
  loadGlobalSnacks,
  bookmarkSnack,
  saveFavourites,
} from "../../lib/cloudSync";
import type { FirestoreRecipe, GlobalIngredient } from "../../lib/firestoreTypes";
import styles from "./MealLibrary.module.css";

type DiscoverMeal = FirestoreRecipe & { ownerDisplayName: string };

const CATEGORY_GRADIENTS: Record<string, string> = {
  "Produce":              "linear-gradient(135deg, #68d391 0%, #38a169 100%)",
  "Meat":                 "linear-gradient(135deg, #fc8181 0%, #c53030 100%)",
  "Dairy":                "linear-gradient(135deg, #63b3ed 0%, #2b6cb0 100%)",
  "Pantry":               "linear-gradient(135deg, #f6ad55 0%, #c05621 100%)",
  "Snacks":               "linear-gradient(135deg, #b794f4 0%, #6b46c1 100%)",
  "Household & Cleaning": "linear-gradient(135deg, #a0aec0 0%, #4a5568 100%)",
  "Frozen":               "linear-gradient(135deg, #76e4f7 0%, #2c7a7b 100%)",
  "Other":                "linear-gradient(135deg, #cbd5e0 0%, #718096 100%)",
};

export const MealLibrarySidebar: React.FC = () => {
  const { meals, ingredients, favourites } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // ── View switcher ──
  type SidebarView = "library" | "discover" | "friends";
  const [sidebarView, setSidebarView] = useState<SidebarView>("library");
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target as Node))
        setViewDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [viewDropdownOpen]);

  const VIEW_LABELS: Record<SidebarView, string> = {
    library: "Library",
    discover: "Discover",
    friends: "Friends",
  };

  // ── Modals ──
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [isSnackModalOpen, setIsSnackModalOpen] = useState(false);
  const [editingSnack, setEditingSnack] = useState<Ingredient | null>(null);

  // ── Unified search ──
  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim().toLowerCase();
  const isSearching = trimmedSearch.length > 0;

  // ── Meals section ──
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [friendMeals, setFriendMeals] = useState<Array<Meal & { ownerDisplayName: string }>>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [discoverMeals, setDiscoverMeals] = useState<DiscoverMeal[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverLoaded, setDiscoverLoaded] = useState(false);
  const [bookmarking, setBookmarking] = useState<string | null>(null);

  // ── Favourites filter ──
  const [favShowMeals, setFavShowMeals] = useState(true);
  const [favShowSnacks, setFavShowSnacks] = useState(true);

  const toggleFavMeals = () => { if (!favShowMeals || favShowSnacks) setFavShowMeals((v) => !v); };
  const toggleFavSnacks = () => { if (!favShowSnacks || favShowMeals) setFavShowSnacks((v) => !v); };

  // ── Library filter ──
  const [libShowMeals, setLibShowMeals] = useState(true);
  const [libShowSnacks, setLibShowSnacks] = useState(true);
  const toggleLibMeals = () => { if (!libShowMeals || libShowSnacks) setLibShowMeals((v) => !v); };
  const toggleLibSnacks = () => { if (!libShowSnacks || libShowMeals) setLibShowSnacks((v) => !v); };

  // ── Friends view ──
  const [friendsViewSearch, setFriendsViewSearch] = useState("");
  const trimmedFriendsViewSearch = friendsViewSearch.trim().toLowerCase();
  const [friendsViewSelectedFriends, setFriendsViewSelectedFriends] = useState<string[]>([]);
  const [friendsViewShowFriendsFilter, setFriendsViewShowFriendsFilter] = useState(false);
  const [friendsViewSelectedTags, setFriendsViewSelectedTags] = useState<string[]>([]);
  const [friendsViewShowTagFilter, setFriendsViewShowTagFilter] = useState(false);

  // ── Discover view ──
  const [discoverSearch, setDiscoverSearch] = useState("");
  const trimmedDiscoverSearch = discoverSearch.trim().toLowerCase();
  const [discoverSelectedTags, setDiscoverSelectedTags] = useState<string[]>([]);
  const [discoverShowTagFilter, setDiscoverShowTagFilter] = useState(false);

  // ── Snacks section ──
  const [snackSearch, setSnackSearch] = useState("");
  const trimmedSnackSearch = snackSearch.trim().toLowerCase();
  const [globalSnacks, setGlobalSnacks] = useState<GlobalIngredient[]>([]);
  const [globalSnacksLoading, setGlobalSnacksLoading] = useState(false);
  const [globalSnacksLoaded, setGlobalSnacksLoaded] = useState(false);

  // ── Load friends' recipes once ──
  useEffect(() => {
    if (!user || friendsLoaded) return;
    setFriendsLoading(true);
    loadFriendsRecipes(user.uid)
      .then((recipes) => {
        setFriendMeals(recipes.map((r) => ({ ...firestoreRecipeToMeal(r), ownerDisplayName: r.ownerDisplayName })));
        setFriendsLoaded(true);
      })
      .catch(console.error)
      .finally(() => setFriendsLoading(false));
  }, [user, friendsLoaded]);

  // ── Load global snacks once ──
  useEffect(() => {
    if (globalSnacksLoaded) return;
    setGlobalSnacksLoading(true);
    loadGlobalSnacks()
      .then((snacks) => { setGlobalSnacks(snacks); setGlobalSnacksLoaded(true); })
      .catch(console.error)
      .finally(() => setGlobalSnacksLoading(false));
  }, [globalSnacksLoaded]);

  // ── Load discover recipes when entering Discover view ──
  useEffect(() => {
    if (sidebarView !== "discover" || discoverLoaded) return;
    setDiscoverLoading(true);
    loadGlobalRecipes()
      .then((recipes) => { setDiscoverMeals(recipes); setDiscoverLoaded(true); })
      .catch(console.error)
      .finally(() => setDiscoverLoading(false));
  }, [sidebarView, discoverLoaded]);

  // ── Reset caches on user change ──
  useEffect(() => {
    setFriendsLoaded(false);
    setFriendMeals([]);
    setDiscoverLoaded(false);
    setDiscoverMeals([]);
  }, [user?.uid]);

  // ── Derived data ──
  const allTags = useMemo(
    () => Array.from(new Set(meals.flatMap((m) => m.tags || []))).sort(),
    [meals]
  );

  const friendAuthors = useMemo(
    () => Array.from(new Set(friendMeals.map((m) => m.ownerDisplayName).filter(Boolean))),
    [friendMeals]
  );

  const bookmarkedMealIds = useMemo(
    () => new Set(meals.map((m) => m.bookmarkedFromId).filter(Boolean)),
    [meals]
  );

  const discoverTags = useMemo(
    () => Array.from(new Set(discoverMeals.flatMap((m) => (m as { tags?: string[] }).tags ?? []))).sort(),
    [discoverMeals]
  );

  const discoverMealsAsCards = useMemo(() =>
    discoverMeals.map((r) => ({ ...firestoreRecipeToMeal(r), ownerDisplayName: r.ownerDisplayName })),
    [discoverMeals]
  );

  const visibleDiscoverMeals = useMemo(() => {
    return discoverMealsAsCards.filter((m) => {
      const matchesSearch = !trimmedDiscoverSearch || m.name.toLowerCase().includes(trimmedDiscoverSearch);
      const matchesTags = discoverSelectedTags.length === 0 || discoverSelectedTags.every((t) => m.tags?.includes(t));
      return matchesSearch && matchesTags;
    });
  }, [discoverMealsAsCards, trimmedDiscoverSearch, discoverSelectedTags]);

  const favouriteMealIds = useMemo(
    () => new Set(favourites.filter((f) => f.type === "meal").map((f) => f.id)),
    [favourites]
  );
  const favouriteSnackIds = useMemo(
    () => new Set(favourites.filter((f) => f.type === "snack").map((f) => f.id)),
    [favourites]
  );

  const visibleMeals = useMemo(() => {
    const ownedList = meals.filter((m) => {
      if (favouriteMealIds.has(m.id)) return false;
      const matchesSearch = !trimmedSearch || m.name.toLowerCase().includes(trimmedSearch);
      const matchesTags = selectedTags.length === 0 || selectedTags.every((t) => m.tags?.includes(t));
      return matchesSearch && matchesTags;
    });
    return ownedList;
  }, [meals, trimmedSearch, selectedTags, favouriteMealIds]);

  // ── Friends view derived data ──
  const friendMealTags = useMemo(
    () => Array.from(new Set(friendMeals.flatMap((m) => m.tags ?? []))).sort(),
    [friendMeals]
  );

  const visibleFriendMeals = useMemo(() =>
    friendMeals.filter((m) => {
      const matchesSearch = !trimmedFriendsViewSearch || m.name.toLowerCase().includes(trimmedFriendsViewSearch);
      const matchesFriends = friendsViewSelectedFriends.length === 0 || friendsViewSelectedFriends.includes(m.ownerDisplayName);
      const matchesTags = friendsViewSelectedTags.length === 0 || friendsViewSelectedTags.every((t) => m.tags?.includes(t));
      return matchesSearch && matchesFriends && matchesTags;
    }),
    [friendMeals, trimmedFriendsViewSearch, friendsViewSelectedFriends, friendsViewSelectedTags]
  );

  const friendMealsByAuthor = useMemo(() => {
    const map = new Map<string, typeof visibleFriendMeals>();
    visibleFriendMeals.forEach((m) => {
      const key = m.ownerDisplayName || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return map;
  }, [visibleFriendMeals]);

  const visibleSnacks = useMemo(() => {
    const nonFavourited = globalSnacks.filter((s) => !favouriteSnackIds.has(s.id));
    if (!trimmedSnackSearch) return nonFavourited.slice(0, 12);
    return nonFavourited.filter((s) => s.name.toLowerCase().includes(trimmedSnackSearch));
  }, [globalSnacks, trimmedSnackSearch, favouriteSnackIds]);

  const searchResults = useMemo(() => {
    if (!isSearching) return null;
    const mealResults = [...meals, ...friendMeals].filter((m) =>
      m.name.toLowerCase().includes(trimmedSearch)
    );
    const snackResults = globalSnacks.filter((s) =>
      s.name.toLowerCase().includes(trimmedSearch)
    );
    return { meals: mealResults, snacks: snackResults };
  }, [isSearching, trimmedSearch, meals, friendMeals, globalSnacks]);

  const favouriteMeals = useMemo(() =>
    favourites
      .filter((f) => f.type === "meal")
      .map((f) => [...meals, ...friendMeals].find((m) => m.id === f.id))
      .filter((m): m is Meal => m !== undefined),
    [favourites, meals, friendMeals]
  );

  const favouriteSnacks = useMemo(() =>
    favourites
      .filter((f) => f.type === "snack")
      .map((f) => globalSnacks.find((s) => s.id === f.id))
      .filter((s): s is GlobalIngredient => s !== undefined),
    [favourites, globalSnacks]
  );

  // ── Handlers ──
  const handleToggleFavourite = (id: string, type: "meal" | "snack") => {
    dispatch({ type: "TOGGLE_FAVOURITE", payload: { id, type } });
    if (user) {
      const next = favourites.some((f) => f.id === id && f.type === type)
        ? favourites.filter((f) => !(f.id === id && f.type === type))
        : [...favourites, { id, type }];
      saveFavourites(user.uid, next).catch(console.error);
    }
  };

  const handleDeleteMeal = (mealId: string) => {
    if (window.confirm("Are you sure you want to delete this meal?")) {
      dispatch({ type: "DELETE_MEAL", payload: { mealId } });
      if (user) deleteRecipeFromCloud(user.uid, mealId).catch(console.error);
    }
  };

  const handleBookmarkMeal = async (recipe: DiscoverMeal) => {
    if (!user) return;
    setBookmarking(recipe.id);
    try {
      const copy = await bookmarkRecipe(recipe, user.uid);
      dispatch({ type: "ADD_MEAL", payload: firestoreRecipeToMeal(copy) });
    } catch { alert("Failed to bookmark recipe."); }
    finally { setBookmarking(null); }
  };

  const handleBookmarkSnack = async (snack: GlobalIngredient) => {
    if (!user) return;
    try {
      const bookmarked = await bookmarkSnack(user.uid, snack);
      dispatch({ type: "ADD_INGREDIENT", payload: { ...bookmarked, source: "local" as const } });
    } catch { alert("Failed to bookmark snack."); }
  };

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const isMealFavourited = (id: string) => favourites.some((f) => f.id === id && f.type === "meal");
  const isSnackFavourited = (id: string) => favourites.some((f) => f.id === id && f.type === "snack");

  const handleDragStartSnack = (e: React.DragEvent, snackId: string) => {
    e.dataTransfer.setData("text/plain", `snack:${snackId}`);
    e.dataTransfer.effectAllowed = "copy";
  };

  // suppress unused warning — ingredients is available for future use (snack editing)
  void ingredients;
  void handleBookmarkSnack;

  return (
    <>
      <div className={styles.sidebarWrapper}>

        {/* ── Fixed header ── */}
        <div className={styles.sidebarHeader}>
          <div className={styles.headerTop}>
            {/* View switcher dropdown */}
            <div className={styles.viewDropdown} ref={viewDropdownRef}>
              <button
                className={styles.viewDropdownTrigger}
                onClick={() => setViewDropdownOpen((v) => !v)}
              >
                <span>{VIEW_LABELS[sidebarView]}</span>
                <span className={`${styles.viewDropdownChevron} ${viewDropdownOpen ? styles.viewDropdownChevronOpen : ""}`}>
                  ›
                </span>
              </button>
              {viewDropdownOpen && (
                <div className={styles.viewDropdownPanel}>
                  {(["library", "discover", "friends"] as SidebarView[]).map((v) => (
                    <button
                      key={v}
                      className={`${styles.viewDropdownOption} ${sidebarView === v ? styles.viewDropdownOptionActive : ""}`}
                      onClick={() => { setSidebarView(v); setViewDropdownOpen(false); }}
                    >
                      {VIEW_LABELS[v]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {sidebarView === "library" && (
            <>
              <div className={styles.searchContainer}>
                <span className={styles.searchIcon}>⌕</span>
                <input
                  type="text"
                  placeholder="Search meals & snacks…"
                  className={styles.searchInput}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className={styles.searchClear} onClick={() => setSearch("")}>×</button>
                )}
              </div>

              {/* Tags — only relevant when meals are visible in library */}
              {!isSearching && libShowMeals && allTags.length > 0 && (
                <div className={styles.headerFilters}>
                  <button
                    className={`${styles.filterToggle} ${showTagFilter ? styles.filterToggleActive : ""}`}
                    onClick={() => setShowTagFilter((v) => !v)}
                  >
                    Tags{selectedTags.length > 0 ? ` (${selectedTags.length})` : ""}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Scrollable content ── */}
        <div className={styles.scrollableArea}>

          {/* ── DISCOVER VIEW ── */}
          {sidebarView === "discover" && (
            <div className={styles.discoverView}>
              {/* Search bar */}
              <div className={styles.discoverViewHeader}>
                <div className={styles.searchContainer}>
                  <span className={styles.searchIcon}>⌕</span>
                  <input
                    type="text"
                    placeholder="Search global recipes…"
                    className={styles.searchInput}
                    value={discoverSearch}
                    onChange={(e) => setDiscoverSearch(e.target.value)}
                  />
                  {discoverSearch && (
                    <button className={styles.searchClear} onClick={() => setDiscoverSearch("")}>×</button>
                  )}
                </div>
                {discoverTags.length > 0 && (
                  <div className={styles.headerFilters}>
                    <button
                      className={`${styles.filterToggle} ${discoverShowTagFilter ? styles.filterToggleActive : ""}`}
                      onClick={() => setDiscoverShowTagFilter((v) => !v)}
                    >
                      Tags{discoverSelectedTags.length > 0 ? ` (${discoverSelectedTags.length})` : ""}
                    </button>
                  </div>
                )}
                {discoverShowTagFilter && discoverTags.length > 0 && (
                  <div className={styles.tagFilters}>
                    {discoverTags.map((tag) => (
                      <button
                        key={tag}
                        className={`${styles.tagFilter} ${discoverSelectedTags.includes(tag) ? styles.tagFilterActive : ""}`}
                        onClick={() => setDiscoverSelectedTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                    {discoverSelectedTags.length > 0 && (
                      <button className={styles.clearTagsBtn} onClick={() => setDiscoverSelectedTags([])}>Clear</button>
                    )}
                  </div>
                )}
              </div>

              {/* Grid */}
              {discoverLoading && <p className={styles.emptyMsg} style={{ padding: "20px" }}>Loading…</p>}
              {!discoverLoading && (
                <div className={styles.discoverViewGrid}>
                  {visibleDiscoverMeals.map((meal) => {
                    const alreadyBookmarked = bookmarkedMealIds.has(meal.bookmarkedFromId ?? meal.id);
                    return (
                      <div key={meal.id} className={styles.discoverGridCard}>
                        <MealCard
                          meal={meal}
                          onEdit={() => {}}
                          onDelete={() => {}}
                          isFavourited={isMealFavourited(meal.id)}
                          onFavourite={() => handleToggleFavourite(meal.id, "meal")}
                        />
                        {user && (
                          <button
                            className={`${styles.discoverSaveBtn} ${alreadyBookmarked ? styles.discoverSaveBtnSaved : ""}`}
                            disabled={alreadyBookmarked || bookmarking === meal.id}
                            onClick={() => {
                              const raw = discoverMeals.find((r) => r.id === meal.id || r.id === meal.bookmarkedFromId);
                              if (raw) handleBookmarkMeal(raw);
                            }}
                          >
                            {alreadyBookmarked ? "Saved" : bookmarking === meal.id ? "…" : "+ Save"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {visibleDiscoverMeals.length === 0 && !discoverLoading && (
                    <p className={styles.emptyMsg} style={{ gridColumn: "1 / -1" }}>
                      {discoverMeals.length === 0 ? "No global recipes yet." : "No results."}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {/* ── FRIENDS VIEW ── */}
          {sidebarView === "friends" && (
            <div className={styles.discoverView}>
              {/* Header: search + filter buttons */}
              <div className={styles.discoverViewHeader}>
                <div className={styles.searchContainer}>
                  <span className={styles.searchIcon}>⌕</span>
                  <input
                    type="text"
                    placeholder="Search friends' recipes…"
                    className={styles.searchInput}
                    value={friendsViewSearch}
                    onChange={(e) => setFriendsViewSearch(e.target.value)}
                  />
                  {friendsViewSearch && (
                    <button className={styles.searchClear} onClick={() => setFriendsViewSearch("")}>×</button>
                  )}
                </div>

                {(friendMealTags.length > 0 || friendAuthors.length > 0) && (
                  <div className={styles.headerFilters}>
                    {friendAuthors.length > 0 && (
                      <button
                        className={`${styles.filterToggle} ${friendsViewShowFriendsFilter ? styles.filterToggleActive : ""}`}
                        onClick={() => setFriendsViewShowFriendsFilter((v) => !v)}
                      >
                        Friends{friendsViewSelectedFriends.length > 0 ? ` (${friendsViewSelectedFriends.length})` : ""}
                      </button>
                    )}
                    {friendMealTags.length > 0 && (
                      <button
                        className={`${styles.filterToggle} ${friendsViewShowTagFilter ? styles.filterToggleActive : ""}`}
                        onClick={() => setFriendsViewShowTagFilter((v) => !v)}
                      >
                        Tags{friendsViewSelectedTags.length > 0 ? ` (${friendsViewSelectedTags.length})` : ""}
                      </button>
                    )}
                  </div>
                )}

                {friendsViewShowFriendsFilter && friendAuthors.length > 0 && (
                  <div className={styles.tagFilters}>
                    {friendAuthors.map((author) => (
                      <button
                        key={author}
                        className={`${styles.tagFilter} ${friendsViewSelectedFriends.includes(author) ? styles.tagFilterActive : ""}`}
                        onClick={() => setFriendsViewSelectedFriends((prev) =>
                          prev.includes(author) ? prev.filter((a) => a !== author) : [...prev, author]
                        )}
                      >
                        {author}
                      </button>
                    ))}
                    {friendsViewSelectedFriends.length > 0 && (
                      <button className={styles.clearTagsBtn} onClick={() => setFriendsViewSelectedFriends([])}>Clear</button>
                    )}
                  </div>
                )}

                {friendsViewShowTagFilter && friendMealTags.length > 0 && (
                  <div className={styles.tagFilters}>
                    {friendMealTags.map((tag) => (
                      <button
                        key={tag}
                        className={`${styles.tagFilter} ${friendsViewSelectedTags.includes(tag) ? styles.tagFilterActive : ""}`}
                        onClick={() => setFriendsViewSelectedTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                    {friendsViewSelectedTags.length > 0 && (
                      <button className={styles.clearTagsBtn} onClick={() => setFriendsViewSelectedTags([])}>Clear</button>
                    )}
                  </div>
                )}
              </div>

              {/* Loading state */}
              {friendsLoading && <p className={styles.emptyMsg} style={{ padding: "20px" }}>Loading…</p>}

              {/* Not logged in */}
              {!user && !friendsLoading && (
                <div className={styles.blankView}>
                  <span className={styles.blankViewIcon}>👥</span>
                  <p className={styles.blankViewTitle}>Sign in to see friends' recipes</p>
                </div>
              )}

              {/* Grouped by friend */}
              {user && !friendsLoading && (
                friendMealsByAuthor.size === 0
                  ? <p className={styles.emptyMsg} style={{ padding: "20px" }}>No results.</p>
                  : <div style={{ paddingBottom: 40 }}>
                      {Array.from(friendMealsByAuthor.entries()).map(([author, authorMeals]) => (
                        <div key={author} className={styles.friendsGroup}>
                          <p className={styles.friendsGroupLabel}>{author}</p>
                          <div className={`${styles.discoverViewGrid} ${styles.friendsGroupGrid}`}>
                            {authorMeals.map((meal) => (
                              <MealCard
                                key={meal.id}
                                meal={{ ...meal, ownerDisplayName: undefined }}
                                onEdit={() => { setEditingMeal(meal); setIsMealModalOpen(true); }}
                                onDelete={() => handleDeleteMeal(meal.id)}
                                isFavourited={isMealFavourited(meal.id)}
                                onFavourite={() => handleToggleFavourite(meal.id, "meal")}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
              )}
            </div>
          )}

          {/* ── LIBRARY VIEW ── */}
          {sidebarView === "library" && (<>

          {/* ── SEARCH RESULTS ── */}
          {isSearching && searchResults && (
            <div className={styles.searchResults}>
              {searchResults.meals.length === 0 && searchResults.snacks.length === 0 && (
                <p className={styles.emptyMsg}>No results for "{search}"</p>
              )}

              {searchResults.meals.length > 0 && (
                <div className={styles.resultSection}>
                  <p className={styles.resultSectionLabel}>Meals</p>
                  <div className={styles.cardList}>
                    {searchResults.meals.map((meal) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        onEdit={() => { setEditingMeal(meal); setIsMealModalOpen(true); }}
                        onDelete={() => handleDeleteMeal(meal.id)}
                        isFavourited={isMealFavourited(meal.id)}
                        onFavourite={() => handleToggleFavourite(meal.id, "meal")}
                      />
                    ))}
                  </div>
                </div>
              )}

              {searchResults.snacks.length > 0 && (
                <div className={styles.resultSection}>
                  <p className={styles.resultSectionLabel}>Snacks</p>
                  <div className={styles.snackList}>
                    {searchResults.snacks.map((snack) => (
                      <SnackPoolItem
                        key={snack.id}
                        snack={snack}
                        isFavourited={isSnackFavourited(snack.id)}
                        onFavourite={() => handleToggleFavourite(snack.id, "snack")}
                        onDragStart={handleDragStartSnack}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BROWSE MODE ── */}
          {!isSearching && (<>
              {/* Favourites */}
              {(favouriteMeals.length > 0 || favouriteSnacks.length > 0) && (
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>★ Favourites</span>
                    <div className={styles.sectionActions}>
                      {favouriteMeals.length > 0 && (
                        <button
                          className={`${styles.filterToggle} ${favShowMeals ? styles.filterToggleActive : ""}`}
                          onClick={toggleFavMeals}
                        >
                          Meals
                        </button>
                      )}
                      {favouriteSnacks.length > 0 && (
                        <button
                          className={`${styles.filterToggle} ${favShowSnacks ? styles.filterToggleActive : ""}`}
                          onClick={toggleFavSnacks}
                        >
                          Snacks
                        </button>
                      )}
                    </div>
                  </div>

                  {favShowMeals && favouriteMeals.length > 0 && (
                    <>
                      {favShowSnacks && favouriteSnacks.length > 0 && (
                        <p className={styles.favouriteSubLabel}>Meals</p>
                      )}
                      <div className={styles.cardList}>
                        {favouriteMeals.map((meal) => (
                          <MealCard
                            key={meal.id}
                            meal={meal}
                            onEdit={() => { setEditingMeal(meal); setIsMealModalOpen(true); }}
                            onDelete={() => handleDeleteMeal(meal.id)}
                            isFavourited={true}
                            onFavourite={() => handleToggleFavourite(meal.id, "meal")}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {favShowSnacks && favouriteSnacks.length > 0 && (
                    <>
                      {favShowMeals && favouriteMeals.length > 0 && (
                        <p className={styles.favouriteSubLabel}>Snacks</p>
                      )}
                      <div className={styles.snackList}>
                        {favouriteSnacks.map((snack) => (
                          <SnackPoolItem
                            key={snack.id}
                            snack={snack}
                            isFavourited={true}
                            onFavourite={() => handleToggleFavourite(snack.id, "snack")}
                            onDragStart={handleDragStartSnack}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}

              {/* Library */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>Library</span>
                  <div className={styles.sectionActions}>
                    <button
                      className={`${styles.filterToggle} ${libShowMeals ? styles.filterToggleActive : ""}`}
                      onClick={toggleLibMeals}
                    >
                      Meals
                    </button>
                    <button
                      className={`${styles.filterToggle} ${libShowSnacks ? styles.filterToggleActive : ""}`}
                      onClick={toggleLibSnacks}
                    >
                      Snacks
                    </button>
                  </div>
                </div>

                {/* ── Meals ── */}
                {libShowMeals && (
                  <>
                    <div className={styles.subSectionHeader}>
                      <span className={styles.favouriteSubLabel}>Meals</span>
                      <button
                        className={styles.newMealBtn}
                        onClick={() => { setEditingMeal(null); setIsMealModalOpen(true); }}
                      >
                        + New
                      </button>
                    </div>

                    {/* Tag filter */}
                    {showTagFilter && allTags.length > 0 && (
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
                          <button className={styles.clearTagsBtn} onClick={() => setSelectedTags([])}>Clear</button>
                        )}
                      </div>
                    )}

                    <div className={styles.cardList}>
                      {visibleMeals.map((meal) => (
                        <MealCard
                          key={meal.id}
                          meal={meal}
                          onEdit={() => { setEditingMeal(meal); setIsMealModalOpen(true); }}
                          onDelete={() => handleDeleteMeal(meal.id)}
                          isFavourited={isMealFavourited(meal.id)}
                          onFavourite={() => handleToggleFavourite(meal.id, "meal")}
                        />
                      ))}
                      {visibleMeals.length === 0 && (
                        <p className={styles.emptyMsg}>
                          {meals.length === 0 ? "No meals yet — create one!" : "No meals match your filters."}
                        </p>
                      )}
                    </div>

                  </>
                )}

                {/* ── Snacks ── */}
                {libShowSnacks && (
                  <>
                    <div className={styles.subSectionHeader}>
                      <span className={styles.favouriteSubLabel}>Snacks</span>
                      <button
                        className={styles.newSnackBtn}
                        onClick={() => { setEditingSnack(null); setIsSnackModalOpen(true); }}
                      >
                        + New
                      </button>
                    </div>

                    <div className={styles.snackSearchContainer}>
                      <input
                        type="text"
                        placeholder="Search snack pool…"
                        className={styles.snackSearchInput}
                        value={snackSearch}
                        onChange={(e) => setSnackSearch(e.target.value)}
                      />
                    </div>

                    {globalSnacksLoading && <p className={styles.emptyMsg}>Loading snacks…</p>}

                    {!globalSnacksLoading && visibleSnacks.length === 0 && trimmedSnackSearch && (
                      <div className={styles.snackNoResults}>
                        <p className={styles.emptyMsg}>Nothing found for "{snackSearch}"</p>
                        <button
                          className={styles.newSnackInlineBtn}
                          onClick={() => { setEditingSnack(null); setIsSnackModalOpen(true); }}
                        >
                          + Create "{snackSearch}"
                        </button>
                      </div>
                    )}

                    {!globalSnacksLoading && (
                      <div className={styles.snackList}>
                        {visibleSnacks.map((snack) => (
                          <SnackPoolItem
                            key={snack.id}
                            snack={snack}
                            isFavourited={isSnackFavourited(snack.id)}
                            onFavourite={() => handleToggleFavourite(snack.id, "snack")}
                            onDragStart={handleDragStartSnack}
                          />
                        ))}
                      </div>
                    )}

                    {!trimmedSnackSearch && !globalSnacksLoading && globalSnacks.length === 0 && (
                      <p className={styles.emptyMsg}>No snacks in pool yet.</p>
                    )}
                  </>
                )}
              </section>
            </>)}

          </>)}
        </div>
      </div>

      <MealFormModal
        isOpen={isMealModalOpen}
        onClose={() => { setIsMealModalOpen(false); setEditingMeal(null); }}
        initialData={editingMeal}
      />
      {isSnackModalOpen && (
        <SnackFormModal
          initialData={editingSnack}
          onClose={() => { setIsSnackModalOpen(false); setEditingSnack(null); }}
        />
      )}
    </>
  );
};

// ── Snack pool item ──────────────────────────────────────────
interface SnackPoolItemProps {
  snack: GlobalIngredient;
  isFavourited: boolean;
  onFavourite: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

const SnackPoolItem: React.FC<SnackPoolItemProps> = ({ snack, isFavourited, onFavourite, onDragStart }) => {
  const gradient = CATEGORY_GRADIENTS[snack.category] ?? CATEGORY_GRADIENTS["Other"];
  const initial = snack.name.trim()[0]?.toUpperCase() ?? "?";

  return (
    <div
      className={styles.snackPoolItem}
      draggable="true"
      onDragStart={(e) => onDragStart(e, snack.id)}
    >
      <div className={styles.snackPoolThumb} style={{ background: gradient }}>
        {snack.photoUrl
          ? <img src={snack.photoUrl} alt={snack.name} className={styles.snackPoolThumbImg} draggable="false" />
          : <span className={styles.snackPoolInitial}>{initial}</span>
        }
      </div>
      <span className={styles.snackPoolName}>{snack.name}</span>
      <button
        className={`${styles.snackStarBtn} ${isFavourited ? styles.snackStarBtnActive : ""}`}
        onClick={(e) => { e.stopPropagation(); onFavourite(); }}
        draggable="false"
        title={isFavourited ? "Remove from Favourites" : "Add to Favourites"}
      >
        {isFavourited ? "★" : "☆"}
      </button>
    </div>
  );
};

