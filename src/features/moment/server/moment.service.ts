import {
  MOMENT_BODY_MAX_LENGTH,
  MOMENT_MAX_IMAGES,
  MOMENTS_PER_PAGE,
  MomentAccessDeniedError,
  type Moment,
  type MomentFieldErrors,
  type MomentInput,
  type MomentMutationResult,
} from "../schema";
import type { MomentRepository } from "./moment.repository";

/** The session of the caller, or nothing when the request is anonymous. */
export type MomentActor = { user: { role?: unknown } } | null | undefined;

/** One image as the feed renders it. Carries no coordinates. */
export interface MomentImage {
  id: string;
  url: string;
  srcSet: string;
  /** Largest useful variant, for the enlarged view. */
  zoomUrl: string;
  width: number;
  height: number;
  alt: string;
}

/** A moment with its live images resolved. Deleted images are left out. */
export interface ResolvedMoment {
  id: string;
  body: string;
  images: MomentImage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MomentPage {
  moments: ResolvedMoment[];
  page: number;
  totalPages: number;
  total: number;
}

/** A moment that shows a media item, as the media library lists it. */
export interface MomentMediaReference {
  id: string;
  title: string;
  href: string;
}

const BODY_TOO_LONG = `Keep it under ${MOMENT_BODY_MAX_LENGTH.toLocaleString("en")} characters.`;
const EMPTY = "Write something or add an image.";
const TOO_MANY_IMAGES = `Up to ${MOMENT_MAX_IMAGES} images.`;
const IMAGES_UNREADABLE = "The images could not be read.";
const IMAGE_GONE = "An image was deleted. Remove it and try again.";
const REFERENCE_TITLE_LENGTH = 40;

interface MomentServiceDependencies {
  moments: MomentRepository;
  /** The auth module owns the owner rule; the service only applies it. */
  isOwner: (actor: MomentActor) => boolean;
  /** Which ids name live media. From the media module. */
  findLiveMedia: (ids: string[]) => Promise<Set<string>>;
  /** Display data for live media ids; unknown or deleted ids are absent. */
  resolveImages: (
    ids: string[],
  ) => Promise<Record<string, Omit<MomentImage, "id">>>;
  now?: () => Date;
  newId?: () => string;
}

/** Line endings are normalised so the length check matches what is stored. */
function normaliseBody(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  return raw.replace(/\r\n?/g, "\n").trim();
}

/** SQLite `length()` counts code points, not UTF-16 units. */
function codePointLength(text: string): number {
  return [...text].length;
}

function readMediaIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  if (!raw.every((id) => typeof id === "string" && id !== "")) return null;

  return raw as string[];
}

function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / MOMENTS_PER_PAGE));
}

/** First words of the body, for a list of references. */
export function momentTitle(moment: { body: string; createdAt: Date }): string {
  const line = moment.body.split("\n", 1)[0] ?? "";
  if (line === "") {
    return `Moment of ${moment.createdAt.toISOString().slice(0, 10)}`;
  }

  const characters = [...line];
  return characters.length > REFERENCE_TITLE_LENGTH
    ? `${characters.slice(0, REFERENCE_TITLE_LENGTH).join("")}…`
    : line;
}

