import { FileUp, UserPlus } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

export function WelcomeScreen() {
  const openModal = useAppStore((s) => s.openModal);
  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="text-xs-token uppercase tracking-[0.2em] text-muted-foreground">
          Journal → Penpal
        </p>
        <h1 className="mt-4 text-2xl-token text-foreground">
          A quiet workstation for letters from your life.
        </h1>
        <p className="mt-4 text-base-token text-muted-foreground">
          Import a journal, add the people you write to, and route discrete thoughts into letters
          with provenance intact.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => openModal("sources")}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            <FileUp className="h-4 w-4" />
            Import Journal
          </button>
          <button
            type="button"
            onClick={() => openModal("addPenpal")}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
          >
            <UserPlus className="h-4 w-4" />
            Add Penpal
          </button>
        </div>
        <p className="mt-8 text-xs-token text-text-disabled">
          Local-first. Your journal never leaves this browser.
        </p>
      </div>
    </div>
  );
}
