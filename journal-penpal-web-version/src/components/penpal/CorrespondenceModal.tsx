// FEAT-002: paste a past letter (sent/received) into a penpal's correspondence.
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAppStore } from "@/stores/appStore";
import { addCorrespondence } from "@/services/correspondence";
import { emitDbChange } from "@/hooks/useLiveQuery";
import type { LetterDirection } from "@/types";

export function CorrespondenceModal() {
  const { modal, modalPayload, closeModal } = useAppStore();
  const open = modal === "correspondence";
  const penpalId = typeof modalPayload === "string" ? modalPayload : null;

  const [direction, setDirection] = useState<LetterDirection>("received");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDirection("received");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setContent("");
  }, [open]);

  const submit = async () => {
    if (!penpalId) return;
    if (!content.trim()) {
      toast.error("Content cannot be empty.");
      return;
    }

    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      toast.error("Date must be in YYYY-MM-DD format.");
      return;
    }
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    const parsedDate = new Date(year, month - 1, day);
    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      toast.error("Invalid calendar date.");
      return;
    }

    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (parsedDate > todayDate) {
      toast.error("Date cannot be in the future.");
      return;
    }

    setBusy(true);
    try {
      await addCorrespondence({
        penpal_id: penpalId,
        direction,
        content: content.trim(),
        letter_date: date,
      });
      emitDbChange();
      toast.success("Letter imported.");
      closeModal();
    } catch (e) {
      console.error("Import failed", e);
      toast.error("Failed to import letter.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import past letter</DialogTitle>
          <DialogDescription>
            Paste the content of a sent or received letter. It will appear in this penpal's
            correspondence timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs-token uppercase tracking-wider text-text-disabled mb-1">
                Direction
              </label>
              <div className="flex gap-2">
                {(["received", "sent"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs-token capitalize",
                      direction === d
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface text-text-secondary",
                    ].join(" ")}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs-token uppercase tracking-wider text-text-disabled mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm-token text-foreground outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs-token uppercase tracking-wider text-text-disabled mb-1">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="Paste the letter text here…"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm-token text-foreground outline-none focus:border-accent"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={closeModal}
            className="rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-sm-token text-foreground hover:bg-accent/10"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!penpalId || !content.trim() || busy}
            className="rounded-md bg-primary px-3 py-1.5 text-sm-token font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            Import letter
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
