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

function collectMediaIds(node: ContentNode, ids: string[] = []): string[] {
  if (node.type === "image" && typeof node.attrs?.mediaId === "string") {
    ids.push(node.attrs.mediaId);
  }
  for (const child of node.content ?? []) {
    collectMediaIds(child, ids);
  }

  return ids;
}

/** Distinct media ids the document references, in document order. */
export function collectMediaReferences(document: ArticleDocument): string[] {
  return [...new Set(collectMediaIds(document))];
}

/** Implemented by the media module once Issue #14 owns the Media table. */
export type MediaReferenceResolver = {
  findExisting(mediaIds: string[]): Promise<Set<string>>;
};

/**
 * Separate from validateArticleDocument so shape validation stays synchronous
 * and database-free. Only this step needs I/O, and only callers that persist a
 * document need to run it.
 */
export async function validateMediaReferences(
  document: ArticleDocument,
  resolver: MediaReferenceResolver,
): Promise<ValidationResult> {
  const referenced = collectMediaReferences(document);
  if (referenced.length === 0) return { ok: true, document };

  const existing = await resolver.findExisting(referenced);
  const missing = referenced.filter((mediaId) => !existing.has(mediaId));
  if (missing.length === 0) return { ok: true, document };

  return {
    ok: false,
    issues: missing.map((mediaId) => ({
      path: "content",
      message: `unknown media reference: ${mediaId}`,
    })),
  };
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
