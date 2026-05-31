// Thin wrapper around dexie-react-hooks' useLiveQuery that gracefully
// handles SSR (returns undefined until mounted on client).
import { useEffect, useState } from "react";

export function useOneShot<T>(query: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    query()
      .then((v) => {
        if (!cancelled) setValue(v);
      })
      .catch((e) => console.error("useOneShot error", e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return value;
}

// Simple event bus so mutations can ping live queries to refresh.
type Listener = (source?: string) => void;
const listeners = new Set<Listener>();
export function subscribeDbChange(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function emitDbChange(source?: string) {
  listeners.forEach((l) => l(source));
}

export function useDbQuery<T>(query: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeDbChange(() => setTick((t) => t + 1));
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    query()
      .then((v) => {
        if (!cancelled) setValue(v);
      })
      .catch((e) => console.error("useDbQuery error", e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return value;
}
