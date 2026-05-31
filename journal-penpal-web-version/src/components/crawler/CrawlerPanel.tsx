import { useMemo, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FileUp,
  Plus,
  ArrowLeft,
  Copy,
  Check,
  Loader,
  FileText,
  Clock,
  BookOpen,
  GitBranch,
  FolderHeart,
  Pin,
  Trash2,
  Compass,
  ArrowRight,
  X,
  Search,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppStore } from "@/stores/appStore";
import { useDbQuery, emitDbChange } from "@/hooks/useLiveQuery";
import { queryThoughtUnits } from "@/services/thoughtUnits";
import { listAllLetters } from "@/services/letters";
import { listPenpals } from "@/services/penpals";
import { FilterBar } from "./FilterBar";
import { ThoughtUnitItem, type RouteTarget } from "./ThoughtUnitItem";
import type { ThoughtUnit } from "@/types";
import { db } from "@/services/db";
import { listJournalSources, updateJournalSourceText } from "@/services/journalImport";
import { fetchRoutedThoughtsMap, type RouteInfo } from "@/services/routing";
import {
  listCollections,
  getCollectionWithThoughts,
  deleteCollection,
  createCollection,
  reorderCollection,
  updateCollection,
  type CollectionItemWithThought,
} from "@/services/thoughtunitCollections";
import { format } from "date-fns";

