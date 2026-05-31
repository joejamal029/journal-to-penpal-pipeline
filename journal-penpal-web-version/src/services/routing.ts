import { db } from "./db";
import { hashContent } from "./parser";

export interface RouteInfo {
  letterId: string;
  letterTitle: string;
  penpalId: string;
  penpalName: string;
  isDraft: boolean;
}

// Helper to extract plain text from BlockNote inline content
function inlineToText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((c) => {
      if (typeof c === "string") return c;
      if (c && typeof c === "object") {
        if ("text" in c && typeof (c as { text: unknown }).text === "string") {
          return (c as { text: string }).text;
        }
        if ("href" in c) {
          return inlineToText((c as { content?: unknown }).content);
        }
      }
      return "";
    })
    .join("");
}

export async function fetchRoutedThoughtsMap(): Promise<Map<string, RouteInfo[]>> {
  const letters = await db().letters.toArray();
  const penpals = await db().penpals.toArray();
  const penpalMap = new Map(penpals.map((p) => [p.id, p]));

  const routeMap = new Map<string, RouteInfo[]>();

  for (const letter of letters) {
    if (!letter.content_json) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let blocks: any[] = [];
    try {
      blocks = JSON.parse(letter.content_json);
    } catch (e) {
      console.error("Failed to parse letter content_json in fetchRoutedThoughtsMap", e);
      continue;
    }

    if (!Array.isArray(blocks)) continue;

    const penpal = penpalMap.get(letter.penpal_id);
    const penpalName = penpal?.name ?? "Unknown";

    const routeInfo: RouteInfo = {
      letterId: letter.id,
      letterTitle: letter.title || "Untitled letter",
      penpalId: letter.penpal_id,
      penpalName,
      isDraft: !!letter.is_draft,
    };

    // Traverse the block tree to find routedEntry blocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const traverse = (nodeList: any[]) => {
      if (!Array.isArray(nodeList)) return;
      for (const block of nodeList) {
        if (!block) continue;
        if (block.type === "routedEntry") {
          const props = block.props || {};
          const text = inlineToText(block.content) || String(props.entryContent || "");
          const file = String(props.entrySourceFile || "");

          // Get FNV-1a content hash (backward compatible fallback if entryHash isn't set)
          const hash = props.entryHash || hashContent(text, file, 0);
          if (hash) {
            if (!routeMap.has(hash)) {
              routeMap.set(hash, []);
            }
            const existing = routeMap.get(hash)!;
            // Prevent duplicate entries for the same letter
            if (!existing.some((r) => r.letterId === letter.id)) {
              existing.push(routeInfo);
            }
          }
        }
        if (Array.isArray(block.children)) {
          traverse(block.children);
        }
      }
    };

    traverse(blocks);
  }

  return routeMap;
}
