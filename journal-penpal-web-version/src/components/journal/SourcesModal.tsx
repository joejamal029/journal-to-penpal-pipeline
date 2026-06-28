import { useCallback, useRef, useState } from "react";
import { FileUp, Trash2, X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import {
  deleteJournalSource,
  importJournalFiles,
  listJournalSources,
  type ImportReport,
} from "@/services/journalImport";
import { useDbQuery, emitDbChange } from "@/hooks/useLiveQuery";
import { format } from "date-fns";
import { toast } from "sonner";

export function SourcesModal() {
  const { modal, closeModal, setCounts, sourceCount, penpalCount } = useAppStore();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastReport, setLastReport] = useState<ImportReport[] | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const sources = useDbQuery(() => listJournalSources(), []);

  const refreshCounts = useCallback(async () => {
    const next = sources ? sources.length : sourceCount;
    setCounts(next, penpalCount);
  }, [setCounts, sourceCount, penpalCount, sources]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter(
        (f) => /\.(md|markdown|txt)$/i.test(f.name) || f.type.startsWith("text/"),
      );
      if (!arr.length) return;
      setBusy(true);
      try {
        const report = await importJournalFiles(arr);
        setLastReport(report);
        emitDbChange();
        const all = await listJournalSources();
        setCounts(all.length, penpalCount);

        const totalInserted = report.reduce((sum, r) => sum + r.inserted, 0);
        if (totalInserted === 0) {
          toast.error("Zero total thought units were extracted across all files.");
        }
      } catch (err) {
        toast.error((err as Error)?.message || "Failed to import files");
      } finally {
        setBusy(false);
      }
    },
    [setCounts, penpalCount],
  );

  // Helper to recursively traverse entries for dragged folders
  const traverseDirectory = async (entry: FileSystemEntry): Promise<File[]> => {
    const files: File[] = [];
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      files.push(file);
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader();
      const readEntries = (): Promise<FileSystemEntry[]> => {
        return new Promise((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
      };
      let entries = await readEntries();
      while (entries.length > 0) {
        for (const ent of entries) {
          const subFiles = await traverseDirectory(ent);
          files.push(...subFiles);
        }
        entries = await readEntries();
      }
    }
    return files;
  };

  if (modal !== "sources") return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-lg-token font-medium text-foreground">Journal Sources</h2>
          <button
            onClick={closeModal}
            aria-label="Close"
            className="text-text-disabled hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-5 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.items) {
                const items = e.dataTransfer.items;
                const filePromises: Promise<File[]>[] = [];
                for (let i = 0; i < items.length; i++) {
                  const item = items[i];
                  if (item.kind === "file") {
                    const entry = item.webkitGetAsEntry();
                    if (entry) {
                      filePromises.push(traverseDirectory(entry));
                    }
                  }
                }
                try {
                  const nestedFiles = await Promise.all(filePromises);
                  const flatFiles = nestedFiles.flat();
                  handleFiles(flatFiles);
                } catch {
                  toast.error("Failed to parse dropped directory structure.");
                }
              } else if (e.dataTransfer.files) {
                handleFiles(e.dataTransfer.files);
              }
            }}
            className={[
              "rounded-md border-2 border-dashed p-6 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-surface-elevated/50",
            ].join(" ")}
          >
            <FileUp className="mx-auto h-6 w-6 text-text-secondary" />
            <p className="mt-2 text-sm-token text-text-secondary">
              Drop .md or .txt journal files or folders here
            </p>
            <p className="text-xs-token text-text-disabled">or</p>
            <div className="mt-2.5 flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {busy ? "Importing…" : "Choose files"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md bg-secondary border border-border px-4 py-1.5 text-sm font-medium text-text-secondary hover:opacity-90 hover:bg-surface-elevated disabled:opacity-50 cursor-pointer"
              >
                {busy ? "Importing…" : "Choose folder"}
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              hidden
              multiple
              accept=".md,.markdown,.txt,text/plain,text/markdown"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <input
              ref={folderInputRef}
              type="file"
              hidden
              {...({
                webkitdirectory: "",
                directory: "",
              } as Record<string, string>)}
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {lastReport && lastReport.length > 0 && (
            <div className="space-y-2">
              <div className="rounded border border-border bg-surface-elevated/50 p-3 text-xs-token text-text-secondary">
                Imported {lastReport.length} file{lastReport.length === 1 ? "" : "s"} —{" "}
                {lastReport.reduce((s, r) => s + r.inserted, 0)} thought-units extracted.
                {lastReport.some((r) => r.replaced) && " (Re-imported replaced previous entries.)"}
              </div>
              {(() => {
                const undatedCount = lastReport.reduce(
                  (sum, r) => sum + (r.units ? r.units.filter((u) => !u.date).length : 0),
                  0,
                );
                if (undatedCount > 0) {
                  return (
                    <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs-token text-amber-600 dark:text-amber-400 font-medium">
                      Warning: {undatedCount} {undatedCount === 1 ? "entry was" : "entries were"}{" "}
                      imported without a valid date header and default to 'Undated'.
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          <div>
            <h3 className="text-sm-token font-medium text-foreground mb-2">
              Imported sources ({sources?.length ?? 0})
            </h3>
            {!sources || sources.length === 0 ? (
              <p className="text-sm-token text-text-disabled">No journals imported yet.</p>
            ) : (
              <ul className="max-h-64 overflow-auto divide-y divide-border rounded border border-border">
                {sources.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm-token"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-foreground">{s.file_name}</div>
                      <div className="text-xs-token text-text-disabled">
                        Format {s.format_version} · {s.entry_count} units ·{" "}
                        {format(new Date(s.last_imported), "MMM d, yyyy HH:mm")}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${s.file_name}`}
                      onClick={async () => {
                        if (!confirm(`Delete "${s.file_name}" and its entries?`)) return;
                        await deleteJournalSource(s.id);
                        emitDbChange();
                        const all = await listJournalSources();
                        setCounts(all.length, penpalCount);
                      }}
                      className="text-text-disabled hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
