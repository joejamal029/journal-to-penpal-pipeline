// Scaffold service — append scaffold blocks to existing penpal letters
// (or create a new letter only when none exists). Returns warnings about
// duplicate entries already present in target letters.
import { db, nowIso, uid } from "./db";
import type { Scaffold, ScaffoldRoute, ThoughtUnit } from "@/types";
import { queryThoughtUnits } from "./thoughtUnits";
import { ROUTED_ENTRY_TYPE } from "@/components/workspace/routedEntryBlock";
import { SCAFFOLD_BLOCK_TYPE } from "@/components/workspace/scaffoldBlock";
import { createLetter, getLetter, updateLetter, listLettersByPenpal } from "./letters";

export interface ScaffoldDraft {
  title: string;
  timeframe_start: string;
  timeframe_end: string;
  categories?: ThoughtUnit["category"][];
}

export async function previewScaffold(draft: ScaffoldDraft) {
  return await queryThoughtUnits({
    dateFrom: draft.timeframe_start,
    dateTo: draft.timeframe_end,
    categories: draft.categories,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlock = any;

function buildScaffoldBlock(draft: ScaffoldDraft, units: ThoughtUnit[]): AnyBlock {
  return {
    type: SCAFFOLD_BLOCK_TYPE,
    props: {
      title: draft.title,
      timeframe: `${draft.timeframe_start} → ${draft.timeframe_end}`,
    },
    children: units.map((u) => ({
      type: ROUTED_ENTRY_TYPE,
      props: {
        entryContent: "",
        entryDate: u.date ?? "",
        entryCategory: u.category,
        entrySourceFile: u.source_file_path,
      },
      content: [
        {
          type: "text",
          text: u.content,
          styles: {},
        },
      ],
    })),
  };
}

// Walk existing blocks to collect routed entry contents already present.
function collectRoutedContents(blocks: AnyBlock[], acc = new Set<string>()): Set<string> {
  if (!Array.isArray(blocks)) return acc;
  for (const b of blocks) {
    if (b?.type === ROUTED_ENTRY_TYPE) {
      let c = "";
      if (Array.isArray(b?.content) && b.content.length > 0) {
        c = b.content
          .map((x: { text?: string }) => x?.text || "")
          .join("")
          .trim();
      }
      if (!c) {
        c = String(b?.props?.entryContent ?? "").trim();
      }
      if (c) acc.add(c);
    }
    if (Array.isArray(b?.children)) collectRoutedContents(b.children, acc);
  }
  return acc;
}

export interface ScaffoldResult {
  scaffold: Scaffold;
  letterIds: string[];
  warnings: string[];
}

export async function generateScaffold(
  draft: ScaffoldDraft,
  penpalIds: string[],
  selectedUnits?: ThoughtUnit[],
): Promise<ScaffoldResult> {
  const units = selectedUnits ?? (await previewScaffold(draft));
  const now = nowIso();
  const warnings: string[] = [];

  const scaffold: Scaffold = {
    id: uid(),
    timeframe_start: draft.timeframe_start,
    timeframe_end: draft.timeframe_end,
    title: draft.title,
    content_json: JSON.stringify([buildScaffoldBlock(draft, units)]),
    created_at: now,
  };
  await db().scaffolds.add(scaffold);

  const letterIds: string[] = [];
  for (const penpalId of penpalIds) {
    // Find latest draft letter for this penpal; create only if none.
    const existing = await listLettersByPenpal(penpalId);
    const draftLetter = existing.find((l) => l.is_draft);
    const letter = draftLetter ?? (await createLetter(penpalId, draft.title));

    // CHANGE: single fresh read used for both content AND title
    const target = await getLetter(letter.id);
    if (!target) continue; // defensive — letter just created, should exist

    let blocks: AnyBlock[] = [];
    try {
      const parsed = JSON.parse(target.content_json); // <-- use target, not letter
      if (Array.isArray(parsed)) blocks = parsed;
    } catch {
      blocks = [];
    }

    const existingContents = collectRoutedContents(blocks);
    const dupes = units.filter((u) => existingContents.has(u.content));
    const fresh = units.filter((u) => !existingContents.has(u.content));

    if (fresh.length === 0) {
      warnings.push(`All selected thoughts are already routed to "${target.title || "letter"}".`);
    } else {
      if (dupes.length > 0) {
        warnings.push(
          `${dupes.length} entr${dupes.length === 1 ? "y" : "ies"} already in "${target.title || "letter"}".`,
        );
      }
      const scaffoldBlk = buildScaffoldBlock(draft, fresh);
      blocks.push(scaffoldBlk);
      await updateLetter(letter.id, { content_json: JSON.stringify(blocks) });
    }
    letterIds.push(letter.id);

    const route: ScaffoldRoute = {
      id: uid(),
      scaffold_id: scaffold.id,
      letter_id: letter.id,
      routed_at: nowIso(),
    };
    await db().scaffold_routes.add(route);
  }

  return { scaffold, letterIds, warnings };
}

export async function listScaffolds(): Promise<Scaffold[]> {
  return await db().scaffolds.orderBy("created_at").reverse().toArray();
}

export { getLetter };
