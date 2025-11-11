import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toFid = Number(body?.toFid);
    const action = body?.action === "follow" ? "follow" : "skip";

    if (!toFid) {
      return NextResponse.json({ error: "invalid_toFid" }, { status: 400 });
    }

    // For PoC, we don't have auth middleware; assume fromFid=0 (unknown)
    const fromFid = 0;

    // Persisting to SQLite is not supported on Vercel serverless (read-only FS).
    // For staging, we skip DB write to avoid 500s. In production, switch to a managed Postgres (e.g., Supabase).
    // try {
    //   await prisma.swipe.create({
    //     data: { fromFid, toFid, action },
    //   });
    // } catch (e) {
    //   console.warn("Skipping DB write in serverless environment:", e);
    // }

    // Follow action Path B fallback can return a deeplink for the client to open.
    // For Warpcast profile: https://warpcast.com/{username-or-fid}
    let deeplink: string | undefined;
    if (action === "follow") {
      deeplink = `https://warpcast.com/~/profiles/${toFid}`;
    }

    return NextResponse.json({ ok: true, deeplink });
  } catch (error: any) {
    console.error("POST /api/swipe error", error);
    return NextResponse.json({ error: "failed_to_record" }, { status: 500 });
  }
}


