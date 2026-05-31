// Scaffold modal — pick timeframe, toggle entries, choose penpals, push.
import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppStore } from "@/stores/appStore";
import { listPenpals } from "@/services/penpals";
import { useDbQuery, emitDbChange } from "@/hooks/useLiveQuery";
import { previewScaffold, generateScaffold } from "@/services/scaffolds";
import type { Category, ThoughtUnit } from "@/types";

const CATS: { id: Category; label: string }[] = [
  { id: "note", label: "Note" },
  { id: "presence", label: "Presence" },
  { id: "reminiscence", label: "Reminiscence" },
  { id: "thought", label: "Thought" },
  { id: "idea", label: "Idea" },
  { id: "uncategorized", label: "Uncategorized" },
];

export function ScaffoldModal() {
  const { modal, closeModal, openLetter } = useAppStore();
  const open = modal === "scaffold";

  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const [start, setStart] = useState(weekAgo);
  const [end, setEnd] = useState(today);
  const [title, setTitle] = useState("This week");
  const [cats, setCats] = useState<Category[]>([]);
  const [selectedPenpals, setSelectedPenpals] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ThoughtUnit[]>([]);

  const penpals = useDbQuery(() => listPenpals(), []);

  useEffect(() => {
    if (!open) return;
    setStart(weekAgo);
    setEnd(today);
    setTitle(`Scaffold · ${weekAgo} → ${today}`);
    setCats([]);
    setSelectedPenpals([]);
    setExcluded(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    previewScaffold({
      title,
      timeframe_start: start,
      timeframe_end: end,
      categories: cats.length ? cats : undefined,
    }).then((rows) => {
      if (!cancelled) {
        setPreview(rows);
        setExcluded(new Set());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, start, end, cats]);

  const includedUnits = useMemo(
    () => preview.filter((u) => !excluded.has(u.id)),
    [preview, excluded],
  );

  const canGenerate = selectedPenpals.length > 0 && includedUnits.length > 0 && !busy;

  const togglePenpal = (id: string) =>
    setSelectedPenpals((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleCat = (c: Category) =>
    setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  const toggleEntry = (id: string) =>
    setExcluded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    try {
      const { letterIds, warnings } = await generateScaffold(
        {
          title,
          timeframe_start: start,
          timeframe_end: end,
          categories: cats.length ? cats : undefined,
        },
        selectedPenpals,
        includedUnits,
      );
      emitDbChange();
      warnings.forEach((w) => toast.warning(w));
      toast.success(
        `Scaffolded into ${letterIds.length} letter${letterIds.length === 1 ? "" : "s"}.`,
      );
      if (letterIds[0]) openLetter(letterIds[0]);
      closeModal();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> Generate scaffold
          </DialogTitle>
          <DialogDescription>
            Bundle thoughts from a timeframe into a draft letter for one or more penpals. Existing
            drafts are appended to, not overwritten.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="block text-xs-token uppercase tracking-wider text-text-disabled mb-1">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm-token text-foreground outline-none focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs-token uppercase tracking-wider text-text-disabled mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm-token text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs-token uppercase tracking-wider text-text-disabled mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm-token text-foreground outline-none focus:border-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs-token uppercase tracking-wider text-text-disabled mb-1">
                Categories
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATS.map((c) => {
                  const on = cats.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCat(c.id)}
                      className={[
                        "rounded-full border px-2 py-0.5 text-xs-token",
                        on
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-surface text-text-secondary hover:text-foreground",
                      ].join(" ")}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs-token uppercase tracking-wider text-text-disabled mb-1">
                Send to penpals
              </label>
              {!penpals || penpals.length === 0 ? (
                <p className="text-sm-token text-text-disabled">No penpals yet.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-auto rounded-md border border-border bg-surface p-2">
                  {penpals.map((p) => {
                    const on = selectedPenpals.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 px-1 py-0.5 text-sm-token text-foreground cursor-pointer"
                      >
                        <input type="checkbox" checked={on} onChange={() => togglePenpal(p.id)} />
                        <span>{p.name}</span>
                        {p.country && (
                          <span className="text-xs-token text-text-disabled">· {p.country}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs-token uppercase tracking-wider text-text-disabled">
                Preview (uncheck to exclude)
              </label>
              <span className="text-xs-token text-text-disabled">
                {includedUnits.length}/{preview.length} included
              </span>
            </div>
            <div className="h-72 overflow-auto rounded-md border border-border bg-surface p-2 space-y-2">
              {preview.length === 0 ? (
                <p className="text-sm-token text-text-disabled">No thoughts in this range.</p>
              ) : (
                preview.map((u) => {
                  const on = !excluded.has(u.id);
                  return (
                    <label
                      key={u.id}
                      className={[
                        "flex gap-2 rounded border px-2 py-1.5 cursor-pointer",
                        on
                          ? "border-border/60 bg-surface-elevated/40"
                          : "border-border/30 bg-surface-elevated/10 opacity-50",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleEntry(u.id)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs-token text-text-disabled">
                          {u.date ?? "Undated"} · {u.category}
                        </div>
                        <p className="text-sm-token text-foreground whitespace-pre-wrap line-clamp-3">
                          {u.content}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={closeModal}
            className="rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-sm-token text-foreground hover:bg-accent/10"
          >
            Cancel
          </button>
          <button
            disabled={!canGenerate}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm-token font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Push to letters {selectedPenpals.length > 0 && `(${selectedPenpals.length})`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
