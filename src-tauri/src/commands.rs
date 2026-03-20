use serde::{Deserialize, Serialize};
use tauri::Manager;

#[tauri::command]
pub fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ParsedIngredient {
    pub amt: f64,
    pub unit: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ParsedRecipe {
    pub name: String,
    pub description: String,
    pub servings: i32,
    pub prep_time: i32,
    pub cook_time: i32,
    pub total_time: i32,
    pub cuisine: String,
    pub meal_type: String,
    pub source: String,
    pub rating: i32,
    pub tags: Vec<String>,
    pub total_cost: f64,
    pub is_vegetarian: bool,
    pub is_vegan: bool,
    pub is_gluten_free: bool,
    pub is_dairy_free: bool,
    pub is_spicy: bool,
    pub is_high_protein: bool,
    pub is_meal_prep: bool,
    pub calories: i32,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
    pub ingredients: Vec<ParsedIngredient>,
    pub steps: Vec<String>,
    pub notes: String,
    pub emoji: String,
}

#[tauri::command]
pub fn parse_import_text(text: String) -> Result<ParsedRecipe, String> {
    let mut recipe = ParsedRecipe {
        name: String::new(),
        description: String::new(),
        servings: 4,
        prep_time: 0,
        cook_time: 0,
        total_time: 0,
        cuisine: String::new(),
        meal_type: "Dinner".to_string(),
        source: String::new(),
        rating: 0,
        tags: vec![],
        total_cost: 0.0,
        is_vegetarian: false,
        is_vegan: false,
        is_gluten_free: false,
        is_dairy_free: false,
        is_spicy: false,
        is_high_protein: false,
        is_meal_prep: false,
        calories: 0,
        protein_g: 0.0,
        carbs_g: 0.0,
        fat_g: 0.0,
        ingredients: vec![],
        steps: vec![],
        notes: String::new(),
        emoji: "🍽️".to_string(),
    };

    let parts: Vec<&str> = text.splitn(3, "---").collect();
    let frontmatter = if parts.len() >= 2 { parts[1] } else { "" };
    let body = if parts.len() >= 3 { parts[2] } else { &text };

    // Parse frontmatter
    for line in frontmatter.lines() {
        let line = line.trim();
        if let Some((key, val)) = line.split_once(':') {
            let key = key.trim().to_lowercase().replace(' ', "_");
            let val = val.trim().trim_matches('"').to_string();
            match key.as_str() {
                "name" => recipe.name = val,
                "description" => recipe.description = val,
                "servings" => recipe.servings = val.parse().unwrap_or(4),
                "prep_time" => recipe.prep_time = val.parse().unwrap_or(0),
                "cook_time" => recipe.cook_time = val.parse().unwrap_or(0),
                "cuisine" => recipe.cuisine = val,
                "meal_type" => recipe.meal_type = capitalise(&val),
                "source" => recipe.source = val,
                "rating" => recipe.rating = val.parse().unwrap_or(0),
                "tags" => {
                    recipe.tags = val.split(',').map(|t| t.trim().to_string()).filter(|t| !t.is_empty()).collect();
                }
                "total_cost_estimate" => {
                    let clean = val.replace(['~', '$', ' ', 'N', 'Z', 'D'], "");
                    recipe.total_cost = clean.parse().unwrap_or(0.0);
                }
                "vegetarian" => recipe.is_vegetarian = val == "true",
                "vegan" => recipe.is_vegan = val == "true",
                "gluten_free" => recipe.is_gluten_free = val == "true",
                "dairy_free" => recipe.is_dairy_free = val == "true",
                "spicy" => recipe.is_spicy = val == "true",
                "high_protein" => recipe.is_high_protein = val == "true",
                "meal_prep" => recipe.is_meal_prep = val == "true",
                "calories" => recipe.calories = val.parse().unwrap_or(0),
                "protein" => recipe.protein_g = val.replace('g', "").trim().parse().unwrap_or(0.0),
                "carbs" => recipe.carbs_g = val.replace('g', "").trim().parse().unwrap_or(0.0),
                "fat" => recipe.fat_g = val.replace('g', "").trim().parse().unwrap_or(0.0),
                _ => {}
            }
        }
    }

    if recipe.total_time == 0 {
        recipe.total_time = recipe.prep_time + recipe.cook_time;
    }

    // Parse body sections
    let mut in_ingredients = false;
    let mut in_method = false;
    let mut in_notes = false;

    for line in body.lines() {
        let line = line.trim();
        if line.starts_with("## Ingredients") {
            in_ingredients = true; in_method = false; in_notes = false; continue;
        }
        if line.starts_with("## Method") {
            in_ingredients = false; in_method = true; in_notes = false; continue;
        }
        if line.starts_with("## Notes") {
            in_ingredients = false; in_method = false; in_notes = true; continue;
        }
        if line.starts_with("## ") {
            in_ingredients = false; in_method = false; in_notes = false; continue;
        }
        if line.starts_with("### ") { continue; }

        if in_ingredients && line.starts_with("- ") {
            let ing_text = &line[2..];
            let parsed = parse_ingredient(ing_text);
            recipe.ingredients.push(parsed);
        }
        if in_method && (line.starts_with(|c: char| c.is_ascii_digit())) {
            let step = line.splitn(2, ". ").nth(1).unwrap_or(line).trim().to_string();
            if !step.is_empty() {
                recipe.steps.push(step);
            }
        }
        if in_notes && !line.is_empty() {
            if !recipe.notes.is_empty() { recipe.notes.push(' '); }
            recipe.notes.push_str(line);
        }
    }

    if recipe.name.is_empty() {
        return Err("Could not parse recipe name. Make sure your text includes 'name: Recipe Name' in the frontmatter.".to_string());
    }

    // Pick emoji based on cuisine/meal type
    recipe.emoji = pick_emoji(&recipe.cuisine, &recipe.meal_type, &recipe.name);

    Ok(recipe)
}

fn parse_ingredient(text: &str) -> ParsedIngredient {
    let text = text.trim();
    let units = ["kg", "g", "ml", "l", "L", "tsp", "tbsp", "cup", "cups", "oz", "lb", "cloves", "slices", "pieces", "piece"];
    let parts: Vec<&str> = text.splitn(3, ' ').collect();

    if parts.len() >= 2 {
        if let Ok(amt) = parts[0].parse::<f64>() {
            let second = parts[1].to_lowercase();
            if units.iter().any(|u| second == u.to_lowercase()) {
                let name = if parts.len() >= 3 { parts[2] } else { "" };
                return ParsedIngredient { amt, unit: parts[1].to_string(), name: name.to_string() };
            } else {
                let name = parts[1..].join(" ");
                return ParsedIngredient { amt, unit: String::new(), name };
            }
        }
    }
    ParsedIngredient { amt: 0.0, unit: String::new(), name: text.to_string() }
}

fn capitalise(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
    }
}

