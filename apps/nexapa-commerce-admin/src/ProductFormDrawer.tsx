import { FormEvent, useEffect, useState } from "react"
import { Alert } from "../third_party/medusa-ui/src/components/alert"
import { Button } from "../third_party/medusa-ui/src/components/button"
import { Drawer } from "../third_party/medusa-ui/src/components/drawer"
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

type Props = {
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

export function ProductFormDrawer({ open, product, onOpenChange, onSaved }: Props) {
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
      const input = { ...form, description: form.description?.trim() || null }
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <form className="flex h-full flex-col" onSubmit={submit}>
          <Drawer.Header>
            <Drawer.Title asChild><Heading>{product ? "Edit produk" : "Tambah produk"}</Heading></Drawer.Title>
            <Drawer.Description>
              {product ? "Perbarui informasi produk digital Nexapa." : "Buat produk digital baru di katalog Nexapa."}
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="space-y-5 overflow-y-auto">
            {error && <Alert variant="error">{error}</Alert>}

            <div className="space-y-2">
              <Label htmlFor="product-name" size="small" weight="plus">Nama</Label>
              <Input id="product-name" required maxLength={160} value={form.name} onChange={(event) => set("name", event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description" size="small" weight="plus">Deskripsi</Label>
              <Textarea id="product-description" maxLength={10000} rows={5} value={form.description || ""} onChange={(event) => set("description", event.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-type" size="small" weight="plus">Jenis</Label>
                <Input id="product-type" required maxLength={80} value={form.type} onChange={(event) => set("type", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-price" size="small" weight="plus">Harga (IDR)</Label>
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
              <Text size="xsmall" className="text-ui-fg-subtle">Produk aktif langsung tersedia untuk tahap storefront berikutnya.</Text>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild><Button type="button" variant="secondary">Batal</Button></Drawer.Close>
            <Button type="submit" isLoading={saving}>Simpan</Button>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer>
  )
}
