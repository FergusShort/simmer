import { Ingredient } from "@/types";

const MASS: Record<string, number> = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 };
const VOL: Record<string, number> = {
  ml: 1,
  l: 1000,
  L: 1000,
  "fl oz": 29.57,
  cup: 236.6,
  cups: 236.6,
  tbsp: 14.79,
  tsp: 4.93,
};

export type UnitType = "mass" | "vol" | "ct" | "other";

export function unitType(u: string): UnitType {
  if (!u || u === "") return "ct";
  if (MASS[u] !== undefined) return "mass";
  if (VOL[u] !== undefined) return "vol";
  return "other";
}

export function scaleAmount(ing: Ingredient, ratio: number): string {
  const raw = (ing.amount || 0) * ratio;
  const ut = unitType(ing.unit);

  if (ut === "mass") {
    const g = raw * (MASS[ing.unit] ?? 1);
    if (g >= 900) return `${(g / 1000).toFixed(2).replace(/\.?0+$/, "")}kg`;
    return `${Math.round(g)}g`;
  }

  if (ut === "vol") {
    const ml = raw * (VOL[ing.unit] ?? 1);
    if (ml >= 900) return `${(ml / 1000).toFixed(1).replace(/\.?0+$/, "")}l`;
    if (ml >= 28) return `${Math.round(ml / 14.79)} tbsp`;
    if (ml >= 5) return `${Math.round(ml / 4.93)} tsp`;
    return `${Math.round(ml)}ml`;
  }

  if (raw === Math.floor(raw)) return String(raw);

  const frac = raw % 1;
  const whole = Math.floor(raw);
  const fracs: [number, number, string][] = [
    [1, 4, "¼"],
    [1, 3, "⅓"],
    [1, 2, "½"],
    [2, 3, "⅔"],
    [3, 4, "¾"],
  ];

  for (const [n, d, sym] of fracs) {
    if (Math.abs(frac - n / d) < 0.08) {
      return whole ? `${whole} ${sym}` : sym;
    }
  }

  return raw.toFixed(1);
}

export function formatAmount(ing: Ingredient): string {
  const sc = scaleAmount(ing, 1);
  const ut = unitType(ing.unit);
  const unitDisp = ut === "mass" || ut === "vol" ? "" : ing.unit ? ` ${ing.unit}` : "";
  return `${sc}${unitDisp}`;
}

/** Aggregate ingredients across multiple (recipe, servings) pairs for shopping list */
export function aggregateIngredients(
  pairs: { ingredients: Ingredient[]; baseServings: number; scaledServings: number }[],
): { name: string; display: string }[] {
  const agg: Record<string, { name: string; total: number; ut: UnitType; unit: string }> = {};

  for (const { ingredients, baseServings, scaledServings } of pairs) {
    const ratio = scaledServings / baseServings;

    for (const ing of ingredients) {
      const key = ing.name.toLowerCase().replace(/,.*$/, "").trim();
      const ut = unitType(ing.unit);
      const baseAmt = (ing.amount || 0) * ratio;

      const totalBase =
        ut === "mass"
          ? baseAmt * (MASS[ing.unit] ?? 1)
          : ut === "vol"
            ? baseAmt * (VOL[ing.unit] ?? 1)
            : baseAmt;

      if (!agg[key]) {
        agg[key] = {
          name: ing.name.replace(/,.*$/, "").trim(),
          total: 0,
          ut,
          unit: ing.unit,
        };
      }

      agg[key].total += totalBase;
    }
  }

  return Object.values(agg).map((item) => {
    let display = "";

    if (item.ut === "mass") {
      display =
        item.total >= 900
          ? `${(item.total / 1000).toFixed(2).replace(/\.?0+$/, "")}kg`
          : `${Math.round(item.total)}g`;
    } else if (item.ut === "vol") {
      const ml = item.total;
      display =
        ml >= 900
          ? `${(ml / 1000).toFixed(1).replace(/\.?0+$/, "")}l`
          : ml >= 28
            ? `${Math.round(ml / 14.79)} tbsp`
            : ml >= 5
              ? `${Math.round(ml / 4.93)} tsp`
              : `${Math.round(ml)}ml`;
    } else {
      display = item.total % 1 === 0 ? String(item.total) : item.total.toFixed(1);
    }

    return { name: item.name, display };
  });
}

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toSafeDate(input: string | Date): Date {
  if (input instanceof Date) return input;

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return parseLocalDate(input);
  }

  return new Date(input);
}

export function formatDate(input: string | Date): string {
  if (!input) return "";
  return toSafeDate(input).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(input: string | Date): string {
  if (!input) return "";
  return toSafeDate(input).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
  });
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function getWeekStart(offset = 0): string {
  const monday = startOfWeek(new Date());
  monday.setDate(monday.getDate() + offset * 7);
  return formatLocalDate(monday);
}

export function getWeekDates(weekStart: string): Date[] {
  const base = parseLocalDate(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

const PALETTE_COLORS = [
  "#C26A45",
  "#6B7A3E",
  "#3A6A9A",
  "#8B5E9A",
  "#2E7D5E",
  "#B07030",
  "#A03060",
  "#4A8080",
];

export function nextCollectionColor(existingCount: number): string {
  return PALETTE_COLORS[existingCount % PALETTE_COLORS.length];
}