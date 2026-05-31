# Desktop Fix: "Forbidden" cursor when reordering BlockNote blocks

**Target repo:** `journal-to-penpal-pipeline` (Tauri desktop build)
**Symptom:** Dragging a block by its left-side handle in the letter editor shows the browser's 🚫 not-allowed cursor and the drop is refused — block reorder is impossible.
**Reference implementation that works:** the Lovable web port (`src/components/workspace/routedEntryBlock.tsx`, `scaffoldBlock.tsx`, `LetterEditor.tsx`).

---

## 1. Root cause

In your desktop `src/components/blocks/schema.tsx`, the custom `routedEntry` (and `scaffoldBlock`) specs are declared with:

```ts
content: "inline"
```

…and the inner editable surface is exposed via `contentRef` inside a styled wrapper that also contains the "provenance badge" (`userSelect: 'none'`).

What goes wrong during drag-and-drop:

1. BlockNote/TipTap wraps each custom block in a `blockContainer` ProseMirror node. The drag handle drags the *container*.
2. When you hover the drop indicator over another block, ProseMirror resolves a **drop position**. With `content: "inline"`, the body of your `routedEntry` is itself a valid *inline* drop region. A block-level node (another `blockContainer`) cannot legally be inserted at an inline position.
3. ProseMirror's drop handler returns "invalid position" → it does **not** call `event.preventDefault()` on `dragover` → the browser falls back to its default "drop not allowed" cursor.
4. You also see the related warning in console:
   `TextSelection endpoint not pointing into a node with inline content (blockGroup)` — same family of bug: drop/selection landing on a node that cannot host that selection type.

### Why the existing "fix" doesn't help

At the bottom of `schema.tsx` you currently do:

```ts
schemaAny.blockSpecs.routedEntry.implementation.node.config.draggable = true;
schemaAny.blockSpecs.scaffoldBlock.implementation.node.config.draggable = true;
```

This is a **no-op for this bug**. In BlockNote the *outer* `blockContainer` owns drag behavior, not your inner custom node. Mutating `draggable` on the inner node neither enables nor breaks reorder; it just hides the real cause (`content: "inline"` shape).

### Why the Lovable port works

`src/components/workspace/routedEntryBlock.tsx` declares:

```ts
content: "none"
```

The text is rendered from `block.props.entryContent`, and the whole wrapper is `contentEditable={false}`. The block is **atomic** to ProseMirror, so drop-position resolution is unambiguous — there's no inline region for a block-level drop to mis-target. Reorder works without any post-hoc schema mutation.

---

## 2. Fix overview

Bring the desktop custom blocks in line with the working Lovable shape:

- Make `routedEntry` atomic (`content: "none"`); render text from a new `entryContent` prop.
- Make `scaffoldBlock` atomic as well (recommended) OR keep `content: "inline"` but isolate its editable surface (see §3.2 for the alternative).
- Update every producer of these blocks to pass `entryContent` instead of inline `content`.
- Add a one-time normalizer for legacy letters already stored in SQLite, so historical drafts still render.
- Remove the post-hoc `node.config.draggable` mutation.

---

## 3. Detailed changes

### 3.1 `src/components/blocks/schema.tsx` — rewrite

Replace the file with:

```tsx
import { createReactBlockSpec } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

export const RoutedEntry = createReactBlockSpec(
  {
    type: "routedEntry",
    propSchema: {
      entryContent: { default: "" },                 // NEW
      sourceEntryId: { default: "" },
      sourceDate: { default: "" },
      category: {
        default: "uncategorized",
        values: ["presence", "reminiscence", "uncategorized"],
      },
    },
    content: "none",                                  // CHANGED from "inline"
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
          contentEditable={false}                     // NEW
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
              fontSize: 10,
              color: categoryColor,
              fontWeight: "var(--weight-semibold)" as any,
              marginBottom: 4,
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
      scaffoldId: { default: "" },
      sectionLabel: { default: "" },
      sourceEntryId: { default: "" },
      // Optional: if you want the body text editable, keep content: "inline"
      // and add `bodyText` here only as a fallback.
    },
    content: "none",                                  // CHANGED (recommended)
  },
  {
    render: ({ block }) => (
      <div
        className="scaffold-block-container"
        contentEditable={false}
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
            fontSize: 10,
            color: "#10b981",
            fontWeight: "var(--weight-semibold)" as any,
            marginBottom: 4,
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
    routedEntry: RoutedEntry(),
    scaffoldBlock: ScaffoldBlock(),
  },
});

// NOTE: the previous `schemaAny.blockSpecs.*.implementation.node.config.draggable = true`
// mutation has been deleted. It was a no-op and masked the real cause.
```

### 3.2 Alternative for `scaffoldBlock` if you need editable body text

If your product requires editable prose **inside** the scaffold section, keep `content: "inline"` for `scaffoldBlock` but enforce two rules so the drop indicator can't land inside it inappropriately:

1. The wrapper `<div>` is `contentEditable={false}`, and *only* the inner `<div ref={contentRef} contentEditable />` is editable. No siblings of `contentRef` with `userSelect:'none'` inside the same editable parent.
2. Render the label as an outer-most child marked `contentEditable={false}`; render `contentRef` as the **last** child so the inline drop region is bounded.

