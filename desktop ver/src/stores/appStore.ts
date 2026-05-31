import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { Penpal, RoutingQueueItem } from '../types';
import { getPenpals } from '../services/penpalService';
import { createLetter } from '../services/letterService';
import {
  getPersistValue,
  setPersistValue,
  deletePersistValue,
  saveWorkspaceState,
  loadWorkspaceState,
} from '../services/workspaceService';

// Custom SQLite persist adapter for Zustand
const sqliteStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const rawPersist = await getPersistValue(name);
      if (!rawPersist) return null;

      const parsed = JSON.parse(rawPersist);
      if (!parsed || !parsed.state) return rawPersist;

      // Fetch cleaned workspace state from relational table
      const workspace = await loadWorkspaceState();
      const validOpenLetterIds: string[] = JSON.parse(workspace.openLetterIds || '[]');
      
      const openLetters: { letterId: string; penpalId: string }[] = parsed.state.openLetters || [];
      const validLetters = openLetters.filter((l) => validOpenLetterIds.includes(l.letterId));

      // Re-calculate active tab index
      let activeIdx = parsed.state.activeLetterIdx;
      if (workspace.activeLetterId) {
        activeIdx = validLetters.findIndex((l) => l.letterId === workspace.activeLetterId);
      } else {
        activeIdx = validLetters.length > 0 ? 0 : -1;
      }

      parsed.state.openLetters = validLetters;
      parsed.state.activeLetterIdx = activeIdx;

      return JSON.stringify(parsed);
    } catch (e) {
      console.error('Failed to load workspace state with cleanup:', e);
      return getPersistValue(name);
    }
  },
  setItem: async (name, value) => {
    try {
      await setPersistValue(name, value);

      const parsed = JSON.parse(value);
      if (parsed && parsed.state) {
        const openLetters: { letterId: string; penpalId: string }[] = parsed.state.openLetters || [];
        const activeIdx: number = parsed.state.activeLetterIdx;
        const crawlerFilters = parsed.state.crawlerFilters || {};

        const openLetterIds = openLetters.map((l) => l.letterId);
        const activeLetterId = activeIdx >= 0 && activeIdx < openLetters.length
          ? openLetters[activeIdx]?.letterId || null
          : null;

        await saveWorkspaceState(
          JSON.stringify(openLetterIds),
          activeLetterId,
          JSON.stringify(crawlerFilters)
        );
      }
    } catch (e) {
      console.error('Failed to save relational workspace state:', e);
    }
  },
  removeItem: async (name) => {
    await deletePersistValue(name);
    try {
      await saveWorkspaceState('[]', null, '{}');
    } catch (e) {
      console.error('Failed to clear relational workspace state:', e);
    }
  },
};

interface CrawlerFilters {
  startDate: string | null;
  endDate: string | null;
  category: 'presence' | 'reminiscence' | 'uncategorized' | null;
  searchQuery: string;
}

interface AppStore {
  // Penpal State
  penpals: Penpal[];
  loadPenpals: () => Promise<void>;
  setPenpals: (penpals: Penpal[]) => void;

  // Workspace Tabs State
  openLetters: { letterId: string; penpalId: string }[];
  activeLetterIdx: number;
  openNewLetter: (penpalId: string) => Promise<string>; // Returns letterId
  closeLetterTab: (letterId: string) => void;

  // Routing Queue
  routingQueue: RoutingQueueItem[];
  addToRoutingQueue: (item: RoutingQueueItem) => void;
  removeFromRoutingQueue: (itemId: string) => void;

  // Crawler State
  crawlerFilters: CrawlerFilters;
  setCrawlerFilters: (filters: Partial<CrawlerFilters>) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Penpal State
      penpals: [],
      loadPenpals: async () => {
        try {
          const list = await getPenpals();
          set({ penpals: list });
        } catch (e) {
          console.error('Failed to load penpals in store:', e);
        }
      },
      setPenpals: (penpals) => set({ penpals }),

      // Workspace Tabs State
      openLetters: [],
      activeLetterIdx: -1,
      openNewLetter: async (penpalId: string) => {
        const existingIdx = get().openLetters.findIndex((l) => l.penpalId === penpalId);
        if (existingIdx !== -1) {
          const existing = get().openLetters[existingIdx];
          if (existing) {
            set({ activeLetterIdx: existingIdx });
            return existing.letterId;
          }
        }

        // 2. Fetch or create draft letter from DB
        const letter = await createLetter(penpalId);
        const newOpenLetters = [...get().openLetters, { letterId: letter.id, penpalId }];
        set({
          openLetters: newOpenLetters,
          activeLetterIdx: newOpenLetters.length - 1,
        });
        return letter.id;
      },
      closeLetterTab: (letterId: string) => {
        const currentOpen = get().openLetters;
        const currentIdx = get().activeLetterIdx;
        const targetIdx = currentOpen.findIndex((l) => l.letterId === letterId);

        if (targetIdx === -1) return;

        const nextOpen = currentOpen.filter((l) => l.letterId !== letterId);
        let nextIdx = currentIdx;

        if (nextOpen.length === 0) {
          nextIdx = -1;
        } else if (currentIdx >= nextOpen.length) {
          nextIdx = nextOpen.length - 1;
        } else if (targetIdx <= currentIdx && currentIdx > 0) {
          nextIdx = currentIdx - 1;
        }

        set({
          openLetters: nextOpen,
          activeLetterIdx: nextIdx,
        });
      },

      // Routing Queue State
      routingQueue: [],
      addToRoutingQueue: (item: RoutingQueueItem) => {
        // Guard: check if the target letter tab still exists
        const letterExists = get().openLetters.some((l) => l.letterId === item.targetLetterId);
        if (!letterExists) {
          console.warn('Target letter tab is closed. Cannot route.');
          throw new Error('Letter tab is closed. Route to an active letter instead.');
        }

        set((state) => ({
          routingQueue: [...state.routingQueue, item],
        }));
      },
      removeFromRoutingQueue: (itemId: string) => {
        set((state) => ({
          routingQueue: state.routingQueue.filter((item) => item.id !== itemId),
        }));
      },

      // Crawler State
      crawlerFilters: {
        startDate: null,
        endDate: null,
        category: null,
        searchQuery: '',
      },
      setCrawlerFilters: (filters) => {
        set((state) => ({
          crawlerFilters: {
            ...state.crawlerFilters,
            ...filters,
          },
        }));
      },
    }),
    {
      name: 'journal-workspace-store',
      storage: createJSONStorage(() => sqliteStorage),
      // Partialize: only persist layout metadata, not in-memory queue or penpal list
      partialize: (state) => ({
        openLetters: state.openLetters,
        activeLetterIdx: state.activeLetterIdx,
        crawlerFilters: state.crawlerFilters,
      }),
    }
  )
);
