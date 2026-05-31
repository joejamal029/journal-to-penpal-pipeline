import React, { useEffect, useState } from 'react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { getImportStatus, importJournalFile, removeJournalSource } from '../services/journalService';
import { JournalSource } from '../types';
import { FileText, Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const JournalSourcesView: React.FC = () => {
  const [sources, setSources] = useState<JournalSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const data = await getImportStatus();
      setSources(data);
    } catch (e) {
      console.error('Failed to fetch journal sources:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleImport = async () => {
    setWarnings([]);
    setSuccessMsg(null);
    try {
      const selected = await openDialog({
        title: 'Select Journal Files',
        filters: [{ name: 'Journal Files', extensions: ['md', 'txt'] }],
        multiple: true,
      });

      if (!selected) {
        return; // User cancelled
      }

      // Ensure we have an array of file paths
      const filePaths = Array.isArray(selected) ? selected : [selected];
      if (filePaths.length === 0) return;

      setLoading(true);
      let totalEntries = 0;
      const allWarnings: string[] = [];
      let importedCount = 0;

      for (const filePath of filePaths) {
        try {
          const res = await importJournalFile(filePath);
          totalEntries += res.entryCount;
          const fileName = filePath.split(/[/\\]/).pop() || 'File';
          
          if (res.entryCount === 0) {
            allWarnings.push(`${fileName} imported but no entries found`);
          }
          if (res.warnings && res.warnings.length > 0) {
            allWarnings.push(...res.warnings.map(w => `[${fileName}] ${w}`));
          }
          importedCount++;
        } catch (err: any) {
          const fileName = filePath.split(/[/\\]/).pop() || 'File';
          allWarnings.push(`Failed to import ${fileName}: ${err.message || err}`);
        }
      }

      if (importedCount > 0) {
        if (totalEntries === 0) {
          setSuccessMsg(null);
        } else {
          setSuccessMsg(`Successfully imported ${totalEntries} entries from ${importedCount} file(s)!`);
        }
      }

      if (allWarnings.length > 0) {
        setWarnings(allWarnings);
      }

      fetchSources();
    } catch (err: any) {
      alert(`Import error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReimport = async (filePath: string) => {
    setWarnings([]);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await importJournalFile(filePath);
      const fileName = filePath.split(/[/\\]/).pop() || 'File';
      
      if (res.entryCount === 0) {
        setSuccessMsg(null);
        const warnList = [`${fileName} imported but no entries found`];
        if (res.warnings && res.warnings.length > 0) {
          warnList.push(...res.warnings);
        }
        setWarnings(warnList);
      } else {
        setSuccessMsg(`Successfully re-imported ${res.entryCount} entries!`);
        if (res.warnings && res.warnings.length > 0) {
          setWarnings(res.warnings);
        }
      }
      fetchSources();
    } catch (err: any) {
      alert(`Re-import error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (filePath: string) => {
    if (!confirm('Are you sure you want to remove this source? All associated thought-units will be deleted.')) {
      return;
    }
    setWarnings([]);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await removeJournalSource(filePath);
      setSuccessMsg('Source removed successfully.');
      fetchSources();
    } catch (err: any) {
      alert(`Removal error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', color: 'var(--color-text-primary)' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>Journal Sources</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
            Import your stream-of-consciousness Markdown or Text files.
          </p>
        </div>
        <button
          onClick={handleImport}
          style={{
            background: 'var(--color-primary)',
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
          onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
        >
          <Plus size={16} />
          Import File
        </button>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div
          style={{
            background: 'rgba(81, 207, 102, 0.15)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--color-success)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* Warnings Panel */}
      {warnings.length > 0 && (
        <div
          style={{
            background: 'rgba(255, 212, 59, 0.12)',
            border: '1px solid var(--color-warning)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            color: 'var(--color-warning)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>
            <AlertTriangle size={16} />
            Import Warnings
          </div>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Table grid */}
      <div style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading && sources.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--color-primary)', margin: '0 auto' }} />
          </div>
        ) : sources.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <FileText size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.3 }} />
            No journal source files imported yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-semibold)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>File Details</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Format</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Entries</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Last Modified</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>{s.fileName}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px', wordBreak: 'break-all' }}>{s.filePath}</div>
                  </td>
                  <td style={{ padding: 'var(--space-4)', color: 'var(--color-text-primary)' }}>
                    Format {s.formatVersion}
                  </td>
                  <td style={{ padding: 'var(--space-4)', fontWeight: 'var(--weight-medium)', color: 'var(--color-primary)' }}>
                    {s.entryCount}
                  </td>
                  <td style={{ padding: 'var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                    {new Date(s.lastModified).toLocaleDateString()} {new Date(s.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                      <button
                        title="Re-import File"
                        onClick={() => handleReimport(s.filePath)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          padding: 'var(--space-1)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        title="Remove Source"
                        onClick={() => handleRemove(s.filePath)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          padding: 'var(--space-1)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-error)')}
                        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info card */}
      <div
        style={{
          background: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginTop: 'var(--space-6)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-start',
        }}
      >
        <Info size={16} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-sm)' }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Formats Auto-Detection Guide:</strong>
          <ul style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '16px' }}>
            <li>Format 3: Contains <code>#presence</code> or <code>#reminiscence</code> category tags.</li>
            <li>Format 1: Bullet-point journal style (bullet markers like <code>-</code> or <code>*</code>).</li>
            <li>Format 2: Plain paragraphs separated by empty lines under date headers.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
