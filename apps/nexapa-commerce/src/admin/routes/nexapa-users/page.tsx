import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

type NexapaUser = {
  id: number | string
  name: string
  email: string
  status?: string
  products?: string[]
}

type UsersResponse = {
  users?: NexapaUser[]
  message?: string
}

const NexapaUsersPage = () => {
  const [data, setData] = useState<UsersResponse>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/admin/nexapa/users", { credentials: "include" })
      .then(async (response) => {
        const body = (await response.json()) as UsersResponse
        if (!response.ok) throw new Error(body.message || "Failed to load users")
        setData(body)
      })
      .catch((error: Error) => setData({ message: error.message }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-y-3">
      <div className="rounded-lg border bg-ui-bg-base p-6 shadow-elevation-card-rest">
        <h1 className="text-xl font-semibold">Pengguna Nexapa</h1>
        <p className="mt-1 text-sm text-ui-fg-subtle">
          Akun Publisher, CRM, dan pelanggan commerce dalam satu tampilan.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-ui-bg-base shadow-elevation-card-rest">
        {loading ? (
          <p className="p-6 text-sm text-ui-fg-subtle">Memuat pengguna…</p>
        ) : data.message ? (
          <p className="p-6 text-sm text-ui-fg-error">{data.message}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-ui-bg-subtle">
              <tr>
                <th className="px-6 py-3 font-medium">Nama</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Produk</th>
              </tr>
            </thead>
            <tbody>
              {(data.users || []).map((user) => (
                <tr className="border-b last:border-b-0" key={user.id}>
                  <td className="px-6 py-3">{user.name}</td>
                  <td className="px-6 py-3 text-ui-fg-subtle">{user.email}</td>
                  <td className="px-6 py-3">{user.status || "—"}</td>
                  <td className="px-6 py-3">{user.products?.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Pengguna Nexapa",
})

export default NexapaUsersPage
