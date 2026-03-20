import { useStore } from "@/store";
import styles from "./CollectionPickModal.module.css";

export default function CollectionPickModal() {
  const { recipes, collections, selectedRecipeId, closeCollPick, toggleRecipeCollection } = useStore();
  const recipe = recipes.find(r => r.id === selectedRecipeId);
  if (!recipe) return null;

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) closeCollPick(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>Add to Collection</span>
          <button className={styles.closeBtn} onClick={closeCollPick}>×</button>
        </div>
        <div className={styles.list}>
          {collections.map(c => {
            const inColl = recipe.collections?.includes(c.id);
            return (
              <div
                key={c.id}
                className={styles.item}
                onClick={() => toggleRecipeCollection(recipe.id, c.id, !inColl)}
              >
                <div
                  className={styles.checkbox}
                  style={{ borderColor: c.color, background: inColl ? c.color : "transparent" }}
                />
                <div className={styles.dot} style={{ background: c.color }} />
                <span className={styles.collName}>{c.name}</span>
                <span className={styles.count}>{c.recipe_count ?? 0}</span>
              </div>
            );
          })}
        </div>
        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={closeCollPick}>Done</button>
        </div>
      </div>
    </div>
  );
}
