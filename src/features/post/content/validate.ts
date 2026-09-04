import type { ArticleDocument } from "./types";
import { articleDocumentSchema } from "./schema";

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult =
  | {
      ok: true;
      document: ArticleDocument;
    }
  | {
      ok: false;
      issues: ValidationIssue[];
    };

type ContentNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: readonly ContentNode[];
};

function collectHeadingIds(node: ContentNode, ids: string[] = []): string[] {
  if (node.type === "heading" && typeof node.attrs?.id === "string") {
    ids.push(node.attrs.id);
  }
  for (const child of node.content ?? []) {
    collectHeadingIds(child, ids);
  }

  return ids;
}

export function validateArticleDocument(input: unknown): ValidationResult {
  const parsed = articleDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const ids = collectHeadingIds(parsed.data);
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  if (duplicates.size > 0) {
    return {
      ok: false,
      issues: [...duplicates].map((id) => ({
        path: "content",
        message: `duplicate heading id: ${id}`,
      })),
    };
  }
  return {
    ok: true,
    document: parsed.data,
  };
}

/**
 * Throwing variant for trusted callers such as fixtures and seeds. Request
 * handlers use validateArticleDocument so they can report issues per field.
 */
export function parseArticleDocument(input: unknown): ArticleDocument {
  const result = validateArticleDocument(input);
  if (result.ok) return result.document;

  const summary = result.issues
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join("; ");
  throw new Error(`invalid article document (${summary})`);
}
