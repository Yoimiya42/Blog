import { serveMedia } from "@/features/media";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  return serveMedia(request, file);
}
