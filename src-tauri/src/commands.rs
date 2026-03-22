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
    let normalize = |s: &str| -> String {
        s.to_lowercase()
            .chars()
            .map(|ch| if ch.is_alphanumeric() { ch } else { ' ' })
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    };

    let n = format!(" {} ", normalize(name));
    let c = format!(" {} ", normalize(cuisine));
    let m = format!(" {} ", normalize(meal_type));
    let full = format!("{n}{c}{m}");

    let has = |haystack: &str, term: &str| -> bool {
        let t = normalize(term);
        !t.is_empty() && haystack.contains(&format!(" {} ", t))
    };

    let has_any = |haystack: &str, terms: &[&str]| -> bool {
        terms.iter().any(|term| has(haystack, term))
    };

    // ---------- Drinks ----------
    if has_any(&full, &[
        "smoothie", "milkshake", "shake", "protein shake", "juice", "lemonade",
        "soda", "soft drink", "fizz", "mocktail", "cocktail", "drink",
    ]) {
        return "🥤".to_string();
    }
    if has_any(&full, &[
        "coffee", "iced coffee", "latte", "flat white", "cappuccino",
        "espresso", "americano", "mocha",
    ]) {
        return "☕".to_string();
    }
    if has_any(&full, &[
        "tea", "chai", "matcha", "green tea", "black tea", "herbal tea",
    ]) {
        return "🫖".to_string();
    }

    // ---------- Desserts / sweets ----------
    if has_any(&full, &[
        "cake", "cheesecake", "gateau", "tiramisu", "brownie", "blondie",
        "slice", "lamington",
    ]) {
        return "🍰".to_string();
    }
    if has_any(&full, &[
        "cookie", "cookies", "biscuit", "biscuits", "shortbread",
    ]) {
        return "🍪".to_string();
    }
    if has_any(&full, &[
        "cupcake", "muffin", "muffins",
    ]) {
        return "🧁".to_string();
    }
    if has_any(&full, &[
        "donut", "donuts", "doughnut", "doughnuts",
    ]) {
        return "🍩".to_string();
    }
    if has_any(&full, &[
        "ice cream", "gelato", "sorbet", "sundae", "froyo", "frozen yoghurt",
        "frozen yogurt",
    ]) {
        return "🍨".to_string();
    }
    if has_any(&full, &[
        "pie", "pies", "tart", "tarts", "quiche", "galette", "empanada",
    ]) {
        return "🥧".to_string();
    }
    if has_any(&full, &[
        "chocolate", "fudge", "truffle", "truffles", "lolly", "lollies",
        "candy", "caramel",
    ]) {
        return "🍫".to_string();
    }
    if has(&m, "dessert") {
        return "🍰".to_string();
    }

    // ---------- Breakfast ----------
    if has_any(&full, &[
        "pancake", "pancakes", "waffle", "waffles", "crepe", "crepes",
        "french toast",
    ]) {
        return "🥞".to_string();
    }
    if has_any(&full, &[
        "egg", "eggs", "omelette", "omelet", "frittata", "shakshuka",
        "scramble", "scrambled eggs",
    ]) {
        return "🍳".to_string();
    }
    if has_any(&full, &[
        "oat", "oats", "oatmeal", "porridge", "overnight oats", "granola",
        "muesli", "cereal",
    ]) {
        return "🥣".to_string();
    }
    if has_any(&full, &[
        "croissant", "pastry", "danish", "scone",
    ]) {
        return "🥐".to_string();
    }
    if has(&m, "breakfast") {
        return "🍳".to_string();
    }

    // ---------- Soups / bowls / sauces ----------
    if has_any(&full, &[
        "soup", "stew", "chowder", "bisque", "broth", "chili", "casserole",
        "gumbo",
    ]) {
        return "🍲".to_string();
    }
    if has_any(&full, &[
        "salad", "grain bowl", "bowl", "poke", "poke bowl", "buddha bowl",
        "power bowl",
    ]) {
        return "🥗".to_string();
    }
    if has_any(&full, &[
        "sauce", "salsa", "dip", "pesto", "dressing", "marinade", "jam",
        "jelly", "chutney", "aioli", "mayo", "mayonnaise", "gravy", "relish",
    ]) {
        return "🫙".to_string();
    }

    // ---------- Handhelds / fast food ----------
    if has_any(&full, &[
        "burger", "burgers", "cheeseburger", "slider", "sliders",
    ]) {
        return "🍔".to_string();
    }
    if has_any(&full, &[
        "sandwich", "sandwiches", "toastie", "toasties", "panini", "melt",
        "sub", "bagel", "bagels", "roll", "rolls", "wrap", "wraps",
    ]) {
        return "🥪".to_string();
    }
    if has_any(&full, &[
        "hot dog", "hot dogs", "hotdog", "hotdogs",
    ]) {
        return "🌭".to_string();
    }
    if has_any(&full, &[
        "taco", "tacos", "quesadilla", "quesadillas", "fajita", "fajitas",
        "nachos",
    ]) {
        return "🌮".to_string();
    }
    if has_any(&full, &[
        "burrito", "burritos", "chimichanga",
    ]) {
        return "🌯".to_string();
    }
    if has_any(&full, &[
        "kebab", "kebabs", "shawarma", "gyro", "gyros", "falafel", "pita",
        "hummus",
    ]) {
        return "🥙".to_string();
    }

    // ---------- Pizza / bread / bakery ----------
    if has_any(&full, &[
        "pizza", "flatbread", "pide",
    ]) {
        return "🍕".to_string();
    }
    if has_any(&full, &[
        "bread", "toast", "focaccia", "sourdough", "loaf", "brioche", "bun",
        "buns",
    ]) {
        return "🍞".to_string();
    }

    // ---------- Pasta / noodles / rice / sushi / dumplings ----------
    if has_any(&full, &[
        "pasta", "spaghetti", "carbonara", "linguine", "fettuccine", "penne",
        "rigatoni", "macaroni", "lasagna", "lasagne", "ravioli", "tortellini",
        "gnocchi", "alfredo", "bolognese", "mac and cheese", "mac n cheese",
    ]) {
        return "🍝".to_string();
    }
    if has_any(&full, &[
        "ramen", "udon", "soba", "pho", "laksa", "lo mein", "chow mein",
        "yakisoba", "noodle", "noodles",
    ]) {
        return "🍜".to_string();
    }
    if has_any(&full, &[
        "sushi", "sashimi", "nigiri", "maki", "california roll", "dragon roll",
    ]) {
        return "🍣".to_string();
    }
    if has_any(&full, &[
        "dumpling", "dumplings", "gyoza", "wonton", "potsticker", "bao",
        "dim sum", "mandu",
    ]) {
        return "🥟".to_string();
    }
    if has_any(&full, &[
        "rice", "fried rice", "risotto", "paella", "biryani", "pilaf",
        "pulao", "jambalaya", "bibimbap",
    ]) {
        return "🍚".to_string();
    }
    if has_any(&full, &[
        "curry", "korma", "tikka masala", "vindaloo", "butter chicken",
        "dal", "dahl",
    ]) {
        return "🍛".to_string();
    }

    // ---------- Proteins / mains ----------
    if has_any(&full, &[
        "chicken", "wings", "wing", "drumstick", "drumsticks",
    ]) {
        return "🍗".to_string();
    }
    if has_any(&full, &[
        "fish", "salmon", "tuna", "trout", "cod", "snapper", "sea bass",
        "barramundi",
    ]) {
        return "🐟".to_string();
    }
    if has_any(&full, &[
        "prawn", "prawns", "shrimp", "shrimps", "scampi",
    ]) {
        return "🍤".to_string();
    }
    if has_any(&full, &[
        "steak", "beef", "lamb", "meatball", "meatballs", "brisket", "veal",
    ]) {
        return "🥩".to_string();
    }
    if has_any(&full, &[
        "pork", "ribs", "rib", "bacon", "ham", "pulled pork",
    ]) {
        return "🍖".to_string();
    }

    // ---------- Sides / snacks ----------
    if has_any(&full, &[
        "fries", "chips", "wedges", "hash brown", "hash browns",
    ]) {
        return "🍟".to_string();
    }
    if has_any(&full, &[
        "popcorn",
    ]) {
        return "🍿".to_string();
    }
    if has(&m, "snack") {
        return "🍿".to_string();
    }

    // ---------- Meal type fallback ----------
    if has(&m, "drink") {
        return "🥤".to_string();
    }
    if has(&m, "dessert") {
        return "🍰".to_string();
    }
    if has(&m, "breakfast") {
        return "🍳".to_string();
    }

    // ---------- Cuisine / country flag fallback ----------
    if has_any(&c, &["italian"]) { return "🇮🇹".to_string(); }
    if has_any(&c, &["mexican", "tex mex"]) { return "🇲🇽".to_string(); }
    if has_any(&c, &["american"]) { return "🇺🇸".to_string(); }
    if has_any(&c, &["indian"]) { return "🇮🇳".to_string(); }
    if has_any(&c, &["thai"]) { return "🇹🇭".to_string(); }
    if has_any(&c, &["japanese"]) { return "🇯🇵".to_string(); }
    if has_any(&c, &["chinese"]) { return "🇨🇳".to_string(); }
    if has_any(&c, &["korean"]) { return "🇰🇷".to_string(); }
    if has_any(&c, &["vietnamese"]) { return "🇻🇳".to_string(); }
    if has_any(&c, &["french"]) { return "🇫🇷".to_string(); }
    if has_any(&c, &["spanish"]) { return "🇪🇸".to_string(); }
    if has_any(&c, &["greek"]) { return "🇬🇷".to_string(); }
    if has_any(&c, &["turkish"]) { return "🇹🇷".to_string(); }
    if has_any(&c, &["lebanese"]) { return "🇱🇧".to_string(); }
    if has_any(&c, &["moroccan"]) { return "🇲🇦".to_string(); }
    if has_any(&c, &["ethiopian"]) { return "🇪🇹".to_string(); }
    if has_any(&c, &["brazilian"]) { return "🇧🇷".to_string(); }
    if has_any(&c, &["argentinian", "argentine"]) { return "🇦🇷".to_string(); }
    if has_any(&c, &["peruvian"]) { return "🇵🇪".to_string(); }
    if has_any(&c, &["jamaican"]) { return "🇯🇲".to_string(); }
    if has_any(&c, &["cuban"]) { return "🇨🇺".to_string(); }
    if has_any(&c, &["portuguese"]) { return "🇵🇹".to_string(); }
    if has_any(&c, &["german"]) { return "🇩🇪".to_string(); }
    if has_any(&c, &["polish"]) { return "🇵🇱".to_string(); }
    if has_any(&c, &["irish"]) { return "🇮🇪".to_string(); }
    if has_any(&c, &["british", "english", "uk"]) { return "🇬🇧".to_string(); }
    if has_any(&c, &["australian", "aussie"]) { return "🇦🇺".to_string(); }
    if has_any(&c, &["new zealand", "kiwi", "nz"]) { return "🇳🇿".to_string(); }

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
