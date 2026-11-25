"use client";

import { ImagePlus, LoaderCircle, Send, X } from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { MOMENT_BODY_MAX_LENGTH, MOMENT_MAX_IMAGES } from "../schema";
import {
  createMomentAction,
  updateMomentAction,
  type MomentFormState,
} from "../server/moment.actions";
import {
  ACCEPTED_IMAGE_TYPES,
  uploadMomentImage,
  type MomentUploadConfig,
} from "./upload-image";

/** An image already stored, as the edit page passes it in. */
export interface ComposerImage {
  id: string;
  thumbnailUrl: string;
}

/** Absent for a new moment. */
export interface ComposerMoment {
  id: string;
  version: string;
  body: string;
  images: ComposerImage[];
}

type Slot =
  | { key: number; state: "uploading"; preview: string }
  | { key: number; state: "ready"; preview: string; mediaId: string };

const INITIAL_STATE: MomentFormState = { fieldErrors: {} };
// The counter appears only near the limit, to keep the composer quiet.
const COUNTER_THRESHOLD = MOMENT_BODY_MAX_LENGTH - 200;

let nextKey = 0;

function toSlots(images: ComposerImage[]): Slot[] {
  return images.map((image) => ({
    key: nextKey++,
    state: "ready",
    preview: image.thumbnailUrl,
    mediaId: image.id,
  }));
}

/**
 * Quick moment composer (FR-ADMIN-11, ADR-0036): a textarea and images, no
 * title and no draft. Images upload as soon as they are picked, so Post only
 * sends the text and the ordered media ids.
 */
export function MomentComposer({
  upload,
  moment,
}: {
  upload: MomentUploadConfig;
  moment?: ComposerMoment;
}) {
  const action = moment
    ? updateMomentAction.bind(null, moment.id)
    : createMomentAction;
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [body, setBody] = useState(moment?.body ?? "");
  const [slots, setSlots] = useState<Slot[]>(() =>
    toSlots(moment?.images ?? []),
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const posted = useRef(state.posted);

  // A successful post resets the composer for the next moment.
  useEffect(() => {
    if (state.posted === undefined || state.posted === posted.current) return;
    posted.current = state.posted;
    setBody("");
    setSlots((current) => {
      current.forEach(revokePreview);
      return [];
    });
    toast("Moment posted.");
  }, [state.posted]);

  useEffect(() => {
    if (state.formError) toast(state.formError, "error");
  }, [state]);

  const uploading = slots.some((slot) => slot.state === "uploading");
  const ready = slots.flatMap((slot) =>
    slot.state === "ready" ? [slot.mediaId] : [],
  );
  const empty = body.trim() === "" && slots.length === 0;
  const remaining = MOMENT_MAX_IMAGES - slots.length;
  const length = [...body].length;

  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > remaining) {
      toast(`Up to ${MOMENT_MAX_IMAGES} images.`, "error");
    }

    await Promise.all(
      files.slice(0, Math.max(0, remaining)).map(async (file) => {
        const key = nextKey++;
        const preview = URL.createObjectURL(file);
        setSlots((current) => [
          ...current,
          { key, state: "uploading", preview },
        ]);

        const result = await uploadMomentImage(upload, file);
        setSlots((current) =>
          result.ok
            ? current.map((slot) =>
                slot.key === key
                  ? { ...slot, state: "ready", mediaId: result.mediaId }
                  : slot,
              )
            : current.filter((slot) => slot.key !== key),
        );
        if (!result.ok) {
          URL.revokeObjectURL(preview);
          toast(result.message, "error");
        }
      }),
    );
  }

  function removeSlot(key: number) {
    setSlots((current) =>
      current.filter((slot) => {
        if (slot.key !== key) return true;
        revokePreview(slot);
        return false;
      }),
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl or Cmd+Enter posts, as in most chat and status composers.
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.current?.requestSubmit();
    }
  }

  const error = state.fieldErrors.body ?? state.fieldErrors.mediaIds;

  return (
    <TooltipProvider>
      <form
        action={formAction}
        className="rounded-card border border-border bg-card p-3 shadow-sm"
        ref={form}
      >
        <input name="mediaIds" type="hidden" value={JSON.stringify(ready)} />
        {moment ? (
          <input name="version" type="hidden" value={moment.version} />
        ) : null}

        <label className="sr-only" htmlFor="moment-body">
          Moment
        </label>
        <textarea
          aria-describedby={error ? "moment-error" : undefined}
          aria-invalid={error ? true : undefined}
          autoFocus={!moment}
          className="block min-h-28 w-full resize-y bg-transparent px-1 py-1 text-base leading-relaxed outline-none placeholder:text-muted-foreground"
          id="moment-body"
          name="body"
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="What's happening?"
          value={body}
        />

        {slots.length > 0 ? (
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((slot, at) => (
              <li className="relative aspect-square" key={slot.key}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview or a fixed-width variant. */}
                <img
                  alt=""
                  className="size-full rounded-control border border-border object-cover"
                  src={slot.preview}
                />
                {slot.state === "uploading" ? (
                  <span className="absolute inset-0 grid place-items-center rounded-control bg-background/60">
                    <LoaderCircle
                      aria-label="Uploading"
                      className="size-5 animate-spin"
                    />
                  </span>
                ) : null}
                <Button
                  aria-label={`Remove image ${at + 1}`}
                  className="absolute top-1 right-1 size-7 rounded-full bg-background/80"
                  onClick={() => removeSlot(slot.key)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p className="mt-2 text-sm text-destructive" id="moment-error">
            {error}
          </p>
        ) : null}

        <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
          <input
            accept={ACCEPTED_IMAGE_TYPES}
            className="sr-only"
            multiple
            onChange={addFiles}
            ref={fileInput}
            tabIndex={-1}
            type="file"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Add images"
                className="size-11"
                disabled={remaining <= 0}
                onClick={() => fileInput.current?.click()}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ImagePlus className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Add images ({slots.length}/{MOMENT_MAX_IMAGES})
            </TooltipContent>
          </Tooltip>

          {length > COUNTER_THRESHOLD ? (
            <span
              className={
                length > MOMENT_BODY_MAX_LENGTH
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {MOMENT_BODY_MAX_LENGTH - length}
            </span>
          ) : null}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={moment ? "Save" : "Post"}
                className="ml-auto"
                disabled={
                  pending ||
                  uploading ||
                  empty ||
                  length > MOMENT_BODY_MAX_LENGTH
                }
                type="submit"
              >
                {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
                {moment ? "Save" : "Post"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ctrl+Enter</TooltipContent>
          </Tooltip>
        </div>
      </form>
    </TooltipProvider>
  );
}

function revokePreview(slot: Slot) {
  if (slot.preview.startsWith("blob:")) URL.revokeObjectURL(slot.preview);
}
