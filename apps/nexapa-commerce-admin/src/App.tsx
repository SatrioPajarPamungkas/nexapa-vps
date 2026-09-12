const products = [
  { name: "Template Konten Premium", type: "Template", price: "Rp149.000", sales: 126, status: "Aktif" },
  { name: "Panduan WhatsApp Marketing", type: "E-book", price: "Rp89.000", sales: 84, status: "Aktif" },
  { name: "Paket Desain Bisnis", type: "Asset", price: "Rp249.000", sales: 51, status: "Draf" },
]

const nav = ["Ringkasan", "Produk", "Pesanan", "Pelanggan", "Kupon", "File Digital", "Pengaturan"]

export function App() {
  const apiUrl = import.meta.env.VITE_NEXAPA_API_URL || "https://api.nexapa.app"

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Nexapa Commerce">
          <span className="brand-mark">N</span>
          <span><strong>Nexapa</strong><small>Commerce</small></span>
        </a>

        <nav aria-label="Navigasi utama">
          {nav.map((item, index) => (
            <button className={index === 0 ? "nav-item active" : "nav-item"} key={item}>
              <span className="nav-dot" />
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <span className="avatar">NP</span>
          <span><strong>Owner Nexapa</strong><small>Administrator</small></span>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <p className="eyebrow">TOKO DIGITAL</p>
            <h1>Selamat datang kembali</h1>
            <p className="muted">Pantau penjualan dan kelola produk digital Nexapa.</p>
          </div>
          <button className="primary">+ Tambah produk</button>
        </header>

        <section className="stats" aria-label="Ringkasan penjualan">
          <article><span>Pendapatan</span><strong>Rp12.840.000</strong><small className="positive">↑ 18,2% bulan ini</small></article>
          <article><span>Pesanan</span><strong>261</strong><small className="positive">↑ 12,4% bulan ini</small></article>
          <article><span>Pelanggan</span><strong>198</strong><small>37 pelanggan baru</small></article>
          <article><span>Produk aktif</span><strong>12</strong><small>3 produk draf</small></article>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>Produk terlaris</h2><p className="muted">Produk digital dengan penjualan tertinggi.</p></div>
            <button className="secondary">Lihat semua</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Produk</th><th>Jenis</th><th>Harga</th><th>Terjual</th><th>Status</th></tr></thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.name}>
                    <td><div className="product"><span className="thumb">{product.name.slice(0, 1)}</span><strong>{product.name}</strong></div></td>
                    <td>{product.type}</td><td>{product.price}</td><td>{product.sales}</td>
                    <td><span className={product.status === "Aktif" ? "badge active-badge" : "badge"}>{product.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer>API native: <code>{apiUrl}</code> · Tidak terhubung ke runtime Medusa</footer>
      </main>
    </div>
  )
}
