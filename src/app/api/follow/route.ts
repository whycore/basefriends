import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toFid = Number(body?.toFid);
    if (!toFid) return NextResponse.json({ error: "invalid_toFid" }, { status: 400 });

    // TODO: Call Neynar write API with the user's authorized signer (after full SIWN token exchange).
    // For now, respond success to enable end-to-end UX; client still retains deeplink fallback if needed.
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


