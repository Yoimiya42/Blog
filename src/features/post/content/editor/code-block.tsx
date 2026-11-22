"use client";

import { CodeBlock } from "@tiptap/extension-code-block";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { CodeLanguageMenu } from "./code-language-menu";
import { codeLanguageLabel } from "../code-languages";
import { LanguageIcon } from "../language-icons";

const COPY_FEEDBACK_MS = 2000;

function CodeBlockView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const language = node.attrs.language as string;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    // Same `[data-code-block]` card as the rendered article (globals.css).
    <NodeViewWrapper data-code-block="">
      {/* The header is chrome, not document content. */}
      <div contentEditable={false} data-code-header="">
        <Popover onOpenChange={setMenuOpen} open={menuOpen}>
          <PopoverTrigger asChild>
            <button
              aria-label={`Code language: ${codeLanguageLabel(language)}`}
              className="-ml-1.5 flex h-8 items-center gap-2 rounded-md px-1.5 hover:bg-white/10 disabled:pointer-events-none"
              disabled={!editor.isEditable}
              type="button"
            >
              <LanguageIcon
                className="text-stone-300"
                language={language}
                mono
              />
              {codeLanguageLabel(language)}
              <ChevronDown aria-hidden className="size-3.5 text-stone-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44">
            <CodeLanguageMenu
              current={language}
              onPick={(next) => {
                updateAttributes({ language: next });
                setMenuOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <button
          aria-label={copied ? "Copied" : "Copy code"}
          aria-live="polite"
          data-code-copy=""
          onClick={() => void copy()}
          title={copied ? "Copied" : "Copy code"}
          type="button"
        >
          {copied ? <Check /> : <Copy />}
        </button>
      </div>

      <pre>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

/**
 * Code block with an editing header: language picker and copy. The stored
 * node is unchanged; schema v1 still requires a language, so the default is
 * `plaintext` (the bundled default is null).
 */
export const ArticleCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({ defaultLanguage: "plaintext" });
