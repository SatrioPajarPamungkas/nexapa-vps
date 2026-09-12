/**
 * Adapted from Medusa Community Admin MainLayout.
 * Upstream f8dce55556a1e68d6ea9b2fb88852b2a76fbd73c — MIT.
 */
import { useMemo, useState } from "react"
import {
  Buildings, CogSixTooth, CurrencyDollar, MagnifyingGlass,
  ReceiptPercent, ShoppingCart, Tag, Users,
} from "../third_party/medusa-icons/src"
import { Avatar } from "../third_party/medusa-ui/src/components/avatar"
import { Badge } from "../third_party/medusa-ui/src/components/badge"
import { Button } from "../third_party/medusa-ui/src/components/button"
import { Container } from "../third_party/medusa-ui/src/components/container"
import { Divider } from "../third_party/medusa-ui/src/components/divider"
import { Heading } from "../third_party/medusa-ui/src/components/heading"
import { Table } from "../third_party/medusa-ui/src/components/table"
import { Text } from "../third_party/medusa-ui/src/components/text"

type Product = { id: number; name: string; type: string; price: number; status: "Aktif" | "Draf" }

const nav = [
  { label: "Pesanan", icon: ShoppingCart },
  { label: "Produk", icon: Tag },
  { label: "File Digital", icon: Buildings },
  { label: "Pelanggan", icon: Users },
  { label: "Promosi", icon: ReceiptPercent },
  { label: "Daftar Harga", icon: CurrencyDollar },
]

const initialProducts: Product[] = [
  { id: 1, name: "Template Konten Premium", type: "Template", price: 149000, status: "Aktif" },
  { id: 2, name: "Panduan WhatsApp Marketing", type: "E-book", price: 89000, status: "Aktif" },
  { id: 3, name: "Paket Desain Bisnis", type: "Asset", price: 249000, status: "Draf" },
]

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)

export function App() {
  const [page, setPage] = useState("Produk")
  const [products, setProducts] = useState(initialProducts)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"Semua" | Product["status"]>("Semua")

  const visibleProducts = useMemo(() => products.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase()) &&
    (filter === "Semua" || product.status === filter)
  ), [products, query, filter])

  const addProduct = () => {
    const name = window.prompt("Nama produk digital:")
    if (!name?.trim()) return
    const price = Number(window.prompt("Harga produk:", "100000"))
    const type = window.prompt("Jenis produk:", "File Digital") || "File Digital"
    setProducts((items) => [{ id: Date.now(), name: name.trim(), type, price, status: "Draf" }, ...items])
  }

  const cycleFilter = () =>
    setFilter((value) => value === "Semua" ? "Aktif" : value === "Aktif" ? "Draf" : "Semua")

  return (
    <div className="flex min-h-screen bg-ui-bg-subtle text-ui-fg-base">
      <aside className="bg-ui-bg-subtle border-ui-border-base flex w-[240px] shrink-0 flex-col border-r">
        <button onClick={() => setPage("Produk")} className="hover:bg-ui-bg-subtle-hover m-3 grid grid-cols-[24px_1fr] items-center gap-x-3 rounded-md p-0.5 text-left">
          <Avatar variant="squared" size="xsmall" fallback="N" />
          <Text size="small" weight="plus">Nexapa Commerce</Text>
        </button>
        <div className="px-3"><Divider variant="dashed" /></div>

        <nav className="flex flex-1 flex-col gap-y-1 p-3">
          <label className="text-ui-fg-subtle hover:bg-ui-bg-subtle-hover flex items-center gap-x-2.5 rounded-md px-2 py-1.5">
            <MagnifyingGlass />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage("Produk") }} className="txt-compact-small min-w-0 flex-1 bg-transparent outline-none" placeholder="Pencarian" />
          </label>
          {nav.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => setPage(label)} className={(page === label ? "bg-ui-bg-subtle-hover text-ui-fg-base " : "text-ui-fg-subtle hover:bg-ui-bg-subtle-hover ") + "flex items-center gap-x-2.5 rounded-md px-2 py-1.5 text-left"}>
              <Icon /><Text size="small" weight="plus">{label}</Text>
            </button>
          ))}
        </nav>

        <div className="p-3">
          <button onClick={() => setPage("Pengaturan")} className="text-ui-fg-subtle hover:bg-ui-bg-subtle-hover mb-3 flex w-full items-center gap-x-2.5 rounded-md px-2 py-1.5">
            <CogSixTooth /><Text size="small" weight="plus">Pengaturan</Text>
          </button>
          <Divider variant="dashed" />
          <div className="flex items-center gap-x-3 px-1 py-3">
            <Avatar size="small" fallback="NP" />
            <div><Text size="small" weight="plus">Owner Nexapa</Text><Text size="xsmall" className="text-ui-fg-subtle">Administrator</Text></div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-[1200px]">
          {page === "Produk" ? (
            <Container className="divide-y p-0">
              <div className="flex items-center justify-between px-6 py-4">
                <div><Heading level="h1">Produk</Heading><Text className="text-ui-fg-subtle">Kelola produk digital Nexapa.</Text></div>
                <Button onClick={addProduct}>Tambah produk</Button>
              </div>
              <div className="flex items-center gap-x-2 px-6 py-3">
                <label className="border-ui-border-base bg-ui-bg-field flex h-8 flex-1 items-center gap-x-2 rounded-md border px-2">
                  <MagnifyingGlass className="text-ui-fg-muted" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} className="txt-compact-small h-full flex-1 bg-transparent outline-none" placeholder="Cari produk" />
                </label>
                <Button variant="secondary" onClick={cycleFilter}>Filter: {filter}</Button>
              </div>
              <Table>
                <Table.Header><Table.Row><Table.HeaderCell>Produk</Table.HeaderCell><Table.HeaderCell>Jenis</Table.HeaderCell><Table.HeaderCell>Harga</Table.HeaderCell><Table.HeaderCell>Status</Table.HeaderCell></Table.Row></Table.Header>
                <Table.Body>
                  {visibleProducts.map((product) => (
                    <Table.Row key={product.id}><Table.Cell className="text-ui-fg-base font-medium">{product.name}</Table.Cell><Table.Cell>{product.type}</Table.Cell><Table.Cell>{rupiah(product.price)}</Table.Cell><Table.Cell><Badge size="2xsmall" rounded="full" color={product.status === "Aktif" ? "green" : "grey"}>{product.status}</Badge></Table.Cell></Table.Row>
                  ))}
                  {!visibleProducts.length && <Table.Row><td colSpan={4} className="text-ui-fg-subtle h-12 text-center">Produk tidak ditemukan.</td></Table.Row>}
                </Table.Body>
              </Table>
            </Container>
          ) : (
            <Container>
              <Heading level="h1">{page}</Heading>
              <Text className="text-ui-fg-subtle mt-1">Halaman {page.toLowerCase()} sudah aktif. Data Laravel akan disambungkan berikutnya.</Text>
            </Container>
          )}
        </div>
      </main>
    </div>
  )
}
