import {
  sanitizePhoneForMeta,
  isValidE164,
} from '@/lib/whatsapp/phone-utils';

export interface WhatsAppRecipientContact {
  phone?: string | null;
  whatsapp_user_id?: string | null;
}

export function resolveWhatsAppRecipient(
  contact: WhatsAppRecipientContact
): string {
  if (contact.phone) {
    const phone = sanitizePhoneForMeta(contact.phone);

    if (!isValidE164(phone)) {
      throw new Error(`contact phone invalid: ${contact.phone}`);
    }

    return phone;
  }

  const bsuid = contact.whatsapp_user_id?.trim();

  if (bsuid) {
    return bsuid;
  }

  throw new Error(
    'contact has neither a valid phone number nor WhatsApp user ID'
  );
}
