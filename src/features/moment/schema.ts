/** FR-MOMENT-01: plain-text body limit, mirrored by a CHECK constraint. */
export const MOMENT_BODY_MAX_LENGTH = 2000;

/** FR-MOMENT-02: at most this many images per moment. */
export const MOMENT_MAX_IMAGES = 9;

/** FR-MOMENT-01: feed page size until infinite scroll (FR-MOMENT-06). */
export const MOMENTS_PER_PAGE = 20;

/** A stored moment. `mediaIds` is ordered and may name deleted images. */
export interface Moment {
  id: string;
  body: string;
  mediaIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NewMoment {
  id: string;
  body: string;
  mediaIds: readonly string[];
}

/** Raw composer input. Every field is validated by the service. */
export interface MomentInput {
  body: unknown;
  mediaIds: unknown;
}

export type MomentField = "body" | "mediaIds";

export type MomentFieldErrors = Partial<Record<MomentField, string>>;

export type MomentMutationResult =
  | { ok: true; moment: Moment }
  | { ok: false; reason: "invalid"; fieldErrors: MomentFieldErrors }
  | { ok: false; reason: "not_found" }
  /** The moment changed after the caller last read it. Nothing was written. */
  | { ok: false; reason: "conflict" };

/** Wire form of the concurrency token: epoch milliseconds. */
export function toMomentVersion(updatedAt: Date): string {
  return String(updatedAt.getTime());
}

/** Undefined for anything that is not a token, such as a forged field. */
export function fromMomentVersion(raw: unknown): Date | undefined {
  return typeof raw === "string" && /^\d{1,15}$/.test(raw)
    ? new Date(Number(raw))
    : undefined;
}

export class MomentAccessDeniedError extends Error {
  constructor() {
    super("moment management requires the owner");
    this.name = "MomentAccessDeniedError";
  }
}
