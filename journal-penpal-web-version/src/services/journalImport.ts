// Orchestrates: File → text → parse → upsert source + thought_units in Dexie.
import { db, nowIso, uid } from "./db";
import { parseJournal } from "./parser";
import type { JournalSource, ThoughtUnit } from "@/types";

export interface ImportReport {
  source: JournalSource;
  inserted: number;
  replaced: boolean;
  units?: ThoughtUnit[];
}

async function readFileText(file: File): Promise<string> {
  return await file.text();
}

export async function importJournalFile(file: File): Promise<ImportReport> {
  const text = await readFileText(file);
  // Synthetic file_path (web has no real path) — use name; uniqueness via &index.
  const filePath = file.name;
  const existing = await db().journal_sources.where("file_path").equals(filePath).first();
  let replaced = false;

  if (existing) {
    if (existing.raw_text === text) {
      // Identical content — only refresh the timestamp, preserve all thought unit IDs.
      const refreshed = { ...existing, last_imported: nowIso() };
      await db().journal_sources.put(refreshed);
      const unitCount = await db().thought_units.where("source_file_path").equals(filePath).count();
      return { source: refreshed, inserted: unitCount, replaced: false };
    } else {
      // Content changed — treat as update of the same source, not a new file.
      // Keep filePath as-is (file.name), reuse existing.id.
      // The transaction will cascade-delete old units and insert fresh ones.
      replaced = true;
    }
  }

  const { format, units } = parseJournal(text, filePath);

  const source: JournalSource = {
    id: existing?.id ?? uid(),
    file_path: filePath,
    file_name: file.name,
    last_modified: new Date(file.lastModified || Date.now()).toISOString(),
    last_imported: nowIso(),
    format_version: format,
    entry_count: units.length,
    raw_text: text,
  };

  await db().transaction(
    "rw",
    [db().journal_sources, db().thought_units, db().thoughtunit_collection_items],
    async () => {
      if (replaced) {
        const oldUnits = await db()
          .thought_units.where("source_file_path")
          .equals(filePath)
          .toArray();

        const oldHashMap = new Map(oldUnits.map((u) => [u.anchor_hash, u.id]));
        const oldIdsToDelete = new Set(oldUnits.map((u) => u.id));

        // Preserve IDs for identical hashes to keep collection links intact
        for (const u of units) {
          if (u.anchor_hash && oldHashMap.has(u.anchor_hash)) {
            const preservedId = oldHashMap.get(u.anchor_hash)!;
            u.id = preservedId;
            oldIdsToDelete.delete(preservedId);
          }
        }

        const idsToDeleteArr = Array.from(oldIdsToDelete);
        const chunkSize = 500;
        for (let i = 0; i < idsToDeleteArr.length; i += chunkSize) {
          const chunk = idsToDeleteArr.slice(i, i + chunkSize);
          await db().thoughtunit_collection_items.where("thought_unit_id").anyOf(chunk).delete();
          await db().thought_units.bulkDelete(chunk);
        }
      }
      await db().journal_sources.put(source);
      if (units.length) await db().thought_units.bulkPut(units);
    },
  );

  return { source, inserted: units.length, replaced, units };
}

export async function importJournalFiles(files: File[]): Promise<ImportReport[]> {
  const reports: ImportReport[] = [];
  for (const f of files) {
    try {
      reports.push(await importJournalFile(f));
    } catch (e) {
      console.error("import failed", f.name, e);
    }
  }
  return reports;
}

export async function deleteJournalSource(id: string) {
  const src = await db().journal_sources.get(id);
  if (!src) return;
  await db().transaction(
    "rw",
    [db().journal_sources, db().thought_units, db().thoughtunit_collection_items],
    async () => {
      // Find all thought units that belong to this source
      const units = await db()
        .thought_units.where("source_file_path")
        .equals(src.file_path)
        .toArray();
      const unitIds = units.map((u) => u.id);
      if (unitIds.length > 0) {
        // Cascade delete from collection items
        await db().thoughtunit_collection_items.where("thought_unit_id").anyOf(unitIds).delete();
      }
      await db().thought_units.where("source_file_path").equals(src.file_path).delete();
      await db().journal_sources.delete(id);
    },
  );
}

export async function listJournalSources(): Promise<JournalSource[]> {
  return await db().journal_sources.orderBy("last_imported").reverse().toArray();
}

export async function updateJournalSourceText(id: string, text: string): Promise<void> {
  const existing = await db().journal_sources.get(id);
  if (!existing) throw new Error("Source file not found");

  const { format, units } = parseJournal(text, existing.file_path);

  const updatedSource = {
    ...existing,
    last_modified: new Date().toISOString(),
    entry_count: units.length,
    raw_text: text,
    format_version: format,
  };

  await db().transaction(
    "rw",
    [db().journal_sources, db().thought_units, db().thoughtunit_collection_items],
    async () => {
      // Find all existing thought units for cascade delete
      const oldUnits = await db()
        .thought_units.where("source_file_path")
        .equals(existing.file_path)
        .toArray();

      const oldHashMap = new Map(oldUnits.map((u) => [u.anchor_hash, u.id]));
      const oldIdsToDelete = new Set(oldUnits.map((u) => u.id));

      // Preserve IDs for identical hashes to keep collection links intact
      for (const u of units) {
        if (u.anchor_hash && oldHashMap.has(u.anchor_hash)) {
          const preservedId = oldHashMap.get(u.anchor_hash)!;
          u.id = preservedId;
          oldIdsToDelete.delete(preservedId);
        }
      }

      const idsToDeleteArr = Array.from(oldIdsToDelete);
      const chunkSize = 500;
      for (let i = 0; i < idsToDeleteArr.length; i += chunkSize) {
        const chunk = idsToDeleteArr.slice(i, i + chunkSize);
        await db().thoughtunit_collection_items.where("thought_unit_id").anyOf(chunk).delete();
        await db().thought_units.bulkDelete(chunk);
      }
      await db().journal_sources.put(updatedSource);
      if (units.length) await db().thought_units.bulkPut(units);
    },
  );
}
