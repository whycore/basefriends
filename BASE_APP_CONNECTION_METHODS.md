# Cara Connect Base App & Mendapatkan FID

## 📋 Ringkasan

Ada **4 cara utama** untuk connect Base App dan mendapatkan FID (Farcaster ID):

1. **Farcaster Context (Auto-detect)** - ⭐ **TERBAIK & TERMUDAH**
2. **Farcaster Mini App Connector** - Via Wagmi
3. **Injected Connector (Smart Wallet)** - Via Wagmi
4. **API Lookup dari Wallet Address** - Fallback

---

## 🎯 Metode 1: Farcaster Context (Auto-detect)

### ✅ **REKOMENDASI UTAMA**

### Cara Kerja:
- **Otomatis** - FID langsung tersedia saat app dibuka di Base App
- Tidak perlu user action (klik button, dll)
- Menggunakan Farcaster Mini App SDK

### Implementasi:
```typescript
import { getFarcasterContext, initializeFarcasterSDK } from "@/lib/farcaster";

// Initialize SDK (biasanya di app startup)
await initializeFarcasterSDK();

// Get FID dari context
const ctx = await getFarcasterContext();
const fid = ctx?.fid; // ✅ Langsung dapat!
```

### Kapan Tersedia:
- ✅ App dibuka **di dalam Base App**
- ✅ User sudah login ke Base App dengan Farcaster account
- ✅ Farcaster Mini App SDK sudah initialized

### Keuntungan:
- ✅ **Paling cepat** - tidak perlu API call
- ✅ **Paling reliable** - langsung dari source
- ✅ **Tidak perlu user action** - otomatis
- ✅ **Gratis** - tidak pakai API quota

### Kekurangan:
- ❌ Hanya bekerja di Base App environment
- ❌ Tidak bekerja di browser biasa

---

## 🎯 Metode 2: Farcaster Mini App Connector

### Cara Kerja:
- Menggunakan Wagmi dengan `farcasterMiniApp` connector
- User perlu klik "Connect Wallet"
- Setelah connect, FID tersedia dari context

### Implementasi:
```typescript
import { useConnect } from "wagmi";
import { getFarcasterContext } from "@/lib/farcaster";

const { connect, connectors } = useConnect();

// Connect via Farcaster Mini App connector
const farcasterConnector = connectors.find(
  (c) => c.id === "farcasterMiniApp"
);

connect({ connector: farcasterConnector });

// Setelah connect, ambil FID dari context
const ctx = await getFarcasterContext();
const fid = ctx?.fid;
```

### Kapan Tersedia:
- ✅ Di Base App environment
- ✅ Di Farcaster Mini App environment
- ✅ User sudah login ke Farcaster

### Keuntungan:
- ✅ Standard Wagmi connector
- ✅ Reliable di Base App
- ✅ FID langsung dari context

### Kekurangan:
- ❌ Perlu user action (klik connect)
- ❌ Tidak bekerja di browser biasa tanpa Base App

---

## 🎯 Metode 3: Injected Connector (Smart Wallet)

### Cara Kerja:
- Menggunakan Wagmi dengan `injected` connector
- Connect ke smart wallet Base App
- Setelah connect, ambil FID dari Farcaster context

### Implementasi:
```typescript
import { useConnect } from "wagmi";
import { getFarcasterContext } from "@/lib/farcaster";

const { connect, connectors } = useConnect();

// Connect via injected connector (smart wallet)
const injectedConnector = connectors.find(
  (c) => c.id === "injected"
);

connect({ connector: injectedConnector });

// Setelah connect, ambil FID dari context
await initializeFarcasterSDK();
const ctx = await getFarcasterContext();
const fid = ctx?.fid;
```

### Kapan Tersedia:
- ✅ Di Base App (smart wallet terdeteksi)
- ✅ Di browser dengan wallet extension (MetaMask, dll)

### Keuntungan:
- ✅ Bisa connect ke berbagai wallet
- ✅ Smart wallet Base App terintegrasi dengan Farcaster
- ✅ Fallback ke wallet lain jika Base App tidak tersedia

### Kekurangan:
- ❌ Perlu user action (klik connect)
- ❌ Jika wallet tidak terhubung ke Farcaster, FID tidak tersedia dari context

---

## 🎯 Metode 4: API Lookup dari Wallet Address

### Cara Kerja:
- Connect wallet dulu (metode 2 atau 3)
- Dapatkan wallet address
- Lookup FID via Neynar API menggunakan wallet address

