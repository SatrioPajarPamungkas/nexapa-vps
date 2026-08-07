# Nexapa Admin Panel - Setup Guide

## Promote User to Super Admin

Untuk memberikan akses admin panel ke user existing:

```bash
php artisan tinker
```

Kemudian jalankan:

```php
$user = App\Models\User::where('email', 'admin@example.com')->firstOrFail();
$user->update(['is_admin' => true]);
exit
```

Ganti `admin@example.com` dengan email user yang akan dipromosikan.

## Access Admin Panel

Setelah user dipromosikan:

1. Buka https://api.nexapa.me/admin
2. Login dengan email dan password user yang sudah di-promote
3. Dashboard admin akan tampil dengan statistik

## Security Notes

- Hanya user dengan `is_admin = true` yang dapat mengakses `/admin`
- User biasa akan ditolak otomatis oleh `canAccessPanel()`
- Admin panel menggunakan session authentication terpisah dari API
- API tokens tidak ditampilkan di admin panel
- Data sensitif (access_token, metadata) tidak ditampilkan

## Phase 1 Features

- ✅ Login page di `/admin/login`
- ✅ Dashboard dengan statistik read-only
- ✅ Widget: Total Users, Connected Accounts, Media Assets, Publisher Posts
- ✅ Widget: Scheduled Posts, Failed Posts
- ✅ Access guard berdasarkan `is_admin` field
- ✅ User biasa ditolak

## Phase 2 (Coming Soon)

- User management
- Connected Accounts management
- Publisher Posts management
- Media Assets management
- Queue monitoring
- Activity logs
