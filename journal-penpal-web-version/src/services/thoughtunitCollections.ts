import { db, nowIso, uid } from "./db";
import type { ThoughtunitCollection, ThoughtunitCollectionItem, ThoughtUnit } from "@/types";

export type CollectionDraft = Omit<ThoughtunitCollection, "id" | "created_at" | "updated_at">;

// --- Automatic Initialization ---

/**
 * Automatically initializes the "Quick Queue" collection if it doesn't exist.
 */
export async function ensureQuickQueueExists(): Promise<ThoughtunitCollection> {
  const existing = await db().thoughtunit_collections.get("quick-queue-global");
  if (existing) return existing;

  const now = nowIso();
  const quickQueue: ThoughtunitCollection = {
    id: "quick-queue-global",
    title: "Quick Queue",
    description: "Frictionless capture slot for rapid thought synthesis",
    cover_color: "from-indigo-500/20 to-purple-500/20",
    is_pinned: true,
    created_at: now,
    updated_at: now,
  };
  await db().thoughtunit_collections.put(quickQueue);
  return quickQueue;
}

// --- Collection CRUD ---

export async function createCollection(draft: CollectionDraft): Promise<ThoughtunitCollection> {
  const now = nowIso();
  const collection: ThoughtunitCollection = {
    id: uid(),
    created_at: now,
    updated_at: now,
    ...draft,
  };
  await db().thoughtunit_collections.add(collection);
  return collection;
}

export async function updateCollection(
  id: string,
  patch: Partial<CollectionDraft>,
): Promise<ThoughtunitCollection | null> {
  const existing = await db().thoughtunit_collections.get(id);
  if (!existing) return null;
  const updated: ThoughtunitCollection = {
    ...existing,
    ...patch,
    updated_at: nowIso(),
  };
  await db().thoughtunit_collections.put(updated);
  return updated;
}

export async function deleteCollection(id: string): Promise<void> {
  await db().transaction(
    "rw",
    [db().thoughtunit_collections, db().thoughtunit_collection_items],
    async () => {
      await db().thoughtunit_collection_items.where("collection_id").equals(id).delete();
      await db().thoughtunit_collections.delete(id);
    },
  );
}

export async function getCollection(id: string): Promise<ThoughtunitCollection | undefined> {
  return await db().thoughtunit_collections.get(id);
}

/**
 * Lists all Collections. Automatically ensures that the "Quick Queue" is initialized.
 */
