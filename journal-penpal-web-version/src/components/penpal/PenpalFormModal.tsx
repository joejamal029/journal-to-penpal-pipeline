import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { createPenpal, getPenpal, updatePenpal, type PenpalDraft } from "@/services/penpals";
import { emitDbChange } from "@/hooks/useLiveQuery";

const empty: PenpalDraft = { name: "", country: "", interests: "", topics: "", notes: "" };

export function PenpalFormModal() {
  const {
    modal,
    modalPayload,
    closeModal,
    setCounts,
    sourceCount,
    penpalCount,
    setActivePenpalId,
  } = useAppStore();
  const editingId =
    modal === "editPenpal" && typeof modalPayload === "string" ? modalPayload : null;
  const [draft, setDraft] = useState<PenpalDraft>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (modal !== "addPenpal" && modal !== "editPenpal") return;
    if (editingId) {
      getPenpal(editingId).then((p) => {
        if (p) {
          const { name, country, interests, topics, notes } = p;
          setDraft({ name, country, interests, topics, notes });
        }
      });
    } else {
      setDraft(empty);
    }
  }, [modal, editingId]);

  if (modal !== "addPenpal" && modal !== "editPenpal") return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        await updatePenpal(editingId, draft);
      } else {
        const p = await createPenpal(draft);
        setActivePenpalId(p.id);
      }
      emitDbChange();
      setCounts(sourceCount, penpalCount + (editingId ? 0 : 1));
      closeModal();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={closeModal}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-border bg-surface shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-lg-token font-medium text-foreground">
            {editingId ? "Edit Penpal" : "Add Penpal"}
          </h2>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close"
            className="text-text-disabled hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-3 p-5">
          <Field label="Name" required>
            <input
              autoFocus
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="field"
            />
          </Field>
          <Field label="Country">
            <input
              value={draft.country}
              onChange={(e) => setDraft({ ...draft, country: e.target.value })}
              className="field"
            />
          </Field>
          <Field label="Interests" hint="Comma-separated">
            <input
              value={draft.interests}
              onChange={(e) => setDraft({ ...draft, interests: e.target.value })}
              className="field"
              placeholder="cooking, hiking, jazz"
            />
          </Field>
          <Field label="Topics" hint="Things they like to discuss">
            <input
              value={draft.topics}
              onChange={(e) => setDraft({ ...draft, topics: e.target.value })}
              className="field"
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="field resize-none"
            />
          </Field>
        </div>
        <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-md px-4 py-1.5 text-sm text-text-secondary hover:bg-surface-elevated"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !draft.name.trim()}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : editingId ? "Save" : "Add"}
          </button>
        </footer>
        <style>{`
          .field {
            width: 100%;
            background: var(--surface-elevated);
            border: 1px solid var(--border);
            color: var(--foreground);
            border-radius: var(--radius-md);
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            outline: none;
          }
          .field:focus { border-color: var(--primary); }
        `}</style>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-xs-token font-medium text-text-secondary">
          {label}
          {required && <span className="text-error"> *</span>}
        </span>
        {hint && <span className="text-xs-token text-text-disabled">{hint}</span>}
      </div>
      <div className="mt-1">{children}</div>
    </label>
  );
}
