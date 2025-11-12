import { NextRequest, NextResponse } from "next/server";

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

    // Lookup user by address using Neynar API
    // Use direct HTTP call since fetchBulkUsers doesn't support address lookup
    const normalizedAddress = address.toLowerCase();
    const apiKey = process.env.NEYNAR_API_KEY;
    
    try {
      // Try Neynar API v2 endpoint for user lookup by verification address
      const response = await fetch(
        `https://api.neynar.com/v2/farcaster/user/by_verification?verification=${normalizedAddress}`,
        {
          headers: {
            "api_key": apiKey || "",
            "accept": "application/json",
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Handle different response formats
        let user = null;
        if (data.result && data.result.user) {
          user = data.result.user;
        } else if (data.user) {
          user = data.user;
        }
        
        if (user && user.fid) {
          return NextResponse.json({
            fid: user.fid,
            username: user.username,
            displayName: user.display_name,
          });
        }
      } else {
        console.log("[lookup-fid] API returned status:", response.status);
        const errorText = await response.text();
        console.log("[lookup-fid] Error response:", errorText);
      }
    } catch (e: any) {
      console.error("[lookup-fid] API call failed:", e?.message);
      
      // Fallback: try alternative endpoint format
      try {
        const response = await fetch(
          `https://api.neynar.com/v1/farcaster/user/by_verification?address=${normalizedAddress}`,
          {
            headers: {
              "api_key": apiKey || "",
              "accept": "application/json",
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.result && data.result.fid) {
            return NextResponse.json({
              fid: data.result.fid,
              username: data.result.username,
              displayName: data.result.display_name,
            });
          }
        }
      } catch (e2: any) {
        console.error("[lookup-fid] Alternative endpoint also failed:", e2?.message);
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

