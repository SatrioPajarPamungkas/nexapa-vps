/**
 * Product list and detail layouts adapted from Medusa Community Admin.
 * Upstream f8dce55556a1e68d6ea9b2fb88852b2a76fbd73c — MIT.
 */
import { useMemo, useState } from "react"
import {
  ArrowLeft, ArrowPath, ArrowRightMini, ChartBar, CheckCircleSolid,
  ChevronLeftMini, ChevronRightMini, CircleDottedLine, CurrencyDollar,
  DocumentText, EllipsisHorizontal, MagnifyingGlass, PencilSquare,
  PlusMini, Tag, TagSolid, Trash,
} from "../third_party/medusa-icons/src"
import { Alert } from "../third_party/medusa-ui/src/components/alert"
import { Button } from "../third_party/medusa-ui/src/components/button"
import { Container } from "../third_party/medusa-ui/src/components/container"
import { DropdownMenu } from "../third_party/medusa-ui/src/components/dropdown-menu"
import { Heading } from "../third_party/medusa-ui/src/components/heading"
import { IconButton } from "../third_party/medusa-ui/src/components/icon-button"
import { Prompt } from "../third_party/medusa-ui/src/components/prompt"
import { Skeleton } from "../third_party/medusa-ui/src/components/skeleton"
import { StatusBadge } from "../third_party/medusa-ui/src/components/status-badge"
import { Table } from "../third_party/medusa-ui/src/components/table"
import { Text } from "../third_party/medusa-ui/src/components/text"
import { CommerceProduct, ProductStatus } from "./commerce-api"

const statusLabels: Record<ProductStatus, string> = {
  active: "Aktif",
  draft: "Draf",
  archived: "Diarsipkan",
}

const statusColors: Record<ProductStatus, "green" | "grey" | "orange"> = {
  active: "green",
  draft: "grey",
  archived: "orange",
}

export const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)

const dateTime = (value: string) => new Intl.DateTimeFormat("id-ID", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(value))

type ProductActions = {
  onCreate: () => void
  onEdit: (product: CommerceProduct) => void
  onDelete: (product: CommerceProduct) => Promise<void>
  onSelect: (product: CommerceProduct) => void
}

type OverviewPageProps = Pick<ProductActions, "onCreate" | "onSelect"> & {
  products: CommerceProduct[]
  loading: boolean
}

function MetricCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: typeof Tag }) {
  return (
    <Container className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <Text size="small" className="text-ui-fg-subtle">{label}</Text>
          <Heading level="h1" className="mt-2 text-2xl">{value}</Heading>
        </div>
        <div className="bg-ui-bg-subtle text-ui-fg-subtle rounded-lg border p-2"><Icon /></div>
      </div>
      <Text size="xsmall" className="text-ui-fg-muted mt-4">{hint}</Text>
    </Container>
  )
}

export function OverviewPage({ products, loading, onCreate, onSelect }: OverviewPageProps) {
  const active = products.filter((product) => product.status === "active")
  const drafts = products.filter((product) => product.status === "draft")
  const catalogValue = active.reduce((total, product) => total + product.price_amount, 0)
  const recent = products.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <Heading level="h1" className="text-xl">Selamat datang di Commerce</Heading>
          <Text className="text-ui-fg-subtle mt-1">Ringkasan katalog digital Nexapa hari ini.</Text>
        </div>
        <Button size="small" onClick={onCreate}><PlusMini />Buat produk</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        <MetricCard label="Total produk" value={loading ? "—" : String(products.length)} hint="Seluruh produk dalam katalog" icon={Tag} />
        <MetricCard label="Produk aktif" value={loading ? "—" : String(active.length)} hint={`${drafts.length} produk masih berupa draf`} icon={CheckCircleSolid} />
        <MetricCard label="Nilai katalog aktif" value={loading ? "—" : rupiah(catalogValue)} hint="Akumulasi harga satu unit per produk" icon={CurrencyDollar} />
      </div>

      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] gap-4 max-lg:grid-cols-1">
        <Container className="divide-y p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div><Heading>Produk terbaru</Heading><Text size="small" className="text-ui-fg-subtle">Perubahan katalog terakhir.</Text></div>
            <Button variant="transparent" size="small" onClick={() => recent[0] && onSelect(recent[0])}>Lihat detail <ArrowRightMini /></Button>
          </div>
          {loading ? (
            <div className="space-y-3 p-6"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          ) : recent.length ? recent.map((product) => (
            <button key={product.id} onClick={() => onSelect(product)} className="hover:bg-ui-bg-subtle-hover grid w-full grid-cols-[36px_1fr_auto] items-center gap-x-3 px-6 py-3 text-left">
              <div className="bg-ui-bg-subtle text-ui-fg-muted flex size-9 items-center justify-center rounded-md border"><TagSolid /></div>
              <div className="min-w-0"><Text size="small" weight="plus" className="truncate">{product.name}</Text><Text size="xsmall" className="text-ui-fg-subtle">{product.type}</Text></div>
              <div className="flex items-center gap-x-3"><Text size="small">{rupiah(product.price_amount)}</Text><StatusBadge color={statusColors[product.status]}>{statusLabels[product.status]}</StatusBadge></div>
            </button>
          )) : <EmptyPanel title="Belum ada produk" description="Buat produk pertama untuk memulai katalog digital Nexapa." action="Buat produk" onAction={onCreate} />}
        </Container>

        <Container className="divide-y p-0">
          <div className="px-6 py-4"><Heading>Kesiapan katalog</Heading><Text size="small" className="text-ui-fg-subtle">Status operasional produk digital.</Text></div>
          <div className="space-y-5 px-6 py-5">
            <ReadinessRow done={products.length > 0} title="Produk dibuat" detail={`${products.length} produk tersimpan`} />
            <ReadinessRow done={active.length > 0} title="Produk diterbitkan" detail={`${active.length} produk aktif`} />
            <ReadinessRow done={false} title="File digital" detail="Hubungkan file private ke produk" />
            <ReadinessRow done={false} title="Pembayaran" detail="Aktifkan payment gateway" />
          </div>
        </Container>
      </div>
    </div>
  )
}

