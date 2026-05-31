// BlockNote editor for a single letter. Mounted once per open tab.
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { routedEntryBlock, ROUTED_ENTRY_TYPE } from "./routedEntryBlock";
import { scaffoldBlock, SCAFFOLD_BLOCK_TYPE } from "./scaffoldBlock";
import { THOUGHT_UNIT_MIME } from "@/components/crawler/ThoughtUnitItem";
import { getLetter, updateLetter } from "@/services/letters";
import { useAppStore } from "@/stores/appStore";
import { emitDbChange, subscribeDbChange } from "@/hooks/useLiveQuery";
import { useAutoSave, registerFlusher } from "@/hooks/useAutoSave";
import { ExportActions } from "./ExportActions";
import { getCollectionWithThoughts } from "@/services/thoughtunitCollections";
import { toast } from "sonner";
import type { ThoughtUnit, Letter } from "@/types";
import { Lock } from "lucide-react";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    [ROUTED_ENTRY_TYPE]: routedEntryBlock(),
    [SCAFFOLD_BLOCK_TYPE]: scaffoldBlock(),
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRoutedBlock(u: ThoughtUnit): any {
  return {
    type: ROUTED_ENTRY_TYPE,
    props: {
      entryContent: "", // empty for new inline blocks
      entryDate: u.date ?? "",
      entryCategory: u.category,
      entrySourceFile: u.source_file_path,
      entryHash: u.anchor_hash ?? "",
    },
    content: [
      {
        type: "text",
        text: u.content,
        styles: {},
      },
    ],
  };
}

// FEAT-004: Recursively normalizes older atomic blocks (using entryContent prop)
// to standard inline editable blocks containing text content array.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeBlocks(blocks: any[]): any[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((b) => {
    if (!b) return b;
    const next = { ...b };
    if (next.type === ROUTED_ENTRY_TYPE) {
      const hasContent = Array.isArray(next.content) && next.content.length > 0;
      if (!hasContent && next.props?.entryContent) {
        next.content = [
          {
            type: "text",
            text: String(next.props.entryContent),
            styles: {},
          },
        ];
      }
    }
    if (Array.isArray(next.children)) {
      next.children = normalizeBlocks(next.children);
    }
    return next;
  });
}

