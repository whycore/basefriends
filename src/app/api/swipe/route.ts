import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Enable write only when using Postgres (Supabase/Neon). Skip for file-based sqlite on serverless.
    const dbUrl = process.env.DATABASE_URL || "";
    const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
    console.log("[swipe] DB URL check:", { isPostgres, dbUrlPrefix: dbUrl.substring(0, 20) + "..." });
    
    if (isPostgres) {
      try {
        const result = await prisma.swipe.create({
          data: { fromFid, toFid, action },
        });
        console.log("[swipe] DB write success:", result.id);
      } catch (e: any) {
        console.error("[swipe] DB write failed:", e?.message || e);
        // Don't fail the request, but log the error
      }
    } else {
      console.log("[swipe] Skipping DB write (not Postgres)");
    }

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


