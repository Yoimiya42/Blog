import { MEDIA_ALT_HEADER, MEDIA_UPLOAD_PATH } from "./server/upload-media";
import { MAX_UPLOAD_BYTES } from "./upload/process";

export {
  MEDIA_WIDTHS,
  mediaSourceUrl,
  mediaTransformOptions,
  mediaUrl,
  parseMediaRequest,
} from "./delivery";
export { serveMedia } from "./server/serve-media";
export {
  MEDIA_ALT_HEADER,
  MEDIA_UPLOAD_PATH,
  uploadMedia,
  type MediaUploadResponse,
} from "./server/upload-media";
export {
  getMediaService,
  type MediaActor,
  type MediaLibraryItem,
  type MediaRemoval,
  type MediaService,
  type ResolvedMedia,
} from "./server/media.service";
export {
  listMediaForPickerAction,
  type MediaPickerItem,
} from "./server/media.actions";
export { MediaLibrary } from "./components/media-library";
export { MAX_UPLOAD_BYTES } from "./upload/process";
export { MediaRejectedError, type MediaRejection } from "./upload/errors";
export type { Media, MediaDisplay } from "./schema";

/** The upload contract the admin page hands to the post editor. */
export const MEDIA_UPLOAD_CONFIG = {
  path: MEDIA_UPLOAD_PATH,
  altHeader: MEDIA_ALT_HEADER,
  maxBytes: MAX_UPLOAD_BYTES,
} as const;
