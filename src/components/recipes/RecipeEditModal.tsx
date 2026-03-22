import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { Recipe, Ingredient } from "@/types";
import styles from "./RecipeEditModal.module.css";

interface IngRow { amt: string; unit: string; name: string; }
interface StepRow { content: string; }

export default function RecipeEditModal() {
  const { recipes, editingId, closeEdit, saveRecipe, deleteRecipe } = useStore();
  const recipe = editingId ? recipes.find(r => r.id === editingId) : null;
  const isNew = !recipe;

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [desc, setDesc] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [mealType, setMealType] = useState("Dinner");
  const [servings, setServings] = useState("4");
  const [prep, setPrep] = useState("");
  const [cook, setCook] = useState("");
  const [cost, setCost] = useState("");
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [ings, setIngs] = useState<IngRow[]>([{ amt: "", unit: "", name: "" }]);
  const [steps, setSteps] = useState<StepRow[]>([{ content: "" }]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isVeg, setIsVeg] = useState(false);
  const [isVgn, setIsVgn] = useState(false);
  const [isGF, setIsGF] = useState(false);
  const [isDF, setIsDF] = useState(false);
  const [isHP, setIsHP] = useState(false);
  const [isMP, setIsMP] = useState(false);
  const [isSp, setIsSp] = useState(false);

  useEffect(() => {
    setName(recipe?.name ?? "");
    setEmoji(recipe?.emoji ?? "");
    setDesc(recipe?.description ?? "");
    setCuisine(recipe?.cuisine ?? "");
    setMealType(recipe?.meal_type ?? "Dinner");
    setServings(String(recipe?.servings ?? 4));
    setPrep(String(recipe?.prep_time ?? ""));
    setCook(String(recipe?.cook_time ?? ""));
    setCost(String(recipe?.total_cost ?? ""));
    setRating(recipe?.rating ?? 0);
    setNotes(recipe?.notes ?? "");
    setSource(recipe?.source ?? "");
    setCalories(String(recipe?.calories ?? ""));
    setProtein(String(recipe?.protein_g ?? ""));
    setTags(recipe?.tags ?? []);
    setTagInput("");
    setConfirmDelete(false);
    setIsDeleting(false);

    setIngs(
      recipe?.ingredients?.map(i => ({
        amt: String(i.amount || ""),
        unit: i.unit,
        name: i.name,
      })) ?? [{ amt: "", unit: "", name: "" }]
    );

    setSteps(
      recipe?.steps?.map(s => ({ content: s.content })) ?? [{ content: "" }]
    );

    setIsVeg(recipe?.is_vegetarian ?? false);
    setIsVgn(recipe?.is_vegan ?? false);
    setIsGF(recipe?.is_gluten_free ?? false);
    setIsDF(recipe?.is_dairy_free ?? false);
    setIsHP(recipe?.is_high_protein ?? false);
    setIsMP(recipe?.is_meal_prep ?? false);
    setIsSp(recipe?.is_spicy ?? false);
  }, [recipe?.id]);

  async function handleSave() {
    if (!name.trim()) {
      (window as any).__toast?.("Recipe name is required.");
      return;
    }

    const prepN = parseInt(prep) || 0;
    const cookN = parseInt(cook) || 0;

    const data: Partial<Recipe> = {
      ...(recipe ?? {}),
      id: recipe?.id,
      name: name.trim(),
      emoji: emoji || "🍽️",
      description: desc.trim(),
      cuisine: cuisine.trim(),
      meal_type: mealType,
      servings: parseInt(servings) || 4,
      prep_time: prepN,
      cook_time: cookN,
      total_time: prepN + cookN,
      total_cost: parseFloat(cost) || 0,
      rating,
      notes: notes.trim(),
      source: source.trim(),
      calories: parseInt(calories) || 0,
      protein_g: parseFloat(protein) || 0,
      is_vegetarian: isVeg,
      is_vegan: isVgn,
      is_gluten_free: isGF,
      is_dairy_free: isDF,
      is_high_protein: isHP,
      is_meal_prep: isMP,
      is_spicy: isSp,
      tags,
      ingredients: ings
        .filter(i => i.name.trim())
        .map((i, idx) => ({
          id: "",
          recipe_id: "",
          sort_order: idx,
          group_name: "",
          name: i.name.trim(),
          amount: parseFloat(i.amt) || 0,
          unit: i.unit.trim(),
          notes: "",
        })) as Ingredient[],
      steps: steps
        .filter(s => s.content.trim())
        .map((s, idx) => ({
          id: "",
          recipe_id: "",
          step_number: idx + 1,
          content: s.content.trim(),
        })) as any,
    };

    await saveRecipe(data);
    (window as any).__toast?.(isNew ? "Recipe added!" : "Recipe updated!");
    closeEdit();
  }

  async function handleDelete() {
    if (!recipe?.id || isDeleting) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      (window as any).__toast?.("Click delete again to permanently remove this recipe.");
      return;
    }

    try {
      setIsDeleting(true);
      await deleteRecipe(recipe.id);
      (window as any).__toast?.("Recipe deleted.");
      closeEdit();
    } catch (err) {
      console.error(err);
      (window as any).__toast?.("Could not delete recipe.");
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  function addTag() {
    const t = tagInput.trim().replace(/,$/, "");
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  }

  function tagKeydown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>{isNew ? "New Recipe" : "Edit Recipe"}</span>
          <button className={styles.closeBtn} onClick={closeEdit}>×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.row}>
            <div className={styles.fg} style={{ flex: 3 }}>
              <label className={styles.label}>Recipe name *</label>
              <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Butter Chicken" />
            </div>
            <div className={styles.fg} style={{ flex: 1 }}>
              <label className={styles.label}>Emoji</label>
              <input className={styles.input} value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🍛" style={{ textAlign: "center", fontSize: "18px" }} />
            </div>
          </div>

          <div className={styles.fg}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} value={desc} onChange={e => setDesc(e.target.value)} placeholder="1-2 sentence description…" rows={2} />
          </div>

          <hr className="sect-hr" />

          <div className={styles.row}>
            <div className={styles.fg}>
              <label className={styles.label}>Cuisine</label>
              <input className={styles.input} value={cuisine} onChange={e => setCuisine(e.target.value)} placeholder="e.g. Italian" />
            </div>
            <div className={styles.fg}>
              <label className={styles.label}>Meal type</label>
              <select className={styles.select} value={mealType} onChange={e => setMealType(e.target.value)}>
                {["Breakfast","Lunch","Dinner","Snack","Dessert","Drink"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className={styles.fg}>
              <label className={styles.label}>Servings</label>
              <input className={styles.input} type="number" value={servings} onChange={e => setServings(e.target.value)} placeholder="4" min={1} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.fg}>
              <label className={styles.label}>Prep (min)</label>
              <input className={styles.input} type="number" value={prep} onChange={e => setPrep(e.target.value)} placeholder="15" min={0} />
            </div>
            <div className={styles.fg}>
              <label className={styles.label}>Cook (min)</label>
              <input className={styles.input} type="number" value={cook} onChange={e => setCook(e.target.value)} placeholder="30" min={0} />
            </div>
            <div className={styles.fg}>
              <label className={styles.label}>Est. cost (~$NZD)</label>
              <input className={styles.input} type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="14.00" min={0} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.fg}>
              <label className={styles.label}>Calories (per srv)</label>
              <input className={styles.input} type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="450" min={0} />
            </div>
            <div className={styles.fg}>
              <label className={styles.label}>Protein g (per srv)</label>
              <input className={styles.input} type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="35" min={0} />
            </div>
            <div className={styles.fg}>
              <label className={styles.label}>Source / URL</label>
              <input className={styles.input} value={source} onChange={e => setSource(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className={styles.fg}>
            <label className={styles.label}>Rating</label>
            <div className="stars">
              {[1,2,3,4,5].map(n => (
                <span key={n} className={`star ${rating >= n ? "on" : ""}`} onClick={() => setRating(rating === n ? 0 : n)}>★</span>
              ))}
            </div>
          </div>

          <hr className="sect-hr" />

          <div className={styles.label} style={{ marginBottom: 8 }}>Dietary flags</div>
          <div className={styles.dietGrid}>
            {[["Vegetarian",isVeg,setIsVeg],["Vegan",isVgn,setIsVgn],["Gluten-free",isGF,setIsGF],
              ["Dairy-free",isDF,setIsDF],["High protein",isHP,setIsHP],["Meal prep",isMP,setIsMP],["Spicy",isSp,setIsSp]
            ].map(([lbl, val, setter]: any) => (
              <label key={lbl} className={styles.checkRow}>
                <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} style={{ accentColor: "var(--terra)" }} />
                {lbl}
              </label>
            ))}
          </div>

          <hr className="sect-hr" />

          <div className={styles.label} style={{ marginBottom: 6 }}>Tags <em style={{ fontWeight: 400 }}>(Enter to add)</em></div>
          <div className={styles.tagWrap} onClick={() => document.getElementById("tag-in")?.focus()}>
            {tags.map(t => (
              <span key={t} className={styles.tagItem}>
                {t}
                <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))}>×</button>
              </span>
            ))}
            <input
              id="tag-in"
              className={styles.tagInput}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={tagKeydown}
              onBlur={addTag}
              placeholder="Add tag…"
            />
          </div>

          <hr className="sect-hr" />

          <div className={styles.label} style={{ marginBottom: 8 }}>Ingredients</div>
          <div className={styles.ingList}>
            {ings.map((ing, i) => (
              <div key={i} className={styles.ingRow}>
                <input className={styles.input} value={ing.amt} onChange={e => setIngs(prev => prev.map((x,j) => j===i ? {...x,amt:e.target.value} : x))} placeholder="Qty" style={{ width: 56 }} />
                <input className={styles.input} value={ing.unit} onChange={e => setIngs(prev => prev.map((x,j) => j===i ? {...x,unit:e.target.value} : x))} placeholder="Unit" style={{ width: 60 }} />
                <input className={styles.input} value={ing.name} onChange={e => setIngs(prev => prev.map((x,j) => j===i ? {...x,name:e.target.value} : x))} placeholder="Ingredient name" style={{ flex: 1 }} />
                <button type="button" className={styles.removeBtn} onClick={() => setIngs(prev => prev.filter((_,j) => j!==i))}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className={styles.addRowBtn} onClick={() => setIngs(prev => [...prev, { amt: "", unit: "", name: "" }])}>+ Add ingredient</button>

          <hr className="sect-hr" />

          <div className={styles.label} style={{ marginBottom: 8 }}>Method</div>
          <div className={styles.stepList}>
            {steps.map((step, i) => (
              <div key={i} className={styles.stepRow}>
                <div className={styles.stepNum}>{i+1}</div>
                <textarea
                  className={styles.stepTa}
                  value={step.content}
                  onChange={e => setSteps(prev => prev.map((x,j) => j===i ? {...x,content:e.target.value} : x))}
                  placeholder={`Step ${i+1}…`}
                  rows={2}
                />
                <button type="button" className={styles.removeBtn} onClick={() => setSteps(prev => prev.filter((_,j) => j!==i))}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className={styles.addRowBtn} onClick={() => setSteps(prev => [...prev, { content: "" }])}>+ Add step</button>

          <hr className="sect-hr" />

          <div className={styles.fg}>
            <label className={styles.label}>Notes</label>
            <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Storage tips, substitutions, variations…" rows={3} />
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {!isNew && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : confirmDelete ? "Click Again to Delete" : "Delete Recipe"}
              </button>
            )}
          </div>

          <div className={styles.footerRight}>
            <button type="button" className={styles.cancelBtn} onClick={closeEdit}>Cancel</button>
            <button type="button" className={styles.saveBtn} onClick={handleSave}>
              {isNew ? "Add Recipe" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}