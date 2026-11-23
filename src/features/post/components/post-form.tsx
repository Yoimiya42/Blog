"use client";

import dynamic from "next/dynamic";
import {
  AlignLeft,
  ChevronRight,
  Link2,
  Lock,
  Tag as TagIcon,
  type LucideIcon,
} from "lucide-react";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

import { deriveArticleStats } from "../content/derive";
import type { ImageUploadConfig } from "../content/image-upload";
import type { ArticleDocument } from "../content/types";
import {
  POST_SLUG_MAX_LENGTH,
  POST_SUMMARY_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  type PostStatus,
} from "../schema";
import {
  autosavePostAction,
  savePostAction,
  type PostFormState,
  type PostFormValues,
} from "../server/post.actions";
import { createDraftAutosave, type AutosaveStatus } from "./draft-autosave";
import { PostEditorHeader } from "./post-editor-header";
import { SubmitButton } from "./submit-button";
import { TagPicker } from "./tag-picker";
import { UnsavedChangesGuard } from "./unsaved-guard";

const AUTOSAVE_INTERVAL_MS = 10_000;
const STATS_DELAY_MS = 400;

/** Fields compared against the last save; content is tracked by autosave. */
const TRACKED_FIELDS = ["title", "slug", "summary", "tags"] as const;

/**
 * Mirrors `TAGS_PER_POST_MAX` in the tag module, checked by a unit test. The
 * tag index re-exports its repository, so this client module cannot import it.
 */
export const TAG_LIMIT_HINT = 10;

interface PostFormProps {
  /** Null creates a post. */
  postId: string | null;
  initialValues: PostFormValues;
  /**
   * The validated stored document. Null when the stored content is not valid
   * schema v1: the editor stays closed and a save keeps the stored content.
   */
  initialDocument: ArticleDocument | null;
  /** Null for a post that does not exist yet. */
  status: PostStatus | null;
  /** Version token of the stored post. Null for a new post. */
  version: string | null;
  /** True once the post has been published; the slug can no longer change. */
  slugFrozen: boolean;
  /** Image upload endpoint, from the media module through the page. */
  imageUpload?: ImageUploadConfig;
  /** Display URLs of the images in `initialDocument`, by media id. */
  initialMediaUrls?: Readonly<Record<string, string>>;
  /** Media ids in `initialDocument` that were deleted from the library. */
  deletedMediaIds?: readonly string[];
  /** Every tag name in the library, offered by the tag picker. */
  tagSuggestions?: readonly string[];
  /** Page actions for the header row, such as Delete. */
  headerActions?: ReactNode;
  /** Opens with the title selected, for a blank draft (ADR-0030). */
  focusTitle?: boolean;
}

// A dynamic import keeps the TipTap runtime out of the statically imported
// module graph, so nothing that imports the post module bundles the editor.
// Until the chunk loads no content field exists, and a save sends none.
const ArticleEditor = dynamic(
  () => import("../content/editor/article-editor"),
  {
    ssr: false,
    // The editor's shape, so nothing jumps when it arrives.
    loading: () => (
      <div
        aria-busy="true"
        aria-label="Loading editor"
        className="min-h-[60vh] space-y-3 pt-14"
        role="status"
      >
        <div className="h-4 w-full motion-safe:animate-pulse rounded-mark bg-foreground/5" />
        <div className="h-4 w-11/12 motion-safe:animate-pulse rounded-mark bg-foreground/5" />
        <div className="h-4 w-4/5 motion-safe:animate-pulse rounded-mark bg-foreground/5" />
      </div>
    ),
  },
);

const INPUT_CLASS =
  "mt-1.5 w-full rounded-control border border-border bg-background px-3 py-2 text-sm outline-none focus:border-faint aria-invalid:border-destructive";

