import { useEffect, useMemo } from "react";
import { useStore } from "@/store";
import { SortOption } from "@/types";
import styles from "./FilterPanel.module.css";

interface Props {
  allCuisines?: string[];
  allTags?: string[];
  maxRecipeTime?: number;
}

export default function FilterPanel(_: Props) {
  const { recipes, filters, setFilter, clearFilters } = useStore();

  const filterSourceRecipes = useMemo(
    () => recipes.filter(r => !r.is_archived),
    [recipes]
  );

  const allCuisines = useMemo(() => {
    return [...new Set(
      filterSourceRecipes
        .map(r => (r.cuisine ?? "").trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }, [filterSourceRecipes]);

  const allTags = useMemo(() => {
    return [...new Set(
      filterSourceRecipes
        .flatMap(r => r.tags ?? [])
        .map(tag => tag.trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }, [filterSourceRecipes]);

  const maxRecipeTime = useMemo(() => {
    const times = filterSourceRecipes
      .map(r => Number(r.total_time) || 0)
      .filter(t => t > 0);

    return times.length > 0 ? Math.max(...times) : 30;
  }, [filterSourceRecipes]);

  const sliderMax = useMemo(() => {
    return Math.max(1, Math.ceil(maxRecipeTime));
  }, [maxRecipeTime]);

  const rawMaxTime = Number(filters.maxTime);

  const safeMaxTime = useMemo(() => {
    if (!Number.isFinite(rawMaxTime)) return sliderMax;
    if (rawMaxTime < 0) return 0;
    if (rawMaxTime > sliderMax) return sliderMax;
    return Math.round(rawMaxTime);
  }, [rawMaxTime, sliderMax]);

  const timeLabel = safeMaxTime >= sliderMax ? "Any" : `${safeMaxTime}m`;

  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  useEffect(() => {
    const validTags = filters.tags.filter(tag => allTags.includes(tag));
    if (validTags.length !== filters.tags.length) {
      setFilter("tags", validTags);
    }

    const validCuisines = filters.cuisines.filter(cuisine => allCuisines.includes(cuisine));
    if (validCuisines.length !== filters.cuisines.length) {
      setFilter("cuisines", validCuisines);
    }
  }, [allTags, allCuisines, filters.tags, filters.cuisines, setFilter]);

  useEffect(() => {
    if (!Number.isFinite(rawMaxTime)) {
      setFilter("maxTime", sliderMax);
      return;
    }

    // Old setup used 100 as "Any". If the dataset max is now above 100,
    // treat that legacy value as the new max.
    if (rawMaxTime === 100 && sliderMax > 100) {
      setFilter("maxTime", sliderMax);
      return;
    }

    if (rawMaxTime < 0) {
      setFilter("maxTime", 0);
      return;
    }

    if (rawMaxTime > sliderMax) {
      setFilter("maxTime", sliderMax);
    }
  }, [rawMaxTime, sliderMax, setFilter]);

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span>Filters</span>
        <button type="button" className={styles.closeBtn} onClick={clearFilters}>
          Clear all
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Sort</div>
        <select
          className={styles.select}
          value={filters.sort}
          onChange={e => setFilter("sort", e.target.value as SortOption)}
        >
          <option value="newest">Newest added</option>
          <option value="name">Name A–Z</option>
          <option value="rated">Highest rated</option>
          <option value="time">Fastest</option>
          <option value="cooked">Recently cooked</option>
        </select>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Dietary</div>
        {[
          ["isVegetarian", "Vegetarian"],
          ["isVegan", "Vegan"],
          ["isGlutenFree", "Gluten-free"],
          ["isDairyFree", "Dairy-free"],
          ["isHighProtein", "High protein"],
          ["isMealPrep", "Meal prep"],
          ["isSpicy", "Spicy"],
        ].map(([key, label]) => (
          <label key={key} className={styles.checkRow}>
            <input
              type="checkbox"
              checked={(filters as any)[key]}
              onChange={e => setFilter(key as any, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Max total time</div>
        <div className={styles.sliderRow}>
          <input
            type="range"
            min={0}
            max={sliderMax}
            step={1}
            value={safeMaxTime}
            onChange={e => setFilter("maxTime", Number(e.target.value))}
            className={styles.slider}
          />
          <span className={styles.sliderVal}>{timeLabel}</span>
        </div>
      </div>

      {allCuisines.length > 0 && (
        <div className={styles.section}>
          <div className={styles.label}>Cuisine</div>
          <div className={styles.pills}>
            {allCuisines.map(c => (
              <button
                type="button"
                key={c}
                className={`${styles.pill} ${filters.cuisines.includes(c) ? styles.pillOn : ""}`}
                onClick={() => setFilter("cuisines", toggleArr(filters.cuisines, c))}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {allTags.length > 0 && (
        <div className={styles.section}>
          <div className={styles.label}>Tags</div>
          <div className={styles.pills}>
            {allTags.map(t => (
              <button
                type="button"
                key={t}
                className={`${styles.pill} ${filters.tags.includes(t) ? styles.pillOn : ""}`}
                onClick={() => setFilter("tags", toggleArr(filters.tags, t))}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.label}>Min rating</div>
        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map(n => (
            <span
              key={n}
              className={`star ${filters.minRating >= n ? "on" : ""}`}
              onClick={() => setFilter("minRating", filters.minRating === n ? 0 : n)}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Special</div>
        {[
          ["isFavouritesOnly", "Favourites only"],
          ["isQuick", "Quick ≤30 min"],
          ["showArchived", "Show archived"],
        ].map(([key, label]) => (
          <label key={key} className={styles.checkRow}>
            <input
              type="checkbox"
              checked={(filters as any)[key]}
              onChange={e => setFilter(key as any, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
    </aside>
  );
}