import { describe, expect, it, vi } from "vitest";

import { createResendMailAdapter } from "@/lib/mail";

describe("Resend mail adapter", () => {
  it("sends the expected request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(new Response(null, { status: 200 }));

    const mail = createResendMailAdapter({
      apiKey: "test-key",
      from: "Admin <auth@example.com>",
      fetcher,
    });

    await mail.send({
      to: "owner@example.com",
      subject: "Your sign-in code",
      text: "123456",
    });

    expect(fetcher).toHaveBeenCalledOnce();

    const [url, request] = fetcher.mock.calls[0];

    expect(url).toBe("https://api.resend.com/emails");
    expect(request).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(String(request?.body))).toEqual({
      from: "Admin <auth@example.com>",
      to: "owner@example.com",
      subject: "Your sign-in code",
      text: "123456",
    });
  });

  it("reports a failed request without exposing the API key", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(new Response(null, { status: 503 }));

    const mail = createResendMailAdapter({
      apiKey: "secret-key",
      from: "Admin <auth@example.com>",
      fetcher,
    });

    await expect(
      mail.send({
        to: "owner@example.com",
        subject: "Your sign-in code",
        text: "123456",
      }),
    ).rejects.toMatchObject({
      message: "Resend rejected email with status 503.",
    });
  });
});
