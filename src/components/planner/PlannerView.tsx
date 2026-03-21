import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store";
import {
  getWeekDates,
  isToday,
  isPast,
  formatShortDate,
  aggregateIngredients,
} from "@/lib/utils";
import styles from "./PlannerView.module.css";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const SLOTS = ["Breakfast", "Lunch", "Dinner"] as const;
type Slot = (typeof SLOTS)[number];

type MealPlanItem = {
  id: string;
  day_of_week: number | string;
  meal_slot: string;
  recipe_id?: string | null;
  servings?: number | null;
  notes?: string | null;
  include_in_shopping_list?: boolean | number | null;
  sort_order?: number | null;
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function formatInputDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseInputDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function ListIcon() {
  return (
    <svg viewBox="0 0 20 20" className={styles.iconSvg} aria-hidden="true">
      <path d="M6 5.5h10" />
      <path d="M6 10h10" />
      <path d="M6 14.5h10" />
      <path d="M3.5 5.5h.01" />
      <path d="M3.5 10h.01" />
      <path d="M3.5 14.5h.01" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 20 20" className={styles.iconSvg} aria-hidden="true">
      <path d="M10.5 4.5l5 5" />
      <path d="M4.5 15.5l3.3-.7 7-7a1.4 1.4 0 0 0 0-2l-.6-.6a1.4 1.4 0 0 0-2 0l-7 7-.7 3.3Z" />
      <path d="M4.5 15.5 5 13" />
    </svg>
  );
}

export default function PlannerView() {
  const {
    recipes,
    mealPlan,
    plannerWeekOffset,
    setPlannerWeek,
    loadWeekPlan,
    addMealPlanItem,
    updateMealPlanItem,
    removeMealPlanItem,
  } = useStore();

  const [pickTarget, setPickTarget] = useState<{
    day: number;
    slot: Slot;
    entryId?: string;
  } | null>(null);

  const [pickSearch, setPickSearch] = useState("");
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadWeekPlan(plannerWeekOffset);
  }, [plannerWeekOffset, loadWeekPlan]);

  const currentWeekMonday = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + plannerWeekOffset * 7);
    return startOfWeek(now);
  }, [plannerWeekOffset]);

  const dates = getWeekDates(formatInputDate(currentWeekMonday));

  function getEntries(dayIdx: number, slot: Slot) {
    return (mealPlan as MealPlanItem[])
      .filter(
        (e) => Number(e.day_of_week) === dayIdx && e.meal_slot === slot,
      )
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  }

  function getRecipe(id: string | null | undefined) {
    if (!id) return null;
    return recipes.find((r) => r.id === id) ?? null;
  }

  async function handleSetServings(item: MealPlanItem, delta: number) {
    const newServings = Math.max(1, Number(item.servings || 1) + delta);
    await updateMealPlanItem(item.id, { servings: newServings });
  }

  async function handleClear(itemId: string) {
    await removeMealPlanItem(itemId);
  }

  async function handlePick(recipeId: string) {
    if (!pickTarget) return;

    const recipe = recipes.find((x) => x.id === recipeId);
    const servings = recipe?.servings ?? 4;

    if (pickTarget.entryId) {
      await updateMealPlanItem(pickTarget.entryId, {
        recipe_id: recipeId,
        servings,
      });
    } else {
      await addMealPlanItem(pickTarget.day, pickTarget.slot, recipeId, servings);
    }

    setPickTarget(null);
    setPickSearch("");
  }

  async function handleToggleShopping(item: MealPlanItem) {
    await updateMealPlanItem(item.id, {
      include_in_shopping_list: !(item.include_in_shopping_list ?? true),
    });
  }

  function handleToggleNote(item: MealPlanItem) {
    setOpenNotes((prev) => ({
      ...prev,
      [item.id]: !prev[item.id],
    }));

    setNoteDrafts((prev) => {
      if (item.id in prev) return prev;
      return { ...prev, [item.id]: item.notes ?? "" };
    });
  }

  async function handleSaveNote(item: MealPlanItem) {
    const draft = noteDrafts[item.id] ?? "";
    const current = item.notes ?? "";
    if (draft === current) return;

    await updateMealPlanItem(item.id, { notes: draft });
  }

  function openDatePicker() {
    const input = dateInputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;

    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  }

  function handleDateJump(value: string) {
    if (!value) return;

    const pickedDate = parseInputDate(value);
    const pickedWeekMonday = startOfWeek(pickedDate);
    const thisWeekMonday = startOfWeek(new Date());

    const diffMs = pickedWeekMonday.getTime() - thisWeekMonday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

    setPlannerWeek(diffWeeks);
  }

  const shopPairs = (mealPlan as MealPlanItem[])
    .filter((e) => !!e.recipe_id && (e.include_in_shopping_list ?? true))
    .map((e) => {
      const recipe = getRecipe(e.recipe_id);
      if (!recipe) return null;

      return {
        ingredients: recipe.ingredients,
        baseServings: recipe.servings,
        scaledServings: Number(e.servings || 1),
      };
    })
    .filter(Boolean) as {
    ingredients: any[];
    baseServings: number;
    scaledServings: number;
  }[];

  const shopItems = aggregateIngredients(shopPairs);

  const weekYear = String(dates[6].getFullYear()).slice(-2);
  const weekLabel = `${formatShortDate(dates[0])} – ${formatShortDate(dates[6])} '${weekYear}`;

  const filteredRecipes = pickSearch
    ? recipes.filter(
        (r) =>
          !r.is_archived &&
          r.name.toLowerCase().includes(pickSearch.toLowerCase()),
      )
    : recipes.filter((r) => !r.is_archived);

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div className={styles.weekNav}>
          <button
            className={styles.navBtn}
            onClick={() => setPlannerWeek(plannerWeekOffset - 1)}
          >
            ← Prev
          </button>

          <button
            type="button"
            className={styles.weekLabelBtn}
            onClick={openDatePicker}
            title="Pick a date"
          >
            {weekLabel}
          </button>

          <input
            ref={dateInputRef}
            type="date"
            className={styles.weekPickerInput}
            value={formatInputDate(currentWeekMonday)}
            onChange={(e) => handleDateJump(e.target.value)}
            aria-label="Pick planner week"
          />

          <button
            className={styles.navBtn}
            onClick={() => setPlannerWeek(plannerWeekOffset + 1)}
          >
            Next →
          </button>
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
              <div
                key={day}
                className={`${styles.dayCard} ${today ? styles.dayToday : ""}`}
              >
                <div
                  className={styles.dayHeader}
                  style={{
                    background: today
                      ? "var(--terra-light)"
                      : past
                        ? "rgba(237,233,224,0.7)"
                        : "var(--cream-dark)",
                  }}
                >
                  <span className={styles.dayName}>
                    {date.toLocaleDateString("en-NZ", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {today && <span className={styles.todayBadge}>Today</span>}
                  {past && !today && (
                    <span className={styles.pastBadge}>Past</span>
                  )}
                </div>

                <div className={styles.slots}>
                  {SLOTS.map((slot) => {
                    const entries = getEntries(dayIdx, slot);
                    const locked = past && !today;

                    return (
                      <div key={slot} className={styles.slotSection}>
                        <div className={styles.slotHeaderRow}>
                          <span className={styles.slotLabel}>{slot}</span>
                        </div>

                        <div className={styles.slotBody}>
                          {entries.length === 0 ? (
                            <div className={styles.slotEmptyRow}>
                              <span
                                className={styles.slotEmptyClickable}
                                onClick={() =>
                                  !locked && setPickTarget({ day: dayIdx, slot })
                                }
                                style={{ cursor: locked ? "default" : "pointer" }}
                              >
                                {locked ? "—" : "+ Add meal"}
                              </span>
                            </div>
                          ) : (
                            entries.map((item) => {
                              const recipe = getRecipe(item.recipe_id);
                              const noteValue = (noteDrafts[item.id] ?? item.notes ?? "").trim();
                              const hasNote = noteValue.length > 0;
                              const noteOpen = !!openNotes[item.id];

                              return (
                                <div key={item.id} className={styles.mealBlock}>
                                  <div className={styles.mealRow}>
                                    <button
                                      type="button"
                                      className={`${styles.iconBtn} ${
                                        (item.include_in_shopping_list ?? true)
                                          ? styles.iconBtnActive
                                          : ""
                                      }`}
                                      title="Include in shopping list"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!locked) handleToggleShopping(item);
                                      }}
                                      disabled={locked}
                                    >
                                      <ListIcon />
                                    </button>

                                    <button
                                      type="button"
                                      className={`${styles.iconBtn} ${
                                        noteOpen ? styles.iconBtnActive : ""
                                      } ${hasNote ? styles.iconBtnHasNote : ""}`}
                                      title="Meal notes"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleNote(item);
                                      }}
                                    >
                                      <NoteIcon />
                                      {hasNote && !noteOpen && (
                                        <span
                                          className={styles.noteIndicator}
                                          aria-hidden="true"
                                        />
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      className={styles.recipeBtn}
                                      onClick={() =>
                                        !locked &&
                                        setPickTarget({
                                          day: dayIdx,
                                          slot,
                                          entryId: item.id,
                                        })
                                      }
                                      disabled={locked}
                                    >
                                      <span
                                        className={`${styles.slotRecipe} ${
                                          recipe ? styles.slotFilled : styles.slotEmpty
                                        }`}
                                      >
                                        {recipe ? recipe.name : "Unknown recipe"}
                                      </span>
                                    </button>

                                    {!locked && (
                                      <>
                                        <div className={styles.srvCtrl}>
                                          <button
                                            className={styles.srvBtn}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSetServings(item, -1);
                                            }}
                                          >
                                            −
                                          </button>
                                          <span className={styles.srvVal}>
                                            {Number(item.servings ?? 1)}
                                          </span>
                                          <button
                                            className={styles.srvBtn}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSetServings(item, 1);
                                            }}
                                          >
                                            +
                                          </button>
                                          <span className={styles.srvLbl}>srv</span>
                                        </div>

                                        <button
                                          className={styles.clearBtn}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleClear(item.id);
                                          }}
                                        >
                                          ×
                                        </button>
                                      </>
                                    )}

                                    {locked && (
                                      <span className={styles.srvLockedLbl}>
                                        {Number(item.servings ?? 1)} srv
                                      </span>
                                    )}
                                  </div>

                                  <div
                                    className={`${styles.noteCollapse} ${
                                      noteOpen ? styles.noteCollapseOpen : ""
                                    }`}
                                  >
                                    <div className={styles.noteCollapseInner}>
                                      <div className={styles.noteWrap}>
                                        {locked ? (
                                          <div className={styles.noteText}>
                                            {item.notes || "No note"}
                                          </div>
                                        ) : (
                                          <textarea
                                            className={styles.noteInput}
                                            placeholder="Add a note for this meal..."
                                            value={
                                              noteDrafts[item.id] ?? item.notes ?? ""
                                            }
                                            onChange={(e) =>
                                              setNoteDrafts((prev) => ({
                                                ...prev,
                                                [item.id]: e.target.value,
                                              }))
                                            }
                                            onBlur={() => handleSaveNote(item)}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}

                          {entries.length > 0 && !locked && (
                            <button
                              type="button"
                              className={styles.addAnotherBtn}
                              onClick={() => setPickTarget({ day: dayIdx, slot })}
                            >
                              + Add another meal
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.shopCol}>
          <div className={styles.shopHeader}>
            Shopping List
            <span className={styles.shopCount}>{shopItems.length} items</span>
          </div>

          {shopItems.length === 0 ? (
            <p className={styles.shopEmpty}>
              Add meals to generate your shopping list.
            </p>
          ) : (
            shopItems.map((item) => (
              <div key={item.name} className={styles.shopItem}>
                <span className={styles.shopAmt}>{item.display}</span>
                <span>{item.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {pickTarget && (
        <div
          className={styles.pickerBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickTarget(null);
          }}
        >
          <div className={styles.pickerModal}>
            <div className={styles.pickerHeader}>
              <span>
                {DAYS[pickTarget.day]} — {pickTarget.slot}
              </span>
              <button
                className={styles.pickerClose}
                onClick={() => setPickTarget(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.pickerSearch}>
              <input
                type="text"
                placeholder="Search recipes…"
                value={pickSearch}
                onChange={(e) => setPickSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.pickerList}>
              {filteredRecipes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={styles.pickerItem}
                  onClick={() => handlePick(r.id)}
                >
                  <span className={styles.pickerEmoji}>{r.emoji}</span>
                  <div className={styles.pickerText}>
                    <div className={styles.pickerName}>{r.name}</div>
                    <div className={styles.pickerMeta}>
                      {r.cuisine} · ⏱ {r.total_time}m · {r.servings} srv
                    </div>
                  </div>
                </button>
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