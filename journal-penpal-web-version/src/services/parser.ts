// TypeScript port of the Rust `nom` parser.
// Detects 3 journal formats, extracts date-grouped thought-units,
// and assigns category based on explicit [P]/[R] markers.
//
// Format 1 — Markdown headers
//   # 2024-01-15   (or "# January 15, 2024", "## 2024-01-15")
//   Paragraph one is one thought-unit.
//
//   Paragraph two is another thought-unit.
//
// Format 2 — Plain ISO line headers
//   2024-01-15
//   One line = one thought-unit.
//   Another line = another thought-unit.
//
// Format 3 — Long-form date + bullets
//   January 15, 2024
//   - first thought
//   * second thought
//
// Categorization:
//   leading "[P]" or "(P)" → presence
//   leading "[R]" or "(R)" → reminiscence
//   else                   → uncategorized
// Marker is stripped from stored content.

import type { Category, FormatVersion, ThoughtUnit } from "@/types";
import { nowIso, uid } from "./db";

export interface ParseResult {
  format: FormatVersion;
  units: ThoughtUnit[];
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MD_HEADER_RE = /^#{1,6}\s+(.+?)\s*$/;
const LONG_DATE_RE =
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(?:[a-z]+,\s*)?(\d{4})$/i;
const BULLET_RE = /^[-*]\s+(.*)$/;

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function parseDateString(raw: string): string | null {
  const trimmed = raw.trim();
  const iso = ISO_RE.exec(trimmed);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const long = LONG_DATE_RE.exec(trimmed);
  if (long) {
    const monthIdx = MONTHS.indexOf(long[1].toLowerCase());
    const m = String(monthIdx + 1).padStart(2, "0");
    const d = String(parseInt(long[2], 10)).padStart(2, "0");
    return `${long[3]}-${m}-${d}`;
  }
  return null;
}

export function detectFormat(text: string): FormatVersion {
  const lines = text.split(/\r?\n/).slice(0, 200);
  let mdHits = 0;
  let isoHits = 0;
  let longHits = 0;
  let bulletHits = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (MD_HEADER_RE.test(line)) {
      const m = MD_HEADER_RE.exec(line)!;
      if (parseDateString(m[1])) mdHits++;
    } else if (ISO_RE.test(line)) {
      isoHits++;
    } else if (LONG_DATE_RE.test(line)) {
      longHits++;
    } else if (BULLET_RE.test(line)) {
      bulletHits++;
    }
  }
  if (mdHits > 0 && mdHits >= isoHits && mdHits >= longHits) return 1;
  if (longHits > 0 && bulletHits > 0) return 3;
  if (isoHits > 0) return 2;
  return 1;
}

const MARKER_RE = /^[[(]([PR])[)\]]\s*/i;

function categorize(content: string): { category: Category; clean: string } {
  const m = MARKER_RE.exec(content);
  if (!m) return { category: "uncategorized", clean: content };
  const code = m[1].toUpperCase();
  return {
    category: code === "P" ? "presence" : "reminiscence",
    clean: content.slice(m[0].length),
  };
}

