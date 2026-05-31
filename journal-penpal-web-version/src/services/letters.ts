// Letter CRUD backed by Dexie.
import { db, nowIso, uid } from "./db";
import type { Letter } from "@/types";

export const EMPTY_DOC = JSON.stringify([]);

export async function createLetter(penpalId: string, title = "Untitled letter"): Promise<Letter> {
  const now = nowIso();
  const letter: Letter = {
    id: uid(),
    penpal_id: penpalId,
    title,
    content_json: EMPTY_DOC,
    is_draft: true,
    created_at: now,
    updated_at: now,
    sent_at: null,
  };
  await db().letters.add(letter);
  return letter;
}

export async function getLetter(id: string): Promise<Letter | undefined> {
  return await db().letters.get(id);
}

export async function listLettersByPenpal(penpalId: string): Promise<Letter[]> {
  const rows = await db().letters.where("penpal_id").equals(penpalId).toArray();
  return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function listAllLetters(): Promise<Letter[]> {
  return await db().letters.toArray();
}

export async function updateLetter(
  id: string,
  patch: Partial<Pick<Letter, "title" | "content_json" | "is_draft" | "sent_at">>,
): Promise<Letter | null> {
  const existing = await db().letters.get(id);
  if (!existing) return null;
  const updated: Letter = { ...existing, ...patch, updated_at: nowIso() };
  await db().letters.put(updated);
  return updated;
}

export async function deleteLetter(id: string) {
  await db().letters.delete(id);
}
