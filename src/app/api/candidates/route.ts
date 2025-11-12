import { NextRequest, NextResponse } from "next/server";
import { getNeynarClient } from "@/lib/neynar";
import { prisma } from "@/lib/prisma";

// In-memory cache for candidates (5 minutes TTL)
const candidateCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

function getCacheKey(viewerFid: number, limit: number): string {
  return `candidates:${viewerFid}:${limit}`;
}

function getCachedCandidates(key: string): any | null {
  const cached = candidateCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  if (cached) {
    candidateCache.delete(key); // Remove expired cache
  }
  return null;
}

function setCachedCandidates(key: string, data: any): void {
  candidateCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  });
  
  // Clean up old cache entries periodically (keep cache size reasonable)
  if (candidateCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of candidateCache.entries()) {
      if (v.expiresAt <= now) {
        candidateCache.delete(k);
      }
    }
  }
}

function mockCandidates() {
  return [
    {
      fid: 1001,
      username: "alice",
      displayName: "Alice",
      pfpUrl: "",
      followerCount: 123,
      followingCount: 456,
      bio: "Builder on Base. Exploring Farcaster.",
    },
    {
      fid: 1002,
      username: "bob",
      displayName: "Bob",
      pfpUrl: "",
      followerCount: 78,
      followingCount: 90,
      bio: "Full-stack dev. Networking for collabs.",
    },
    {
      fid: 1003,
      username: "carol",
      displayName: "Carol",
      pfpUrl: "",
      followerCount: 42,
      followingCount: 21,
      bio: "Designer. Open to new projects.",
    },
  ];
}

/**
 * Get candidates for swiping
 * GET /api/candidates?viewerFid=123&limit=10
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDevMock = searchParams.get("dev") === "1";
    const viewerFidParam = searchParams.get("viewerFid");
    const viewerFid = viewerFidParam ? Number(viewerFidParam) : 0;
    const limit = Number(searchParams.get("limit")) || 10;
    const skipCache = searchParams.get("nocache") === "1";

    // Fallback to mock when requested or when NEYNAR_API_KEY is missing
    if (isDevMock || !process.env.NEYNAR_API_KEY) {
      return NextResponse.json({ candidates: mockCandidates() });
    }

    // Check cache first (unless skipCache is requested)
    if (!skipCache) {
      const cacheKey = getCacheKey(viewerFid, limit);
      const cached = getCachedCandidates(cacheKey);
      if (cached) {
        console.log("[candidates] Returning cached candidates for", cacheKey);
        return NextResponse.json(cached, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // 5 min cache, 10 min stale
            "X-Cache": "HIT",
          },
        });
      }
    }

    const client = getNeynarClient();
    const dbUrl = process.env.DATABASE_URL || "";
    const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

    // Get already swiped FIDs from database (if viewerFid provided and Postgres available)
    let swipedFids: number[] = [];
    if (isPostgres && viewerFid > 0) {
      try {
        const swiped = await prisma.swipe.findMany({
          where: { fromFid: viewerFid },
          select: { toFid: true },
        });
        swipedFids = swiped.map((s) => s.toFid);
        console.log("[candidates] Found", swipedFids.length, "already swiped users for FID", viewerFid);
      } catch (dbError: any) {
        console.warn("[candidates] Failed to fetch swiped users:", dbError?.message);
      }
    }

    // Strategy 1: Try to get mutuals/followers if viewerFid is provided
    let candidateFids: number[] = [];
    
    if (viewerFid > 0) {
      const apiKey = process.env.NEYNAR_API_KEY;
      
      // Try to get following list (people they follow) via direct API
      try {
        const followingResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/following?fid=${viewerFid}&limit=50`,
          {
            headers: {
              "api_key": apiKey || "",
              "accept": "application/json",
            },
          }
        );
        
        if (followingResponse.ok) {
          const followingData = await followingResponse.json();
          if (followingData?.result?.users && followingData.result.users.length > 0) {
            candidateFids = followingData.result.users
              .map((u: any) => u.fid)
              .filter((fid: number) => !swipedFids.includes(fid) && fid !== viewerFid)
              .slice(0, limit);
            
            console.log("[candidates] Found", candidateFids.length, "candidates from following list");
          }
        }
      } catch (followingError: any) {
        console.log("[candidates] Failed to fetch following list:", followingError?.message);
      }

      // If not enough candidates, try followers (people who follow them)
      if (candidateFids.length < limit) {
        try {
          const followersResponse = await fetch(
            `https://api.neynar.com/v2/farcaster/user/followers?fid=${viewerFid}&limit=50`,
            {
              headers: {
                "api_key": apiKey || "",
                "accept": "application/json",
              },
            }
          );
          
          if (followersResponse.ok) {
            const followersData = await followersResponse.json();
            if (followersData?.result?.users && followersData.result.users.length > 0) {
              const followerFids = followersData.result.users
                .map((u: any) => u.fid)
                .filter((fid: number) => !swipedFids.includes(fid) && !candidateFids.includes(fid) && fid !== viewerFid)
                .slice(0, limit - candidateFids.length);
              
              candidateFids = [...candidateFids, ...followerFids];
              console.log("[candidates] Added", followerFids.length, "candidates from followers list");
            }
          }
        } catch (followersError: any) {
          console.log("[candidates] Failed to fetch followers list:", followersError?.message);
        }
      }
    }

    // Strategy 2: Fallback to seed list if no mutuals/followers found or viewerFid not provided
    if (candidateFids.length < limit) {
      const seedFids = [2, 3, 5650, 565, 6131, 8090, 12, 602, 999, 1, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15];
      const availableSeeds = seedFids.filter(
        (fid) => !swipedFids.includes(fid) && !candidateFids.includes(fid) && fid !== viewerFid
      );
      candidateFids = [...candidateFids, ...availableSeeds].slice(0, limit);
      console.log("[candidates] Using seed FIDs as fallback, total candidates:", candidateFids.length);
    }

    if (candidateFids.length === 0) {
      console.log("[candidates] No candidates available");
      return NextResponse.json({ candidates: [], message: "No more candidates available" });
    }

    // Fetch user details for candidate FIDs
    let resp;
    try {
      resp = await client.fetchBulkUsers({
        fids: candidateFids,
        viewerFid: viewerFid > 0 ? viewerFid : undefined,
      });
    } catch (e: any) {
      console.log("[candidates] Retrying without viewerFid...");
      resp = await client.fetchBulkUsers({
        fids: candidateFids,
      });
    }

    const candidates =
      resp.users?.map((u: any) => ({
        fid: u.fid,
        username: u.username,
        displayName: u.display_name,
        pfpUrl: u.pfp_url,
        followerCount: u.follower_count,
        followingCount: u.following_count,
        bio: u.profile?.bio?.text,
      })) ?? [];

    const result = { candidates };
    
    // Cache the result (unless skipCache is requested)
    if (!skipCache) {
      const cacheKey = getCacheKey(viewerFid, limit);
      setCachedCandidates(cacheKey, result);
      console.log("[candidates] Cached candidates for", cacheKey);
    }

    console.log("[candidates] Returning", candidates.length, "candidates");
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // 5 min cache, 10 min stale
        "X-Cache": "MISS",
      },
    });
  } catch (error: any) {
    console.error("GET /api/candidates error", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    // Last-resort: return mock to avoid blocking dev
    return NextResponse.json({ candidates: mockCandidates(), warning: "mock_fallback" }, { status: 200 });
  }
}


