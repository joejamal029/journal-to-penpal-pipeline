import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '../stores/appStore';
import { getThoughtUnits } from '../services/journalService';
import { ThoughtUnit } from '../types';
import { Search, Calendar, ChevronDown, Send, RefreshCw } from 'lucide-react';

interface CrawlerPanelProps {
  onManageSources: () => void;
}

export const CrawlerPanel: React.FC<CrawlerPanelProps> = ({ onManageSources }) => {
  const { crawlerFilters, setCrawlerFilters, openLetters, penpals, addToRoutingQueue } = useAppStore();
  const { startDate, endDate, category, searchQuery } = crawlerFilters;

  const [thoughtUnits, setThoughtUnits] = useState<ThoughtUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [routeMenuOpen, setRouteMenuOpen] = useState<string | null>(null);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);

  // Reset selected letters when menu changes
  useEffect(() => {
    setSelectedLetters([]);
  }, [routeMenuOpen]);

  // Shuffle state
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // 1. Fetch from database on filter change
  const refreshUnits = async () => {
    setLoading(true);
    try {
      const data = await getThoughtUnits(startDate, endDate, category);
      setThoughtUnits(data);
    } catch (e) {
      console.error('Failed to get thought units:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUnits();
  }, [startDate, endDate, category]);

  // 2. Client-side search substring matching
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return thoughtUnits;
    const q = searchQuery.toLowerCase();
    return thoughtUnits.filter((tu) => tu.content.toLowerCase().includes(q));
  }, [thoughtUnits, searchQuery]);

  // 2b. Shuffling active list
  const displayedUnits = useMemo(() => {
    let units = [...filteredUnits];
    if (isShuffled) {
      // Fisher-Yates Shuffle
      for (let i = units.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = units[i] as ThoughtUnit;
        units[i] = units[j] as ThoughtUnit;
        units[j] = temp;
      }
    }
    return units;
  }, [filteredUnits, isShuffled, shuffleSeed]);

  // 3. Virtualizer Setup
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: displayedUnits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110,
    overscan: 5,
  });

  // Map open letters to penpal names
  const activeTabs = useMemo(() => {
    return openLetters.map((tab) => {
      const penpal = penpals.find((p) => p.id === tab.penpalId);
      return {
        letterId: tab.letterId,
        penpalName: penpal ? penpal.name : 'Unknown Penpal',
      };
    });
  }, [openLetters, penpals]);

  // Handle routing to multiple target letter tabs
  const handleRouteMultiple = (tu: ThoughtUnit) => {
    if (selectedLetters.length === 0) return;

    let successCount = 0;
    let failedCount = 0;

    selectedLetters.forEach((targetLetterId) => {
      try {
        addToRoutingQueue({
          id: crypto.randomUUID(),
          sourceThoughtUnit: tu,
          targetLetterId,
          insertPosition: 'end',
          timestamp: Date.now(),
        });
        successCount++;
      } catch (err: any) {
        console.error(`Failed to route to letter ${targetLetterId}:`, err);
        failedCount++;
      }
    });

    if (failedCount === 0) {
      alert(`Successfully routed entry to ${successCount} draft(s)!`);
    } else {
      alert(`Successfully routed to ${successCount} draft(s). Failed for ${failedCount} draft(s).`);
    }

    setRouteMenuOpen(null);
    setSelectedLetters([]);
  };

  // Timeframe presets handler
  const handlePreset = (preset: 'week' | 'month' | 'all') => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'week') {
      const start = new Date(today);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(start.setDate(diff));
      setCrawlerFilters({
        startDate: formatDate(monday),
        endDate: formatDate(today)
      });
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setCrawlerFilters({
        startDate: formatDate(firstDay),
        endDate: formatDate(today)
      });
    } else {
      setCrawlerFilters({
        startDate: null,
        endDate: null
      });
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'presence':
        return 'chip-presence';
      case 'reminiscence':
        return 'chip-reminiscence';
      default:
        return 'chip-uncategorized';
    }
  };

  return (
    <div className="crawler-panel-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--color-border)' }}>
      {/* Panel Title & Header Buttons */}
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>Journal Crawler</h2>
          {isShuffled && (
            <span style={{ fontSize: '10px', background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '1px 6px', fontWeight: 'var(--weight-semibold)' }}>
              Shuffled
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={() => {
              if (isShuffled) {
                setIsShuffled(false);
              } else {
                setIsShuffled(true);
                setShuffleSeed((prev) => prev + 1);
              }
            }}
            style={{
              background: isShuffled ? 'var(--color-primary)' : 'var(--color-surface-elevated)',
              color: isShuffled ? 'white' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              fontWeight: 'var(--weight-medium)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)'
            }}
          >
            <RefreshCw size={12} className={isShuffled ? 'spin' : ''} style={{ width: '12px', height: '12px' }} />
            Randomize
          </button>
          
          <button
            onClick={onManageSources}
            className="btn-sources"
            style={{
              background: 'var(--color-surface-elevated)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-border)',
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              fontWeight: 'var(--weight-medium)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)'
            }}
          >
            Sources
          </button>
        </div>
      </div>

      {/* Filters Form */}
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', background: 'var(--color-background)' }}>
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setCrawlerFilters({ searchQuery: e.target.value })}
            placeholder="Search entries..."
            style={{
              width: '100%',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3) var(--space-2) 32px',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-sm)',
            }}
          />
        </div>

        {/* Date Ranges */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Calendar size={12} style={{ position: 'absolute', left: 8, top: 10, color: 'var(--color-text-secondary)' }} />
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => setCrawlerFilters({ startDate: e.target.value || null })}
              style={{
                width: '100%',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-2) var(--space-2) 26px',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-xs)',
              }}
            />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Calendar size={12} style={{ position: 'absolute', left: 8, top: 10, color: 'var(--color-text-secondary)' }} />
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => setCrawlerFilters({ endDate: e.target.value || null })}
              style={{
                width: '100%',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-2) var(--space-2) 26px',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-xs)',
              }}
            />
          </div>
        </div>

        {/* Timeframe Presets */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {(['This Week', 'This Month', 'All Time'] as const).map((label) => {
            const presetKey = label === 'This Week' ? 'week' : label === 'This Month' ? 'month' : 'all';
            return (
              <button
                key={label}
                type="button"
                onClick={() => handlePreset(presetKey)}
                style={{
                  flex: 1,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '10px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  fontWeight: 'var(--weight-medium)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Category Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {(['all', 'presence', 'reminiscence', 'uncategorized'] as const).map((cat) => {
            const isActive = cat === 'all' ? category === null : category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCrawlerFilters({ category: cat === 'all' ? null : cat })}
                style={{
                  flex: 1,
                  background: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: isActive ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  padding: 'var(--space-1) 0',
                  cursor: 'pointer',
                  fontWeight: 'var(--weight-semibold)',
                  textTransform: 'capitalize',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Stream Area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 20, 32, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        )}

        {displayedUnits.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No journal entries match. Change filters or import files.
          </div>
        ) : (
          <div
            ref={parentRef}
            style={{
              height: '100%',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const tu = displayedUnits[virtualRow.index];
                if (!tu) return null;
                const isMenuOpen = routeMenuOpen === tu.id;

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      padding: 'var(--space-2) var(--space-4)',
                    }}
                  >
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'copy';
                        e.dataTransfer.setData('application/x-thought-unit', JSON.stringify(tu));
                        e.dataTransfer.setData('text/plain', tu.content);
                      }}
                      style={{
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-2)',
                        cursor: 'grab',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={getCategoryBadgeClass(tu.category)}>
                          #{tu.category}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                          {tu.date || 'Undated'}
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 'var(--leading-sm)' }}>
                        {tu.content}
                      </div>

                      {/* Line reference & Routing button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                          Line {tu.sourceLineNumber}
                        </span>
                        
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setRouteMenuOpen(isMenuOpen ? null : tu.id)}
                            style={{
                              background: 'var(--color-surface)',
                              color: 'var(--color-text-primary)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: 'var(--space-1) var(--space-2)',
                              fontSize: 'var(--text-xs)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-1)',
                            }}
                          >
                            <Send size={10} />
                            Route
                            <ChevronDown size={10} />
                          </button>

                          {isMenuOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                bottom: '100%',
                                background: 'var(--color-surface-elevated)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-md)',
                                zIndex: 100,
                                minWidth: '180px',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                marginBottom: 'var(--space-1)'
                              }}
                            >
                              <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                Target Draft Tabs
                              </div>
                              {activeTabs.length === 0 ? (
                                <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                                  No draft letters open
                                </div>
                              ) : (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px var(--space-3)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedLetters(activeTabs.map((t) => t.letterId))}
                                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                                    >
                                      Select All
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedLetters([])}
                                      style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                                    >
                                      Clear
                                    </button>
                                  </div>
                                  <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                    {activeTabs.map((tab) => {
                                      const isChecked = selectedLetters.includes(tab.letterId);
                                      return (
                                        <label
                                          key={tab.letterId}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                            padding: '6px var(--space-3)',
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--color-text-primary)',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                          }}
                                          onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
                                          onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              setSelectedLetters((prev) =>
                                                isChecked
                                                  ? prev.filter((id) => id !== tab.letterId)
                                                  : [...prev, tab.letterId]
                                              );
                                            }}
                                            style={{ cursor: 'pointer' }}
                                          />
                                          {tab.penpalName}
                                        </label>
                                      );
                                    })}
                                  </div>
                                  <div style={{ padding: 'var(--space-2)', borderTop: '1px solid var(--color-border)', display: 'flex' }}>
                                    <button
                                      type="button"
                                      disabled={selectedLetters.length === 0}
                                      onClick={() => handleRouteMultiple(tu)}
                                      style={{
                                        width: '100%',
                                        background: selectedLetters.length === 0 ? 'var(--color-text-disabled)' : 'var(--color-primary)',
                                        color: selectedLetters.length === 0 ? 'var(--color-text-secondary)' : 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '6px 0',
                                        fontSize: '11px',
                                        fontWeight: 'var(--weight-semibold)',
                                        cursor: selectedLetters.length === 0 ? 'not-allowed' : 'pointer',
                                      }}
                                    >
                                      Confirm Route ({selectedLetters.length})
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
