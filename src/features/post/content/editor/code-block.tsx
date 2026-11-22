"use client";

import { CodeBlock } from "@tiptap/extension-code-block";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { Check, ChevronDown, Code, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { CodeLanguageMenu } from "./code-language-menu";
import { codeLanguageLabel } from "./code-languages";

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
    <NodeViewWrapper className="my-5 overflow-hidden rounded-2xl bg-[#2a2a2a] text-stone-100 ring-1 ring-white/5">
      {/* The header is chrome, not document content. */}
      <div
        className="flex items-center gap-2 px-4 pt-3 select-none"
        contentEditable={false}
      >
        <Code aria-hidden className="size-4 text-stone-300" />
        <Popover onOpenChange={setMenuOpen} open={menuOpen}>
          <PopoverTrigger asChild>
            <button
              aria-label={`Code language: ${codeLanguageLabel(language)}`}
              className="flex h-8 items-center gap-1 rounded-md px-1.5 text-sm font-semibold text-stone-100 hover:bg-white/10 disabled:pointer-events-none"
              disabled={!editor.isEditable}
              type="button"
            >
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
          className="ml-auto flex size-8 items-center justify-center rounded-md text-stone-300 hover:bg-white/10 hover:text-white"
          onClick={() => void copy()}
          title={copied ? "Copied" : "Copy code"}
          type="button"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>

      {/* `!` beats the shared prose rule for <pre>, which styles the public block. */}
      <pre className="m-0! rounded-none! bg-transparent! px-5! pt-2! pb-5! font-mono text-sm leading-relaxed">
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
