# Manajemen Pengguna Admin

## Struktur menu

Panel `https://api.nexapa.me/admin` memiliki group **Manajemen Pengguna**:

- **Semua Pengguna** — direktori ringkas Publisher + CRM tanpa menyatukan database.
- **User Publisher** — resource Eloquent `App\Models\User` beserta relasi pemakaian.
- **User CRM** — direktori read-only Supabase yang diakses server-side.

Semua halaman mengikuti pemeriksaan admin yang sama dengan panel (`User::canAccessPanel()` / `is_admin`). Tidak ada endpoint publik baru.

## Sumber data

Publisher memakai database Laravel/MySQL: `users`, `connected_accounts`, `media_assets`, `publisher_posts`, `collections`, dan `activity_logs`.

CRM memakai sumber yang diverifikasi dari migration repository CRM:

- Supabase Auth Admin API untuk `auth.users` (email confirmation, provider, created/updated, last sign-in).
- PostgREST `profiles` untuk nama, avatar, `account_id`, dan `account_role`.
- `accounts` untuk nama workspace/company, owner, dan jumlah member.
- `whatsapp_config` untuk identifier/status WhatsApp yang aman.
- `member_presence` untuk presence terakhir (bukan dianggap sebagai last login).
- tabel CRM terkait untuk count contacts, conversations, messages, broadcasts, templates, automations, API keys, dan webhook endpoints.

CRM menggunakan satu membership per user melalui `profiles.account_id` dan `profiles.account_role`; tidak ada tabel memberships terpisah.

## Konfigurasi

Tambahkan ke environment backend Laravel (jangan ke JavaScript/browser):

```env
CRM_SUPABASE_URL=https://PROJECT.supabase.co
CRM_SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
CRM_SUPABASE_TIMEOUT=10
CRM_SUPABASE_CACHE_TTL=45
```

Lalu jalankan:

```bash
php artisan optimize:clear
```

Service-role key hanya dipakai Laravel HTTP Client pada server. Daftar dan detail dicache 30–60 detik. Tombol **Refresh data** menaikkan versi cache direktori.

## Menguji koneksi

1. Login sebagai admin.
2. Buka **Manajemen Pengguna → User CRM**.
3. Pastikan daftar user dan badge CRM tampil.
4. Buka satu user untuk memeriksa profile, account, WhatsApp, dan count ringkasan.
5. Untuk pengujian otomatis, jalankan `php artisan test --filter=CrmUserDirectoryTest`.

Jika credential belum lengkap, timeout, response invalid, atau Supabase down, halaman menampilkan **Data CRM sedang tidak tersedia**. Publisher tetap dapat dipakai dan unified directory tetap menampilkan baris Publisher.

## Data sensitif yang sengaja tidak ditampilkan

- password hash dan remember token Publisher;
- personal access token, access token, refresh token, OAuth secret, dan scopes mentah;
- Supabase service-role key;
- raw `user_metadata`, `app_metadata`, dan identity data;
- WhatsApp access token, verify token, permanent token, app/webhook secret;
- API key/hash dan webhook signing secret;
- cookie, authorization header, proxy credential, dan signed URL.

Metadata activity log disanitasi rekursif sebelum ditampilkan. Google ID Publisher hanya tampil dalam bentuk masked.

## Batasan direktori gabungan

Direktori gabungan adalah view-model saja. Pencocokan memakai email `trim + lowercase`; nama tidak pernah dipakai untuk mencocokkan. Email sama ditandai **Kemungkinan akun terkait**, atau **Terkait melalui email** bila terverifikasi di kedua sumber. ID Publisher dan Supabase tetap terpisah.

Karena Supabase Auth Admin API dan MySQL tidak menyediakan query lintas database, tiap halaman mengambil satu page dari masing-masing sumber lalu menggabungkannya. Total/pengurutan global adalah ringkasan, bukan merge database. Tidak ada data CRM yang disalin permanen ke MySQL.

## Rollback

Backup file lama ada di `.backups/admin-user-management-20260806/`. Sebelum rollback, tinjau `git diff` agar perubahan lain tidak tertimpa. Pulihkan file lama satu per satu dari backup, lalu hapus hanya file baru yang tercantum pada laporan implementasi. Setelah itu jalankan:

```bash
php artisan optimize:clear
php artisan route:list --path=admin
```

Jangan memakai `git reset --hard` atau `git clean` pada worktree ini karena terdapat perubahan lain yang tidak terkait fitur manajemen pengguna.
