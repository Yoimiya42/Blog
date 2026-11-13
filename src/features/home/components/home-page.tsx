import Link from "next/link";

import { navItems, recentPosts, visibleSections } from "../sections";
import type {
  HomeContact,
  HomeContent,
  HomeIdentity,
  HomePostSummary,
} from "../types";
import {
  ContactSection,
  EducationSection,
  ExperienceSection,
  ProfileSection,
  ProjectsSection,
  SkillsSection,
  WritingSection,
} from "./sections";

function Lead({
  identity,
  contact,
}: {
  identity: HomeIdentity;
  contact: HomeContact | null;
}) {
  return (
    <div className="home-lead">
      <h1 className="home-lead__name">{identity.name}</h1>
      <p className="home-lead__tagline">{identity.tagline}</p>
      {identity.location ? (
        <p className="home-lead__location">{identity.location}</p>
      ) : null}
      {contact ? (
        <ul className="home-lead__actions" aria-label="Contact links">
          <li>
            <a
              className="action action--primary"
              href={`mailto:${contact.email}`}
            >
              Email
            </a>
          </li>
          {contact.githubUrl ? (
            <li>
              <a className="action" href={contact.githubUrl} rel="noreferrer">
                GitHub
              </a>
            </li>
          ) : null}
          {contact.linkedinUrl ? (
            <li>
              <a className="action" href={contact.linkedinUrl} rel="noreferrer">
                LinkedIn
              </a>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function HomePage({
  content,
  posts,
}: {
  content: HomeContent;
  posts: readonly HomePostSummary[];
}) {
  const { identity, contact } = content;
  const latest = recentPosts(posts);
  const sections = visibleSections(content, latest);
  const nav = navItems(sections);
  const shows = (id: (typeof sections)[number]) => sections.includes(id);

  return (
    <div className="home">
      <a className="skip-link" href="#content">
        Skip to content
      </a>

      <header className="site-head">
        <div className="site-head__in">
          {identity ? (
            <Link className="site-head__brand" href="/">
              {identity.name}
            </Link>
          ) : null}
          {nav.length > 0 ? (
            <nav aria-label="Primary">
              <ul className="site-head__nav">
                {nav.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </header>

      <main id="content" className="home-grid">
        {identity ? <Lead identity={identity} contact={contact} /> : null}

        <div className="home-body">
          {shows("profile") ? (
            <ProfileSection paragraphs={content.profile} />
          ) : null}
          {shows("education") ? (
            <EducationSection entries={content.education} />
          ) : null}
          {shows("experience") ? (
            <ExperienceSection entries={content.experience} />
          ) : null}
          {shows("projects") ? (
            <ProjectsSection entries={content.projects} />
          ) : null}
          {shows("skills") ? <SkillsSection groups={content.skills} /> : null}
          {shows("writing") ? <WritingSection posts={latest} /> : null}
          {shows("contact") && contact ? (
            <ContactSection contact={contact} />
          ) : null}
        </div>
      </main>

      {identity ? (
        <footer className="site-foot">
          <div className="site-foot__in">© {identity.name}</div>
        </footer>
      ) : null}
    </div>
  );
}
