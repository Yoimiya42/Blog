"use client";

import { getMarkRange, type Editor } from "@tiptap/core";
import { Check, Unlink } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

import { isSafeHref } from "../schema";
import { normalizeLinkHref } from "./link";

/** The text range the pair edits, read when it opens. */
export interface LinkTarget {
  from: number;
  to: number;
  /** Current text of the range. */
  text: string;
  href: string;
  /** The range already carries a link, so Remove applies. */
  isLink: boolean;
  /** Opens with the text field empty: a pasted address keeps its text. */
  emptyText: boolean;
}

/** The pair's range for the current selection (FR-ADMIN-24). */
export function readLinkTarget(editor: Editor): LinkTarget {
  const { state } = editor;
  const { selection } = state;
  const link = state.schema.marks.link;

  if (link && editor.isActive("link")) {
    const range = getMarkRange(selection.$from, link);
    if (range) {
      return {
        ...range,
        text: state.doc.textBetween(range.from, range.to),
        href: (editor.getAttributes("link").href as string | undefined) ?? "",
        isLink: true,
        emptyText: false,
      };
    }
  }

  return {
    from: selection.from,
    to: selection.to,
    text: state.doc.textBetween(selection.from, selection.to, " "),
    href: "",
    isLink: false,
    emptyText: false,
  };
}

/** A pasted link: the pair opens on its range with the text empty. */
export function readPastedTarget(
  editor: Editor,
  range: { from: number; to: number },
): LinkTarget {
  const { doc } = editor.state;
  const to = Math.min(range.to, doc.content.size);

  return {
    from: range.from,
    to,
    text: doc.textBetween(range.from, to),
    href: (editor.getAttributes("link").href as string | undefined) ?? "",
    isLink: true,
    emptyText: true,
  };
}

/**
 * Writes the pair back. Empty text keeps the address as the text. Unchanged
 * text only gains the link, so its other marks survive.
 */
export function applyLinkTarget(
  editor: Editor,
  target: LinkTarget,
  text: string,
  href: string,
): void {
  const label = text.trim() === "" ? target.text || href : text;
  const chain = editor.chain().focus();

  if (label === target.text && target.from !== target.to) {
    chain
      .setTextSelection({ from: target.from, to: target.to })
      .setLink({ href })
      .setTextSelection(target.to);
  } else {
    chain.insertContentAt(
      { from: target.from, to: target.to },
      { type: "text", text: label, marks: [{ type: "link", attrs: { href } }] },
    );
  }
  // Typing on after the link must not extend it.
  chain.unsetMark("link").run();
}

const FIELD_CLASS =
  "h-9 min-w-0 rounded-control border border-border bg-background px-2.5 text-sm outline-none focus:border-faint aria-invalid:border-destructive";
const BRACKET_CLASS = "font-mono text-sm text-faint select-none";
const ICON_BUTTON_CLASS =
  "flex size-9 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-4";

/** The rectangle of a range, for anchoring; a range across lines uses its start. */
function rangeRect(editor: Editor, target: LinkTarget | null): DOMRect {
  if (!target || editor.isDestroyed) return new DOMRect();
  const { view } = editor;
  const size = view.state.doc.content.size;
  const start = view.coordsAtPos(Math.min(target.from, size));
  const end = view.coordsAtPos(Math.min(target.to, size), -1);
  const right = end.top === start.top ? end.right : start.right;

  return new DOMRect(
    start.left,
    start.top,
    Math.max(right - start.left, 1),
    start.bottom - start.top,
  );
}

/** Open state of the link pair. `open` and `close` are stable. */
export function useLinkPair(editor: Editor) {
  const [state, setState] = useState<{
    target: LinkTarget;
    openId: number;
  } | null>(null);
  // Read by Floating UI on every update, so the pair follows scrolling.
  // Written only in the callbacks below, never during render.
  const current = useRef<LinkTarget | null>(null);
  const anchor = useRef({
    getBoundingClientRect: () => rangeRect(editor, current.current),
  });
  const openCount = useRef(0);

  const open = useCallback((target: LinkTarget) => {
    current.current = target;
    openCount.current += 1;
    setState({ target, openId: openCount.current });
  }, []);
  const close = useCallback(() => {
    current.current = null;
    setState(null);
  }, []);

  return { ...(state ?? { target: null, openId: 0 }), anchor, open, close };
}

