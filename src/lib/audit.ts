import { prisma } from "./prisma";

export async function writeAudit(action: string, entityType: string, entityId?: string, reason?: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      reason,
      metadata: metadata ? JSON.stringify(metadata) : undefined
    }
  });
}
