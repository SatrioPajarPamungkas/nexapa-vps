# Nexapa

<p align="center">
  <strong>Platform terpadu untuk publikasi konten dan pengelolaan komunikasi bisnis.</strong>
</p>

<p align="center">
  <a href="https://nexapa.app">Website</a> ·
  <a href="https://app.nexapa.app">Publisher</a> ·
  <a href="https://crm.nexapa.app">CRM</a> ·
  <a href="https://api.nexapa.app">API</a>
</p>

---

## Tentang Nexapa

Nexapa membantu bisnis mengelola publikasi konten lintas platform dan komunikasi pelanggan dalam satu ekosistem. Repository ini berisi aplikasi web Publisher, backend API, serta CRM WhatsApp yang digunakan pada lingkungan produksi Nexapa.

## Produk

| Layanan | URL | Keterangan |
| --- | --- | --- |
| Website | [nexapa.app](https://nexapa.app) | Informasi produk dan bisnis Nexapa |
| Publisher | [app.nexapa.app](https://app.nexapa.app) | Pengelolaan akun dan publikasi konten |
| CRM | [crm.nexapa.app](https://crm.nexapa.app) | Inbox, kontak, pipeline, broadcast, dan otomasi WhatsApp |
| API | [api.nexapa.app](https://api.nexapa.app) | Backend dan integrasi layanan Nexapa |

## Fitur Utama

### Publisher

- Menghubungkan akun platform yang didukung.
- Membuat dan mempublikasikan konten dari satu dashboard.
- Memilih akun tujuan untuk setiap publikasi.
- Mengelola status koneksi akun secara terpusat.

### CRM WhatsApp

- Mendukung beberapa nomor WhatsApp dalam satu akun pengguna.
- Memisahkan sinkronisasi percakapan berdasarkan nomor WhatsApp.
- Shared inbox untuk pengelolaan percakapan tim.
- Manajemen kontak, label, dan data pelanggan.
- Pipeline penjualan dan pengelolaan deal.
- Broadcast menggunakan template WhatsApp.
- Otomasi alur kerja dan bantuan balasan berbasis AI.
- Penghapusan akun WhatsApp beserta data terkait secara permanen.

## Arsitektur

```text
apps/
├── nexapa-web/   # Publisher — React, TypeScript, Vite
├── nexapa-api/   # Backend API — Laravel, PHP
└── nexapa-crm/   # WhatsApp CRM — Next.js, React, Supabase
```

## Teknologi

| Komponen | Teknologi |
| --- | --- |
| Publisher | React 19, TypeScript, Vite, Tailwind CSS |
| API | Laravel 13, PHP 8.3, Laravel Sanctum, Filament |
| CRM | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Data dan autentikasi CRM | Supabase |
| Web server produksi | Nginx |
| Process management | systemd |
| SSL | Let's Encrypt / Certbot |

## Menjalankan Secara Lokal

### Persyaratan

- Node.js 20 atau lebih baru
- npm
- PHP 8.3 atau lebih baru
- Composer
- Database dan kredensial layanan yang diperlukan

### Publisher

```bash
cd apps/nexapa-web
npm install
npm run dev
```

### API

```bash
cd apps/nexapa-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Jangan memasukkan kredensial produksi ke dalam file yang dilacak Git. Sesuaikan konfigurasi lokal melalui file environment masing-masing aplikasi.

### CRM

```bash
cd apps/nexapa-crm
npm install
cp .env.local.example .env.local
npm run dev
```

## Pemeriksaan Kualitas

### Publisher

```bash
cd apps/nexapa-web
npm run lint
npm run build
```

### API

```bash
cd apps/nexapa-api
composer test
```

### CRM

```bash
cd apps/nexapa-crm
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment

Lingkungan produksi Nexapa menggunakan Nginx, PHP-FPM, Laravel queue worker, dan service systemd untuk aplikasi Node.js. Pastikan migrasi database, build aplikasi, konfigurasi environment, worker queue, serta health check seluruh domain selesai sebelum deployment dinyatakan berhasil.

## Keamanan

- Jangan pernah melakukan commit terhadap file `.env`, token akses, private key, atau kredensial layanan.
- Gunakan kredensial berbeda untuk development, staging, dan production.
- Batasi izin token sesuai kebutuhan minimum.
- Rotasi kredensial segera apabila terindikasi terekspos.
- Verifikasi webhook dan gunakan HTTPS pada seluruh endpoint publik.

## Hak Penggunaan

Repository ini merupakan proyek internal Nexapa. Seluruh hak cipta dan hak penggunaan dimiliki oleh Nexapa kecuali komponen pihak ketiga yang memiliki lisensinya masing-masing.

---

<p align="center">
  Dibangun dan dikelola oleh <a href="https://nexapa.app">Nexapa</a>.
</p>
