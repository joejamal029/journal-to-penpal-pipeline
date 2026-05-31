export interface ThoughtUnit {
  id: string;
  date: string | null; // ISO date "YYYY-MM-DD"
  content: string;
  category: 'presence' | 'reminiscence' | 'uncategorized';
  sourceFilePath: string;
  sourceLineNumber: number;
  formatVersion: number;
  createdAt: string;
}

export interface JournalSource {
  id: string;
  filePath: string;
  fileName: string;
  lastModified: string;
  lastImported: string;
  formatVersion: number;
  entryCount: number;
}

export interface ImportResult {
  entryCount: number;
  formatVersion: number;
  warnings: string[];
}

export interface Penpal {
  id: string;
  name: string;
  country: string;
  interests: string;
  topics: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  letterCount?: number;
  lastLetterDate?: string | null;
}

export interface Correspondence {
  id: string;
  penpalId: string;
  direction: 'sent' | 'received';
  content: string;
  letterDate: string;
  importedAt: string;
}

export interface Letter {
  id: string;
  penpalId: string;
  status: 'draft' | 'sent';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceState {
  openLetterIds: string; // JSON string of string[]
  activeLetterId: string | null;
  crawlerState: string;   // JSON string of filters, etc.
}

export interface RoutingQueueItem {
  id: string;
  sourceThoughtUnit: ThoughtUnit;
  targetLetterId: string;
  insertPosition: 'end' | 'cursor';
  timestamp: number;
  blockType?: 'routedEntry' | 'scaffoldBlock';
  scaffoldId?: string;
  sectionLabel?: string;
}
