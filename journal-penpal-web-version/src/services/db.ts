// Dexie database — web port of SQLite schema (BACKEND_STRUCTURE.md)
import Dexie, { type Table } from "dexie";
import type {
  JournalSource,
  ThoughtUnit,
  Penpal,
  Correspondence,
  Letter,
  Scaffold,
  ScaffoldRoute,
  Session,
  Marginalia,
  ThoughtunitCollection,
  ThoughtunitCollectionItem,
} from "@/types";

export class JournalPenpalDB extends Dexie {
  journal_sources!: Table<JournalSource, string>;
  thought_units!: Table<ThoughtUnit, string>;
  penpals!: Table<Penpal, string>;
  correspondence!: Table<Correspondence, string>;
  letters!: Table<Letter, string>;
  scaffolds!: Table<Scaffold, string>;
  scaffold_routes!: Table<ScaffoldRoute, string>;
  sessions!: Table<Session, string>;
  marginalia!: Table<Marginalia, string>;
  thoughtunit_collections!: Table<ThoughtunitCollection, string>;
  thoughtunit_collection_items!: Table<ThoughtunitCollectionItem, string>;

  constructor() {
    super("journal_penpal_db");
    this.version(1).stores({
      journal_sources: "id, &file_path, file_name, last_imported",
      thought_units: "id, date, category, source_file_path, [date+category]",
      penpals: "id, name, created_at",
      letters: "id, penpal_id, is_draft, updated_at",
      scaffolds: "id, timeframe_start, timeframe_end, created_at",
      scaffold_routes: "id, scaffold_id, letter_id, [scaffold_id+letter_id]",
      sessions: "id, last_active",
    });
    // v2: add correspondence table (FEAT-002 completion).
    this.version(2).stores({
      correspondence: "id, penpal_id, letter_date, imported_at",
    });
    // v3: add marginalia (Living Margin reflections) and include anchor_hash index in thought_units
    this.version(3).stores({
      marginalia: "id, source_file_path, target_unit_hash",
      thought_units: "id, date, category, source_file_path, [date+category], anchor_hash",
    });
    // v4: add thoughtunit collections and curation items
    this.version(4).stores({
      journal_sources: "id, &file_path, file_name, last_imported",
      thought_units: "id, date, category, source_file_path, [date+category], anchor_hash",
      penpals: "id, name, created_at",
      letters: "id, penpal_id, is_draft, updated_at",
      scaffolds: "id, timeframe_start, timeframe_end, created_at",
      scaffold_routes: "id, scaffold_id, letter_id, [scaffold_id+letter_id]",
      sessions: "id, last_active",
      correspondence: "id, penpal_id, letter_date, imported_at",
      marginalia: "id, source_file_path, target_unit_hash",
      thoughtunit_collections: "id, title, is_pinned, created_at",
      thoughtunit_collection_items:
        "id, collection_id, thought_unit_id, sort_order, [collection_id+thought_unit_id]",
    });
  }
}

let _db: JournalPenpalDB | null = null;
export function db(): JournalPenpalDB {
  if (typeof window === "undefined") {
    throw new Error("db() called during SSR — guard with typeof window check");
  }
  if (!_db) _db = new JournalPenpalDB();
  return _db;
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const nowIso = () => new Date().toISOString();
