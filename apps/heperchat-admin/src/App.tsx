/**
 * Nexapa Commerce shell adapted from Medusa Community Admin MainLayout.
 * Upstream f8dce55556a1e68d6ea9b2fb88852b2a76fbd73c — MIT.
 */
import { useCallback, useEffect, useState } from "react"
import {
  Buildings, ChartBar, CogSixTooth, CurrencyDollar, DocumentText,
  MagnifyingGlass, ReceiptPercent, ShoppingCart, Tag, Users,
} from "../third_party/medusa-icons/src"
import { Avatar } from "../third_party/medusa-ui/src/components/avatar"
import { Badge } from "../third_party/medusa-ui/src/components/badge"
import { Divider } from "../third_party/medusa-ui/src/components/divider"
import { DropdownMenu } from "../third_party/medusa-ui/src/components/dropdown-menu"
import { Skeleton } from "../third_party/medusa-ui/src/components/skeleton"
import { Text } from "../third_party/medusa-ui/src/components/text"
import {
  AdminUser, CommerceApiError, CommerceProduct, currentUser,
  deleteProduct, listProducts, logout, ProductStatus,
} from "./commerce-api"
import { LoginPage } from "./LoginPage"
import { ProductFormModal } from "./ProductFormModal"
import {
  EmptyDomainPage, OverviewPage, ProductDetailPage, ProductListPage,
} from "./ProductPages"

type Page = "overview" | "orders" | "products" | "files" | "customers" | "promotions" | "pricing" | "settings" | "product-detail"

const navigation: Array<{ label: string; page: Page; icon: typeof Tag; group: "Commerce" | "Kelola" }> = [
  { label: "Overview", page: "overview", icon: ChartBar, group: "Commerce" },
  { label: "Pesanan", page: "orders", icon: ShoppingCart, group: "Commerce" },
  { label: "Produk", page: "products", icon: Tag, group: "Commerce" },
  { label: "File Digital", page: "files", icon: DocumentText, group: "Commerce" },
  { label: "Pelanggan", page: "customers", icon: Users, group: "Kelola" },
  { label: "Promosi", page: "promotions", icon: ReceiptPercent, group: "Kelola" },
  { label: "Daftar Harga", page: "pricing", icon: CurrencyDollar, group: "Kelola" },
]

const pageTitles: Record<Page, string> = {
  overview: "Overview", orders: "Pesanan", products: "Produk", files: "File Digital",
  customers: "Pelanggan", promotions: "Promosi", pricing: "Daftar Harga",
  settings: "Pengaturan", "product-detail": "Detail Produk",
}