function ReadinessRow({ done, title, detail }: { done: boolean; title: string; detail: string }) {
  const Icon = done ? CheckCircleSolid : CircleDottedLine
  return <div className="flex gap-x-3"><Icon className={done ? "text-ui-tag-green-icon" : "text-ui-fg-muted"} /><div><Text size="small" weight="plus">{title}</Text><Text size="xsmall" className="text-ui-fg-subtle">{detail}</Text></div></div>
}

type ProductListPageProps = ProductActions & {
  products: CommerceProduct[]
  loading: boolean
  error: string
  query: string
  status: ProductStatus | "all"
  onQueryChange: (value: string) => void
  onStatusChange: (value: ProductStatus | "all") => void
  onRefresh: () => void
}

export function ProductListPage({ products, loading, error, query, status, onQueryChange, onStatusChange, onRefresh, onCreate, onEdit, onDelete, onSelect }: ProductListPageProps) {
  const [sort, setSort] = useState<"newest" | "name" | "price">("newest")
  const [page, setPage] = useState(1)
  const perPage = 10
  const sorted = useMemo(() => [...products].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name)
    if (sort === "price") return b.price_amount - a.price_amount
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  }), [products, sort])
  const pageCount = Math.max(1, Math.ceil(sorted.length / perPage))
  const rows = sorted.slice((page - 1) * perPage, page * perPage)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div><Heading level="h1">Produk</Heading><Text size="small" className="text-ui-fg-subtle">Kelola katalog produk digital Nexapa.</Text></div>
        <div className="flex gap-x-2"><Button size="small" variant="secondary" onClick={onRefresh}><ArrowPath />Muat ulang</Button><Button size="small" onClick={onCreate}><PlusMini />Buat produk</Button></div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-6 py-3">
        <label className="bg-ui-bg-field shadow-borders-base flex h-8 min-w-[240px] flex-1 items-center gap-x-2 rounded-md px-2">
          <MagnifyingGlass className="text-ui-fg-muted" />
          <input value={query} onChange={(event) => { onQueryChange(event.target.value); setPage(1) }} className="txt-compact-small h-full flex-1 bg-transparent outline-none" placeholder="Cari nama, handle, atau jenis produk" />
        </label>
        <DropdownMenu>
          <DropdownMenu.Trigger asChild><Button variant="secondary" size="small">Status: {status === "all" ? "Semua" : statusLabels[status]}</Button></DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Label className="px-2 py-1.5">Filter status</DropdownMenu.Label>
            {(["all", "active", "draft", "archived"] as const).map((value) => <DropdownMenu.Item key={value} onClick={() => { onStatusChange(value); setPage(1) }}>{value === "all" ? "Semua status" : statusLabels[value]}</DropdownMenu.Item>)}
          </DropdownMenu.Content>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenu.Trigger asChild><Button variant="secondary" size="small">Urutkan</Button></DropdownMenu.Trigger>
          <DropdownMenu.Content align="end"><DropdownMenu.Item onClick={() => setSort("newest")}>Terakhir diperbarui</DropdownMenu.Item><DropdownMenu.Item onClick={() => setSort("name")}>Nama A–Z</DropdownMenu.Item><DropdownMenu.Item onClick={() => setSort("price")}>Harga tertinggi</DropdownMenu.Item></DropdownMenu.Content>
        </DropdownMenu>
      </div>

      {error && <div className="px-6 py-4"><Alert variant="error">{error}</Alert></div>}

      <div className="overflow-x-auto">
        <Table>
          <Table.Header><Table.Row><Table.HeaderCell>Produk</Table.HeaderCell><Table.HeaderCell>Jenis</Table.HeaderCell><Table.HeaderCell>Harga</Table.HeaderCell><Table.HeaderCell>Status</Table.HeaderCell><Table.HeaderCell>Diperbarui</Table.HeaderCell><Table.HeaderCell><span className="sr-only">Tindakan</span></Table.HeaderCell></Table.Row></Table.Header>
          <Table.Body>
            {rows.map((product) => (
              <Table.Row key={product.id} className="hover:bg-ui-bg-subtle-hover cursor-pointer" onClick={() => onSelect(product)}>
                <Table.Cell><div className="flex items-center gap-x-3"><div className="bg-ui-bg-subtle text-ui-fg-muted flex size-9 shrink-0 items-center justify-center rounded-md border"><TagSolid /></div><div className="min-w-0"><Text size="small" weight="plus" className="max-w-[320px] truncate">{product.name}</Text><Text size="xsmall" className="text-ui-fg-muted">/{product.slug}</Text></div></div></Table.Cell>
                <Table.Cell>{product.type}</Table.Cell><Table.Cell>{rupiah(product.price_amount)}</Table.Cell>
                <Table.Cell><StatusBadge color={statusColors[product.status]}>{statusLabels[product.status]}</StatusBadge></Table.Cell>
                <Table.Cell><Text size="small" className="text-ui-fg-subtle">{dateTime(product.updated_at)}</Text></Table.Cell>
                <Table.Cell onClick={(event) => event.stopPropagation()}><ProductRowMenu product={product} onEdit={onEdit} onDelete={onDelete} /></Table.Cell>
              </Table.Row>
            ))}
            {loading && Array.from({ length: 4 }).map((_, index) => <Table.Row key={index}><td colSpan={6} className="px-6 py-3"><Skeleton className="h-9" /></td></Table.Row>)}
          </Table.Body>
        </Table>
      </div>

      {!loading && !rows.length && <EmptyPanel title="Produk tidak ditemukan" description={query || status !== "all" ? "Ubah pencarian atau filter untuk menemukan produk." : "Buat produk pertama untuk memulai katalog."} action={query || status !== "all" ? undefined : "Buat produk"} onAction={onCreate} />}

      <div className="flex items-center justify-between px-6 py-3">
        <Text size="xsmall" className="text-ui-fg-subtle">{sorted.length} produk</Text>
        <div className="flex items-center gap-x-2"><Text size="xsmall" className="text-ui-fg-subtle">Halaman {Math.min(page, pageCount)} dari {pageCount}</Text><IconButton size="small" variant="transparent" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeftMini /></IconButton><IconButton size="small" variant="transparent" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRightMini /></IconButton></div>
      </div>
    </Container>
  )
}