This is more fragile than the atomic version above — only do it if editable scaffold prose is actually used.

### 3.3 Update block producers

Search the desktop repo for every place that constructs `routedEntry` or `scaffoldBlock` blocks and stop passing inline `content`; pass `entryContent` in `props` instead.

Files to check (per `feature_registry.md` FEAT-003, FEAT-004, FEAT-005):

- `src/components/LetterEditor.tsx` — the drop handler (`onDrop`) and any `editor.insertBlocks([...])` calls. Replace:

  ```ts
  // BEFORE
  editor.insertBlocks(
    [{
      type: "routedEntry",
      props: { sourceEntryId: u.id, sourceDate: u.date ?? "", category: u.category },
      content: [{ type: "text", text: u.content, styles: {} }],
    }],
    referenceBlock, "after",
  );
  ```

  with:

  ```ts
  // AFTER
  editor.insertBlocks(
    [{
      type: "routedEntry",
      props: {
        entryContent: u.content,
        sourceEntryId: u.id,
        sourceDate: u.date ?? "",
        category: u.category,
      },
    }],
    referenceBlock, "after",
  );
  ```

- `src/components/CrawlerPanel.tsx` — any "Route to letter" handler that constructs a block payload.
- `src/components/ScaffoldModal.tsx` — scaffold generation builds blocks for each selected entry; same prop shape change.
- `src/services/workspaceService.ts` and `src/services/letterService.ts` — any helper that builds the JSON blob persisted to SQLite.

For `scaffoldBlock` (atomic variant), set `sectionLabel` in props and drop the inline body content entirely. If you keep the editable variant from §3.2, only the *label* moves into props.

### 3.4 Legacy-letter normalizer (migration)

Existing letters in SQLite have routedEntry blocks shaped like:

```json
{ "type": "routedEntry",
  "props": { "sourceEntryId": "...", "sourceDate": "...", "category": "..." },
  "content": [{ "type": "text", "text": "the entry text", "styles": {} }] }
```

After the schema change, `content: "none"` means BlockNote will refuse to load that inline `content` array. Add a one-pass normalizer at load time in `LetterEditor.tsx`:

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
        return {
          ...b,
          props: { ...b.props, entryContent: text },
          content: undefined,
        };
      }
      return { ...b, content: undefined };
    }
    if (b?.type === "scaffoldBlock") {
      // drop inline content for the atomic variant
      return { ...b, content: undefined };
    }
    return b;
  });
}
```

Use it when computing `initialContent`:

```ts
const initial = JSON.parse(letter.content_json);
const normalized = normalizeLegacyBlocks(initial);
// pass `normalized` to useCreateBlockNote({ schema, initialContent: normalized })
```

The next auto-save will persist the normalized shape, so the migration is incremental and lossless.

### 3.5 Plain-text export

In `src/utils/serialization.ts`, anywhere you currently walk `block.content` for `routedEntry` to extract text, read `block.props.entryContent` instead. For `scaffoldBlock`, emit `"Scaffold: ${sectionLabel}"` (or whatever your spec calls for) from props.

### 3.6 Delete the post-hoc draggable mutation

Remove the entire trailing block from `schema.tsx`:

```ts
// DELETE THIS WHOLE BLOCK
const schemaAny = schema as any;
if (schemaAny.blockSpecs?.routedEntry?.implementation?.node) { ... }
if (schemaAny.blockSpecs?.scaffoldBlock?.implementation?.node) { ... }
```

It was a no-op and creates the false impression that draggability was the problem.

---

## 4. Verification checklist

After applying the changes:

1. **Reorder a routedEntry** — drag by its left handle above and below other blocks. Cursor must show "move/copy", never 🚫. Drop must land.
2. **Reorder a normal paragraph** past a routedEntry — same: no forbidden cursor.
3. **Reorder a scaffoldBlock** in the atomic variant — same.
4. **Existing letters load** — open a draft created before the change. Routed entries still show their original text; reorder works on them too.
5. **Auto-save round-trip** — edit, wait for debounce, reload the app: blocks persist with new shape (`props.entryContent`, no inline `content`).
6. **Plain-text export** still includes the entry text.
7. **Console** is free of the `TextSelection endpoint not pointing into a node with inline content (blockGroup)` warning when dragging.

---

## 5. Files changed (summary)

| File | Change |
|---|---|
| `src/components/blocks/schema.tsx` | Rewrite: `content: "none"` on both blocks, add `entryContent` prop, mark wrappers `contentEditable={false}`, delete post-hoc draggable mutation |
| `src/components/LetterEditor.tsx` | Insert-block payloads use new prop shape; add `normalizeLegacyBlocks` on load |
| `src/components/CrawlerPanel.tsx` | "Route to letter" payload uses new prop shape |
| `src/components/ScaffoldModal.tsx` | Scaffold generation payload uses new prop shape |
| `src/services/workspaceService.ts` / `letterService.ts` | Any helper that builds routed/scaffold blocks |
| `src/utils/serialization.ts` | Plain-text export reads `props.entryContent` |

No Rust / Tauri / SQLite schema changes are required — the JSON blob stays in the same column; only its block shape evolves and is migrated lazily on load.
