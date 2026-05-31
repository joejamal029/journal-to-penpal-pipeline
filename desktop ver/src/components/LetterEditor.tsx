import React, { useEffect, useState, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { schema } from './blocks/schema';
import { loadLetterContent, saveLetterContent } from '../services/letterService';
import { useAppStore } from '../stores/appStore';
import "@blocknote/mantine/style.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeLegacyBlocks(blocks: any[]): any[] {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((b) => {
    if (!b) return b;
    if (b.type === "routedEntry") {
      const legacyText = b.props?.entryContent || "";
      const contentArray = Array.isArray(b.content) ? b.content : [];
      const content = contentArray.length > 0 ? contentArray : (legacyText ? [{ type: "text", text: legacyText, styles: {} }] : []);
      return {
        ...b,
        props: {
          sourceEntryId: b.props?.sourceEntryId || b.props?.entrySourceFile || "",
          sourceDate:    b.props?.sourceDate || b.props?.entryDate || "",
          category:      b.props?.category || b.props?.entryCategory || "uncategorized",
        },
        content,
      };
    }
    if (b.type === "scaffoldBlock") {
      const legacyTitle = b.props?.sectionLabel || b.props?.title || "Scaffold Section";
      const legacyTimeframe = b.props?.scaffoldId || b.props?.timeframe || "";
      
      const contentArray = Array.isArray(b.content) ? b.content : [];
      const nestedBlocks = contentArray.filter((x: any) => x && typeof x === 'object' && x.type);
      const remainingInline = contentArray.filter((x: any) => !x || typeof x !== 'object' || !x.type);

      const legacyChildren = Array.isArray(b.children) ? b.children : [];
      const mergedChildren = [...legacyChildren, ...nestedBlocks];

      return {
        ...b,
        props: {
          scaffoldId:    legacyTimeframe,
          sectionLabel:  legacyTitle,
          sourceEntryId: b.props?.sourceEntryId || "",
        },
        content: remainingInline,
        children: normalizeLegacyBlocks(mergedChildren),
      };
    }
    if (Array.isArray(b.children)) {
      return { ...b, children: normalizeLegacyBlocks(b.children) };
    }
    return b;
  });
}

interface LetterEditorProps {
  letterId: string;
  onBlocksChange: (blocks: any[]) => void;
  onSaveStateChange: (saving: boolean, message: string) => void;
}

export const LetterEditor: React.FC<LetterEditorProps> = ({
  letterId,
  onBlocksChange,
  onSaveStateChange,
}) => {
  const [initialBlocks, setInitialBlocks] = useState<any[] | null>(null);

  // 1. Fetch initial content on mount
  useEffect(() => {
    const loadContent = async () => {
      try {
        const res = await loadLetterContent(letterId);
        let blocks: any[] = [];
        if (res.blocksJson) {
          try {
            const parsed = JSON.parse(res.blocksJson);
            if (Array.isArray(parsed)) {
              blocks = parsed;
            } else {
              // Convert plain text to paragraph blocks
              blocks = res.blocksJson.split('\n\n').map((p) => ({
                type: 'paragraph',
                content: [{ type: 'text', text: p, styles: {} }],
              }));
            }
          } catch {
            blocks = res.blocksJson.split('\n\n').map((p) => ({
              type: 'paragraph',
              content: [{ type: 'text', text: p, styles: {} }],
            }));
          }
        }
        if (blocks.length === 0) {
          blocks = [{ type: 'paragraph', content: [] }];
        }
        const normalized = normalizeLegacyBlocks(blocks);  // migrate old block shapes
        setInitialBlocks(normalized);
        onBlocksChange(normalized);
      } catch (err) {
        console.error('Failed to load letter content:', err);
        setInitialBlocks([{ type: 'paragraph', content: [] }]);
      }
    };

    loadContent();
  }, [letterId]);

  if (initialBlocks === null) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '150px',
          color: 'var(--color-text-secondary)',
        }}
      >
        Loading letter content...
      </div>
    );
  }

  return (
    <ActualBlockEditor
      letterId={letterId}
      initialBlocks={initialBlocks}
      onBlocksChange={onBlocksChange}
      onSaveStateChange={onSaveStateChange}
    />
  );
};

interface ActualBlockEditorProps {
  letterId: string;
  initialBlocks: any[];
  onBlocksChange: (blocks: any[]) => void;
  onSaveStateChange: (saving: boolean, message: string) => void;
}

