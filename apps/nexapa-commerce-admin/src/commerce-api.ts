export type ProductStatus = "draft" | "active" | "archived"

export type CommerceProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  price_amount: number
  currency: string
  status: ProductStatus
  published_at: string | null
  created_at: string
  updated_at: string
}

export type ProductInput = {
  name: string
  description: string | null
  type: string
  price_amount: number
  currency: string
  status: ProductStatus
}

type ProductCollectionResponse = {
  success: boolean
  data: CommerceProduct[]
}

type ProductResponse = {
  success: boolean
  data: CommerceProduct
}

const API_ORIGIN = (import.meta.env.VITE_NEXAPA_API_URL || "https://api.nexapa.app").replace(/\/+$/, "")
const PRODUCTS_URL = `${API_ORIGIN}/api/v1/commerce/products`

export class CommerceApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

let csrfPromise: Promise<void> | null = null

async function ensureCsrfCookie() {
  if (!csrfPromise) {
    csrfPromise = fetch(`${API_ORIGIN}/sanctum/csrf-cookie`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    }).then(() => undefined)
  }

  return csrfPromise
}

function csrfToken() {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = init.method?.toUpperCase() || "GET"
  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    await ensureCsrfCookie()
    const token = csrfToken()
    if (token) headers.set("X-XSRF-TOKEN", token)
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  })
  const body = await response.json().catch(() => null) as null | {
    message?: string
    errors?: Record<string, string[]>
  }

  if (!response.ok) {
    const fieldMessage = body?.errors ? Object.values(body.errors)[0]?.[0] : null
    const defaultMessage = response.status === 401
      ? "Sesi admin tidak ditemukan. Masuk melalui app.nexapa.app lalu buka kembali Commerce."
      : response.status === 403
        ? "Akun ini tidak memiliki akses administrator Commerce."
        : "Permintaan ke Nexapa API gagal."
    throw new CommerceApiError(fieldMessage || body?.message || defaultMessage, response.status)
  }

  return body as T
}

export async function listProducts(search: string, status: ProductStatus | "all", signal?: AbortSignal) {
  const query = new URLSearchParams({ per_page: "100" })
  if (search.trim()) query.set("search", search.trim())
  if (status !== "all") query.set("status", status)

  return request<ProductCollectionResponse>(`${PRODUCTS_URL}?${query}`, { signal })
}

export async function createProduct(input: ProductInput) {
  return request<ProductResponse>(PRODUCTS_URL, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateProduct(id: string, input: ProductInput) {
  return request<ProductResponse>(`${PRODUCTS_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export async function deleteProduct(id: string) {
  return request<{ success: boolean }>(`${PRODUCTS_URL}/${id}`, { method: "DELETE" })
}
