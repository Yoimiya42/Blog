import { afterEach, describe, expect, it, vi } from "vitest";

import { guardOtpSend } from "@/features/auth";
import { createOtpSender } from "@/lib/auth";
import type { MailAdapter } from "@/lib/mail";

const OWNER = "owner@example.com";
const SEND_URL =
  "https://site.example/api/auth/email-otp/send-verification-otp";
const SETTINGS = {
  OWNER_EMAIL: OWNER,
  RESEND_API_KEY: "test-key",
  AUTH_EMAIL_FROM: "Admin <auth@example.com>",
};

function sendRequest(email: string): Request {
  return new Request(SEND_URL, {
    method: "POST",
    body: JSON.stringify({ email, type: "sign-in" }),
  });
}

function loggedEvents(spy: { mock: { calls: unknown[][] } }): unknown[] {
  return spy.mock.calls.map((call) => JSON.parse(String(call[0])));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sign-in code sender", () => {
  it("mails the code to the owner", async () => {
    const send = vi.fn<MailAdapter["send"]>().mockResolvedValue();
    const sender = createOtpSender({ mail: { send }, ownerEmail: OWNER });

    await sender({
      email: "Owner@Example.com",
      otp: "123456",
      type: "sign-in",
    });

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "Owner@Example.com",
      text: expect.stringContaining("123456"),
    });
  });

  it("sends nothing and logs nothing for another address", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi.fn<MailAdapter["send"]>().mockResolvedValue();
    const sender = createOtpSender({ mail: { send }, ownerEmail: OWNER });

    await sender({
      email: "guest@example.com",
      otp: "123456",
      type: "sign-in",
    });

    expect(send).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("logs a failed send without the address or the code", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi
      .fn<MailAdapter["send"]>()
      .mockRejectedValue(new Error("Resend rejected email with status 503."));
    const sender = createOtpSender({ mail: { send }, ownerEmail: OWNER });

    // Resolves: the caller must not be able to tell a failed send from a
    // successful one.
    await expect(
      sender({ email: OWNER, otp: "123456", type: "sign-in" }),
    ).resolves.toBeUndefined();

    expect(loggedEvents(error)).toEqual([
      {
        event: "auth.otp.send_failed",
        reason: "Resend rejected email with status 503.",
      },
    ]);
    expect(String(error.mock.calls[0][0])).not.toContain(OWNER);
    expect(String(error.mock.calls[0][0])).not.toContain("123456");
  });
});

describe("sign-in code request guard", () => {
  it("lets the request through when mail is configured", () => {
    expect(guardOtpSend(sendRequest(OWNER), SETTINGS)).toBeNull();
  });

  it.each(["OWNER_EMAIL", "RESEND_API_KEY", "AUTH_EMAIL_FROM"] as const)(
    "rejects the request and logs when %s is missing",
    async (name) => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const response = guardOtpSend(sendRequest(OWNER), {
        ...SETTINGS,
        [name]: name === "OWNER_EMAIL" ? undefined : "  ",
      });

      expect(response?.status).toBe(503);
      expect(loggedEvents(error)).toEqual([
        { event: "auth.otp.mail_unconfigured", missing: [name] },
      ]);
    },
  );

  it("answers the owner and any other address identically", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const settings = { ...SETTINGS, RESEND_API_KEY: undefined };
    const owner = guardOtpSend(sendRequest(OWNER), settings);
    const guest = guardOtpSend(sendRequest("guest@example.com"), settings);

    expect(owner?.status).toBe(guest?.status);
    expect(await owner?.text()).toBe(await guest?.text());
  });

  it("leaves other auth routes alone when mail is missing", () => {
    const session = new Request("https://site.example/api/auth/get-session");
    const verify = new Request(
      "https://site.example/api/auth/sign-in/email-otp",
      { method: "POST" },
    );

    expect(guardOtpSend(session, {})).toBeNull();
    expect(guardOtpSend(verify, {})).toBeNull();
  });
});
