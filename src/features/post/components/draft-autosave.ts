export type AutosaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  /** A newer version exists, or the post is gone. Autosave has stopped. */
  | { kind: "stopped"; reason: "conflict" | "not_found" }
  /** A failed attempt. The next tick retries. */
  | { kind: "error" };

export type AutosaveOutcome =
  | { ok: true; version: string }
  | { ok: false; reason: "invalid" | "not_found" | "conflict" | "not_draft" };

interface DraftAutosaveOptions {
  /** Serialised document as stored on the server. */
  initialContent: string;
  initialVersion: string;
  save: (version: string, content: string) => Promise<AutosaveOutcome>;
  onStatus: (status: AutosaveStatus) => void;
  now?: () => Date;
}

/**
 * Tracks the editor document against the stored one and owns the version
 * token. Every write, autosave or manual, runs through one queue: two writes
 * in flight would carry the same token and the second would conflict.
 * Framework-free so the ordering rules can be tested without a DOM.
 */
export function createDraftAutosave({
  initialContent,
  initialVersion,
  save,
  onStatus,
  now = () => new Date(),
}: DraftAutosaveOptions) {
  let content = initialContent;
  let savedContent = initialContent;
  let version = initialVersion;
  let enabled = false;
  let stopped = false;
  let queue: Promise<unknown> = Promise.resolve();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task);
    // A failed task must not block the tasks queued after it.
    queue = run.catch(() => undefined);

    return run;
  }

  async function saveIfDirty(): Promise<void> {
    if (!enabled || stopped || content === savedContent) return;

    const attempt = content;
    onStatus({ kind: "saving" });

    let outcome: AutosaveOutcome;
    try {
      outcome = await save(version, attempt);
    } catch {
      onStatus({ kind: "error" });
      return;
    }

    if (outcome.ok) {
      version = outcome.version;
      savedContent = attempt;
      onStatus({ kind: "saved", at: now() });
    } else if (
      outcome.reason === "conflict" ||
      outcome.reason === "not_found"
    ) {
      // Retrying cannot succeed, and overwriting would lose the newer version.
      stopped = true;
      onStatus({ kind: "stopped", reason: outcome.reason });
    } else if (outcome.reason === "not_draft") {
      // Published since this form opened. Explicit saves still work.
      enabled = false;
      onStatus({ kind: "idle" });
    } else {
      onStatus({ kind: "error" });
    }
  }

  return {
    /** Records the latest editor document. Does not save. */
    change(next: string): void {
      content = next;
    },

    setEnabled(next: boolean): void {
      enabled = next;
    },

    /** Saves when the document differs from the stored one. */
    flush(): Promise<void> {
      return enqueue(saveIfDirty);
    },

    /** Runs another write after every queued save, never beside one. */
    runExclusive<T>(task: (version: string) => Promise<T>): Promise<T> {
      return enqueue(() => task(version));
    },

    /** Records a write made outside autosave, such as a manual save. */
    markSaved(nextVersion: string, saved?: string): void {
      version = nextVersion;
      if (saved !== undefined) savedContent = saved;
    },

    /**
     * Adopts the token of a fresh server render. Tokens only increase, so an
     * older render cannot replace the token of a later save.
     */
    syncVersion(next: string): void {
      if (Number(next) > Number(version)) version = next;
    },
  };
}

export type DraftAutosave = ReturnType<typeof createDraftAutosave>;
