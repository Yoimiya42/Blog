import { requireOwner } from "@/features/auth";
import {
  getEditorBackgroundService,
  getMediaService,
  MediaLibrary,
} from "@/features/media";

export default async function AdminMediaPage() {
  const session = await requireOwner();
  const [items, background] = await Promise.all([
    getMediaService().then((service) => service.list(session)),
    getEditorBackgroundService().then((service) => service.get(session)),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
      <div className="mt-8">
        <MediaLibrary
          backgroundMediaId={background.image?.mediaId ?? null}
          items={items}
        />
      </div>
    </div>
  );
}
