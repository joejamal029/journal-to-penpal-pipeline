import { useEffect, useState } from "react";
import {
  FilePlus,
  Mail,
  MailPlus,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { deletePenpal, listPenpals } from "@/services/penpals";
import { createLetter, deleteLetter, listLettersByPenpal } from "@/services/letters";
import { listCorrespondence } from "@/services/correspondence";
import { useDbQuery, emitDbChange } from "@/hooks/useLiveQuery";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

function safeFormatDistanceToNow(dateString: string | null | undefined): string {
  if (!dateString) return "No recent updates";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Undated";
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Undated";
  }
}

export function PenpalPanel() {
  const {
    activePenpalId,
    setActivePenpalId,
    openModal,
    setCounts,
    sourceCount,
    openLetter,
    closeLetter,
  } = useAppStore();
  const penpals = useDbQuery(() => listPenpals(), []);
  const [expandedLetterIds, setExpandedLetterIds] = useState<string[]>([]);

  const toggleLetterExpand = (id: string) => {
    setExpandedLetterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const rawActive = penpals?.find((p) => p.id === activePenpalId);
  const active = rawActive ?? penpals?.[0];

  // Sync store if we fell back to penpals[0]
  useEffect(() => {
    if (!rawActive && penpals && penpals.length > 0 && active) {
      setActivePenpalId(active.id);
    }
  }, [rawActive, penpals, active, setActivePenpalId]);

  const letters = useDbQuery(
    () => (active ? listLettersByPenpal(active.id) : Promise.resolve([])),
    [active?.id],
  );
  const correspondence = useDbQuery(
    () => (active ? listCorrespondence(active.id) : Promise.resolve([])),
    [active?.id],
  );

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg-token font-medium text-foreground">Penpals</h2>
        <button
          aria-label="Add penpal"
          onClick={() => openModal("addPenpal")}
          className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <div className="border-b border-border max-h-48 overflow-auto">
        {!penpals || penpals.length === 0 ? (
          <p className="px-4 py-3 text-sm-token text-text-disabled">No penpals yet.</p>
        ) : (
          <ul>
            {penpals.map((p) => {
              const isActive = active?.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setActivePenpalId(p.id)}
                    className={[
                      "flex w-full items-center gap-2 px-4 py-2 text-left text-sm-token",
                      isActive
                        ? "bg-surface-elevated text-foreground"
                        : "text-text-secondary hover:bg-surface-elevated/60",
                    ].join(" ")}
                  >
                    <UserRound className="h-4 w-4 shrink-0" />
                    <span className="truncate">{p.name}</span>
                    {p.country && (
                      <span className="ml-auto text-xs-token text-text-disabled">{p.country}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {active ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-xl-token text-foreground">{active.name}</h3>
                {active.country && (
                  <p className="text-sm-token text-text-secondary">{active.country}</p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  aria-label="Edit"
                  onClick={() => openModal("editPenpal", active.id)}
                  className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  aria-label="Delete"
                  onClick={async () => {
                    if (!confirm(`Delete "${active.name}"?`)) return;
                    await deletePenpal(active.id);
                    emitDbChange();
                    const all = await listPenpals();
                    setCounts(sourceCount, all.length);
                    setActivePenpalId(all[0]?.id ?? null);
                  }}
                  className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <DetailBlock label="Interests" value={active.interests} chips />
            <DetailBlock label="Topics" value={active.topics} chips />
            <DetailBlock label="Notes" value={active.notes} multiline />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs-token uppercase tracking-wider text-text-disabled">Drafts</p>
                <button
                  onClick={async () => {
                    try {
                      const l = await createLetter(active.id);
                      emitDbChange();
                      openLetter(l.id);
                      toast.success("Draft created successfully.");
                    } catch (error) {
                      console.error("Failed to create draft:", error);
                      toast.error("Failed to create draft. Please try again.");
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded border border-border bg-surface-elevated px-2 py-0.5 text-xs-token text-text-secondary hover:text-foreground"
                >
                  <FilePlus className="h-3 w-3" /> New
                </button>
              </div>
              {!letters || letters.length === 0 ? (
                <p className="text-sm-token text-text-disabled">No drafts yet.</p>
              ) : (
                <ul className="space-y-1">
                  {letters
                    .filter((l) => l.is_draft)
                    .map((l) => (
                      <li key={l.id}>
                        <div className="group flex items-center gap-2 rounded-md border border-border bg-surface-elevated/40 px-2 py-1.5">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-text-disabled" />
                          <button
                            onClick={() => openLetter(l.id)}
                            className="flex-1 min-w-0 text-left text-sm-token text-foreground truncate"
                            title={l.title}
                          >
                            {l.title || "Untitled letter"}
                          </button>
                          <span className="text-xs-token text-text-disabled whitespace-nowrap">
                            {safeFormatDistanceToNow(l.updated_at)}
                          </span>
                          <button
                            aria-label="Delete letter"
                            onClick={async () => {
                              if (!confirm(`Delete "${l.title || "Untitled letter"}"?`)) return;
                              try {
                                closeLetter(l.id);
                                await deleteLetter(l.id);
                                emitDbChange();
                                toast.success("Draft deleted successfully.");
                              } catch (error) {
                                console.error("Failed to delete draft:", error);
                                toast.error("Failed to delete draft. Please try again.");
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-text-disabled hover:text-error"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs-token uppercase tracking-wider text-text-disabled">
                  Correspondence
                </p>
                <button
                  onClick={() => openModal("correspondence", active.id)}
                  className="inline-flex items-center gap-1 rounded border border-border bg-surface-elevated px-2 py-0.5 text-xs-token text-text-secondary hover:text-foreground"
                >
                  <MailPlus className="h-3 w-3" /> Import
                </button>
              </div>
              {!correspondence || correspondence.length === 0 ? (
                <p className="text-sm-token text-text-disabled">No past letters yet.</p>
              ) : (
                <ul className="space-y-2">
                  {correspondence.map((c) => {
                    const isExpanded = expandedLetterIds.includes(c.id);
                    return (
                      <li
                        key={c.id}
                        className="rounded-md border border-border bg-surface-elevated/30 px-2.5 py-2 hover:bg-surface-elevated/40 transition-colors"
                      >
                        <div className="mb-1 flex items-center justify-between text-xs-token text-text-disabled">
                          <div className="flex items-center gap-1.5">
                            {c.direction === "sent" ? (
                              <ArrowUpRight className="h-3 w-3 text-primary" />
                            ) : (
                              <ArrowDownLeft className="h-3 w-3 text-presence" />
                            )}
                            <span className="capitalize">{c.direction}</span>
                            <span>·</span>
                            <span>{c.letter_date}</span>
                          </div>
                          {c.content.length > 200 && (
                            <button
                              onClick={() => toggleLetterExpand(c.id)}
                              className="text-xs-token text-primary hover:underline font-medium focus:outline-none"
                            >
                              {isExpanded ? "Collapse" : "Expand"}
                            </button>
                          )}
                        </div>
                        <p
                          className={`whitespace-pre-wrap text-sm-token text-foreground ${isExpanded ? "" : "line-clamp-4"}`}
                        >
                          {c.content}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm-token text-text-disabled">Select or add a penpal.</p>
        )}
      </div>
    </div>
  );
}

function DetailBlock({
  label,
  value,
  chips,
  multiline,
}: {
  label: string;
  value: string;
  chips?: boolean;
  multiline?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!value?.trim()) return null;

  const isLong = value.length > 150 || value.split("\n").length > 3;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs-token uppercase tracking-wider text-text-disabled">{label}</p>
        {multiline && isLong && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-xs-token text-primary hover:underline font-medium focus:outline-none"
          >
            {isCollapsed ? "Expand" : "Collapse"}
          </button>
        )}
      </div>
      {chips ? (
        <div className="flex flex-wrap gap-1.5">
          {value.split(",").map((t, i) => {
            const tag = t.trim();
            if (!tag) return null;
            return (
              <span
                key={i}
                className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-xs-token text-text-secondary"
              >
                {tag}
              </span>
            );
          })}
        </div>
      ) : multiline ? (
        <p
          className={`whitespace-pre-wrap text-sm-token text-foreground ${
            isLong && isCollapsed ? "line-clamp-3" : ""
          }`}
        >
          {value}
        </p>
      ) : (
        <p className="text-sm-token text-foreground">{value}</p>
      )}
    </div>
  );
}
