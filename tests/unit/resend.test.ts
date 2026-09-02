import { describe, expect, it, vi } from "vitest";

import { createResendMailAdapter } from "@/lib/mail";

describe("createResendMailAdapter", () => {
  const message = {
    to: "owner@example.com",
    subject: "Sign-in code",
    text: "Your code is 123456.",
    html: "<p>Your code is <strong>123456</strong>.</p>",
  };

  it("sends mail through the Resend HTTP API", async () => {
    const request = vi.fn(async () => new Response(null, { status: 200 }));
    const mail = createResendMailAdapter(
      {
        apiKey: "re_test_key",
        from: "Blog <login@example.com>",
      },
      request as typeof fetch,
    );

    await mail.send(message);

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer re_test_key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Blog <login@example.com>",
          to: ["owner@example.com"],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      }),
    );
  });

  it("does not expose the provider response when delivery fails", async () => {
    const request = vi.fn(
      async () =>
        new Response('{"message":"sensitive provider detail"}', {
          status: 401,
        }),
    );
    const mail = createResendMailAdapter(
      {
        apiKey: "re_test_key",
        from: "Blog <login@example.com>",
      },
      request as typeof fetch,
    );

    await expect(mail.send(message)).rejects.toThrow(
      "Mail delivery failed with status 401.",
    );
  });
});
