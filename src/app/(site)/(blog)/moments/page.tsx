import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMomentService, MomentFeed } from "@/features/moment";

import { parsePageNumber } from "@/lib/page-number";

export const metadata: Metadata = { title: "Moments" };

export default async function MomentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const page = parsePageNumber((await searchParams).page);
  const feed = await (await getMomentService()).listPage(page);
  if (!feed) notFound();

  return <MomentFeed feed={feed} />;
}
