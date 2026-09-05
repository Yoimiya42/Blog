import type { CSSProperties } from "react";
import type { ThemedToken } from "shiki/core";
import type { CodeBlockNode } from "../types";
import { highlightCode } from "./highlight";
import { CopyCodeButton } from "./copy-code-button";

function extractCode(node: CodeBlockNode): string {
  return node.content?.map((textNode) => textNode.text).join("") ?? "";
}

const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;
const FONT_STYLE_UNDERLINE = 4;

function tokenStyle(token: ThemedToken): CSSProperties {
  const fontStyle = Math.max(token.fontStyle ?? 0, 0);

  return {
    color: token.color,
    fontStyle: fontStyle & FONT_STYLE_ITALIC ? "italic" : undefined,
    fontWeight: fontStyle & FONT_STYLE_BOLD ? "bold" : undefined,
    textDecoration: fontStyle & FONT_STYLE_UNDERLINE ? "underline" : undefined,
  };
}

function renderHighlightedLines(lines: readonly (readonly ThemedToken[])[]) {
  return lines.map((line, lineIndex) => (
    <span data-code-line="" key={lineIndex}>
      {line.map((token, tokenIndex) => (
        <span key={`${lineIndex}.${tokenIndex}`} style={tokenStyle(token)}>
          {token.content}
        </span>
      ))}
      {lineIndex < lines.length - 1 ? "\n" : null}
    </span>
  ));
}

type CodeBlockProps = {
  node: CodeBlockNode;
};

export async function CodeBlock({ node }: CodeBlockProps) {
  const code = extractCode(node);
  const highlighted = await highlightCode(code, node.attrs.language);

  return (
    <figure data-code-block="">
      <figcaption>
        <span>{node.attrs.language}</span>
        <CopyCodeButton code={code} />
      </figcaption>

      <pre
        style={{
          backgroundColor: highlighted.bg,
          color: highlighted.fg,
        }}
      >
        <code>{renderHighlightedLines(highlighted.tokens)}</code>
      </pre>
    </figure>
  );
}
