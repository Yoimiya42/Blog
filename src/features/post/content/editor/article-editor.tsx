"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

import type { LibraryImage } from "../image-upload";
import { ARTICLE_PROSE_CLASS } from "../prose";
import type { ArticleDocument } from "../types";
import { createArticleEditorExtensions } from "./extensions";
import { ImagePanel, type ImageUploadStatus } from "./image-panel";
import { normalizeEditorDocument } from "./normalize";
import { EditorToolbar } from "./toolbar";
import {
  firstImageFile,
  uploadImage,
  type ImageUploadConfig,
} from "./upload-image";

interface ArticleEditorProps {
  /** A document that already passed schema validation. */
  initialDocument: ArticleDocument;
  /** Form field that carries the serialised document. */
  name: string;
  /** Id of the element that labels the editing area. */
  labelledBy: string;
  /**
   * Receives the serialised document after each edit. Read once, when the
   * editor is created, so it must be stable for the life of the component.
   */
  onChange?: (serialized: string) => void;
  /** Called when the editing area loses focus. Same stability rule. */
  onBlur?: () => void;
  /** Enables the image control, paste, and drop. Same stability rule. */
  imageUpload?: ImageUploadConfig;
  /** Display URLs of the images in `initialDocument`, by media id. */
  initialMediaUrls?: Readonly<Record<string, string>>;
  /** Media ids in `initialDocument` that were deleted from the library. */
  deletedMediaIds?: readonly string[];
}

// The box around the editing area. Fluid by design: no fixed widths. Prose
// styles are shared with the rendered article.
const CONTENT_CLASS = [
  // Borderless, so the page reads like the published article.
  "min-h-[60vh] w-full text-lg leading-relaxed outline-none",
  // An atom such as an image has no cursor, so its selection must be visible.
  "[&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-ring",
  ARTICLE_PROSE_CLASS,
].join(" ");

/**
 * Default export so the form can load it with a dynamic import: the editor
 * runtime stays out of every statically imported module graph.
 */
export default function ArticleEditor({
  initialDocument,
  name,
  labelledBy,
  onChange,
  onBlur,
  imageUpload,
  initialMediaUrls,
  deletedMediaIds,
}: ArticleEditorProps) {
  // The image node reads display URLs from this registry when it renders. An
  // upload registers its URL before the node is inserted, so the new node
  // shows the image instead of a placeholder.
  const [{ extensions, registerMediaUrl }] = useState(() => {
    const urls: Record<string, string> = { ...initialMediaUrls };
    return {
      extensions: createArticleEditorExtensions(urls, deletedMediaIds),
      registerMediaUrl: (mediaId: string, url: string) => {
        urls[mediaId] = url;
      },
    };
  });
  const [imagePanelOpen, setImagePanelOpen] = useState(false);
  const [imageStatus, setImageStatus] = useState<ImageUploadStatus>({
    kind: "idle",
  });
  // Controlled, not a defaultValue: React resets uncontrolled fields after a
  // form action, which would submit the stale initial document on the next
  // save.
  const [serialized, setSerialized] = useState(() =>
    JSON.stringify(initialDocument),
  );

  // Paste and drop handlers are fixed when the editor is created; they reach
  // the current upload function through this ref.
  const uploadRef = useRef<(file: File) => void>(() => {});
  const uploading = useRef(false);

  const editor = useEditor({
    extensions,
    content: initialDocument,
    // The component is client-only, but TipTap still requires an explicit
    // opt-out to avoid a hydration mismatch warning under React 19.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: CONTENT_CLASS,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelledBy,
      },
      // The schema accepts only stored media, so a pasted or dropped image is
      // uploaded first and inserted as a media reference.
      handlePaste: (_view, event) => {
        const file = imageUpload && firstImageFile(event.clipboardData?.files);
        if (!file) return false;

        uploadRef.current(file);
        return true;
      },
      handleDrop: (_view, event, _slice, moved) => {
        // `moved` is a drag inside the editor, such as reordering an image.
        if (moved) return false;
        const file = imageUpload && firstImageFile(event.dataTransfer?.files);
        if (!file) return false;

        event.preventDefault();
        uploadRef.current(file);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      const next = JSON.stringify(normalizeEditorDocument(current.getJSON()));
      setSerialized(next);
      onChange?.(next);
    },
    onBlur: () => onBlur?.(),
  });

  async function uploadAndInsert(current: Editor, file: File) {
    if (!imageUpload || uploading.current) return;
    uploading.current = true;
    setImagePanelOpen(true);
    setImageStatus({ kind: "uploading", fileName: file.name || "image" });

    const result = await uploadImage(imageUpload, file, "");
    uploading.current = false;
    if (!result.ok) {
      setImageStatus({ kind: "error", message: result.message });
      return;
    }

    registerMediaUrl(result.mediaId, result.url);
    current
      .chain()
      .focus()
      .insertArticleImage({ mediaId: result.mediaId, alt: result.alt })
      .run();
    setImageStatus({
      kind: "inserted",
      mediaId: result.mediaId,
      alt: result.alt,
    });
  }

  // Refreshed after each render: refs must not change during render.
  useEffect(() => {
    uploadRef.current = (file) => {
      if (editor) void uploadAndInsert(editor, file);
    };
  });

  async function openLibrary() {
    const load = imageUpload?.loadLibrary;
    if (!load) return;
    setImageStatus({ kind: "library", items: null });
    try {
      const items = await load();
      // The owner may have gone back or closed the panel meanwhile.
      setImageStatus((current) =>
        current.kind === "library" ? { kind: "library", items } : current,
      );
    } catch {
      setImageStatus({
        kind: "error",
        message: "The library could not be loaded. Try again.",
      });
    }
  }

  function insertLibraryImage(current: Editor, image: LibraryImage) {
    registerMediaUrl(image.id, image.url);
    current
      .chain()
      .focus()
      .insertArticleImage({ mediaId: image.id, alt: image.alt })
      .run();
    setImageStatus({ kind: "inserted", mediaId: image.id, alt: image.alt });
  }

  function closeImagePanel() {
    setImagePanelOpen(false);
    // A finished upload starts fresh next time; an upload in flight keeps
    // reporting when the panel reopens.
    if (!uploading.current) setImageStatus({ kind: "idle" });
  }

  return (
    <div>
      {editor ? (
        <EditorToolbar
          editor={editor}
          image={
            imageUpload
              ? {
                  open: imagePanelOpen,
                  onToggle: () =>
                    imagePanelOpen
                      ? closeImagePanel()
                      : setImagePanelOpen(true),
                  panel: (
                    <ImagePanel
                      onAltChange={(alt) => {
                        if (imageStatus.kind !== "inserted") return;
                        editor.commands.setArticleImageAlt(
                          imageStatus.mediaId,
                          alt,
                        );
                        setImageStatus({ ...imageStatus, alt });
                      }}
                      onBackToUpload={() => setImageStatus({ kind: "idle" })}
                      onChooseFile={(file) => uploadRef.current(file)}
                      onOpenLibrary={
                        imageUpload.loadLibrary
                          ? () => void openLibrary()
                          : undefined
                      }
                      onPickLibraryImage={(image) =>
                        insertLibraryImage(editor, image)
                      }
                      onClose={() => {
                        closeImagePanel();
                        editor.commands.focus();
                      }}
                      status={imageStatus}
                    />
                  ),
                }
              : undefined
          }
        />
      ) : null}
      <EditorContent editor={editor} />
      <input name={name} readOnly type="hidden" value={serialized} />
    </div>
  );
}
