import type { HomeContent } from "./types";

/**
 * Owner-supplied homepage copy. Status per section: docs/launch-content.md.
 * Fill a field only with decided source content. Never invent copy: undecided
 * sections go in `placeholders` and render a labelled block (PRD section 4.1).
 */
export const homeContent: HomeContent = {
  identity: {
    name: "Fangming Luan",
    tagline: "UCL CS undergraduate",
    location: "London, UK",
  },
  contact: {
    email: "luanfangming@outlook.com",
    githubUrl: "https://github.com/Yoimiya42",
    linkedinUrl: "https://www.linkedin.com/in/fangming-luan",
  },
  profile: [],
  education: [
    {
      institution: "University College London",
      degree: "BSc Computer Science",
      period: null,
      details: [],
    },
  ],
  experience: [],
  projects: [],
  skills: [],
  placeholders: ["profile", "experience", "projects", "skills"],
};
