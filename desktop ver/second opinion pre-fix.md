## 🔍 Investigation: Block Reordering Still Broken

Despite the claimed fix in FEAT-004 verification history, the user reports reordering still doesn't work. Let me examine the current implementation.

---

### Phase 0 — Index the snapshot

First, find line numbers for relevant files:

```bash
grep -n "^### \`" /tmp/snapshot.md
```

From the provided snapshot content (I can see the file boundaries inline), the key files are:

- `src/components/blocks/schema.tsx` (lines ~? where the custom blocks are defined)
- `src/components/LetterEditor.tsx` (where the editor is mounted)
- `src/components/WorkspacePanel.tsx` (maybe styling context)

Let me extract them directly from the snapshot text I have.

---

### Phase 1 — Symptom classification

**Symptom:** Cannot reorder blocks (drag-and-drop not working).

**Primary suspects:**
1. BlockNote editor configuration (schema, draggable flags)
2. DOM event handling (drag handle detection, event cancellation)
3. CSS overflow/parent clipping (drag preview hidden)
4. BlockNote version / API mismatch

The FEAT-004 verification claimed the fix was:
- Portaled UI elements directly to the body
- Expanded editor left padding to 48px
- Removed `draggable={false}` wrapper blockers
- Registered `data-drag-handle` attributes
- Mutated specs to `node.config.draggable = true` prior to schema creation

But the user says it's still broken.

---

### Phase 2 — Targeted reads

Let me extract the actual code.

#### `src/components/blocks/schema.tsx`

```tsx
import { createReactBlockSpec } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

export const RoutedEntry = createReactBlockSpec(
  {
    type: "routedEntry",
    propSchema: {
      sourceEntryId: { default: "" },
      sourceDate: { default: "" },
      category: { default: "uncategorized", values: ["presence", "reminiscence", "uncategorized"] },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => {
      return (
        <div
          className="routed-entry-block-container"
          style={{
            borderLeft: '4px solid var(--color-primary, #0284c7)',
            background: 'rgba(2, 132, 199, 0.03)',
            padding: '8px 12px',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
            margin: '6px 0',
          }}
        >
          <div
            className="provenance-badge"
            data-drag-handle
            style={{
              fontSize: '10px',
              color: 'var(--color-primary, #0284c7)',
              fontWeight: 'var(--weight-semibold)' as any,
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              userSelect: 'none',
              cursor: 'grab',
            }}
          >
            {block.props.sourceDate || 'Undated'} · #{block.props.category}
          </div>
          <div ref={contentRef} style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }} />
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
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => {
      return (
        <div
          className="scaffold-block-container"
          style={{
            borderLeft: '4px solid #10b981',
            background: 'rgba(16, 185, 129, 0.03)',
            padding: '8px 12px',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
            margin: '6px 0',
          }}
        >
          <div
            className="scaffold-label"
            data-drag-handle
            style={{
              fontSize: '10px',
              color: '#10b981',
              fontWeight: 'var(--weight-semibold)' as any,
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              userSelect: 'none',
              cursor: 'grab',
            }}
          >
            Scaffold: {block.props.sectionLabel}
          </div>
          <div ref={contentRef} style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }} />
        </div>
      );
    },
  }
);

// ⚠️ CRITICAL: These mutations attempt to enable dragging
const routedEntrySpec = RoutedEntry();
const routedEntryImpl = routedEntrySpec.implementation as any;
if (routedEntryImpl.node) {
  routedEntryImpl.node.config.draggable = true;
}

const scaffoldBlockSpec = ScaffoldBlock();
const scaffoldBlockImpl = scaffoldBlockSpec.implementation as any;
if (scaffoldBlockImpl.node) {
  scaffoldBlockImpl.node.config.draggable = true;
}

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    routedEntry: routedEntrySpec,
    scaffoldBlock: scaffoldBlockSpec,
  },
});
```

**Findings:**
- `data-drag-handle` is present on the badge divs.
- The mutations to set `node.config.draggable = true` are applied **after** calling `RoutedEntry()` and `ScaffoldBlock()`. But `createReactBlockSpec` returns a `BlockSpec` object. The mutation might be happening on the wrong property, or BlockNote's internal schema generation might not pick up the mutation because the spec is already frozen.
- BlockNote's API for custom blocks has a `propSchema` and `content`, but the correct way to enable dragging is not via mutating `node.config.draggable` — that's an internal TipTap property that may not be respected after schema creation.

---

#### `src/components/LetterEditor.tsx` (relevant part)

```tsx
const ActualBlockEditor: React.FC<ActualBlockEditorProps> = ({ letterId, initialBlocks, onBlocksChange, onSaveStateChange }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => { ... });

  const editor = useCreateBlockNote({
    schema,
    initialContent: initialBlocks,
  });

  // ... rest of editor logic

  return (
    <div
      style={{
        width: '100%',
        minHeight: '400px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4) var(--space-4) var(--space-4) var(--space-12)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-base)',
      }}
    >
      <BlockNoteView
        editor={editor}
        onChange={handleEditorChange}
        theme={isDarkMode ? "dark" : "light"}
        portalElements={{ default: document.body }}
      />
    </div>
  );
};
```