export function createMomentService({
  moments,
  isOwner,
  findLiveMedia,
  resolveImages,
  now = () => new Date(),
  newId = () => crypto.randomUUID(),
}: MomentServiceDependencies) {
  /**
   * Checked in every owner method, not only at the route: a service call from
   * a new entry point must not skip authorisation.
   */
  function assertOwner(actor: MomentActor): void {
    if (!isOwner(actor)) throw new MomentAccessDeniedError();
  }

  type Parsed =
    | { ok: true; body: string; mediaIds: string[] }
    | { ok: false; fieldErrors: MomentFieldErrors };

  async function parse(input: MomentInput): Promise<Parsed> {
    const fieldErrors: MomentFieldErrors = {};
    const body = normaliseBody(input.body);
    const mediaIds = readMediaIds(input.mediaIds);

    if (body === null) fieldErrors.body = EMPTY;
    else if (codePointLength(body) > MOMENT_BODY_MAX_LENGTH) {
      fieldErrors.body = BODY_TOO_LONG;
    }

    if (mediaIds === null) fieldErrors.mediaIds = IMAGES_UNREADABLE;
    else if (new Set(mediaIds).size !== mediaIds.length) {
      fieldErrors.mediaIds = IMAGES_UNREADABLE;
    } else if (mediaIds.length > MOMENT_MAX_IMAGES) {
      fieldErrors.mediaIds = TOO_MANY_IMAGES;
    }

    if (body === "" && mediaIds?.length === 0) fieldErrors.body = EMPTY;
    if (Object.keys(fieldErrors).length > 0 || body === null || !mediaIds) {
      return { ok: false, fieldErrors };
    }

    // A saved moment shows its images at once, so they must be live.
    if (mediaIds.length > 0) {
      const live = await findLiveMedia(mediaIds);
      if (mediaIds.some((id) => !live.has(id))) {
        return { ok: false, fieldErrors: { mediaIds: IMAGE_GONE } };
      }
    }

    return { ok: true, body, mediaIds };
  }

  async function resolve(list: Moment[]): Promise<ResolvedMoment[]> {
    const ids = [...new Set(list.flatMap((moment) => moment.mediaIds))];
    const images = ids.length > 0 ? await resolveImages(ids) : {};

    return list.map((moment) => ({
      id: moment.id,
      body: moment.body,
      createdAt: moment.createdAt,
      updatedAt: moment.updatedAt,
      images: moment.mediaIds.flatMap((id) => {
        const image = images[id];
        return image ? [{ id, ...image }] : [];
      }),
    }));
  }

  /** Null for a page number outside the feed. Page 1 always exists. */
  async function listPage(page: number): Promise<MomentPage | null> {
    if (!Number.isInteger(page) || page < 1) return null;

    const total = await moments.count();
    const totalPages = pageCount(total);
    if (page > totalPages) return null;

    const list = await moments.list(
      MOMENTS_PER_PAGE,
      (page - 1) * MOMENTS_PER_PAGE,
    );

    return { moments: await resolve(list), page, totalPages, total };
  }

  return {
    /** Public feed (FR-MOMENT-01). Every live moment is public. */
    listPage,

    /** Admin list; the same pages as the feed. */
    async listForOwner(
      actor: MomentActor,
      page: number,
    ): Promise<MomentPage | null> {
      assertOwner(actor);
      return listPage(page);
    },

    async get(actor: MomentActor, id: string): Promise<ResolvedMoment | null> {
      assertOwner(actor);
      const moment = await moments.findById(id);
      if (!moment) return null;

      const [resolved] = await resolve([moment]);
      return resolved ?? null;
    },

    async create(
      actor: MomentActor,
      input: MomentInput,
    ): Promise<MomentMutationResult> {
      assertOwner(actor);
      const parsed = await parse(input);
      if (!parsed.ok) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: parsed.fieldErrors,
        };
      }

      const moment = await moments.insert(
        { id: newId(), body: parsed.body, mediaIds: parsed.mediaIds },
        now(),
      );
      return { ok: true, moment };
    },

    /** Every edit is conditional on the version the owner last read. */
    async update(
      actor: MomentActor,
      id: string,
      input: MomentInput,
      ifUpdatedAt: Date,
    ): Promise<MomentMutationResult> {
      assertOwner(actor);
      const parsed = await parse(input);
      if (!parsed.ok) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: parsed.fieldErrors,
        };
      }

      const moment = await moments.update(
        id,
        { body: parsed.body, mediaIds: parsed.mediaIds },
        now(),
        ifUpdatedAt,
      );
      if (moment) return { ok: true, moment };

      return {
        ok: false,
        reason: (await moments.findById(id)) ? "conflict" : "not_found",
      };
    },

    /** Returns false when the moment was already gone. */
    async remove(actor: MomentActor, id: string): Promise<boolean> {
      assertOwner(actor);
      return moments.softDelete(id, now());
    },

    /** Live moments that show `mediaId` (ADR-0025). No owner check: the
     * media service checks the owner before it asks. */
    async findReferencingMedia(
      mediaId: string,
    ): Promise<MomentMediaReference[]> {
      const rows = await moments.listReferencing(mediaId);

      return rows.map((row) => ({
        id: row.id,
        title: momentTitle(row),
        href: `/admin/moments/${row.id}`,
      }));
    },
  };
}

export type MomentService = ReturnType<typeof createMomentService>;

export async function getMomentService(): Promise<MomentService> {
  // Loaded lazily: the repository, auth, and media modules need the Workers
  // runtime, and static imports would pull it into client consumers.
  const [{ getMomentRepository }, { isOwnerSession }, { getMediaService }] =
    await Promise.all([
      import("./moment.repository"),
      import("@/features/auth"),
      import("@/features/media"),
    ]);
  const media = await getMediaService();

  return createMomentService({
    moments: await getMomentRepository(),
    isOwner: isOwnerSession,
    findLiveMedia: (ids) => media.findExisting(ids),
    resolveImages: (ids) => media.resolveForMoments(ids),
  });
}
