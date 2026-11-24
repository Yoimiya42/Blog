import { deriveArticleContent } from "../../content/derive";
import { ARTICLE_PROSE_CLASS } from "../../content/prose";
import { ArticleContent } from "../../content/render/article-content";
import type { ArticleMediaMap } from "../../content/render/media";
import type { PublicPost } from "../../server/public-post.service";
import { PostMeta, TagList } from "./post-meta";
import { TableOfContents } from "./table-of-contents";

/** A table of contents earns its space from two headings upward. */
const MIN_TOC_ITEMS = 2;

/** FR-BLOG-02 post detail: header, table of contents, and article body. */
export function PostArticle({
  post,
  mediaById,
  showDraftNotice = true,
}: {
  post: PublicPost;
  mediaById: ArticleMediaMap;
  /** Off where the page shows the post's state itself, as the preview does. */
  showDraftNotice?: boolean;
}) {
  const toc = post.document
    ? deriveArticleContent(post.document).tableOfContents
    : [];
  const showToc = toc.length >= MIN_TOC_ITEMS;

  return (
    <div className={showToc ? "post-layout post-layout--toc" : "post-layout"}>
      <header className="post-head">
        {post.isDraft && showDraftNotice ? (
          <p className="post-head__draft" role="status">
            Draft · hidden from visitors
          </p>
        ) : null}
        <h1 className="post-head__title">{post.title}</h1>
        {post.summary ? (
          <p className="post-head__summary">{post.summary}</p>
        ) : null}
        {/* A draft has no publication date yet. */}
        {post.isDraft ? null : <PostMeta post={post} />}
        <TagList tags={post.tags} />
      </header>

      {showToc ? (
        <aside className="post-toc">
          <TableOfContents items={toc} />
        </aside>
      ) : null}

      <div className={`post-body article-type ${ARTICLE_PROSE_CLASS}`}>
        {post.document ? (
          <ArticleContent document={post.document} mediaById={mediaById} />
        ) : (
          <p role="alert">This post cannot be displayed right now.</p>
        )}
      </div>
    </div>
  );
}
