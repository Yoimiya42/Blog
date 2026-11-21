export type ArticleMedia = {
  /** Fallback source; `srcSet` lets the browser choose a better variant. */
  url: string;
  srcSet?: string;
  /** Source for the enlarged view; defaults to `url`. */
  zoomUrl?: string;
  width: number;
  height: number;
  blurhash?: string | null;
};

export type ArticleMediaMap = Readonly<Record<string, ArticleMedia>>;