export type LinkPair = ReturnType<typeof useLinkPair>;

/**
 * The link pair, shaped like Markdown's `[text](address)` and anchored at the
 * text it edits (FR-ADMIN-24).
 */
export function LinkPopover({
  editor,
  pair,
}: {
  editor: Editor;
  pair: LinkPair;
}) {
  const { target, close } = pair;
  const textRef = useRef<HTMLInputElement>(null);
  const hrefRef = useRef<HTMLInputElement>(null);

  return (
    <Popover
      onOpenChange={(next) => {
        if (!next) close();
      }}
      open={target !== null}
    >
      <PopoverAnchor virtualRef={pair.anchor} />
      <PopoverContent
        align="start"
        className="w-[min(30rem,calc(100vw-2rem))] p-2"
        onCloseAutoFocus={(event) => {
          // Back to the text, not to the toolbar button.
          event.preventDefault();
          // Radix runs this on a timer, possibly after the editor is gone.
          if (!editor.isDestroyed) editor.commands.focus();
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          // The first empty field; the address when both hold a value.
          const field =
            target && (target.emptyText || target.text === "")
              ? textRef.current
              : hrefRef.current;
          field?.focus();
          field?.select();
        }}
      >
        {target ? (
          <LinkPairFields
            editor={editor}
            hrefRef={hrefRef}
            // A fresh form per opening, so the fields start from the target.
            key={pair.openId}
            onDone={close}
            target={target}
            textRef={textRef}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function LinkPairFields({
  editor,
  target,
  onDone,
  textRef,
  hrefRef,
}: {
  editor: Editor;
  target: LinkTarget;
  onDone: () => void;
  textRef: React.RefObject<HTMLInputElement | null>;
  hrefRef: React.RefObject<HTMLInputElement | null>;
}) {
  const id = useId();
  const [text, setText] = useState(target.emptyText ? "" : target.text);
  const [href, setHref] = useState(target.href);
  const [error, setError] = useState<string | null>(null);

  function apply() {
    const next = normalizeLinkHref(href);
    if (next === "") {
      if (target.isLink) {
        remove();
        return;
      }
      setError("Enter an address.");
      hrefRef.current?.focus();
      return;
    }
    // The same predicate the server validates with.
    if (!isSafeHref(next)) {
      setError("Use https, http, mailto, or a path");
      hrefRef.current?.focus();
      return;
    }

    applyLinkTarget(editor, target, text, next);
    onDone();
  }

  function remove() {
    editor
      .chain()
      .focus()
      .setTextSelection({ from: target.from, to: target.to })
      .unsetLink()
      .setTextSelection(target.to)
      .run();
    onDone();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // Composition keys belong to the input method, not to the pair.
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    apply();
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <span aria-hidden className={BRACKET_CLASS}>
          [
        </span>
        <input
          aria-label="Link text"
          className={`${FIELD_CLASS} flex-[2]`}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          // A pasted address shows through until the owner names it.
          placeholder={target.emptyText ? target.text : "Text"}
          ref={textRef}
          type="text"
          value={text}
        />
        <span aria-hidden className={BRACKET_CLASS}>
          ](
        </span>
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          aria-label="Link address"
          autoCapitalize="none"
          autoCorrect="off"
          className={`${FIELD_CLASS} flex-[3]`}
          onChange={(event) => {
            setHref(event.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="https://"
          ref={hrefRef}
          spellCheck={false}
          type="text"
          value={href}
        />
        <span aria-hidden className={BRACKET_CLASS}>
          )
        </span>
        <button
          aria-label="Apply link"
          className={ICON_BUTTON_CLASS}
          onClick={apply}
          title="Apply (Enter)"
          type="button"
        >
          <Check />
        </button>
        {target.isLink ? (
          <button
            aria-label="Remove link"
            className={ICON_BUTTON_CLASS}
            onClick={remove}
            title="Remove link"
            type="button"
          >
            <Unlink />
          </button>
        ) : null}
      </div>
      {error ? (
        <p
          className="mt-1.5 px-1 text-xs text-destructive"
          id={`${id}-error`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </>
  );
}
