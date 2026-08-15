import "server-only";
import { env } from "@/lib/env";

/**
 * Transactional notification boundary (master-prompt rule 9). Providers are
 * interchangeable; the app calls `send()` and never talks to a vendor SDK
 * directly. The default "console" provider logs to the server and never sends —
 * so Release 0 runs end-to-end with no email account.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface SendResult {
  delivered: boolean;
  provider: string;
  id?: string;
}

export interface NotificationProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<SendResult>;
}

class ConsoleProvider implements NotificationProvider {
  readonly name = "console";
  async send(message: EmailMessage): Promise<SendResult> {
    console.info(
      JSON.stringify({
        kind: "email:console",
        to: message.to,
        subject: message.subject,
        // Body intentionally omitted from logs to avoid noise; templates are
        // deterministic and reviewable in code.
        at: new Date().toISOString(),
      }),
    );
    return { delivered: false, provider: this.name };
  }
}

class ResendProvider implements NotificationProvider {
  readonly name = "resend";
  async send(message: EmailMessage): Promise<SendResult> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.emailProviderApiKey()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { id?: string };
    return { delivered: true, provider: this.name, id: data.id };
  }
}

class PostmarkProvider implements NotificationProvider {
  readonly name = "postmark";
  async send(message: EmailMessage): Promise<SendResult> {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": env.emailProviderApiKey(),
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        From: env.emailFrom(),
        To: message.to,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
        ReplyTo: message.replyTo,
        MessageStream: "outbound",
      }),
    });
    if (!res.ok) {
      throw new Error(
        `Postmark send failed: ${res.status} ${await res.text()}`,
      );
    }
    const data = (await res.json()) as { MessageID?: string };
    return { delivered: true, provider: this.name, id: data.MessageID };
  }
}

let provider: NotificationProvider | null = null;

export function notifier(): NotificationProvider {
  if (provider) return provider;
  switch (env.emailProvider()) {
    case "resend":
      provider = new ResendProvider();
      break;
    case "postmark":
      provider = new PostmarkProvider();
      break;
    default:
      provider = new ConsoleProvider();
  }
  return provider;
}
