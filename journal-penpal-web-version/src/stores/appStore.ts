// Zustand store — UI state only (persisted to localStorage).
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Category, ThoughtUnit } from "@/types";

export type Theme = "dark" | "light";
export type ModalKind =
  | null
  | "sources"
  | "addPenpal"
  | "editPenpal"
  | "scaffold"
  | "export"
  | "correspondence";

export interface CrawlerFilters {
  search: string;
  categories: Category[];
  dateFrom: string;
  dateTo: string;
  randomize: boolean;
}

export const DEFAULT_CRAWLER_FILTERS: CrawlerFilters = {
  search: "",
  categories: [],
  dateFrom: "",
  dateTo: "",
  randomize: false,
};

export interface RoutingQueueItem {
  id: string;
  unit: ThoughtUnit;
  letterId: string;
}

interface AppState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  openLetterIds: string[];
  activeLetterId: string | null;
  openLetter: (id: string) => void;
  closeLetter: (id: string) => void;
  setActiveLetter: (id: string | null) => void;

  leftPanelWidth: number;
  rightPanelWidth: number;
  setLeftPanelWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;

  modal: ModalKind;
  modalPayload: unknown;
  openModal: (kind: Exclude<ModalKind, null>, payload?: unknown) => void;
  closeModal: () => void;

  activePenpalId: string | null;
  setActivePenpalId: (id: string | null) => void;

  sourceCount: number;
  penpalCount: number;
  setCounts: (s: number, p: number) => void;

  dirtyLetterIds: Record<string, true>;
  setLetterDirty: (id: string, dirty: boolean) => void;

  savingLetterIds: Record<string, true>;
  setLetterSaving: (id: string, saving: boolean) => void;

  letterTitles: Record<string, string>;
  setLetterTitle: (id: string, title: string) => void;

  crawlerFilters: CrawlerFilters;
  setCrawlerFilters: (f: CrawlerFilters) => void;

  routingQueue: RoutingQueueItem[];
  addToRoutingQueue: (item: Omit<RoutingQueueItem, "id">) => void;
  removeFromRoutingQueue: (itemId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),

      openLetterIds: [],
      activeLetterId: null,
      openLetter: (id) =>
        set((s) => ({
          openLetterIds: s.openLetterIds.includes(id) ? s.openLetterIds : [...s.openLetterIds, id],
          activeLetterId: id,
        })),
      closeLetter: (id) =>
        set((s) => {
          const next = s.openLetterIds.filter((x) => x !== id);
          return {
            openLetterIds: next,
            activeLetterId:
              s.activeLetterId === id ? (next[next.length - 1] ?? null) : s.activeLetterId,
          };
        }),
      setActiveLetter: (id) => set({ activeLetterId: id }),

      leftPanelWidth: 22,
      rightPanelWidth: 22,
      setLeftPanelWidth: (w) => set({ leftPanelWidth: w }),
      setRightPanelWidth: (w) => set({ rightPanelWidth: w }),

      modal: null,
      modalPayload: undefined,
      openModal: (kind, payload) => set({ modal: kind, modalPayload: payload }),
      closeModal: () => set({ modal: null, modalPayload: undefined }),

      activePenpalId: null,
      setActivePenpalId: (id) => set({ activePenpalId: id }),

      sourceCount: 0,
      penpalCount: 0,
      setCounts: (sourceCount, penpalCount) => set({ sourceCount, penpalCount }),

      dirtyLetterIds: {},
      setLetterDirty: (id, dirty) =>
        set((s) => {
          const next = { ...s.dirtyLetterIds };
          if (dirty) next[id] = true;
          else delete next[id];
          return { dirtyLetterIds: next };
        }),

      savingLetterIds: {},
      setLetterSaving: (id, saving) =>
        set((s) => {
          const next = { ...s.savingLetterIds };
          if (saving) next[id] = true;
          else delete next[id];
          return { savingLetterIds: next };
        }),

      letterTitles: {},
      setLetterTitle: (id, title) =>
        set((s) => ({ letterTitles: { ...s.letterTitles, [id]: title } })),

      crawlerFilters: DEFAULT_CRAWLER_FILTERS,
      setCrawlerFilters: (f) => set({ crawlerFilters: f }),

      routingQueue: [],
      addToRoutingQueue: (item) =>
        set((s) => ({
          routingQueue: [
            ...s.routingQueue,
            { ...item, id: Math.random().toString(36).substring(2, 9) },
          ],
        })),
      removeFromRoutingQueue: (itemId) =>
        set((s) => ({
          routingQueue: s.routingQueue.filter((x) => x.id !== itemId),
        })),
    }),
    {
      name: "journal-penpal-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        openLetterIds: s.openLetterIds,
        activeLetterId: s.activeLetterId,
        leftPanelWidth: s.leftPanelWidth,
        rightPanelWidth: s.rightPanelWidth,
        activePenpalId: s.activePenpalId,
        crawlerFilters: s.crawlerFilters,
      }),
    },
  ),
);
