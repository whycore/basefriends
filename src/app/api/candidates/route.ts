import { NextRequest, NextResponse } from "next/server";
import { getNeynarClient } from "@/lib/neynar";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDevMock = searchParams.get("dev") === "1";

    // Fallback to mock when requested or when NEYNAR_API_KEY is missing
    if (isDevMock || !process.env.NEYNAR_API_KEY) {
      return NextResponse.json({ candidates: mockCandidates() });
    }

    // Simple seed candidate list for PoC; replace with smarter selection later.
    const seedFids = [2, 3, 5650, 565, 6131, 8090, 12, 602, 999];
    const client = getNeynarClient();
    const viewerFid = 0;
    const resp = await client.fetchBulkUsers({
      fids: seedFids,
      viewerFid,
    });
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

    return NextResponse.json({ candidates });
  } catch (error: any) {
    console.error("GET /api/candidates error", error);
    // Last-resort: return mock to avoid blocking dev
    return NextResponse.json({ candidates: mockCandidates(), warning: "mock_fallback" }, { status: 200 });
  }
}


