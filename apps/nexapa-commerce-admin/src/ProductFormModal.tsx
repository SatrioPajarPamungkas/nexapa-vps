/**
 * Adapted from Medusa Community Admin ProductCreate FocusModal flow.
 * Upstream f8dce55556a1e68d6ea9b2fb88852b2a76fbd73c — MIT.
 */
import { FormEvent, useEffect, useState } from "react"
import { CheckCircleSolid, CurrencyDollar, DocumentText, Tag } from "../third_party/medusa-icons/src"
import { Alert } from "../third_party/medusa-ui/src/components/alert"
import { Button } from "../third_party/medusa-ui/src/components/button"
import { Container } from "../third_party/medusa-ui/src/components/container"
import { FocusModal } from "../third_party/medusa-ui/src/components/focus-modal"
import { Heading } from "../third_party/medusa-ui/src/components/heading"
import { Input } from "../third_party/medusa-ui/src/components/input"
import { Label } from "../third_party/medusa-ui/src/components/label"
import { Select } from "../third_party/medusa-ui/src/components/select"
import { Text } from "../third_party/medusa-ui/src/components/text"
import { Textarea } from "../third_party/medusa-ui/src/components/textarea"
import {
  CommerceProduct,
  createProduct,
  ProductInput,
  ProductStatus,
  updateProduct,
} from "./commerce-api"

type ProductFormModalProps = {
  open: boolean
  product: CommerceProduct | null
  onOpenChange: (open: boolean) => void
  onSaved: (product: CommerceProduct) => void
}

const emptyForm: ProductInput = {
  name: "",
  description: null,
  type: "File Digital",
  price_amount: 0,
  currency: "IDR",
  status: "draft",
}

const sectionLinks = [
  { label: "Informasi umum", icon: DocumentText },
  { label: "Organisasi", icon: Tag },
  { label: "Harga & status", icon: CurrencyDollar },
]

