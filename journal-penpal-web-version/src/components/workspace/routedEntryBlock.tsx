// FEAT-004: routed entry block — non-editable card with provenance metadata.
import { createReactBlockSpec } from "@blocknote/react";

export const ROUTED_ENTRY_TYPE = "routedEntry" as const;

export const routedEntryBlock = createReactBlockSpec(
  {
    type: ROUTED_ENTRY_TYPE,
    propSchema: {
      entryContent: { default: "" },
      entryDate: { default: "" },
      entryCategory: {
        default: "uncategorized",
      },
      entrySourceFile: { default: "" },
      entryHash: { default: "" },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => {
      const cat = String(block.props.entryCategory ?? "uncategorized");
      const CAT_DOT: Record<string, string> = {
        presence: "bg-presence",
        reminiscence: "bg-reminiscence",
        reflection: "bg-reminiscence",
        thought: "bg-amber-500",
        idea: "bg-emerald-500",
        uncategorized: "bg-text-disabled",
      };
      const dotClass = CAT_DOT[cat] || "bg-blue-500";

      return (
        <div className="my-2.5 w-full rounded-md border border-border bg-surface-elevated/40 p-2.5 hover:border-primary/40 hover:bg-surface-elevated transition-colors shadow-xs">
          <div
            className="mb-1.5 flex items-center gap-2 text-xxs font-mono text-text-disabled select-none w-full"
            contentEditable={false}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
            {cat !== "uncategorized" && (
              <span className="text-xxs font-mono uppercase bg-surface-elevated/80 border border-border/40 px-1 rounded text-text-secondary select-none">
                {cat}
              </span>
            )}
            <span>{String(block.props.entryDate) || "Undated"}</span>
            {block.props.entrySourceFile ? (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("view-source-context", {
                      detail: {
                        sourceFilePath: String(block.props.entrySourceFile),
                        lineNumber: 1,
                      },
                    }),
                  );
                }}
                className="ml-auto truncate hover:underline hover:text-primary max-w-[50%] select-none cursor-pointer transition-colors text-right"
                title={`View source context: ${String(block.props.entrySourceFile)}`}
              >
                {String(block.props.entrySourceFile).split(/[/\\]/).pop()}
              </button>
            ) : null}
          </div>
          <div
            ref={contentRef}
            className="text-sm-token text-foreground whitespace-pre-wrap leading-relaxed"
          />
        </div>
      );
    },
  },
);
