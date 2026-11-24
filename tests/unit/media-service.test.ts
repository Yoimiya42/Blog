import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { MediaAccessDeniedError } from "@/features/media/schema";
import {
  createMediaRepository,
  type MediaRepository,
} from "@/features/media/server/media.repository";
import {
  createMediaService,
  newMediaId,
} from "@/features/media/server/media.service";
import { MediaRejectedError } from "@/features/media/upload/errors";
import type { StorageAdapter, StorageUpload } from "@/lib/storage";

import {
  clearContentTables,
  createMigratedDatabase,
  type TestDatabase,
} from "../helpers/d1";
import {
  buildJpeg,
  containsBytes,
  rationalBytes,
  toDms,
} from "../helpers/images";

let database: TestDatabase;
let db: D1Database;
let repository: MediaRepository;

const OWNER = { user: { role: "OWNER" } };
const VISITOR = { user: { role: "VISITOR" } };
const NOW = new Date("2026-11-17T09:00:00.000Z");
const LONDON = { latitude: 51.501364, longitude: -0.14189 };

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
  repository = createMediaRepository(db);
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function memoryStorage() {
  const objects = new Map<string, StorageUpload>();
  const storage: StorageAdapter = {
    upload: vi.fn(async (input: StorageUpload) => {
      // Copy: the service passes a view of a buffer it owns.
      objects.set(input.key, { ...input, body: input.body.slice() });
    }),
    delete: vi.fn(async (key: string) => {
      objects.delete(key);
    }),
  };
  return { storage, objects };
}

let sequence = 0;
function service(
  overrides: Partial<Parameters<typeof createMediaService>[0]> = {},
) {
  const { storage, objects } = memoryStorage();
  return {
    objects,
    storage,
    media: createMediaService({
      media: repository,
      storage,
      isOwner: (actor) => actor?.user.role === "OWNER",
      findReferences: async () => [],
      now: () => NOW,
      newId: () => `testmedia${String((sequence += 1)).padStart(11, "0")}`,
      ...overrides,
    }),
  };
}

describe("newMediaId", () => {
  it("matches the public URL pattern", () => {
    for (let index = 0; index < 50; index += 1) {
      expect(newMediaId()).toMatch(/^[a-z0-9]{20}$/);
    }
  });
});