export function ProductFormModal({ open, product, onOpenChange, onSaved }: ProductFormModalProps) {
  const [form, setForm] = useState<ProductInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setForm(product ? {
      name: product.name,
      description: product.description,
      type: product.type,
      price_amount: product.price_amount,
      currency: product.currency,
      status: product.status,
    } : emptyForm)
    setError("")
  }, [open, product])

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")

    try {
      const input = {
        ...form,
        name: form.name.trim(),
        type: form.type.trim(),
        description: form.description?.trim() || null,
      }
      const response = product
        ? await updateProduct(product.id, input)
        : await createProduct(input)
      onSaved(response.data)
      onOpenChange(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Produk gagal disimpan.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <form className="flex h-full flex-col" onSubmit={submit}>
          <FocusModal.Header>
            <div className="flex flex-1 items-center justify-between">
              <div>
                <FocusModal.Title asChild>
                  <Heading>{product ? "Edit produk" : "Buat produk"}</Heading>
                </FocusModal.Title>
                <FocusModal.Description asChild>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {product ? product.name : "Tambahkan produk digital baru ke katalog Nexapa"}
                  </Text>
                </FocusModal.Description>
              </div>
              <div className="flex items-center gap-x-2">
                <FocusModal.Close asChild><Button type="button" variant="secondary" size="small">Batal</Button></FocusModal.Close>
                <Button type="submit" size="small" isLoading={saving}>Simpan produk</Button>
              </div>
            </div>
          </FocusModal.Header>

          <FocusModal.Body className="bg-ui-bg-subtle overflow-y-auto">
            <div className="mx-auto grid w-full max-w-[1120px] grid-cols-[220px_minmax(0,1fr)] gap-x-8 px-8 py-10 max-md:grid-cols-1">
              <aside className="max-md:hidden">
                <div className="sticky top-6 space-y-1">
                  {sectionLinks.map(({ label, icon: Icon }, index) => (
                    <a key={label} href={`#product-section-${index}`} className="text-ui-fg-subtle hover:bg-ui-bg-subtle-hover flex items-center gap-x-2 rounded-md px-2 py-1.5">
                      <Icon /><Text size="small" weight="plus">{label}</Text>
                    </a>
                  ))}
                  <div className="mt-6 rounded-lg border p-3">
                    <div className="flex items-center gap-x-2">
                      <CheckCircleSolid className="text-ui-tag-green-icon" />
                      <Text size="small" weight="plus">Laravel native</Text>
                    </div>
                    <Text size="xsmall" className="text-ui-fg-subtle mt-1">Produk tersimpan langsung di database Nexapa.</Text>
                  </div>
                </div>
              </aside>

              <div className="space-y-6">
                {error && <Alert variant="error">{error}</Alert>}

                <Container id="product-section-0" className="divide-y p-0">
                  <div className="px-6 py-4">
                    <Heading>Informasi umum</Heading>
                    <Text size="small" className="text-ui-fg-subtle">Informasi utama yang tampil pada katalog produk.</Text>
                  </div>
                  <div className="space-y-5 px-6 py-5">
                    <div className="space-y-2">
                      <Label htmlFor="product-name" size="small" weight="plus">Nama produk</Label>
                      <Input id="product-name" required maxLength={160} placeholder="Contoh: Template Konten Premium" value={form.name} onChange={(event) => set("name", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-description" size="small" weight="plus">Deskripsi</Label>
                      <Textarea id="product-description" maxLength={10000} rows={7} placeholder="Jelaskan manfaat dan isi produk digital..." value={form.description || ""} onChange={(event) => set("description", event.target.value)} />
                      <Text size="xsmall" className="text-ui-fg-muted text-right">{form.description?.length || 0} / 10.000</Text>
                    </div>
                  </div>
                </Container>

                <Container id="product-section-1" className="divide-y p-0">
                  <div className="px-6 py-4">
                    <Heading>Organisasi</Heading>
                    <Text size="small" className="text-ui-fg-subtle">Kelompokkan produk agar mudah ditemukan.</Text>
                  </div>
                  <div className="grid grid-cols-2 gap-5 px-6 py-5 max-sm:grid-cols-1">
                    <div className="space-y-2">
                      <Label htmlFor="product-type" size="small" weight="plus">Jenis produk</Label>
                      <Input id="product-type" required maxLength={80} placeholder="E-book, Template, Asset..." value={form.type} onChange={(event) => set("type", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">Mata uang</Label>
                      <Select value={form.currency} onValueChange={(value) => set("currency", value)}>
                        <Select.Trigger><Select.Value /></Select.Trigger>
                        <Select.Content><Select.Item value="IDR">IDR — Rupiah Indonesia</Select.Item></Select.Content>
                      </Select>
                    </div>
                  </div>
                </Container>

                <Container id="product-section-2" className="divide-y p-0">
                  <div className="px-6 py-4">
                    <Heading>Harga dan status</Heading>
                    <Text size="small" className="text-ui-fg-subtle">Atur harga jual dan visibilitas produk.</Text>
                  </div>
                  <div className="grid grid-cols-2 gap-5 px-6 py-5 max-sm:grid-cols-1">
                    <div className="space-y-2">
                      <Label htmlFor="product-price" size="small" weight="plus">Harga</Label>
                      <div className="grid grid-cols-[60px_1fr] gap-x-2">
                        <div className="bg-ui-bg-field shadow-borders-base txt-compact-small flex h-8 items-center justify-center rounded-md">Rp</div>
                        <Input id="product-price" required type="number" min={0} step={1} value={form.price_amount} onChange={(event) => set("price_amount", Number(event.target.value))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">Status</Label>
                      <Select value={form.status} onValueChange={(value) => set("status", value as ProductStatus)}>
                        <Select.Trigger><Select.Value /></Select.Trigger>
                        <Select.Content>
                          <Select.Item value="draft">Draf</Select.Item>
                          <Select.Item value="active">Aktif</Select.Item>
                          <Select.Item value="archived">Diarsipkan</Select.Item>
                        </Select.Content>
                      </Select>
                    </div>
                  </div>
                </Container>
              </div>
            </div>
          </FocusModal.Body>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
}
