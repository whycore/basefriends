# Manifest Signing Guide for Base Mini App

## Overview

Before publishing your Base Mini App to production, you need to sign the manifest file (`farcaster.json`) to verify domain ownership. This guide walks you through the process.

## Prerequisites

1. **Base Build Account** - You need to be logged in at https://build.base.org/
2. **Domain Ownership** - Your domain must be accessible via HTTPS
3. **Manifest File** - `public/.well-known/farcaster.json` must be accessible

## Current Manifest Status

Your manifest file is located at:
- Local: `public/.well-known/farcaster.json`
- Production: `https://basefriends.vercel.app/.well-known/farcaster.json`

### Current Configuration

```json
{
  "accountAssociation": {
    "header": "...",
    "payload": "...",
    "signature": "..."
  },
  "baseBuilder": {
    "ownerAddress": "0x11a37d9f188110079aA27844E4128E8CD8f93954"
  },
  "miniapp": {
    "version": "1",
    "name": "BaseFriends",
    "homeUrl": "https://basefriends.vercel.app",
    "iconUrl": "https://basefriends.vercel.app/icon.png",
    "imageUrl": "https://basefriends.vercel.app/og-image.png",
    ...
  }
}
```

## Step-by-Step Signing Process

### Step 1: Verify Manifest Accessibility

Ensure your manifest is accessible at:
```
https://basefriends.vercel.app/.well-known/farcaster.json
```

Test it:
```bash
curl https://basefriends.vercel.app/.well-known/farcaster.json
```

### Step 2: Access Base Build Dashboard

1. Go to https://build.base.org/
2. Log in with your wallet (must match `ownerAddress` in manifest)
3. Navigate to your Mini App project

### Step 3: Sign Account Association

The `accountAssociation` in your manifest needs to be signed. This is typically done through:

1. **Base Build Dashboard** → Your Mini App → Settings
2. Find "Account Association" or "Domain Verification" section
3. Follow the signing flow:
   - Connect wallet (must match `ownerAddress`)
   - Sign the message to verify domain ownership
   - The signature will be generated automatically

### Step 4: Update Manifest with Signature

After signing, you'll receive:
- `header`: Base64 encoded header
- `payload`: Base64 encoded payload  
- `signature`: Base64 encoded signature

Update `public/.well-known/farcaster.json`:

```json
{
  "accountAssociation": {
    "header": "YOUR_SIGNED_HEADER",
    "payload": "YOUR_SIGNED_PAYLOAD",
    "signature": "YOUR_SIGNATURE"
  },
  ...
}
```

### Step 5: Verify Signature

After updating, verify the signature is valid:

```bash
# The manifest should be accessible and valid
curl https://basefriends.vercel.app/.well-known/farcaster.json | jq
```

### Step 6: Submit for Review (if required)

Some Base Mini Apps require review before being published:
1. Go to Base Build Dashboard
2. Submit your Mini App for review
3. Wait for approval

## Important Notes

### Account Association

- The `ownerAddress` in `baseBuilder.ownerAddress` must match the wallet you use to sign
- The signature proves you own the domain
- This is a one-time process (unless you change domains)

### Manifest Requirements

- ✅ `homeUrl` must be HTTPS
- ✅ `iconUrl` must be accessible
- ✅ `imageUrl` must be accessible (for previews)
- ✅ All URLs must use HTTPS
- ✅ Manifest must be valid JSON

### Testing

Before signing, test your manifest:
1. Use Base Build Preview tool
2. Validate manifest structure
3. Test all URLs are accessible
4. Verify images load correctly

## Troubleshooting

### "Invalid signature" error
- Ensure wallet matches `ownerAddress`
- Re-sign the account association
- Verify signature format (Base64)

### "Manifest not found" error
- Verify `.well-known/farcaster.json` is accessible
- Check Vercel deployment includes the file
- Ensure file is in `public/.well-known/` folder

### "Domain verification failed"
- Ensure domain is accessible via HTTPS
- Check DNS settings
- Verify manifest URL is correct

## Production Checklist

Before going live:
- [ ] Manifest is accessible at `/.well-known/farcaster.json`
- [ ] Account association is signed
- [ ] All image URLs are accessible
- [ ] `homeUrl` points to production domain
- [ ] `noindex` is set to `false` (if you want to be discoverable)
- [ ] All required fields are filled
- [ ] Manifest passes validation

## Resources

- [Base Build Dashboard](https://build.base.org/)
- [Farcaster Mini Apps Docs](https://miniapps.farcaster.xyz/)
- [Base Mini Apps Docs](https://docs.base.org/mini-apps/)

## Current Status

✅ Manifest file created  
✅ All required fields configured  
✅ Image URLs configured  
⚠️ Account association needs signing (when ready for production)  
⚠️ Set `noindex: false` when ready to be discoverable

