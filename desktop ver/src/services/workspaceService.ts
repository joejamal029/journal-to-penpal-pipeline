import { invoke } from '@tauri-apps/api/core';
import { WorkspaceState } from '../types';

export async function saveWorkspaceState(
  openLetterIds: string,
  activeLetterId: string | null,
  crawlerState: string
): Promise<boolean> {
  return invoke<boolean>('save_workspace_state', {
    openLetterIds,
    activeLetterId,
    crawlerState,
  });
}

export async function loadWorkspaceState(): Promise<WorkspaceState> {
  return invoke<WorkspaceState>('load_workspace_state');
}

export async function getPersistValue(key: string): Promise<string | null> {
  return invoke<string | null>('get_persist_value', { key });
}

export async function setPersistValue(key: string, value: string): Promise<boolean> {
  return invoke<boolean>('set_persist_value', { key, value });
}

export async function deletePersistValue(key: string): Promise<boolean> {
  return invoke<boolean>('delete_persist_value', { key });
}