function ProductRowMenu({ product, onEdit, onDelete }: { product: CommerceProduct; onEdit: ProductActions["onEdit"]; onDelete: ProductActions["onDelete"] }) {
  return <DropdownMenu><DropdownMenu.Trigger asChild><IconButton size="small" variant="transparent"><EllipsisHorizontal /></IconButton></DropdownMenu.Trigger><DropdownMenu.Content align="end"><DropdownMenu.Item onClick={() => onEdit(product)}><PencilSquare className="mr-2" />Edit</DropdownMenu.Item><DropdownMenu.Separator /><Prompt><Prompt.Trigger asChild><DropdownMenu.Item onSelect={(event) => event.preventDefault()}><Trash className="mr-2" />Hapus</DropdownMenu.Item></Prompt.Trigger><Prompt.Content><Prompt.Header><Prompt.Title>Hapus produk?</Prompt.Title><Prompt.Description>Produk “{product.name}” akan dihapus dari katalog. Data masih dapat dipulihkan dari database.</Prompt.Description></Prompt.Header><Prompt.Footer><Prompt.Cancel>Batal</Prompt.Cancel><Prompt.Action onClick={() => onDelete(product)}>Hapus</Prompt.Action></Prompt.Footer></Prompt.Content></Prompt></DropdownMenu.Content></DropdownMenu>
}

type ProductDetailPageProps = Pick<ProductActions, "onEdit" | "onDelete"> & { product: CommerceProduct; onBack: () => void }

