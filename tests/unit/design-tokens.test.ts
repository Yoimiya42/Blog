import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ADR-0029: components use semantic tokens, never raw palette values, so a
 * restyle or dark mode edits token values only.
 */
const SOURCE_ROOT = join(process.cwd(), "src");

function collect(directory: string, pattern: RegExp): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collect(path, pattern);
    return pattern.test(entry.name) ? [path] : [];
  });
}

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white";
const PALETTE_CLASS = new RegExp(
  `\\b(?:bg|text|border|ring|ring-offset|divide|outline|fill|stroke|placeholder|decoration|shadow|from|via|to|accent|caret)-(?:${PALETTE})(?:-\\d+)?(?:/\\d+)?\\b`,
);
const RADIUS_CLASS = /\brounded(?:-[a-z0-9]+)*(?:-\[[^\]]*\])?(?![\w-])/g;
const RADIUS_STEPS = new Set(["full", "mark", "control", "container", "card"]);

function offScaleRadii(source: string): string[] {
  return [...source.matchAll(RADIUS_CLASS)]
    .map(([match]) => match)
    .filter((match) => !RADIUS_STEPS.has(match.split("-").at(-1) ?? ""));
}

function findings(files: string[], check: (line: string) => boolean) {
  return files.flatMap((path) =>
    readFileSync(path, "utf8")
      .split("\n")
      .flatMap((line, index) =>
        check(line) ? [`${relative(SOURCE_ROOT, path)}:${index + 1}`] : [],
      ),
  );
}

describe("design tokens", () => {
  const components = collect(SOURCE_ROOT, /\.tsx?$/);

  it("uses semantic colour utilities, not palette classes", () => {
    expect(findings(components, (line) => PALETTE_CLASS.test(line))).toEqual(
      [],
    );
  });

  it("uses only the radius scale", () => {
    expect(
      findings(components, (line) => offScaleRadii(line).length > 0),
    ).toEqual([]);
  });

  it("keeps colour and duration literals inside token declarations", () => {
    const stylesheets = collect(SOURCE_ROOT, /\.css$/);
    expect(stylesheets.length).toBeGreaterThan(0);

    const literal =
      /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(|\b\d+(?:\.\d+)?m?s\b/i;
    const misplaced = stylesheets.flatMap((path) =>
      readFileSync(path, "utf8")
        // Comments may mention values; blank them but keep line numbers.
        .replace(/\/\*[\s\S]*?\*\//g, (comment) =>
          comment.replace(/[^\n]/g, " "),
        )
        .split("\n")
        .flatMap((line, index) =>
          literal.test(line) && !/^\s*--[\w-]+\s*:/.test(line)
            ? [`${relative(SOURCE_ROOT, path)}:${index + 1}: ${line.trim()}`]
            : [],
        ),
    );
    expect(misplaced).toEqual([]);
  });

  it("detects the patterns it bans", () => {
    expect(PALETTE_CLASS.test("hover:bg-stone-100")).toBe(true);
    expect(PALETTE_CLASS.test("text-muted-foreground")).toBe(false);
    expect(offScaleRadii("rounded rounded-xl rounded-[2px]")).toHaveLength(3);
    expect(offScaleRadii("rounded-full rounded-t-card")).toEqual([]);
  });
});
