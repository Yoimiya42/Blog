/**
 * The image upload contract, passed in by the admin page so the editor bundle
 * never imports the media module (ADR-0024). Lives outside `editor/` so the
 * form can name it without crossing the editor runtime boundary.
 */
export interface ImageUploadConfig {
  /** Endpoint that accepts the raw file body. */
  path: string;
  /** Request header that carries the URI-encoded alt text. */
  altHeader: string;
  /** Mirror of the server limit, for an early message only. */
  maxBytes: number;
}
