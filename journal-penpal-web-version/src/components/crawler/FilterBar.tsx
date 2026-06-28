import { useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { Category } from "@/types";
import { DEFAULT_CRAWLER_FILTERS, type CrawlerFilters } from "@/stores/appStore";
import { db } from "@/services/db";
import { useDbQuery } from "@/hooks/useLiveQuery";

export type CrawlerFilterState = CrawlerFilters;
export const defaultFilters = DEFAULT_CRAWLER_FILTERS;

const CATEGORY_META: { key: Category; label: string; cls: string }[] = [
  { key: "note", label: "Note", cls: "bg-blue-500/15 text-blue-500 border-blue-500/40" },
  { key: "presence", label: "Presence", cls: "bg-presence/15 text-presence border-presence/40" },
  {
    key: "reminiscence",
    label: "Reminiscence",
    cls: "bg-reminiscence/15 text-reminiscence border-reminiscence/40",
  },
  { key: "thought", label: "Thought", cls: "bg-amber-500/15 text-amber-500 border-amber-500/40" },
  { key: "idea", label: "Idea", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40" },
  {
    key: "uncategorized",
    label: "Uncategorized",
    cls: "bg-surface-elevated text-text-secondary border-border",
  },
];

export function FilterBar({
  state,
  onChange,
  resultCount,
}: {
  state: CrawlerFilters;
  onChange: (s: CrawlerFilters) => void;
  resultCount: number;
}) {
  const [showFilters, setShowFilters] = useState(false);

  const allCategories =
    useDbQuery(async () => {
      const units = await db().thought_units.toArray();
      const cats = new Set<string>();
      for (const u of units) {
        if (u.category) {
          cats.add(u.category.toLowerCase());
        }
      }
      return Array.from(cats);
    }, []) || [];

  const coreKeys = ["note", "presence", "reminiscence", "thought", "idea", "uncategorized"];
  const dynamicCategoryMeta = [...CATEGORY_META];

  for (const cat of allCategories) {
    if (!coreKeys.includes(cat)) {
      const label = cat.charAt(0).toUpperCase() + cat.slice(1);
      // Insert right before "uncategorized" (which is at the end)
      dynamicCategoryMeta.splice(dynamicCategoryMeta.length - 1, 0, {
        key: cat,
        label,
        cls: "bg-primary/15 text-primary border-primary/40",
      });
    }
  }

  const toggleCategory = (c: Category) => {
    const has = state.categories.includes(c);
    onChange({
      ...state,
      categories: has ? state.categories.filter((x) => x !== c) : [...state.categories, c],
    });
  };

  const anyFilter =
    state.search || state.categories.length || state.dateFrom || state.dateTo || state.randomize;

  const activeFilterCount =
    state.categories.length +
    (state.dateFrom ? 1 : 0) +
    (state.dateTo ? 1 : 0) +
    (state.randomize ? 1 : 0);

  const handlePresetChange = (preset: string) => {
    if (!preset) return;
    const now = new Date();
    let dateFrom = "";
    let dateTo = "";

    const toLocalISOString = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    if (preset === "This Week") {
      const day = now.getDay();
      // start of week (Monday)
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      dateFrom = toLocalISOString(monday);
      dateTo = toLocalISOString(sunday);
    } else if (preset === "This Month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateFrom = toLocalISOString(firstDay);
      dateTo = toLocalISOString(lastDay);
    } else if (preset === "All Time") {
      dateFrom = "";
      dateTo = "";
    }

    onChange({
      ...state,
      dateFrom,
      dateTo,
    });
  };

  return (
    <div className="space-y-2 border-b border-border bg-surface px-3 py-2.5">
      {/* Search Input Row with Collapse Toggle */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-disabled" />
          <input
            type="search"
            value={state.search}
            onChange={(e) => onChange({ ...state, search: e.target.value })}
            placeholder="Search thoughts…"
            className="w-full rounded-md border border-border bg-surface-elevated/60 py-1.5 pl-7 pr-2 text-sm-token text-foreground placeholder:text-text-disabled focus:border-primary focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          title={showFilters ? "Hide detailed filters" : "Show detailed filters"}
          className={[
            "inline-flex h-8 px-2.5 items-center gap-1.5 rounded-md border text-xs font-semibold cursor-pointer transition-all shrink-0 select-none",
            showFilters || activeFilterCount > 0
              ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
              : "border-border bg-surface text-text-secondary hover:text-foreground hover:bg-surface-elevated",
          ].join(" ")}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground select-none shrink-0">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Collapsible detailed tools selection pane */}
      {showFilters && (
        <div className="space-y-2 pt-1 border-t border-border/10">
          {/* Category selection pills bar */}
          <div className="flex flex-wrap gap-1.5">
            {dynamicCategoryMeta.map((c) => {
              const active = state.categories.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCategory(c.key)}
                  className={[
                    "rounded-full border px-2.5 py-0.5 text-xs-token transition-colors cursor-pointer select-none",
                    active
                      ? c.cls
                      : "border-border bg-surface text-text-disabled hover:text-text-secondary hover:bg-surface-elevated",
                  ].join(" ")}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Date Range selectors */}
          <div className="flex flex-col gap-1.5 bg-surface-elevated/10 p-1.5 rounded border border-border/40">
            <select
              value=""
              aria-label="Date range preset"
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full rounded border border-border bg-surface-elevated/60 px-2 py-1 text-xs-token text-foreground focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="" disabled hidden>
                Choose date range preset...
              </option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="All Time">All Time (Clear dates)</option>
            </select>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={state.dateFrom}
                onChange={(e) => onChange({ ...state, dateFrom: e.target.value })}
                className="min-w-0 flex-1 rounded border border-border bg-surface-elevated px-2 py-1 text-xs-token text-foreground focus:border-primary focus:outline-none cursor-pointer"
              />
              <span className="text-xs-token text-text-disabled shrink-0 select-none">→</span>
              <input
                type="date"
                value={state.dateTo}
                onChange={(e) => onChange({ ...state, dateTo: e.target.value })}
                className="min-w-0 flex-1 rounded border border-border bg-surface-elevated px-2 py-1 text-xs-token text-foreground focus:border-primary focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Count & Clear actions row */}
      <div className="flex items-center justify-between text-xs-token text-text-disabled select-none">
        <span>
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </span>
        {anyFilter ? (
          <button
            type="button"
            onClick={() => onChange(defaultFilters)}
            className="inline-flex items-center gap-1 text-text-secondary hover:text-foreground cursor-pointer"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
