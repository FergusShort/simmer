import { create } from "zustand";
import {
  Recipe,
  Collection,
  FilterState,
  MealPlanEntry,
} from "@/types";
import {
  loadAllRecipes,
  saveRecipe,
  deleteRecipe,
  toggleFavorite,
  toggleArchive,
  addCookLog,
  loadCollections,
  createCollection,
  setRecipeCollection,
  loadMealPlan,
  setMealSlot,
  addMealPlanItem,
  updateMealPlanItem,
  removeMealPlanItem,
} from "@/lib/db";
import { getWeekStart, nextCollectionColor } from "@/lib/utils";

interface AppState {
  recipes: Recipe[];
  collections: Collection[];
  mealPlan: MealPlanEntry[];

  selectedRecipeId: string | null;
  view: "library" | "planner";
  sidebarSection: "all" | "favourites" | "planner" | `coll:${string}`;
  filters: FilterState;
  plannerWeekOffset: number;
  isLoading: boolean;

  detailOpen: boolean;
  editOpen: boolean;
  editingId: string | null;
  importOpen: boolean;
  logOpen: boolean;
  collPickOpen: boolean;

  init: () => Promise<void>;
  saveRecipe: (recipe: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  duplicateRecipe: (id: string) => Promise<void>;
  addCookLog: (recipeId: string, rating: number, notes: string) => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  toggleRecipeCollection: (recipeId: string, collId: string, inColl: boolean) => Promise<void>;

  setMealSlot: (dayOfWeek: number, slot: string, recipeId: string | null, servings: number) => Promise<void>;
  addMealPlanItem: (dayOfWeek: number, slot: string, recipeId: string | null, servings: number) => Promise<void>;
  updateMealPlanItem: (
    id: string,
    patch: Partial<Pick<MealPlanEntry, "recipe_id" | "servings" | "notes" | "include_in_shopping_list" | "sort_order">>
  ) => Promise<void>;
  removeMealPlanItem: (id: string) => Promise<void>;
  loadWeekPlan: (offset?: number) => Promise<void>;

  openDetail: (id: string) => void;
  closeDetail: () => void;
  openEdit: (id: string | null) => void;
  closeEdit: () => void;
  openImport: () => void;
  closeImport: () => void;
  openLog: () => void;
  closeLog: () => void;
  openCollPick: () => void;
  closeCollPick: () => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  setSidebarSection: (section: AppState["sidebarSection"]) => void;
  setPlannerWeek: (offset: number) => void;
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: false,
  isDairyFree: false,
  isHighProtein: false,
  isMealPrep: false,
  isSpicy: false,
  isFavouritesOnly: false,
  isQuick: false,
  showArchived: false,
  maxTime: 100,
  minRating: 0,
  cuisines: [],
  tags: [],
  sort: "newest",
};

export const useStore = create<AppState>((set, get) => ({
  recipes: [],
  collections: [],
  mealPlan: [],
  selectedRecipeId: null,
  view: "library",
  sidebarSection: "all",
  filters: DEFAULT_FILTERS,
  plannerWeekOffset: 0,
  isLoading: true,
  detailOpen: false,
  editOpen: false,
  editingId: null,
  importOpen: false,
  logOpen: false,
  collPickOpen: false,

  init: async () => {
    set({ isLoading: true });
    const [recipes, collections] = await Promise.all([
      loadAllRecipes(),
      loadCollections(),
    ]);
    set({ recipes, collections, isLoading: false });
    await get().loadWeekPlan();
  },

  saveRecipe: async (recipe) => {
    const saved = await saveRecipe(recipe);
    set((s) => {
      const existing = s.recipes.findIndex((r) => r.id === saved.id);
      if (existing >= 0) {
        const updated = [...s.recipes];
        updated[existing] = saved;
        return { recipes: updated };
      }
      return { recipes: [saved, ...s.recipes] };
    });

    const collections = await loadCollections();
    set({ collections });
  },

  deleteRecipe: async (id) => {
    await deleteRecipe(id);
    set((s) => ({
      recipes: s.recipes.filter((r) => r.id !== id),
      detailOpen: s.selectedRecipeId === id ? false : s.detailOpen,
      selectedRecipeId: s.selectedRecipeId === id ? null : s.selectedRecipeId,
    }));
  },

  toggleFavorite: async (id) => {
    const recipe = get().recipes.find((r) => r.id === id);
    if (!recipe) return;
    const newVal = !recipe.is_favorite;
    await toggleFavorite(id, newVal);
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === id ? { ...r, is_favorite: newVal } : r
      ),
    }));
  },

  toggleArchive: async (id) => {
    const recipe = get().recipes.find((r) => r.id === id);
    if (!recipe) return;
    const newVal = !recipe.is_archived;
    await toggleArchive(id, newVal);
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === id ? { ...r, is_archived: newVal } : r
      ),
    }));
  },

  duplicateRecipe: async (id) => {
    const recipe = get().recipes.find((r) => r.id === id);
    if (!recipe) return;

    const copy: Partial<Recipe> = {
      ...recipe,
      id: undefined,
      name: `Copy of ${recipe.name}`,
      is_favorite: false,
      date_added: undefined,
      last_cooked: null,
      collections: [],
    };

    const saved = await saveRecipe(copy);
    set((s) => ({ recipes: [saved, ...s.recipes] }));
  },

  addCookLog: async (recipeId, rating, notes) => {
    const entry = await addCookLog(recipeId, rating, notes);
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId
          ? { ...r, last_cooked: entry.cooked_at, cookLog: [entry, ...(r.cookLog || [])] }
          : r
      ),
    }));
  },

  createCollection: async (name) => {
    const color = nextCollectionColor(get().collections.length);
    const coll = await createCollection(name, color);
    set((s) => ({ collections: [...s.collections, coll] }));
  },

  toggleRecipeCollection: async (recipeId, collId, inColl) => {
    await setRecipeCollection(recipeId, collId, inColl);
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              collections: inColl
                ? [...r.collections, collId]
                : r.collections.filter((c) => c !== collId),
            }
          : r
      ),
      collections: s.collections.map((c) =>
        c.id === collId
          ? { ...c, recipe_count: (c.recipe_count || 0) + (inColl ? 1 : -1) }
          : c
      ),
    }));
  },

  setMealSlot: async (dayOfWeek, slot, recipeId, servings) => {
    const weekStart = getWeekStart(get().plannerWeekOffset);
    await setMealSlot(weekStart, dayOfWeek, slot, recipeId, servings);
    await get().loadWeekPlan(get().plannerWeekOffset);
  },

  addMealPlanItem: async (dayOfWeek, slot, recipeId, servings) => {
    const weekStart = getWeekStart(get().plannerWeekOffset);
    await addMealPlanItem(weekStart, dayOfWeek, slot, recipeId, servings);
    await get().loadWeekPlan(get().plannerWeekOffset);
  },

  updateMealPlanItem: async (id, patch) => {
    await updateMealPlanItem(id, patch);
    await get().loadWeekPlan(get().plannerWeekOffset);
  },

  removeMealPlanItem: async (id) => {
    await removeMealPlanItem(id);
    await get().loadWeekPlan(get().plannerWeekOffset);
  },

  loadWeekPlan: async (offset?: number) => {
    const off = offset ?? get().plannerWeekOffset;
    const weekStart = getWeekStart(off);
    const entries = await loadMealPlan(weekStart);
    set({ mealPlan: entries, plannerWeekOffset: off });
  },

  openDetail: (id) => set({ selectedRecipeId: id, detailOpen: true }),
  closeDetail: () => set({ detailOpen: false }),
  openEdit: (id) => set({ editingId: id, editOpen: true, detailOpen: false }),
  closeEdit: () => set({ editOpen: false, editingId: null }),
  openImport: () => set({ importOpen: true }),
  closeImport: () => set({ importOpen: false }),
  openLog: () => set({ logOpen: true }),
  closeLog: () => set({ logOpen: false }),
  openCollPick: () => set({ collPickOpen: true }),
  closeCollPick: () => set({ collPickOpen: false }),

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  clearFilters: () => set({ filters: DEFAULT_FILTERS }),

  setSidebarSection: (section) => {
    const view = section === "planner" ? "planner" : "library";
    set({ sidebarSection: section, view });
  },

  setPlannerWeek: (offset) => {
    set({ plannerWeekOffset: offset });
    get().loadWeekPlan(offset);
  },
}));

