"use client";

import { useEffect, useState } from "react";

import type { TableOfContentsItem } from "../../content/derive";

export type TableOfContentsProps = {
  items: readonly TableOfContentsItem[];
};

/**
 * Marks the heading nearest the top of the viewport. The band starts below
 * the sticky header and covers the upper third, so a heading becomes active
 * once it is comfortably in view, not as soon as it appears at the bottom.
 */
function useActiveHeading(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const headings = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (headings.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first) {
          setActive(first);
          return;
        }
        // Between headings: keep the last one scrolled past.
        const passed = headings.filter(
          (heading) => heading.getBoundingClientRect().top < 0,
        );
        setActive(passed.at(-1)?.id ?? null);
      },
      { rootMargin: "-64px 0px -66% 0px" },
    );
    for (const heading of headings) observer.observe(heading);

    return () => observer.disconnect();
  }, [ids]);

  return active;
}

function Items({
  items,
  active,
}: {
  items: readonly TableOfContentsItem[];
  active: string | null;
}) {
  return (
    <ol className="toc__list">
      {items.map((item) => (
        <li className={`toc__item toc__item--h${item.level}`} key={item.id}>
          <a
            aria-current={item.id === active ? "location" : undefined}
            href={`#${item.id}`}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * FR-BLOG-05. Two renderings of one list: a collapsed disclosure above the
 * article on narrow screens and a sticky sidebar on wide ones. CSS shows one.
 */
export function TableOfContents({ items }: TableOfContentsProps) {
  const [ids] = useState(() => items.map((item) => item.id));
  const active = useActiveHeading(ids);

  return (
    <>
      <details className="toc toc--inline">
        <summary>Contents</summary>
        <Items active={active} items={items} />
      </details>
      <nav aria-label="Table of contents" className="toc toc--sidebar">
        <p className="toc__title">Contents</p>
        <Items active={active} items={items} />
      </nav>
    </>
  );
}
