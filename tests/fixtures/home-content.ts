import type { HomeContent, HomePostSummary } from "@/features/home";

/** Synthetic content for tests only. Never import from application code. */
export const fullHomeContent: HomeContent = {
  identity: {
    name: "Test Person",
    tagline: "Computer science undergraduate building web systems.",
    location: "London, United Kingdom",
  },
  contact: {
    email: "person@example.com",
    githubUrl: "https://github.com/example",
    linkedinUrl: "https://www.linkedin.com/in/example/",
  },
  profile: ["First profile paragraph.", "Second profile paragraph."],
  education: [
    {
      institution: "Example University",
      degree: "BSc Computer Science",
      period: "2024 – 2027",
      details: ["Selected module", "Selected achievement"],
    },
  ],
  experience: [
    {
      role: "Software Engineering Intern",
      organisation: "Example Ltd",
      period: "2026.06 – 2026.09",
      outcome: "Cut build time from ten minutes to four.",
      href: "https://example.com",
    },
  ],
  projects: [
    {
      title: "Project One",
      period: "2026",
      stack: ["TypeScript", "Next.js", "Cloudflare D1"],
      outcome: "Publishing workflow that runs from a phone.",
      links: [{ label: "Repository", href: "https://github.com/example/one" }],
    },
    {
      title: "Project Two",
      period: "2025",
      stack: ["Python"],
      outcome: "Batch importer for <script>alert(1)</script> records.",
      links: [],
    },
  ],
  skills: [
    { category: "Languages", items: ["TypeScript", "Python", "C"] },
    { category: "Tools", items: ["Git", "Docker"] },
  ],
  placeholders: [],
};

export const emptyHomeContent: HomeContent = {
  identity: null,
  contact: null,
  profile: [],
  education: [],
  experience: [],
  projects: [],
  skills: [],
  placeholders: [],
};

export function makePosts(count: number): HomePostSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    title: `Post ${index + 1}`,
    href: `/blog/post-${index + 1}`,
    publishedOn: `2026-09-0${index + 1}`,
    readingMinutes: 5 + index,
  }));
}
