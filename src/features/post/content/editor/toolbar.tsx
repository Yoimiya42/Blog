"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Check,
  Code,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Link2,
  List,
  ListOrdered,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { useId, useState, type MouseEvent, type ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { isSafeHref } from "../schema";
import type { HeadingLevel } from "../types";
import { CodeLanguageMenu } from "./code-language-menu";

const HEADING_LEVELS: readonly HeadingLevel[] = [2, 3, 4];

const HEADING_ICONS: Record<HeadingLevel, LucideIcon> = {
  2: Heading2,
  3: Heading3,
  4: Heading4,
};

// 44px targets: the same controls must work with touch, and no action may
// depend on hover.
const BUTTON_CLASS =
  "flex size-11 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:outline-none disabled:text-stone-300 disabled:hover:bg-transparent aria-pressed:bg-stone-900 aria-pressed:text-white [&_svg]:size-[18px]";

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
  // The tooltip only repeats the accessible name; nothing depends on hover.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
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
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
  const [codeMenuOpen, setCodeMenuOpen] = useState(false);

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
    // Sticks under the admin header so formatting stays in reach while writing.
    <TooltipProvider>
      <div className="sticky top-14 z-10 -mx-1 mb-4 border-b border-stone-100 bg-white/95 px-1 py-1 backdrop-blur">
        <div
          aria-label="Formatting"
          className="flex flex-wrap items-center gap-0.5"
          role="toolbar"
        >
          {HEADING_LEVELS.map((level) => {
            const Icon = HEADING_ICONS[level];
            return (
              <ToolbarButton
                key={level}
                label={`Heading ${level}`}
                onPress={() =>
                  editor.chain().focus().toggleHeading({ level }).run()
                }
                pressed={state.headingLevel === level}
              >
                <Icon />
              </ToolbarButton>
            );
          })}
          <span aria-hidden className="mx-1 h-5 w-px bg-stone-200" />
          <ToolbarButton
            disabled={!state.canBold}
            label="Bold"
            onPress={() => editor.chain().focus().toggleBold().run()}
            pressed={state.bold}
          >
            <Bold />
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
            <Link2 />
          </ToolbarButton>
          <span aria-hidden className="mx-1 h-5 w-px bg-stone-200" />
          <ToolbarButton
            label="Bulleted list"
            onPress={() => editor.chain().focus().toggleBulletList().run()}
            pressed={state.bulletList}
          >
            <List />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            onPress={() => editor.chain().focus().toggleOrderedList().run()}
            pressed={state.orderedList}
          >
            <ListOrdered />
          </ToolbarButton>
          {state.codeBlock ? (
            // Inside a code block the control turns it back into a paragraph.
            <ToolbarButton
              label="Code block"
              onPress={() => editor.chain().focus().toggleCodeBlock().run()}
              pressed
            >
              <Code />
            </ToolbarButton>
          ) : (
            // Otherwise it asks for the language first, so a new block never
            // needs a second step to set it.
            <Popover onOpenChange={setCodeMenuOpen} open={codeMenuOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      aria-label="Code block"
                      aria-pressed={false}
                      className={BUTTON_CLASS}
                      onMouseDown={keepEditorSelection}
                      type="button"
                    >
                      <Code />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Code block</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-44">
                <CodeLanguageMenu
                  onPick={(language) => {
                    editor.chain().focus().setCodeBlock({ language }).run();
                    setCodeMenuOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          )}
          {image ? (
            <ToolbarButton
              label="Insert image"
              onPress={image.onToggle}
              pressed={image.open}
            >
              <ImagePlus />
            </ToolbarButton>
          ) : null}
        </div>

        {linkDraft !== null ? (
          <div className="mt-1 border-t border-stone-100 py-1">
            <label className="sr-only" htmlFor={linkFieldId}>
              Link address
            </label>
            <div className="flex items-center gap-1">
              <input
                aria-describedby={
                  linkError ? `${linkFieldId}-error` : undefined
                }
                aria-invalid={linkError ? true : undefined}
                autoCapitalize="none"
                autoCorrect="off"
                // Opening the field is an explicit request to type an address.
                autoFocus
                className="h-9 min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-400 aria-invalid:border-red-700"
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
                <Check />
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
                  <Unlink />
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
    </TooltipProvider>
  );
}
