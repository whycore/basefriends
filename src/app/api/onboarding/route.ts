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
    console.log("[onboarding] Request:", { 
      isPostgres, 
      dbUrlPrefix: dbUrl.substring(0, 20) + "...",
      hasHeadline: !!headline,
      hasInterests: !!interests,
      hasSkills: !!skills,
    });
    
    if (isPostgres) {
      try {
        // Ensure User exists first (foreign key constraint)
        await prisma.user.upsert({
          where: { fid: 0 },
          update: {},
          create: { fid: 0 },
        });
        console.log("[onboarding] User upsert success");
        
        // Then upsert UserExtra
        const result = await prisma.userExtra.upsert({
          create: { fid: 0, headline, interests, skills },
          update: { headline, interests, skills },
          where: { fid: 0 },
        });
        console.log("[onboarding] DB write success:", { fid: result.fid, headline: result.headline?.substring(0, 20) });
      } catch (e: any) {
        console.error("[onboarding] DB write failed:", {
          error: e?.message || String(e),
          code: e?.code,
          stack: e?.stack,
        });
        // Don't fail the request, but log the error
      }
    } else {
      console.log("[onboarding] Skipping DB write (not Postgres)");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}