export function LetterEditor({ letterId, active }: { letterId: string; active: boolean }) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const setLetterDirty = useAppStore((s) => s.setLetterDirty);
  const setLetterTitle = useAppStore((s) => s.setLetterTitle);
  const setLetterSaving = useAppStore((s) => s.setLetterSaving);
  const theme = useAppStore((s) => s.theme);

  const isSent = !!letter?.sent_at;

  const isUpdatingFromDb = useRef(false);

  const initialContent = useMemo(() => {
    if (!letter) return undefined;
    try {
      const parsed = JSON.parse(letter.content_json);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeBlocks(parsed);
      }
      return undefined;
    } catch (err) {
      console.error("Failed to parse content_json", err);
      toast.error("Letter content is corrupted – starting with empty document");
      return undefined;
    }
  }, [letter]);

  const editor = useCreateBlockNote(
    {
      schema,
      initialContent,
    },
    [letter?.id],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchLetter = async () => {
      try {
        const l = await getLetter(letterId);
        if (cancelled) return;
        if (!l) {
          setLoadFailed(true);
          return;
        }
        setLetter(l);
        setLetterTitle(letterId, l.title);

        if (editor) {
          const currentEditorJson = JSON.stringify(editor.document);
          if (l.content_json !== currentEditorJson) {
            try {
              let blocks = JSON.parse(l.content_json);
              if (Array.isArray(blocks)) {
                blocks = normalizeBlocks(blocks);
                isUpdatingFromDb.current = true;
                editor.replaceBlocks(editor.document, blocks);
                queueMicrotask(() => {
                  isUpdatingFromDb.current = false;
                });
              }
            } catch (err) {
              console.error("Failed to parse external db change content_json", err);
            }
          }
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    };

    fetchLetter();

    const unsub = subscribeDbChange((source) => {
      if (source === `letter:${letterId}`) return;
      fetchLetter();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [letterId, editor, setLetterTitle]);

  const lastSavedContentRef = useRef<string | null>(null);

  // Auto-save: debounced, with explicit flush.
  const persist = useCallback(async () => {
    if (!editor) return;
    setLetterSaving(letterId, true);
    const blocks = editor.document;
    const payload = JSON.stringify(blocks);
    try {
      await updateLetter(letterId, { content_json: payload });
      lastSavedContentRef.current = payload;
      if (JSON.stringify(editor.document) === payload) {
        setLetterDirty(letterId, false);
      }
      emitDbChange(`letter:${letterId}`);
    } catch (e) {
      console.error("Letter save failed", e);
    } finally {
      setLetterSaving(letterId, false);
    }
  }, [editor, letterId, setLetterSaving, setLetterDirty]);

  const { schedule, flush } = useAutoSave(persist, 800);

  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTitleRef = useRef<string | null>(null);
  const titleDirtyRef = useRef(false);

  const flushTitle = useCallback(async () => {
    if (titleTimerRef.current) {
      clearTimeout(titleTimerRef.current);
      titleTimerRef.current = null;
    }
    if (titleDirtyRef.current && pendingTitleRef.current !== null) {
      const titleToSave = pendingTitleRef.current;
      try {
        await updateLetter(letterId, { title: titleToSave });
        if (pendingTitleRef.current === titleToSave) {
          titleDirtyRef.current = false;
          pendingTitleRef.current = null;
        }
        emitDbChange();
      } catch (e) {
        console.error("Title save failed", e);
      }
    }
  }, [letterId]);

  const combinedFlush = useCallback(async () => {
    await Promise.all([flush(), flushTitle()]);
  }, [flush, flushTitle]);

  // Register flusher so global Ctrl+S can reach this editor.
  useEffect(() => registerFlusher(letterId, combinedFlush), [letterId, flush, combinedFlush]);

  // Flush on tab switch (active transitions from true to false)
  const wasActiveRef = useRef(active);
  useEffect(() => {
    if (wasActiveRef.current && !active) {
      void combinedFlush();
    }
    wasActiveRef.current = active;
  }, [active, combinedFlush]);

  // Flush title on unmount
  useEffect(() => {
    return () => {
      void flushTitle();
    };
  }, []);

  const skipFirstChange = useRef(true);
  useEffect(() => {
    if (!editor || !letter || isSent) return;
    skipFirstChange.current = true; // reset on new editor instance
    const unsub = editor.onChange(() => {
      if (isUpdatingFromDb.current) {
        return;
      }
      if (skipFirstChange.current) {
        skipFirstChange.current = false;
        return;
      }
      setLetterDirty(letterId, true);
      schedule();
    });
    return () => {
      unsub?.();
    };
  }, [editor, letter, letterId, setLetterDirty, schedule, isSent]);

  // Consumes routing queue items targeting this letterId.
  const routingQueue = useAppStore((s) => s.routingQueue);
  const removeFromRoutingQueue = useAppStore((s) => s.removeFromRoutingQueue);

  useEffect(() => {
    if (!editor || isSent || !letter) return;
    const items = routingQueue.filter((x) => x.letterId === letterId);
    if (items.length === 0) return;

    let currentAnchorId = editor.document[editor.document.length - 1]?.id;

    items.forEach((item) => {
      const block = buildRoutedBlock(item.unit);
      if (currentAnchorId) {
        editor.insertBlocks([block], currentAnchorId, "after");
        const newBlock = editor.document.find(
          (b) => b.type === block.type && b.props?.entrySourceFile === block.props.entrySourceFile,
        );
        if (newBlock) currentAnchorId = newBlock.id;
      } else {
        editor.insertBlocks([block], editor.document[editor.document.length - 1], "after");
      }
      removeFromRoutingQueue(item.id);
    });

    void persist();
  }, [editor, letterId, isSent, letter, routingQueue, removeFromRoutingQueue, persist]);

  const onTitleChange = (next: string) => {
    setLetter((prev) => (prev ? { ...prev, title: next } : prev));
    setLetterTitle(letterId, next);
    pendingTitleRef.current = next;
    titleDirtyRef.current = true;
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(async () => {
      await flushTitle();
    }, 400);
  };

  const onDrop = async (e: React.DragEvent) => {
    if (isSent || !editor) return;
    const isThoughtUnit = e.dataTransfer.types.includes(THOUGHT_UNIT_MIME);
    const isCollection = e.dataTransfer.types.includes("application/x-thoughtunit-collection");

    if (!isThoughtUnit && !isCollection) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      const blockEl = targetEl?.closest("[data-id]");
      const blockId =
        blockEl?.getAttribute("data-id") || editor.document[editor.document.length - 1]?.id;

      if (isThoughtUnit) {
        const raw = e.dataTransfer.getData(THOUGHT_UNIT_MIME);
        if (!raw) return;
        const u = JSON.parse(raw) as ThoughtUnit;
        const block = buildRoutedBlock(u);

        if (blockId) {
          editor.insertBlocks([block], blockId, "after");
        } else {
          editor.insertBlocks([block], editor.document[editor.document.length - 1], "after");
        }
        toast.success("Ingested curated thought!");
      } else if (isCollection) {
        const collectionId = e.dataTransfer.getData("application/x-thoughtunit-collection");
        if (!collectionId) return;

        const data = await getCollectionWithThoughts(collectionId);
        if (data.items.length === 0) {
          toast.error("This collection contains no thoughts to spill.");
          return;
        }

        // Spill Option B: continuous paragraph blocks
        const blocksToInsert = data.items.map((item) => buildRoutedBlock(item.thought));

        if (blockId) {
          editor.insertBlocks(blocksToInsert, blockId, "after");
        } else {
          editor.insertBlocks(blocksToInsert, editor.document[editor.document.length - 1], "after");
        }
        toast.success(`Spilled ${data.items.length} thoughts from "${data.collection.title}"!`);
      }
      void persist();
    } catch (err) {
      console.error("Drop parse failed", err);
    }
  };

  if (loadFailed) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm-token text-text-disabled">
        This letter no longer exists.
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm-token text-text-disabled">
        Loading…
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ display: active ? "flex" : "none" }}
      onDrop={onDrop}
      onDragOver={(e) => {
        const isThoughtUnit = e.dataTransfer.types.includes(THOUGHT_UNIT_MIME);
        const isCollection = e.dataTransfer.types.includes("application/x-thoughtunit-collection");
        if (!isSent && (isThoughtUnit || isCollection)) {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
    >
      <div className="flex items-start gap-3 border-b border-border px-8 py-4">
        <input
          value={letter.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled letter"
          disabled={isSent}
          className="flex-1 bg-transparent text-2xl font-medium text-foreground outline-none placeholder:text-text-disabled disabled:text-text-secondary"
        />
        <ExportActions letterId={letterId} isSent={isSent} />
      </div>
      {isSent && (
        <div className="flex items-center gap-2 border-b border-border bg-surface-elevated/40 px-8 py-1.5 text-xs-token text-text-secondary">
          <Lock className="h-3 w-3" /> Sent · read-only
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto">
        <BlockNoteView
          editor={editor}
          theme={theme === "dark" ? "dark" : "light"}
          editable={!isSent}
        />
      </div>
    </div>
  );
}
