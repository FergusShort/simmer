import { useStore } from "@/store";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const {
    recipes, collections, sidebarSection,
    setSidebarSection, createCollection, openImport,
  } = useStore();

  const totalActive = recipes.filter(r => !r.is_archived).length;
  const totalFavs = recipes.filter(r => r.is_favorite && !r.is_archived).length;

  async function handleNewCollection() {
    const name = prompt("New collection name:");
    if (!name?.trim()) return;
    await createCollection(name.trim());
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoName}>Simmer</div>
        <div className={styles.logoSub}>Recipe Manager</div>
      </div>

      <nav className={styles.nav}>
        <NavItem
          icon="📚"
          label="All Recipes"
          badge={totalActive}
          active={sidebarSection === "all"}
          onClick={() => setSidebarSection("all")}
        />
        <NavItem
          icon="♥"
          label="Favourites"
          badge={totalFavs}
          active={sidebarSection === "favourites"}
          onClick={() => setSidebarSection("favourites")}
        />
        <NavItem
          icon="📅"
          label="Meal Planner"
          active={sidebarSection === "planner"}
          onClick={() => setSidebarSection("planner")}
        />

        <div className={styles.sectionLabel}>Collections</div>
        {collections.map(c => (
          <div
            key={c.id}
            className={`${styles.collItem} ${sidebarSection === `coll:${c.id}` ? styles.collActive : ""}`}
            onClick={() => setSidebarSection(`coll:${c.id}`)}
          >
            <span className={styles.collDot} style={{ background: c.color }} />
            <span className={styles.collName}>{c.name}</span>
            <span className={styles.badge}>{c.recipe_count ?? 0}</span>
          </div>
        ))}
        <div className={styles.newColl} onClick={handleNewCollection}>
          + New Collection
        </div>

        <div className={styles.sectionLabel}>Tools</div>
        <NavItem
          icon="🤖"
          label="AI Import"
          active={false}
          onClick={openImport}
        />
      </nav>

      <div className={styles.footer}>
        <button
          className={styles.settingsBtn}
          onClick={() => alert("Settings: theme, default servings, currency (NZD), data path, backup/restore.")}
        >
          ⚙ Settings
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  icon, label, badge, active, onClick,
}: {
  icon: string; label: string; badge?: number; active: boolean; onClick: () => void;
}) {
  return (
    <div
      className={`${styles.navItem} ${active ? styles.navActive : ""}`}
      onClick={onClick}
    >
      <span className={styles.navIcon}>{icon}</span>
      <span>{label}</span>
      {badge !== undefined && <span className={styles.badge}>{badge}</span>}
    </div>
  );
}
