import { createServiceClient } from './supabase/server';
import { headers } from 'next/headers';

export async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  changes: Record<string, any>
) {
  try {
    const supabase = createServiceClient();
    const hdrs = await headers();

    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes,
      ip_address: hdrs.get('x-forwarded-for') || hdrs.get('x-real-ip'),
      user_agent: hdrs.get('user-agent'),
    });
  } catch (error) {
    // Audit log failure non blocca operation, ma logga errore
    console.error('Audit log failed:', error);
  }
}
