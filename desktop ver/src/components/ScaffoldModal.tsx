import React, { useState, useMemo, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { getThoughtUnits } from '../services/journalService';
import { loadLetterContent } from '../services/letterService';
import { ThoughtUnit } from '../types';
import { X, Calendar, Sparkles, Check } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ScaffoldModalProps {
  onClose: () => void;
}

export const ScaffoldModal: React.FC<ScaffoldModalProps> = ({ onClose }) => {
  const { penpals, openLetters, openNewLetter, addToRoutingQueue } = useAppStore();

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [entries, setEntries] = useState<ThoughtUnit[]>([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [selectedPenpalIds, setSelectedPenpalIds] = useState<Set<string>>(new Set());
  const [fetched, setFetched] = useState<boolean>(false);

  // Timeframe Presets
  const handlePreset = (preset: 'week' | 'month') => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'week') {
      const start = new Date(today);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(start.setDate(diff));
      setStartDate(formatDate(monday));
      setEndDate(formatDate(today));
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    }
  };

  // Fetch entries
  const handleFetch = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    setLoading(true);
    setFetched(true);
    try {
      const data = await getThoughtUnits(startDate, endDate, null);
      setEntries(data);
      // Auto-select all fetched entries
      setSelectedEntryIds(new Set(data.map((tu) => tu.id)));
    } catch (e) {
      console.error('Failed to fetch entries for scaffold:', e);
      alert('Failed to load journal entries.');
    } finally {
      setLoading(false);
    }
  };

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: Record<string, ThoughtUnit[]> = {};
    entries.forEach((tu) => {
      const date = tu.date || 'Undated';
      if (!groups[date]) groups[date] = [];
      groups[date].push(tu);
    });
    // Sort dates in ascending order
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((date) => ({
        date,
        items: groups[date] || [],
      }));
  }, [entries]);

  const parentRef = useRef<HTMLDivElement>(null);

  const flatList = useMemo(() => {
    const list: Array<{
      type: 'header' | 'item';
      id: string;
      date?: string;
      item?: ThoughtUnit;
      items?: ThoughtUnit[];
    }> = [];

    groupedEntries.forEach((group) => {
      list.push({
        type: 'header',
        id: `header-${group.date}`,
        date: group.date,
        items: group.items,
      });
      group.items.forEach((item) => {
        list.push({
          type: 'item',
          id: item.id,
          item,
        });
      });
    });

    return list;
  }, [groupedEntries]);

  const rowVirtualizer = useVirtualizer({
    count: flatList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flatList[index];
      if (!item) return 0;
      if (item.type === 'header') return 36;
      const contentLength = item.item?.content?.length || 0;
      if (contentLength > 150) return 120;
      if (contentLength > 80) return 96;
      return 78;
    },
    overscan: 10,
  });

  // Toggle entry selection
  const handleToggleEntry = (id: string) => {
    const next = new Set(selectedEntryIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedEntryIds(next);
  };

  // Toggle all entries for a date
  const handleToggleDate = (items: ThoughtUnit[]) => {
    const next = new Set(selectedEntryIds);
    const itemIds = items.map((i) => i.id);
    const allSelected = itemIds.every((id) => next.has(id));

    if (allSelected) {
      itemIds.forEach((id) => next.delete(id));
    } else {
      itemIds.forEach((id) => next.add(id));
    }
    setSelectedEntryIds(next);
  };

  // Toggle penpal selection
  const handleTogglePenpal = (id: string) => {
    const next = new Set(selectedPenpalIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPenpalIds(next);
  };

  // Push scaffold to selected penpals
  const handlePush = async () => {
    if (selectedPenpalIds.size === 0) {
      alert('Please select at least one penpal.');
      return;
    }
    if (selectedEntryIds.size === 0) {
      alert('Please select at least one entry.');
      return;
    }

    const pushList = entries.filter((e) => selectedEntryIds.has(e.id));
    const scaffoldId = crypto.randomUUID();
    const errors: string[] = [];

    // 1. Process target penpals one by one
    for (const penpalId of selectedPenpalIds) {
      const penpal = penpals.find((p) => p.id === penpalId);
      const penpalName = penpal ? penpal.name : 'Penpal';

      try {
        // Ensure a letter tab exists (either active in store, or open/create draft)
        let tab = openLetters.find((l) => l.penpalId === penpalId);
        let letterId: string;
        if (!tab) {
          // Create new letter draft
          letterId = await openNewLetter(penpalId);
        } else {
          letterId = tab.letterId;
        }

        // 2. Perform duplicate checking against the letter's SQLite contents
        try {
          const currentContent = await loadLetterContent(letterId);
          const existingEntryIds = new Set<string>();

          if (currentContent && currentContent.blocksJson) {
            try {
              const blocks = JSON.parse(currentContent.blocksJson);
              if (Array.isArray(blocks)) {
                blocks.forEach((b: any) => {
                  if ((b.type === 'scaffoldBlock' || b.type === 'routedEntry') && b.props?.sourceEntryId) {
                    existingEntryIds.add(b.props.sourceEntryId);
                  }
                });
              }
            } catch (parseErr) {
              console.warn(`[Scaffold Curation] Failed to parse blocksJson for duplicate detection. Proceeding as if empty:`, parseErr);
            }
          }

          // Check if any push item is already inside the letter
          const duplicates = pushList.filter((item) => existingEntryIds.has(item.id));
          if (duplicates.length > 0) {
            const proceed = confirm(
              `Duplicate Guard Alert!\n\n${duplicates.length} of the selected entries have already been pushed or routed to ${penpalName}'s letter.\n\nDo you want to push anyway (this will result in duplicate sections)?`
            );
            if (!proceed) {
              continue; // Skip this penpal or cancel
            }
          }
        } catch (err) {
          console.error('Duplicate checking failed:', err);
        }

        // 3. Queue scaffold blocks via routing queue
        // Scaffold sections are grouped by date, so we will assign section labels matching their dates!
        pushList.forEach((entry) => {
          try {
            addToRoutingQueue({
              id: crypto.randomUUID(),
              sourceThoughtUnit: entry,
              targetLetterId: letterId,
              insertPosition: 'end',
              timestamp: Date.now(),
              blockType: 'scaffoldBlock',
              scaffoldId,
              sectionLabel: entry.date || 'Scaffold Section',
            });
          } catch (queueErr: any) {
            console.error(`Failed to enqueue item for ${penpalName}:`, queueErr);
            throw new Error(`Queue addition failed: ${queueErr.message || queueErr}`);
          }
        });
      } catch (err: any) {
        console.error(`Failed to push scaffold for ${penpalName}:`, err);
        errors.push(`Failed for ${penpalName}: ${err.message || err}`);
      }
    }

    if (errors.length > 0) {
      alert(`Scaffold processing completed with errors:\n\n${errors.join('\n')}`);
    } else {
      alert('Scaffold successfully generated and pushed to drafts!');
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 16, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          width: '90%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Sparkles size={18} style={{ color: 'var(--color-success, #10b981)' }} />
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
              Generate Structured Scaffold
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ flex: 1, padding: 'var(--space-5)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Step 1: Select Timeframe */}
          <div>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              1. Select Timeframe
            </h4>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Calendar size={14} style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--text-xs)',
                  }}
                />
                <span style={{ color: 'var(--color-text-secondary)' }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--text-xs)',
                  }}
                />
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handlePreset('week')}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '10px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('month')}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '10px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  This Month
                </button>
              </div>

              <button
                onClick={handleFetch}
                disabled={loading}
                style={{
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-semibold)',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                {loading ? 'Fetching...' : 'Fetch Journal Entries'}
              </button>
            </div>
          </div>

          {/* Columns for Preview and Penpals */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', flex: 1, minHeight: '300px' }}>
            {/* Step 2: Curation checklist */}
            <div
              style={{
                flex: 2,
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: 'var(--space-3)',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-surface-elevated)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--color-text-primary)',
                }}
              >
                2. Curate Scaffold Thoughts ({selectedEntryIds.size} selected)
              </div>
              <div
                ref={parentRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 'var(--space-3)',
                }}
              >
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading entries...</div>
                ) : !fetched ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                    Select a date range and click <strong>Fetch Journal Entries</strong> above to load thoughts.
                  </div>
                ) : entries.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                    No journal entries found for this timeframe. Try a different range.
                  </div>
                ) : (
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const item = flatList[virtualRow.index];
                      if (!item) return null;
                      if (item.type === 'header') {
                        const groupIds = item.items!.map((i) => i.id);
                        const allSelectedInGroup = groupIds.every((id) => selectedEntryIds.has(id));
                        return (
                          <div
                            key={virtualRow.key}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                              padding: '2px 0',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 'var(--weight-semibold)',
                                color: 'var(--color-primary)',
                                fontSize: 'var(--text-xs)',
                                borderBottom: '1px solid var(--color-border)',
                                paddingBottom: '4px',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={allSelectedInGroup}
                                onChange={() => handleToggleDate(item.items!)}
                                style={{ cursor: 'pointer' }}
                              />
                              <span>{item.date}</span>
                              <span style={{ fontSize: '10px', background: 'rgba(2, 132, 199, 0.1)', padding: '0 4px', borderRadius: 'var(--radius-sm)' }}>
                                {item.items!.length} entry{item.items!.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        const tu = item.item!;
                        return (
                          <div
                            key={virtualRow.key}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                              padding: '3px 0',
                            }}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: 'var(--space-2)',
                                background: 'var(--color-surface-elevated)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-primary)',
                                height: '100%',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedEntryIds.has(tu.id)}
                                onChange={() => handleToggleEntry(tu.id)}
                                style={{ marginTop: '2px', cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '2px', flexShrink: 0 }}>
                                  <span style={{ fontSize: '9px', textTransform: 'uppercase', padding: '0 4px', borderRadius: 'var(--radius-sm)', background: tu.category === 'presence' ? 'rgba(34,197,94,0.1)' : tu.category === 'reminiscence' ? 'rgba(139,92,246,0.1)' : 'rgba(100,116,139,0.1)', color: tu.category === 'presence' ? '#10b981' : tu.category === 'reminiscence' ? '#8b5cf6' : '#64748b' }}>
                                    #{tu.category}
                                  </span>
                                  <span style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>Line {tu.sourceLineNumber}</span>
                                </div>
                                <div style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: '1.4', overflowY: 'auto' }}>{tu.content}</div>
                              </div>
                            </label>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Select Penpals */}
            <div
              style={{
                flex: 1,
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: 'var(--space-3)',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-surface-elevated)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--color-text-primary)',
                }}
              >
                3. Select Target Penpals ({selectedPenpalIds.size} selected)
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {penpals.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                    No penpals added yet. Go to Penpal Panel to add one!
                  </div>
                ) : (
                  penpals.map((p) => (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px var(--space-3)',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPenpalIds.has(p.id)}
                        onChange={() => handleTogglePenpal(p.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'var(--weight-semibold)' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{p.country || 'No Country'}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-4)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePush}
            disabled={selectedEntryIds.size === 0 || selectedPenpalIds.size === 0}
            style={{
              background: 'var(--color-success, #10b981)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-4)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-semibold)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: selectedEntryIds.size === 0 || selectedPenpalIds.size === 0 ? 0.5 : 1,
            }}
          >
            <Check size={14} />
            Push Structured Scaffold
          </button>
        </div>
      </div>
    </div>
  );
};