### Implementasi:
```typescript
import { useAccount } from "wagmi";

const { address } = useAccount();

// Lookup FID dari wallet address via API
const response = await fetch("/api/lookup-fid", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ address }),
});

const data = await response.json();
const fid = data.fid; // ✅ FID dari API
```

### API Endpoint:
```typescript
// src/app/api/lookup-fid/route.ts
// Menggunakan Neynar API:
// GET https://api.neynar.com/v2/farcaster/user/by_verification?verification={address}
```

### Kapan Tersedia:
- ✅ Wallet sudah connect
- ✅ Wallet address terverifikasi di Farcaster
- ✅ Neynar API key tersedia

### Keuntungan:
- ✅ **Fallback yang reliable** - jika context tidak tersedia
- ✅ Bekerja di semua environment (browser, Base App, dll)
- ✅ Tidak perlu Base App environment

### Kekurangan:
- ❌ Perlu API call (lebih lambat)
- ❌ Perlu Neynar API key
- ❌ Menggunakan API quota
- ❌ Hanya bekerja jika wallet address terverifikasi di Farcaster

---

## 🔄 Flow yang Digunakan di BaseFriends

### Prioritas (dari yang terbaik):

```
1. Farcaster Context (Auto-detect)
   ↓ (jika tidak tersedia)
2. Connect Wallet → Farcaster Context
   ↓ (jika context tidak tersedia)
3. Connect Wallet → API Lookup dari Address
```

### Implementasi di `src/app/page.tsx`:

```typescript
// Step 1: Cek Farcaster context saat app load
const ctx = await getFarcasterContext();
if (ctx?.fid) {
  // ✅ FID ditemukan - langsung pakai
  return;
}

// Step 2: Jika tidak ada, tampilkan button "Connect Wallet"
// User klik button → Connect wallet
connect({ connector: injectedConnector || farcasterConnector });

// Step 3: Setelah wallet connect, cek context lagi
await initializeFarcasterSDK();
const ctx2 = await getFarcasterContext();
if (ctx2?.fid) {
  // ✅ FID ditemukan dari context
  return;
}

// Step 4: Fallback - API lookup dari address
const response = await fetch("/api/lookup-fid", {
  method: "POST",
  body: JSON.stringify({ address }),
});
const data = await response.json();
const fid = data.fid; // ✅ FID dari API
```

---

## 📊 Perbandingan Metode

| Metode | Kecepatan | Reliability | User Action | Environment | API Cost |
|--------|-----------|-------------|-------------|-------------|----------|
| **1. Context (Auto)** | ⚡⚡⚡ | ⭐⭐⭐ | ❌ Tidak | Base App | ✅ Gratis |
| **2. Farcaster Connector** | ⚡⚡ | ⭐⭐⭐ | ✅ Ya | Base App | ✅ Gratis |
| **3. Injected Connector** | ⚡⚡ | ⭐⭐ | ✅ Ya | Base App/Browser | ✅ Gratis |
| **4. API Lookup** | ⚡ | ⭐⭐ | ✅ Ya | Semua | ❌ Pakai quota |

---

## 🎯 Rekomendasi

### Untuk Base App (Production):
1. **Utama**: Gunakan **Metode 1 (Farcaster Context Auto-detect)**
2. **Fallback**: **Metode 2 atau 3** (Connect Wallet → Context)
3. **Last Resort**: **Metode 4** (API Lookup)

### Untuk Browser Biasa:
1. **Utama**: **Metode 3** (Injected Connector)
2. **Fallback**: **Metode 4** (API Lookup)

---

## 🔍 Debugging

### Cek apakah FID tersedia:
```typescript
// Log Farcaster context
const ctx = await getFarcasterContext();
console.log("[debug] Farcaster context:", {
  fid: ctx?.fid,
  username: ctx?.username,
  address: ctx?.accountAddress,
  hasContext: !!ctx,
});
```

### Cek wallet connection:
```typescript
import { useAccount } from "wagmi";

const { address, isConnected } = useAccount();
console.log("[debug] Wallet:", {
  address,
  isConnected,
});
```

---

## 📚 Referensi

- [Farcaster Mini App SDK](https://docs.farcaster.xyz/miniapps)
- [Wagmi Documentation](https://wagmi.sh)
- [Neynar API Documentation](https://docs.neynar.com)
- [Base App Documentation](https://docs.base.org)

