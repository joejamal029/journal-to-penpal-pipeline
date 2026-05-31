import { useState } from "react";
import {
  ArrowRight,
  X,
  BookOpen,
  MessageSquare,
  Compass,
  Check,
  ListPlus,
  Search,
} from "lucide-react";
import type { Letter, Penpal, ThoughtUnit } from "@/types";
import { db, uid, nowIso } from "@/services/db";
import { useDbQuery, emitDbChange } from "@/hooks/useLiveQuery";
import { useAppStore } from "@/stores/appStore";
import { toast } from "sonner";
import type { RouteInfo } from "@/services/routing";
import {
  createCollection,
  addThoughtToCollection,
  removeThoughtFromCollection,
} from "@/services/thoughtunitCollections";

export const THOUGHT_UNIT_MIME = "application/x-thought-unit";

const CAT_DOT: Record<string, string> = {
  presence: "bg-presence",
  reminiscence: "bg-reminiscence",
  reflection: "bg-reminiscence",
  thought: "bg-amber-500",
  idea: "bg-emerald-500",
  uncategorized: "bg-text-disabled",
};

export interface RouteTarget {
  letter: Letter;
  penpal: Penpal | undefined;
}

export function ThoughtUnitItem({
  unit,
  targets,
  onRoute,
  onViewSourceContext,
  routes = [],
}: {
  unit: ThoughtUnit;
  targets: RouteTarget[];
  onRoute: (u: ThoughtUnit, letterId: string) => void;
  onViewSourceContext?: (sourceFilePath: string, lineNumber: number) => void;
  routes?: RouteInfo[];
}) {
  const [open, setOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [contentExpanded, setContentExpanded] = useState(false);

  const collections = useDbQuery(() => db().thoughtunit_collections.toArray(), []) || [];
  const collectionItems =
    useDbQuery(
      () => db().thoughtunit_collection_items.where("thought_unit_id").equals(unit.id).toArray(),
      [unit.id],
    ) || [];
  const inCollectionIds = collectionItems.map((item) => item.collection_id);

  const handleToggleCollection = async (collectionId: string) => {
    const isAlreadyIn = inCollectionIds.includes(collectionId);
    try {
      if (isAlreadyIn) {
        await removeThoughtFromCollection(collectionId, unit.id);
        toast.success("Removed from collection");
      } else {
        await addThoughtToCollection(collectionId, unit.id);
        toast.success("Added to collection");
      }
      emitDbChange();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update collection");
    }
  };

  const handleCreateCollection = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newCollectionTitle.trim()) {
      const title = newCollectionTitle.trim();
      try {
        const newCol = await createCollection({
          title,
          description: "Custom collection",
          cover_color: "from-blue-500/20 to-indigo-500/20",
          is_pinned: false,
        });
        await addThoughtToCollection(newCol.id, unit.id);
        setNewCollectionTitle("");
        toast.success(`Created & added to "${title}"`);
        emitDbChange();
      } catch (err) {
        console.error(err);
        toast.error("Failed to create collection");
      }
    }
  };

  const canRoute = targets.length > 0;

  // Depth Gauge surrounding context states
  const [unfolded, setUnfolded] = useState(false);
  const [surroundingLines, setSurroundingLines] = useState<
    { lineNum: number; text: string; isTarget: boolean }[]
  >([]);

  // Living Margin annotation states
  const [showReflectionInput, setShowReflectionInput] = useState(false);
  const [reflectionText, setReflectionText] = useState("");

  const marginalia = useDbQuery(() => {
    if (!unit.anchor_hash) return Promise.resolve(undefined);
    return db().marginalia.where("target_unit_hash").equals(unit.anchor_hash).first();
  }, [unit.anchor_hash]);

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
      onRoute(unit, id);
    });
    setCheckedIds([]);
    setOpen(false);
  };

  const handleToggleUnfold = async () => {
    if (unfolded) {
      setUnfolded(false);
      return;
    }

    try {
      const source = await db()
        .journal_sources.where("file_path")
        .equals(unit.source_file_path)
        .first();
      if (source && source.raw_text) {
        const lines = source.raw_text.split(/\r?\n/);
        const targetIdx = unit.source_line_number - 1;
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
          { lineNum: unit.source_line_number, text: unit.content, isTarget: true },
        ]);
        setUnfolded(true);
      }
    } catch (e) {
      console.error("Failed to load surrounding context", e);
    }
  };

  const handleSaveReflection = async () => {
    if (!unit.anchor_hash) return;
    try {
      if (marginalia) {
        if (reflectionText.trim() === "") {
          await db().marginalia.delete(marginalia.id);
        } else {
          await db().marginalia.update(marginalia.id, {
            annotation_text: reflectionText.trim(),
          });
        }
      } else {
        if (reflectionText.trim() !== "") {
          await db().marginalia.put({
            id: uid(),
            source_file_path: unit.source_file_path,
            target_unit_hash: unit.anchor_hash,
            annotation_text: reflectionText.trim(),
            created_at: nowIso(),
          });
        }
      }
      emitDbChange();
      setShowReflectionInput(false);
    } catch (e) {
      console.error("Failed to save reflection", e);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData(THOUGHT_UNIT_MIME, JSON.stringify(unit));
        e.dataTransfer.setData("text/plain", unit.content);
      }}
      className="group relative rounded-md border border-border bg-surface-elevated/40 p-2.5 transition-colors hover:border-primary/40 hover:bg-surface-elevated cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center gap-1.5 mb-2 text-[9px] text-text-secondary/60 select-none">
        <span
          className={[
            "inline-block h-1 w-1 rounded-full shrink-0",
            CAT_DOT[unit.category] || "bg-blue-500",
          ].join(" ")}
        />
        {unit.category !== "uncategorized" && (
          <span className="font-mono uppercase tracking-wider text-text-secondary/80 shrink-0">
            {unit.category}
          </span>
        )}
        <span className="opacity-40 select-none">·</span>
        <span className="font-mono">{unit.date ?? "Undated"}</span>
        <span className="opacity-40 select-none">·</span>
        <span
          className="ml-auto truncate font-mono max-w-[50%]"
          title={unit.source_file_path}
        >
          {unit.source_file_path.split(/[/\\]/).pop()}
        </span>
      </div>
      <p
        onClick={() => setContentExpanded(!contentExpanded)}
        title="Click to toggle expand/collapse"
        className={`text-sm-token text-foreground whitespace-pre-wrap cursor-pointer hover:text-foreground/85 transition-colors ${
          contentExpanded ? "" : "line-clamp-4"
        }`}
      >
        {unit.content}
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

      {/* Depth Gauge Context Unfolding */}
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
                className={`flex gap-3 px-1 rounded transition-colors ${
                  l.isTarget
                    ? "bg-primary/10 text-foreground border-l-2 border-primary"
                    : "opacity-60"
                }`}
              >
                <span className="w-6 text-right select-none opacity-40">{l.lineNum}</span>
                <span className="flex-1 whitespace-pre-wrap">{l.text || " "}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Living Margin Reflection Display */}
      {marginalia && !showReflectionInput && (
        <div className="mt-2 rounded border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs-token text-foreground/90 flex gap-2 items-start">
          <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-primary font-semibold uppercase tracking-wider select-none">
              Reflection Margin
            </div>
            <p className="whitespace-pre-wrap leading-relaxed mt-0.5 text-text-secondary">
              {marginalia.annotation_text}
            </p>
          </div>
          <button
            onClick={() => {
              setReflectionText(marginalia.annotation_text);
              setShowReflectionInput(true);
            }}
            className="text-text-disabled hover:text-primary transition-colors text-[10px] font-semibold select-none"
          >
            Edit
          </button>
        </div>
      )}

      {/* Living Margin Reflection Editor */}
      {showReflectionInput && (
        <div className="mt-2 rounded border border-border bg-surface-elevated p-2">
          <textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="Write a reflective note next to this journal paragraph..."
            className="w-full text-xs-token p-1.5 rounded bg-surface border border-border focus:ring-1 focus:ring-primary focus:outline-none text-foreground resize-none h-16 leading-relaxed"
          />
          <div className="mt-1.5 flex justify-end gap-1.5">
            <button
              onClick={() => setShowReflectionInput(false)}
              className="px-2 py-0.5 rounded text-xs-token text-text-secondary hover:bg-surface select-none"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveReflection}
              className="px-2 py-0.5 rounded bg-primary text-xs-token text-primary-foreground font-semibold hover:opacity-90 flex items-center gap-1 shadow-sm select-none"
            >
              <Check className="h-3 w-3" /> Save
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 flex justify-between items-center relative select-none">
        {/* Left: Quick Utility Toggles (Note, Depth, Context) */}
        <div className="flex items-center gap-1.5">
          {/* Living Margin Note Trigger */}
          {!marginalia && !showReflectionInput && (
            <button
              type="button"
              onClick={() => {
                setReflectionText("");
                setShowReflectionInput(true);
              }}
              title="Add reflection to margin"
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-surface text-text-secondary opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Depth Gauge surrounding context unfolded toggle */}
          <button
            type="button"
            onClick={handleToggleUnfold}
            title={unfolded ? "Recoil context" : "Toggle surrounding context (Depth Gauge)"}
            className={`inline-flex h-6 w-6 items-center justify-center rounded border transition-all opacity-0 group-hover:opacity-100 cursor-pointer ${
              unfolded
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-text-secondary hover:text-foreground"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
          </button>

          {/* View full context inside Sources typewriter pane */}
          {onViewSourceContext && (
            <button
              type="button"
              onClick={() => onViewSourceContext(unit.source_file_path, unit.source_line_number)}
              title="View full context in source file"
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-surface text-text-secondary opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right: Key Curation Popovers (Collect, Route) */}
        <div className="flex items-center gap-1.5">
          {/* Curation Collection capture trigger */}
          <button
            type="button"
            onClick={() => {
              setCollectionOpen((v) => !v);
            }}
            title="Add/Remove from Collections"
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs-token transition-all cursor-pointer ${
              inCollectionIds.length > 0
                ? "border-primary bg-primary/10 text-primary opacity-100 font-bold"
                : "border-border bg-surface text-text-secondary hover:text-foreground opacity-0 group-hover:opacity-100"
            }`}
          >
            <ListPlus className="h-3 w-3" />
            <span className="text-[10px] font-semibold">Collect</span>
          </button>

          {/* Route to letters trigger */}
          <button
            type="button"
            disabled={!canRoute}
            onClick={() => {
              setOpen((v) => !v);
            }}
            title={canRoute ? "Route to letters" : "Open a letter first"}
            className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-xs-token text-text-secondary opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-text-secondary cursor-pointer"
          >
            <span className="text-[10px] font-semibold">Route</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {collectionOpen && (
          <>
            <button
              aria-label="Close"
              onClick={() => setCollectionOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div
              onDragStart={(e) => e.stopPropagation()}
              draggable={false}
              className="absolute bottom-full right-0 mb-1 z-20 w-64 rounded-md border border-border bg-popover p-2 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-border pb-1 mb-1.5 text-xs-token font-medium text-foreground">
                <span>Add to Collections</span>
                <button
                  onClick={() => setCollectionOpen(false)}
                  className="text-text-disabled hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Inline Quick Search */}
              <div className="relative mb-2">
                <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-text-disabled" />
                <input
                  type="text"
                  placeholder="Filter collections..."
                  value={collectionSearch}
                  onChange={(e) => setCollectionSearch(e.target.value)}
                  className="w-full text-xs-token pl-6 pr-2 py-0.5 rounded bg-surface border border-border focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                />
              </div>

              {/* Checkbox List of Collections */}
              <ul className="max-h-36 overflow-auto space-y-1 mb-2">
                {collections
                  .filter((c) => c.title.toLowerCase().includes(collectionSearch.toLowerCase()))
                  .map((c) => {
                    const isChecked = inCollectionIds.includes(c.id);
                    return (
                      <li
                        key={c.id}
                        className="flex items-center gap-2 rounded p-1 hover:bg-accent/5"
                      >
                        <input
                          type="checkbox"
                          id={`col-${unit.id}-${c.id}`}
                          checked={isChecked}
                          onChange={() => handleToggleCollection(c.id)}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                        <label
                          htmlFor={`col-${unit.id}-${c.id}`}
                          className="flex-1 min-w-0 cursor-pointer select-none text-left text-xs font-semibold text-foreground truncate"
                        >
                          {c.title}
                        </label>
                      </li>
                    );
                  })}
              </ul>

              {/* Create Inline Input */}
              <div className="border-t border-border/40 pt-1.5">
                <input
                  type="text"
                  placeholder="New collection + Enter"
                  value={newCollectionTitle}
                  onChange={(e) => setNewCollectionTitle(e.target.value)}
                  onKeyDown={handleCreateCollection}
                  className="w-full text-[11px] px-2 py-0.5 rounded bg-surface border border-border focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                />
              </div>
            </div>
          </>
        )}

        {open && (
          <>
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
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
                  onClick={() => setOpen(false)}
                  className="text-text-disabled hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Shortcuts */}
              <div className="flex items-center gap-2 mb-2 text-xxs border-b border-border/40 pb-1.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Select All
                </button>
                <span className="text-text-disabled">|</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-semibold text-text-disabled hover:text-foreground hover:underline"
                >
                  Clear
                </button>
              </div>

              {/* Checkbox List */}
              <ul className="max-h-48 overflow-auto space-y-1 mb-2">
                {targets.map((t) => {
                  const isChecked = checkedIds.includes(t.letter.id);
                  return (
                    <li
                      key={t.letter.id}
                      className="flex items-start gap-2 rounded p-1 hover:bg-accent/5"
                    >
                      <input
                        type="checkbox"
                        id={`chk-${unit.id}-${t.letter.id}`}
                        checked={isChecked}
                        onChange={() => handleToggleCheck(t.letter.id)}
                        className="mt-1 h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor={`chk-${unit.id}-${t.letter.id}`}
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

              {/* Action Button */}
              <button
                type="button"
                disabled={checkedIds.length === 0}
                onClick={handleRoute}
                className="w-full text-center rounded bg-primary py-1 px-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
