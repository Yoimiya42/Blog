import type { Tag, TagRepository } from "@/features/tag";

import { deriveArticleContent } from "../content/derive";
import type { ArticleDocument } from "../content/types";
import { CONTENT_SCHEMA_VERSION } from "../content/types";
import { validateArticleDocument } from "../content/validate";
import type { Post } from "../schema";
import type { PostRepository } from "./post.repository";

export const PUBLIC_POSTS_PER_PAGE = 10;

/** A list cover as cards render it (FR-BLOG-14). */
export interface PostCover {
  url: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
}

/** A post as visitors see it in lists. Never a draft. */
export interface PublicPostSummary {
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: Date;
  tags: Tag[];
  /** Null when the stored document fails validation. */
  readingMinutes: number | null;
  /**
   * Null for no cover or a deleted image. Only list pages resolve covers; the
   * homepage and the post page do not show them.
   */
  cover: PostCover | null;
}

export interface PublicPost extends PublicPostSummary {
  /** Null when the stored document fails validation; the page shows a notice. */
  document: ArticleDocument | null;
  isDraft: boolean;
}

export interface PublicPostPage {
  posts: PublicPostSummary[];
  page: number;
  totalPages: number;
  totalPosts: number;
}

/** A timeline row (FR-BLOG-16): no body, tags, or cover to load. */
export type TimelinePost = Pick<
  PublicPostSummary,
  "slug" | "title" | "summary" | "publishedAt"
>;

export interface TimelinePage extends Omit<PublicPostPage, "posts"> {
  posts: TimelinePost[];
}

function pageCount(totalPosts: number): number {
  return Math.max(1, Math.ceil(totalPosts / PUBLIC_POSTS_PER_PAGE));
}

interface PublicPostServiceDependencies {
  posts: PostRepository;
  tags: TagRepository;
  /**
   * Live covers by media id, from the media module. Omitted by tests that do
   * not exercise covers; every cover is then null.
   */
  resolveCovers?: (ids: string[]) => Promise<Record<string, PostCover>>;
}

/**
 * Validates the stored body against the current schema. Publishing already
 * validates, so a failure here is a defect: it is logged, not thrown, so one
 * bad post cannot take down a list page.
 */
function readDocument(post: Post): ArticleDocument | null {
  const result =
    post.contentSchemaVersion === CONTENT_SCHEMA_VERSION
      ? validateArticleDocument(post.content)
      : null;
  if (result?.ok) return result.document;

  console.error(
    JSON.stringify({ event: "post.invalid_content", postId: post.id }),
  );

  return null;
}

function toSummary(
  post: Post,
  document: ArticleDocument | null,
  tags: Tag[],
  cover: PostCover | null = null,
): PublicPostSummary {
  return {
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    // Drafts are never summarised. A draft read by its owner has no date yet.
    publishedAt: post.publishedAt ?? post.updatedAt,
    tags,
    readingMinutes: document
      ? deriveArticleContent(document).readingMinutes
      : null,
    cover,
  };
}

/**
 * Anonymous read path. Returns published posts only, except `getBySlug`,
 * which returns drafts flagged so the route can apply the owner guard.
 */
