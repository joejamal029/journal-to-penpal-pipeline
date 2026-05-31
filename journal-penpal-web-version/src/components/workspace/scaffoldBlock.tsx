// FEAT-004: scaffold block — labelled, tinted section that contains routed
// thoughts as children. Rendered as a non-editable shell; the children
// (routed entries / paragraphs) remain individually editable.
import { createReactBlockSpec } from "@blocknote/react";

export const SCAFFOLD_BLOCK_TYPE = "scaffoldBlock" as const;

export const scaffoldBlock = createReactBlockSpec(
  {
    type: SCAFFOLD_BLOCK_TYPE,
    propSchema: {
      title: { default: "Scaffold" },
      timeframe: { default: "" },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef, children }) => {
      const title = String(block.props.title ?? "Scaffold");
      const timeframe = String(block.props.timeframe ?? "");
      return (
        <div
          className="my-3 w-full rounded-lg border border-routed-border/50 px-3 py-2"
          style={{ backgroundColor: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
        >
          <div
            className="mb-1.5 flex items-center gap-2 text-xs-token uppercase tracking-wider text-text-secondary"
            contentEditable={false}
          >
            <span className="font-medium text-primary">{title}</span>
            {timeframe && <span className="text-text-disabled">· {timeframe}</span>}
          </div>
          <div ref={contentRef} className="text-sm-token text-foreground" />
          <div className="mt-2 space-y-2">{children}</div>
        </div>
      );
    },
  },
);
