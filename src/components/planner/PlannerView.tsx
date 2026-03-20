import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { getWeekDates, isToday, isPast, formatShortDate, aggregateIngredients } from "@/lib/utils";
import styles from "./PlannerView.module.css";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const SLOTS = ["Breakfast","Lunch","Dinner"] as const;

export default function PlannerView() {
  const { recipes, mealPlan, plannerWeekOffset, setPlannerWeek, setMealSlot, loadWeekPlan } = useStore();
  const [pickTarget, setPickTarget] = useState<{ day: number; slot: string } | null>(null);
  const [pickSearch, setPickSearch] = useState("");

  useEffect(() => { loadWeekPlan(plannerWeekOffset); }, [plannerWeekOffset]);

  const dates = getWeekDates(
    (() => {
      const now = new Date();
      now.setDate(now.getDate() + plannerWeekOffset * 7);
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      mon.setHours(0,0,0,0);
      return mon.toISOString().slice(0,10);
    })()
  );

  function getEntry(dayIdx: number, slot: string) {
    return mealPlan.find(e => e.day_of_week === dayIdx && e.meal_slot === slot);
  }

  function getRecipe(id: string | null | undefined) {
    if (!id) return null;
    return recipes.find(r => r.id === id) ?? null;
  }

  async function handleSetServings(dayIdx: number, slot: string, delta: number) {
    const entry = getEntry(dayIdx, slot);
    if (!entry?.recipe_id) return;
    const newSrv = Math.max(1, (entry.servings || 1) + delta);
    await setMealSlot(dayIdx, slot, entry.recipe_id, newSrv);
  }

  async function handleClear(dayIdx: number, slot: string) {
    await setMealSlot(dayIdx, slot, null, 1);
  }

  async function handlePick(recipeId: string) {
    if (!pickTarget) return;
    const r = recipes.find(x => x.id === recipeId);
    await setMealSlot(pickTarget.day, pickTarget.slot, recipeId, r?.servings ?? 4);
    setPickTarget(null);
    setPickSearch("");
  }

  // Shopping list
  const shopPairs = mealPlan
    .filter(e => !!e.recipe_id)
    .map(e => {
      const r = getRecipe(e.recipe_id);
      if (!r) return null;
      return { ingredients: r.ingredients, baseServings: r.servings, scaledServings: e.servings };
    })
    .filter(Boolean) as { ingredients: any[]; baseServings: number; scaledServings: number }[];

  const shopItems = aggregateIngredients(shopPairs);

  const weekLabel = `${formatShortDate(dates[0].toISOString())} – ${formatShortDate(dates[6].toISOString())}`;
  const filteredRecipes = pickSearch
    ? recipes.filter(r => !r.is_archived && r.name.toLowerCase().includes(pickSearch.toLowerCase()))
    : recipes.filter(r => !r.is_archived);

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div className={styles.weekNav}>
          <button className={styles.navBtn} onClick={() => setPlannerWeek(plannerWeekOffset - 1)}>← Prev</button>
          <span className={styles.weekLabel}>{weekLabel}</span>
          <button className={styles.navBtn} onClick={() => setPlannerWeek(plannerWeekOffset + 1)}>Next →</button>
        </div>
        <span className={styles.hint}>Past days are locked history</span>
      </div>

      <div className={styles.content}>
        <div className={styles.weekCol}>
          {DAYS.map((day, dayIdx) => {
            const date = dates[dayIdx];
            const past = isPast(date);
            const today = isToday(date);
            return (
              <div key={day} className={`${styles.dayCard} ${today ? styles.dayToday : ""}`}>
                <div className={styles.dayHeader} style={{ background: today ? "var(--terra-light)" : past ? "rgba(237,233,224,0.7)" : "var(--cream-dark)" }}>
                  <span className={styles.dayName}>
                    {date.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  {today && <span className={styles.todayBadge}>Today</span>}
                  {past && !today && <span className={styles.pastBadge}>Past</span>}
                </div>
                <div className={styles.slots}>
                  {SLOTS.map(slot => {
                    const entry = getEntry(dayIdx, slot);
                    const r = getRecipe(entry?.recipe_id);
                    const locked = past && !today;
                    return (
                      <div key={slot} className={styles.slot}>
                        <span className={styles.slotLabel}>{slot}</span>
                        <span
                          className={`${styles.slotRecipe} ${r ? styles.slotFilled : styles.slotEmpty}`}
                          onClick={() => !locked && setPickTarget({ day: dayIdx, slot })}
                          style={{ cursor: locked ? "default" : "pointer" }}
                        >
                          {r ? r.name : locked ? "—" : "+ Add meal"}
                        </span>
                        {r && !locked && (
                          <>
                            <div className={styles.srvCtrl}>
                              <button className={styles.srvBtn} onClick={() => handleSetServings(dayIdx, slot, -1)}>−</button>
                              <span className={styles.srvVal}>{entry?.servings ?? 1}</span>
                              <button className={styles.srvBtn} onClick={() => handleSetServings(dayIdx, slot, 1)}>+</button>
                              <span className={styles.srvLbl}>srv</span>
                            </div>
                            <button className={styles.clearBtn} onClick={() => handleClear(dayIdx, slot)}>×</button>
                          </>
                        )}
                        {r && locked && (
                          <span className={styles.srvLockedLbl}>{entry?.servings ?? 1} srv</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Shopping list */}
        <div className={styles.shopCol}>
          <div className={styles.shopHeader}>
            Shopping List
            <span className={styles.shopCount}>{shopItems.length} items</span>
          </div>
          {shopItems.length === 0 ? (
            <p className={styles.shopEmpty}>Add meals to generate your shopping list.</p>
          ) : (
            shopItems.map(item => (
              <div key={item.name} className={styles.shopItem}>
                <span className={styles.shopAmt}>{item.display}</span>
                <span>{item.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recipe picker modal */}
      {pickTarget && (
        <div className={styles.pickerBackdrop} onClick={e => { if (e.target === e.currentTarget) setPickTarget(null); }}>
          <div className={styles.pickerModal}>
            <div className={styles.pickerHeader}>
              <span>{DAYS[pickTarget.day]} — {pickTarget.slot}</span>
              <button className={styles.pickerClose} onClick={() => setPickTarget(null)}>×</button>
            </div>
            <div className={styles.pickerSearch}>
              <input
                type="text"
                placeholder="Search recipes…"
                value={pickSearch}
                onChange={e => setPickSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.pickerList}>
              {filteredRecipes.map(r => (
                <div key={r.id} className={styles.pickerItem} onClick={() => handlePick(r.id)}>
                  <span className={styles.pickerEmoji}>{r.emoji}</span>
                  <div>
                    <div className={styles.pickerName}>{r.name}</div>
                    <div className={styles.pickerMeta}>{r.cuisine} · ⏱ {r.total_time}m · {r.servings} srv</div>
                  </div>
                </div>
              ))}
              {filteredRecipes.length === 0 && (
                <div className={styles.pickerEmpty}>No recipes found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
