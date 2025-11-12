# Base Mini App Assets

Silakan tambahkan asset Anda ke folder `public/` dengan nama file berikut:

## File yang Diperlukan

### 1. **icon.png** (wajib)
- **Ukuran**: 512x512 px (atau lebih besar, akan di-resize otomatis)
- **Format**: PNG dengan transparansi
- **Lokasi**: `public/icon.png`
- **Digunakan untuk**: Icon aplikasi di Base App, favicon, dan manifest

### 2. **splash.png** (wajib)
- **Ukuran**: 1200x1200 px (disarankan)
- **Format**: PNG
- **Lokasi**: `public/splash.png`
- **Digunakan untuk**: Splash screen saat aplikasi loading di Base App
- **Background color**: `#0A7AFF` (sudah dikonfigurasi di farcaster.json)

### 3. **hero.png** (opsional, tapi disarankan)
- **Ukuran**: 1200x600 px (disarankan)
- **Format**: PNG atau JPG
- **Lokasi**: `public/hero.png`
- **Digunakan untuk**: Hero image di halaman discovery Base App

### 4. **og-image.png** (wajib untuk social sharing)
- **Ukuran**: 1200x630 px (rasio 1.91:1)
- **Format**: PNG atau JPG
- **Lokasi**: `public/og-image.png`
- **Digunakan untuk**: Preview image saat share link di Twitter, Farcaster, dll

### 5. **screenshot1.png, screenshot2.png, screenshot3.png** (opsional)
- **Ukuran**: 1200x800 px (disarankan, rasio 3:2)
- **Format**: PNG atau JPG
- **Lokasi**: 
  - `public/screenshot1.png`
  - `public/screenshot2.png`
  - `public/screenshot3.png`
- **Digunakan untuk**: Screenshot aplikasi di halaman discovery Base App

### 6. **logo.svg** atau **logo.png** (untuk UI aplikasi)
- **Ukuran**: Fleksibel (SVG lebih disarankan untuk scalability)
- **Format**: SVG atau PNG dengan transparansi
- **Lokasi**: `public/logo.svg` atau `public/logo.png`
- **Digunakan untuk**: Logo di header aplikasi, halaman home, dll

### 7. **favicon.ico** (opsional)
- **Ukuran**: 32x32 px atau 16x16 px
- **Format**: ICO
- **Lokasi**: `public/favicon.ico`
- **Digunakan untuk**: Favicon browser

## Cara Menambahkan Asset

1. Siapkan file-file di atas sesuai spesifikasi
2. Copy file ke folder `public/` di root project
3. Pastikan nama file sesuai dengan yang tercantum di atas
4. File akan otomatis tersedia di URL: `https://basefriends.vercel.app/[nama-file]`

## Catatan

- Semua file harus di-upload ke Vercel agar tersedia di production
- Pastikan ukuran file tidak terlalu besar (disarankan < 500KB per file)
- Untuk PNG, gunakan optimasi (misalnya dengan TinyPNG) untuk mengurangi ukuran file
- SVG lebih disarankan untuk logo karena scalable dan ukuran file kecil

## Referensi di Kode

Asset sudah dikonfigurasi di:
- `public/.well-known/farcaster.json` - Manifest Base Mini App
- `src/app/layout.tsx` - Metadata Next.js (favicon, OG image, dll)

Setelah menambahkan file, tidak perlu mengubah kode - cukup deploy ulang ke Vercel.

