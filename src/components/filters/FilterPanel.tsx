import { useStore } from "@/store";
import { SortOption } from "@/types";
import styles from "./FilterPanel.module.css";

interface Props {
  allCuisines: string[];
  allTags: string[];
  maxRecipeTime: number;
}

export default function FilterPanel({ allCuisines, allTags, maxRecipeTime }: Props) {
  const { filters, setFilter, clearFilters } = useStore();

  const timeLabel = filters.maxTime >= 100
    ? "Any"
    : `${Math.round((filters.maxTime / 100) * maxRecipeTime)}m`;

  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span>Filters</span>
        <button className={styles.closeBtn} onClick={clearFilters}>Clear all</button>
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
            type="range" min={0} max={100} step={1}
            value={filters.maxTime}
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
          {[1,2,3,4,5].map(n => (
            <span
              key={n}
              className={`star ${filters.minRating >= n ? "on" : ""}`}
              onClick={() => setFilter("minRating", filters.minRating === n ? 0 : n)}
            >★</span>
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
