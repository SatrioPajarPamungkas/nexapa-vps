/**
 * Adapted from Medusa Community Admin MainLayout.
 * Upstream f8dce55556a1e68d6ea9b2fb88852b2a76fbd73c — MIT.
 */
import { useEffect, useState } from "react"
import {
  Buildings, CogSixTooth, CurrencyDollar, MagnifyingGlass,
  PencilSquare, ReceiptPercent, ShoppingCart, Tag, Trash, Users,
} from "../third_party/medusa-icons/src"
import { Alert } from "../third_party/medusa-ui/src/components/alert"
import { Avatar } from "../third_party/medusa-ui/src/components/avatar"
import { Badge } from "../third_party/medusa-ui/src/components/badge"
import { Button } from "../third_party/medusa-ui/src/components/button"
import { Container } from "../third_party/medusa-ui/src/components/container"
import { Divider } from "../third_party/medusa-ui/src/components/divider"
import { Heading } from "../third_party/medusa-ui/src/components/heading"
import { IconButton } from "../third_party/medusa-ui/src/components/icon-button"
import { Prompt } from "../third_party/medusa-ui/src/components/prompt"
import { Table } from "../third_party/medusa-ui/src/components/table"
import { Text } from "../third_party/medusa-ui/src/components/text"
import {
  CommerceProduct,
  deleteProduct,
  listProducts,
  ProductStatus,
} from "./commerce-api"
import { ProductFormDrawer } from "./ProductFormDrawer"

const nav = [
  { label: "Pesanan", icon: ShoppingCart },
  { label: "Produk", icon: Tag },
  { label: "File Digital", icon: Buildings },
  { label: "Pelanggan", icon: Users },
  { label: "Promosi", icon: ReceiptPercent },
  { label: "Daftar Harga", icon: CurrencyDollar },
]

const statusLabels: Record<ProductStatus, string> = {
  active: "Aktif",
  draft: "Draf",
  archived: "Diarsipkan",
}

const filters: Array<{ value: ProductStatus | "all"; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "draft", label: "Draf" },
  { value: "archived", label: "Diarsipkan" },
]

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)

export function App() {
  const [page, setPage] = useState("Produk")
  const [products, setProducts] = useState<CommerceProduct[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ProductStatus | "all">("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<CommerceProduct | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError("")
      try {
        const response = await listProducts(query, filter, controller.signal)
        setProducts(response.data)
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Produk gagal dimuat.")
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, filter])

  const cycleFilter = () => {
    const index = filters.findIndex((item) => item.value === filter)
    setFilter(filters[(index + 1) % filters.length].value)
  }

  const openCreate = () => {
    setEditingProduct(null)
    setDrawerOpen(true)
  }

  const openEdit = (product: CommerceProduct) => {
    setEditingProduct(product)
    setDrawerOpen(true)
  }

  const productSaved = (product: CommerceProduct) => {
    setProducts((items) => {
      const exists = items.some((item) => item.id === product.id)
      return exists
        ? items.map((item) => item.id === product.id ? product : item)
        : [product, ...items]
    })
  }

  const removeProduct = async (product: CommerceProduct) => {
    setDeletingId(product.id)
    setError("")
    try {
      await deleteProduct(product.id)
      setProducts((items) => items.filter((item) => item.id !== product.id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Produk gagal dihapus.")
    } finally {
      setDeletingId(null)
    }
  }

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
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage("Produk") }} className="txt-compact-small min-w-0 flex-1 bg-transparent outline-none" placeholder="Pencarian" />
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
                <Button onClick={openCreate}>Tambah produk</Button>
              </div>
              <div className="flex items-center gap-x-2 px-6 py-3">
                <label className="border-ui-border-base bg-ui-bg-field flex h-8 flex-1 items-center gap-x-2 rounded-md border px-2">
                  <MagnifyingGlass className="text-ui-fg-muted" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} className="txt-compact-small h-full flex-1 bg-transparent outline-none" placeholder="Cari produk" />
                </label>
                <Button variant="secondary" onClick={cycleFilter}>Filter: {filters.find((item) => item.value === filter)?.label}</Button>
              </div>
              {error && <div className="px-6 py-4"><Alert variant="error">{error}</Alert></div>}
              <Table>
                <Table.Header><Table.Row><Table.HeaderCell>Produk</Table.HeaderCell><Table.HeaderCell>Jenis</Table.HeaderCell><Table.HeaderCell>Harga</Table.HeaderCell><Table.HeaderCell>Status</Table.HeaderCell><Table.HeaderCell><span className="sr-only">Tindakan</span></Table.HeaderCell></Table.Row></Table.Header>
                <Table.Body>
                  {products.map((product) => (
                    <Table.Row key={product.id}>
                      <Table.Cell className="text-ui-fg-base font-medium">{product.name}</Table.Cell>
                      <Table.Cell>{product.type}</Table.Cell>
                      <Table.Cell>{rupiah(product.price_amount)}</Table.Cell>
                      <Table.Cell><Badge size="2xsmall" rounded="full" color={product.status === "active" ? "green" : "grey"}>{statusLabels[product.status]}</Badge></Table.Cell>
                      <Table.Cell>
                        <div className="flex justify-end gap-x-1">
                          <IconButton size="small" variant="transparent" title={`Edit ${product.name}`} onClick={() => openEdit(product)}><PencilSquare /></IconButton>
                          <Prompt>
                            <Prompt.Trigger asChild><IconButton size="small" variant="transparent" title={`Hapus ${product.name}`}><Trash /></IconButton></Prompt.Trigger>
                            <Prompt.Content>
                              <Prompt.Header><Prompt.Title>Hapus produk?</Prompt.Title><Prompt.Description>Produk “{product.name}” akan dihapus dari katalog. Tindakan ini dapat dipulihkan dari database.</Prompt.Description></Prompt.Header>
                              <Prompt.Footer><Prompt.Cancel>Batal</Prompt.Cancel><Prompt.Action disabled={deletingId === product.id} onClick={() => removeProduct(product)}>Hapus</Prompt.Action></Prompt.Footer>
                            </Prompt.Content>
                          </Prompt>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                  {!loading && !products.length && <Table.Row><td colSpan={5} className="text-ui-fg-subtle h-12 text-center">Produk tidak ditemukan.</td></Table.Row>}
                  {loading && <Table.Row><td colSpan={5} className="text-ui-fg-subtle h-12 text-center">Memuat produk…</td></Table.Row>}
                </Table.Body>
              </Table>
            </Container>
          ) : (
            <Container>
              <Heading level="h1">{page}</Heading>
              <Text className="text-ui-fg-subtle mt-1">Halaman {page.toLowerCase()} sudah aktif. Modul Laravel akan disambungkan pada tahap berikutnya.</Text>
            </Container>
          )}
        </div>
      </main>

      <ProductFormDrawer open={drawerOpen} product={editingProduct} onOpenChange={setDrawerOpen} onSaved={productSaved} />
    </div>
  )
}
