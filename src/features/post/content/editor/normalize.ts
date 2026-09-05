/**
 * TipTap serialises every attribute it declares, including presentation
 * attributes and unset optionals. Schema v1 stores content only, so editor
 * output is reduced to the attributes the shared schema defines before it is
 * validated and saved.
 *
 * Unknown node and mark names are passed through untouched: hiding them here
 * would turn a misconfigured extension into silent data loss instead of a
 * validation error.
 */

/** Attributes schema v1 keeps, by node name. Any other attribute is dropped. */
const NODE_ATTRIBUTES: Record<string, readonly string[]> = {
  heading: ["level", "id"],
  orderedList: ["start"],
  image: ["mediaId", "alt", "caption"],
  codeBlock: ["language"],
};

/** Attributes schema v1 keeps, by mark name. */
const MARK_ATTRIBUTES: Record<string, readonly string[]> = {
  link: ["href"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickAttributes(
  allowed: readonly string[] | undefined,
  attrs: unknown,
): Record<string, unknown> | undefined {
  if (!allowed || !isRecord(attrs)) return undefined;

  const kept: Record<string, unknown> = {};
  for (const key of allowed) {
    const value = attrs[key];
    // An unset optional arrives as null; the schema expects it to be absent.
    if (value !== null && value !== undefined) kept[key] = value;
  }

  return Object.keys(kept).length > 0 ? kept : undefined;
}

function normalizeMark(mark: unknown): unknown {
  if (!isRecord(mark) || typeof mark.type !== "string") return mark;

  const attrs = pickAttributes(MARK_ATTRIBUTES[mark.type], mark.attrs);
  return attrs ? { type: mark.type, attrs } : { type: mark.type };
}

function normalizeNode(node: unknown): unknown {
  if (!isRecord(node) || typeof node.type !== "string") return node;

  const result: Record<string, unknown> = { type: node.type };

  const attrs = pickAttributes(NODE_ATTRIBUTES[node.type], node.attrs);
  if (attrs) result.attrs = attrs;

  if (typeof node.text === "string") result.text = node.text;
  if (Array.isArray(node.marks)) result.marks = node.marks.map(normalizeMark);
  if (Array.isArray(node.content)) {
    result.content = node.content.map(normalizeNode);
  }

  return result;
}

/**
 * Returns unknown on purpose: the caller must still run
 * validateArticleDocument. Normalisation is a convenience for the editor, not
 * a trust boundary.
 */
export function normalizeEditorDocument(input: unknown): unknown {
  return normalizeNode(input);
}
