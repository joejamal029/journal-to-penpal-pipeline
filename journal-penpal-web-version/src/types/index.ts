// Domain types — mirrors BACKEND_STRUCTURE.md schema
// (Web port: SQLite tables → Dexie object stores)

export type Category = string;
export type FormatVersion = 1 | 2 | 3;

export interface JournalSource {
  id: string;
  file_path: string;
  file_name: string;
  last_modified: string;
  last_imported: string;
  format_version: FormatVersion;
  entry_count: number;
  raw_text?: string;
}

export interface ThoughtUnit {
  id: string;
  date: string | null;
  content: string;
  category: Category;
  section?: string;
  tags?: string[];
  source_file_path: string;
  source_line_number: number;
  format_version: FormatVersion;
  created_at: string;
  anchor_hash?: string;
}

export interface Marginalia {
  id: string;
  source_file_path: string;
  target_unit_hash: string;
  annotation_text: string;
  created_at: string;
}

export interface Penpal {
  id: string;
  name: string;
  country: string;
  interests: string;
  topics: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type LetterDirection = "sent" | "received";

export interface Correspondence {
  id: string;
  penpal_id: string;
  direction: LetterDirection;
  content: string;
  letter_date: string; // ISO YYYY-MM-DD
  imported_at: string; // ISO 8601
}

export interface Letter {
  id: string;
  penpal_id: string;
  title: string;
  content_json: string;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

export interface Scaffold {
  id: string;
  timeframe_start: string;
  timeframe_end: string;
  title: string;
  content_json: string;
  created_at: string;
}

export interface ScaffoldRoute {
  id: string;
  scaffold_id: string;
  letter_id: string;
  routed_at: string;
}

export interface Session {
  id: string;
  active_letter_ids: string;
  active_tab_id: string | null;
  last_active: string;
}

export interface ThoughtunitCollection {
  id: string;
  title: string;
  description?: string;
  cover_color: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ThoughtunitCollectionItem {
  id: string;
  collection_id: string;
  thought_unit_id: string;
  sort_order: number;
  added_at: string;
}
