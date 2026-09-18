import type { SupabaseClient } from '@supabase/supabase-js';

export class BroadcastPersistenceError extends Error {
  constructor() {
    super('Status pesan belum tersimpan. Pengiriman dihentikan; jangan kirim ulang broadcast. Periksa log CRM.');
    this.name = 'BroadcastPersistenceError';
  }
}

/** Retry the database operation, NEVER the Meta send. */
export async function writeBroadcastRecipient(
  db: SupabaseClient,
  recipientId: string,
  update: Record<string, unknown>,
): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    let errorCode: string | undefined;
    try {
      const { data, error } = await db.from('broadcast_recipients')
        .update(update).eq('id', recipientId).select('id').maybeSingle();
      if (!error && data) return;
      errorCode = error?.code;
      console.error('[broadcast] recipient persistence failed:', {
        recipientId, code: errorCode ?? 'NO_ROW', attempt: attempt + 1,
      });
    } catch {
      // An ambiguous network result can be replayed safely at the database;
      // the trigger preserves terminal states and receipt correlation.
      errorCode = 'NETWORK';
    }
    if (!['40001', '40P01', '55P03', 'NETWORK'].includes(errorCode ?? '') || attempt === 3) {
      throw new BroadcastPersistenceError();
    }
    await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
  }
}
