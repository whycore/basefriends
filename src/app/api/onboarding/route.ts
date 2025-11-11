import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const headline = typeof body?.headline === "string" ? body.headline : "";
    const interests = typeof body?.interests === "string" ? body.interests : "";
    const skills = typeof body?.skills === "string" ? body.skills : "";

    // In serverless staging, avoid writing to SQLite (read-only). For production, use Postgres and enable DB write.
    // try {
    //   await prisma.userExtra.upsert({
    //     create: { fid: 0, headline, interests, skills },
    //     update: { headline, interests, skills },
    //     where: { fid: 0 },
    //   });
    // } catch (e) {
    //   console.warn("Skipping onboarding DB write in serverless environment:", e);
    // }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}


