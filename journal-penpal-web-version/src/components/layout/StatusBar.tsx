import { Check, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

export function StatusBar() {
  const {
    sourceCount,
    penpalCount,
    openLetterIds,
    openModal,
    dirtyLetterIds,
    savingLetterIds,
    activeLetterId,
  } = useAppStore();

  const saving = activeLetterId ? !!savingLetterIds[activeLetterId] : false;
  const dirty = activeLetterId ? !!dirtyLetterIds[activeLetterId] : false;

  let saveLabel: React.ReactNode = null;
  if (activeLetterId) {
    if (saving) {
      saveLabel = (
        <span className="inline-flex items-center gap-1 text-text-secondary">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </span>
      );
    } else if (dirty) {
      saveLabel = <span className="text-warning">Unsaved changes</span>;
    } else {
      saveLabel = (
        <span className="inline-flex items-center gap-1 text-success">
          <Check className="h-3 w-3" /> All changes saved
        </span>
      );
    }
  }

  return (
    <div className="flex h-7 items-center justify-between border-t border-border bg-surface px-3 text-xs-token text-text-secondary">
      <div className="flex items-center gap-4">
        <span>
          {sourceCount} source{sourceCount === 1 ? "" : "s"}
        </span>
        <span>
          {penpalCount} penpal{penpalCount === 1 ? "" : "s"}
        </span>
        <span>{openLetterIds.length} open</span>
        {saveLabel}
      </div>
      <div className="flex items-center gap-3 select-none">
        <button
          onClick={() => openModal("scaffold")}
          disabled={sourceCount === 0 || penpalCount === 0}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-text-secondary hover:bg-surface-elevated hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
        >
          <Sparkles className="h-3 w-3" /> Generate scaffold
        </button>
        <span className="text-text-disabled">Ctrl+S to save · Local-only</span>
        <span className="text-text-disabled">·</span>
        <button
          type="button"
          onClick={async () => {
            if (
              !confirm(
                "🚨 CRITICAL WARNING: This will permanently delete ALL imported journal sources, parsed thoughts, penpals, active letter drafts, and curated collections from your browser. This action CANNOT be undone.\n\nAre you absolutely sure you want to wipe all application data?",
              )
            ) {
              return;
            }
            if (
              !confirm(
                "FINAL CONFIRMATION: Double check that you have backed up any draft letters. Click OK to wipe everything.",
              )
            ) {
              return;
            }
            try {
              const { db } = await import("@/services/db");
              const { emitDbChange } = await import("@/hooks/useLiveQuery");
              
              const tables = db().tables;
              const tableNames = tables.map((t) => t.name);
              
              // Wipe all IndexedDB tables
              await db().transaction("rw", tableNames, async () => {
                for (const t of tables) {
                  await t.clear();
                }
              });
              
              // Clear Zustand persisted store and all localStorage
              localStorage.clear();
              emitDbChange();
              window.location.reload();
            } catch (err) {
              alert("Failed to wipe database: " + (err as Error).message);
            }
          }}
          className="text-text-secondary hover:text-error hover:bg-error/10 p-1 rounded cursor-pointer transition-all shrink-0"
          title="Permanently wipe all IndexedDB databases and clear application cache"
          aria-label="Wipe all data"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
