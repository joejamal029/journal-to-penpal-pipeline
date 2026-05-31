import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { JournalSourcesView } from './JournalSourcesView';
import { LetterEditor } from './LetterEditor';
import { ScaffoldModal } from './ScaffoldModal';
import { markLetterSent, saveLetterContent } from '../services/letterService';
import { addCorrespondence } from '../services/penpalService';
import { serializeToPlainText } from '../utils/serialization';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { X, FileText, Mail, Check, Copy, Sparkles } from 'lucide-react';

interface WorkspacePanelProps {
  showSources: boolean;
  onCloseSources: () => void;
  onOpenSources: () => void;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  showSources,
  onCloseSources,
  onOpenSources,
}) => {
  const { openLetters, activeLetterIdx, closeLetterTab, penpals } = useAppStore();

  const [saving, setSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const [showScaffoldModal, setShowScaffoldModal] = useState<boolean>(false);

  // Lazy tab mounting state: contains at most 3 letterIds currently alive in DOM
  const [aliveLetterIds, setAliveLetterIds] = useState<string[]>([]);
  
  // Keep track of blocks in the active editor instances (to serialize/copy without re-renders)
  const activeBlocksMapRef = useRef<Record<string, any[]>>({});

  const activeLetter = activeLetterIdx >= 0 && activeLetterIdx < openLetters.length ? openLetters[activeLetterIdx] : null;

  // 1. Maintain MRU list of alive letter tabs (maximum 3 in DOM at once)
  useEffect(() => {
    if (!activeLetter) return;

    setAliveLetterIds((prev) => {
      const openIds = openLetters.map((l) => l.letterId);
      const filteredPrev = prev.filter((id) => openIds.includes(id));

      if (filteredPrev[0] === activeLetter.letterId) {
        return filteredPrev;
      }

      const next = [
        activeLetter.letterId,
        ...filteredPrev.filter((id) => id !== activeLetter.letterId),
      ];

      return next.slice(0, 3);
    });

    onCloseSources(); // Hide sources if we switched to a draft letter tab
  }, [activeLetter, openLetters]);

  // 1.5. Tauri Window Close Interceptor: flush all dirty active letters before closing
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupCloseInterceptor = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        
        unlisten = await win.onCloseRequested(async (event) => {
          // Prevent standard abrupt close
          event.preventDefault();
          setSaving(true);
          
          try {
            // Save all letters that have active editor content in memory
            const savePromises = openLetters.map(async (tab) => {
              const blocks = activeBlocksMapRef.current[tab.letterId];
              if (blocks && Array.isArray(blocks)) {
                const content = JSON.stringify(blocks);
                await saveLetterContent(tab.letterId, content);
              }
            });
            
            await Promise.all(savePromises);
          } catch (err) {
            console.error('Failed to flush letters on close:', err);
          }
          
          // Once flushed, destroy the window to terminate
          await win.destroy();
        });
      } catch (err) {
        console.error('Failed to bind window close interceptor:', err);
      }
    };

    setupCloseInterceptor();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [openLetters]);

  // 2. Clipboard copy action (stripping markdown metadata/badges)
  const handleCopyToClipboard = async () => {
    if (!activeLetter) return;
    const blocks = activeBlocksMapRef.current[activeLetter.letterId] || [];
    const plainText = serializeToPlainText(blocks);

    if (!plainText.trim()) {
      alert('Letter is empty. Add some content first.');
      return;
    }

    try {
      await writeText(plainText);
      alert('Letter copied to clipboard successfully!');
    } catch (err) {
      console.error('Failed to copy text:', err);
      alert('Failed to copy to clipboard.');
    }
  };

  // 3. Archive & Mark as sent action (with non-empty validation)
  const handleMarkSent = async () => {
    if (!activeLetter) return;
    const penpal = penpals.find((p) => p.id === activeLetter.penpalId);
    const penpalName = penpal ? penpal.name : 'Penpal';

    const blocks = activeBlocksMapRef.current[activeLetter.letterId] || [];
    const plainText = serializeToPlainText(blocks);

    if (!plainText.trim()) {
      alert('Cannot mark an empty letter as sent. Add some content first.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to mark this letter to ${penpalName} as SENT? This will archive it in your correspondence history and close the tab.`
      )
    ) {
      return;
    }

    try {
      // 1. Archive sent content to correspondence table
      await addCorrespondence(
        activeLetter.penpalId,
        'sent',
        plainText,
        new Date().toISOString().split('T')[0] || ''
      );

      // 2. Mark draft status as sent in database
      await markLetterSent(activeLetter.letterId);

      // 3. Close the letter workspace tab
      closeLetterTab(activeLetter.letterId);
      alert('Letter successfully archived and closed!');
    } catch (err: any) {
      alert(`Failed to mark letter as sent: ${err}`);
    }
  };

  // Get matching penpal name for active letter tab
  const getPenpalName = (penpalId: string) => {
    const penpal = penpals.find((p) => p.id === penpalId);
    return penpal ? penpal.name : 'Unknown';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-background)' }}>
      {/* Workspace Tabs Header Bar */}
      <div
        style={{
          display: 'flex',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {/* Special Journal Sources Tab */}
        <button
          onClick={onOpenSources}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            background: showSources ? 'var(--color-background)' : 'var(--color-surface)',
            color: showSources ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            border: 'none',
            borderRight: '1px solid var(--color-border)',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            borderTop: showSources ? '2px solid var(--color-primary)' : 'none',
            flexShrink: 0,
          }}
        >
          <FileText size={14} />
          Journal Sources
        </button>

        {/* Dynamic Letter Tabs */}
        {openLetters.map((tab, idx) => {
          const isActive = !showSources && idx === activeLetterIdx;
          return (
            <div
              key={tab.letterId}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: isActive ? 'var(--color-background)' : 'var(--color-surface)',
                borderRight: '1px solid var(--color-border)',
                borderTop: isActive ? '2px solid var(--color-primary)' : 'none',
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => {
                  onCloseSources();
                  useAppStore.setState({ activeLetterIdx: idx });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3) 8px var(--space-3) var(--space-4)',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-medium)',
                }}
              >
                <Mail size={14} style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }} />
                Letter to {getPenpalName(tab.penpalId)}
              </button>
              <button
                onClick={() => closeLetterTab(tab.letterId)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  marginRight: '8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-error)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {/* Create Scaffold Modal Action Button */}
        <button
          onClick={() => setShowScaffoldModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            border: 'none',
            borderLeft: '1px solid var(--color-border)',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            marginLeft: 'auto',
            flexShrink: 0,
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-success, #10b981)')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          <Sparkles size={14} style={{ color: '#10b981' }} />
          Create Scaffold
        </button>
      </div>

      {/* Main Workspace Body Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {showSources ? (
          <JournalSourcesView />
        ) : activeLetter ? (
          <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
            {/* Metadata Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
                  Drafting Letter for {getPenpalName(activeLetter.penpalId)}
                </h2>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  {lastSaved} {saving && ' • Auto-saving...'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  onClick={handleCopyToClipboard}
                  style={{
                    background: 'var(--color-surface-elevated)',
                    color: 'var(--color-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2) var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-semibold)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <Copy size={16} />
                  Copy Letter
                </button>

                <button
                  onClick={handleMarkSent}
                  style={{
                    background: 'var(--color-success)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2) var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-semibold)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <Check size={16} />
                  Mark as Sent
                </button>
              </div>
            </div>

            {/* Dynamic Editors (Only rendering MRU alive editors, others hidden/unmounted) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {openLetters.map((tab, idx) => {
                const isAlive = aliveLetterIds.includes(tab.letterId);
                if (!isAlive) return null;

                const isActive = !showSources && idx === activeLetterIdx;
                return (
                  <div
                    key={tab.letterId}
                    style={{
                      display: isActive ? 'flex' : 'none',
                      flexDirection: 'column',
                      flex: 1,
                      width: '100%',
                    }}
                  >
                    <LetterEditor
                      letterId={tab.letterId}
                      onBlocksChange={(blocks) => {
                        activeBlocksMapRef.current[tab.letterId] = blocks;
                      }}
                      onSaveStateChange={(savingVal, msg) => {
                        if (isActive) {
                          setSaving(savingVal);
                          setLastSaved(msg);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Welcome screen when workspace is empty */
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <FileText size={64} style={{ marginBottom: 'var(--space-4)', color: 'var(--color-primary)', opacity: 0.8 }} />
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
              Journal-to-Penpal Pipeline
            </h2>
            <p style={{ maxWidth: '400px', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)', lineHeight: 'var(--leading-sm)' }}>
              Start writing by choosing a penpal on the right and clicking <strong>Write Letter</strong>, or manage your <strong>Journal Sources</strong> to scan daily entries.
            </p>
          </div>
        )}
      </div>

      {/* Scaffold Modal Render */}
      {showScaffoldModal && (
        <ScaffoldModal onClose={() => setShowScaffoldModal(false)} />
      )}
    </div>
  );
};
