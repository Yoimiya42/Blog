export const POST_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

/** A post without its body. List queries never load `content`. */
export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: PostStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post extends PostSummary {
  /**
   * Parsed JSON as stored. The repository does not validate the document:
   * callers upgrade it from `contentSchemaVersion` and validate it before use.
   */
  content: unknown;
  contentSchemaVersion: number;
}

export interface NewPost {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: unknown;
  contentSchemaVersion: number;
  status: PostStatus;
  publishedAt: Date | null;
}

export type PostPatch = Partial<Omit<NewPost, "id">>;

export interface PublishedPostQuery {
  limit: number;
  offset: number;
  tagId?: string;
}

export class PostSlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`post slug is already in use: ${slug}`);
    this.name = "PostSlugTakenError";
  }
}
