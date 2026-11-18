"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { useId, useState, type MouseEvent, type ReactNode } from "react";

import { isSafeHref } from "../schema";
import { CODE_LANGUAGES, type HeadingLevel } from "../types";

const HEADING_LEVELS: readonly HeadingLevel[] = [2, 3, 4];

const LANGUAGE_LABELS: Record<(typeof CODE_LANGUAGES)[number], string> = {
  plaintext: "Plain text",
  python: "Python",
  typescript: "TypeScript",
  java: "Java",
  c: "C",
  go: "Go",
};

// 44px targets: the same controls must work with touch, and no action may
// depend on hover.
const BUTTON_CLASS =
  "flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-stone-700 hover:bg-stone-200 disabled:text-stone-400 disabled:hover:bg-transparent aria-pressed:bg-stone-900 aria-pressed:text-white";

/**
 * A press on a toolbar control must not move focus out of the editor: the
 * browser would drop the selection before the command runs. Text fields in
 * the toolbar are excluded so they can still take focus.
 */
function keepEditorSelection(event: MouseEvent) {
  event.preventDefault();
}

interface ToolbarButtonProps {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}

function ToolbarButton({
  label,
  pressed,
  disabled,
  onPress,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className={BUTTON_CLASS}
      disabled={disabled}
      onClick={onPress}
      onMouseDown={keepEditorSelection}
      // The toolbar sits inside the post form; the default type would submit.
      type="button"
    >
      {children}
    </button>
  );
}

/**
 * The image control. The editor owns the upload, so a paste or drop can show
 * progress in the same panel.
 */
export interface ToolbarImageControl {
  open: boolean;
  onToggle: () => void;
  panel: ReactNode;
}

export function EditorToolbar({
  editor,
  image,
}: {
  editor: Editor;
  /** Omitted when uploads are unavailable; the image control is hidden. */
  image?: ToolbarImageControl;
}) {
  const linkFieldId = useId();
  // Null while the link field is closed.
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      headingLevel:
        HEADING_LEVELS.find((level) =>
          current.isActive("heading", { level }),
        ) ?? null,
      bold: current.isActive("bold"),
      canBold: current.can().toggleBold(),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      codeBlock: current.isActive("codeBlock"),
      language: current.getAttributes("codeBlock").language as
        string | undefined,
      link: current.isActive("link"),
      href: (current.getAttributes("link").href as string | undefined) ?? "",
      // A link needs text to attach to: a selection, or an existing link.
      canLink:
        current.isActive("link") ||
        (!current.state.selection.empty &&
          current.can().setLink({ href: "/" })),
    }),
  });

  function closeLinkField() {
    setLinkDraft(null);
    setLinkError(null);
  }

  function applyLink() {
    if (linkDraft === null) return;
    const href = linkDraft.trim();

    if (href === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      closeLinkField();
      return;
    }
    // The same predicate the server validates with.
    if (!isSafeHref(href)) {
      setLinkError("Use a relative, https, http, or mailto address.");
      return;
    }

    // focus() restores the selection the editor held before the field opened.
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    closeLinkField();
  }

  return (
    <div className="mb-2 rounded-xl border border-stone-300 bg-stone-50 p-1">
      <div
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-1"
        role="toolbar"
      >
        {HEADING_LEVELS.map((level) => (
          <ToolbarButton
            key={level}
            label={`Heading ${level}`}
            onPress={() =>
              editor.chain().focus().toggleHeading({ level }).run()
            }
            pressed={state.headingLevel === level}
          >
            H{level}
          </ToolbarButton>
        ))}
        <ToolbarButton
          disabled={!state.canBold}
          label="Bold"
          onPress={() => editor.chain().focus().toggleBold().run()}
          pressed={state.bold}
        >
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton
          disabled={!state.canLink}
          label="Link"
          onPress={() => {
            if (linkDraft === null) setLinkDraft(state.href);
            else closeLinkField();
          }}
          pressed={state.link}
        >
          Link
        </ToolbarButton>
        <ToolbarButton
          label="Bulleted list"
          onPress={() => editor.chain().focus().toggleBulletList().run()}
          pressed={state.bulletList}
        >
          List
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          onPress={() => editor.chain().focus().toggleOrderedList().run()}
          pressed={state.orderedList}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          onPress={() => editor.chain().focus().toggleCodeBlock().run()}
          pressed={state.codeBlock}
        >
          Code
        </ToolbarButton>
        {image ? (
          <ToolbarButton
            label="Insert image"
            onPress={image.onToggle}
            pressed={image.open}
          >
            Image
          </ToolbarButton>
        ) : null}
        {state.codeBlock ? (
          <select
            aria-label="Code language"
            className="min-h-11 rounded-lg border border-stone-300 bg-white px-2 text-sm"
            onChange={(event) =>
              editor
                .chain()
                .focus()
                .updateAttributes("codeBlock", { language: event.target.value })
                .run()
            }
            value={state.language ?? "plaintext"}
          >
            {CODE_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {LANGUAGE_LABELS[language]}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {linkDraft !== null ? (
        <div className="mt-1 border-t border-stone-200 p-2">
          <label className="block text-sm font-medium" htmlFor={linkFieldId}>
            Link address
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              aria-describedby={linkError ? `${linkFieldId}-error` : undefined}
              aria-invalid={linkError ? true : undefined}
              autoCapitalize="none"
              autoCorrect="off"
              // Opening the field is an explicit request to type an address.
              autoFocus
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-900 aria-invalid:border-red-700"
              id={linkFieldId}
              onChange={(event) => {
                setLinkDraft(event.target.value);
                setLinkError(null);
              }}
              onKeyDown={(event) => {
                // Enter would otherwise submit the surrounding post form.
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                } else if (event.key === "Escape") {
                  closeLinkField();
                  editor.commands.focus();
                }
              }}
              placeholder="https://"
              spellCheck={false}
              type="text"
              value={linkDraft}
            />
            <ToolbarButton label="Apply link" onPress={applyLink}>
              Apply
            </ToolbarButton>
            {state.link ? (
              <ToolbarButton
                label="Remove link"
                onPress={() => {
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .unsetLink()
                    .run();
                  closeLinkField();
                }}
              >
                Remove
              </ToolbarButton>
            ) : null}
          </div>
          {linkError ? (
            <p
              className="mt-2 text-sm text-red-700"
              id={`${linkFieldId}-error`}
              role="alert"
            >
              {linkError}
            </p>
          ) : null}
        </div>
      ) : null}

      {image?.open ? image.panel : null}
    </div>
  );
}
