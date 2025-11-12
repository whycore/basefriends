import { NextRequest, NextResponse } from "next/server";
import { getNeynarClient } from "@/lib/neynar";

/**
 * Lookup Farcaster FID from wallet address
 * POST /api/lookup-fid
 * Body: { address: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    
    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: "Neynar API key not configured" },
        { status: 500 }
      );
    }

    const client = getNeynarClient();
    
    // Lookup user by address using Neynar API
    // Use fetchBulkUsers with verifications parameter (addresses)
    const normalizedAddress = address.toLowerCase();
    
    try {
      // Try using fetchBulkUsers with verifications parameter
      const resp = await client.fetchBulkUsers({
        verifications: [normalizedAddress],
      });
      
      if (resp.users && resp.users.length > 0) {
        const user = resp.users[0];
        return NextResponse.json({
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
        });
      }
    } catch (e: any) {
      console.log("[lookup-fid] fetchBulkUsers with verifications failed, trying alternative:", e?.message);
      
      // Fallback: try direct HTTP call to Neynar API
      try {
        const apiKey = process.env.NEYNAR_API_KEY;
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/by_verification?verification=${normalizedAddress}`,
          {
            headers: {
              "api_key": apiKey || "",
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.result && data.result.user) {
            const user = data.result.user;
            return NextResponse.json({
              fid: user.fid,
              username: user.username,
              displayName: user.display_name,
            });
          }
        }
      } catch (e2: any) {
        console.error("[lookup-fid] Direct API call also failed:", e2?.message);
      }
    }

    return NextResponse.json(
      { error: "FID not found for this address" },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("[lookup-fid] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to lookup FID" },
      { status: 500 }
    );
  }
}

