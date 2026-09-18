import type { SupabaseClient } from '@supabase/supabase-js';

import { decrypt } from '@/lib/whatsapp/encryption';

export interface WhatsAppConnection {
  id: string;
  account_id: string;
  user_id: string;
  phone_number_id: string;
  access_token: string;
  waba_id?: string | null;
  is_active: boolean;
}

/** Resolve one connection without ever falling back across accounts. */
export async function resolveWhatsAppConnection(
  db: SupabaseClient,
  accountId: string,
  connectionId?: string | null,
): Promise<WhatsAppConnection | null> {
  let query = db
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', accountId);

  query = connectionId
    ? query.eq('id', connectionId)
    : query.eq('is_active', true);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as WhatsAppConnection | null;
}

export function decryptConnectionToken(connection: WhatsAppConnection): string {
  return decrypt(connection.access_token);
}

/** Resolve the immutable connection attached to an existing conversation. */
export async function resolveConversationConnection(
  db: SupabaseClient,
  accountId: string,
  conversationId: string,
): Promise<WhatsAppConnection | null> {
  const { data: conversation, error } = await db
    .from('conversations')
    .select('whatsapp_config_id')
    .eq('id', conversationId)
    .eq('account_id', accountId)
    .maybeSingle();
  if (error) throw error;
  if (!conversation) return null;
  return resolveWhatsAppConnection(db, accountId, conversation.whatsapp_config_id);
}