export function hashContent(text: string, sourceFile: string, _lineNumber: number): string {
  const combined = `${text.trim().toLowerCase().replace(/\s+/g, "")}|${sourceFile}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
}

function pushUnit(
  out: ThoughtUnit[],
  date: string | null,
  content: string,
  sourceFile: string,
  lineNumber: number,
  format: FormatVersion,
  section?: string,
) {
  const trimmed = content.trim();
  if (!trimmed) return;

  const parsedCat = categorize(trimmed);
  let category = parsedCat.category;
  const clean = parsedCat.clean;

  // Dynamic Category override from section header definition
  const CORE_TAXONOMY = ["note", "presence", "reminiscence", "thought", "idea"];

  if (section) {
    const secLower = section.toLowerCase();
    if (secLower === "presence") {
      category = "presence";
    } else if (secLower === "reflection" || secLower === "reminiscence") {
      category = "reminiscence";
    } else if (secLower === "note") {
      // If the section is the default "Note", let inline [P]/[R] category markers take priority!
      if (category === "presence" || category === "reminiscence") {
        // preserve inline categorization
      } else {
        category = "note";
      }
    } else if (CORE_TAXONOMY.includes(secLower)) {
      category = secLower;
    } else {
      category = "uncategorized"; // Map to "uncategorized" to preserve filterability in FilterBar UI
    }
  }

  const cleanTrimmed = clean.trim();
  if (!cleanTrimmed) return;

  // Generalized hashtag tag extraction
  const tags: string[] = [];
  const tagMatches = cleanTrimmed.matchAll(/#([a-zA-Z0-9_]+)/g);
  for (const m of tagMatches) {
    if (!tags.includes(m[1])) {
      tags.push(m[1]);
    }
  }

  out.push({
    id: uid(),
    date,
    content: cleanTrimmed,
    category,
    section: section || undefined,
    tags: tags.length > 0 ? tags : undefined,
    source_file_path: sourceFile,
    source_line_number: lineNumber,
    format_version: format,
    created_at: nowIso(),
    anchor_hash: hashContent(cleanTrimmed, sourceFile, lineNumber),
  });
}

export function parseJournal(text: string, sourceFilePath: string): ParseResult {
  const format = detectFormat(text);
  const units: ThoughtUnit[] = [];
  const lines = text.split(/\r?\n/);

  // Extract starting date from file name fallback if possible
  const lastSegment = sourceFilePath.split(/[/\\]/).pop() || "";
  const baseName = lastSegment.replace(/\.[^/.]+$/, ""); // strip extension
  const fileNameDate = parseDateString(baseName);

  let currentDate: string | null = fileNameDate;
  let currentSection: string | undefined = "Note";
  let buffer: string[] = [];
  let bufferStartLine = 0;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const content = buffer.join(" ").replace(/\s+/g, " ").trim();
    pushUnit(units, currentDate, content, sourceFilePath, bufferStartLine, format, currentSection);
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const lineNumber = i + 1;

    // Detect headers and date headers (all formats accept any header style)
    let dateCandidate: string | null = null;
    const md = MD_HEADER_RE.exec(line);
    if (md) {
      dateCandidate = parseDateString(md[1]);
      if (dateCandidate) {
        flushBuffer();
        currentDate = dateCandidate;
        currentSection = "Note"; // Reset section to default "Note" on a new day
        continue;
      } else {
        // Not a date header -> it's a dynamic Section definition!
        flushBuffer();
        currentSection = md[1].trim();
        continue; // Skip buffering the section header itself
      }
    } else if (ISO_RE.test(line)) {
      dateCandidate = parseDateString(line);
    } else if (LONG_DATE_RE.test(line)) {
      dateCandidate = parseDateString(line);
    }

    if (dateCandidate) {
      flushBuffer();
      currentDate = dateCandidate;
      currentSection = "Note"; // Reset section to default "Note" on a new day
      continue;
    }

    if (format === 3) {
      // bullets = unit boundary
      const b = BULLET_RE.exec(line);
      if (b) {
        flushBuffer();
        pushUnit(units, currentDate, b[1], sourceFilePath, lineNumber, format, currentSection);
        continue;
      }
      if (!line) flushBuffer();
      else {
        if (buffer.length === 0) bufferStartLine = lineNumber;
        buffer.push(line);
      }
    } else if (format === 2) {
      // each non-empty line = one unit
      if (!line) {
        flushBuffer();
        continue;
      }
      pushUnit(units, currentDate, line, sourceFilePath, lineNumber, format, currentSection);
    } else {
      // format 1: blank line separates paragraphs
      if (!line) {
        flushBuffer();
      } else {
        if (buffer.length === 0) bufferStartLine = lineNumber;
        buffer.push(line);
      }
    }
  }
  flushBuffer();

  return { format, units };
}
