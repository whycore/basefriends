import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // For now, mark as connected (demo PKCE flow). Next: exchange code + verifier for token/signer via Neynar.
  const url = new URL(req.url);
  const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/swipe?siwn=1`);
  res.cookies.set("siwn_connected", "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  // Optionally clear the verifier
  res.cookies.set("siwn_verifier", "", { maxAge: 0, path: "/" });
  return res;
}


