# SPRINT_FIX — BlockNote Drag Reorder: "Forbidden" Cursor

**Repo:** `journal-to-penpal-pipeline` (Tauri desktop)
**Bug:** Dragging any `routedEntry` or `scaffoldBlock` by its left handle shows 🚫 cursor and the drop is refused.
**Root cause:** Both custom blocks declare `content: "inline"`. When ProseMirror resolves a drop position during drag, it targets the inline region inside the block — a block-level node cannot legally drop into an inline position, so it silently rejects the drop. The workaround attempts in `schema.tsx` and `LetterEditor.tsx` that mutate `node.config.draggable` and `nodeType.draggable` are both no-ops and must be deleted.

**Scope:** 3 files. No Rust / Tauri / SQLite schema changes required.

---

## Fix Group 1 — `src/components/blocks/schema.tsx` (full rewrite)

Replace the entire file with the following:

```tsx
import { createReactBlockSpec } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

export const RoutedEntry = createReactBlockSpec(
  {
    type: "routedEntry",
    propSchema: {
      entryContent:  { default: "" },          // NEW — text lives here, not in inline content
      sourceEntryId: { default: "" },
      sourceDate:    { default: "" },
      category: {
        default: "uncategorized",
        values: ["presence", "reminiscence", "uncategorized"],
      },
    },
    content: "none",                            // CHANGED from "inline" — fixes the drag bug
  },
  {
    render: ({ block }) => {
      const category = block.props.category || "uncategorized";
      const categoryColor =
        category === "presence"
          ? "var(--color-presence, #4ECDC4)"
          : category === "reminiscence"
          ? "var(--color-reminiscence, #FF8A65)"
          : "var(--color-primary, #7C6AEF)";
      const categoryBg =
        category === "presence"
          ? "var(--color-presence-tint, rgba(78,205,196,0.08))"
          : category === "reminiscence"
          ? "var(--color-reminiscence-tint, rgba(255,138,101,0.08))"
          : "var(--color-scaffold-tint, rgba(124,106,239,0.08))";

      return (
        <div
          className="routed-entry-block-container"
          contentEditable={false}              // NEW — block is atomic to ProseMirror
          style={{
            borderLeft: `4px solid ${categoryColor}`,
            background: categoryBg,
            padding: "8px 12px",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            margin: "6px 0",
          }}
        >
          <div
            className="provenance-badge"
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
          <p
            style={{
              fontSize: "var(--text-base)",
              color: "var(--color-text-primary)",
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {block.props.entryContent}
          </p>
        </div>
      );
    },
  }
);

export const ScaffoldBlock = createReactBlockSpec(
  {
    type: "scaffoldBlock",
    propSchema: {
      scaffoldId:    { default: "" },
      sectionLabel:  { default: "" },
      sourceEntryId: { default: "" },
    },
    content: "none",                            // CHANGED from "inline" — fixes the drag bug
  },
  {
    render: ({ block }) => (
      <div
        className="scaffold-block-container"
        contentEditable={false}                 // NEW — block is atomic to ProseMirror
        style={{
          borderLeft: "4px solid #10b981",
          background: "rgba(16,185,129,0.08)",
          padding: "8px 12px",
          borderRadius: "0 var(--radius-md) var(--radius-md) 0",
          margin: "6px 0",
        }}
      >
        <div
          className="scaffold-label"
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
          Scaffold: {block.props.sectionLabel}
        </div>
      </div>
    ),
  }
);

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    routedEntry:   RoutedEntry(),
    scaffoldBlock: ScaffoldBlock(),
  },
});

// NOTE: The previous schemaAny.blockSpecs.*.implementation.node.config.draggable = true
// block has been intentionally deleted. It was a no-op that masked the real cause.
```

---

## Fix Group 2 — `src/components/LetterEditor.tsx` (3 surgical changes)

### 2a — Delete the draggable-patching `useEffect`

Locate and delete this entire block (it appears just after `const editor = useCreateBlockNote(...)`):

```ts
// DELETE THIS ENTIRE useEffect — it is a no-op
useEffect(() => {
  const tiptapEditor = (editor as any)._tiptapEditor;
  if (!tiptapEditor?.schema) return;

  ['routedEntry', 'scaffoldBlock'].forEach((typeName) => {
    const nodeType = tiptapEditor.schema.nodes[typeName];
    if (!nodeType) return;
    nodeType.spec.draggable = true;
    nodeType.draggable = true;
  });
}, [editor]);
```

### 2b — Fix block construction in the routing queue consumer

Locate the `blockToInsert` object inside the routing queue `useEffect` (the one that calls `editor.transact`). Replace it:

```ts
// BEFORE
const blockToInsert: any = {
  type: item.blockType || "routedEntry",
  props: item.blockType === "scaffoldBlock" ? {
    scaffoldId: item.scaffoldId || "",
    sectionLabel: item.sectionLabel || "",
    sourceEntryId: item.sourceThoughtUnit.id,
  } : {
    sourceEntryId: item.sourceThoughtUnit.id,
    sourceDate: item.sourceThoughtUnit.date,
    category: item.sourceThoughtUnit.category,
  },
  content: [{ type: "text", text: item.sourceThoughtUnit.content, styles: {} }],
};

// AFTER — entryContent moves into props; content array removed entirely
const blockToInsert: any = {
  type: item.blockType || "routedEntry",
  props: item.blockType === "scaffoldBlock" ? {
    scaffoldId:    item.scaffoldId || "",
    sectionLabel:  item.sectionLabel || "",
    sourceEntryId: item.sourceThoughtUnit.id,
  } : {
    entryContent:  item.sourceThoughtUnit.content,
    sourceEntryId: item.sourceThoughtUnit.id,
    sourceDate:    item.sourceThoughtUnit.date ?? "",
    category:      item.sourceThoughtUnit.category,
  },
};
```

### 2c — Add legacy normalizer and apply it on load

Add this function **outside all components**, at module scope (e.g. just above the `LetterEditor` component declaration):

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeLegacyBlocks(blocks: any[]): any[] {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((b) => {
    if (b?.type === "routedEntry") {
      const hasNew = typeof b.props?.entryContent === "string" && b.props.entryContent.length > 0;
      if (!hasNew && Array.isArray(b.content)) {
        const text = b.content
          .map((n: any) => (typeof n?.text === "string" ? n.text : ""))
          .join("");
        return { ...b, props: { ...b.props, entryContent: text }, content: undefined };
      }
      return { ...b, content: undefined };
    }
    if (b?.type === "scaffoldBlock") {
      return { ...b, content: undefined };
    }
    return b;
  });
}
```

Then in the `loadContent` async function inside the first `useEffect`, apply it before `setInitialBlocks`:

```ts
// BEFORE
if (blocks.length === 0) {
  blocks = [{ type: 'paragraph', content: [] }];
}
setInitialBlocks(blocks);
onBlocksChange(blocks);

// AFTER
if (blocks.length === 0) {
  blocks = [{ type: 'paragraph', content: [] }];
}
const normalized = normalizeLegacyBlocks(blocks);  // migrate old block shapes
setInitialBlocks(normalized);
onBlocksChange(normalized);
```

---

## Fix Group 3 — `src/utils/serialization.ts` (surgical patch to `processBlock`)

The current `processBlock` reads `block.content[]` for text. After the schema change, `routedEntry` blocks carry no `content` array — text is in `block.props.entryContent`. Without this fix, plain-text export silently drops all routed entry text.

Replace the `processBlock` function body:

```ts
// BEFORE
const processBlock = (block: any) => {
  let text = '';
  if (block.content && Array.isArray(block.content)) {
    text = block.content.map((inline: any) => inline.text || '').join('');
  } else if (typeof block.content === 'string') {
    text = block.content;
  }
  if (text.trim() !== '') {
    lines.push(text);
  }
  if (block.children && Array.isArray(block.children)) {
    block.children.forEach(processBlock);
  }
};

// AFTER
const processBlock = (block: any) => {
  let text = '';
  if (block.type === 'routedEntry') {
    // text now lives in props, not inline content
    text = block.props?.entryContent || '';
  } else if (block.type === 'scaffoldBlock') {
    // emit a structural label so exports stay readable
    const label = block.props?.sectionLabel;
    text = label ? `[Scaffold: ${label}]` : '';
  } else if (block.content && Array.isArray(block.content)) {
    text = block.content.map((inline: any) => inline.text || '').join('');
  } else if (typeof block.content === 'string') {
    text = block.content;
  }
  if (text.trim() !== '') {
    lines.push(text);
  }
  if (block.children && Array.isArray(block.children)) {
    block.children.forEach(processBlock);
  }
};
```

---

## Files NOT changed (correction to the diagnosis doc)

The diagnosis doc listed 6 files. The actual scope is 3. Do **not** modify:

| File | Why no change needed |
|---|---|
| `src/components/CrawlerPanel.tsx` | Only calls `addToRoutingQueue` — block construction happens in `LetterEditor`. `sourceThoughtUnit.content` is already in the queue item. |
| `src/components/ScaffoldModal.tsx` | Same — only queues items via `addToRoutingQueue`. |
| `src/services/letterService.ts` | Pure Tauri invoke wrapper. No block construction. |
| `src/services/workspaceService.ts` | No block construction at all. |
| `src/types/index.ts` | `RoutingQueueItem.sourceThoughtUnit` already carries `.content` via `ThoughtUnit`. No new fields needed. |

---

## Verification checklist

Run these after applying all three fix groups:

1. **Drag a `routedEntry` up and down** — cursor must show move/copy, never 🚫. Drop must land and reorder the block.
2. **Drag a normal paragraph past a `routedEntry`** — same, no forbidden cursor.
3. **Drag a `scaffoldBlock`** — same.
4. **Open a letter created before this change** — routed entries must still show their original text (normalizer applied on load).
5. **Route a new entry from the CrawlerPanel** — block appears with correct text in the editor.
6. **Route scaffold entries from ScaffoldModal** — scaffold blocks appear with correct section label.
7. **Auto-save round-trip** — edit something, wait for debounce, reload. Blocks persist with new shape (`props.entryContent`, no `content` array).
8. **Plain-text export** — entry text and scaffold labels appear in the export output.
9. **Console clean** — no `TextSelection endpoint not pointing into a node with inline content (blockGroup)` warning while dragging.
