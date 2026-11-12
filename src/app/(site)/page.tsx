import { HomePage, homeContent } from "@/features/home";

export default function Home() {
  // Recent posts arrive with the content read path (Issue #38). Until then the
  // Writing section stays hidden.
  return <HomePage content={homeContent} posts={[]} />;
}