const ActualBlockEditor: React.FC<ActualBlockEditorProps> = ({
  letterId,
  initialBlocks,
  onBlocksChange,
  onSaveStateChange,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  const editor = useCreateBlockNote({
    schema,
    initialContent: initialBlocks,
  });

  const { routingQueue, removeFromRoutingQueue } = useAppStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 2. Consume routing queue items for this specific active letter tab
  useEffect(() => {
    const myQueueItems = routingQueue.filter((item) => item.targetLetterId === letterId);
    if (myQueueItems.length === 0) return;

    editor.transact(() => {
      myQueueItems.forEach((item) => {
        const blockToInsert: any = {
          type: item.blockType || "routedEntry",
          props: item.blockType === "scaffoldBlock" ? {
            scaffoldId:     item.scaffoldId || "",
            sectionLabel:   item.sectionLabel || "Scaffold Section",
            sourceEntryId:  item.sourceThoughtUnit.id,
          } : {
            sourceEntryId: item.sourceThoughtUnit.id,
            sourceDate:    item.sourceThoughtUnit.date ?? "",
            category:      item.sourceThoughtUnit.category,
          },
          content: item.blockType === "scaffoldBlock" ? [] : [{
            type: "text",
            text: item.sourceThoughtUnit.content,
            styles: {},
          }],
          ...(item.blockType === "scaffoldBlock" ? {
            children: [{
              type: "routedEntry",
              props: {
                sourceEntryId: item.sourceThoughtUnit.id,
                sourceDate:    item.sourceThoughtUnit.date ?? "",
                category:      item.sourceThoughtUnit.category,
              },
              content: [{
                type: "text",
                text: item.sourceThoughtUnit.content,
                styles: {},
              }]
            }]
          } : {}),
        };

        const lastBlock = editor.document[editor.document.length - 1];
        if (lastBlock) {
          editor.insertBlocks([blockToInsert], lastBlock, "after");
        } else {
          const firstBlock = editor.document[0];
          if (firstBlock) {
            editor.insertBlocks([blockToInsert], firstBlock, "before");
          }
        }
      });
    });

    // Save immediately since content is routed in
    const updatedContent = JSON.stringify(editor.document);
    saveLetterContent(letterId, updatedContent).catch(console.error);
    onBlocksChange(editor.document);

    // Remove from store routing queue
    myQueueItems.forEach((item) => {
      removeFromRoutingQueue(item.id);
    });
  }, [routingQueue, letterId, editor]);

  // 3. Debounced Auto-save (3 seconds) + OnChange notify
  const handleEditorChange = () => {
    onBlocksChange(editor.document);
    onSaveStateChange(true, 'Typing...');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const content = JSON.stringify(editor.document);
        await saveLetterContent(letterId, content);
        onSaveStateChange(false, `Saved at ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        console.error('Auto-save failed:', err);
        onSaveStateChange(false, 'Save failed — retrying...');
      }
    }, 3000);
  };

  // 3.5. Register standard editor change listener
  useEffect(() => {
    if (!editor) return;
    const unsub = editor.onChange(() => {
      handleEditorChange();
    });
    return () => {
      unsub?.();
    };
  }, [editor]);

  // 4. Flush-on-deactivate / FLUSH-BEFORE-UNMOUNT cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Immediate database write during unmount to ensure 0 data loss
      const finalContent = JSON.stringify(editor.document);
      saveLetterContent(letterId, finalContent).catch(console.error);
    };
  }, [letterId, editor]);

  // 5. Ctrl+S / Cmd+S manual force-save handler
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        onSaveStateChange(true, 'Saving...');
        try {
          const content = JSON.stringify(editor.document);
          await saveLetterContent(letterId, content);
          onSaveStateChange(false, `Saved at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
          console.error('Manual save failed:', err);
          onSaveStateChange(false, 'Save failed — retrying...');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [letterId, editor, onSaveStateChange]);

  const onDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData('application/x-thought-unit');
    if (!raw || !editor) return;
    e.preventDefault();
    try {
      const u = JSON.parse(raw);
      const blockToInsert: any = {
        type: "routedEntry",
        props: {
          sourceEntryId: u.id,
          sourceDate:    u.date ?? "",
          category:      u.category,
        },
        content: [{
          type: "text",
          text: u.content,
          styles: {},
        }]
      };
      
      const lastBlock = editor.document[editor.document.length - 1];
      if (lastBlock) {
        editor.insertBlocks([blockToInsert], lastBlock, "after");
      } else {
        const firstBlock = editor.document[0];
        if (firstBlock) {
          editor.insertBlocks([blockToInsert], firstBlock, "before");
        }
      }
    } catch (err) {
      console.error("Drop parse failed:", err);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-thought-unit')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: 0,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-base)',
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--space-4)' }}>
        <BlockNoteView
          editor={editor}
          theme={isDarkMode ? "dark" : "light"}
        />
      </div>
    </div>
  );
};
