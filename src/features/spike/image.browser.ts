import {
  calculateOutputDimensions,
  normalizeImageProcessingOptions,
  validateImageInput,
  type ImageProcessingOptions,
  type ProcessedImage,
} from "./image.shared";

async function decodeImage(source: Blob, contentType: string) {
  if (contentType === "image/heic") {
    const { heicTo } = await import("heic-to/csp");
    return heicTo({
      blob: source,
      type: "bitmap",
    });
  }

  return createImageBitmap(source, {
    imageOrientation: "from-image",
  });
}

async function encodeCanvas(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  contentType: string,
  quality: number,
) {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Browser image canvas is unavailable.");
    }

    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: contentType, quality });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Browser image canvas is unavailable.");
  }

  context.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Browser image encoding failed."));
        }
      },
      contentType,
      quality,
    );
  });
}

export async function processBrowserImage(
  input: Blob,
  options?: ImageProcessingOptions,
): Promise<ProcessedImage> {
  if (input.size === 0) {
    throw new Error("Image input is empty.");
  }

  const header = new Uint8Array(await input.slice(0, 64).arrayBuffer());
  const contentType = validateImageInput(header, input.size);
  const normalized = normalizeImageProcessingOptions(options);
  const bitmap = await decodeImage(input, contentType);

  try {
    const dimensions = calculateOutputDimensions(
      bitmap.width,
      bitmap.height,
      normalized.longEdge,
    );
    const blob = await encodeCanvas(
      bitmap,
      dimensions.width,
      dimensions.height,
      normalized.outputType,
      normalized.quality / 100,
    );

    if (blob.type !== normalized.outputType) {
      throw new Error(`Browser cannot encode ${normalized.outputType}.`);
    }

    return {
      body: new Uint8Array(await blob.arrayBuffer()),
      contentType: normalized.outputType,
      height: dimensions.height,
      size: blob.size,
      width: dimensions.width,
    };
  } finally {
    bitmap.close();
  }
}
