type CrmAuditInput = {
  email: string
  name?: string | null
  action:
    | 'whatsapp.connection_saved'
    | 'whatsapp.connection_selected'
    | 'whatsapp.connection_deleted'
  title: string
  subjectId?: string | null
  metadata?: Record<string, unknown>
}

export async function recordCrmActivity(
  request: Request,
  input: CrmAuditInput,
): Promise<void> {
  const apiUrl = process.env.NEXAPA_API_INTERNAL_URL?.replace(/\/+$/, '')
  const authKey = process.env.NEXAPA_CRM_AUTH_KEY
  if (!apiUrl || !authKey || !input.email) return

  const forwardedFor = request.headers.get('x-forwarded-for')
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || null

  try {
    const response = await fetch(`${apiUrl}/api/internal/crm-audit`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Nexapa-Crm-Auth-Key': authKey,
      },
      body: JSON.stringify({
        email: input.email,
        name: input.name ?? null,
        action: input.action,
        title: input.title,
        subject_id: input.subjectId ?? null,
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
        metadata: input.metadata ?? {},
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.error('[crm-audit] API rejected event:', response.status)
    }
  } catch (error) {
    console.error('[crm-audit] API unavailable:', error)
  }
}