function CollectionThoughtItem({
  item,
  isExpanded,
  onToggleExpand,
  onDragStart,
  onDragOver,
  onDrop,
  onGrabDragStart,
  onRemove,
  targets,
  onRoute,
  onViewSourceContext,
  routes = [],
}: {
  item: CollectionItemWithThought;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onGrabDragStart: (e: React.DragEvent) => void;
  onRemove: () => void;
  targets: RouteTarget[];
  onRoute: (u: ThoughtUnit, letterId: string) => void;
  onViewSourceContext?: (sourceFilePath: string, lineNumber: number) => void;
  routes?: RouteInfo[];
}) {
  const [routeOpen, setRouteOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [unfolded, setUnfolded] = useState(false);
  const [surroundingLines, setSurroundingLines] = useState<
    { lineNum: number; text: string; isTarget: boolean }[]
  >([]);

  const annotation = useDbQuery(
    () =>
      item.thought.anchor_hash
        ? db().marginalia.where("target_unit_hash").equals(item.thought.anchor_hash).first()
        : Promise.resolve(undefined),
    [item.thought.anchor_hash],
  );

  const handleSelectAll = () => {
    setCheckedIds(targets.map((t) => t.letter.id));
  };

  const handleClear = () => {
    setCheckedIds([]);
  };

  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleRoute = () => {
    if (checkedIds.length === 0) return;
    checkedIds.forEach((id) => {
      onRoute(item.thought, id);
    });
    setCheckedIds([]);
    setRouteOpen(false);
  };

  const handleToggleUnfold = async () => {
    if (unfolded) {
      setUnfolded(false);
      return;
    }

    try {
      const source = await db()
        .journal_sources.where("file_path")
        .equals(item.thought.source_file_path)
        .first();
      if (source && source.raw_text) {
        const lines = source.raw_text.split(/\r?\n/);
        const targetIdx = item.thought.source_line_number - 1;
        const start = Math.max(0, targetIdx - 3);
        const end = Math.min(lines.length, targetIdx + 4);
        const fetched = lines.slice(start, end).map((l, idx) => ({
          lineNum: start + idx + 1,
          text: l,
          isTarget: start + idx === targetIdx,
        }));
        setSurroundingLines(fetched);
        setUnfolded(true);
      } else {
        setSurroundingLines([
          { lineNum: item.thought.source_line_number, text: item.thought.content, isTarget: true },
        ]);
        setUnfolded(true);
      }
    } catch (e) {
      console.error("Failed to load surrounding context", e);
    }
  };

  const canRoute = targets.length > 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="group relative flex flex-col gap-2 rounded border border-border/60 bg-surface-elevated/10 p-3 hover:border-primary/40 hover:bg-surface-elevated/20 transition-all shadow-xs"
    >
      {/* grab handle dot on timeline wire */}
      <div
        draggable
        onDragStart={onGrabDragStart}
        className="absolute -left-6 top-4 h-3 w-3 rounded-full bg-surface border border-primary/50 hover:bg-primary transition-colors cursor-grab flex items-center justify-center z-10"
        title="Drag to reorder"
      />

      <div className="flex items-center gap-1.5 mb-2 text-[9px] text-text-secondary/60 select-none">
        <span
          className={`inline-block h-1 w-1 rounded-full shrink-0 ${
            item.thought.category === "presence"
              ? "bg-presence"
              : item.thought.category === "reminiscence"
                ? "bg-reminiscence"
                : item.thought.category === "reflection"
                  ? "bg-reminiscence"
                  : item.thought.category === "thought"
                    ? "bg-amber-500"
                    : item.thought.category === "idea"
                      ? "bg-emerald-500"
                      : "bg-blue-500"
          }`}
        />
        {item.thought.category !== "uncategorized" && (
          <span className="font-mono uppercase tracking-wider text-text-secondary/80 shrink-0">
            {item.thought.category}
          </span>
        )}
        <span className="opacity-40 select-none">·</span>
        <span className="font-mono">{item.thought.date ?? "Undated"}</span>
        {onViewSourceContext && (
          <>
            <span className="opacity-40 select-none">·</span>
            <button
              type="button"
              onClick={() =>
                onViewSourceContext(item.thought.source_file_path, item.thought.source_line_number)
              }
              className="truncate font-mono hover:underline hover:text-primary max-w-[40%] cursor-pointer transition-colors text-left"
              title={`View source context: ${item.thought.source_file_path}`}
            >
              {item.thought.source_file_path.split(/[/\\]/).pop()}
            </button>
          </>
        )}
        <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity select-none">
          <button
            type="button"
            onClick={onRemove}
            className="text-[9px] font-mono text-text-disabled hover:text-error transition-colors cursor-pointer"
          >
            Remove
          </button>
        </span>
      </div>

      <p
        className={`text-xs font-semibold text-foreground whitespace-pre-wrap leading-relaxed select-text ${isExpanded ? "" : "line-clamp-3"}`}
      >
        {item.thought.content}
      </p>
      {routes && routes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 border-t border-border/10 pt-1.5 select-none">
          {routes.map((r) => (
            <button
              key={r.letterId}
              type="button"
              onClick={() => useAppStore.getState().openLetter(r.letterId)}
              className="w-fit inline-flex items-center gap-1 text-[8.5px] font-mono bg-surface border border-border/40 hover:border-primary/40 hover:text-primary px-1.5 py-[1px] rounded cursor-pointer transition-all text-left whitespace-nowrap"
              title={`Click to open letter: ${r.letterTitle}`}
            >
              <span className="text-primary/70 font-semibold shrink-0">→</span>
              <span>{r.penpalName}</span>
            </button>
          ))}
        </div>
      )}

      {item.thought.content.length > 150 && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-left text-[10px] text-primary font-semibold hover:underline select-none shrink-0"
        >
          {isExpanded ? "Show Less" : "Expand Full Thought..."}
        </button>
      )}

      {/* Living Margin inline note */}
      {item.thought.anchor_hash && annotation && (
        <div className="mt-1.5 border-t border-border/30 pt-1 text-[11px] text-text-secondary select-text">
          <span className="font-bold text-primary mr-1 select-none font-mono">
            Reflection Margin:
          </span>
          {annotation.annotation_text}
        </div>
      )}

      {/* Depth Gauge surrounding context unfolded block */}
      {unfolded && (
        <div className="mt-2.5 rounded-md bg-background/50 border border-border/40 p-2 font-mono text-[11px] leading-relaxed text-text-secondary select-text overflow-x-auto">
          <div className="text-[10px] text-primary/60 font-semibold mb-1 uppercase tracking-wider select-none flex items-center gap-1">
            <Compass className="h-3 w-3 animate-spin" style={{ animationDuration: "10s" }} /> Depth
            Gauge Context
          </div>
          <div className="space-y-1">
            {surroundingLines.map((l) => (
              <div
                key={l.lineNum}
                className={`flex gap-2 ${
                  l.isTarget
                    ? "bg-primary/10 text-foreground font-semibold px-1 rounded-sm border-l border-primary"
                    : ""
                }`}
              >
                <span className="w-6 text-right select-none opacity-40">{l.lineNum}</span>
                <span className="flex-1 whitespace-pre-wrap">{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Route and Depth Gauge Action Bar */}
      <div
        className="mt-2 flex justify-between items-center relative select-none"
        onDragStart={(e) => e.stopPropagation()}
        draggable={false}
      >
        {/* Left: Depth Gauge & Source Context Utility */}
        <div className="flex items-center gap-1.5">
          {/* Depth Gauge Unfolding Toggle */}
          <button
            type="button"
            onClick={handleToggleUnfold}
            title={unfolded ? "Recoil depth context" : "Show depth context (Depth Gauge)"}
            className={`inline-flex h-6 w-6 items-center justify-center rounded border transition-all cursor-pointer ${
              unfolded
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-text-secondary hover:text-foreground hover:bg-surface-elevated"
            }`}
          >
            <Compass
              className={`h-3.5 w-3.5 ${unfolded ? "text-primary animate-spin" : ""}`}
              style={{ animationDuration: "10s" }}
            />
          </button>

          {/* View full context inside Sources typewriter pane */}
          {onViewSourceContext && (
            <button
              type="button"
              onClick={() =>
                onViewSourceContext(item.thought.source_file_path, item.thought.source_line_number)
              }
              title="View full context in source file"
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-surface text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right: Key Curation Popover (Route) */}
        <div>
          <button
            type="button"
            onClick={() => setRouteOpen(!routeOpen)}
            disabled={!canRoute}
            title={canRoute ? "Route thought to active letters" : "No active letters to route to"}
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs-token transition-all cursor-pointer ${
              checkedIds.length > 0
                ? "border-primary bg-primary/10 text-primary opacity-100 font-bold"
                : "border-border bg-surface text-text-secondary hover:text-foreground hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed"
            }`}
          >
            <span className="text-[10px] font-semibold">Route</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Route Popover Dropdown */}
        {routeOpen && (
          <>
            <button
              aria-label="Close"
              onClick={() => setRouteOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div
              onDragStart={(e) => e.stopPropagation()}
              draggable={false}
              className="absolute bottom-full right-0 mb-1 z-20 w-64 rounded-md border border-border bg-popover p-2 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-border pb-1 mb-1.5 text-xs-token font-medium text-foreground">
                <span>Route to letters</span>
                <button
                  onClick={() => setRouteOpen(false)}
                  className="text-text-disabled hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mb-1.5 flex gap-1 justify-end">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-0.5 rounded text-[10px] text-text-disabled hover:text-primary transition-colors font-semibold cursor-pointer"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-0.5 rounded text-[10px] text-text-disabled hover:text-primary transition-colors font-semibold cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <ul className="max-h-36 overflow-y-auto space-y-1 mb-2 select-none">
                {targets.map((t) => {
                  const isChecked = checkedIds.includes(t.letter.id);
                  return (
                    <li
                      key={t.letter.id}
                      className="flex items-start gap-2 rounded p-1 hover:bg-accent/5"
                    >
                      <input
                        type="checkbox"
                        id={`timeline-chk-${item.collectionItemId}-${t.letter.id}`}
                        checked={isChecked}
                        onChange={() => handleToggleCheck(t.letter.id)}
                        className="mt-1 h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                      <label
                        htmlFor={`timeline-chk-${item.collectionItemId}-${t.letter.id}`}
                        className="flex-1 min-w-0 cursor-pointer select-none text-left"
                      >
                        <div className="truncate text-sm-token font-medium text-foreground">
                          {t.letter.title || "Untitled letter"}
                        </div>
                        <div className="truncate text-xs-token text-text-disabled">
                          {t.penpal?.name ?? "Unknown penpal"}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                disabled={checkedIds.length === 0}
                onClick={handleRoute}
                className="w-full text-center rounded bg-primary py-1 px-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {checkedIds.length > 0
                  ? `Route to ${checkedIds.length} letter${checkedIds.length === 1 ? "" : "s"}`
                  : "Select target letters"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- ROUTE OVERVIEW REGISTER VIEW ---
interface RoutesDirectoryViewProps {
  routedMap: Map<string, RouteInfo[]>;
  onViewSourceContext?: (sourceFilePath: string, lineNumber: number) => void;
}

function RoutesDirectoryView({ routedMap, onViewSourceContext }: RoutesDirectoryViewProps) {
  const [search, setSearch] = useState("");
  const [expandedHashes, setExpandedHashes] = useState<string[]>([]);

  // Load all thought units in the database so we can display their content matching the hash
  const allThoughts = useDbQuery(() => db().thought_units.toArray(), []);

  // Filter routed thoughts from the allThoughts database using the routedMap keys
  const routedThoughts = useMemo(() => {
    if (!allThoughts) return [];
    return allThoughts.filter((u) => u.anchor_hash && routedMap.has(u.anchor_hash));
  }, [allThoughts, routedMap]);

  // Apply search query filter over content text, dates, categories, and targets
  const filteredRouted = useMemo(() => {
    return routedThoughts.filter((u) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const contentMatch = u.content.toLowerCase().includes(q);
      const categoryMatch = u.category.toLowerCase().includes(q);
      const dateMatch = (u.date ?? "").toLowerCase().includes(q);

      const routes = routedMap.get(u.anchor_hash!) || [];
      const targetsMatch = routes.some(
        (r) => r.penpalName.toLowerCase().includes(q) || r.letterTitle.toLowerCase().includes(q),
      );

      return contentMatch || categoryMatch || dateMatch || targetsMatch;
    });
  }, [routedThoughts, search, routedMap]);

  const toggleExpand = (hash: string) => {
    setExpandedHashes((prev) =>
      prev.includes(hash) ? prev.filter((h) => h !== hash) : [...prev, hash],
    );
  };

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied thought text to clipboard.");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background/5">
      {/* Search Header */}
      <div className="space-y-2 border-b border-border bg-surface px-3 py-2.5 shrink-0 select-none">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-disabled" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search routed thoughts or targets…"
            className="w-full rounded-md border border-border bg-surface-elevated/60 py-1.5 pl-7 pr-2 text-sm-token text-foreground placeholder:text-text-disabled focus:border-primary focus:outline-none"
          />
        </div>
        <div className="text-[10px] text-text-disabled font-mono flex items-center justify-between">
          <span>{filteredRouted.length} routed thought units found</span>
          <span>{routedMap.size} unique keys mapped</span>
        </div>
      </div>

      {/* Directory List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {filteredRouted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-text-disabled select-none">
            <Compass className="h-8 w-8 opacity-30 mb-2 animate-pulse" />
            <p className="text-xs-token leading-normal">
              No routed thoughts match this query.
              <br />
              <span className="text-[10px] text-text-disabled font-mono">
                Route thoughts from "Thoughts" or "Lists" to populate this view.
              </span>
            </p>
          </div>
        ) : (
          filteredRouted.map((u) => {
            const hash = u.anchor_hash!;
            const routes = routedMap.get(hash) || [];
            const isExpanded = expandedHashes.includes(hash);

            return (
              <div
                key={u.id}
                className="group relative flex flex-col gap-2 rounded border border-border bg-surface-elevated/40 p-2.5 transition-colors hover:border-primary/40 hover:bg-surface-elevated shadow-xs"
              >
                <div className="flex items-center gap-1.5 mb-2 text-[9px] text-text-secondary/60 select-none">
                  <span
                    className={`inline-block h-1 w-1 rounded-full shrink-0 ${
                      u.category === "presence"
                        ? "bg-presence"
                        : u.category === "reminiscence"
                          ? "bg-reminiscence"
                          : u.category === "reflection"
                            ? "bg-reminiscence"
                            : u.category === "thought"
                              ? "bg-amber-500"
                              : u.category === "idea"
                                ? "bg-emerald-500"
                                : "bg-blue-500"
                    }`}
                  />
                  {u.category !== "uncategorized" && (
                    <span className="font-mono uppercase tracking-wider text-text-secondary/80 shrink-0">
                      {u.category}
                    </span>
                  )}
                  <span className="opacity-40 select-none">·</span>
                  <span className="font-mono">{u.date ?? "Undated"}</span>

                  {onViewSourceContext && (
                    <>
                      <span className="opacity-40 select-none">·</span>
                      <button
                        type="button"
                        onClick={() => onViewSourceContext(u.source_file_path, u.source_line_number)}
                        className="truncate font-mono hover:underline hover:text-primary max-w-[40%] cursor-pointer transition-colors text-left"
                        title={`View source context: ${u.source_file_path}`}
                      >
                        {u.source_file_path.split(/[/\\]/).pop()}
                      </button>
                    </>
                  )}
                  <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity select-none">
                    <button
                      type="button"
                      onClick={() => handleCopyText(u.content)}
                      className="text-[9px] font-mono text-text-disabled hover:text-primary transition-colors cursor-pointer"
                    >
                      Copy
                    </button>
                  </span>
                </div>

                <p
                  className={`text-sm-token text-foreground whitespace-pre-wrap leading-relaxed select-text ${
                    isExpanded ? "" : "line-clamp-3"
                  }`}
                >
                  {u.content}
                </p>

                {u.content.length > 150 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(hash)}
                    className="text-left text-[10px] text-primary font-semibold hover:underline select-none shrink-0"
                  >
                    {isExpanded ? "Show Less" : "Expand Full Thought..."}
                  </button>
                )}

                {/* Subtle visual marker showing where this thought was routed */}
                <div className="flex flex-col gap-1 border-t border-border/10 pt-2 mt-1">
                  <div className="text-[9px] font-mono text-text-secondary/70 select-none mb-1 capitalize">
                    active routing targets
                  </div>
                  <div className="flex flex-wrap gap-1 select-none">
                    {routes.map((r) => (
                      <button
                        key={r.letterId}
                        type="button"
                        onClick={() => useAppStore.getState().openLetter(r.letterId)}
                        className="w-fit inline-flex items-center gap-1 text-[8.5px] font-mono bg-surface border border-border/40 hover:border-primary/40 hover:text-primary px-1.5 py-[1px] rounded cursor-pointer transition-all text-left whitespace-nowrap"
                        title={`Click to open letter: ${r.letterTitle}`}
                      >
                        <span className="text-primary/70 font-semibold shrink-0">→</span>
                        <span>
                          {r.penpalName} ·{" "}
                          <span className="opacity-80 font-normal">{r.letterTitle}</span>
                        </span>
                        {r.isDraft && (
                          <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded font-mono font-semibold">
                            draft
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function CrawlerPanel() {
  const {
    openModal,
    sourceCount,
    openLetterIds,
    crawlerFilters,
    setCrawlerFilters,
    addToRoutingQueue,
  } = useAppStore();
  const filters = crawlerFilters;

  // Tabs: "thoughts" | "sources" | "collections" | "routes"
  const [activeTab, setActiveTab] = useState<"thoughts" | "sources" | "collections" | "routes">(
    "thoughts",
  );
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [highlightedLineNumber, setHighlightedLineNumber] = useState<number | null>(null);

  // Curation collections states
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [expandedThoughtIds, setExpandedThoughtIds] = useState<string[]>([]);

  // Monospace Editor states
  const [localText, setLocalText] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load all available sources
  const sources = useDbQuery(() => listJournalSources(), []);

  // Load curation collections list
  const collectionsList = useDbQuery(() => listCollections(), []) || [];

  // Load routed thoughts map index for visual marker badges and routes timeline directory
  const routedThoughtsMap =
    useDbQuery(() => fetchRoutedThoughtsMap(), []) || new Map<string, RouteInfo[]>();

  // Load active collection details
  const activeCollectionDetails = useDbQuery(
    () =>
      selectedCollectionId
        ? getCollectionWithThoughts(selectedCollectionId)
        : Promise.resolve(undefined),
    [selectedCollectionId],
  );

  // Find currently active source
  const activeSource = useDbQuery(
    () =>
      selectedSourceId ? db().journal_sources.get(selectedSourceId) : Promise.resolve(undefined),
    [selectedSourceId],
  );

  // Sync text from activeSource when selected source changes
  const lastSelectedSourceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeSource && selectedSourceId !== lastSelectedSourceIdRef.current) {
      setLocalText(activeSource.raw_text ?? "");
      setSaveStatus("saved");
      lastSelectedSourceIdRef.current = selectedSourceId;
    }
  }, [activeSource, selectedSourceId]);

  // Debounced auto-save back to DB + re-parse thought units
  const localTextRef = useRef(localText);
  useEffect(() => {
    localTextRef.current = localText;
  }, [localText]);

  useEffect(() => {
    if (!selectedSourceId || activeSource === undefined) return;
    if (localText === (activeSource?.raw_text ?? "")) return;

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await updateJournalSourceText(selectedSourceId, localTextRef.current);
        emitDbChange();
        setSaveStatus("saved");
      } catch (e) {
        console.error("Auto-save failed", e);
        setSaveStatus("error");
      }
    }, 800); // 800ms debounce

    return () => {
      clearTimeout(timer);
    };
  }, [localText, selectedSourceId, activeSource]);

  // Safe unmount/file checkout validation save
  useEffect(() => {
    const currentSourceId = selectedSourceId;
    return () => {
      if (
        currentSourceId &&
        localTextRef.current &&
        activeSource &&
        localTextRef.current !== activeSource.raw_text
      ) {
        void updateJournalSourceText(currentSourceId, localTextRef.current).then(() =>
          emitDbChange(),
        );
      }
    };
  }, [selectedSourceId, activeSource]);

  // Chamber selection highlight mapper
  useEffect(() => {
    if (highlightedLineNumber !== null && textareaRef.current && activeSource?.raw_text) {
      const text = activeSource.raw_text;
      const lines = text.split(/\r?\n/);
      let startOffset = 0;
      for (let i = 0; i < Math.min(highlightedLineNumber - 1, lines.length); i++) {
        startOffset += lines[i].length + 1; // +1 for newline character
      }
      const endOffset = startOffset + (lines[highlightedLineNumber - 1]?.length ?? 0);

      // Focus and highlight range
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(startOffset, endOffset);

      // Scroll selection to view
      const lineCount = lines.length;
      const linePercentage = highlightedLineNumber / lineCount;
      const scrollHeight = textareaRef.current.scrollHeight;
      const textareaHeight = textareaRef.current.clientHeight;
      textareaRef.current.scrollTop = scrollHeight * linePercentage - textareaHeight / 2;

      setHighlightedLineNumber(null);
    }
  }, [highlightedLineNumber, activeSource, selectedSourceId]);

  // Global Event Listener for view-source-context clicks (e.g. from editor custom blocks)
  useEffect(() => {
    const handleGlobalViewSource = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.sourceFilePath) {
        handleViewSourceContext(detail.sourceFilePath, detail.lineNumber || 1);
      }
    };
    window.addEventListener("view-source-context", handleGlobalViewSource);
    return () => {
      window.removeEventListener("view-source-context", handleGlobalViewSource);
    };
  }, []);

  // Context view anchor
  const handleViewSourceContext = async (sourceFilePath: string, lineNumber: number) => {
    const src = await db().journal_sources.where("file_path").equals(sourceFilePath).first();
    if (src) {
      setSelectedSourceId(src.id);
      setHighlightedLineNumber(lineNumber);
      setActiveTab("sources");
    } else {
      toast.error("Source file context could not be found.");
    }
  };

  // --- Collections Curation Handlers ---

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionTitle.trim()) return;
    const title = newCollectionTitle.trim();
    try {
      const coverColors = [
        "from-blue-500/20 to-indigo-500/20",
        "from-teal-500/20 to-emerald-500/20",
        "from-indigo-500/20 to-purple-500/20",
        "from-purple-500/20 to-pink-500/20",
        "from-pink-500/20 to-rose-500/20",
      ];
      const randomCover = coverColors[Math.floor(Math.random() * coverColors.length)];
      await createCollection({
        title,
        description: "Custom curated collection",
        cover_color: randomCover,
        is_pinned: false,
      });
      setNewCollectionTitle("");
      emitDbChange();
      toast.success(`Created collection "${title}"`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create collection");
    }
  };

  const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === "quick-queue-global") {
      toast.error("Cannot delete the system Quick Queue");
      return;
    }
    if (!confirm("Are you sure you want to delete this curation collection?")) return;
    try {
      await deleteCollection(id);
      if (selectedCollectionId === id) {
        setSelectedCollectionId(null);
      }
      emitDbChange();
      toast.success("Collection deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete collection");
    }
  };

  const handleTogglePinCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = await db().thoughtunit_collections.get(id);
    if (!existing) return;
    try {
      await updateCollection(id, {
        is_pinned: !existing.is_pinned,
      });
      emitDbChange();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCollectionText = () => {
    if (!activeCollectionDetails || activeCollectionDetails.items.length === 0) return;
    const textStream = activeCollectionDetails.items
      .map((item) => item.thought.content)
      .join("\n\n");
    navigator.clipboard.writeText(textStream);
    toast.success("Copied collection text stream to clipboard.");
  };

  const handleCollectionDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("application/x-thoughtunit-collection", id);
    e.dataTransfer.effectAllowed = "copyMove";
  };

  const handleThoughtDragStart = (e: React.DragEvent, thought: ThoughtUnit) => {
    e.dataTransfer.setData("application/x-thought-unit", JSON.stringify(thought));
    e.dataTransfer.effectAllowed = "copyMove";
  };

  // Reorder HTML5 Handlers
  const handleReorderDragStart = (e: React.DragEvent, collectionItemId: string) => {
    e.dataTransfer.setData("text/plain", collectionItemId);
    setDraggedItemId(collectionItemId);
  };

  const handleReorderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleReorderDrop = async (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault();
    const sourceItemId = e.dataTransfer.getData("text/plain") || draggedItemId;
    if (
      !sourceItemId ||
      sourceItemId === targetItemId ||
      !selectedCollectionId ||
      !activeCollectionDetails
    )
      return;

    const items = activeCollectionDetails.items;
    const itemIds = items.map((i) => i.collectionItemId);
    const sourceIndex = itemIds.indexOf(sourceItemId);
    const targetIndex = itemIds.indexOf(targetItemId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newOrderedIds = [...itemIds];
    newOrderedIds.splice(sourceIndex, 1);
    newOrderedIds.splice(targetIndex, 0, sourceItemId);

    await reorderCollection(selectedCollectionId, newOrderedIds);
    emitDbChange();
    setDraggedItemId(null);
  };

  const units = useDbQuery(
    () =>
      queryThoughtUnits({
        search: filters.search.trim() || undefined,
        categories: filters.categories.length ? filters.categories : undefined,
        dateFrom: filters.dateFrom || null,
        dateTo: filters.dateTo || null,
        randomize: filters.randomize,
      }),
    [
      filters.search,
      filters.categories.join(","),
      filters.dateFrom,
      filters.dateTo,
      filters.randomize,
    ],
  );

  const items = useMemo(() => units ?? [], [units]);

  // Letters + penpals to populate "Route to…" dropdown
  const allLetters = useDbQuery(() => listAllLetters(), []);
  const penpals = useDbQuery(() => listPenpals(), []);

  const targets = useMemo<RouteTarget[]>(() => {
    if (!allLetters || !penpals) return [];
    const byId = new Map(allLetters.map((l) => [l.id, l]));
    return openLetterIds
      .map((id) => byId.get(id))
      .filter((l): l is NonNullable<typeof l> => !!l)
      .map((letter) => ({
        letter,
        penpal: penpals.find((p) => p.id === letter.penpal_id),
      }));
  }, [openLetterIds, allLetters, penpals]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 132,
    overscan: 6,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  const routeUnit = (u: ThoughtUnit, letterId: string) => {
    if (!openLetterIds.includes(letterId)) {
      toast.error("That letter is no longer open.");
      return;
    }
    addToRoutingQueue({ unit: u, letterId });
    const target = targets.find((t) => t.letter.id === letterId);
    toast.success(`Routed to ${target?.penpal?.name ?? "letter"}.`);
  };

  const handleCopyText = () => {
    if (!localText) return;
    navigator.clipboard.writeText(localText);
    toast.success("Copied raw journal text to clipboard.");
  };

  // Compute stats for Provenance Loom chronology metrics
  const loomStats = useMemo(() => {
    if (!sources) return { files: 0, thoughts: 0 };
    const thoughts = sources.reduce((sum, s) => sum + s.entry_count, 0);
    return { files: sources.length, thoughts };
  }, [sources]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 select-none">
        <h2 className="text-lg-token font-medium text-foreground flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-primary" /> Journal Crawler
        </h2>
        <button
          aria-label="Manage sources"
          onClick={() => openModal("sources")}
          className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-foreground cursor-pointer transition-colors"
        >
          <FileUp className="h-4 w-4" />
        </button>
      </header>

      {sourceCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center select-none">
          <p className="text-sm-token text-text-disabled">No journal imported yet.</p>
          <button
            onClick={() => openModal("sources")}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Import journal
          </button>
        </div>
      ) : (
        <>
          {/* Segmented Tab Switcher */}
          <div className="flex bg-surface/50 border border-border/30 p-0.5 rounded-lg m-2 gap-0.5 select-none items-center h-7">
            <button
              onClick={() => setActiveTab("thoughts")}
              className={`flex-auto flex justify-center items-center py-1 px-1.5 text-[9.5px] sm:text-[10px] font-medium tracking-tight whitespace-nowrap rounded-md transition-all cursor-pointer ${
                activeTab === "thoughts"
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                  : "text-text-secondary hover:text-foreground hover:bg-surface-elevated/50 border border-transparent"
              }`}
            >
              thoughts
            </button>
            <button
              onClick={() => {
                if (activeTab === "sources") {
                  setSelectedSourceId(null);
                } else {
                  setActiveTab("sources");
                }
              }}
              className={`flex-auto flex justify-center items-center py-1 px-1.5 text-[9.5px] sm:text-[10px] font-medium tracking-tight whitespace-nowrap rounded-md transition-all cursor-pointer ${
                activeTab === "sources"
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                  : "text-text-secondary hover:text-foreground hover:bg-surface-elevated/50 border border-transparent"
              }`}
            >
              sources
              <span className="ml-1 text-[9px] font-semibold text-amber-500 drop-shadow-sm">{sources?.length ?? 0}</span>
            </button>
            <button
              onClick={() => setActiveTab("collections")}
              className={`flex-auto flex justify-center items-center py-1 px-1.5 text-[9.5px] sm:text-[10px] font-medium tracking-tight whitespace-nowrap rounded-md transition-all cursor-pointer ${
                activeTab === "collections"
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                  : "text-text-secondary hover:text-foreground hover:bg-surface-elevated/50 border border-transparent"
              }`}
            >
              lists
              <span className="ml-1 text-[9px] font-semibold text-amber-500 drop-shadow-sm">{collectionsList?.length ?? 0}</span>
            </button>
            <button
              onClick={() => setActiveTab("routes")}
              className={`flex-auto flex justify-center items-center py-1 px-1.5 text-[9.5px] sm:text-[10px] font-medium tracking-tight whitespace-nowrap rounded-md transition-all cursor-pointer ${
                activeTab === "routes"
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                  : "text-text-secondary hover:text-foreground hover:bg-surface-elevated/50 border border-transparent"
              }`}
            >
              routes
              <span className="ml-1 text-[9px] font-semibold text-amber-500 drop-shadow-sm">{routedThoughtsMap.size}</span>
            </button>
          </div>

          {/* Tab 1: Thoughts Virtualized Stream */}
          {activeTab === "thoughts" && (
            <>
              <FilterBar state={filters} onChange={setCrawlerFilters} resultCount={items.length} />
              <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
                {items.length === 0 ? (
                  <p className="p-4 text-sm-token text-text-disabled select-none">
                    No thoughts match these filters.
                  </p>
                ) : (
                  <div
                    style={{
                      height: virtualizer.getTotalSize(),
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    {virtualizer.getVirtualItems().map((vi) => {
                      const unit = items[vi.index];
                      return (
                        <div
                          key={unit.id}
                          data-index={vi.index}
                          ref={virtualizer.measureElement}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            transform: `translateY(${vi.start}px)`,
                            padding: "6px 12px",
                          }}
                        >
                          <ThoughtUnitItem
                            unit={unit}
                            targets={targets}
                            onRoute={routeUnit}
                            onViewSourceContext={handleViewSourceContext}
                            routes={routedThoughtsMap.get(unit.anchor_hash) || []}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <footer className="border-t border-border p-3 select-none">
                <button
                  onClick={() => openModal("sources")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-sm text-foreground hover:bg-accent/10 cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Import journal
                </button>
              </footer>
            </>
          )}

          {/* Tab 2: Sources Directory / Typewriter Pane */}
          {activeTab === "sources" && (
            <div className="flex-1 flex flex-col min-h-0">
              {selectedSourceId === null ? (
                /* Sources Directory list */
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {/* Provenance Loom chronological thread topology dashboard */}
                  <div className="rounded-lg border border-border/60 bg-surface-elevated/20 p-3 select-none flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[10px] text-primary font-semibold uppercase tracking-wider flex items-center gap-1">
                        <GitBranch className="h-3.5 w-3.5 text-primary" /> Provenance Loom
                      </div>
                      <div className="text-[11px] text-text-secondary leading-relaxed">
                        Chronological revisions of parsed memory streams.
                      </div>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <div className="text-xs-token font-semibold text-foreground">
                          {loomStats.files}
                        </div>
                        <div className="text-[9px] text-text-disabled uppercase">Files</div>
                      </div>
                      <div>
                        <div className="text-xs-token font-semibold text-foreground">
                          {loomStats.thoughts}
                        </div>
                        <div className="text-[9px] text-text-disabled uppercase">Thoughts</div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xs-token font-bold text-foreground/80 uppercase tracking-wider select-none">
                    Raw Files directory
                  </h3>
                  <div className="space-y-2 select-none">
                    {sources?.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSourceId(s.id)}
                        className="group flex flex-col gap-1.5 rounded-md border border-border bg-surface-elevated/10 p-3 hover:border-primary/40 hover:bg-surface-elevated/40 transition-all cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-text-disabled group-hover:text-primary shrink-0 transition-colors" />
                          <span className="text-sm-token font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {s.file_name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-text-disabled">
                          <span>
                            Format {s.format_version} · {s.entry_count} paragraphs
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(s.last_imported), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Monospace Typewriter editor */
                <div className="flex-1 flex flex-col min-h-0 bg-background/5">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2 select-none">
                    <button
                      onClick={() => setSelectedSourceId(null)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-surface-elevated hover:text-foreground cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </button>
                    <div className="flex items-center gap-1 text-xs font-semibold text-foreground/90 truncate max-w-[45%]">
                      <span className="truncate">{activeSource?.file_name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSourceId(null)}
                        title="Close file editor"
                        className="rounded-full p-0.5 hover:bg-surface-elevated text-text-disabled hover:text-foreground transition-colors cursor-pointer shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Live Auto-save status indicator */}
                      <span className="flex items-center gap-1 select-none text-[10px] font-semibold text-text-disabled">
                        {saveStatus === "saving" && (
                          <>
                            <Loader className="h-3.5 w-3.5 text-primary animate-spin" />
                            Saving...
                          </>
                        )}
                        {saveStatus === "saved" && (
                          <>
                            <Check className="h-3.5 w-3.5 text-success" />
                            Auto-saved
                          </>
                        )}
                        {saveStatus === "error" && (
                          <span className="text-error flex items-center gap-1">Save Failed</span>
                        )}
                      </span>

                      {/* Copy full raw text */}
                      <button
                        onClick={handleCopyText}
                        title="Copy raw text to clipboard"
                        className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-foreground cursor-pointer transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Monospace writing chamber */}
                  <div className="flex-1 min-h-0 p-3 flex flex-col">
                    <textarea
                      ref={textareaRef}
                      value={localText}
                      onChange={(e) => setLocalText(e.target.value)}
                      placeholder="# Write your raw journal thoughts here...&#10;&#10;Use header date formatting:&#10;# 2026-05-28&#10;&#10;Add paragraph thoughts below."
                      className="w-full flex-1 p-4 font-mono text-sm-token leading-relaxed bg-surface-elevated/10 text-foreground resize-none border border-border/40 rounded-md focus:border-primary/40 focus:ring-1 focus:ring-primary/40 focus:outline-none overflow-y-auto selection:bg-primary/20 selection:text-foreground"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Curation Collections Workspace */}
          {activeTab === "collections" && (
            <div className="flex-1 flex flex-col min-h-0 bg-background/5">
              {selectedCollectionId === null ? (
                /* Collections List View */
                <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
                  {/* Create Collection Input */}
                  <form onSubmit={handleCreateCollection} className="flex gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder="Create a new curated collection... (Press Enter)"
                      value={newCollectionTitle}
                      onChange={(e) => setNewCollectionTitle(e.target.value)}
                      className="flex-1 text-xs-token px-3 py-2 rounded-md bg-surface border border-border/40 focus:ring-1 focus:ring-primary focus:outline-none text-foreground font-mono"
                    />
                  </form>

                  {/* Collections List */}
                  <div className="space-y-3 flex-1">
                    {collectionsList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-text-disabled">
                        <FolderHeart className="h-8 w-8 opacity-40 mb-2" />
                        <p className="text-xs-token font-medium">
                          No thoughtunit collections created yet.
                        </p>
                      </div>
                    ) : (
                      collectionsList.map((c) => {
                        const isPinned = c.is_pinned;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCollectionId(c.id)}
                            draggable
                            onDragStart={(e) => handleCollectionDragStart(e, c.id)}
                            className="group relative flex flex-col gap-2 rounded-lg border border-border/60 bg-surface-elevated/10 p-4 hover:border-primary/40 hover:bg-surface-elevated/20 transition-all cursor-pointer shadow-sm select-none"
                          >
                            {/* cover stripe */}
                            <div
                              className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-lg bg-gradient-to-r ${c.cover_color || "from-blue-500/20 to-indigo-500/20"}`}
                            />

                            <div className="flex items-start justify-between mt-1">
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                                  {c.title}
                                  {isPinned && (
                                    <Pin className="h-3 w-3 text-primary fill-primary" />
                                  )}
                                </h4>
                                {c.description && (
                                  <p className="text-[11px] text-text-secondary truncate leading-relaxed">
                                    {c.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => handleTogglePinCollection(c.id, e)}
                                  title={isPinned ? "Unpin collection" : "Pin collection"}
                                  className="p-1 rounded text-text-secondary hover:bg-surface hover:text-foreground transition-colors cursor-pointer"
                                >
                                  <Pin
                                    className={`h-3.5 w-3.5 ${isPinned ? "text-primary fill-primary" : ""}`}
                                  />
                                </button>
                                {c.id !== "quick-queue-global" && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteCollection(c.id, e)}
                                    title="Delete collection"
                                    className="p-1 rounded text-text-secondary hover:bg-surface hover:text-error transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="text-[10px] text-text-disabled flex items-center justify-between font-mono">
                              <span>curated stream card</span>
                              <span>{format(new Date(c.created_at), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* Collection Active / Playback Detail View */
                (() => {
                  if (!activeCollectionDetails)
                    return (
                      <div className="flex-1 flex items-center justify-center p-6 text-text-disabled select-none">
                        <Loader className="h-6 w-6 text-primary animate-spin" />
                      </div>
                    );

                  const { collection, items } = activeCollectionDetails;

                  // Compute visual ratios of categories in this collection
                  const categoryCounts = items.reduce(
                    (acc, item) => {
                      const cat = item.thought.category || "uncategorized";
                      acc[cat] = (acc[cat] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>,
                  );

                  const total = items.length;

                  // Find earliest and latest dates in the items
                  const dates = items.map((i) => i.thought.date).filter((d): d is string => !!d);
                  let dateRangeStr = "Undated Collection";
                  if (dates.length > 0) {
                    dates.sort();
                    const earliest = format(new Date(dates[0]), "MMM yyyy");
                    const latest = format(new Date(dates[dates.length - 1]), "MMM yyyy");
                    dateRangeStr = earliest === latest ? earliest : `${earliest} - ${latest}`;
                  }

                  // Estimated read time (assuming 200 wpm)
                  const totalWords = items.reduce(
                    (sum, item) => sum + item.thought.content.split(/\s+/).length,
                    0,
                  );
                  const readTime = Math.max(1, Math.round(totalWords / 200));

                  return (
                    <div className="flex-1 flex flex-col min-h-0 bg-background/5">
                      {/* Active Collection Header */}
                      <div className="border-b border-border bg-surface px-4 py-3 flex flex-col gap-2 shrink-0 select-none">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setSelectedCollectionId(null)}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-surface-elevated hover:text-foreground cursor-pointer transition-colors"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back
                          </button>
                          <h3 className="text-sm font-bold text-foreground max-w-[50%] truncate">
                            {collection.title}
                          </h3>
                          <button
                            onClick={handleCopyCollectionText}
                            title="Copy compiled text stream to clipboard"
                            className="rounded p-1.5 text-text-secondary hover:bg-surface-elevated hover:text-foreground cursor-pointer transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Curation Collection Analytics Summary Bar */}
                        <div className="rounded-md border border-border/40 bg-surface-elevated/10 p-2 text-xxs font-mono space-y-2 mt-1">
                          <div className="flex items-center justify-between text-text-secondary">
                            <span>
                              {total} items · ~{readTime} min read
                            </span>
                            <span>{dateRangeStr}</span>
                          </div>

                          {/* Category Vibe Matrix bar */}
                          {total > 0 && (
                            <div className="space-y-1">
                              <div className="h-2 w-full rounded-full bg-border overflow-hidden flex">
                                {Object.entries(categoryCounts).map(([cat, count]) => {
                                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                  if (pct === 0) return null;
                                  const CAT_COLORS: Record<string, string> = {
                                    presence: "bg-presence",
                                    reminiscence: "bg-reminiscence",
                                    reflection: "bg-reminiscence",
                                    thought: "bg-amber-500",
                                    idea: "bg-emerald-500",
                                    uncategorized: "bg-text-disabled",
                                  };
                                  const colorClass = CAT_COLORS[cat] || "bg-blue-500";
                                  return (
                                    <div
                                      key={cat}
                                      className={`${colorClass} h-full`}
                                      style={{ width: `${pct}%` }}
                                      title={`${cat.toUpperCase()}: ${pct}%`}
                                    />
                                  );
                                })}
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-text-disabled font-mono">
                                {Object.entries(categoryCounts).map(([cat, count]) => {
                                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                  const CAT_COLORS: Record<string, string> = {
                                    presence: "bg-presence",
                                    reminiscence: "bg-reminiscence",
                                    reflection: "bg-reminiscence",
                                    thought: "bg-amber-500",
                                    idea: "bg-emerald-500",
                                    uncategorized: "bg-text-disabled",
                                  };
                                  const colorClass = CAT_COLORS[cat] || "bg-blue-500";
                                  return (
                                    <span key={cat} className="flex items-center gap-1">
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full ${colorClass} inline-block`}
                                      />
                                      <span className="uppercase">{cat}</span> ({pct}%)
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timeline Playback Queue */}
                      <div className="flex-1 overflow-y-auto p-4 min-h-0 relative">
                        {items.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center text-text-disabled select-none">
                            <FolderHeart className="h-8 w-8 opacity-30 mb-2" />
                            <p className="text-xs-token leading-normal">
                              No thoughts added to this collection yet.
                              <br />
                              <span className="text-[10px] text-text-disabled font-mono">
                                Use the "Collect" action on thoughts to build this thread.
                              </span>
                            </p>
                          </div>
                        ) : (
                          <div className="relative pl-6 space-y-4">
                            {/* playhead wire timeline line */}
                            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border/50" />

                            {items.map((item) => {
                              const isExpanded = expandedThoughtIds.includes(item.thought.id);
                              return (
                                <CollectionThoughtItem
                                  key={item.collectionItemId}
                                  item={item}
                                  isExpanded={isExpanded}
                                  onToggleExpand={() => {
                                    setExpandedThoughtIds((prev) =>
                                      isExpanded
                                        ? prev.filter((id) => id !== item.thought.id)
                                        : [...prev, item.thought.id],
                                    );
                                  }}
                                  onDragStart={(e) => handleThoughtDragStart(e, item.thought)}
                                  onDragOver={handleReorderDragOver}
                                  onDrop={(e) => handleReorderDrop(e, item.collectionItemId)}
                                  onGrabDragStart={(e) =>
                                    handleReorderDragStart(e, item.collectionItemId)
                                  }
                                  onRemove={async () => {
                                    await db().thoughtunit_collection_items.delete(
                                      item.collectionItemId,
                                    );
                                    emitDbChange();
                                    toast.success("Removed thought from collection");
                                  }}
                                  targets={targets}
                                  onRoute={routeUnit}
                                  onViewSourceContext={handleViewSourceContext}
                                  routes={routedThoughtsMap.get(item.thought.anchor_hash) || []}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* Tab 4: Routes Directory / Registry View */}
          {activeTab === "routes" && (
            <RoutesDirectoryView
              routedMap={routedThoughtsMap}
              onViewSourceContext={handleViewSourceContext}
            />
          )}
        </>
      )}
    </div>
  );
}
