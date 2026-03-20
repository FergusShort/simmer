# Simmer — Personal Recipe Manager

A local-first desktop recipe manager built with Tauri + React + SQLite.
Your recipes live in a single SQLite file on your Mac. No accounts, no cloud, no nonsense.

---

## Setup (Mac)

Run these commands in order. You only need to do this once.

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

When it asks, choose option 1 (default install). Then restart your terminal, or run:

```bash
source "$HOME/.cargo/env"
```

### 2. Install Node.js

If you don't have it:
```bash
# Using Homebrew (recommended):
brew install node

# Or download from https://nodejs.org (LTS version)
```

### 3. Install Xcode Command Line Tools (if not already installed)

```bash
xcode-select --install
```

### 4. Install dependencies and run in development mode

```bash
cd simmer
npm install
npm run tauri dev
```

The app will open as a native Mac window. First launch takes ~2 minutes while Rust compiles — subsequent launches are fast.

---

## Build a distributable .app

```bash
npm run tauri build
```

This produces a `.dmg` installer at:
```
src-tauri/target/release/bundle/dmg/Simmer_0.1.0_x64.dmg
```

Double-click to install like any Mac app.

---

## Where your data lives

```
~/Library/Application Support/nz.simmer.app/
├── simmer.db        ← your recipes (SQLite)
├── images/          ← recipe photos
└── backups/         ← JSON backups
```

To back up manually: copy `simmer.db` anywhere safe.
To restore: replace `simmer.db` with your backup copy.

---

## Git setup

```bash
cd simmer
git init
git add .
git commit -m "initial commit"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOURNAME/simmer.git
git push -u origin main
```

Your `simmer.db` is in `.gitignore` so your recipes are never pushed to GitHub — only the code is.

---

## Project structure

```
simmer/
├── src/                          # React frontend
│   ├── components/
│   │   ├── layout/               # Sidebar
│   │   ├── recipes/              # Cards, detail, edit, log modals
│   │   ├── filters/              # Filter panel
│   │   ├── planner/              # Meal planner + shopping list
│   │   └── import/               # AI import modal
│   ├── lib/
│   │   ├── db.ts                 # All SQLite operations
│   │   └── utils.ts              # Unit conversion, scaling, dates
│   ├── store/
│   │   └── index.ts              # Zustand store (all app state)
│   └── types/
│       └── index.ts              # TypeScript types
│
└── src-tauri/                    # Rust/Tauri backend
    ├── src/
    │   ├── lib.rs                # App setup
    │   └── commands.rs           # Recipe parser, backup/restore
    └── db/
        └── 001_schema.sql        # Database schema (reference)
```

---

## AI Import

Use the **AI Import** tool in the sidebar. The Prompt Guide tab gives you the exact prompt to paste into ChatGPT or Claude.

The prompt is tuned for New Zealand:
- Costs estimated in NZD using Countdown/Pak'nSave prices
- NZ ingredient names (capsicum, courgette, coriander)
- Metric measurements throughout

---

## Adding features later

The codebase is structured so you can add things without touching everything:

- **New filter**: add to `FilterState` in `types/index.ts`, wire up in `store/index.ts` `useFilteredRecipes`, add UI in `FilterPanel.tsx`
- **New recipe field**: add column to `db.ts` `migrate()`, add to `saveRecipe()`, add to `RecipeEditModal.tsx`
- **New view**: create component in `src/components/`, add to `App.tsx` and `Sidebar.tsx`
