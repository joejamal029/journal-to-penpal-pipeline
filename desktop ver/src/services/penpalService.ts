import { invoke } from '@tauri-apps/api/core';
import { Penpal, Correspondence } from '../types';

export async function createPenpal(
  name: string,
  country?: string,
  interests?: string,
  topics?: string,
  notes?: string
): Promise<Penpal> {
  return invoke<Penpal>('create_penpal', {
    name,
    country: country || null,
    interests: interests || null,
    topics: topics || null,
    notes: notes || null,
  });
}

export async function getPenpals(): Promise<Penpal[]> {
  return invoke<Penpal[]>('get_penpals');
}

export async function updatePenpal(
  id: string,
  name: string,
  country?: string,
  interests?: string,
  topics?: string,
  notes?: string
): Promise<Penpal> {
  return invoke<Penpal>('update_penpal', {
    id,
    name,
    country: country || null,
    interests: interests || null,
    topics: topics || null,
    notes: notes || null,
  });
}

export async function addCorrespondence(
  penpalId: string,
  direction: 'sent' | 'received',
  content: string,
  letterDate: string
): Promise<Correspondence> {
  return invoke<Correspondence>('add_correspondence', {
    penpalId,
    direction,
    content,
    letterDate,
  });
}

export async function getCorrespondence(penpalId: string): Promise<Correspondence[]> {
  return invoke<Correspondence[]>('get_correspondence', { penpalId });
}
