import Database from "@tauri-apps/plugin-sql";
import { Recipe, Ingredient, Step, Collection, MealPlanEntry, CookLogEntry, ParsedRecipe } from "@/types";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:simmer.db");
    await migrate(_db);
  }
  return _db;
}

async function migrate(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
      emoji TEXT DEFAULT '🍽️', bg_color TEXT DEFAULT '#F5EBD8',
      servings INTEGER DEFAULT 4, prep_time INTEGER DEFAULT 0,
      cook_time INTEGER DEFAULT 0, total_time INTEGER DEFAULT 0,
      cuisine TEXT DEFAULT '', meal_type TEXT DEFAULT 'Dinner',
      source TEXT DEFAULT '', notes TEXT DEFAULT '', rating INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0, is_archived INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0, is_vegetarian INTEGER DEFAULT 0,
      is_vegan INTEGER DEFAULT 0, is_gluten_free INTEGER DEFAULT 0,
      is_dairy_free INTEGER DEFAULT 0, is_spicy INTEGER DEFAULT 0,
      is_high_protein INTEGER DEFAULT 0, is_meal_prep INTEGER DEFAULT 0,
      total_cost REAL DEFAULT 0, calories INTEGER DEFAULT 0,
      protein_g REAL DEFAULT 0, carbs_g REAL DEFAULT 0, fat_g REAL DEFAULT 0,
      date_added TEXT DEFAULT (datetime('now')),
      last_modified TEXT DEFAULT (datetime('now')), last_cooked TEXT DEFAULT NULL
    );
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, name TEXT NOT NULL,
      amount REAL DEFAULT 0, unit TEXT DEFAULT '', notes TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0, group_name TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL,
      step_number INTEGER NOT NULL, content TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS recipe_tags (
      recipe_id TEXT NOT NULL, tag_id TEXT NOT NULL,
      PRIMARY KEY (recipe_id, tag_id)
    );
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT DEFAULT '#C26A45',
      sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS collection_recipes (
      collection_id TEXT NOT NULL, recipe_id TEXT NOT NULL,
      PRIMARY KEY (collection_id, recipe_id)
    );
    CREATE TABLE IF NOT EXISTS cook_log (
      id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL,
      cooked_at TEXT DEFAULT (datetime('now')), rating INTEGER DEFAULT 0, notes TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS meal_plan (
      id TEXT PRIMARY KEY, week_start TEXT NOT NULL,
      day_of_week INTEGER NOT NULL, meal_slot TEXT NOT NULL,
      recipe_id TEXT, servings INTEGER DEFAULT 1, notes TEXT DEFAULT ''
    );
  `);

  // Seed default collections if empty
  const colls = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM collections"
  );
  if (colls[0].count === 0) {
    await db.execute(`
      INSERT INTO collections (id, name, color, sort_order) VALUES
      ('coll-weeknight', 'Weeknight Dinners', '#C26A45', 0),
      ('coll-meal-prep', 'Meal Prep', '#6B7A3E', 1),
      ('coll-special', 'Special Occasions', '#3A6A9A', 2)
    `);
  }
}

export function uuid(): string {
  return crypto.randomUUID();
}

// ── Recipes ──────────────────────────────────────────────────────────────────

export async function loadAllRecipes(): Promise<Recipe[]> {
  const db = await getDb();
  const rows = await db.select<any[]>("SELECT * FROM recipes ORDER BY date_added DESC");

  const recipes: Recipe[] = await Promise.all(
    rows.map(async (row) => {
      const ingredients = await db.select<Ingredient[]>(
        "SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order",
        [row.id]
      );
      const steps = await db.select<Step[]>(
        "SELECT * FROM steps WHERE recipe_id = ? ORDER BY step_number",
        [row.id]
      );
      const tagRows = await db.select<{ name: string }[]>(
        "SELECT t.name FROM tags t JOIN recipe_tags rt ON t.id = rt.tag_id WHERE rt.recipe_id = ?",
        [row.id]
      );
      const collRows = await db.select<{ collection_id: string }[]>(
        "SELECT collection_id FROM collection_recipes WHERE recipe_id = ?",
        [row.id]
      );
      const cookLog = await db.select<CookLogEntry[]>(
        "SELECT * FROM cook_log WHERE recipe_id = ? ORDER BY cooked_at DESC",
        [row.id]
      );
      return {
        ...row,
        is_favorite: !!row.is_favorite,
        is_archived: !!row.is_archived,
        is_pinned: !!row.is_pinned,
        is_vegetarian: !!row.is_vegetarian,
        is_vegan: !!row.is_vegan,
        is_gluten_free: !!row.is_gluten_free,
        is_dairy_free: !!row.is_dairy_free,
        is_spicy: !!row.is_spicy,
        is_high_protein: !!row.is_high_protein,
        is_meal_prep: !!row.is_meal_prep,
        ingredients,
        steps,
        tags: tagRows.map((t) => t.name),
        collections: collRows.map((c) => c.collection_id),
        cookLog,
      } as Recipe;
    })
  );
  return recipes;
}

export async function saveRecipe(recipe: Partial<Recipe> & { id?: string }): Promise<Recipe> {
  const db = await getDb();
  const id = recipe.id || uuid();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR REPLACE INTO recipes (
      id, name, description, emoji, bg_color, servings, prep_time, cook_time, total_time,
      cuisine, meal_type, source, notes, rating, is_favorite, is_archived, is_pinned,
      is_vegetarian, is_vegan, is_gluten_free, is_dairy_free, is_spicy, is_high_protein,
      is_meal_prep, total_cost, calories, protein_g, carbs_g, fat_g, date_added, last_modified, last_cooked
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, recipe.name || '', recipe.description || '', recipe.emoji || '🍽️',
      recipe.bg_color || pickBgColor(recipe.cuisine || ''),
      recipe.servings || 4, recipe.prep_time || 0, recipe.cook_time || 0,
      recipe.total_time || (recipe.prep_time || 0) + (recipe.cook_time || 0),
      recipe.cuisine || '', recipe.meal_type || 'Dinner', recipe.source || '',
      recipe.notes || '', recipe.rating || 0,
      recipe.is_favorite ? 1 : 0, recipe.is_archived ? 1 : 0, recipe.is_pinned ? 1 : 0,
      recipe.is_vegetarian ? 1 : 0, recipe.is_vegan ? 1 : 0, recipe.is_gluten_free ? 1 : 0,
      recipe.is_dairy_free ? 1 : 0, recipe.is_spicy ? 1 : 0, recipe.is_high_protein ? 1 : 0,
      recipe.is_meal_prep ? 1 : 0, recipe.total_cost || 0,
      recipe.calories || 0, recipe.protein_g || 0, recipe.carbs_g || 0, recipe.fat_g || 0,
      recipe.date_added || now, now, recipe.last_cooked || null,
    ]
  );

  // Replace ingredients
  await db.execute("DELETE FROM ingredients WHERE recipe_id = ?", [id]);
  for (let i = 0; i < (recipe.ingredients || []).length; i++) {
    const ing = recipe.ingredients![i];
    await db.execute(
      "INSERT INTO ingredients (id, recipe_id, name, amount, unit, notes, sort_order, group_name) VALUES (?,?,?,?,?,?,?,?)",
      [uuid(), id, ing.name, ing.amount || 0, ing.unit || '', ing.notes || '', i, ing.group_name || '']
    );
  }

  // Replace steps
  await db.execute("DELETE FROM steps WHERE recipe_id = ?", [id]);
  for (let i = 0; i < (recipe.steps || []).length; i++) {
    const step = recipe.steps![i];
    await db.execute(
      "INSERT INTO steps (id, recipe_id, step_number, content) VALUES (?,?,?,?)",
      [uuid(), id, i + 1, typeof step === 'string' ? step : (step as Step).content]
    );
  }

  // Replace tags
  await db.execute("DELETE FROM recipe_tags WHERE recipe_id = ?", [id]);
  for (const tagName of (recipe.tags || [])) {
    let tagRow = await db.select<{ id: string }[]>("SELECT id FROM tags WHERE name = ?", [tagName]);
    let tagId: string;
    if (tagRow.length === 0) {
      tagId = uuid();
      await db.execute("INSERT INTO tags (id, name) VALUES (?,?)", [tagId, tagName]);
    } else {
      tagId = tagRow[0].id;
    }
    await db.execute("INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?,?)", [id, tagId]);
  }

  const [saved] = await db.select<any[]>("SELECT * FROM recipes WHERE id = ?", [id]);
  const ingredients = await db.select<Ingredient[]>("SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order", [id]);
  const steps = await db.select<Step[]>("SELECT * FROM steps WHERE recipe_id = ? ORDER BY step_number", [id]);
  const tagRows = await db.select<{ name: string }[]>(
    "SELECT t.name FROM tags t JOIN recipe_tags rt ON t.id = rt.tag_id WHERE rt.recipe_id = ?", [id]
  );
  const collRows = await db.select<{ collection_id: string }[]>(
    "SELECT collection_id FROM collection_recipes WHERE recipe_id = ?", [id]
  );
  const cookLog = await db.select<CookLogEntry[]>(
    "SELECT * FROM cook_log WHERE recipe_id = ? ORDER BY cooked_at DESC", [id]
  );
  return {
    ...saved,
    is_favorite: !!saved.is_favorite, is_archived: !!saved.is_archived, is_pinned: !!saved.is_pinned,
    is_vegetarian: !!saved.is_vegetarian, is_vegan: !!saved.is_vegan, is_gluten_free: !!saved.is_gluten_free,
    is_dairy_free: !!saved.is_dairy_free, is_spicy: !!saved.is_spicy, is_high_protein: !!saved.is_high_protein,
    is_meal_prep: !!saved.is_meal_prep,
    ingredients, steps, tags: tagRows.map((t) => t.name),
    collections: collRows.map((c) => c.collection_id), cookLog,
  };
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM recipes WHERE id = ?", [id]);
}

export async function toggleFavorite(id: string, val: boolean): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE recipes SET is_favorite = ? WHERE id = ?", [val ? 1 : 0, id]);
}

export async function toggleArchive(id: string, val: boolean): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE recipes SET is_archived = ? WHERE id = ?", [val ? 1 : 0, id]);
}

export async function addCookLog(
  recipeId: string,
  rating: number,
  notes: string
): Promise<CookLogEntry> {
  const db = await getDb();
  const id = uuid();
  const now = new Date().toISOString();
  await db.execute(
    "INSERT INTO cook_log (id, recipe_id, cooked_at, rating, notes) VALUES (?,?,?,?,?)",
    [id, recipeId, now, rating, notes]
  );
  await db.execute(
    "UPDATE recipes SET last_cooked = ? WHERE id = ?",
    [now, recipeId]
  );
  return { id, recipe_id: recipeId, cooked_at: now, rating, notes };
}

// ── Collections ───────────────────────────────────────────────────────────────

export async function loadCollections(): Promise<Collection[]> {
  const db = await getDb();
  const rows = await db.select<Collection[]>("SELECT * FROM collections ORDER BY sort_order");
  return await Promise.all(
    rows.map(async (c) => {
      const [{ count }] = await db.select<{ count: number }[]>(
        "SELECT COUNT(*) as count FROM collection_recipes WHERE collection_id = ?",
        [c.id]
      );
      return { ...c, recipe_count: count };
    })
  );
}

export async function createCollection(name: string, color: string): Promise<Collection> {
  const db = await getDb();
  const id = uuid();
  await db.execute(
    "INSERT INTO collections (id, name, color, sort_order) VALUES (?,?,?,(SELECT COALESCE(MAX(sort_order)+1,0) FROM collections))",
    [id, name, color]
  );
  const [coll] = await db.select<Collection[]>("SELECT * FROM collections WHERE id = ?", [id]);
  return { ...coll, recipe_count: 0 };
}

export async function setRecipeCollection(
  recipeId: string,
  collectionId: string,
  inCollection: boolean
): Promise<void> {
  const db = await getDb();
  if (inCollection) {
    await db.execute(
      "INSERT OR IGNORE INTO collection_recipes (collection_id, recipe_id) VALUES (?,?)",
      [collectionId, recipeId]
    );
  } else {
    await db.execute(
      "DELETE FROM collection_recipes WHERE collection_id = ? AND recipe_id = ?",
      [collectionId, recipeId]
    );
  }
}

// ── Meal Plan ─────────────────────────────────────────────────────────────────

export async function loadMealPlan(weekStart: string): Promise<MealPlanEntry[]> {
  const db = await getDb();
  return await db.select<MealPlanEntry[]>(
    "SELECT * FROM meal_plan WHERE week_start = ?",
    [weekStart]
  );
}

export async function setMealSlot(
  weekStart: string,
  dayOfWeek: number,
  slot: string,
  recipeId: string | null,
  servings: number
): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{ id: string }[]>(
    "SELECT id FROM meal_plan WHERE week_start = ? AND day_of_week = ? AND meal_slot = ?",
    [weekStart, dayOfWeek, slot]
  );
  if (existing.length > 0) {
    await db.execute(
      "UPDATE meal_plan SET recipe_id = ?, servings = ? WHERE id = ?",
      [recipeId, servings, existing[0].id]
    );
  } else {
    await db.execute(
      "INSERT INTO meal_plan (id, week_start, day_of_week, meal_slot, recipe_id, servings) VALUES (?,?,?,?,?,?)",
      [uuid(), weekStart, dayOfWeek, slot, recipeId, servings]
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BG_COLORS = [
  '#F5EBD8', '#E8F0D8', '#E8E4F5', '#F5E8D8', '#FFF0D8',
  '#F0E8F5', '#E8F5F0', '#F5F0E8', '#EBF0F5',
];

export function pickBgColor(cuisine: string): string {
  const c = cuisine.toLowerCase();
  if (c.includes('italian')) return '#F5EBD8';
  if (c.includes('thai') || c.includes('asian')) return '#E8F0D8';
  if (c.includes('indian')) return '#FFF0D8';
  if (c.includes('american')) return '#F5E8D8';
  if (c.includes('café') || c.includes('cafe')) return '#E8E4F5';
  const idx = Math.abs(cuisine.charCodeAt(0) || 0) % BG_COLORS.length;
  return BG_COLORS[idx];
}

export async function parsedToRecipe(parsed: ParsedRecipe): Promise<Partial<Recipe>> {
  return {
    name: parsed.name,
    description: parsed.description,
    emoji: parsed.emoji,
    bg_color: pickBgColor(parsed.cuisine),
    servings: parsed.servings,
    prep_time: parsed.prep_time,
    cook_time: parsed.cook_time,
    total_time: parsed.total_time || parsed.prep_time + parsed.cook_time,
    cuisine: parsed.cuisine,
    meal_type: parsed.meal_type,
    source: parsed.source,
    notes: parsed.notes,
    rating: parsed.rating,
    tags: parsed.tags,
    total_cost: parsed.total_cost,
    is_vegetarian: parsed.is_vegetarian,
    is_vegan: parsed.is_vegan,
    is_gluten_free: parsed.is_gluten_free,
    is_dairy_free: parsed.is_dairy_free,
    is_spicy: parsed.is_spicy,
    is_high_protein: parsed.is_high_protein,
    is_meal_prep: parsed.is_meal_prep,
    calories: parsed.calories,
    protein_g: parsed.protein_g,
    carbs_g: parsed.carbs_g,
    fat_g: parsed.fat_g,
    ingredients: parsed.ingredients.map((ing, i) => ({
      id: '',
      recipe_id: '',
      name: ing.name,
      amount: ing.amt,
      unit: ing.unit,
      notes: '',
      sort_order: i,
      group_name: '',
    })),
    steps: parsed.steps.map((content, i) => ({
      id: '',
      recipe_id: '',
      step_number: i + 1,
      content,
    })) as any,
  };
}
