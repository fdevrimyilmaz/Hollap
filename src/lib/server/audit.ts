import { db, createId, nowIso } from "@/lib/server/db";

export async function writeAuditLog(params: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.prepare(
    `
      INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (@id, @actor_user_id, @action, @entity_type, @entity_id, @metadata_json, @created_at)
    `
  ).run({
    id: createId("audit"),
    actor_user_id: params.actorUserId ?? null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata_json: params.metadata ? JSON.stringify(params.metadata) : null,
    created_at: nowIso(),
  });
}