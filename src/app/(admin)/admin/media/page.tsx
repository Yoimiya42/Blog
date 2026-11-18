import { requireOwner } from "@/features/auth";
import { getMediaService, MediaLibrary } from "@/features/media";

export default async function AdminMediaPage() {
  const session = await requireOwner();
  const items = await (await getMediaService()).list(session);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Media</h1>
      <div className="mt-8">
        <MediaLibrary items={items} />
      </div>
    </div>
  );
}