fn pick_emoji(cuisine: &str, meal_type: &str, name: &str) -> String {
    let n = name.to_lowercase();
    let c = cuisine.to_lowercase();
    if n.contains("pasta") || n.contains("carbonara") || n.contains("spaghetti") { return "🍝".to_string(); }
    if n.contains("curry") { return "🍛".to_string(); }
    if n.contains("burger") { return "🍔".to_string(); }
    if n.contains("pizza") { return "🍕".to_string(); }
    if n.contains("salad") { return "🥗".to_string(); }
    if n.contains("soup") || n.contains("stew") { return "🍲".to_string(); }
    if n.contains("chicken") { return "🍗".to_string(); }
    if n.contains("fish") || n.contains("salmon") || n.contains("tuna") { return "🐟".to_string(); }
    if n.contains("taco") || n.contains("burrito") { return "🌮".to_string(); }
    if n.contains("cake") || n.contains("cookie") || n.contains("brownie") { return "🍰".to_string(); }
    if n.contains("oat") || n.contains("porridge") { return "🫙".to_string(); }
    if n.contains("egg") || n.contains("omelette") { return "🍳".to_string(); }
    if meal_type == "Breakfast" { return "🍳".to_string(); }
    if meal_type == "Dessert" { return "🍰".to_string(); }
    if meal_type == "Drink" { return "🥤".to_string(); }
    if c.contains("thai") || c.contains("japanese") || c.contains("asian") { return "🍜".to_string(); }
    if c.contains("italian") { return "🍝".to_string(); }
    if c.contains("mexican") { return "🌮".to_string(); }
    "🍽️".to_string()
}

#[derive(Serialize, Deserialize)]
pub struct BackupData {
    pub version: String,
    pub exported_at: String,
    pub recipes: serde_json::Value,
    pub collections: serde_json::Value,
}

#[tauri::command]
pub async fn export_backup(
    app: tauri::AppHandle,
    data: serde_json::Value,
) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let backups_dir = app_dir.join("backups");
    std::fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono_like_timestamp();
    let filename = format!("simmer-backup-{}.json", timestamp);
    let path = backups_dir.join(&filename);

    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_backup(path: String) -> Result<serde_json::Value, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(data)
}

fn chrono_like_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    format!("{}", secs)
}
