import net from "node:net";
import tls from "node:tls";
import { EmailProvider, SendEmailInput, SendEmailResult } from "./emailProvider";

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function formatMessage(input: SendEmailInput) {
  const from = input.fromName ? `"${input.fromName}" <${input.fromEmail}>` : input.fromEmail;
  return [
    `From: ${from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.body
  ].join("\r\n");
}

class SmtpSession {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = "";

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
  }

  read(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("SMTP server timeout.")), 15000);
      const onData = (chunk: Buffer) => {
        this.buffer += chunk.toString("utf8");
        const lines = this.buffer.split(/\r?\n/).filter(Boolean);
        const last = lines.at(-1);
        if (last && /^\d{3}\s/.test(last)) {
          clearTimeout(timeout);
          this.socket.off("data", onData);
          const response = this.buffer;
          this.buffer = "";
          resolve(response);
        }
      };
      this.socket.on("data", onData);
      this.socket.once("error", reject);
    });
  }

  async command(command: string, expected: number[]) {
    this.socket.write(`${command}\r\n`);
    const response = await this.read();
    const code = Number(response.slice(0, 3));
    if (!expected.includes(code)) throw new Error(response.trim());
    return response;
  }

  upgrade(host: string) {
    this.socket = tls.connect({ socket: this.socket, host, servername: host });
    this.buffer = "";
  }

  end() {
    this.socket.end();
  }
}

function smtpReady() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM_EMAIL);
}

function sanitizeSmtpError(message: string) {
  return [process.env.SMTP_PASS, process.env.SMTP_USER]
    .filter((value): value is string => Boolean(value))
    .reduce((safe, secret) => safe.replaceAll(secret, "[redacted]"), message);
}

export const smtpEmailProvider: EmailProvider = {
  name: "smtp",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!smtpReady()) {
      return { ok: false, provider: "smtp", errorMessage: "SMTP credentials are not fully configured." };
    }

    const host = process.env.SMTP_HOST as string;
    const port = Number(process.env.SMTP_PORT);
    const secure = port === 465;
    const fromEmail = input.fromEmail ?? process.env.SMTP_FROM_EMAIL;
    const fromName = input.fromName ?? process.env.SMTP_FROM_NAME;

    try {
      const socket = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
      const session = new SmtpSession(socket);
      await session.read();
      await session.command(`EHLO ${host}`, [250]);

      if (!secure) {
        await session.command("STARTTLS", [220]);
        session.upgrade(host);
        await session.command(`EHLO ${host}`, [250]);
      }

      await session.command("AUTH LOGIN", [334]);
      await session.command(encode(process.env.SMTP_USER as string), [334]);
      await session.command(encode(process.env.SMTP_PASS as string), [235]);
      await session.command(`MAIL FROM:<${fromEmail}>`, [250]);
      await session.command(`RCPT TO:<${input.to}>`, [250, 251]);
      await session.command("DATA", [354]);
      await session.command(`${formatMessage({ ...input, fromEmail, fromName })}\r\n.`, [250]);
      await session.command("QUIT", [221]);
      session.end();

      return {
        ok: true,
        provider: "smtp",
        providerMessageId: `smtp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      };
    } catch (error) {
      return {
        ok: false,
        provider: "smtp",
        errorMessage: sanitizeSmtpError(error instanceof Error ? error.message : "SMTP send failed.")
      };
    }
  }
};

export function hasSmtpCredentials() {
  return smtpReady();
}

export function getSmtpConfigStatus() {
  const missing = [
    !process.env.SMTP_HOST && "SMTP_HOST",
    !process.env.SMTP_PORT && "SMTP_PORT",
    !process.env.SMTP_USER && "SMTP_USER",
    !process.env.SMTP_PASS && "SMTP_PASS",
    !process.env.SMTP_FROM_EMAIL && "SMTP_FROM_EMAIL"
  ].filter(Boolean) as string[];

  return {
    configured: missing.length === 0,
    missing,
    hostConfigured: Boolean(process.env.SMTP_HOST),
    portConfigured: Boolean(process.env.SMTP_PORT),
    userConfigured: Boolean(process.env.SMTP_USER),
    passwordConfigured: Boolean(process.env.SMTP_PASS),
    fromEmailConfigured: Boolean(process.env.SMTP_FROM_EMAIL),
    fromNameConfigured: Boolean(process.env.SMTP_FROM_NAME)
  };
}