/** Grows with its content; no scrollbar inside a one-line field. */
function fitHeight(element: HTMLTextAreaElement | null): void {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function readStats(content: string) {
  try {
    return deriveArticleStats(JSON.parse(content) as ArticleDocument);
  } catch {
    return null;
  }
}

export function PostForm({
  postId,
  initialValues,
  initialDocument,
  status,
  version,
  slugFrozen,
  imageUpload,
  initialMediaUrls,
  deletedMediaIds,
  tagSuggestions = [],
  headerActions,
  focusTitle = false,
}: PostFormProps) {
  const initialState: PostFormState = {
    values: initialValues,
    fieldErrors: {},
  };

  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>({
    kind: "idle",
  });
  // Created once: it owns the version token for the life of the form.
  const [autosave] = useState(() =>
    createDraftAutosave({
      initialContent: initialDocument ? JSON.stringify(initialDocument) : "",
      initialVersion: version ?? "",
      save: (current, content) =>
        autosavePostAction(postId ?? "", current, content),
      onStatus: setAutosaveStatus,
    }),
  );

  // Only an existing draft autosaves. A new post has no row to write to, and
  // a published post would change the public version without a decision.
  const autosaveEnabled =
    postId !== null && status === "DRAFT" && initialDocument !== null;

  useEffect(() => {
    autosave.setEnabled(autosaveEnabled);
  }, [autosave, autosaveEnabled]);

  // Publishing and unpublishing end in a fresh render with a new token.
  useEffect(() => {
    if (version !== null) autosave.syncVersion(version);
  }, [autosave, version]);

  useEffect(() => {
    if (!autosaveEnabled) return;

    const timer = setInterval(
      () => void autosave.flush(),
      AUTOSAVE_INTERVAL_MS,
    );

    return () => clearInterval(timer);
  }, [autosave, autosaveEnabled]);

  const saveOnBlur = useCallback(() => void autosave.flush(), [autosave]);

  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const saving = useRef(false);
  const savedFields = useRef<string | null>(null);

  const readFields = useCallback(() => {
    const form = formRef.current;
    if (!form) return null;
    const data = new FormData(form);
    return JSON.stringify(TRACKED_FIELDS.map((field) => data.get(field)));
  }, []);

  // A fresh server render (mount, publish, unpublish) is the saved baseline.
  useEffect(() => {
    savedFields.current = readFields();
  }, [readFields, version]);

  const isDirty = useCallback(
    () => readFields() !== savedFields.current || autosave.hasUnsavedContent(),
    [autosave, readFields],
  );

  // The header shows the dirty state, so it is mirrored into React state.
  // Checked after the current task: hidden inputs (tags, content) update on
  // render. A timeout, not a frame: frames pause in background tabs.
  const [dirty, setDirty] = useState(false);
  const checkDirty = useCallback(() => {
    setTimeout(() => setDirty(isDirty()), 0);
  }, [isDirty]);

  // Word count follows the document, a little behind the typing.
  const [stats, setStats] = useState(() =>
    initialDocument ? deriveArticleStats(initialDocument) : null,
  );
  const statsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(statsTimer.current), []);

  const onContentChange = useCallback(
    (content: string) => {
      autosave.change(content);
      checkDirty();
      clearTimeout(statsTimer.current);
      statsTimer.current = setTimeout(
        () => setStats(readStats(content)),
        STATS_DELAY_MS,
      );
    },
    [autosave, checkDirty],
  );

  // A save in progress, manual or automatic, for the header indicator.
  const [manualSaving, setManualSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  useEffect(() => {
    if (autosaveStatus.kind === "saved") {
      // The autosave callback is outside React; mirror it once per change.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedAt(autosaveStatus.at);
      checkDirty();
    }
  }, [autosaveStatus, checkDirty]);

  // Ctrl or Cmd+S saves from anywhere on the page (FR-ADMIN-18).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() !== "s" ||
        !(event.metaKey || event.ctrlKey) ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      // No submitter: a plain save, never publish.
      if (!saving.current) formRef.current?.requestSubmit();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // A blank draft opens with its placeholder title selected, so typing
  // replaces it (ADR-0030).
  useEffect(() => {
    const title = titleRef.current;
    fitHeight(title);
    if (focusTitle && title) {
      title.focus();
      title.select();
    }
  }, [focusTitle]);

  const [state, formAction] = useActionState(
    (previous: PostFormState, formData: FormData) => {
      saving.current = true;
      setManualSaving(true);
      // Queued behind any autosave in flight, and sent with the token that
      // save produced.
      return autosave
        .runExclusive(async (current, latestContent) => {
          if (current !== "") formData.set("version", current);
          // The form data was captured at submit. The editor stays editable
          // while this waits, and a queued autosave may have stored a newer
          // document since; send that one, not the snapshot.
          if (formData.has("content")) formData.set("content", latestContent);

          // A redirecting action may settle without a state; keep the last one.
          const next = (await savePostAction(postId, previous, formData)) as
            PostFormState | undefined;
          if (next?.version) {
            const content = formData.get("content");
            autosave.markSaved(
              next.version,
              typeof content === "string" ? content : undefined,
            );
          }

          return next ?? previous;
        })
        .finally(() => {
          saving.current = false;
          setManualSaving(false);
        });
    },
    initialState,
  );
  const { values, fieldErrors } = state;

  // Leaving the editor saves through the form's own path, so a failure shows
  // its field errors here (FR-ADMIN-18). Resolved by the next new state.
  const leaveSave = useRef<{
    from: PostFormState;
    resolve: (saved: boolean) => void;
  } | null>(null);
  const saveBeforeLeaving = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        const form = formRef.current;
        if (!form) {
          resolve(false);
          return;
        }
        leaveSave.current?.resolve(false);
        leaveSave.current = { from: state, resolve };
        // No submitter: a plain save, never publish.
        form.requestSubmit();
      }),
    [state],
  );

  // Each submission yields a new state object; report its outcome once.
  useEffect(() => {
    const waiting = leaveSave.current;
    if (waiting && waiting.from !== state) {
      leaveSave.current = null;
      waiting.resolve(state.saved === true);
    }

    if (state.saved) {
      savedFields.current = readFields();
      // Mirrors the action's outcome for the header indicator.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedAt(new Date());
      checkDirty();
      toast("Saved");
    } else if (state.formError) {
      toast(state.formError, "error");
    }
  }, [checkDirty, readFields, state]);

  const saveView = describeSave({
    autosave: autosaveStatus,
    saving: manualSaving || autosaveStatus.kind === "saving",
    dirty,
    savedAt,
  });

  return (
    <>
      {postId !== null && status !== null ? (
        <PostEditorHeader
          actions={headerActions}
          meta={<EditorMeta save={saveView} stats={stats} />}
          mode="edit"
          postId={postId}
          status={status}
        />
      ) : null}

      {/* The max lengths mirror the server rules; the server remains the authority. */}
      <form
        action={formAction}
        className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]"
        data-focus-layout
        noValidate
        onClick={checkDirty}
        onInput={checkDirty}
        onKeyUp={checkDirty}
        ref={formRef}
      >
        <UnsavedChangesGuard
          isDirty={isDirty}
          save={postId !== null ? saveBeforeLeaving : undefined}
          saveOnLeave={status === "DRAFT"}
        />
        <div className="min-w-0 rounded-card bg-card px-5 py-8 shadow-sm ring-1 ring-border md:px-12 md:py-12">
          <textarea
            aria-describedby={
              fieldErrors.title ? "post-title-error" : undefined
            }
            aria-invalid={fieldErrors.title ? true : undefined}
            aria-label="Title"
            className="block w-full resize-none overflow-hidden bg-transparent text-3xl leading-tight font-semibold tracking-tight outline-none placeholder:text-faint"
            defaultValue={values.title}
            id="post-title"
            maxLength={POST_TITLE_MAX_LENGTH}
            name="title"
            onInput={(event) => {
              const field = event.currentTarget;
              // A title is one line; pasted line breaks become spaces.
              if (/[\r\n]/.test(field.value)) {
                field.value = field.value.replace(/[\r\n]+/g, " ");
              }
              fitHeight(field);
            }}
            onKeyDown={(event) => {
              // Enter moves to the body, like leaving a heading.
              if (event.key !== "Enter" || event.nativeEvent.isComposing) {
                return;
              }
              event.preventDefault();
              formRef.current
                ?.querySelector<HTMLElement>(".ProseMirror")
                ?.focus();
            }}
            placeholder="Title"
            ref={titleRef}
            rows={1}
          />
          <FieldError id="post-title-error" message={fieldErrors.title} />

          <hr className="my-6 border-border" />

          <p className="sr-only" id="post-content-label">
            Content
          </p>
          {initialDocument ? (
            <ArticleEditor
              imageUpload={imageUpload}
              initialDocument={initialDocument}
              deletedMediaIds={deletedMediaIds}
              initialMediaUrls={initialMediaUrls}
              labelledBy="post-content-label"
              name="content"
              onBlur={saveOnBlur}
              onChange={onContentChange}
            />
          ) : (
            <p className="text-sm text-destructive" role="alert">
              The stored content is not valid schema v1 and cannot be opened.
              Saving keeps it unchanged.
            </p>
          )}
          <FieldError id="post-content-error" message={fieldErrors.content} />
        </div>

        <aside
          className="divide-y divide-border rounded-card bg-card ring-1 ring-border lg:sticky lg:top-20"
          data-focus-hide
        >
          <div className="space-y-2 p-4">
            <div className="flex gap-2">
              <SubmitButton
                label={postId === null ? "Create draft" : "Save"}
                pendingLabel="Saving…"
              />
              {status === "DRAFT" ? (
                <SubmitButton
                  intent="publish"
                  label="Publish"
                  pendingLabel="Publishing…"
                  tone="secondary"
                />
              ) : null}
              {status === "PUBLISHED" ? (
                <SubmitButton
                  intent="unpublish"
                  label="Unpublish"
                  pendingLabel="Unpublishing…"
                  tone="secondary"
                />
              ) : null}
            </div>

            {state.formError ? (
              <p className="text-sm text-destructive" role="alert">
                {state.formError}
              </p>
            ) : null}
            {autosaveStatus.kind === "stopped" ? (
              <p className="text-sm text-destructive" role="alert">
                {STOPPED_MESSAGES[autosaveStatus.reason]}
              </p>
            ) : status === "PUBLISHED" ? (
              <p className="text-xs text-muted-foreground">
                Saving updates the live post.
              </p>
            ) : null}
          </div>

          <div className="flex gap-3 p-4">
            <TagIcon
              aria-hidden
              className="mt-1.5 size-4 shrink-0 text-faint"
            />
            <div className="min-w-0 flex-1">
              <TagPicker
                describedBy={fieldErrors.tags ? "post-tags-error" : undefined}
                defaultValue={values.tags}
                invalid={fieldErrors.tags ? true : undefined}
                limit={TAG_LIMIT_HINT}
                name="tags"
                suggestions={tagSuggestions}
              />
              <FieldError id="post-tags-error" message={fieldErrors.tags} />
            </div>
          </div>

          <SidebarSection
            icon={slugFrozen ? Lock : Link2}
            invalid={Boolean(fieldErrors.slug)}
            label="Slug"
          >
            <input
              aria-describedby={
                fieldErrors.slug ? "post-slug-error" : "post-slug-hint"
              }
              aria-invalid={fieldErrors.slug ? true : undefined}
              aria-label="Slug"
              autoCapitalize="none"
              autoCorrect="off"
              className={`${INPUT_CLASS} font-mono read-only:text-muted-foreground`}
              defaultValue={values.slug}
              id="post-slug"
              maxLength={POST_SLUG_MAX_LENGTH}
              name="slug"
              placeholder="post-address"
              readOnly={slugFrozen}
              spellCheck={false}
              title={
                slugFrozen
                  ? "Frozen since first publication"
                  : "Lowercase letters, numbers, hyphens"
              }
              type="text"
            />
            <p className="sr-only" id="post-slug-hint">
              {slugFrozen
                ? "Frozen since first publication."
                : "Lowercase letters, numbers, and hyphens. Frozen once published."}
            </p>
            <FieldError id="post-slug-error" message={fieldErrors.slug} />
          </SidebarSection>

          <SidebarSection
            icon={AlignLeft}
            invalid={Boolean(fieldErrors.summary)}
            label="Summary"
          >
            <textarea
              aria-describedby={
                fieldErrors.summary ? "post-summary-error" : undefined
              }
              aria-invalid={fieldErrors.summary ? true : undefined}
              aria-label="Summary, optional"
              className={INPUT_CLASS}
              defaultValue={values.summary}
              id="post-summary"
              maxLength={POST_SUMMARY_MAX_LENGTH}
              name="summary"
              placeholder="Optional"
              rows={4}
            />
            <FieldError id="post-summary-error" message={fieldErrors.summary} />
          </SidebarSection>
        </aside>
      </form>
    </>
  );
}

