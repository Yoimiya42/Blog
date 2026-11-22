/**
 * Element styles for article prose. The editor and the rendered article use
 * the same list, so what the owner types matches what the preview shows.
 * Tailwind's reset removes element defaults, so structure is declared here.
 * No React or TipTap imports: both registries may use it.
 */
export const ARTICLE_PROSE_CLASS = [
  "[&_p]:my-3 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold",
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold",
  "[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-input [&_blockquote]:pl-4",
  "[&_a]:underline [&_hr]:my-6 [&_hr]:border-input",
  "[&_code]:rounded-mark [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-control [&_pre]:bg-code-background [&_pre]:p-4 [&_pre]:text-code-foreground",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_figure]:my-4 [&_figcaption]:flex [&_figcaption]:flex-wrap [&_figcaption]:items-center [&_figcaption]:justify-between [&_figcaption]:gap-2 [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground",
].join(" ");
