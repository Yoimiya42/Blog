export interface HomeIdentity {
  name: string;
  /** One-line identity shown directly under the name. */
  tagline: string;
  location: string | null;
}

export interface HomeContact {
  email: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
}

export interface HomeLink {
  label: string;
  href: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  /** Display string, for example "2024 – 2027". */
  period: string;
  details: readonly string[];
}

export interface ExperienceEntry {
  role: string;
  organisation: string;
  period: string;
  outcome: string;
  href: string | null;
}

export interface ProjectEntry {
  title: string;
  period: string;
  stack: readonly string[];
  outcome: string;
  links: readonly HomeLink[];
}

export interface SkillGroup {
  category: string;
  items: readonly string[];
}

/**
 * Hardcoded homepage source for v1 (FR-HOME-08 moves it to admin in v1.5).
 * `null` and empty arrays mean "source not ready": the section is not rendered.
 */
export interface HomeContent {
  identity: HomeIdentity | null;
  contact: HomeContact | null;
  profile: readonly string[];
  education: readonly EducationEntry[];
  experience: readonly ExperienceEntry[];
  projects: readonly ProjectEntry[];
  skills: readonly SkillGroup[];
}

export interface HomePostSummary {
  title: string;
  href: string;
  /** ISO 8601 calendar date, `YYYY-MM-DD`. */
  publishedOn: string;
  readingMinutes: number;
}

export type HomeSectionId =
  | "profile"
  | "education"
  | "experience"
  | "projects"
  | "skills"
  | "writing"
  | "contact";

export interface HomeNavItem {
  id: HomeSectionId;
  label: string;
}
