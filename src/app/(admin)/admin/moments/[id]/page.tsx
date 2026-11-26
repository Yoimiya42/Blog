import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { requireOwner } from "@/features/auth";
import { MEDIA_UPLOAD_CONFIG } from "@/features/media";
import {
  DeleteMomentButton,
  getMomentService,
  MomentComposer,
  toMomentVersion,
} from "@/features/moment";

export default async function EditMomentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOwner();
  const { id } = await params;
  const moment = await (await getMomentService()).get(session, id);
  if (!moment) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2">
        <Link
          aria-label="Back to moments"
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "size-11",
          })}
          href="/admin/moments"
          title="Back to moments"
        >
          <ArrowLeft />
        </Link>
        <h1 className="flex-1 text-2xl font-semibold tracking-tight">
          Edit moment
        </h1>
        <DeleteMomentButton momentId={moment.id} returnTo="/admin/moments" />
      </div>
      <div className="mt-6">
        <MomentComposer
          moment={{
            id: moment.id,
            version: toMomentVersion(moment.updatedAt),
            body: moment.body,
            // Deleted images are already left out; saving drops them.
            images: moment.images.map((image) => ({
              id: image.id,
              thumbnailUrl: image.url,
            })),
          }}
          upload={MEDIA_UPLOAD_CONFIG}
        />
      </div>
    </div>
  );
}
