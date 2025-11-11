import { NextResponse } from "next/server";
import crypto from "crypto";

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function GET() {
  const verifier = base64UrlEncode(crypto.randomBytes(32));
  const challenge = base64UrlEncode(
    crypto.createHash("sha256").update(verifier).digest(),
  );

  const clientId = process.env.NEYNAR_CLIENT_ID || "";
  const redirectUri =
    process.env.NEYNAR_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/neynar/callback`;

  // Neynar authorize URL (PKCE) - replace with actual authorization endpoint if different
  const authorizeUrl =
    process.env.NEYNAR_AUTHORIZE_URL ||
    "https://app.neynar.com/oauth/authorize";

  const url = new URL(authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", "openid offline_access fc:write");
  url.searchParams.set("state", "siwn");

  const res = NextResponse.redirect(url.toString(), { status: 302 });
  res.cookies.set("siwn_verifier", verifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}


