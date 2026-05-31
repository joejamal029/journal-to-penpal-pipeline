// Workspace: hosts open letter editors and a global Ctrl+S hook.
import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { LetterEditor } from "./LetterEditor";
import { flushLetter, flushAllLetters } from "@/hooks/useAutoSave";

export function Workspace() {
  const { openLetterIds, activeLetterId, dirtyLetterIds } = useAppStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Global Ctrl+S → flush active editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void (activeLetterId ? flushLetter(activeLetterId) : flushAllLetters());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeLetterId]);

  // Warn before closing tab with unsaved letters.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(dirtyLetterIds).length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyLetterIds]);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm-token text-text-disabled">
        Loading workspace…
      </div>
    );
  }

  if (openLetterIds.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm-token text-text-disabled">No letter open.</p>
        <p className="text-xs-token text-text-disabled">
          Select a penpal on the right and create a new letter to start writing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 relative">
      {openLetterIds.map((id) => (
        <div
          key={id}
          className="absolute inset-0"
          style={{ display: id === activeLetterId ? "block" : "none" }}
        >
          <LetterEditor letterId={id} active={id === activeLetterId} />
        </div>
      ))}
    </div>
  );
}
