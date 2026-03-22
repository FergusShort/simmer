import { useState, useMemo } from "react";
import { useStore, useFilteredRecipes } from "@/store";
import RecipeCard from "./RecipeCard";
import FilterPanel from "@/components/filters/FilterPanel";
import styles from "./LibraryView.module.css";

export default function LibraryView() {
  const { recipes, filters, setFilter, clearFilters } = useStore();
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const filtered = useFilteredRecipes();

  const activeRecipes = useMemo(
    () => recipes.filter(r => !r.is_archived),
    [recipes]
  );

  const allCuisines = useMemo(
    () =>
      [...new Set(
        activeRecipes
          .map(r => (r.cuisine || "").trim())
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b)),
    [activeRecipes]
  );

  const allTags = useMemo(
    () =>
      [...new Set(
        activeRecipes
          .flatMap(r => r.tags || [])
          .map(t => t.trim())
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b)),
    [activeRecipes]
  );

  const maxTime = useMemo(
    () => Math.max(...activeRecipes.map(r => Number(r.total_time) || 0), 30),
    [activeRecipes]
  );

  const timeChipValue = useMemo(() => {
    const raw = Number(filters.maxTime);

    if (!Number.isFinite(raw)) return maxTime;
    if (raw < 0) return 0;
    if (raw > maxTime) return maxTime;

    return Math.round(raw);
  }, [filters.maxTime, maxTime]);

  // Active filter chips
  const chips: { label: string; key: string }[] = [];
  if (filters.isVegetarian) chips.push({ label: "Vegetarian", key: "isVegetarian" });
  if (filters.isVegan) chips.push({ label: "Vegan", key: "isVegan" });
  if (filters.isGlutenFree) chips.push({ label: "Gluten-free", key: "isGlutenFree" });
  if (filters.isDairyFree) chips.push({ label: "Dairy-free", key: "isDairyFree" });
  if (filters.isHighProtein) chips.push({ label: "High protein", key: "isHighProtein" });
  if (filters.isMealPrep) chips.push({ label: "Meal prep", key: "isMealPrep" });
  if (filters.isSpicy) chips.push({ label: "Spicy", key: "isSpicy" });
  if (filters.isFavouritesOnly) chips.push({ label: "Favourites", key: "isFavouritesOnly" });
  if (filters.isQuick) chips.push({ label: "Quick", key: "isQuick" });
  if (timeChipValue < maxTime) chips.push({ label: `≤${timeChipValue}m`, key: "maxTime" });
  if (filters.minRating > 0) chips.push({ label: `${"★".repeat(filters.minRating)}+`, key: "minRating" });
  filters.cuisines.forEach(c => chips.push({ label: c, key: `cuisine:${c}` }));
  filters.tags.forEach(t => chips.push({ label: `#${t}`, key: `tag:${t}` }));

  function removeChip(key: string) {
    if (key.startsWith("cuisine:")) {
      setFilter("cuisines", filters.cuisines.filter(c => c !== key.slice(8)));
    } else if (key.startsWith("tag:")) {
      setFilter("tags", filters.tags.filter(t => t !== key.slice(4)));
    } else if (key === "maxTime") {
      setFilter("maxTime", Number.MAX_SAFE_INTEGER);
    } else if (key === "minRating") {
      setFilter("minRating", 0);
    } else {
      setFilter(key as any, false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.search}
            type="text"
            placeholder="Search recipes, ingredients, tags…"
            value={filters.search}
            onChange={e => setFilter("search", e.target.value)}
          />
        </div>

        <div className={styles.vtog}>
          <button
            type="button"
            className={`${styles.vb} ${viewMode === "grid" ? styles.vbOn : ""}`}
            onClick={() => setViewMode("grid")}
          >
            ⊞
          </button>
          <button
            type="button"
            className={`${styles.vb} ${viewMode === "list" ? styles.vbOn : ""}`}
            onClick={() => setViewMode("list")}
          >
            ☰
          </button>
        </div>

        <button
          type="button"
          className={`${styles.filterBtn} ${showFilters ? styles.filterBtnOn : ""}`}
          onClick={() => setShowFilters(v => !v)}
        >
          ⚡ Filters
        </button>
      </div>

      {chips.length > 0 && (
        <div className={styles.chipsRow}>
          {chips.map(c => (
            <span key={c.key} className={styles.chip}>
              {c.label}
              <button type="button" className={styles.chipX} onClick={() => removeChip(c.key)}>
                ×
              </button>
            </span>
          ))}
          <button type="button" className={styles.clearAll} onClick={clearFilters}>
            Clear all
          </button>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.recipeArea}>
          <div className={styles.resultHeader}>
            <span className={styles.count}>
              {filtered.length} recipe{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyEmoji}>🍽️</div>
              <div className={styles.emptyTitle}>No recipes found</div>
              <div className={styles.emptyDesc}>
                {recipes.length === 0
                  ? "Use AI Import to add your first recipe."
                  : "Try clearing some filters."}
              </div>
              {chips.length > 0 && (
                <button type="button" className={styles.clearFiltersBtn} onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className={styles.grid}>
              {filtered.map(r => <RecipeCard key={r.id} recipe={r} mode="grid" />)}
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map(r => <RecipeCard key={r.id} recipe={r} mode="list" />)}
            </div>
          )}
        </div>

        {showFilters && (
          <FilterPanel
            allCuisines={allCuisines}
            allTags={allTags}
            maxRecipeTime={maxTime}
          />
        )}
      </div>
    </div>
  );
}