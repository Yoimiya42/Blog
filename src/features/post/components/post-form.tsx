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
import { SubmitButton } from "./submit-button";
import { TagPicker } from "./tag-picker";
import { useUnsavedChangesGuard } from "./unsaved-guard";

const AUTOSAVE_INTERVAL_MS = 10_000;

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
}

// A dynamic import keeps the TipTap runtime out of the statically imported
// module graph, so nothing that imports the post module bundles the editor.
// Until the chunk loads no content field exists, and a save sends none.
const ArticleEditor = dynamic(
  () => import("../content/editor/article-editor"),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading editor…</p>
    ),
  },
);

const INPUT_CLASS =
  "mt-1.5 w-full rounded-control border border-border bg-background px-3 py-2 text-sm outline-none focus:border-faint aria-invalid:border-destructive";

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
  useUnsavedChangesGuard(isDirty);

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

  const [state, formAction] = useActionState(
    (previous: PostFormState, formData: FormData) => {
      saving.current = true;
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
        });
    },
    initialState,
  );
  const { values, fieldErrors } = state;

  // Each submission yields a new state object; report its outcome once.
  useEffect(() => {
    if (state.saved) {
      savedFields.current = readFields();
      toast("Saved");
    } else if (state.formError) {
      toast(state.formError, "error");
    }
  }, [readFields, state]);

  return (
    // The max lengths mirror the server rules; the server remains the authority.
    <form
      action={formAction}
      ref={formRef}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]"
      noValidate
    >
      <div className="min-w-0 rounded-card bg-card px-5 py-8 shadow-sm ring-1 ring-border md:px-12 md:py-12">
        <input
          aria-describedby={fieldErrors.title ? "post-title-error" : undefined}
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-label="Title"
          className="w-full bg-transparent text-3xl leading-tight font-semibold tracking-tight outline-none placeholder:text-faint"
          defaultValue={values.title}
          id="post-title"
          maxLength={POST_TITLE_MAX_LENGTH}
          name="title"
          placeholder="Title"
          type="text"
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
            onChange={autosave.change}
          />
        ) : (
          <p className="text-sm text-destructive" role="alert">
            The stored content is not valid schema v1 and cannot be opened.
            Saving keeps it unchanged.
          </p>
        )}
        <FieldError id="post-content-error" message={fieldErrors.content} />
      </div>

      <aside className="divide-y divide-border rounded-card bg-card ring-1 ring-border lg:sticky lg:top-20">
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
          {initialDocument ? (
            <AutosaveNote
              enabled={autosaveEnabled}
              status={autosaveStatus}
              postStatus={status}
            />
          ) : null}
        </div>

        <div className="flex gap-3 p-4">
          <TagIcon aria-hidden className="mt-1.5 size-4 shrink-0 text-faint" />
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

function AutosaveNote({
  enabled,
  status,
  postStatus,
}: {
  enabled: boolean;
  status: AutosaveStatus;
  postStatus: PostStatus | null;
}) {
  if (status.kind === "stopped") {
    return (
      <p className="text-sm text-destructive" role="alert">
        {status.reason === "conflict"
          ? "Autosave stopped: this post changed in another tab or window. Reload the page to continue."
          : "Autosave stopped: this post no longer exists."}
      </p>
    );
  }

  let message: string;
  let tone = "bg-faint";
  if (!enabled) {
    if (postStatus === "PUBLISHED") {
      message = "Published: save to update";
    } else if (postStatus === null) {
      message = "Autosave starts after create";
    } else {
      return null;
    }
  } else if (status.kind === "saving") {
    message = "Saving…";
    tone = "bg-warning";
  } else if (status.kind === "saved") {
    message = `Saved ${status.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    tone = "bg-success";
  } else if (status.kind === "error") {
    message = "Autosave failed, retrying";
    tone = "bg-destructive";
  } else {
    message = "Autosave on";
  }

  return (
    <p
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
      role="status"
      title="Autosaves drafts every 10 seconds and when the editor loses focus."
    >
      <span aria-hidden className={`size-1.5 rounded-full ${tone}`} />
      {message}
    </p>
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
