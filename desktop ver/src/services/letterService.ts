import { invoke } from '@tauri-apps/api/core';
import { Letter } from '../types';

export async function createLetter(penpalId: string): Promise<Letter> {
  return invoke<Letter>('create_letter', { penpalId });
}

export async function saveLetterContent(letterId: string, blocksJson: string): Promise<boolean> {
  return invoke<boolean>('save_letter_content', { letterId, blocksJson });
}

export async function loadLetterContent(letterId: string): Promise<{ blocksJson: string }> {
  return invoke<{ blocksJson: string }>('load_letter_content', { letterId });
}

export async function markLetterSent(letterId: string): Promise<boolean> {
  return invoke<boolean>('mark_letter_sent', { letterId });
}
