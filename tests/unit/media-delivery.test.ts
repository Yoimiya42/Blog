import { describe, expect, it } from "vitest";
import {
  MEDIA_WIDTHS,
  mediaSourceUrl,
  mediaTransformOptions,
  parseMediaRequest,
} from "@/features/media";

const id = "a1b2c3d4e5f6g7h8";

function parse(file: string, query: string) {
  return parseMediaRequest(file, new URLSearchParams(query));
}

describe("parseMediaRequest", () => {
  it.each(MEDIA_WIDTHS)("accepts the allowed width %i", (width) => {
    expect(parse(`${id}.jpg`, `w=${width}`)).toEqual({
      key: `media/${id}.jpg`,
      width,
    });
  });

  it.each(["png", "webp"])("accepts the %s extension", (ext) => {
    expect(parse(`${id}.${ext}`, "w=960")?.key).toBe(`media/${id}.${ext}`);
  });

  it.each([
    ["missing width", `${id}.jpg`, ""],
    ["unlisted width", `${id}.jpg`, "w=1000"],
    ["non-numeric width", `${id}.jpg`, "w=large"],
    ["extra parameter", `${id}.jpg`, "w=960&original=true"],
    ["repeated width", `${id}.jpg`, "w=960&w=480"],
    ["original request", `${id}.jpg`, "original=true"],
    ["unsupported extension", `${id}.heic`, "w=960"],
    ["uppercase extension", `${id}.JPG`, "w=960"],
    ["short id", "abc.jpg", "w=960"],
    ["path traversal", "..%2Fsecret.jpg", "w=960"],
    ["uppercase id", `${id.toUpperCase()}.jpg`, "w=960"],
  ])("rejects a %s", (_label, file, query) => {
    expect(parse(file, query)).toBeNull();
  });
});

describe("mediaTransformOptions", () => {
  it("uses AVIF up to the Cloudflare AVIF size limit", () => {
    expect(mediaTransformOptions(480).format).toBe("avif");
    expect(mediaTransformOptions(960).format).toBe("avif");
  });

  it("uses WebP above the AVIF size limit", () => {
    expect(mediaTransformOptions(1600).format).toBe("webp");
    expect(mediaTransformOptions(2400).format).toBe("webp");
  });

  it("strips metadata and authenticates to the source", () => {
    expect(mediaTransformOptions(960)).toMatchObject({
      metadata: "none",
      fit: "scale-down",
      "origin-auth": "share-publicly",
    });
  });
});

describe("mediaSourceUrl", () => {
  it("joins the source origin and key", () => {
    expect(
      mediaSourceUrl("https://src.fangmingluan.com", `media/${id}.jpg`),
    ).toBe(`https://src.fangmingluan.com/media/${id}.jpg`);
  });
});
