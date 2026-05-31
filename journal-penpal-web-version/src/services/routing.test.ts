import { describe, it, expect, beforeEach } from "vitest";
import { db, uid, nowIso } from "./db";
import { fetchRoutedThoughtsMap } from "./routing";
import { hashContent } from "./parser";

describe("Routing Service Integration Test", () => {
  beforeEach(async () => {
    await db().penpals.clear();
    await db().letters.clear();
    await db().thought_units.clear();
  });

  it("should return an empty map when no letters exist", async () => {
    const routeMap = await fetchRoutedThoughtsMap();
    expect(routeMap.size).toBe(0);
  });

  it("should successfully index routed thoughts using entryHash", async () => {
    const penpalId = uid();
    await db().penpals.put({
      id: penpalId,
      name: "Penpal Alpha",
      country: "Utopia",
      interests: "code",
      topics: "agents",
      notes: "A helpful test penpal.",
      created_at: nowIso(),
    });

    const letterId = uid();
    const thoughtHash = "test-hash-12345";

    const content = [
      {
        id: "block-1",
        type: "paragraph",
        content: [{ type: "text", text: "Regular paragraph block." }],
      },
      {
        id: "block-2",
        type: "routedEntry",
        props: {
          entryHash: thoughtHash,
          entrySourceFile: "journal.txt",
          entryContent: "This is a routed thought.",
        },
        content: [{ type: "text", text: "This is a routed thought." }],
      },
    ];

    await db().letters.put({
      id: letterId,
      penpal_id: penpalId,
      title: "Letter to Alpha",
      content_json: JSON.stringify(content),
      is_draft: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    });

    const routeMap = await fetchRoutedThoughtsMap();
    expect(routeMap.size).toBe(1);
    expect(routeMap.has(thoughtHash)).toBe(true);

    const routes = routeMap.get(thoughtHash)!;
    expect(routes.length).toBe(1);
    expect(routes[0].letterId).toBe(letterId);
    expect(routes[0].letterTitle).toBe("Letter to Alpha");
    expect(routes[0].penpalName).toBe("Penpal Alpha");
    expect(routes[0].isDraft).toBe(true);
  });

  it("should fall back to hashing content if entryHash is missing", async () => {
    const penpalId = uid();
    await db().penpals.put({
      id: penpalId,
      name: "Penpal Beta",
      country: "Utopia",
      interests: "code",
      topics: "agents",
      notes: "Another test penpal.",
      created_at: nowIso(),
    });

    const letterId = uid();
    const thoughtText = "A beautiful fallback thought text.";
    const thoughtFile = "fallback_source.txt";
    const expectedHash = hashContent(thoughtText, thoughtFile, 0);

    const content = [
      {
        id: "block-3",
        type: "routedEntry",
        props: {
          entrySourceFile: thoughtFile,
          entryContent: thoughtText,
        },
        content: [{ type: "text", text: thoughtText }],
      },
    ];

    await db().letters.put({
      id: letterId,
      penpal_id: penpalId,
      title: "Letter to Beta",
      content_json: JSON.stringify(content),
      is_draft: false,
      created_at: nowIso(),
      updated_at: nowIso(),
    });

    const routeMap = await fetchRoutedThoughtsMap();
    expect(routeMap.size).toBe(1);
    expect(routeMap.has(expectedHash)).toBe(true);

    const routes = routeMap.get(expectedHash)!;
    expect(routes.length).toBe(1);
    expect(routes[0].letterTitle).toBe("Letter to Beta");
    expect(routes[0].penpalName).toBe("Penpal Beta");
    expect(routes[0].isDraft).toBe(false);
  });
});
