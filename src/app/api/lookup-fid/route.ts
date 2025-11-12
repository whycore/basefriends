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
    
    // Try Base App's proxy endpoint first (if available)
    // Note: These might not be public endpoints, but worth trying
    const baseAppEndpoints = [
      // Try with custody address (wallet address)
      `https://www.base.dev/api/neynar/user-by-custody-address?address=${normalizedAddress}`,
      `https://base.org/api/neynar/user-by-custody-address?address=${normalizedAddress}`,
      // Try with verification address
      `https://www.base.dev/api/neynar/user-by-verification?address=${normalizedAddress}`,
      `https://base.org/api/neynar/user-by-verification?address=${normalizedAddress}`,
    ];
    
    // Try multiple Neynar API endpoints
    // Note: custody_address is the wallet address, verification is the verified address
    const neynarEndpoints = [
      // V2 endpoint with custody address (wallet address)
      `https://api.neynar.com/v2/farcaster/user/by_custody_address?custody_address=${normalizedAddress}`,
      // V2 endpoint with verification parameter
      `https://api.neynar.com/v2/farcaster/user/by_verification?verification=${normalizedAddress}`,
      // V2 endpoint with address parameter (might work as alias)
      `https://api.neynar.com/v2/farcaster/user/by_verification?address=${normalizedAddress}`,
      // V1 endpoint
      `https://api.neynar.com/v1/farcaster/user/by_verification?address=${normalizedAddress}`,
    ];
    
    // Try Base App endpoints first
    for (const apiUrl of baseAppEndpoints) {
      try {
        console.log("[lookup-fid] Trying Base App endpoint:", apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            "accept": "application/json",
          },
        });
        
        console.log("[lookup-fid] Base App response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("[lookup-fid] Base App response data:", JSON.stringify(data).substring(0, 1000));
          
          // Handle Base App response format
          let user = null;
          if (data.user) {
            user = data.user;
          } else if (data.fid) {
            user = data;
          } else if (data.result) {
            user = data.result;
          }
          
          if (user && user.fid) {
            console.log("[lookup-fid] ✅ FID found via Base App:", user.fid);
            return NextResponse.json({
              fid: user.fid,
              username: user.username || user.display_name,
              displayName: user.display_name || user.displayName,
            });
          }
        }
      } catch (e: any) {
        console.log("[lookup-fid] Base App endpoint failed:", e?.message);
        // Continue to next endpoint
      }
    }
    
    // Then try Neynar endpoints
    const endpoints = neynarEndpoints;
    
    for (const apiUrl of endpoints) {
      try {
        console.log("[lookup-fid] Trying endpoint:", apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            "api_key": apiKey,
            "accept": "application/json",
          },
        });
        
        console.log("[lookup-fid] Response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("[lookup-fid] Response data:", JSON.stringify(data).substring(0, 1000));
          
          // Handle different response formats
          let user = null;
          
          // Try various response structures
          if (data.result?.user) {
            user = data.result.user;
          } else if (data.result && data.result.fid) {
            user = data.result;
          } else if (data.user) {
            user = data.user;
          } else if (data.fid) {
            user = data;
          }
          
          if (user && user.fid) {
            console.log("[lookup-fid] ✅ FID found:", user.fid);
            return NextResponse.json({
              fid: user.fid,
              username: user.username || user.display_name,
              displayName: user.display_name || user.displayName,
            });
          } else {
            console.log("[lookup-fid] ⚠️ Response OK but no user/FID found in data structure");
          }
        } else {
          const errorText = await response.text();
          console.log("[lookup-fid] Endpoint returned error:", {
            status: response.status,
            error: errorText.substring(0, 300),
          });
        }
      } catch (e: any) {
        console.error("[lookup-fid] Endpoint failed:", {
          url: apiUrl,
          error: e?.message,
        });
        // Continue to next endpoint
      }
    }
    
    // If all endpoints failed, try using Neynar SDK if available
    try {
      console.log("[lookup-fid] Trying Neynar SDK method...");
      const { getNeynarClient } = await import("@/lib/neynar");
      const client = getNeynarClient();
      
      // Try to search users by address (if method exists)
      // Note: This might not work, but worth trying
      const searchResult = await (client as any).searchUser?.(normalizedAddress);
      if (searchResult?.fid) {
        console.log("[lookup-fid] ✅ FID found via SDK search:", searchResult.fid);
        return NextResponse.json({
          fid: searchResult.fid,
          username: searchResult.username,
          displayName: searchResult.display_name,
        });
      }
    } catch (sdkError: any) {
      console.log("[lookup-fid] SDK method not available:", sdkError?.message);
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