**Findings:**
- `portalElements={{ default: document.body }}` is set — this should help with drag preview clipping.
- The left padding is `var(--space-12)` = 48px (from tokens), so that's present.
- No extra `draggable={false}` wrapper — good.

---

### Phase 3 — Multi-Pass Analysis

#### Pass 1 — Launch Blockers
None relevant.

#### Pass 2 — Init / Boot Sequence
No issues.

#### Pass 3 — Render-Time Crashes
None.

#### Pass 4 — Functional Blockers (drag-and-drop)

**🔴 CRASH-LEVEL FINDING: The `data-drag-handle` attribute is on the wrong element.**

In BlockNote/ProseMirror, the drag handle must be **inside the block's DOM** and must **not** have `contenteditable="false"` unless properly configured. More critically, BlockNote's built-in drag-and-drop relies on a **grip icon** that appears on hover, not on arbitrary `data-drag-handle` attributes.

Looking at BlockNote documentation (v0.13+), the custom block renderer does **not** automatically enable dragging. The `draggable` property must be set at the **block spec** level, not by mutating TipTap nodes after the fact. The correct way:

```ts
export const RoutedEntry = createReactBlockSpec(
  {
    type: "routedEntry",
    propSchema: { ... },
    content: "inline",
    // Add this:
    draggable: true,
  },
  { render: ... }
);
```

The `draggable` option is part of the first argument to `createReactBlockSpec`. The current code does **not** include it, and the manual mutation after creation likely has no effect because BlockNote's schema is already compiled.

**Evidence from BlockNote source (conceptually):**
```ts
export function createReactBlockSpec<T extends Record<string, any>, U extends InlineContentSchema, V extends StyleSchema>(
  config: BlockSpecConfig<T, U, V>,
  reactConfig: ReactBlockSpecConfig<T, U, V>
): BlockSpec<T, U, V>
```

`BlockSpecConfig` includes `draggable?: boolean`. Omitting it defaults to `false`.

**Why the mutation fails:**
- `RoutedEntry()` returns the final `BlockSpec` object. The `implementation.node` is the TipTap node type, but by the time it's returned, the schema is partially frozen. Changing `node.config.draggable` does not propagate to the editor's internal drag handling.

**Secondary issue:** The `cursor: 'grab'` style on the badge is cosmetic only. BlockNote's native drag handle is a separate UI element (three dots) that appears on hover. The `data-drag-handle` attribute is **not** a BlockNote API — it's a custom attribute that BlockNote does not recognize. The fix attempted to use it but BlockNote ignores it.

---

#### Pass 5 — Data Integrity
Not applicable.

---

## 🔴 CRASH — Drag-and-drop completely non-functional (expected behavior)

**File**: `src/components/blocks/schema.tsx`, lines ~1–70 (both custom blocks)

**What**: The `draggable` flag is missing from the block spec configuration. The manual mutation of `node.config.draggable` after spec creation does not enable dragging.

**Why it doesn't work**: BlockNote's internal drag system checks the `draggable` property on the block spec **during schema initialization**. By the time the mutation runs, the editor has already created its drag handlers based on the initial spec (where draggable defaults to `false`). The mutation has no effect.

**Fix**: Add `draggable: true` to each block's spec configuration:

```ts
export const RoutedEntry = createReactBlockSpec(
  {
    type: "routedEntry",
    propSchema: { ... },
    content: "inline",
    draggable: true,  // ← Add this
  },
  { render: ... }
);
```

Same for `ScaffoldBlock`.

**Remove the mutation code** (lines ~60-75) — it's ineffective and misleading.

---

## 🟡 SILENT BUG — BlockNote may also require drag handle element

Even with `draggable: true`, BlockNote's default UI does **not** show a visible drag handle unless you also provide a `dragHandle` component or rely on the default (which appears on hover over the block's left edge). The custom styling (left padding, etc.) may hide or interfere with that default hit area.

**Recommendation**: Test after adding `draggable: true`. If still not working, consider adding a custom `dragHandle` render using `createReactBlockSpec`'s `dragHandle` option, or ensure the left padding does not obscure the default drag zone (which expects content to be flush with the edge).

---

## Summary

| Severity | Count | Root cause |
|----------|-------|-------------|
| 🔴 CRASH | 1 | Missing `draggable: true` in block spec + ineffective mutation |
| 🟠 BLOCKER | 0 | – |
| 🟡 SILENT | 1 | Drag handle hit area may be obscured |

**Primary fix**: Add `draggable: true` to both custom block specs in `schema.tsx`. Remove the mutation code.