import type { MailAdapter } from "./types";

interface ResendMailAdapterOptions {
  apiKey: string;
  from: string;
}

export function createResendMailAdapter(
  options: ResendMailAdapterOptions,
  request: typeof fetch = fetch,
): MailAdapter {
  return {
    async send(message) {
      const response = await request("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: options.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`Mail delivery failed with status ${response.status}.`);
      }
    },
  };
}
