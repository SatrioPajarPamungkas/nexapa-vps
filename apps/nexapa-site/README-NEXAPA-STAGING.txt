NEXAPA × AIFORGE — STAGING PACKAGE

Status:
- Paket ini adalah preview statis untuk evaluasi desain.
- Website produksi nexapa.me belum disentuh.
- Homepage utama: index.html
- Tombol Buka Nexapa CRM mengarah ke https://crm.nexapa.me

Audit teknis:
- Static HTML + Bootstrap + jQuery.
- Tidak memerlukan npm/build untuk preview.
- contact.php bawaan template tidak digunakan dan jangan dipasang ke produksi.
- Google Fonts, YouTube, dan Google Maps masih menjadi dependensi eksternal pada beberapa halaman.
- Simpan bukti lisensi/pembelian Envato secara terpisah; berkas lisensi tidak ditemukan di ZIP sumber yang diberikan.

Preview lokal:
1. Ekstrak ZIP.
2. Buka PowerShell di folder hasil ekstrak.
3. Jalankan: python -m http.server 8090
4. Buka: http://localhost:8090/index.html

Tahap berikutnya:
- Port desain terpilih ke Blade Laravel.
- Gunakan route dan konten Nexapa yang sudah ada.
- Nonaktifkan contact.php dan ganti formulir dengan route Laravel.
- Migrasi melalui staging, bukan langsung ke nexapa.me.
