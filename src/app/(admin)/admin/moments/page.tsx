import { notFound } from "next/navigation";

import { requireOwner } from "@/features/auth";
import { MEDIA_UPLOAD_CONFIG } from "@/features/media";
import {
  getMomentService,
  MomentAdminList,
  MomentComposer,
} from "@/features/moment";

import { parsePageNumber } from "@/lib/page-number";

export default async function AdminMomentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOwner();
  const page = parsePageNumber((await searchParams).page);
  const feed = await (await getMomentService()).listForOwner(session, page);
  if (!feed) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Moments</h1>
      {page === 1 ? (
        <div className="mt-6">
          <MomentComposer upload={MEDIA_UPLOAD_CONFIG} />
        </div>
      ) : null}
      <div className="mt-8">
        <MomentAdminList feed={feed} />
      </div>
    </div>
  );
}
