import { useState } from "react";
import { useStore } from "@/store";
import styles from "./CookLogModal.module.css";

export default function CookLogModal() {
  const { selectedRecipeId, closeLog, addCookLog } = useStore();
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");

  async function handleSave() {
    if (!selectedRecipeId) return;
    await addCookLog(selectedRecipeId, rating, notes.trim());
    (window as any).__toast?.("Cook logged!");
    closeLog();
  }

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) closeLog(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>Log a Cook</span>
          <button className={styles.closeBtn} onClick={closeLog}>×</button>
        </div>
        <div className={styles.body}>
          <div className={styles.label}>How did it go?</div>
          <div className="stars" style={{ marginBottom: 16 }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} className={`star ${rating >= n ? "on" : ""}`} onClick={() => setRating(rating === n ? 0 : n)}>★</span>
            ))}
          </div>
          <div className={styles.label}>Notes (optional)</div>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Added extra garlic, used 500g chicken, cooked 5 mins longer…"
            rows={4}
            autoFocus
          />
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={closeLog}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave}>Save Cook</button>
        </div>
      </div>
    </div>
  );
}
