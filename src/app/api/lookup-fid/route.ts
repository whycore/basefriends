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
    
    console.log("[lookup-fid] Starting lookup for address:", normalizedAddress);
    
    if (!apiKey) {
      console.error("[lookup-fid] NEYNAR_API_KEY not configured");
      return NextResponse.json(
        { error: "Neynar API key not configured" },
        { status: 500 }
      );
    }
    
    try {
      // Try Neynar API v2 endpoint for user lookup by verification address
      const apiUrl = `https://api.neynar.com/v2/farcaster/user/by_verification?verification=${normalizedAddress}`;
      console.log("[lookup-fid] Calling Neynar API:", apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          "api_key": apiKey,
          "accept": "application/json",
        },
      });
      
      console.log("[lookup-fid] API response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("[lookup-fid] API response data:", JSON.stringify(data).substring(0, 500));
        
        // Handle different response formats
        let user = null;
        if (data.result && data.result.user) {
          user = data.result.user;
        } else if (data.user) {
          user = data.user;
        } else if (data.result && data.result.fid) {
          // Direct result format
          user = data.result;
        }
        
        if (user && user.fid) {
          console.log("[lookup-fid] ✅ FID found:", user.fid);
          return NextResponse.json({
            fid: user.fid,
            username: user.username,
            displayName: user.display_name,
          });
        } else {
          console.log("[lookup-fid] ⚠️ User found but no FID in response");
        }
      } else {
        const errorText = await response.text();
        console.error("[lookup-fid] API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
        });
      }
    } catch (e: any) {
      console.error("[lookup-fid] API call failed:", {
        message: e?.message,
        stack: e?.stack,
      });
      
      // Fallback: try alternative endpoint format
      try {
        console.log("[lookup-fid] Trying alternative endpoint...");
        const response = await fetch(
          `https://api.neynar.com/v1/farcaster/user/by_verification?address=${normalizedAddress}`,
          {
            headers: {
              "api_key": apiKey,
              "accept": "application/json",
            },
          }
        );
        
        console.log("[lookup-fid] Alternative endpoint status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("[lookup-fid] Alternative endpoint data:", JSON.stringify(data).substring(0, 500));
          
          if (data.result && data.result.fid) {
            console.log("[lookup-fid] ✅ FID found from alternative endpoint:", data.result.fid);
            return NextResponse.json({
              fid: data.result.fid,
              username: data.result.username,
              displayName: data.result.display_name,
            });
          }
        } else {
          const errorText = await response.text();
          console.error("[lookup-fid] Alternative endpoint error:", errorText.substring(0, 500));
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

