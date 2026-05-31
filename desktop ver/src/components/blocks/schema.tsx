import { createReactBlockSpec } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

export const ROUTED_ENTRY_TYPE = "routedEntry" as const;

export const RoutedEntry = createReactBlockSpec(
  {
    type: ROUTED_ENTRY_TYPE,
    propSchema: {
      sourceEntryId: { default: "" },
      sourceDate:    { default: "" },
      category:      { default: "uncategorized",
                       values: ["presence", "reminiscence", "uncategorized"] },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => {
      const category = block.props.category || "uncategorized";
      const categoryColor =
        category === "presence"
          ? "var(--color-presence, #4ECDC4)"
          : category === "reminiscence"
          ? "var(--color-reminiscence, #FF8A65)"
          : "var(--color-primary, #7C6AEF)";
      const categoryBg =
        category === "presence"
          ? "var(--color-presence-tint, rgba(78, 205, 196, 0.08))"
          : category === "reminiscence"
          ? "var(--color-reminiscence-tint, rgba(255, 138, 101, 0.08))"
          : "var(--color-scaffold-tint, rgba(124, 106, 239, 0.08))";

      return (
        <div
          className="routed-entry-block-container"
          style={{
            borderLeft: `4px solid ${categoryColor}`,
            background: categoryBg,
            padding: "8px 12px",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            margin: "6px 0",
            width: "100%",
          }}
        >
          <div
            className="provenance-badge"
            contentEditable={false}
            style={{
              fontSize: "10px",
              color: categoryColor,
              fontWeight: "var(--weight-semibold)" as any,
              marginBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              userSelect: "none",
            }}
          >
            {block.props.sourceDate || "Undated"} · #{block.props.category}
          </div>
          <div ref={contentRef} style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)" }} />
        </div>
      );
    },
  },
);

export const ScaffoldBlock = createReactBlockSpec(
  {
    type: "scaffoldBlock",
    propSchema: {
      scaffoldId:    { default: "" },
      sectionLabel:  { default: "" },
      sourceEntryId: { default: "" },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => {
      const sectionLabel = String(block.props.sectionLabel ?? "Scaffold Section");
      return (
        <div
          className="scaffold-block-container"
          style={{
            borderLeft: "4px solid #10b981",
            background: "rgba(16, 185, 129, 0.08)",
            padding: "8px 12px",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            margin: "6px 0",
            width: "100%",
          }}
        >
          <div
            className="scaffold-label"
            contentEditable={false}
            style={{
              fontSize: "10px",
              color: "#10b981",
              fontWeight: "var(--weight-semibold)" as any,
              marginBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              userSelect: "none",
            }}
          >
            Scaffold: {sectionLabel}
          </div>
          <div ref={contentRef} style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)" }} />
        </div>
      );
    },
  },
);

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    routedEntry:   RoutedEntry(),
    scaffoldBlock: ScaffoldBlock(),
  },
});
