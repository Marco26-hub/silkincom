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

    // L'esito va letto: supabase-js non solleva eccezioni sugli errori del
    // database, li restituisce. Ignorandolo, audit_logs è rimasta vuota per
    // mesi mentre ogni insert veniva rifiutato da una foreign key verso la
    // tabella admin_users, ormai abbandonata (risolto dalla migrazione 055).
    const { error } = await supabase.from('audit_logs').insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes,
      ip_address: hdrs.get('x-forwarded-for') || hdrs.get('x-real-ip'),
      user_agent: hdrs.get('user-agent'),
    });

    if (error) {
      console.error('Audit log rifiutato dal database:', {
        action,
        entityType,
        entityId,
        message: error.message,
        code: error.code,
      });
    }
  } catch (error) {
    // Un audit mancato non deve far fallire l'operazione a cui si riferisce.
    console.error('Audit log failed:', error);
  }
}
