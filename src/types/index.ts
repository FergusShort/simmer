export interface Ingredient {
  id: string;
  recipe_id: string;
  name: string;
  amount: number;
  unit: string;
  notes: string;
  sort_order: number;
  group_name: string;
}

export interface Step {
  id: string;
  recipe_id: string;
  step_number: number;
  content: string;
}

export interface CookLogEntry {
  id: string;
  recipe_id: string;
  cooked_at: string;
  rating: number;
  notes: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  emoji: string;
  bg_color: string;
  servings: number;
  prep_time: number;
  cook_time: number;
  total_time: number;
  cuisine: string;
  meal_type: string;
  source: string;
  notes: string;
  rating: number;
  is_favorite: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_dairy_free: boolean;
  is_spicy: boolean;
  is_high_protein: boolean;
  is_meal_prep: boolean;
  total_cost: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  date_added: string;
  last_modified: string;
  last_cooked: string | null;
  // Joined data
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  collections: string[];
  cookLog: CookLogEntry[];
}

export interface Collection {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  recipe_count?: number;
}

export interface MealPlanEntry {
  id: string;
  week_start: string;
  day_of_week: number;
  meal_slot: string;
  recipe_id: string | null;
  servings: number;
  notes: string;
  include_in_shopping_list: boolean;
  sort_order: number;
  created_at?: string;
}

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner';

export interface FilterState {
  search: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isHighProtein: boolean;
  isMealPrep: boolean;
  isSpicy: boolean;
  isFavouritesOnly: boolean;
  isQuick: boolean;
  showArchived: boolean;
  maxTime: number; // 0-100 slider value
  minRating: number;
  cuisines: string[];
  tags: string[];
  sort: SortOption;
}

export type SortOption =
  | 'newest'
  | 'name'
  | 'rated'
  | 'time'
  | 'cooked';

export interface ParsedRecipe {
  name: string;
  description: string;
  servings: number;
  prep_time: number;
  cook_time: number;
  total_time: number;
  cuisine: string;
  meal_type: string;
  source: string;
  rating: number;
  tags: string[];
  total_cost: number;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_dairy_free: boolean;
  is_spicy: boolean;
  is_high_protein: boolean;
  is_meal_prep: boolean;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: { amt: number; unit: string; name: string }[];
  steps: string[];
  notes: string;
  emoji: string;
}
