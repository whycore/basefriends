# SIWN (Sign-In with Neynar) Integration Guide

## Overview

SIWN allows your app to perform write actions on Farcaster (like following users) on behalf of authenticated users. This requires OAuth-like flow with Neynar.

## Current Status

✅ **SIWN is now implemented** - The app can perform programmatic follow actions when users authorize via SIWN. If SIWN is not connected or fails, the app falls back to deeplink.

## Architecture

### Current Flow (Fallback)

1. User clicks "Follow"
2. App attempts server-side follow via `/api/follow` (if SIWN connected)
3. If SIWN not connected or fails, opens Warpcast profile via deeplink
4. User manually follows on Warpcast

### Target Flow (With SIWN)

1. User authorizes app via SIWN OAuth flow
2. App receives access token/signer
3. App can programmatically follow users via Neynar API
4. No manual deeplink needed

## Implementation Steps

### Step 1: Setup Neynar OAuth App

1. Go to [Neynar Dashboard](https://neynar.com/dashboard)
2. Navigate to "Apps" → "SIWN/OAuth"
3. Create new OAuth app or use existing
4. Configure:
   - **App Name**: BaseFriends
   - **Redirect URI**: `https://basefriends.vercel.app/auth/neynar/callback`
   - **Authorized Origins**: `https://basefriends.vercel.app`
   - **Scopes**: `follow` (or required scopes for following)

### Step 2: Environment Variables

Add to `.env.local` and Vercel:

```bash
NEYNAR_CLIENT_ID=your_client_id
NEYNAR_CLIENT_SECRET=your_client_secret
NEYNAR_REDIRECT_URI=https://basefriends.vercel.app/auth/neynar/callback
NEYNAR_AUTHORIZE_URL=https://app.neynar.com/oauth/authorize
NEXT_PUBLIC_ENABLE_SIWN=true
```

### Step 3: OAuth Flow Implementation

The OAuth flow consists of:

1. **Authorization** (`/auth/neynar/start`)
   - Redirect user to Neynar authorization URL
   - User approves app access
   - Neynar redirects back with `code`

2. **Token Exchange** (`/auth/neynar/callback`)
   - Exchange `code` for access token
   - Store token securely (session/cookie)
   - Create signer for write operations

3. **Write Operations** (`/api/follow`)
   - Use stored signer to perform follow action
   - Call Neynar API with signer

### Step 4: Update Follow Route

The `/api/follow` route needs to:

1. Get user's stored signer (from session/cookie)
2. Use Neynar SDK to create follow action
3. Sign and submit follow via Neynar API

Example implementation:

```typescript
import { getNeynarClient } from "@/lib/neynar";

export async function POST(req: NextRequest) {
  const { toFid, fromFid } = await req.json();
  
  // Get user's signer from session/cookie
  const signer = await getStoredSigner(fromFid);
  
  if (!signer) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  
  // Use Neynar SDK to follow
  const client = getNeynarClient();
  await client.followUser({
    signerUuid: signer.uuid,
    targetFid: toFid,
  });
  
  return NextResponse.json({ ok: true });
}
```

## Current Implementation

### Files

- `src/app/auth/neynar/start/route.ts` - OAuth start (redirects to Neynar) ✅
- `src/app/auth/neynar/callback/route.ts` - OAuth callback (handles code exchange) ✅
- `src/app/api/follow/route.ts` - Follow endpoint (uses stored signer) ✅
- `src/lib/signer.ts` - Signer storage and retrieval helpers ✅
- `prisma/schema.prisma` - Signer model for database storage ✅

### Status

- ✅ OAuth start route implemented
- ✅ OAuth callback route implemented (token exchange + signer creation)
- ✅ Token exchange implemented
- ✅ Signer storage implemented (database)
- ✅ Follow action implemented with signer
- ⚠️ Requires Neynar OAuth app configuration in dashboard

## Implementation Details

SIWN integration is now complete and includes:
1. ✅ Neynar OAuth app setup (requires configuration in dashboard)
2. ✅ Secure token storage (database with Prisma)
3. ✅ Signer management (create, store, retrieve signers)
4. ✅ Error handling for OAuth flow
5. ✅ Fallback to deeplink if SIWN not connected

**Note**: To enable SIWN, you must:
1. Configure OAuth app in Neynar Dashboard
2. Set environment variables (`NEYNAR_CLIENT_ID`, `NEYNAR_CLIENT_SECRET`, etc.)
3. Set `NEXT_PUBLIC_ENABLE_SIWN=true` to show the "Connect Farcaster" button
4. Run database migration to create `Signer` table

## When to Implement

Consider implementing SIWN when:
- You want seamless follow experience (no manual deeplink)
- You have Neynar OAuth app approved
- You need other write operations (casts, reactions, etc.)
- User experience requires programmatic actions

## Resources

- [Neynar SIWN Docs](https://docs.neynar.com/docs/sign-in-with-neynar)
- [Neynar Write API](https://docs.neynar.com/reference/follow-user)
- [Neynar Dashboard](https://neynar.com/dashboard)

## Alternative: Base App Native Actions

Base App provides native actions that might be easier:
- `sdk.actions.viewProfile(fid)` - Opens profile (already implemented)
- Future: Native follow action (if available)

Consider using Base App native actions instead of SIWN for simpler implementation.

