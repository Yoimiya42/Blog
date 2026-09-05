import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ESLint enforces the same boundary, but an inline eslint-disable comment can
 * silence it. This test reads the source directly, so a leak fails CI.
 */
const SOURCE_ROOT = join(process.cwd(), "src");
const EDITOR_ROOT = join(SOURCE_ROOT, "features", "post", "content", "editor");

const TIPTAP_IMPORT = /from\s+["']@tiptap\/|import\(["']@tiptap\//;
const EDITOR_IMPORT = /from\s+["'][^"']*content\/editor/;

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const sourceFiles = collectSourceFiles(SOURCE_ROOT);
const outsideEditor = sourceFiles.filter(
  (path) => !path.startsWith(EDITOR_ROOT),
);

describe("editor runtime boundary", () => {
  it("keeps public rendering database-free and avoids raw HTML injection", () => {
    const renderFiles = collectSourceFiles(
      join(SOURCE_ROOT, "features", "post", "content", "render"),
    );
    expect(renderFiles.length).toBeGreaterThan(0);
    for (const path of renderFiles) {
      const source = readFileSync(path, "utf8");
      expect(source, path).not.toMatch(
        /dangerouslySetInnerHTML|\bfetch\s*\(|drizzle|\.repository|lib\/db|cloudflare:workers/,
      );
    }
  });

  it("requires external consumers to use the public post entry point", () => {
    const postRoot = join(SOURCE_ROOT, "features", "post");
    for (const path of sourceFiles.filter(
      (path) => !path.startsWith(postRoot),
    )) {
      expect(readFileSync(path, "utf8"), path).not.toMatch(
        /(?:from\s*|import\s*\()\s*["'][^"']*features\/post\/(?!index["'])/,
      );
    }
  });

  it("finds source files to check", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
    expect(outsideEditor.length).toBeGreaterThan(0);
  });

  it("keeps the TipTap runtime inside content/editor", () => {
    const leaks = outsideEditor
      .filter((path) => TIPTAP_IMPORT.test(readFileSync(path, "utf8")))
      .map((path) => relative(process.cwd(), path));

    expect(leaks).toEqual([]);
  });

  it("keeps the editor module out of every other module", () => {
    const leaks = outsideEditor
      .filter((path) => EDITOR_IMPORT.test(readFileSync(path, "utf8")))
      .map((path) => relative(process.cwd(), path));

    expect(leaks).toEqual([]);
  });
});