export function createPublicPostService({
  posts,
  tags,
  resolveCovers,
}: PublicPostServiceDependencies) {
  async function summarise(
    rows: Post[],
    { withCovers = false } = {},
  ): Promise<PublicPostSummary[]> {
    const coverIds = withCovers
      ? rows.flatMap((post) => (post.coverId ? [post.coverId] : []))
      : [];
    const [tagsByPost, covers] = await Promise.all([
      tags.listByPostIds(rows.map((post) => post.id)),
      resolveCovers && coverIds.length > 0
        ? resolveCovers(coverIds)
        : Promise.resolve<Record<string, PostCover>>({}),
    ]);

    return rows.map((post) =>
      toSummary(
        post,
        readDocument(post),
        tagsByPost.get(post.id) ?? [],
        (post.coverId && covers[post.coverId]) || null,
      ),
    );
  }

  /** Null when `page` is beyond the last page. Page 1 always exists. */
  async function listPage(
    page: number,
    filter: { tagId?: string; excludePinned?: boolean },
  ): Promise<PublicPostPage | null> {
    if (!Number.isSafeInteger(page) || page < 1) return null;

    // Count and rows in parallel: one D1 round trip instead of two. A page
    // past the end returns no rows, so the count still decides.
    const [totalPosts, rows] = await Promise.all([
      posts.countPublished(filter),
      posts.listPublishedWithContent({
        limit: PUBLIC_POSTS_PER_PAGE,
        offset: (page - 1) * PUBLIC_POSTS_PER_PAGE,
        ...filter,
      }),
    ]);
    const totalPages = pageCount(totalPosts);
    if (page > totalPages) return null;

    return {
      posts: await summarise(rows, { withCovers: true }),
      page,
      totalPages,
      totalPosts,
    };
  }

  return {
    /**
     * The blog index. The full view passes `excludePinned`: its pinned posts
     * sit above the grid instead (FR-BLOG-17), so pages count without them.
     */
    listPage(
      page: number,
      { excludePinned = false }: { excludePinned?: boolean } = {},
    ): Promise<PublicPostPage | null> {
      return listPage(page, { excludePinned });
    },

    /**
     * The blog index as a timeline: every published post, pinned ones in
     * date order. Rendered beside the full view, so it stays light.
     */
    async listTimelinePage(page: number): Promise<TimelinePage | null> {
      if (!Number.isSafeInteger(page) || page < 1) return null;

      const [totalPosts, rows] = await Promise.all([
        posts.countPublished(),
        posts.listPublished({
          limit: PUBLIC_POSTS_PER_PAGE,
          offset: (page - 1) * PUBLIC_POSTS_PER_PAGE,
        }),
      ]);
      const totalPages = pageCount(totalPosts);
      if (page > totalPages) return null;

      return {
        posts: rows.map((post) => ({
          slug: post.slug,
          title: post.title,
          summary: post.summary,
          publishedAt: post.publishedAt ?? post.updatedAt,
        })),
        page,
        totalPages,
        totalPosts,
      };
    },

    /** FR-BLOG-17: published pinned posts with covers, most recent pin first. */
    async listPinned(): Promise<PublicPostSummary[]> {
      return summarise(await posts.listPinnedPublishedWithContent(), {
        withCovers: true,
      });
    },

    /** Null when the tag does not exist or `page` is out of range. */
    async listTagPage(
      tagSlug: string,
      page: number,
    ): Promise<(PublicPostPage & { tag: Tag }) | null> {
      const tag = await tags.findBySlug(tagSlug);
      if (!tag) return null;

      const result = await listPage(page, { tagId: tag.id });

      return result ? { ...result, tag } : null;
    },

    async latest(limit: number): Promise<PublicPostSummary[]> {
      const rows = await posts.listPublishedWithContent({ limit, offset: 0 });

      return summarise(rows);
    },

    /**
     * Published or draft. The caller MUST show a draft to the owner only
     * (FR-BLOG-06).
     */
    async getBySlug(slug: string): Promise<PublicPost | null> {
      const post = await posts.findBySlug(slug);
      if (!post) return null;

      const document = readDocument(post);
      const tagsByPost = await tags.listByPostIds([post.id]);

      return {
        ...toSummary(post, document, tagsByPost.get(post.id) ?? []),
        document,
        isDraft: post.status !== "PUBLISHED",
      };
    },
  };
}

export type PublicPostService = ReturnType<typeof createPublicPostService>;

export async function getPublicPostService(): Promise<PublicPostService> {
  // Loaded lazily for the same reason as `getPostService`.
  const [{ getPostRepository }, { getTagRepository }] = await Promise.all([
    import("./post.repository"),
    import("@/features/tag"),
  ]);

  return createPublicPostService({
    posts: await getPostRepository(),
    tags: await getTagRepository(),
    // Loaded on first use: the media module owns delivery URLs.
    resolveCovers: async (ids) => {
      const { getMediaService } = await import("@/features/media");
      return (await getMediaService()).resolveCovers(ids);
    },
  });
}
