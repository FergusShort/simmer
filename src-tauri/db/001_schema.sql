-- Simmer database schema
-- Migration 001

CREATE TABLE IF NOT EXISTS recipes (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  emoji         TEXT DEFAULT '🍽️',
  bg_color      TEXT DEFAULT '#F5EBD8',
  servings      INTEGER DEFAULT 4,
  prep_time     INTEGER DEFAULT 0,
  cook_time     INTEGER DEFAULT 0,
  total_time    INTEGER DEFAULT 0,
  cuisine       TEXT DEFAULT '',
  meal_type     TEXT DEFAULT 'Dinner',
  source        TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  rating        INTEGER DEFAULT 0,
  is_favorite   INTEGER DEFAULT 0,
  is_archived   INTEGER DEFAULT 0,
  is_pinned     INTEGER DEFAULT 0,
  is_vegetarian INTEGER DEFAULT 0,
  is_vegan      INTEGER DEFAULT 0,
  is_gluten_free INTEGER DEFAULT 0,
  is_dairy_free INTEGER DEFAULT 0,
  is_spicy      INTEGER DEFAULT 0,
  is_high_protein INTEGER DEFAULT 0,
  is_meal_prep  INTEGER DEFAULT 0,
  total_cost    REAL DEFAULT 0,
  calories      INTEGER DEFAULT 0,
  protein_g     REAL DEFAULT 0,
  carbs_g       REAL DEFAULT 0,
  fat_g         REAL DEFAULT 0,
  date_added    TEXT DEFAULT (datetime('now')),
  last_modified TEXT DEFAULT (datetime('now')),
  last_cooked   TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
  id          TEXT PRIMARY KEY,
  recipe_id   TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  amount      REAL DEFAULT 0,
  unit        TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  sort_order  INTEGER DEFAULT 0,
  group_name  TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS steps (
  id          TEXT PRIMARY KEY,
  recipe_id   TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  content     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id    TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

CREATE TABLE IF NOT EXISTS collections (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#C26A45',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS collection_recipes (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  recipe_id     TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  PRIMARY KEY (collection_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS cook_log (
  id          TEXT PRIMARY KEY,
  recipe_id   TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  cooked_at   TEXT DEFAULT (datetime('now')),
  rating      INTEGER DEFAULT 0,
  notes       TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS meal_plan (
  id          TEXT PRIMARY KEY,
  week_start  TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  meal_slot   TEXT NOT NULL,
  recipe_id   TEXT REFERENCES recipes(id) ON DELETE SET NULL,
  servings    INTEGER DEFAULT 1,
  notes       TEXT DEFAULT ''
);

-- Seed default collections
INSERT OR IGNORE INTO collections (id, name, color, sort_order) VALUES
  ('coll-weeknight', 'Weeknight Dinners', '#C26A45', 0),
  ('coll-meal-prep', 'Meal Prep', '#6B7A3E', 1),
  ('coll-special',   'Special Occasions', '#3A6A9A', 2);