export function ProductDetailPage({ product, onBack, onEdit, onDelete }: ProductDetailPageProps) {
  return <div className="space-y-4">
    <button onClick={onBack} className="text-ui-fg-subtle hover:text-ui-fg-base flex items-center gap-x-2"><ArrowLeft /><Text size="small" weight="plus">Kembali ke produk</Text></button>
    <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] gap-4 max-lg:grid-cols-1">
      <div className="space-y-4">
        <Container className="divide-y p-0">
          <div className="flex items-center justify-between px-6 py-4"><div><Heading level="h1">{product.name}</Heading><Text size="small" className="text-ui-fg-subtle">/{product.slug}</Text></div><div className="flex items-center gap-x-2"><StatusBadge color={statusColors[product.status]}>{statusLabels[product.status]}</StatusBadge><Button size="small" variant="secondary" onClick={() => onEdit(product)}><PencilSquare />Edit</Button></div></div>
          <SectionRow label="Deskripsi" value={product.description || "Belum ada deskripsi."} multiline />
          <SectionRow label="Jenis produk" value={product.type} />
          <SectionRow label="Handle" value={`/${product.slug}`} />
        </Container>
        <Container className="divide-y p-0"><div className="px-6 py-4"><Heading>Harga</Heading><Text size="small" className="text-ui-fg-subtle">Harga jual utama produk.</Text></div><SectionRow label="Harga IDR" value={rupiah(product.price_amount)} /><SectionRow label="Mata uang" value={product.currency} /></Container>
        <Container className="divide-y p-0"><div className="px-6 py-4"><Heading>Pengiriman digital</Heading><Text size="small" className="text-ui-fg-subtle">File akan dikirim melalui entitlement dan tautan unduhan bertanda tangan.</Text></div><div className="flex items-center gap-x-3 px-6 py-5"><div className="bg-ui-bg-subtle text-ui-fg-muted rounded-lg border p-2"><DocumentText /></div><div><Text size="small" weight="plus">Belum ada file terhubung</Text><Text size="xsmall" className="text-ui-fg-subtle">Tambahkan file melalui menu File Digital setelah modul penyimpanan private aktif.</Text></div></div></Container>
      </div>
      <div className="space-y-4">
        <Container className="divide-y p-0"><div className="px-6 py-4"><Heading>Organisasi</Heading></div><SectionRow label="Status" value={statusLabels[product.status]} /><SectionRow label="Jenis" value={product.type} /><SectionRow label="Produk ID" value={product.id} /></Container>
        <Container className="divide-y p-0"><div className="px-6 py-4"><Heading>Linimasa</Heading></div><SectionRow label="Dibuat" value={dateTime(product.created_at)} /><SectionRow label="Diperbarui" value={dateTime(product.updated_at)} />{product.published_at && <SectionRow label="Diterbitkan" value={dateTime(product.published_at)} />}</Container>
        <Container className="p-4"><Prompt><Prompt.Trigger asChild><Button variant="danger" className="w-full"><Trash />Hapus produk</Button></Prompt.Trigger><Prompt.Content><Prompt.Header><Prompt.Title>Hapus produk?</Prompt.Title><Prompt.Description>Produk “{product.name}” akan dihapus dari katalog.</Prompt.Description></Prompt.Header><Prompt.Footer><Prompt.Cancel>Batal</Prompt.Cancel><Prompt.Action onClick={() => onDelete(product)}>Hapus</Prompt.Action></Prompt.Footer></Prompt.Content></Prompt></Container>
      </div>
    </div>
  </div>
}

function SectionRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return <div className={`grid grid-cols-[180px_1fr] gap-x-4 px-6 py-4 ${multiline ? "items-start" : "items-center"}`}><Text size="small" className="text-ui-fg-subtle">{label}</Text><Text size="small" className={multiline ? "whitespace-pre-wrap leading-6" : "break-all"}>{value}</Text></div>
}

export function EmptyDomainPage({ title, description, icon: Icon }: { title: string; description: string; icon: typeof Tag }) {
  return <Container className="flex min-h-[520px] items-center justify-center"><div className="flex max-w-[360px] flex-col items-center text-center"><div className="bg-ui-bg-subtle text-ui-fg-muted mb-5 flex size-12 items-center justify-center rounded-xl border"><Icon /></div><Heading level="h1">{title}</Heading><Text size="small" className="text-ui-fg-subtle mt-2">{description}</Text><StatusBadge color="blue" className="mt-5">Siap untuk data pertama</StatusBadge></div></Container>
}

function EmptyPanel({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction: () => void }) {
  return <div className="flex flex-col items-center px-6 py-12 text-center"><div className="bg-ui-bg-subtle text-ui-fg-muted mb-3 flex size-10 items-center justify-center rounded-lg border"><Tag /></div><Text size="small" weight="plus">{title}</Text><Text size="xsmall" className="text-ui-fg-subtle mt-1 max-w-[300px]">{description}</Text>{action && <Button size="small" variant="secondary" className="mt-4" onClick={onAction}>{action}</Button>}</div>
}

export const domainIcons = { orders: ChartBar, files: DocumentText, customers: Tag, promotions: CurrencyDollar }
