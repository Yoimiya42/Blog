import { requireOwner } from "@/features/auth";
import {
  getEditorBackgroundService,
  getMediaService,
  MediaLibrary,
} from "@/features/media";

export default async function AdminMediaPage() {
  const session = await requireOwner();
  const [items, backgroundIds] = await Promise.all([
    getMediaService().then((service) => service.list(session)),
    getEditorBackgroundService().then((service) =>
      service.listMediaIdsInUse(session),
    ),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
      <div className="mt-8">
        <MediaLibrary backgroundMediaIds={[...backgroundIds]} items={items} />
      </div>
    </div>
  );
}
