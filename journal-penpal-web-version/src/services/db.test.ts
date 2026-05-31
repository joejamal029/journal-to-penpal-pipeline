import { describe, it, expect, beforeEach } from "vitest";
import { db, uid, nowIso } from "./db";

describe("IndexedDB Database Smoke Test", () => {
  beforeEach(async () => {
    // Clear tables before each test to ensure isolation
    await db().penpals.clear();
    await db().thought_units.clear();
    await db().thoughtunit_collections.clear();
  });

  it("should initialize database tables correctly", () => {
    const database = db();
    expect(database).toBeDefined();
    expect(database.penpals).toBeDefined();
    expect(database.thought_units).toBeDefined();
    expect(database.thoughtunit_collections).toBeDefined();
  });

  it("should successfully add and retrieve a penpal", async () => {
    const penpalId = uid();
    const newPenpal = {
      id: penpalId,
      name: "Alice Liddell",
      country: "Wonderland",
      interests: "riddles, tea parties",
      topics: "nonsense, white rabbits",
      notes: "A very curious child.",
      created_at: nowIso(),
    };

    await db().penpals.put(newPenpal);
    const retrieved = await db().penpals.get(penpalId);

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("Alice Liddell");
    expect(retrieved?.country).toBe("Wonderland");
  });

  it("should successfully add and query thought units", async () => {
    const thoughtId = uid();
    const thought = {
      id: thoughtId,
      date: "2026-05-30",
      content: "It's key to make progress sequentially and verify each step.",
      category: "presence" as const,
      source_file_path: "journal.txt",
      source_line_number: 1,
      format_version: 1 as const,
      created_at: nowIso(),
      anchor_hash: "abcd123",
    };

    await db().thought_units.put(thought);
    const retrieved = await db().thought_units.get(thoughtId);

    expect(retrieved).toBeDefined();
    expect(retrieved?.content).toBe(thought.content);
    expect(retrieved?.anchor_hash).toBe("abcd123");
  });
});
