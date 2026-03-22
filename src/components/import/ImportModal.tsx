import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "@/store";
import { ParsedRecipe } from "@/types";
import { parsedToRecipe } from "@/lib/db";
import styles from "./ImportModal.module.css";

const PROMPT = `Convert the following recipe into this exact format. Fill every field you can reasonably infer. Leave unknown fields blank — do not write "N/A". I am in New Zealand, so:
- Estimate the TOTAL recipe cost in NZD as a single figure (prefix with ~) based on typical NZ supermarket prices (Countdown/Woolworths NZ or Pak'nSave)
- Use metric measurements (grams, ml, kg, litres)
- Use NZ ingredient names where relevant (e.g. "capsicum" not "bell pepper", "courgette" not "zucchini", "coriander" not "cilantro")
- Seasons are reversed from the northern hemisphere
Output clean Markdown only — no commentary, no preamble.
- ALSO DOUBLE CHECK THE PRICES — I know AI can be very wrong on this, so if it seems way off, adjust it to be more in line with typical NZ prices.
- ALSO MAKE SURE YOU PUT THE STUFF JUST LIKE BELOW E.G PUT THE COPY INTO A CODE BLOCK, AND USE THE SAME HEADERS AND FORMAT, OTHERWISE THE APP WON'T BE ABLE TO PARSE IT!
- ALSO IF THE RECIPE INCLUDES MULTIPLE THING E.G A MAIN AND A SIDE HAVE THEM BOTH THERE BUT JUST CHANGE THE TITLE, AND PUT ALL THE INGREDIENTS IN ONE PLACE
- ALSO IF ITS LIKE 1 1/2 tsp JUST WRITE 1.5 TSP, OR IF ITS LIKE A RANGE 1-2 TSP JUST WRITE 1.5 TSP or WHATEVER YOU THINK IS MOST LIKELY, BUT DONT LEAVE IT AS A RANGE OR FRACTION BECAUSE THE APP WONT BE ABLE TO PARSE IT
- ALSO FOR TAGS DON'T MAKE IT SUPER SPECIFIC, JUST PUT LIKE "SPICY" OR "COMFORT FOOD" OR "MEAL PREP" OR "HIGH PROTEIN" OR WHATEVER, DONT MAKE IT SUPER NARROW LIKE "SPICY BUT NOT TOO SPICY FOR MOST PEOPLE" OR "MEAL PREP BUT ONLY IF YOU HAVE A LOT OF TIME ON YOUR HANDS TO COOK IT BECAUSE ITS KINDA COMPLICATED", JUST MAKE IT BROAD AND SIMPLE OR SOMETHING LIKE BURRITOS ETC ETC JUST MAKE SIMPLE AND ONLY PUT TWO - THREE TAGS IF NECESSARY AND FOUR IF REALLY NECESSARY
---
name: [Recipe name]
description: [1-2 sentences]
servings: [number]
prep_time: [minutes]
cook_time: [minutes]
cuisine: [e.g. Italian, Indian, NZ, Thai]
meal_type: [breakfast/lunch/dinner/snack/dessert]
source: [URL or description, if known]
rating:
tags: [comma-separated, e.g. comfort food, spicy, meal prep, high protein]
total_cost_estimate: [~$X.XX NZD]

dietary:
  vegetarian: [true/false]
  vegan: [true/false]
  gluten_free: [true/false]
  dairy_free: [true/false]
  spicy: [true/false]
  high_protein: [true/false]
  meal_prep: [true/false]

nutrition (per serving):
  calories: [integer]
  protein: [Xg]
  carbs: [Xg]
  fat: [Xg]
---

## Ingredients
- [amount] [unit] [ingredient name], [prep note if any]

## Method
1. [Complete sentence. One clear action per step.]

## Notes
[Storage, substitutions, tips. Leave blank if nothing useful to add.]

---
Here is the recipe to convert:

[PASTE RECIPE HERE]`;

type Tab = "paste" | "guide";

export default function ImportModal() {
  const { closeImport, saveRecipe, openEdit } = useStore();
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleParse() {
    if (!text.trim()) { setError("Paste a recipe first."); return; }
    setParsing(true);
    setError("");
    try {
      const parsed = await invoke<ParsedRecipe>("parse_import_text", { text });
      const recipe = await parsedToRecipe(parsed);
      // Save it then open in edit form so user can review
      await saveRecipe(recipe);
      (window as any).__toast?.("Recipe imported! Review and save any changes.");
      closeImport();
    } catch (e: any) {
      setError(String(e));
    } finally {
      setParsing(false);
    }
  }

  function copyPrompt() {
    navigator.clipboard.writeText(PROMPT).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) closeImport(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>Add Recipe</span>
          <button className={styles.closeBtn} onClick={closeImport}>×</button>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === "paste" ? styles.tabOn : ""}`} onClick={() => setTab("paste")}>
            📋 Paste from AI
          </button>
          <button className={`${styles.tab} ${tab === "guide" ? styles.tabOn : ""}`} onClick={() => setTab("guide")}>
            🤖 Prompt Guide
          </button>
        </div>

        <div className={styles.body}>
          {tab === "paste" && (
            <>
              <p className={styles.hint}>
                Use the <strong>Prompt Guide</strong> tab to get the exact prompt to give ChatGPT or Claude.
                Paste the AI-formatted result below — the app will parse it automatically.
              </p>
              <textarea
                className={styles.textarea}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={`---\nname: Butter Chicken\nservings: 4\ntotal_cost_estimate: ~$14.00\ncuisine: Indian\n\n## Ingredients\n- 600g chicken thighs…`}
              />
              {error && <div className={styles.error}>{error}</div>}
            </>
          )}
          {tab === "guide" && (
            <>
              <p className={styles.hint}>
                Copy this prompt, paste it into ChatGPT or Claude, then add your recipe at the bottom.
                The AI will return a clean structured format the app can parse automatically.
              </p>
              <pre className={styles.promptBox}>{PROMPT}</pre>
              <button className={styles.copyBtn} onClick={copyPrompt}>
                {copied ? "✓ Copied!" : "Copy Prompt"}
              </button>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={closeImport}>Cancel</button>
          {tab === "paste" && (
            <button className={styles.parseBtn} onClick={handleParse} disabled={parsing}>
              {parsing ? "Parsing…" : "Parse & Import →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
