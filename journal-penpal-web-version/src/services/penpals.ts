// Penpal CRUD helpers backed by Dexie.
import { db, nowIso, uid } from "./db";
import type { Penpal } from "@/types";

export type PenpalDraft = Omit<Penpal, "id" | "created_at" | "updated_at">;

export async function createPenpal(draft: PenpalDraft): Promise<Penpal> {
  const now = nowIso();
  const penpal: Penpal = {
    id: uid(),
    created_at: now,
    updated_at: now,
    ...draft,
  };
  await db().penpals.add(penpal);
  return penpal;
}

export async function updatePenpal(
  id: string,
  patch: Partial<PenpalDraft>,
): Promise<Penpal | null> {
  const existing = await db().penpals.get(id);
  if (!existing) return null;
  const updated: Penpal = { ...existing, ...patch, updated_at: nowIso() };
  await db().penpals.put(updated);
  return updated;
}

export async function deletePenpal(id: string) {
  await db().transaction("rw", db().penpals, db().letters, db().correspondence, async () => {
    await db().penpals.delete(id);
    await db().letters.where("penpal_id").equals(id).delete();
    await db().correspondence.where("penpal_id").equals(id).delete();
  });
}

export async function listPenpals(): Promise<Penpal[]> {
  return await db().penpals.orderBy("created_at").reverse().toArray();
}

export async function getPenpal(id: string): Promise<Penpal | undefined> {
  return await db().penpals.get(id);
}
