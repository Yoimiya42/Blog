"use client";

import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  LoaderCircle,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface CommandPost {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
}

const noSubscribe = () => () => {};
const readIsMac = () => /Mac|iPhone|iPad/.test(navigator.platform);
// The server cannot know the platform; it renders the non-Mac hint.
const serverIsMac = () => false;

const PAGES: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "/admin", icon: LayoutGrid },
  { label: "Posts", href: "/admin/posts", icon: FileText },
  { label: "Media", href: "/admin/media", icon: ImageIcon },
  { label: "View site", href: "/", icon: ExternalLink },
];

/**
 * Ctrl or Cmd+K search over admin pages, actions, and posts (FR-ADMIN-17).
 * Posts load on each open through the injected action.
 */
export function AdminCommandPalette({
  loadPosts,
}: {
  loadPosts: () => Promise<CommandPost[]>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<CommandPost[] | null>(null);
  const mac = useSyncExternalStore(noSubscribe, readIsMac, serverIsMac);
  const request = useRef(0);

  // Opening fetches fresh posts; a later open discards an earlier response.
  const changeOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) return;
      const id = ++request.current;
      setPosts(null);
      loadPosts()
        .then((items) => id === request.current && setPosts(items))
        .catch(() => id === request.current && setPosts([]));
    },
    [loadPosts],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // The article editor claims Ctrl or Cmd+K for links while its text has
      // focus (FR-ADMIN-24); it marks the event handled.
      if (event.defaultPrevented) return;
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        changeOpen(!open);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, changeOpen]);

  function go(href: string) {
    changeOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        className="flex h-9 items-center gap-2 rounded-control border border-border bg-background pr-1.5 pl-2.5 text-sm text-muted-foreground hover:border-input hover:text-foreground"
        onClick={() => changeOpen(true)}
        type="button"
      >
        <Search aria-hidden className="size-4" />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden rounded-mark bg-muted px-1.5 font-sans text-xs text-muted-foreground md:inline">
          {mac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <Dialog onOpenChange={changeOpen} open={open}>
        <DialogContent
          aria-describedby={undefined}
          className="top-[20vh] max-w-xl translate-y-0 overflow-hidden p-0"
          showClose={false}
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command loop>
            <CommandInput placeholder="Search pages and posts" />
            <CommandList className="max-h-80">
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => go("/admin/posts/new")}>
                  <Plus aria-hidden />
                  New post
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Pages">
                {PAGES.map(({ label, href, icon: Icon }) => (
                  <CommandItem key={href} onSelect={() => go(href)}>
                    <Icon aria-hidden />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Posts">
                {posts === null ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                    <LoaderCircle aria-hidden className="size-4 animate-spin" />
                    Loading
                  </div>
                ) : (
                  posts.map((post) => (
                    <CommandItem
                      key={post.id}
                      keywords={[post.slug]}
                      onSelect={() => go(`/admin/posts/${post.id}`)}
                      value={`post ${post.id} ${post.title}`}
                    >
                      <FileText aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        {post.title || "Untitled"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {post.status === "DRAFT" ? "Draft" : "Published"}
                      </span>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
