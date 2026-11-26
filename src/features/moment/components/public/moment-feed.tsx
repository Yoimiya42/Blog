import { Heart, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { MomentPage, ResolvedMoment } from "../../server/moment.service";
import { MomentGallery } from "./moment-gallery";

/**
 * Calendar date in UTC. Pages render on the server, so a fixed zone keeps the
 * date identical for every visitor.
 */
function toCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Reserved like and comment slot (FR-MOMENT-08). The controls are disabled
 * until FR-SOCIAL opens visitor interaction in v2.5.
 */
function InteractionSlot() {
  return (
    <div className="moment__actions" data-slot="interactions">
      <Button
        aria-label="Likes open later"
        className="size-11"
        disabled
        size="icon"
        type="button"
        variant="ghost"
      >
        <Heart aria-hidden="true" />
      </Button>
      <Button
        aria-label="Comments open later"
        className="size-11"
        disabled
        size="icon"
        type="button"
        variant="ghost"
      >
        <MessageCircle aria-hidden="true" />
      </Button>
    </div>
  );
}

function MomentEntry({ moment }: { moment: ResolvedMoment }) {
  const date = toCalendarDate(moment.createdAt);

  return (
    <article className="moment" id={`moment-${moment.id}`}>
      {moment.body === "" ? null : (
        <p className="moment__body">{moment.body}</p>
      )}
      <MomentGallery images={moment.images} />
      <footer className="moment__foot">
        <time
          className="moment__date"
          dateTime={moment.createdAt.toISOString()}
        >
          {date}
        </time>
        <InteractionSlot />
      </footer>
    </article>
  );
}

function pageHref(page: number): string {
  return page === 1 ? "/moments" : `/moments?page=${page}`;
}

/** Reverse-chronological feed (FR-MOMENT-01). */
export function MomentFeed({ feed }: { feed: MomentPage }) {
  return (
    <div className="blog-page moment-page">
      <h1 className="blog-page__title">Moments</h1>

      {feed.moments.length === 0 ? (
        <p className="moment-page__empty">Nothing here yet.</p>
      ) : (
        <ol className="moment-list">
          {feed.moments.map((moment) => (
            <li key={moment.id}>
              <MomentEntry moment={moment} />
            </li>
          ))}
        </ol>
      )}

      {feed.totalPages > 1 ? (
        <nav aria-label="Pagination" className="pagination">
          {feed.page > 1 ? (
            <Link href={pageHref(feed.page - 1)} rel="prev">
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="pagination__status">
            Page {feed.page} of {feed.totalPages}
          </span>
          {feed.page < feed.totalPages ? (
            <Link href={pageHref(feed.page + 1)} rel="next">
              Older
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
