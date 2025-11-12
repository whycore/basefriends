# Fix: /api/lookup-fid 404 Error

## Masalah
Endpoint `/api/lookup-fid` mengembalikan 404 di production (Vercel), padahal file sudah ada di local dan sudah ter-commit.

## Solusi

### Opsi 1: Trigger Redeploy di Vercel (Paling Cepat)

1. **Via Vercel Dashboard:**
   - Buka https://vercel.com/dashboard
   - Pilih project `basefriends`
   - Klik tab "Deployments"
   - Klik "..." pada deployment terbaru
   - Pilih "Redeploy"
   - Tunggu deploy selesai

2. **Via Git (Auto-deploy):**
   ```bash
   # Buat empty commit untuk trigger redeploy
   git commit --allow-empty -m "Trigger redeploy for lookup-fid endpoint"
   git push origin main
   ```

### Opsi 2: Verifikasi File Ter-Push

Pastikan file sudah ter-push ke remote:
```bash
# Cek status
git status

# Jika ada perubahan, commit dan push
git add .
git commit -m "Ensure lookup-fid route is included"
git push origin main
```

### Opsi 3: Cek Build Logs

1. Buka Vercel Dashboard → Deployments → [Latest]
2. Klik "Build Logs"
3. Cek apakah ada error saat build
4. Pastikan file `src/app/api/lookup-fid/route.ts` ter-include dalam build

## Verifikasi Setelah Deploy

Setelah redeploy, test endpoint:
```bash
# Test dengan curl
curl -X POST https://basefriends.vercel.app/api/lookup-fid \
  -H "Content-Type: application/json" \
  -d '{"address":"0xA9561EC5d5ac4964aD0AB7682B6aC5031c2F65F6"}'
```

Atau test di browser console:
```javascript
fetch('/api/lookup-fid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: '0xA9561EC5d5ac4964aD0AB7682B6aC5031c2F65F6' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

## Catatan

- Error 404 untuk `/api/lookup-fid` **tidak memblokir** penggunaan aplikasi
- Aplikasi masih bisa digunakan via **Farcaster context** di Base App (metode utama)
- API lookup hanya digunakan sebagai **fallback** jika Farcaster context tidak tersedia
- Setelah endpoint ter-deploy, fallback akan bekerja dengan baik

## Status File

✅ File `src/app/api/lookup-fid/route.ts` sudah ada  
✅ File sudah ter-commit ke git  
✅ File sudah ter-track di git  
⚠️ File mungkin belum ter-deploy ke Vercel production