const STOPPED_MESSAGES = {
  conflict:
    "Autosave stopped: this post changed in another tab or window. Reload the page to continue.",
  not_found: "Autosave stopped: this post no longer exists.",
} as const;

interface SaveView {
  tone: string;
  label: string;
  detail: string;
}

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

/** One line of save state for the header (FR-ADMIN-23). */
function describeSave({
  autosave,
  saving,
  dirty,
  savedAt,
}: {
  autosave: AutosaveStatus;
  saving: boolean;
  dirty: boolean;
  savedAt: Date | null;
}): SaveView {
  if (autosave.kind === "stopped") {
    return {
      tone: "bg-destructive",
      label: "Autosave stopped",
      detail: STOPPED_MESSAGES[autosave.reason],
    };
  }
  if (saving) {
    return { tone: "bg-warning", label: "Saving…", detail: "Saving" };
  }
  if (autosave.kind === "error") {
    return {
      tone: "bg-destructive",
      label: "Retrying…",
      detail: "Autosave failed; it retries every 10 seconds.",
    };
  }
  if (dirty) {
    return {
      tone: "bg-warning",
      label: "Unsaved",
      detail: "Ctrl or Cmd+S saves. Drafts also autosave their text.",
    };
  }

  return {
    tone: "bg-success",
    label: savedAt
      ? `Saved ${savedAt.toLocaleTimeString([], TIME_FORMAT)}`
      : "Saved",
    detail: "All changes are saved.",
  };
}

