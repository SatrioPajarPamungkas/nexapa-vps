/**
 * Runtime shell adapted from Medusa Community Admin MainLayout.
 * Upstream: packages/admin/dashboard/src/components/layout/main-layout/main-layout.tsx
 * Commit: f8dce55556a1e68d6ea9b2fb88852b2a76fbd73c
 * License: MIT. Enterprise paths are not included.
 */
import {
  Buildings,
  CogSixTooth,
  CurrencyDollar,
  MagnifyingGlass,
  ReceiptPercent,
  ShoppingCart,
  Tag,
  Users,
} from "../third_party/medusa-icons/src"
import { Avatar } from "../third_party/medusa-ui/src/components/avatar"
import { Badge } from "../third_party/medusa-ui/src/components/badge"
import { Button } from "../third_party/medusa-ui/src/components/button"
import { Container } from "../third_party/medusa-ui/src/components/container"
import { Divider } from "../third_party/medusa-ui/src/components/divider"
import { Heading } from "../third_party/medusa-ui/src/components/heading"
import { Table } from "../third_party/medusa-ui/src/components/table"
import { Text } from "../third_party/medusa-ui/src/components/text"

const routes = [
  { label: "Pesanan", icon: ShoppingCart },
  { label: "Produk", icon: Tag },
  { label: "File Digital", icon: Buildings },
  { label: "Pelanggan", icon: Users },
  { label: "Promosi", icon: ReceiptPercent },
  { label: "Daftar Harga", icon: CurrencyDollar },
]

const products = [
  { name: "Template Konten Premium", type: "Template", price: "Rp149.000", status: "Aktif" },
  { name: "Panduan WhatsApp Marketing", type: "E-book", price: "Rp89.000", status: "Aktif" },
  { name: "Paket Desain Bisnis", type: "Asset", price: "Rp249.000", status: "Draf" },
]

export function App() {
  return (
    <div className="flex min-h-screen bg-ui-bg-subtle text-ui-fg-base">
      <aside className="bg-ui-bg-subtle border-ui-border-base flex w-[240px] shrink-0 flex-col border-r">
        <div className="p-3">
          <button className="hover:bg-ui-bg-subtle-hover grid w-full grid-cols-[24px_1fr] items-center gap-x-3 rounded-md p-0.5 text-left">
            <Avatar variant="squared" size="xsmall" fallback="N" />
            <Text size="small" weight="plus" leading="compact">Nexapa Commerce</Text>
          </button>
        </div>
        <div className="px-3"><Divider variant="dashed" /></div>

        <nav className="flex flex-1 flex-col gap-y-1 p-3">
          <button className="bg-ui-bg-subtle text-ui-fg-subtle hover:bg-ui-bg-subtle-hover flex items-center gap-x-2.5 rounded-md px-2 py-1.5 text-left">
            <MagnifyingGlass />
            <Text size="small" weight="plus">Pencarian</Text>
            <Text size="small" className="text-ui-fg-muted ml-auto">⌘K</Text>
          </button>
          {routes.map(({ label, icon: Icon }, index) => (
            <button key={label} className={index === 1
              ? "bg-ui-bg-subtle-hover text-ui-fg-base flex items-center gap-x-2.5 rounded-md px-2 py-1.5 text-left"
              : "text-ui-fg-subtle hover:bg-ui-bg-subtle-hover flex items-center gap-x-2.5 rounded-md px-2 py-1.5 text-left"
            }>
              <Icon />
              <Text size="small" weight="plus">{label}</Text>
            </button>
          ))}
        </nav>

        <div className="p-3">
          <button className="text-ui-fg-subtle hover:bg-ui-bg-subtle-hover mb-3 flex w-full items-center gap-x-2.5 rounded-md px-2 py-1.5">
            <CogSixTooth />
            <Text size="small" weight="plus">Pengaturan</Text>
          </button>
          <Divider variant="dashed" />
          <div className="flex items-center gap-x-3 px-1 py-3">
            <Avatar size="small" fallback="NP" />
            <div className="flex flex-col">
              <Text size="small" weight="plus" leading="compact">Owner Nexapa</Text>
              <Text size="xsmall" className="text-ui-fg-subtle">Administrator</Text>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col p-8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-y-4">
          <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <Heading level="h1">Produk</Heading>
                <Text className="text-ui-fg-subtle">Kelola produk digital Nexapa.</Text>
              </div>
              <Button>Tambah produk</Button>
            </div>

            <div className="flex items-center gap-x-2 px-6 py-3">
              <div className="border-ui-border-base bg-ui-bg-field flex h-8 flex-1 items-center gap-x-2 rounded-md border px-2">
                <MagnifyingGlass className="text-ui-fg-muted" />
                <input className="txt-compact-small h-full flex-1 bg-transparent outline-none" placeholder="Cari produk" />
              </div>
              <Button variant="secondary">Filter</Button>
            </div>

            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Produk</Table.HeaderCell>
                  <Table.HeaderCell>Jenis</Table.HeaderCell>
                  <Table.HeaderCell>Harga</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {products.map((product) => (
                  <Table.Row key={product.name}>
                    <Table.Cell className="text-ui-fg-base font-medium">{product.name}</Table.Cell>
                    <Table.Cell>{product.type}</Table.Cell>
                    <Table.Cell>{product.price}</Table.Cell>
                    <Table.Cell>
                      <Badge size="2xsmall" rounded="full" color={product.status === "Aktif" ? "green" : "grey"}>
                        {product.status}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Container>
        </div>
      </main>
    </div>
  )
}
