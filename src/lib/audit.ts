import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export type AuditAction =
  | "plan_assigned"
  | "manual_override_set"
  | "coupon_applied"
  | "coupon_revoked"
  | "integration_approved"
  | "integration_denied"
  | "integration_requested";

export type AuditTargetType = "church" | "coupon" | "integration_request";

export async function logAudit(params: {
  actorId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(auditLogs).values({
    actorId: params.actorId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata ?? null,
  });
}