const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");

function EditorMeta({
  save,
  stats,
}: {
  save: SaveView;
  stats: { words: number; readingMinutes: number } | null;
}) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {stats ? (
        <span
          className="hidden tabular-nums md:inline"
          title="CJK characters count as words"
        >
          {NUMBER_FORMAT.format(stats.words)} words
          {stats.words > 0 ? ` · ${stats.readingMinutes} min` : null}
        </span>
      ) : null}
      <span
        className="flex items-center gap-1.5 whitespace-nowrap"
        role="status"
        title={save.detail}
      >
        <span aria-hidden className={cn("size-1.5 rounded-full", save.tone)} />
        {save.label}
      </span>
    </div>
  );
}

/**
 * One collapsed sidebar field. Starts closed; an error opens it so the message
 * is never hidden.
 */
function SidebarSection({
  icon: Icon,
  label,
  invalid,
  children,
}: {
  icon: LucideIcon;
  label: string;
  invalid: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible defaultOpen={invalid} key={invalid ? "error" : "ok"}>
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-3 px-4 text-sm text-muted-foreground hover:text-foreground">
        <Icon aria-hidden className="size-4 text-faint" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight
          aria-hidden
          className="size-4 text-faint transition-transform group-data-[state=open]:rotate-90"
        />
      </CollapsibleTrigger>
      {/* forceMount keeps the field in the form while collapsed. */}
      <CollapsibleContent
        className="px-4 pb-4 data-[state=closed]:hidden"
        forceMount
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-2 text-sm text-destructive" id={id} role="alert">
      {message}
    </p>
  );
}
