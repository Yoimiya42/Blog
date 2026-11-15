import { BlogShell } from "@/components/layout/blog-shell";
import { siteConfig } from "@/config/site";
import { homeContent } from "@/features/home";

import "@/styles/blog.css";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BlogShell brand={homeContent.identity?.name ?? siteConfig.name}>
      {children}
    </BlogShell>
  );
}
