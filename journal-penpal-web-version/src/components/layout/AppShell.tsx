import { useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { db } from "@/services/db";
import { TabBar } from "./TabBar";
import { StatusBar } from "./StatusBar";
import { WelcomeScreen } from "./WelcomeScreen";
import { Modals } from "./Modals";
import { PenpalPanel } from "@/components/penpal/PenpalPanel";
import { CrawlerPanel } from "@/components/crawler/CrawlerPanel";
import { Workspace } from "@/components/workspace/Workspace";
import { Toaster } from "@/components/ui/sonner";
import { Sun, Moon } from "lucide-react";

export function AppShell() {
  const {
    theme,
    toggleTheme,
    leftPanelWidth,
    rightPanelWidth,
    sourceCount,
    penpalCount,
    setCounts,
  } = useAppStore();

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Hydrate counts from Dexie
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, p] = await Promise.all([db().journal_sources.count(), db().penpals.count()]);
        if (!cancelled) setCounts(s, p);
      } catch (e) {
        console.error("Dexie hydration failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setCounts]);

  const showWelcome = sourceCount === 0 && penpalCount === 0;

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground">
      <TabBar />
      <div className="flex flex-1 min-h-0">
        {/* Left — Crawler */}
        <aside
          className="flex flex-col border-r border-border bg-surface min-w-[260px]"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <CrawlerPanel />
        </aside>

        {/* Center */}
        <main className="flex-1 flex flex-col bg-background min-w-0 relative">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="absolute right-3 top-3 z-10 rounded p-1.5 text-text-secondary hover:bg-surface-elevated hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {showWelcome ? <WelcomeScreen /> : <Workspace />}
        </main>

        {/* Right — Penpal */}
        <aside
          className="flex flex-col border-l border-border bg-surface min-w-[240px]"
          style={{ width: `${rightPanelWidth}%` }}
        >
          <PenpalPanel />
        </aside>
      </div>
      <StatusBar />
      <Modals />
      <Toaster />
    </div>
  );
}
