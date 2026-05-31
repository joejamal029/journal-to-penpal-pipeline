import { Check, Loader2, Sparkles } from "lucide-react";
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => openModal("scaffold")}
          disabled={sourceCount === 0 || penpalCount === 0}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-text-secondary hover:bg-surface-elevated hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Sparkles className="h-3 w-3" /> Generate scaffold
        </button>
        <span className="text-text-disabled">Ctrl+S to save · Local-only</span>
      </div>
    </div>
  );
}
