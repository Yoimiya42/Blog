import { HomePage, homeContent, type HomePostSummary } from "@/features/home";
import { getPublicPostService, toCalendarDate } from "@/features/post";

const RECENT_POST_COUNT = 3;

// Posts come from D1 on every request. Without this the build would prerender
// the page once, when the Workers bindings are unavailable.
export const dynamic = "force-dynamic";

/**
 * The homepage must render even when the post read fails: the Writing section
 * hides itself when the list is empty.
 */
async function loadRecentPosts(): Promise<HomePostSummary[]> {
  try {
    const service = await getPublicPostService();
    const posts = await service.latest(RECENT_POST_COUNT);

    return posts.map((post) => ({
      title: post.title,
      href: `/blog/${post.slug}`,
      publishedOn: toCalendarDate(post.publishedAt),
      readingMinutes: post.readingMinutes,
    }));
  } catch (error) {
    console.error("Recent posts are unavailable", error);

    return [];
  }
}

export default async function Home() {
  return <HomePage content={homeContent} posts={await loadRecentPosts()} />;
}
