import { Pencil } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import type { MomentPage } from "../server/moment.service";
import { DeleteMomentButton } from "./delete-moment-button";

/** Thumbnails shown per row; the rest are counted. */
const ROW_THUMBNAILS = 4;

function toDateTime(date: Date): string {
  // UTC, like the public feed; minutes help the owner tell a day's posts apart.
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}`;
}

/** Owner list of moments, newest first, with edit and delete (FR-ADMIN-11). */
export function MomentAdminList({ feed }: { feed: MomentPage }) {
  if (feed.moments.length === 0) {
    return <p className="text-sm text-muted-foreground">No moments yet.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-border rounded-card border border-border bg-card">
        {feed.moments.map((moment) => {
          const extra = moment.images.length - ROW_THUMBNAILS;

          return (
            <li className="flex gap-3 p-3" key={moment.id}>
              <Link
                className="min-w-0 flex-1 rounded-control outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                href={`/admin/moments/${moment.id}`}
              >
                <p className="text-xs text-muted-foreground">
                  <time dateTime={moment.createdAt.toISOString()}>
                    {toDateTime(moment.createdAt)}
                  </time>
                </p>
                {moment.body ? (
                  <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line">
                    {moment.body}
                  </p>
                ) : null}
                {moment.images.length > 0 ? (
                  <ul className="mt-2 flex gap-1.5">
                    {moment.images.slice(0, ROW_THUMBNAILS).map((image) => (
                      <li key={image.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- fixed-width variant (ADR-0021). */}
                        <img
                          alt=""
                          className="size-14 rounded-control border border-border object-cover"
                          height={56}
                          loading="lazy"
                          sizes="56px"
                          src={image.url}
                          srcSet={image.srcSet}
                          width={56}
                        />
                      </li>
                    ))}
                    {extra > 0 ? (
                      <li className="grid size-14 place-items-center rounded-control border border-border text-sm text-muted-foreground">
                        +{extra}
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </Link>
              <div className="flex shrink-0 items-start">
                <Link
                  aria-label="Edit moment"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon",
                    className: "size-11 text-muted-foreground",
                  })}
                  href={`/admin/moments/${moment.id}`}
                  title="Edit moment"
                >
                  <Pencil />
                </Link>
                <DeleteMomentButton momentId={moment.id} />
              </div>
            </li>
          );
        })}
      </ul>

      {feed.totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-4 flex items-center justify-between text-sm"
        >
          {feed.page > 1 ? (
            <Link
              className={buttonVariants({ variant: "outline" })}
              href={`/admin/moments?page=${feed.page - 1}`}
            >
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            {feed.page} / {feed.totalPages}
          </span>
          {feed.page < feed.totalPages ? (
            <Link
              className={buttonVariants({ variant: "outline" })}
              href={`/admin/moments?page=${feed.page + 1}`}
            >
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
