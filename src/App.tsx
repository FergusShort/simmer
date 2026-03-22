import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import Sidebar from "@/components/layout/Sidebar";
import LibraryView from "@/components/recipes/LibraryView";
import PlannerView from "@/components/planner/PlannerView";
import RecipeDetail from "@/components/recipes/RecipeDetail";
import RecipeEditModal from "@/components/recipes/RecipeEditModal";
import ImportModal from "@/components/import/ImportModal";
import CookLogModal from "@/components/recipes/CookLogModal";
import CollectionPickModal from "@/components/recipes/CollectionPickModal";
import styles from "./App.module.css";

export default function App() {
  const { init, view, detailOpen, editOpen, importOpen, logOpen, collPickOpen } = useStore();
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void init();

    (window as any).__toast = (msg: string) => {
      const el = toastRef.current;
      if (!el) return;
      el.textContent = msg;
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 2200);
    };
  }, [init]);

  return (
    <div className={styles.app}>
      <Sidebar />
      <main className={styles.main}>
        {view === "library" && <LibraryView />}
        {view === "planner" && <PlannerView />}
      </main>

      {detailOpen && <RecipeDetail />}
      {editOpen && <RecipeEditModal />}
      {importOpen && <ImportModal />}
      {logOpen && <CookLogModal />}
      {collPickOpen && <CollectionPickModal />}

      <div className="toast" ref={toastRef} />
    </div>
  );
}