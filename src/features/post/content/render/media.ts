export type ArticleMedia = {
  url: string;
  width: number;
  height: number;
  blurhash?: string | null;
};

export type ArticleMediaMap = Readonly<Record<string, ArticleMedia>>;
