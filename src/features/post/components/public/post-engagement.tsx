"use client";

import { Heart } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  recordPostViewAction,
  togglePostLikeAction,
} from "../../server/engagement.actions";
import { countLabel, formatCount } from "./format-count";

const RATE_LIMITED = "Too many likes in a minute. Try again shortly.";
const FAILED = "The like could not be saved. Try again.";

/**
 * FR-BLOG-19 and FR-BLOG-20 on the post page: counts one view after load and
 * holds the like button. Rendered for published posts only.
 */
export function PostEngagement({
  slug,
  initialLikes,
  initialLiked,
}: {
  slug: string;
  initialLikes: number;
  initialLiked: boolean;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const counted = useRef(false);

  useEffect(() => {
    // Development runs effects twice; one page load is one view.
    if (counted.current) return;
    counted.current = true;
    void recordPostViewAction(slug).catch(() => {
      // A lost view is not worth interrupting the reader.
    });
  }, [slug]);

  function toggle() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await togglePostLikeAction(slug);
        if (result.ok) {
          setLiked(result.liked);
          setLikes(result.likes);
        } else {
          setMessage(result.reason === "rate_limited" ? RATE_LIMITED : FAILED);
        }
      } catch {
        setMessage(FAILED);
      }
    });
  }

  return (
    <div className="post-like">
      <Button
        aria-pressed={liked}
        // 44 px public touch target (PRD 6.3).
        className="min-h-11 min-w-11"
        disabled={pending}
        onClick={toggle}
        type="button"
        variant="outline"
      >
        <Heart
          aria-hidden="true"
          className={liked ? "fill-current" : undefined}
        />
        <span aria-hidden="true">{formatCount(likes)}</span>
        <span className="sr-only">
          {liked ? "Unlike this post" : "Like this post"},{" "}
          {countLabel(likes, "like")}
        </span>
      </Button>
      {message ? (
        <p className="post-like__message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
