"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Link2,
  List,
  ListOrdered,
  TextQuote,
  type LucideIcon,
} from "lucide-react";
import { useEffect, type MouseEvent, type ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { HeadingLevel } from "../types";
import { CodeLanguageMenuContent } from "./code-language-menu";
import { LINK_PROMPT, type LinkPromptMeta } from "./link";
import {
  LinkPopover,
  readLinkTarget,
  readPastedTarget,
  useLinkPair,
} from "./link-popover";

const HEADING_LEVELS: readonly HeadingLevel[] = [2, 3, 4];

const HEADING_ICONS: Record<HeadingLevel, LucideIcon> = {
  2: Heading2,
  3: Heading3,
  4: Heading4,
};

// 44px targets: the same controls must work with touch, and no action may
// depend on hover.
const BUTTON_CLASS =
  "flex size-11 items-center justify-center rounded-control text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:text-faint disabled:hover:bg-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground [&_svg]:size-[18px]";

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
  /** Shown in the tooltip only; the accessible name stays `label`. */
  shortcut?: string;
  pressed?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}

function ToolbarButton({
  label,
  shortcut,
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
      <TooltipContent>
        {label}
        {shortcut ? (
          <kbd className="ml-2 font-sans opacity-70">{shortcut}</kbd>
        ) : null}
      </TooltipContent>
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
  const linkPair = useLinkPair(editor);
  const openLinkPair = linkPair.open;

  // Ctrl or Cmd+K and a pasted address ask for the pair through a
  // transaction, so the editor never needs a reference to this component.
  useEffect(() => {
    function onTransaction({
      transaction,
    }: {
      transaction: { getMeta: (key: string) => unknown };
    }) {
      const meta = transaction.getMeta(LINK_PROMPT) as
        LinkPromptMeta | undefined;
      if (!meta) return;
      openLinkPair(
        meta.pasted
          ? readPastedTarget(editor, meta.pasted)
          : readLinkTarget(editor),
      );
    }

    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor, openLinkPair]);

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
      blockquote: current.isActive("blockquote"),
      // Schema v1 keeps headings and images out of quotes, so wrapping them
      // is refused rather than producing content the save would reject.
      canQuote:
        current.isActive("blockquote") || current.can().toggleBlockquote(),
      codeBlock: current.isActive("codeBlock"),
      link: current.isActive("link"),
      // Anywhere a link mark is allowed; without a selection the pair
      // inserts its text.
      canLink: current.isActive("link") || current.can().setLink({ href: "/" }),
    }),
  });

  return (
    // Sticks under the admin header so formatting stays in reach while writing.
    <TooltipProvider>
      <div
        className="sticky top-(--admin-head) z-10 -mx-1 mb-4 border-b border-border bg-background/95 px-1 py-1 backdrop-blur"
        data-glass="inset"
      >
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
          <span aria-hidden className="mx-1 h-5 w-px bg-foreground/5" />
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
            onPress={() => openLinkPair(readLinkTarget(editor))}
            pressed={state.link}
            shortcut="Ctrl K"
          >
            <Link2 />
          </ToolbarButton>
          <span aria-hidden className="mx-1 h-5 w-px bg-foreground/5" />
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
          {/* Blocks set apart from prose: quote, code, image. */}
          <span aria-hidden className="mx-1 h-5 w-px bg-foreground/5" />
          <ToolbarButton
            disabled={!state.canQuote}
            label="Quote"
            onPress={() => editor.chain().focus().toggleBlockquote().run()}
            pressed={state.blockquote}
            shortcut="Ctrl Shift B"
          >
            <TextQuote />
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
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="Code block"
                      aria-pressed={false}
                      className={BUTTON_CLASS}
                      onMouseDown={keepEditorSelection}
                      type="button"
                    >
                      <Code />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Code block</TooltipContent>
              </Tooltip>
              <CodeLanguageMenuContent
                onPick={(language) =>
                  editor.chain().focus().setCodeBlock({ language }).run()
                }
              />
            </DropdownMenu>
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

        {image?.open ? image.panel : null}
      </div>
      <LinkPopover editor={editor} pair={linkPair} />
    </TooltipProvider>
  );
}
