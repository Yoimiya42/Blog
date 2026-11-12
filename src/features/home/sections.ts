import type {
  HomeContent,
  HomeNavItem,
  HomePostSummary,
  HomeSectionId,
} from "./types";

export const MAX_RECENT_POSTS = 3;

/** Fixed section order from PRD section 4.1. */
const SECTION_ORDER: readonly HomeSectionId[] = [
  "profile",
  "education",
  "experience",
  "projects",
  "skills",
  "writing",
  "contact",
];

/** Primary navigation labels from PRD section 4.1; other sections have no nav entry. */
const NAV_LABELS: Partial<Record<HomeSectionId, string>> = {
  profile: "Profile",
  experience: "Experience",
  projects: "Projects",
  writing: "Writing",
  contact: "Contact",
};

export function recentPosts(
  posts: readonly HomePostSummary[],
): readonly HomePostSummary[] {
  return posts.slice(0, MAX_RECENT_POSTS);
}

/** Sections with source content, in display order. Empty sections stay unpublished. */
export function visibleSections(
  content: HomeContent,
  posts: readonly HomePostSummary[],
): readonly HomeSectionId[] {
  const hasContent: Record<HomeSectionId, boolean> = {
    profile: content.profile.length > 0,
    education: content.education.length > 0,
    experience: content.experience.length > 0,
    projects: content.projects.length > 0,
    skills: content.skills.length > 0,
    writing: posts.length > 0,
    contact: content.contact !== null,
  };

  return SECTION_ORDER.filter((id) => hasContent[id]);
}

/** Navigation never links to a section that is not rendered. */
export function navItems(
  sections: readonly HomeSectionId[],
): readonly HomeNavItem[] {
  return sections.flatMap((id) => {
    const label = NAV_LABELS[id];
    return label ? [{ id, label }] : [];
  });
}