export async function listCollections(): Promise<ThoughtunitCollection[]> {
  await ensureQuickQueueExists();
  // Pinned collections first, then newest created_at first
  const all = await db().thoughtunit_collections.toArray();
  return all.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

// --- Item Associations ---

/**
 * Checks if a ThoughtUnit already exists in a collection.
 */
export async function isThoughtInCollection(
  collectionId: string,
  thoughtUnitId: string,
): Promise<boolean> {
  const match = await db()
    .thoughtunit_collection_items.where("[collection_id+thought_unit_id]")
    .equals([collectionId, thoughtUnitId])
    .first();
  return !!match;
}

/**
 * Adds a ThoughtUnit to a collection. Automatically handles duplicate detection
 * and calculates the next incremented sort_order.
 */
export async function addThoughtToCollection(
  collectionId: string,
  thoughtUnitId: string,
): Promise<ThoughtunitCollectionItem> {
  return await db().transaction("rw", [db().thoughtunit_collection_items], async () => {
    // 1. Duplicate check via compound index
    const duplicate = await db()
      .thoughtunit_collection_items.where("[collection_id+thought_unit_id]")
      .equals([collectionId, thoughtUnitId])
      .first();

    if (duplicate) return duplicate;

    // 2. Determine max sort_order
    const items = await db()
      .thoughtunit_collection_items.where("collection_id")
      .equals(collectionId)
      .toArray();
    const maxSort = items.reduce((max, item) => Math.max(max, item.sort_order ?? 0), -1);

    const newItem: ThoughtunitCollectionItem = {
      id: uid(),
      collection_id: collectionId,
      thought_unit_id: thoughtUnitId,
      added_at: nowIso(),
      sort_order: maxSort + 1,
    };

    await db().thoughtunit_collection_items.add(newItem);
    return newItem;
  });
}

/**
 * Removes an individual ThoughtUnit from a collection.
 */
export async function removeThoughtFromCollection(
  collectionId: string,
  thoughtUnitId: string,
): Promise<void> {
  await db()
    .thoughtunit_collection_items.where("[collection_id+thought_unit_id]")
    .equals([collectionId, thoughtUnitId])
    .delete();
}

// --- Querying & Sorting/Reordering ---

export interface CollectionItemWithThought {
  collectionItemId: string;
  added_at: string;
  sort_order: number;
  thought: ThoughtUnit;
}

/**
 * Resolves all CollectionItem and ThoughtUnit details, ordered by their custom sequence.
 * Uses optimized bulk gets to avoid N+1 queries.
 */
export async function getCollectionWithThoughts(
  collectionId: string,
): Promise<{ collection: ThoughtunitCollection; items: CollectionItemWithThought[] }> {
  const collection = await db().thoughtunit_collections.get(collectionId);
  if (!collection) throw new Error("Collection not found");

  // Fetch items sorted by sort_order
  const collectionItems = await db()
    .thoughtunit_collection_items.where("collection_id")
    .equals(collectionId)
    .sortBy("sort_order");

  const thoughtIds = collectionItems.map((item) => item.thought_unit_id);

  // High-performance bulk read
  const thoughts = await db().thought_units.bulkGet(thoughtIds);
  const thoughtMap = new Map(thoughts.filter((t): t is ThoughtUnit => !!t).map((t) => [t.id, t]));

  const items: CollectionItemWithThought[] = [];

  for (const item of collectionItems) {
    const thought = thoughtMap.get(item.thought_unit_id);
    if (thought) {
      items.push({
        collectionItemId: item.id,
        added_at: item.added_at,
        sort_order: item.sort_order,
        thought,
      });
    } else {
      // Clean up orphaned reference gracefully
      await db().thoughtunit_collection_items.delete(item.id);
    }
  }

  return { collection, items };
}

/**
 * Reorders the items inside a collection using a list of item IDs in the target order.
 */
export async function reorderCollection(
  collectionId: string,
  orderedItemIds: string[],
): Promise<void> {
  await db().transaction("rw", [db().thoughtunit_collection_items], async () => {
    const items = await db()
      .thoughtunit_collection_items.where("collection_id")
      .equals(collectionId)
      .toArray();
    const itemMap = new Map(items.map((item) => [item.id, item]));

    let index = 0;
    for (const itemId of orderedItemIds) {
      const item = itemMap.get(itemId);
      if (item) {
        item.sort_order = index++;
        await db().thoughtunit_collection_items.put(item);
      }
    }
  });
}

// --- Bulk/Batch Operations ---

/**
 * Adds multiple ThoughtUnits to a collection in a single transaction.
 */
export async function bulkAddThoughtsToCollection(
  collectionId: string,
  thoughtUnitIds: string[],
): Promise<ThoughtunitCollectionItem[]> {
  return await db().transaction("rw", [db().thoughtunit_collection_items], async () => {
    const existingItems = await db()
      .thoughtunit_collection_items.where("collection_id")
      .equals(collectionId)
      .toArray();

    const existingThoughtIds = new Set(existingItems.map((item) => item.thought_unit_id));
    let maxSort = existingItems.reduce((max, item) => Math.max(max, item.sort_order ?? 0), -1);

    const newThoughtIds = Array.from(new Set(thoughtUnitIds)).filter(
      (id) => !existingThoughtIds.has(id),
    );
    if (newThoughtIds.length === 0) return [];

    const now = nowIso();
    const newItems: ThoughtunitCollectionItem[] = newThoughtIds.map((thoughtId) => ({
      id: uid(),
      collection_id: collectionId,
      thought_unit_id: thoughtId,
      added_at: now,
      sort_order: ++maxSort,
    }));

    await db().thoughtunit_collection_items.bulkAdd(newItems);
    return newItems;
  });
}

/**
 * Removes multiple ThoughtUnits from a collection.
 */
export async function bulkRemoveThoughtsFromCollection(
  collectionId: string,
  thoughtUnitIds: string[],
): Promise<void> {
  await db().transaction("rw", [db().thoughtunit_collection_items], async () => {
    const items = await db()
      .thoughtunit_collection_items.where("collection_id")
      .equals(collectionId)
      .toArray();
    const targetThoughtIds = new Set(thoughtUnitIds);

    const idsToDelete = items
      .filter((item) => targetThoughtIds.has(item.thought_unit_id))
      .map((item) => item.id);

    if (idsToDelete.length > 0) {
      await db().thoughtunit_collection_items.bulkDelete(idsToDelete);
    }
  });
}
