import { useState } from "react";
import { useStore } from "@/store";
import { scaleAmount, unitType, formatDate } from "@/lib/utils";
import { Ingredient } from "@/types";
import styles from "./RecipeDetail.module.css";

export default function RecipeDetail() {
  const {
    recipes, selectedRecipeId, closeDetail,
    toggleFavorite, toggleArchive, duplicateRecipe,
    openEdit, openLog, openCollPick,
  } = useStore();

  const recipe = recipes.find(r => r.id === selectedRecipeId);
  const [servings, setServings] = useState(recipe?.servings ?? 4);
  const [servingInput, setServingInput] = useState(String(recipe?.servings ?? 4));

  if (!recipe) return null;

  const ratio = servings / recipe.servings;

  function handleServingInput(val: string) {
    setServingInput(val);
    const n = parseInt(val);
    if (n >= 1 && n <= 200) setServings(n);
  }

  function adjServings(d: number) {
    const n = Math.max(1, servings + d);
    setServings(n);
    setServingInput(String(n));
  }

  function fmtIng(ing: Ingredient) {
    const sc = scaleAmount(ing, ratio);
    const ut = unitType(ing.unit);
    const ud = (ut === "mass" || ut === "vol") ? "" : ing.unit ? ` ${ing.unit}` : "";
    return `${sc}${ud}`;
  }

  const totalScaledCost = recipe.total_cost * ratio;

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
      <div className={styles.panel}>
        {/* Hero */}
        <div className={styles.hero} style={{ background: recipe.bg_color }}>
          <span className={styles.heroEmoji}>{recipe.emoji}</span>
          <button className={styles.closeBtn} onClick={closeDetail}>×</button>
        </div>

        <div className={styles.body}>
          {/* Tags row */}
          <div className={styles.tagsRow}>
            <span className={styles.badge} style={{ background: "var(--terra-light)", color: "var(--terra)" }}>{recipe.meal_type}</span>
            <span className={styles.badge} style={{ background: "var(--cream-dark)", color: "var(--warm)" }}>{recipe.cuisine}</span>
            {recipe.is_gluten_free && <span className={styles.badge} style={{ background: "var(--olive-light)", color: "var(--olive)" }}>GF</span>}
            {recipe.is_spicy && <span className={styles.badge} style={{ background: "#FEF0E0", color: "#9A5010" }}>Spicy</span>}
            {recipe.is_archived && <span className={styles.badge} style={{ background: "#EEE", color: "var(--warm)" }}>Archived</span>}
          </div>

          {/* Name */}
          <h1 className={styles.name}>{recipe.name}</h1>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              className={`${styles.actionBtn} ${recipe.is_favorite ? styles.favOn : ""}`}
              onClick={() => toggleFavorite(recipe.id)}
            >
              {recipe.is_favorite ? "♥" : "♡"} Favourite
            </button>
            <button className={styles.actionBtn} onClick={() => openEdit(recipe.id)}>✎ Edit</button>
            <button className={styles.actionBtn} onClick={() => { duplicateRecipe(recipe.id); (window as any).__toast?.("Recipe duplicated!"); }}>⎘ Dup</button>
            <button className={styles.actionBtn} onClick={openCollPick}>+ Coll</button>
            <button className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={openLog}>✓ Cooked</button>
            <button className={styles.actionBtn} onClick={() => { toggleArchive(recipe.id); (window as any).__toast?.(recipe.is_archived ? "Recipe unarchived." : "Recipe archived."); }}>
              {recipe.is_archived ? "Unarchive" : "Archive"}
            </button>
          </div>

          {/* Stats */}
          <div className={styles.stats}>
            <Stat label="Prep" value={recipe.prep_time ? `${recipe.prep_time}m` : "—"} />
            <Stat label="Cook" value={`${recipe.cook_time}m`} />
            <Stat label="Cost" value={`~$${totalScaledCost.toFixed(2)} (${servings} srv)`} small />
          </div>

          {recipe.description && <p className={styles.desc}>{recipe.description}</p>}

          {/* Recipe tags */}
          {recipe.tags?.length > 0 && (
            <div className={styles.pillRow}>
              {recipe.tags.map(t => <span key={t} className="tag-pill">{t}</span>)}
            </div>
          )}

          {/* Serving scaler */}
          <div className={styles.scaler}>
            <span className={styles.scalerLabel}>Servings</span>
            <div className={styles.scalerRight}>
              <span className={styles.scalerHint}>Scale to:</span>
              <input
                className={styles.scalerInput}
                type="number"
                min={1}
                max={200}
                value={servingInput}
                onChange={e => handleServingInput(e.target.value)}
              />
              <button className={styles.scalerBtn} onClick={() => adjServings(-1)}>−</button>
              <span className={styles.scalerVal}>{servings}</span>
              <button className={styles.scalerBtn} onClick={() => adjServings(1)}>+</button>
            </div>
          </div>

          {/* Ingredients */}
          <div className={styles.sectionTitle}>Ingredients</div>
          <div className={styles.ingList}>
            {recipe.ingredients?.map(ing => (
              <div key={ing.id} className={styles.ingRow}>
                <span className={styles.ingAmt}>{fmtIng(ing)}</span>
                <span className={styles.ingName}>{ing.name}</span>
              </div>
            ))}
          </div>

          {/* Method */}
          <div className={styles.sectionTitle}>Method</div>
          <div className={styles.stepList}>
            {recipe.steps?.map((step, i) => (
              <div key={step.id} className={styles.stepRow}>
                <div className={styles.stepNum}>{i + 1}</div>
                <div className={styles.stepContent}>{step.content}</div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {recipe.notes && (
            <>
              <div className={styles.sectionTitle}>Notes</div>
              <p className={styles.notes}>{recipe.notes}</p>
            </>
          )}

          {/* Cook log */}
          <div className={styles.sectionTitle}>Cook Log</div>
          {recipe.cookLog?.length > 0 ? (
            <div className={styles.logList}>
              {recipe.cookLog.map(entry => (
                <div key={entry.id} className={styles.logEntry}>
                  <div className={styles.logDate}>
                    {formatDate(entry.cooked_at)}
                    {entry.rating > 0 && (
                      <span className={styles.logStars}> {"★".repeat(entry.rating)}</span>
                    )}
                  </div>
                  {entry.notes && <div className={styles.logNote}>{entry.notes}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.logEmpty}>No cooks logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statVal} style={{ fontSize: small ? "11px" : "13px" }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}
