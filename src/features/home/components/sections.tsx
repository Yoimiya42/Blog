import Link from "next/link";
import type { ReactNode } from "react";

import type {
  EducationEntry,
  ExperienceEntry,
  HomeContact,
  HomePostSummary,
  HomeSectionId,
  ProjectEntry,
  SkillGroup,
} from "../types";

function Section({
  id,
  heading,
  children,
}: {
  id: HomeSectionId;
  heading: string;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;

  return (
    <section id={id} className="home-section" aria-labelledby={headingId}>
      <h2 id={headingId} className="home-section__heading">
        {heading}
      </h2>
      {children}
    </section>
  );
}

/** Stands in for a section body whose source content is not written yet. */
function PlaceholderNote() {
  return <p className="placeholder-note">Placeholder</p>;
}

function EntryHead({
  title,
  period,
}: {
  title: ReactNode;
  period: string | null;
}) {
  return (
    <div className="entry__head">
      <h3 className="entry__title">{title}</h3>
      {period ? <span className="entry__period">{period}</span> : null}
    </div>
  );
}

/** Shows a URL the way a reader would type it: no scheme, no trailing slash. */
function displayUrl(href: string): string {
  return href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export function ProfileSection({
  paragraphs,
}: {
  paragraphs: readonly string[];
}) {
  return (
    <Section id="profile" heading="Profile">
      {paragraphs.length > 0 ? (
        <div className="prose">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <PlaceholderNote />
      )}
    </Section>
  );
}

export function EducationSection({
  entries,
}: {
  entries: readonly EducationEntry[];
}) {
  return (
    <Section id="education" heading="Education">
      {entries.length > 0 ? (
        <ul className="entry-list">
          {entries.map((entry) => (
            <li key={`${entry.institution}-${entry.degree}`} className="entry">
              <EntryHead title={entry.institution} period={entry.period} />
              <p className="entry__sub">{entry.degree}</p>
              {entry.details.length > 0 ? (
                <ul className="entry__details">
                  {entry.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <PlaceholderNote />
      )}
    </Section>
  );
}

export function ExperienceSection({
  entries,
}: {
  entries: readonly ExperienceEntry[];
}) {
  return (
    <Section id="experience" heading="Experience">
      {entries.length > 0 ? (
        <ul className="entry-list">
          {entries.map((entry) => (
            <li
              key={`${entry.role}-${entry.organisation}-${entry.period}`}
              className="entry"
            >
              <EntryHead
                title={
                  <>
                    {entry.role}
                    <span className="entry__org">
                      {" · "}
                      {entry.href ? (
                        <a href={entry.href} rel="noreferrer">
                          {entry.organisation}
                        </a>
                      ) : (
                        entry.organisation
                      )}
                    </span>
                  </>
                }
                period={entry.period}
              />
              <p className="entry__body">{entry.outcome}</p>
            </li>
          ))}
        </ul>
      ) : (
        <PlaceholderNote />
      )}
    </Section>
  );
}

export function ProjectsSection({
  entries,
}: {
  entries: readonly ProjectEntry[];
}) {
  return (
    <Section id="projects" heading="Selected Projects">
      {entries.length > 0 ? (
        <ul className="entry-list entry-list--pair">
          {entries.map((entry) => (
            <li key={entry.title} className="entry">
              <EntryHead title={entry.title} period={entry.period} />
              <p className="entry__body">{entry.outcome}</p>
              {entry.stack.length > 0 ? (
                <p className="entry__meta">{entry.stack.join(" · ")}</p>
              ) : null}
              {entry.links.length > 0 ? (
                <ul className="entry__links">
                  {entry.links.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} rel="noreferrer">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <PlaceholderNote />
      )}
    </Section>
  );
}

export function SkillsSection({ groups }: { groups: readonly SkillGroup[] }) {
  return (
    <Section id="skills" heading="Skills">
      {groups.length > 0 ? (
        <dl className="facts">
          {groups.map((group) => (
            <div key={group.category} className="facts__row">
              <dt>{group.category}</dt>
              <dd>{group.items.join(", ")}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <PlaceholderNote />
      )}
    </Section>
  );
}

export function WritingSection({
  posts,
}: {
  posts: readonly HomePostSummary[];
}) {
  return (
    <Section id="writing" heading="Writing">
      <ul className="entry-list">
        {posts.map((post) => (
          <li key={post.href} className="entry">
            <h3 className="entry__title">
              <Link href={post.href}>{post.title}</Link>
            </h3>
            <p className="entry__meta">
              <time dateTime={post.publishedOn}>{post.publishedOn}</time>
              {" · "}
              {post.readingMinutes} min read
            </p>
          </li>
        ))}
      </ul>
      <p className="home-section__more">
        <Link href="/blog">All posts</Link>
      </p>
    </Section>
  );
}

export function ContactSection({ contact }: { contact: HomeContact }) {
  return (
    <Section id="contact" heading="Contact">
      <dl className="facts">
        <div className="facts__row">
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </dd>
        </div>
        {contact.githubUrl ? (
          <div className="facts__row">
            <dt>GitHub</dt>
            <dd>
              <a href={contact.githubUrl} rel="noreferrer">
                {displayUrl(contact.githubUrl)}
              </a>
            </dd>
          </div>
        ) : null}
        {contact.linkedinUrl ? (
          <div className="facts__row">
            <dt>LinkedIn</dt>
            <dd>
              <a href={contact.linkedinUrl} rel="noreferrer">
                {displayUrl(contact.linkedinUrl)}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </Section>
  );
}
