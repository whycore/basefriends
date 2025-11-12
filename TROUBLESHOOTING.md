# Troubleshooting Konektivitas BaseFriends

Jika mengalami masalah konektivitas, ikuti langkah-langkah berikut:

## 🔍 1. Cek Health Check Endpoint

Akses endpoint berikut untuk melihat status konektivitas:

**Local:**
```
http://localhost:3001/api/health
```

**Production:**
```
https://basefriends.vercel.app/api/health
```

Endpoint ini akan menampilkan:
- ✅ Status database connection
- ✅ Status Neynar API connection
- ✅ Status environment variables
- ✅ Detail error jika ada

## 🔧 2. Cek Environment Variables

Pastikan semua environment variables sudah di-set dengan benar:

### Di Local (.env.local):
```bash
DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true"
NEYNAR_API_KEY="your-neynar-api-key"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

### Di Vercel:
1. Buka Vercel Dashboard → Project → Settings → Environment Variables
2. Pastikan semua variable sudah di-set:
   - `DATABASE_URL` (Supabase connection string)
   - `NEYNAR_API_KEY` (Neynar API key)
   - `NEXT_PUBLIC_APP_URL` (URL aplikasi)

## 🗄️ 3. Masalah Database (Supabase)

### Error: "Connection refused" atau "Connection timeout"
**Solusi:**
1. Pastikan `DATABASE_URL` benar dari Supabase Dashboard
2. Pastikan connection string menggunakan format:
   ```
   postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true
   ```
3. Untuk Vercel, gunakan **Connection Pooling** URL (bukan direct connection)
   - Di Supabase: Settings → Database → Connection Pooling
   - Copy "Connection string" dengan mode "Transaction"

### Error: "P1001: Can't reach database server"
**Solusi:**
1. Cek apakah Supabase project masih aktif
2. Cek firewall/network settings di Supabase
3. Pastikan IP address diizinkan (untuk Vercel, biasanya sudah auto-allow)

### Error: "Foreign key constraint violated"
**Solusi:**
1. Pastikan schema database sudah di-migrate dengan benar
2. Jalankan migration SQL di Supabase SQL Editor:
   ```bash
   # Lihat file: supabase-migration.sql
   ```

## 🔌 4. Masalah Neynar API

### Error: "NEYNAR_API_KEY is not set"
**Solusi:**
1. Pastikan API key sudah di-set di environment variables
2. Restart development server setelah menambahkan env var
3. Di Vercel, pastikan env var sudah di-set dan redeploy

### Error: "Request failed with status code 401/403"
**Solusi:**
1. Cek apakah API key valid
2. Pastikan API key tidak expired
3. Cek plan Neynar (Starter plan sudah cukup untuk basic features)

### Error: "Request failed with status code 402"
**Solusi:**
- Beberapa endpoint Neynar memerlukan paid plan
- Gunakan endpoint yang tersedia di Starter plan:
  - `fetchBulkUsers` ✅
  - `fetchBulkUsersByEthOrSolAddress` ✅

## 🌐 5. Masalah Farcaster Context

### FID tidak terdeteksi di Base App
**Solusi:**
1. Pastikan aplikasi dibuka di **Base App** (bukan browser biasa)
2. Pastikan user sudah login ke Farcaster di Base App
3. Tunggu beberapa detik untuk context loading
4. Cek console browser untuk log:
   ```
   [farcaster] Context check: ...
   [home] FID check result: ...
   ```

### "Connect Wallet" tidak bekerja
**Solusi:**
1. Pastikan Base App smart wallet sudah aktif
2. Coba refresh halaman
3. Cek console untuk error messages
4. Fallback: Gunakan "Connect With Your Account" button

## 🚀 6. Masalah Deployment (Vercel)

### Build gagal
**Solusi:**
1. Cek build logs di Vercel Dashboard
2. Pastikan semua dependencies terinstall:
   ```bash
   npm install
   ```
3. Pastikan Prisma client sudah di-generate:
   ```bash
   npx prisma generate
   ```

### Environment variables tidak ter-load
**Solusi:**
1. Pastikan env vars sudah di-set di Vercel
2. Redeploy setelah menambahkan env vars
3. Cek apakah env vars menggunakan format yang benar

## 📝 7. Debug Checklist

Jika masih bermasalah, cek:

- [ ] Health check endpoint (`/api/health`) menunjukkan status apa?
- [ ] Database connection test (`/api/test-db`) berhasil?
- [ ] Neynar API key valid dan ter-set?
- [ ] Supabase database accessible?
- [ ] Schema sudah di-migrate?
- [ ] Environment variables sudah di-set (local & Vercel)?
- [ ] Build di Vercel berhasil?
- [ ] Console browser menunjukkan error apa?

## 🆘 8. Logging

Untuk debugging lebih lanjut, cek logs:

**Local:**
- Console terminal (server logs)
- Browser console (client logs)

**Vercel:**
- Vercel Dashboard → Project → Logs
- Function logs untuk API routes

## 📞 9. Common Error Messages

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `P1001: Can't reach database server` | Database tidak accessible | Cek Supabase connection string & network |
| `NEYNAR_API_KEY is not set` | API key belum di-set | Set env var & restart |
| `Foreign key constraint violated` | Schema belum di-migrate | Jalankan migration SQL |
| `Connection pooler error` | URL tidak menggunakan pgbouncer | Tambahkan `?pgbouncer=true` |
| `FID not found` | Wallet tidak connected ke Farcaster | Connect wallet di Warpcast/Base App |

## 🔗 10. Useful Links

- Health Check: `/api/health`
- Database Test: `/api/test-db`
- FID Check: `/api/check-fid?address=0x...`
- Supabase Dashboard: https://supabase.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
- Neynar Dashboard: https://neynar.com/dashboard

