import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const headline = typeof body?.headline === "string" ? body.headline : "";
    const interests = typeof body?.interests === "string" ? body.interests : "";
    const skills = typeof body?.skills === "string" ? body.skills : "";

    const dbUrl = process.env.DATABASE_URL || "";
    const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
    if (isPostgres) {
      try {
        await prisma.userExtra.upsert({
          create: { fid: 0, headline, interests, skills },
          update: { headline, interests, skills },
          where: { fid: 0 },
        });
      } catch (e) {
        console.warn("DB write failed:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}


