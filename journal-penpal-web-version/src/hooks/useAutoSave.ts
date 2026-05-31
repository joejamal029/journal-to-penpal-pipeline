import { useEffect, useRef, useCallback } from "react";

export function useAutoSave(save: () => void | Promise<void>, delayMs = 300) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback((): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return Promise.resolve(saveRef.current());
  }, []); // stable — reads via ref

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void saveRef.current();
    }, delayMs);
  }, [delayMs]); // stable unless delayMs changes

  // Flush-before-unmount (HARD CONSTRAINT).
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        void saveRef.current();
      }
    };
  }, []);

  return { schedule, flush };
}

// Module-level registry so global Ctrl+S can flush the active editor without prop drilling.
const flushers = new Map<string, () => Promise<void>>();
export function registerFlusher(letterId: string, fn: () => Promise<void>) {
  flushers.set(letterId, fn);
  return () => {
    if (flushers.get(letterId) === fn) flushers.delete(letterId);
  };
}
export async function flushLetter(letterId: string): Promise<void> {
  await flushers.get(letterId)?.();
}
export async function flushAllLetters(): Promise<void> {
  await Promise.all([...flushers.values()].map((fn) => fn()));
}
