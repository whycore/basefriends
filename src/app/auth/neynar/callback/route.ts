import { NextRequest, NextResponse } from "next/server";
import { storeSigner } from "@/lib/signer";

/**
 * OAuth callback handler for Neynar SIWN
 * Exchanges authorization code for access token and creates a signer
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const state = url.searchParams.get("state");
    const verifier = req.cookies.get("siwn_verifier")?.value;

    // Handle OAuth errors
    if (error) {
      console.error("[siwn-callback] OAuth error:", error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/swipe?siwn_error=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      console.error("[siwn-callback] No authorization code received");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/swipe?siwn_error=no_code`
      );
    }

    if (!verifier) {
      console.error("[siwn-callback] No PKCE verifier found in cookies");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/swipe?siwn_error=no_verifier`
      );
    }

    const clientId = process.env.NEYNAR_CLIENT_ID || "";
    const clientSecret = process.env.NEYNAR_CLIENT_SECRET || "";
    const redirectUri =
      process.env.NEYNAR_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/neynar/callback`;

    if (!clientId || !clientSecret) {
      console.error("[siwn-callback] Missing NEYNAR_CLIENT_ID or NEYNAR_CLIENT_SECRET");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/swipe?siwn_error=config`
      );
    }

    // Exchange code for access token
    const tokenUrl = process.env.NEYNAR_TOKEN_URL || "https://api.neynar.com/oauth/token";
    
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: verifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[siwn-callback] Token exchange failed:", tokenResponse.status, errorText);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/swipe?siwn_error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600; // Default 1 hour

    if (!accessToken) {
      console.error("[siwn-callback] No access token in response");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/swipe?siwn_error=no_token`
      );
    }

    console.log("[siwn-callback] Token exchange successful");

    // Get user's FID from Farcaster context (if available in request)
    // Note: In a real implementation, you might get this from the token's user info
    // For now, we'll try to get it from the Farcaster context or token
    let fid = 0;

    // Try to get FID from token's user info (if available)
    if (tokenData.user?.fid) {
      fid = Number(tokenData.user.fid);
    } else {
      // Fallback: Try to get from Farcaster context
      // Note: This might not work in server-side context, so we may need to pass it via state
      try {
        // If state contains FID, use it
        if (state && state.includes("fid:")) {
          const fidMatch = state.match(/fid:(\d+)/);
          if (fidMatch) {
            fid = Number(fidMatch[1]);
          }
        }
      } catch (e) {
        console.warn("[siwn-callback] Could not extract FID from state:", e);
      }
    }

    if (fid === 0) {
      console.warn("[siwn-callback] Could not determine FID, will need to be set later");
      // Still proceed, but signer will need to be associated with FID later
    }

    // Extract signer information from token response
    // Neynar SIWN typically returns signer info in the token response
    let signerUuid: string | undefined;
    let publicKey: string | undefined;

    // Check token response for signer info (common in SIWN flows)
    if (tokenData.signer_uuid || tokenData.signer?.uuid) {
      signerUuid = tokenData.signer_uuid || tokenData.signer?.uuid;
      publicKey = tokenData.signer?.public_key || tokenData.public_key;
    } else if (tokenData.user?.signer_uuid) {
      signerUuid = tokenData.user.signer_uuid;
      publicKey = tokenData.user.public_key;
    }

    // If signer not in token, try to create one using the access token
    // Note: This may require additional API calls depending on Neynar's implementation
    if (!signerUuid) {
      console.warn("[siwn-callback] No signer UUID in token response, attempting to create signer");
      
      try {
        // Try to get user info which might contain signer
        const userInfoResponse = await fetch("https://api.neynar.com/v2/farcaster/user/me", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "api_key": process.env.NEYNAR_API_KEY || "",
          },
        });

        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          if (userInfo.signer_uuid || userInfo.signer?.uuid) {
            signerUuid = userInfo.signer_uuid || userInfo.signer?.uuid;
            publicKey = userInfo.signer?.public_key || userInfo.public_key;
          }
        }
      } catch (userInfoError: any) {
        console.warn("[siwn-callback] Failed to fetch user info:", userInfoError?.message);
      }

      // If still no signer, this is an error
      if (!signerUuid) {
        console.error("[siwn-callback] Could not retrieve signer from token or user info");
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/swipe?siwn_error=no_signer`
        );
      }
    }

    // Store signer in database (if FID is available)
    if (fid > 0) {
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      await storeSigner(fid, signerUuid, publicKey, expiresAt);
      console.log("[siwn-callback] Signer stored for FID:", fid);
    } else {
      console.warn("[siwn-callback] Signer created but FID not available - will need to associate later");
      // Store signer UUID in cookie temporarily so it can be associated with FID later
    }

    // Redirect to swipe page with success indicator
    const redirectUrl = new URL(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/swipe`
    );
    redirectUrl.searchParams.set("siwn", "1");
    if (fid > 0) {
      redirectUrl.searchParams.set("fid", String(fid));
    }

    const res = NextResponse.redirect(redirectUrl.toString());
    
    // Set cookies for client-side detection
    res.cookies.set("siwn_connected", "1", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Store access token in httpOnly cookie (optional, for future use)
    if (accessToken) {
      res.cookies.set("siwn_access_token", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: expiresIn,
      });
    }

    // Clear the verifier
    res.cookies.set("siwn_verifier", "", { maxAge: 0, path: "/" });

    return res;
  } catch (error: any) {
    console.error("[siwn-callback] Unexpected error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/swipe?siwn_error=unexpected`
    );
  }
}


