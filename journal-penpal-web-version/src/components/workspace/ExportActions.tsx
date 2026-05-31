// Per-letter export actions: Copy plain text + Mark as Sent.
import { useState } from "react";
import { Clipboard, Send } from "lucide-react";
import { toast } from "sonner";
import { getLetter } from "@/services/letters";
import { archiveLetterAsSent } from "@/services/correspondence";
import { serializeLetterToPlainText } from "@/utils/serializeToPlainText";
import { useAppStore } from "@/stores/appStore";
import { emitDbChange } from "@/hooks/useLiveQuery";
import { flushLetter } from "@/hooks/useAutoSave";

export function ExportActions({ letterId, isSent }: { letterId: string; isSent: boolean }) {
  const [busy, setBusy] = useState(false);
  const closeLetter = useAppStore((s) => s.closeLetter);

  const copy = async () => {
    await flushLetter(letterId);
    const letter = await getLetter(letterId);
    if (!letter) return;
    const text = serializeLetterToPlainText(letter.content_json);
    if (!text.trim()) {
      toast.warning("Letter is empty. Add some content first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Letter copied ✓");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const markSent = async () => {
    if (isSent) return;
    if (
      !confirm(
        "Mark this letter as sent? It will be archived to the penpal's correspondence and become read-only.",
      )
    )
      return;
    setBusy(true);
    try {
      await flushLetter(letterId);
      const row = await archiveLetterAsSent(letterId);
      if (!row) {
        toast.warning("Letter is empty — nothing to archive.");
        return;
      }
      emitDbChange();
      toast.success("Archived to correspondence.");
      closeLetter(letterId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-2.5 py-1 text-xs-token text-foreground hover:bg-accent/10"
      >
        <Clipboard className="h-3 w-3" /> Copy
      </button>
      {!isSent && (
        <button
          onClick={markSent}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs-token font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-3 w-3" /> Mark as Sent
        </button>
      )}
    </div>
  );
}