export function App() {
  const [auth, setAuth] = useState<"checking" | "guest" | "ready">("checking")
  const [user, setUser] = useState<AdminUser | null>(null)
  const [page, setPage] = useState<Page>("overview")
  const [products, setProducts] = useState<CommerceProduct[]>([])
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<ProductStatus | "all">("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<CommerceProduct | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<CommerceProduct | null>(null)

  useEffect(() => {
    currentUser()
      .then((response) => {
        if (response.data.user.is_admin) {
          setUser(response.data.user)
          setAuth("ready")
        } else {
          setAuth("guest")
        }
      })
      .catch(() => setAuth("guest"))
  }, [])

  useEffect(() => {
    if (auth !== "ready") return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError("")
      try {
        const response = await listProducts(query, status, controller.signal)
        setProducts(response.data)
      } catch (caught) {
        if (controller.signal.aborted) return
        if (caught instanceof CommerceApiError && caught.status === 401) {
          setUser(null)
          setAuth("guest")
          return
        }
        setError(caught instanceof Error ? caught.message : "Produk gagal dimuat.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [auth, query, status, refreshKey])

  const openCreate = useCallback(() => {
    setEditingProduct(null)
    setEditorOpen(true)
  }, [])

  const openEdit = useCallback((product: CommerceProduct) => {
    setEditingProduct(product)
    setEditorOpen(true)
  }, [])

  const selectProduct = useCallback((product: CommerceProduct) => {
    setSelectedProduct(product)
    setPage("product-detail")
  }, [])

  const productSaved = (product: CommerceProduct) => {
    setProducts((items) => items.some((item) => item.id === product.id)
      ? items.map((item) => item.id === product.id ? product : item)
      : [product, ...items])
    if (selectedProduct?.id === product.id) setSelectedProduct(product)
  }

  const removeProduct = async (product: CommerceProduct) => {
    setError("")
    try {
      await deleteProduct(product.id)
      setProducts((items) => items.filter((item) => item.id !== product.id))
      if (selectedProduct?.id === product.id) {
        setSelectedProduct(null)
        setPage("products")
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Produk gagal dihapus.")
    }
  }

  const signOut = async () => {
    try { await logout() } finally {
      setUser(null)
      setProducts([])
      setAuth("guest")
    }
  }

  if (auth === "checking") {
    return <div className="bg-ui-bg-subtle flex min-h-dvh items-center justify-center"><div className="flex w-[280px] flex-col items-center gap-y-4"><Avatar variant="squared" size="large" fallback="N" /><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-48" /></div></div>
  }

  if (auth === "guest" || !user) {
    return <LoginPage onAuthenticated={(authenticatedUser) => { setUser(authenticatedUser); setAuth("ready") }} />
  }

  return (
    <div className="bg-ui-bg-subtle flex min-h-dvh text-ui-fg-base">
      <aside className="border-ui-border-base bg-ui-bg-subtle fixed inset-y-0 left-0 z-20 flex w-[250px] flex-col border-r">
        <div className="p-3">
          <button onClick={() => setPage("overview")} className="hover:bg-ui-bg-subtle-hover flex w-full items-center gap-x-3 rounded-md p-1.5 text-left">
            <Avatar variant="squared" size="small" fallback="N" />
            <div className="min-w-0"><Text size="small" weight="plus">Nexapa Commerce</Text><Text size="xsmall" className="text-ui-fg-muted">Digital products</Text></div>
          </button>
        </div>
        <div className="px-3"><Divider variant="dashed" /></div>

        <div className="px-3 pt-3">
          <button onClick={() => setPage("products")} className="bg-ui-bg-field shadow-borders-base text-ui-fg-subtle flex h-8 w-full items-center gap-x-2 rounded-md px-2 text-left">
            <MagnifyingGlass /><Text size="small">Cari di Commerce</Text><span className="text-ui-fg-muted txt-compact-xsmall ml-auto rounded border px-1.5">⌘K</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {(["Commerce", "Kelola"] as const).map((group) => (
            <div key={group} className="mb-5">
              <Text size="xsmall" weight="plus" className="text-ui-fg-muted mb-1 block px-2 uppercase tracking-wide">{group}</Text>
              <div className="space-y-0.5">
                {navigation.filter((item) => item.group === group).map(({ label, page: itemPage, icon: Icon }) => {
                  const active = page === itemPage || (itemPage === "products" && page === "product-detail")
                  return <button key={itemPage} onClick={() => setPage(itemPage)} className={(active ? "bg-ui-bg-subtle-hover text-ui-fg-base " : "text-ui-fg-subtle hover:bg-ui-bg-subtle-hover ") + "flex w-full items-center gap-x-2.5 rounded-md px-2 py-1.5 text-left"}><Icon /><Text size="small" weight="plus">{label}</Text>{itemPage === "products" && products.length > 0 && <Badge size="2xsmall" className="ml-auto">{products.length}</Badge>}</button>
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3">
          <button onClick={() => setPage("settings")} className={(page === "settings" ? "bg-ui-bg-subtle-hover text-ui-fg-base " : "text-ui-fg-subtle hover:bg-ui-bg-subtle-hover ") + "mb-3 flex w-full items-center gap-x-2.5 rounded-md px-2 py-1.5 text-left"}><CogSixTooth /><Text size="small" weight="plus">Pengaturan</Text></button>
          <Divider variant="dashed" />
          <DropdownMenu>
            <DropdownMenu.Trigger asChild><button className="hover:bg-ui-bg-subtle-hover mt-3 flex w-full items-center gap-x-3 rounded-md p-1 text-left"><Avatar size="small" fallback={user.name.slice(0, 2).toUpperCase()} /><div className="min-w-0"><Text size="small" weight="plus" className="truncate">{user.name}</Text><Text size="xsmall" className="text-ui-fg-muted truncate">{user.email}</Text></div></button></DropdownMenu.Trigger>
            <DropdownMenu.Content align="start" side="top"><DropdownMenu.Label className="px-2 py-1.5">Administrator</DropdownMenu.Label><DropdownMenu.Separator /><DropdownMenu.Item onClick={signOut}>Keluar dari Commerce</DropdownMenu.Item></DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pl-[250px]">
        <header className="border-ui-border-base bg-ui-bg-base/80 sticky top-0 z-10 flex h-12 items-center border-b px-6 backdrop-blur">
          <Text size="small" className="text-ui-fg-muted">Nexapa</Text><span className="text-ui-fg-muted mx-2">/</span><Text size="small" weight="plus">{pageTitles[page]}</Text>
          <div className="ml-auto flex items-center gap-x-2"><span className="bg-ui-bg-subtle text-ui-fg-subtle txt-compact-xsmall rounded-md border px-2 py-1">Production</span><div className="size-2 rounded-full bg-ui-tag-green-icon" /></div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] p-6 lg:p-8">
          {page === "overview" && <OverviewPage products={products} loading={loading} onCreate={openCreate} onSelect={selectProduct} />}
          {page === "products" && <ProductListPage products={products} loading={loading} error={error} query={query} status={status} onQueryChange={setQuery} onStatusChange={setStatus} onRefresh={() => setRefreshKey((value) => value + 1)} onCreate={openCreate} onEdit={openEdit} onDelete={removeProduct} onSelect={selectProduct} />}
          {page === "product-detail" && selectedProduct && <ProductDetailPage product={selectedProduct} onBack={() => setPage("products")} onEdit={openEdit} onDelete={removeProduct} />}
          {page === "orders" && <EmptyDomainPage title="Belum ada pesanan" description="Pesanan produk digital akan muncul di sini setelah checkout dan payment webhook aktif." icon={ShoppingCart} />}
          {page === "files" && <EmptyDomainPage title="Belum ada file digital" description="File private dan entitlement unduhan akan dikelola secara aman dari halaman ini." icon={DocumentText} />}
          {page === "customers" && <EmptyDomainPage title="Belum ada pelanggan" description="Profil pelanggan terbentuk otomatis setelah transaksi pertama." icon={Users} />}
          {page === "promotions" && <EmptyDomainPage title="Belum ada promosi" description="Kode diskon dan kampanye Commerce akan dikelola dari halaman ini." icon={ReceiptPercent} />}
          {page === "pricing" && <EmptyDomainPage title="Daftar harga utama" description="Semua produk saat ini menggunakan harga IDR yang ditetapkan pada katalog." icon={CurrencyDollar} />}
          {page === "settings" && <EmptyDomainPage title="Commerce terhubung" description={`Sesi administrator ${user.email} terhubung ke Laravel Nexapa API.`} icon={Buildings} />}
        </main>
      </div>

      <ProductFormModal open={editorOpen} product={editingProduct} onOpenChange={setEditorOpen} onSaved={productSaved} />
    </div>
  )
}
