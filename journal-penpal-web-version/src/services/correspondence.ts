// FEAT-002 / FEAT-007: penpal correspondence history.
import { db, nowIso, uid } from "./db";
import type { Correspondence, LetterDirection } from "@/types";
import { getLetter, updateLetter } from "./letters";
import { serializeLetterToPlainText } from "@/utils/serializeToPlainText";

export interface CorrespondenceDraft {
  penpal_id: string;
  direction: LetterDirection;
  content: string;
  letter_date: string;
}

export async function addCorrespondence(draft: CorrespondenceDraft): Promise<Correspondence> {
  const row: Correspondence = {
    id: uid(),
    imported_at: nowIso(),
    ...draft,
  };
  await db().correspondence.add(row);
  return row;
}

export async function listCorrespondence(penpalId: string): Promise<Correspondence[]> {
  const rows = await db().correspondence.where("penpal_id").equals(penpalId).toArray();
  return rows.sort((a, b) => a.letter_date.localeCompare(b.letter_date));
}

export async function deleteCorrespondence(id: string) {
  await db().correspondence.delete(id);
}

// FEAT-007: archive a draft letter as `sent` correspondence.
export async function archiveLetterAsSent(letterId: string): Promise<Correspondence | null> {
  const letter = await getLetter(letterId);
  if (!letter) return null;
  const text = serializeLetterToPlainText(letter.content_json);
  if (!text.trim()) return null;
  const now = nowIso();
  const row = await addCorrespondence({
    penpal_id: letter.penpal_id,
    direction: "sent",
    content: text,
    letter_date: now.slice(0, 10),
  });
  await updateLetter(letterId, { is_draft: false, sent_at: now });
  return row;
}
