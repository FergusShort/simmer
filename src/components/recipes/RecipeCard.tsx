import { Recipe } from "@/types";
import { useStore } from "@/store";
import styles from "./RecipeCard.module.css";

interface Props {
  recipe: Recipe;
  mode: "grid" | "list";
}

export default function RecipeCard({ recipe: r, mode }: Props) {
  const { openDetail, toggleFavorite } = useStore();

  function handleFav(e: React.MouseEvent) {
    e.stopPropagation();
    toggleFavorite(r.id);
  }

  if (mode === "list") {
    return (
      <div className={styles.listItem} onClick={() => openDetail(r.id)}>
        <div className={styles.listEmoji} style={{ opacity: r.is_archived ? 0.5 : 1 }}>
          {r.emoji}
        </div>
        <div className={styles.listInfo}>
          <div className={styles.listName}>{r.name}</div>
          <div className={styles.listMeta}>
            <span className={styles.mealTag} style={{ background: "var(--terra-light)", color: "var(--terra)" }}>
              {r.meal_type}
            </span>
            <span>{r.cuisine}</span>
            <span>⏱ {r.total_time}m</span>
            <span>{stars(r.rating)}</span>
            {r.is_archived && <span className={styles.archivedBadge}>Archived</span>}
          </div>
          {r.tags?.length > 0 && (
            <div className={styles.tagRow}>
              {r.tags.map(t => <span key={t} className="tag-pill">{t}</span>)}
            </div>
          )}
        </div>
        <div className={styles.listRight}>
          <button className={styles.favBtn} onClick={handleFav} style={{ color: r.is_favorite ? "var(--terra)" : "var(--warm)" }}>
            {r.is_favorite ? "♥" : "♡"}
          </button>
          <span className={styles.cost}>~${r.total_cost.toFixed(2)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card} onClick={() => openDetail(r.id)}>
      <div className={styles.imgWrap}>
        <div className={styles.imgPlaceholder} style={{ background: r.bg_color, opacity: r.is_archived ? 0.6 : 1 }}>
          {r.emoji}
        </div>
        <button className={styles.favBtn} onClick={handleFav} style={{ color: r.is_favorite ? "var(--terra)" : "var(--warm)" }}>
          {r.is_favorite ? "♥" : "♡"}
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.mealTag} style={{ background: "var(--terra-light)", color: "var(--terra)" }}>
            {r.meal_type}
          </span>
          <span className={styles.mealTag} style={{ background: "var(--cream-dark)", color: "var(--warm)" }}>
            {r.cuisine}
          </span>
          {r.is_gluten_free && (
            <span className={styles.mealTag} style={{ background: "var(--olive-light)", color: "var(--olive)" }}>GF</span>
          )}
          {r.is_archived && <span className={styles.archivedBadge}>Archived</span>}
        </div>
        <div className={styles.name}>{r.name}</div>
        <div className={styles.stats}>
          <span>{stars(r.rating)}</span>
          <span>⏱ {r.total_time}m</span>
          <span>~${r.total_cost.toFixed(2)}</span>
        </div>
        {r.tags?.length > 0 && (
          <div className={styles.tagRow}>
            {r.tags.slice(0, 3).map(t => <span key={t} className="tag-pill">{t}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function stars(n: number) {
  return "★".repeat(n || 0) + "☆".repeat(5 - (n || 0));
}
