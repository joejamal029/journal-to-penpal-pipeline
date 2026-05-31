// FEAT-007: BlockNote document → clean plain text.
// Blocks joined with `\n\n`, inline metadata stripped.

import { ROUTED_ENTRY_TYPE } from "@/components/workspace/routedEntryBlock";
import { SCAFFOLD_BLOCK_TYPE } from "@/components/workspace/scaffoldBlock";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlock = any;

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

function blockToText(block: AnyBlock, numberedListIndex: number = 0): string {
  const t = block?.type as string | undefined;
  const props = block?.props ?? {};

  if (t === ROUTED_ENTRY_TYPE) {
    const inlineText = inlineToText(block?.content);
    return inlineText || String(props.entryContent ?? "");
  }
  if (t === SCAFFOLD_BLOCK_TYPE) {
    const title = String(props.title ?? "");
    const inlineText = inlineToText(block?.content);
    const children = Array.isArray(block?.children) ? block.children : [];
    const body = serializeBlocks(children).filter(Boolean).join("\n\n");
    return [title, inlineText, body].filter(Boolean).join("\n\n");
  }

  switch (t) {
    case "heading":
    case "paragraph":
    case "quote":
      return inlineToText(block?.content);
    case "bulletListItem":
      return `• ${inlineToText(block?.content)}`;
    case "numberedListItem":
      return `${numberedListIndex > 0 ? numberedListIndex : 1}. ${inlineToText(block?.content)}`;
    case "checkListItem":
      return `${props.checked ? "[x]" : "[ ]"} ${inlineToText(block?.content)}`;
    default:
      return inlineToText(block?.content);
  }
}

function serializeBlocks(blocks: AnyBlock[]): string[] {
  let numberedListIndex = 0;
  const result: string[] = [];

  for (const block of blocks) {
    const t = block?.type as string | undefined;
    if (t === "numberedListItem") {
      numberedListIndex++;
      result.push(blockToText(block, numberedListIndex));
    } else {
      numberedListIndex = 0;
      result.push(blockToText(block, 0));
    }
  }
  return result;
}

export function serializeBlocksToPlainText(blocks: AnyBlock[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  const validBlocks = blocks.filter(Boolean);
  return serializeBlocks(validBlocks)
    .filter((s) => s.trim().length > 0)
    .join("\n\n");
}

export function serializeLetterToPlainText(contentJson: string): string {
  if (!contentJson) return "";
  try {
    const blocks = JSON.parse(contentJson);
    return serializeBlocksToPlainText(blocks);
  } catch (error) {
    console.error("Failed to parse letter content JSON:", error);
    return "";
  }
}
