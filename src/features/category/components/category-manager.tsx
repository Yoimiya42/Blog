"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import {
  useId,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  CATEGORY_NAME_MAX_LENGTH,
  type CategoryDeleteResult,
  type CategoryMutationResult,
  type CategoryUsage,
} from "../schema";

const INPUT_CLASS =
  "h-9 min-w-0 flex-1 rounded-control border border-border bg-background px-3 text-sm outline-none focus:border-faint aria-invalid:border-destructive";

export interface CategoryManagerActions {
  create: (name: string) => Promise<CategoryMutationResult>;
  rename: (id: string, name: string) => Promise<CategoryMutationResult>;
  remove: (id: string) => Promise<CategoryDeleteResult>;
}

/**
 * FR-ADMIN-30. Each row renames on Enter or the check button; the list keeps
 * its own copy, so a change shows at once without reloading the page.
 */
export function CategoryManager({
  initial,
  actions,
}: {
  initial: CategoryUsage[];
  actions: CategoryManagerActions;
}) {
  const [categories, setCategories] = useState(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();

  function add(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await actions.create(draft);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCategories((current) => [
        ...current,
        { ...result.category, posts: 0 },
      ]);
      setDraft("");
    });
  }

  return (
    <TooltipProvider>
      <ul className="space-y-2">
        {categories.map((category) => (
          <CategoryRow
            actions={actions}
            category={category}
            key={category.id}
            onRemoved={() =>
              setCategories((current) =>
                current.filter((entry) => entry.id !== category.id),
              )
            }
            onRenamed={(name) =>
              setCategories((current) =>
                current.map((entry) =>
                  entry.id === category.id ? { ...entry, name } : entry,
                ),
              )
            }
          />
        ))}
      </ul>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : null}

      <form className="mt-4 flex items-center gap-2" onSubmit={add}>
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          aria-label="New category name"
          className={INPUT_CLASS}
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="New category"
          value={draft}
        />
        <IconButton
          disabled={pending || draft.trim() === ""}
          label="Add category"
          type="submit"
        >
          <Plus aria-hidden />
        </IconButton>
      </form>
      {error ? (
        <p
          className="mt-2 text-sm text-destructive"
          id={`${id}-error`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </TooltipProvider>
  );
}

function CategoryRow({
  category,
  actions,
  onRenamed,
  onRemoved,
}: {
  category: CategoryUsage;
  actions: CategoryManagerActions;
  onRenamed: (name: string) => void;
  onRemoved: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();
  const changed = name.trim() !== category.name;

  function rename(event: FormEvent) {
    event.preventDefault();
    if (!changed) return;
    setError(null);
    startTransition(async () => {
      const result = await actions.rename(category.id, name);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setName(result.category.name);
      onRenamed(result.category.name);
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await actions.remove(category.id);
      if (result.ok) onRemoved();
      else setError(result.message);
    });
  }

  return (
    <li>
      <form className="flex items-center gap-2" onSubmit={rename}>
        <input
          aria-describedby={error ? `${id}-error` : `${id}-usage`}
          aria-invalid={error ? true : undefined}
          aria-label="Category name"
          className={INPUT_CLASS}
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        <span
          className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums"
          id={`${id}-usage`}
        >
          {category.posts === 1 ? "1 post" : `${category.posts} posts`}
        </span>
        <IconButton
          disabled={pending || !changed}
          label="Save name"
          type="submit"
        >
          <Check aria-hidden />
        </IconButton>
        <IconButton
          disabled={pending}
          label="Delete category"
          onClick={remove}
          type="button"
        >
          <Trash2 aria-hidden />
        </IconButton>
      </form>
      {error ? (
        <p
          className="mt-1.5 text-sm text-destructive"
          id={`${id}-error`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </li>
  );
}

function IconButton({
  label,
  children,
  ...props
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type: "button" | "submit";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button aria-label={label} size="icon" variant="outline" {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
