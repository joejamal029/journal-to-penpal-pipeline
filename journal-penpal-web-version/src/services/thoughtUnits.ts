// Query helpers for thought_units with filters used by the Crawler.
import { db } from "./db";
import type { Category, ThoughtUnit } from "@/types";

export interface ThoughtUnitFilters {
  search?: string; // keyword (case-insensitive, content match)
  categories?: Category[]; // subset; empty/undefined = all
  dateFrom?: string | null; // ISO "YYYY-MM-DD" inclusive
  dateTo?: string | null; // ISO "YYYY-MM-DD" inclusive
  sourceFilePath?: string | null;
  randomize?: boolean;
  limit?: number;
}

export async function queryThoughtUnits(filters: ThoughtUnitFilters = {}): Promise<ThoughtUnit[]> {
  const { search, categories, dateFrom, dateTo, sourceFilePath, randomize, limit } = filters;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any;

  // Utilize the best index on the table depending on what filters were requested
  if (sourceFilePath) {
    query = db().thought_units.where("source_file_path").equals(sourceFilePath);
  } else if (dateFrom && dateTo) {
    query = db().thought_units.where("date").between(dateFrom, dateTo, true, true);
  } else if (dateFrom) {
    query = db().thought_units.where("date").aboveOrEqual(dateFrom);
  } else if (dateTo) {
    query = db().thought_units.where("date").belowOrEqual(dateTo);
  } else if (categories && categories.length === 1) {
    query = db().thought_units.where("category").equals(categories[0]);
  } else {
    query = db().thought_units.toCollection();
  }

  // Filter remaining conditions
  query = query.filter((u: ThoughtUnit) => {
    if (!sourceFilePath && sourceFilePath !== undefined && u.source_file_path !== sourceFilePath)
      return false;

    if (!sourceFilePath) {
      if (dateFrom && (!u.date || u.date < dateFrom)) return false;
      if (dateTo && (!u.date || u.date > dateTo)) return false;
    }

    if (!(categories && categories.length === 1)) {
      if (categories && categories.length && !categories.includes(u.category)) return false;
    }

    if (search) {
      const s = search.toLowerCase();
      if (!u.content.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  let arr = await query.toArray();

  if (randomize) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } else {
    arr.sort((a, b) => {
      const da = a.date ?? "";
      const dbb = b.date ?? "";
      if (da !== dbb) return dbb.localeCompare(da); // newest first
      return a.source_line_number - b.source_line_number;
    });
  }

  if (limit && arr.length > limit) arr = arr.slice(0, limit);
  return arr;
}

export async function countThoughtUnits(): Promise<number> {
  return await db().thought_units.count();
}
