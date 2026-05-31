import { X, Circle } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

export function TabBar() {
  const {
    openLetterIds,
    activeLetterId,
    setActiveLetter,
    closeLetter,
    letterTitles,
    dirtyLetterIds,
  } = useAppStore();

  return (
    <div className="flex h-10 items-center gap-1 border-b border-border bg-surface px-2 overflow-x-auto">
      {openLetterIds.length === 0 ? (
        <span className="text-xs-token text-text-disabled px-2">No open letters</span>
      ) : (
        openLetterIds.map((id) => {
          const active = id === activeLetterId;
          const dirty = !!dirtyLetterIds[id];
          const title = letterTitles[id] || "Untitled letter";
          return (
            <div
              key={id}
              className={[
                "group flex h-8 items-center gap-2 rounded-md px-3 text-sm-token cursor-pointer transition-colors",
                active
                  ? "bg-surface-elevated text-foreground border-b-2 border-primary -mb-px"
                  : "text-text-secondary hover:bg-surface-elevated/60",
              ].join(" ")}
              onClick={() => setActiveLetter(id)}
            >
              <span className="truncate max-w-[180px]" title={title}>
                {title}
              </span>
              {dirty && <Circle className="h-2 w-2 fill-warning text-warning" />}
              <button
                type="button"
                aria-label="Close tab"
                className="opacity-0 group-hover:opacity-100 text-text-disabled hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  closeLetter(id);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
