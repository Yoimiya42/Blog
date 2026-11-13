import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  HomePage,
  homeContent,
  navItems,
  visibleSections,
  type HomeContent,
  type HomePostSummary,
} from "@/features/home";

import {
  emptyHomeContent,
  fullHomeContent,
  makePosts,
} from "../fixtures/home-content";

function render(
  content: HomeContent,
  posts: readonly HomePostSummary[] = [],
): string {
  return renderToStaticMarkup(createElement(HomePage, { content, posts }));
}

function sectionIds(html: string): string[] {
  return [...html.matchAll(/<section id="([a-z]+)"/g)].map((match) => match[1]);
}

describe("homepage sections", () => {
  it("renders every section in the fixed PRD order", () => {
    expect(sectionIds(render(fullHomeContent, makePosts(3)))).toEqual([
      "profile",
      "education",
      "experience",
      "projects",
      "skills",
      "writing",
      "contact",
    ]);
  });

  it("omits sections without source content", () => {
    const content: HomeContent = {
      ...fullHomeContent,
      education: [],
      skills: [],
    };

    expect(visibleSections(content, [])).toEqual([
      "profile",
      "experience",
      "projects",
      "contact",
    ]);
    expect(sectionIds(render(content))).toEqual([
      "profile",
      "experience",
      "projects",
      "contact",
    ]);
  });

  it("publishes nothing while the owner content is pending", () => {
    const html = render(emptyHomeContent);

    expect(sectionIds(html)).toEqual([]);
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<nav");
    expect(html).not.toContain("<footer");
  });

  it("ships no invented copy in the committed content", () => {
    const { placeholders, ...copy } = homeContent;
    const text = JSON.stringify(copy).toLowerCase();

    expect(placeholders).not.toContain("writing");
    for (const marker of ["lorem", "placeholder", "todo", "example.com"]) {
      expect(text).not.toContain(marker);
    }
  });
});

describe("homepage placeholders", () => {
  const content: HomeContent = {
    ...emptyHomeContent,
    identity: fullHomeContent.identity,
    education: [{ ...fullHomeContent.education[0], period: null }],
    placeholders: ["profile", "skills"],
  };

  it("renders a labelled placeholder only for listed empty sections", () => {
    const html = render(content);

    expect(sectionIds(html)).toEqual(["profile", "education", "skills"]);
    expect(html.split("placeholder-note").length - 1).toBe(2);
  });

  it("prefers source content over the placeholder", () => {
    const html = render({ ...fullHomeContent, placeholders: ["profile"] });

    expect(html).not.toContain("placeholder-note");
  });

  it("omits the period when an entry has no dates", () => {
    expect(render(content)).not.toContain("entry__period");
  });
});

describe("homepage navigation", () => {
  it("uses the PRD labels and skips sections without a nav entry", () => {
    const sections = visibleSections(fullHomeContent, makePosts(1));

    expect(navItems(sections).map((item) => item.label)).toEqual([
      "Profile",
      "Experience",
      "Projects",
      "Writing",
      "Contact",
    ]);
  });

  it("never links to a section that is not rendered", () => {
    const html = render({ ...fullHomeContent, experience: [] });
    const targets = [...html.matchAll(/href="#([a-z]+)"/g)]
      .map((match) => match[1])
      .filter((target) => target !== "content");

    expect(targets).toEqual(["profile", "projects", "contact"]);
    expect(sectionIds(html)).toEqual(expect.arrayContaining(targets));
  });
});

describe("homepage writing", () => {
  it.each([0, 1, 2])("handles %i posts without placeholder cards", (count) => {
    const html = render(fullHomeContent, makePosts(count));

    expect(html.split('href="/blog/post-').length - 1).toBe(count);
    expect(sectionIds(html).includes("writing")).toBe(count > 0);
  });

  it("shows at most three posts", () => {
    const html = render(fullHomeContent, makePosts(5));

    expect(html.split('href="/blog/post-').length - 1).toBe(3);
    expect(html).not.toContain("/blog/post-4");
  });
});

describe("homepage identity and contact", () => {
  it("renders one h1 with the owner name before any section", () => {
    const html = render(fullHomeContent);

    expect(html.split("<h1").length - 1).toBe(1);
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("<section"));
    expect(html).toContain("Test Person</h1>");
  });

  it("omits optional contact links that have no source", () => {
    const html = render({
      ...fullHomeContent,
      contact: {
        email: "person@example.com",
        githubUrl: null,
        linkedinUrl: null,
      },
    });

    expect(html).toContain('href="mailto:person@example.com"');
    expect(html).not.toContain("GitHub");
    expect(html).not.toContain("LinkedIn");
  });

  it("shows readable link text without the scheme or trailing slash", () => {
    const html = render(fullHomeContent);

    expect(html).toContain(">github.com/example</a>");
    expect(html).toContain(">linkedin.com/in/example</a>");
  });

  it("escapes HTML-like content", () => {
    const html = render(fullHomeContent);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