export function useFilteredRecipes() {
  const { recipes, filters, sidebarSection } = useStore();

  let base = [...recipes];

  if (sidebarSection === "favourites") {
    base = base.filter((r) => r.is_favorite);
  } else if (sidebarSection.startsWith("coll:")) {
    const collId = sidebarSection.slice(5);
    base = base.filter((r) => r.collections.includes(collId));
  }

  if (!filters.showArchived) base = base.filter((r) => !r.is_archived);

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    base = base.filter((r) => {
      const hay = [
        r.name,
        r.cuisine,
        r.description,
        r.notes,
        ...(r.ingredients || []).map((i) => i.name),
        ...(r.tags || []),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }

  if (filters.isVegetarian) base = base.filter((r) => r.is_vegetarian);
  if (filters.isVegan) base = base.filter((r) => r.is_vegan);
  if (filters.isGlutenFree) base = base.filter((r) => r.is_gluten_free);
  if (filters.isDairyFree) base = base.filter((r) => r.is_dairy_free);
  if (filters.isHighProtein) base = base.filter((r) => r.is_high_protein);
  if (filters.isMealPrep) base = base.filter((r) => r.is_meal_prep);
  if (filters.isSpicy) base = base.filter((r) => r.is_spicy);
  if (filters.isFavouritesOnly) base = base.filter((r) => r.is_favorite);
  if (filters.isQuick) base = base.filter((r) => r.total_time <= 30);

  if (filters.maxTime < 100) {
    const maxMs = Math.max(...recipes.map((r) => r.total_time), 1);
    const limit = Math.round((filters.maxTime / 100) * maxMs);
    base = base.filter((r) => r.total_time <= limit);
  }

  if (filters.minRating > 0) {
    base = base.filter((r) => (r.rating || 0) >= filters.minRating);
  }

  if (filters.cuisines.length > 0) {
    base = base.filter((r) => filters.cuisines.includes(r.cuisine));
  }

  if (filters.tags.length > 0) {
    base = base.filter((r) => filters.tags.every((t) => (r.tags || []).includes(t)));
  }

  switch (filters.sort) {
    case "name":
      base.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "rated":
      base.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "time":
      base.sort((a, b) => a.total_time - b.total_time);
      break;
    case "cooked":
      base.sort((a, b) => {
        const la = a.last_cooked || "";
        const lb = b.last_cooked || "";
        return lb.localeCompare(la);
      });
      break;
    default:
      base.sort((a, b) => b.date_added.localeCompare(a.date_added));
  }

  return base;
}