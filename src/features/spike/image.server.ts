import sharp from "sharp";

import {
  MAX_IMAGE_INPUT_PIXELS,
  normalizeImageProcessingOptions,
  validateImageInput,
  type ImageProcessingOptions,
  type ProcessedImage,
} from "./image.shared";

export async function processServerImage(
  input: Uint8Array,
  options?: ImageProcessingOptions,
): Promise<ProcessedImage> {
  validateImageInput(input);
  const normalized = normalizeImageProcessingOptions(options);
  const pipeline = sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_IMAGE_INPUT_PIXELS,
  })
    .rotate()
    .resize({
      width: normalized.longEdge,
      height: normalized.longEdge,
      fit: "inside",
      withoutEnlargement: true,
    });

  const output =
    normalized.outputType === "image/avif"
      ? pipeline.avif({ quality: normalized.quality })
      : pipeline.webp({ quality: normalized.quality });
  const { data, info } = await output.toBuffer({ resolveWithObject: true });

  return {
    body: new Uint8Array(data),
    contentType: normalized.outputType,
    height: info.height,
    size: info.size,
    width: info.width,
  };
}
