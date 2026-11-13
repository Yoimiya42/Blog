import type { MailAdapter } from "./types";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

interface ResendMailAdapterOptions {
  apiKey: string;
  from: string;
  fetcher?: typeof fetch;
}

export function createResendMailAdapter({
  apiKey,
  from,
  fetcher = fetch,
}: ResendMailAdapterOptions): MailAdapter {
  return {
    async send(message) {
      const response = await fetcher(RESEND_EMAILS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Resend rejected email with status ${response.status}.`,
        );
      }
    },
  };
}
