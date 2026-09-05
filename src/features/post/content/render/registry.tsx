import { Fragment, type ReactNode } from "react";

import type {
  BlockNode,
  InlineNode,
  ListItemNode,
  Mark,
  TextNode,
} from "../types";
import { ArticleImage } from "./image";
import type { ArticleMediaMap } from "./media";

export type RenderableNode = BlockNode | ListItemNode;
export type RenderableNodeType = RenderableNode["type"];
export type RenderableNodeOfType<Type extends RenderableNodeType> = Extract<
  RenderableNode,
  { type: Type }
>;

export type RenderResult = ReactNode | Promise<ReactNode>;

export type RenderContext = {
  mediaById: ArticleMediaMap;
};

export type NodeRenderer<Type extends RenderableNodeType> = (
  node: RenderableNodeOfType<Type>,
  path: string,
  context: RenderContext,
) => RenderResult;

export type NodeRendererRegistry = {
  [Type in RenderableNodeType]: NodeRenderer<Type>;
};

export type MarkType = Mark["type"];
export type MarkOfType<Type extends MarkType> = Extract<Mark, { type: Type }>;

export type MarkRenderer<Type extends MarkType> = (
  mark: MarkOfType<Type>,
  content: ReactNode,
) => ReactNode;

export type MarkRendererRegistry = {
  [Type in MarkType]: MarkRenderer<Type>;
};

const EXTERNAL_HTTP_LINK_PATTERN = /^https?:\/\//i;

export const markRenderers = {
  bold: (_mark, content) => <strong>{content}</strong>,
  italic: (_mark, content) => <em>{content}</em>,
  strike: (_mark, content) => <s>{content}</s>,
  code: (_mark, content) => <code>{content}</code>,
  link: (mark, content) => {
    const external = EXTERNAL_HTTP_LINK_PATTERN.test(mark.attrs.href);

    return (
      <a
        href={mark.attrs.href}
        rel={external ? "noopener noreferrer" : undefined}
        target={external ? "_blank" : undefined}
      >
        {content}
      </a>
    );
  },
} satisfies MarkRendererRegistry;

function renderMark(mark: Mark, content: ReactNode): ReactNode {
  switch (mark.type) {
    case "bold":
      return markRenderers.bold(mark, content);
    case "italic":
      return markRenderers.italic(mark, content);
    case "strike":
      return markRenderers.strike(mark, content);
    case "code":
      return markRenderers.code(mark, content);
    case "link":
      return markRenderers.link(mark, content);
  }

  const exhaustiveMark: never = mark;
  return exhaustiveMark;
}

function renderTextNode(node: TextNode): ReactNode {
  return (
    node.marks?.reduce<ReactNode>(
      (content, mark) => renderMark(mark, content),
      node.text,
    ) ?? node.text
  );
}

export function renderInlineNodes(
  nodes: readonly InlineNode[] | undefined,
  parentPath: string,
): ReactNode[] {
  return (nodes ?? []).map((node, index) => {
    const path = `${parentPath}.inline.${index}`;

    switch (node.type) {
      case "text":
        return <Fragment key={path}>{renderTextNode(node)}</Fragment>;
      case "hardBreak":
        return <br key={path} />;
    }

    const exhaustiveNode: never = node;
    return exhaustiveNode;
  });
}

export const nodeRenderers = {
  paragraph: (node, path) => (
    <p key={path}>{renderInlineNodes(node.content, path)}</p>
  ),
  heading: (node, path) => {
    const content = renderInlineNodes(node.content, path);

    switch (node.attrs.level) {
      case 2:
        return (
          <h2 id={node.attrs.id} key={path}>
            {content}
          </h2>
        );
      case 3:
        return (
          <h3 id={node.attrs.id} key={path}>
            {content}
          </h3>
        );
      case 4:
        return (
          <h4 id={node.attrs.id} key={path}>
            {content}
          </h4>
        );
    }

    const exhaustiveLevel: never = node.attrs.level;
    return exhaustiveLevel;
  },
  blockquote: async (node, path, context) => (
    <blockquote key={path}>
      {await renderNodes(node.content, context, path)}
    </blockquote>
  ),
  bulletList: async (node, path, context) => (
    <ul key={path}>{await renderNodes(node.content, context, path)}</ul>
  ),
  orderedList: async (node, path, context) => (
    <ol key={path} start={node.attrs?.start}>
      {await renderNodes(node.content, context, path)}
    </ol>
  ),
  listItem: async (node, path, context) => (
    <li key={path}>{await renderNodes(node.content, context, path)}</li>
  ),
  horizontalRule: (_node, path) => <hr key={path} />,
  image: (node, path, context) => (
    <ArticleImage
      key={path}
      media={context.mediaById[node.attrs.mediaId]}
      node={node}
    />
  ),
  codeBlock: (node, path) => {
    const code = node.content?.map((textNode) => textNode.text).join("") ?? "";

    return (
      <pre data-language={node.attrs.language} key={path}>
        <code>{code}</code>
      </pre>
    );
  },
} satisfies NodeRendererRegistry;

async function renderNode(
  node: RenderableNode,
  path: string,
  context: RenderContext,
): Promise<ReactNode> {
  switch (node.type) {
    case "paragraph":
      return nodeRenderers.paragraph(node, path);
    case "heading":
      return nodeRenderers.heading(node, path);
    case "blockquote":
      return nodeRenderers.blockquote(node, path, context);
    case "bulletList":
      return nodeRenderers.bulletList(node, path, context);
    case "orderedList":
      return nodeRenderers.orderedList(node, path, context);
    case "listItem":
      return nodeRenderers.listItem(node, path, context);
    case "horizontalRule":
      return nodeRenderers.horizontalRule(node, path);
    case "image":
      return nodeRenderers.image(node, path, context);
    case "codeBlock":
      return nodeRenderers.codeBlock(node, path);
  }

  const unsupportedNode = node as unknown as { type?: unknown };
  console.error("Unsupported article node type.", unsupportedNode.type);

  return (
    <div key={path} role="note">
      Unsupported article content.
    </div>
  );
}

export async function renderNodes(
  nodes: readonly RenderableNode[],
  context: RenderContext,
  parentPath = "article",
): Promise<ReactNode[]> {
  return Promise.all(
    nodes.map((node, index) =>
      renderNode(node, `${parentPath}.${index}`, context),
    ),
  );
}
