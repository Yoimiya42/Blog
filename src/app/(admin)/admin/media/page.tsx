import { requireOwner } from "@/features/auth";

export default async function AdminMediaPage() {
  await requireOwner();

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Media</h1>
      <p className="mt-8 text-sm text-stone-600">No media.</p>
    </div>
  );
}
