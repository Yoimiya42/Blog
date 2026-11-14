export interface Tag {
  id: string;
  slug: string;
  name: string;
}

export class TagSlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`tag slug is already in use: ${slug}`);
    this.name = "TagSlugTakenError";
  }
}