describe("media upload", () => {
  it("stores a GPS-clean original and keeps coordinates owner-only", async () => {
    const { media, objects } = service();
    const input = buildJpeg({
      width: 4000,
      height: 3000,
      exif: { orientation: 6, gps: LONDON },
    });

    const created = await media.upload(OWNER, input, "  Harbour at dusk  ");

    expect(created).toMatchObject({
      storageKey: `media/${created.id}.jpg`,
      mimeType: "image/jpeg",
      width: 3000,
      height: 4000,
      alt: "Harbour at dusk",
      createdAt: NOW,
    });
    expect(created.gpsLatitude).toBeCloseTo(LONDON.latitude, 5);
    expect(created.gpsLongitude).toBeCloseTo(LONDON.longitude, 5);

    const stored = objects.get(created.storageKey);
    expect(stored?.contentType).toBe("image/jpeg");
    expect(stored?.body.length).toBe(created.sizeBytes);
    const seconds = rationalBytes(toDms(LONDON.latitude)[2], 1000);
    expect(containsBytes(stored!.body, seconds)).toBe(false);

    expect(await repository.findById(created.id)).toEqual(created);
  });

  it("rejects a non-owner before reading the file", async () => {
    const { media, storage } = service();

    await expect(media.upload(VISITOR, buildJpeg())).rejects.toBeInstanceOf(
      MediaAccessDeniedError,
    );
    await expect(media.upload(null, buildJpeg())).rejects.toBeInstanceOf(
      MediaAccessDeniedError,
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("stores nothing for a rejected file", async () => {
    const { media, storage } = service();

    await expect(
      media.upload(OWNER, new Uint8Array([0x47, 0x49, 0x46, 0x38])),
    ).rejects.toBeInstanceOf(MediaRejectedError);
    await expect(
      media.upload(OWNER, buildJpeg(), "x".repeat(501)),
    ).rejects.toMatchObject({ reason: "alt_too_long" });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("deletes the object when the row cannot be written", async () => {
    const failing: MediaRepository = {
      ...repository,
      insert: async () => {
        throw new Error("D1 unavailable");
      },
    };
    const { media, objects, storage } = service({
      media: failing,
      newId: () => "orphan00000000000001",
    });

    await expect(media.upload(OWNER, buildJpeg())).rejects.toThrow(
      "D1 unavailable",
    );
    expect(storage.upload).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenCalledWith(
      "media/orphan00000000000001.jpg",
    );
    expect(objects.size).toBe(0);
  });
});

describe("media resolution", () => {
  it("resolves live media to the article variant without coordinates", async () => {
    const { media } = service();
    const created = await media.upload(
      OWNER,
      buildJpeg({ width: 1200, height: 800, exif: { gps: LONDON } }),
    );

    const resolved = await media.resolveForArticle([created.id, "missing"]);

    expect(resolved).toEqual({
      [created.id]: {
        url: `/media/${created.id}.jpg?w=1600`,
        // The 1600 variant holds the 1200 px original, so it says so.
        srcSet: [
          `/media/${created.id}.jpg?w=480 480w`,
          `/media/${created.id}.jpg?w=960 960w`,
          `/media/${created.id}.jpg?w=1600 1200w`,
        ].join(", "),
        zoomUrl: `/media/${created.id}.jpg?w=1600`,
        width: 1200,
        height: 800,
      },
    });
    expect(await media.findExisting([created.id, "missing"])).toEqual(
      new Set([created.id]),
    );
  });

  it("skips soft-deleted media", async () => {
    const { media } = service();
    const created = await media.upload(OWNER, buildJpeg());
    await db
      .prepare("UPDATE media SET deleted_at = 1 WHERE id = ?")
      .bind(created.id)
      .run();

    expect(await media.resolveForArticle([created.id])).toEqual({});
    expect(await repository.findById(created.id)).toBeNull();
    // Still known, so a post that shows it stays saveable (ADR-0025).
    expect(await media.findExisting([created.id])).toEqual(new Set());
    expect(await media.findKnown([created.id])).toEqual(new Set([created.id]));
  });

  it("reads more ids than one statement may bind", async () => {
    const ids = Array.from({ length: 150 }, (_, index) => `id${index}`);
    expect(await repository.findKnown(ids)).toEqual(new Set());
  });
});

describe("media library", () => {
  const LATER = new Date("2026-11-18T09:00:00.000Z");

  it("lists live media newest first without coordinates", async () => {
    const first = service();
    const older = await first.media.upload(
      OWNER,
      buildJpeg({ exif: { gps: LONDON } }),
    );
    const second = service({ now: () => LATER });
    const newer = await second.media.upload(OWNER, buildJpeg(), "Harbour");

    const items = await second.media.list(OWNER);

    expect(items.map((item) => item.id)).toEqual([newer.id, older.id]);
    expect(items[0]).toMatchObject({
      url: `/media/${newer.id}.jpg?w=1600`,
      thumbnailUrl: `/media/${newer.id}.jpg?w=480`,
      alt: "Harbour",
      hadLocation: false,
      createdAt: LATER,
    });
    expect(items[1]?.hadLocation).toBe(true);
    expect(JSON.stringify(items)).not.toContain("51.5");
  });

  it("rejects non-owners", async () => {
    const { media } = service();
    await expect(media.list(VISITOR)).rejects.toThrow(MediaAccessDeniedError);
    await expect(media.remove(null, "x")).rejects.toThrow(
      MediaAccessDeniedError,
    );
  });

  it("deletes an unreferenced item, its object, and its coordinates", async () => {
    const { media, objects } = service();
    const created = await media.upload(
      OWNER,
      buildJpeg({ exif: { gps: LONDON } }),
    );

    expect(await media.remove(OWNER, created.id)).toEqual({ kind: "deleted" });

    expect(objects.has(created.storageKey)).toBe(false);
    expect(await media.list(OWNER)).toEqual([]);
    const row = await db
      .prepare(
        "SELECT deleted_at, gps_latitude, gps_longitude FROM media WHERE id = ?",
      )
      .bind(created.id)
      .first();
    expect(row).toEqual({
      deleted_at: NOW.getTime(),
      gps_latitude: null,
      gps_longitude: null,
    });
    expect(await media.remove(OWNER, created.id)).toEqual({
      kind: "not_found",
    });
  });

  it("asks for confirmation before deleting a referenced item", async () => {
    const posts = [{ id: "p1", title: "Harbour walk" }];
    const { media, objects } = service({ findReferences: async () => posts });
    const created = await media.upload(OWNER, buildJpeg());

    expect(await media.remove(OWNER, created.id)).toEqual({
      kind: "referenced",
      posts,
    });
    expect(objects.has(created.storageKey)).toBe(true);
    expect(await media.list(OWNER)).toHaveLength(1);

    expect(
      await media.remove(OWNER, created.id, { confirmReferenced: true }),
    ).toEqual({ kind: "deleted" });
    expect(objects.has(created.storageKey)).toBe(false);
  });

  it("keeps the row live when the object delete fails, so a retry works", async () => {
    const { media, storage, objects } = service();
    const created = await media.upload(OWNER, buildJpeg());
    vi.mocked(storage.delete).mockRejectedValueOnce(new Error("r2 down"));

    await expect(media.remove(OWNER, created.id)).rejects.toThrow("r2 down");
    expect(await media.list(OWNER)).toHaveLength(1);
    expect(objects.has(created.storageKey)).toBe(true);

    expect(await media.remove(OWNER, created.id)).toEqual({ kind: "deleted" });
    expect(await media.list(OWNER)).toEqual([]);
    expect(objects.has(created.storageKey)).toBe(false);
  });

  it("finishes on retry when the row update fails after the object is gone", async () => {
    const { media, objects } = service();
    const created = await media.upload(OWNER, buildJpeg());
    const spy = vi
      .spyOn(repository, "markDeleted")
      .mockRejectedValueOnce(new Error("d1 down"));

    await expect(media.remove(OWNER, created.id)).rejects.toThrow("d1 down");
    expect(objects.has(created.storageKey)).toBe(false);
    expect(await media.list(OWNER)).toHaveLength(1);

    spy.mockRestore();
    // R2 reports success for a key that is already gone.
    expect(await media.remove(OWNER, created.id)).toEqual({ kind: "deleted" });
    expect(await media.list(OWNER)).toEqual([]);
  });
});

describe("media constraints", () => {
  const insert = (values: Record<string, unknown>) => {
    const row = {
      id: "m1",
      storage_key: "media/m1.jpg",
      mime_type: "image/jpeg",
      width: 10,
      height: 10,
      size_bytes: 100,
      gps_latitude: null,
      gps_longitude: null,
      ...values,
    };
    return db
      .prepare(
        `INSERT INTO media (id, storage_key, mime_type, width, height, size_bytes, gps_latitude, gps_longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(...Object.values(row))
      .run();
  };

  it.each([
    { mime_type: "image/gif" },
    { width: 0 },
    { size_bytes: 0 },
    { gps_latitude: 10 },
    { gps_latitude: 91, gps_longitude: 0 },
    { gps_latitude: 0, gps_longitude: 181 },
  ])("rejects %o", async (values) => {
    await expect(insert(values)).rejects.toThrow(/CHECK constraint/);
  });

  it("keeps storage keys unique", async () => {
    await insert({});
    await expect(insert({ id: "m2" })).rejects.toThrow(
      /UNIQUE constraint failed: media\.storage_key/,
    );
  });
});
