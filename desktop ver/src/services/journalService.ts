import { invoke } from '@tauri-apps/api/core';
import { ThoughtUnit, JournalSource, ImportResult } from '../types';

export async function importJournalFile(filePath: string): Promise<ImportResult> {
  return invoke<ImportResult>('import_journal_file', { filePath });
}

export async function getImportStatus(): Promise<JournalSource[]> {
  return invoke<JournalSource[]>('get_import_status');
}

export async function removeJournalSource(filePath: string): Promise<boolean> {
  return invoke<boolean>('remove_journal_source', { filePath });
}

export async function getThoughtUnits(
  startDate?: string | null,
  endDate?: string | null,
  category?: string | null
): Promise<ThoughtUnit[]> {
  return invoke<ThoughtUnit[]>('get_thought_units', {
    startDate: startDate || null,
    endDate: endDate || null,
    category: category || null,
  });
}
