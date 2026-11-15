import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDraftAutosave,
  type AutosaveOutcome,
  type AutosaveStatus,
  type DraftAutosave,
} from "@/features/post/components/draft-autosave";

const SAVED_AT = new Date("2026-11-15T10:00:00.000Z");

let save: ReturnType<
  typeof vi.fn<(version: string, content: string) => Promise<AutosaveOutcome>>
>;
let statuses: AutosaveStatus[];
let autosave: DraftAutosave;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

beforeEach(() => {
  save = vi.fn();
  statuses = [];
  autosave = createDraftAutosave({
    initialContent: "v0",
    initialVersion: "100",
    save,
    onStatus: (status) => statuses.push(status),
    now: () => SAVED_AT,
  });
  autosave.setEnabled(true);
});

describe("flush", () => {
  it("does nothing while the document matches the stored one", async () => {
    await autosave.flush();
    autosave.change("v0");
    await autosave.flush();

    expect(save).not.toHaveBeenCalled();
    expect(statuses).toEqual([]);
  });

  it("saves a changed document once and adopts the new token", async () => {
    save.mockResolvedValueOnce({ ok: true, version: "200" });
    autosave.change("v1");

    await autosave.flush();
    await autosave.flush();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("100", "v1");
    expect(statuses).toEqual([
      { kind: "saving" },
      { kind: "saved", at: SAVED_AT },
    ]);

    save.mockResolvedValueOnce({ ok: true, version: "300" });
    autosave.change("v2");
    await autosave.flush();

    expect(save).toHaveBeenLastCalledWith("200", "v2");
  });

  it("does nothing while disabled", async () => {
    autosave.setEnabled(false);
    autosave.change("v1");

    await autosave.flush();

    expect(save).not.toHaveBeenCalled();
  });

  it("keeps edits made during a save for the next one", async () => {
    const first = deferred<AutosaveOutcome>();
    save.mockReturnValueOnce(first.promise);
    save.mockResolvedValueOnce({ ok: true, version: "300" });
    autosave.change("v1");

    const flushing = autosave.flush();
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    autosave.change("v2");
    first.resolve({ ok: true, version: "200" });
    await flushing;
    await autosave.flush();

    expect(save.mock.calls).toEqual([
      ["100", "v1"],
      ["200", "v2"],
    ]);
  });

  it("never runs two saves at once", async () => {
    const first = deferred<AutosaveOutcome>();
    save.mockReturnValueOnce(first.promise);
    autosave.change("v1");

    const one = autosave.flush();
    const two = autosave.flush();
    await Promise.resolve();
    expect(save).toHaveBeenCalledTimes(1);

    first.resolve({ ok: true, version: "200" });
    await Promise.all([one, two]);

    // The second flush found the document already saved.
    expect(save).toHaveBeenCalledTimes(1);
  });

  it.each(["conflict", "not_found"] as const)(
    "stops for good after %s",
    async (reason) => {
      save.mockResolvedValue({ ok: false, reason });
      autosave.change("v1");

      await autosave.flush();
      autosave.change("v2");
      await autosave.flush();

      expect(save).toHaveBeenCalledTimes(1);
      expect(statuses.at(-1)).toEqual({ kind: "stopped", reason });
    },
  );

  it("retries after a failed request", async () => {
    save.mockRejectedValueOnce(new Error("offline"));
    save.mockResolvedValueOnce({ ok: true, version: "200" });
    autosave.change("v1");

    await autosave.flush();
    expect(statuses.at(-1)).toEqual({ kind: "error" });

    await autosave.flush();

    expect(save.mock.calls).toEqual([
      ["100", "v1"],
      ["100", "v1"],
    ]);
    expect(statuses.at(-1)).toEqual({ kind: "saved", at: SAVED_AT });
  });

  it("turns itself off when the post is no longer a draft", async () => {
    save.mockResolvedValue({ ok: false, reason: "not_draft" });
    autosave.change("v1");

    await autosave.flush();
    await autosave.flush();

    expect(save).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toEqual({ kind: "idle" });
  });
});

describe("runExclusive", () => {
  it("waits for a save in flight and receives its token", async () => {
    const first = deferred<AutosaveOutcome>();
    save.mockReturnValueOnce(first.promise);
    autosave.change("v1");
    const task = vi.fn(async (version: string) => version);

    const flushing = autosave.flush();
    const running = autosave.runExclusive(task);
    await Promise.resolve();
    expect(task).not.toHaveBeenCalled();

    first.resolve({ ok: true, version: "200" });
    await flushing;

    expect(await running).toBe("200");
  });

  it("hands over the document as it is when the task starts", async () => {
    const first = deferred<AutosaveOutcome>();
    save.mockReturnValueOnce(first.promise);
    save.mockResolvedValueOnce({ ok: true, version: "300" });
    autosave.change("v1");

    // An autosave in flight, a blur flush, then a manual save queued behind.
    const flushing = autosave.flush();
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const blurFlush = autosave.flush();
    const manual = autosave.runExclusive(async (version, content) => ({
      version,
      content,
    }));

    // Edited after the manual save was queued, then autosaved ahead of it.
    autosave.change("v2");
    first.resolve({ ok: true, version: "200" });
    await Promise.all([flushing, blurFlush]);

    expect(save).toHaveBeenLastCalledWith("200", "v2");
    expect(await manual).toEqual({ version: "300", content: "v2" });
  });

  it("keeps the queue usable after a task throws", async () => {
    await expect(
      autosave.runExclusive(async () => {
        throw new Error("redirect");
      }),
    ).rejects.toThrow("redirect");

    expect(await autosave.runExclusive(async (version) => version)).toBe("100");
  });
});

describe("markSaved", () => {
  it("records a manual save so autosave does not repeat it", async () => {
    autosave.change("v1");
    autosave.markSaved("200", "v1");

    await autosave.flush();

    expect(save).not.toHaveBeenCalled();
    expect(await autosave.runExclusive(async (version) => version)).toBe("200");
  });
});

describe("syncVersion", () => {
  it("adopts a newer token and ignores an older one", async () => {
    autosave.syncVersion("300");
    autosave.syncVersion("200");

    expect(await autosave.runExclusive(async (version) => version)).toBe("300");
  });
});
