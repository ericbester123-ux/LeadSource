import { prisma } from "./prisma";

function redactSecrets(value: unknown): unknown {
  const secrets = [process.env.SMTP_PASS].filter((secret): secret is string => Boolean(secret));

  if (!secrets.length) return value;
  if (typeof value === "string") {
    return secrets.reduce((safe, secret) => safe.replaceAll(secret, "[redacted]"), value);
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => {
        const isSecretKey = /pass(word)?|secret|token|key/i.test(key);
        return [key, isSecretKey ? "[redacted]" : redactSecrets(nested)];
      })
    );
  }
  return value;
}

export async function writeAudit(action: string, entityType: string, entityId?: string, reason?: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      reason: redactSecrets(reason) as string | undefined,
      metadata: metadata ? JSON.stringify(redactSecrets(metadata)) : undefined
    }
  });
}
