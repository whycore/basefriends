# Metode Koneksi Wallet - BaseFriends

## 📋 Ringkasan

BaseFriends menggunakan **Wagmi** untuk koneksi wallet dengan 2 metode connector:
1. **Injected Connector** (Smart Wallet Base App) - **PRIORITAS UTAMA**
2. **Farcaster Mini App Connector** - Fallback

## 🔧 Teknologi yang Digunakan

### 1. Wagmi Configuration
```typescript
// src/config/wagmi.ts
import { createConfig } from "wagmi";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    farcasterMiniApp(),  // Connector khusus Farcaster Mini App
    injected(),          // Connector untuk smart wallet Base App
  ],
});
```

### 2. Flow Koneksi Wallet

```
User klik "Connect Wallet"
    ↓
Cari connector yang tersedia:
  1. injected (smart wallet Base App) ← PRIORITAS
  2. farcasterMiniApp (fallback)
    ↓
Connect wallet menggunakan connector
    ↓
Tunggu 1.5 detik untuk koneksi selesai
    ↓
Initialize Farcaster SDK
    ↓
Ambil FID dari Farcaster Context
    ↓
┌───┴───┐
│       │
FID     FID tidak
ada?    ada?
│       │
✅       ❌
│       │
Set FID Fallback: API lookup
& redirect (dari wallet address)
ke /swipe
```

## 🎯 Metode 1: Injected Connector (Smart Wallet Base App)

### Kapan digunakan:
- **PRIORITAS UTAMA** - digunakan jika tersedia
- Base App memiliki smart wallet yang terintegrasi dengan Farcaster
- Wallet address langsung terhubung dengan Farcaster account

### Cara kerja:
1. User klik "Connect Wallet"
2. Wagmi mencari `injected` connector
3. Base App's smart wallet terdeteksi dan connect
4. Setelah connect, Farcaster context langsung tersedia
5. FID diambil dari `sdk.context.fid`

### Keuntungan:
- ✅ **Langsung** - FID langsung tersedia dari context
- ✅ **Tidak perlu API call** - lebih cepat
- ✅ **Reliable** - Base App sudah terintegrasi dengan Farcaster

## 🎯 Metode 2: Farcaster Mini App Connector

### Kapan digunakan:
- Fallback jika `injected` connector tidak tersedia
- Untuk kompatibilitas dengan Farcaster Mini App environment

### Cara kerja:
1. Jika `injected` tidak tersedia, gunakan `farcasterMiniApp` connector
2. Connect melalui Farcaster Mini App SDK
3. Ambil FID dari Farcaster context

## 🔍 Mendapatkan FID Setelah Wallet Connect

### Step 1: Initialize Farcaster SDK
```typescript
await initializeFarcasterSDK();
// Memanggil sdk.actions.ready() untuk initialize SDK
```

### Step 2: Get Farcaster Context
```typescript
const ctx = await getFarcasterContext();
// Mengambil dari sdk.context:
// - ctx.fid (Farcaster ID)
// - ctx.username
// - ctx.displayName
// - ctx.accountAddress
```

### Step 3: Fallback ke API Lookup (jika context tidak tersedia)
```typescript
// Jika FID tidak ditemukan dari context
// Lookup via Neynar API menggunakan wallet address
const response = await fetch("/api/lookup-fid", {
  method: "POST",
  body: JSON.stringify({ address: walletAddress }),
});
```

## 📱 Skenario Penggunaan

### Skenario 1: Di Base App (Recommended)
```
1. User buka app di Base App
2. Smart wallet Base App otomatis terdeteksi
3. Connect menggunakan injected connector
4. FID langsung tersedia dari Farcaster context
5. ✅ Success - redirect ke /swipe
```

### Skenario 2: Di Browser Biasa
```
1. User buka app di browser (Chrome, Safari, dll)
2. injected connector tidak tersedia
3. Fallback ke farcasterMiniApp connector
4. Atau user bisa connect dengan MetaMask/wallet lain
5. Jika FID tidak tersedia dari context:
   → Lookup via API menggunakan wallet address
6. ✅ Success - redirect ke /swipe
```

### Skenario 3: FID Tidak Ditemukan
```
1. Wallet berhasil connect
2. Farcaster context tidak tersedia
3. API lookup juga tidak menemukan FID
4. ⚠️ Tampilkan "Retry Connection" button
5. User bisa coba lagi atau gunakan dev mode
```

## 🔐 Keamanan

- ✅ Wallet connection menggunakan standard Wagmi connectors
- ✅ FID diambil dari trusted source (Farcaster SDK)
- ✅ API lookup menggunakan Neynar API (verified)
- ✅ Tidak ada private key yang disimpan

## 🐛 Debugging

Untuk debugging, cek console log:
- `[home] Wallet connected, checking Farcaster context...`
- `[home] ✅ FID found from Farcaster context: <fid>`
- `[home] Farcaster context not available, trying API lookup...`
- `[farcaster] Context: { hasContext, fid, hasUser, hasAccount }`

## 📚 Referensi

- [Wagmi Documentation](https://wagmi.sh)
- [Farcaster Mini App SDK](https://docs.farcaster.xyz/miniapps)
- [Base App Smart Wallet](https://docs.base.org)

