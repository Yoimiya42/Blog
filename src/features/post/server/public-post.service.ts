import type { Tag, TagRepository } from "@/features/tag";

import { deriveArticleContent } from "../content/derive";
import type { ArticleDocument } from "../content/types";
import { CONTENT_SCHEMA_VERSION } from "../content/types";
import { validateArticleDocument } from "../content/validate";
import type { Post } from "../schema";
import type { PostRepository } from "./post.repository";

export const PUBLIC_POSTS_PER_PAGE = 10;

/** A post as visitors see it in lists. Never a draft. */
export interface PublicPostSummary {
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: Date;
  tags: Tag[];
  /** Null when the stored document fails validation. */
  readingMinutes: number | null;
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

interface PublicPostServiceDependencies {
  posts: PostRepository;
  tags: TagRepository;
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
  };
}

/**
 * Anonymous read path. Returns published posts only, except `getBySlug`,
 * which returns drafts flagged so the route can apply the owner guard.
 */
export function createPublicPostService({
  posts,
  tags,
}: PublicPostServiceDependencies) {
  async function summarise(rows: Post[]): Promise<PublicPostSummary[]> {
    const tagsByPost = await tags.listByPostIds(rows.map((post) => post.id));

    return rows.map((post) =>
      toSummary(post, readDocument(post), tagsByPost.get(post.id) ?? []),
    );
  }

  /** Null when `page` is beyond the last page. Page 1 always exists. */
  async function listPage(
    page: number,
    tagId?: string,
  ): Promise<PublicPostPage | null> {
    if (!Number.isSafeInteger(page) || page < 1) return null;

    const totalPosts = await posts.countPublished(tagId);
    const totalPages = Math.max(
      1,
      Math.ceil(totalPosts / PUBLIC_POSTS_PER_PAGE),
    );
    if (page > totalPages) return null;

    const rows = await posts.listPublishedWithContent({
      limit: PUBLIC_POSTS_PER_PAGE,
      offset: (page - 1) * PUBLIC_POSTS_PER_PAGE,
      tagId,
    });

    return { posts: await summarise(rows), page, totalPages, totalPosts };
  }

  return {
    listPage(page: number): Promise<PublicPostPage | null> {
      return listPage(page);
    },

    /** Null when the tag does not exist or `page` is out of range. */
    async listTagPage(
      tagSlug: string,
      page: number,
    ): Promise<(PublicPostPage & { tag: Tag }) | null> {
      const tag = await tags.findBySlug(tagSlug);
      if (!tag) return null;

      const result = await listPage(page, tag.id);

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
  });
}
