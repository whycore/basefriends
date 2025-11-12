# Deployment Checklist

## ✅ Pre-Deployment Checks

### 1. Verify API Routes Exist
Pastikan semua API routes ada di folder `src/app/api/`:
- ✅ `/api/candidates` - GET
- ✅ `/api/swipe` - POST
- ✅ `/api/onboarding` - POST
- ✅ `/api/lookup-fid` - POST ⚠️ **PENTING: Pastikan ini ter-deploy**
- ✅ `/api/check-fid` - GET
- ✅ `/api/health` - GET
- ✅ `/api/test-db` - GET

### 2. Verify Public Assets
Pastikan semua asset ada di folder `public/`:
- ✅ `icon.png` (512x512px)
- ✅ `logo.png` atau `logo.svg`
- ✅ `splash.png` (1200x1200px)
- ✅ `og-image.png` (1200x630px)
- ⚠️ `hero.png` (opsional, 1200x600px)
- ⚠️ `screenshot1.png`, `screenshot2.png`, `screenshot3.png` (opsional)

### 3. Verify Configuration Files
- ✅ `public/.well-known/farcaster.json` - dengan `imageUrl` field
- ✅ `public/manifest.json`
- ✅ `prisma/schema.prisma`
- ✅ `.env.local` (untuk local development)

### 4. Environment Variables (Vercel)
Pastikan semua env vars sudah di-set di Vercel Dashboard:
- ✅ `DATABASE_URL` - Supabase connection string (dengan `?pgbouncer=true`)
- ✅ `NEYNAR_API_KEY` - Neynar API key
- ✅ `NEXT_PUBLIC_APP_URL` - `https://basefriends.vercel.app`

## 🚀 Deployment Steps

### Step 1: Commit All Changes
```bash
git add .
git commit -m "Add lookup-fid API route and update assets"
git push origin main
```

### Step 2: Verify Vercel Auto-Deploy
- Vercel akan otomatis deploy setelah push ke `main` branch
- Atau trigger manual deploy di Vercel Dashboard

### Step 3: Verify Deployment
Setelah deploy selesai, test endpoint:
```bash
# Test health check
curl https://basefriends.vercel.app/api/health

# Test lookup-fid (POST)
curl -X POST https://basefriends.vercel.app/api/lookup-fid \
  -H "Content-Type: application/json" \
  -d '{"address":"0xA9561EC5d5ac4964aD0AB7682B6aC5031c2F65F6"}'
```

### Step 4: Check Build Logs
Jika ada error, cek Vercel Dashboard → Deployments → [Latest] → Build Logs

## 🔍 Troubleshooting 404 Errors

### API Route Returns 404
**Kemungkinan penyebab:**
1. File belum ter-commit ke git
2. File belum ter-deploy ke Vercel
3. Build error di Vercel

**Solusi:**
1. Pastikan file ada di `src/app/api/[route-name]/route.ts`
2. Commit dan push ke git
3. Trigger redeploy di Vercel
4. Cek build logs untuk error

### Asset Returns 404
**Kemungkinan penyebab:**
1. File belum di-upload ke `public/` folder
2. File belum ter-commit ke git
3. File tidak ter-deploy ke Vercel

**Solusi:**
1. Pastikan file ada di `public/` folder
2. Commit dan push ke git
3. Trigger redeploy di Vercel

## 📝 Post-Deployment Verification

Setelah deploy, verifikasi:
- [ ] Homepage loads: `https://basefriends.vercel.app`
- [ ] Health check works: `https://basefriends.vercel.app/api/health`
- [ ] Lookup FID works: `https://basefriends.vercel.app/api/lookup-fid` (POST)
- [ ] Assets load: `https://basefriends.vercel.app/logo.png`
- [ ] Manifest accessible: `https://basefriends.vercel.app/.well-known/farcaster.json`
- [ ] Farcaster context detection works in Base App

## 🔗 Useful Commands

```bash
# Check if file exists
ls -la src/app/api/lookup-fid/route.ts

# Check git status
git status

# Check if file is tracked
git ls-files | grep lookup-fid

# Test locally
npm run dev
# Then test: http://localhost:3001/api/lookup-fid (POST)
```

