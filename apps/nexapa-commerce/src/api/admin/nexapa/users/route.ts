import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const responseError = (message: string) => ({
  message,
  users: [],
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const apiUrl = process.env.NEXAPA_API_URL?.replace(/\/$/, "")
  const bridgeKey = process.env.NEXAPA_COMMERCE_BRIDGE_KEY

  if (!apiUrl || !bridgeKey) {
    return res
      .status(503)
      .json(responseError("Nexapa user bridge is not configured."))
  }

  try {
    const upstream = await fetch(`${apiUrl}/api/internal/commerce/users`, {
      headers: {
        Accept: "application/json",
        "X-Nexapa-Commerce-Key": bridgeKey,
      },
      signal: AbortSignal.timeout(10_000),
    })

    const body = await upstream.json().catch(() => null)

    if (!upstream.ok) {
      req.scope.resolve("logger").warn(
        `Nexapa user bridge returned HTTP ${upstream.status}`
      )

      return res
        .status(502)
        .json(responseError("Nexapa user service is temporarily unavailable."))
    }

    return res.json(body)
  } catch (error) {
    req.scope.resolve("logger").error(
      `Nexapa user bridge request failed: ${error instanceof Error ? error.message : "unknown error"}`
    )

    return res
      .status(502)
      .json(responseError("Nexapa user service is temporarily unavailable."))
  }
}
