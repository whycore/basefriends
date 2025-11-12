import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Import cache functions from candidates route to invalidate cache
// Note: In production, consider using a shared cache service (Redis, etc.)
function invalidateCandidateCache(viewerFid: number): void {
  // Cache invalidation will be handled by TTL expiration
  // For immediate invalidation, we could use a shared cache service
  console.log("[swipe] Candidate cache should be invalidated for viewerFid:", viewerFid);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toFid = Number(body?.toFid);
    const fromFid = Number(body?.fromFid) || 0; // Use provided fid or default to 0
    const action = body?.action === "follow" ? "follow" : "skip";

    if (!toFid) {
      return NextResponse.json({ error: "invalid_toFid" }, { status: 400 });
    }

    // Enable write only when using Postgres (Supabase/Neon). Skip for file-based sqlite on serverless.
    const dbUrl = process.env.DATABASE_URL || "";
    const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
    console.log("[swipe] Request:", { action, fromFid, toFid, isPostgres, dbUrlPrefix: dbUrl.substring(0, 20) + "..." });
    
    if (isPostgres) {
      try {
        // Ensure User exists for fromFid (if needed for future foreign keys)
        await prisma.user.upsert({
          where: { fid: fromFid },
          update: {},
          create: { fid: fromFid },
        }).catch((e) => {
          console.log("[swipe] User upsert (non-fatal):", e?.message || "already exists");
        });
        
        // Use create with unique constraint handling - if duplicate, update instead
        try {
          const result = await prisma.swipe.create({
            data: { fromFid, toFid, action },
          });
          console.log("[swipe] DB write success (create):", { id: result.id, action, fromFid, toFid });
          
          // Invalidate candidate cache since user has swiped
          if (fromFid > 0) {
            invalidateCandidateCache(fromFid);
          }
          
          // If follow action, also cache in FollowCached
          if (action === "follow") {
            // Check if already exists, then upsert
            const existing = await prisma.followCached.findFirst({
              where: { fromFid, toFid },
            }).catch(() => null);
            
            if (existing) {
              await prisma.followCached.update({
                where: { id: existing.id },
                data: {
                  status: "attempted",
                  lastCheckedAt: new Date(),
                },
              }).catch((e) => {
                console.log("[swipe] FollowCached update (non-fatal):", e?.message);
              });
            } else {
              await prisma.followCached.create({
                data: {
                  fromFid,
                  toFid,
                  status: "attempted",
                  lastCheckedAt: new Date(),
                },
              }).catch((e) => {
                console.log("[swipe] FollowCached create (non-fatal):", e?.message);
              });
            }
          }
        } catch (createError: any) {
          // If duplicate (unique constraint), update instead
          if (createError?.code === "P2002" || createError?.message?.includes("Unique constraint")) {
            const result = await prisma.swipe.updateMany({
              where: { fromFid, toFid },
              data: { action },
            });
            console.log("[swipe] DB write success (update):", { updated: result.count, action, fromFid, toFid });
          
          // Invalidate candidate cache since user has swiped
          if (fromFid > 0) {
            invalidateCandidateCache(fromFid);
          }
            
            // If follow action, also cache in FollowCached
            if (action === "follow") {
              // Check if already exists, then upsert
              const existing = await prisma.followCached.findFirst({
                where: { fromFid, toFid },
              }).catch(() => null);
              
              if (existing) {
                await prisma.followCached.update({
                  where: { id: existing.id },
                  data: {
                    status: "attempted",
                    lastCheckedAt: new Date(),
                  },
                }).catch((e) => {
                  console.log("[swipe] FollowCached update (non-fatal):", e?.message);
                });
              } else {
                await prisma.followCached.create({
                  data: {
                    fromFid,
                    toFid,
                    status: "attempted",
                    lastCheckedAt: new Date(),
                  },
                }).catch((e) => {
                  console.log("[swipe] FollowCached create (non-fatal):", e?.message);
                });
              }
            }
          } else {
            throw createError; // Re-throw if it's a different error
          }
        }
      } catch (e: any) {
        console.error("[swipe] DB write failed:", {
          action,
          fromFid,
          toFid,
          error: e?.message || String(e),
          code: e?.code,
          stack: e?.stack,
        });
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


