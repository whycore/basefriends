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

    // Lookup user by address using Neynar SDK
    // Use fetchBulkUsersByEthOrSolAddress - available in Starter plan
    const normalizedAddress = address.toLowerCase();
    
    console.log("[lookup-fid] Starting lookup for address:", normalizedAddress);
    
    try {
      // Use Neynar SDK method - this is the correct way for Starter plan
      const { getNeynarClient } = await import("@/lib/neynar");
      const client = getNeynarClient();
      
      console.log("[lookup-fid] Using Neynar SDK fetchBulkUsersByEthOrSolAddress...");
      
      // This method is available in Starter plan
      const response = await client.fetchBulkUsersByEthOrSolAddress({
        addresses: [normalizedAddress],
      });
      
      console.log("[lookup-fid] SDK response:", {
        hasUsers: !!response.users,
        userCount: response.users?.length || 0,
      });
      
      if (response.users && response.users.length > 0) {
        const user = response.users[0];
        console.log("[lookup-fid] ✅ FID found via SDK:", user.fid);
        return NextResponse.json({
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
        });
      } else {
        console.log("[lookup-fid] ⚠️ No users found for this address");
      }
    } catch (sdkError: any) {
      console.error("[lookup-fid] SDK method failed:", {
        message: sdkError?.message,
        status: sdkError?.response?.status,
        data: sdkError?.response?.data,
      });
      
      // Fallback: Try direct API call as backup
      try {
        console.log("[lookup-fid] Trying direct API call as fallback...");
        const apiKey = process.env.NEYNAR_API_KEY;
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/by_custody_address?custody_address=${normalizedAddress}`,
          {
            headers: {
              "api_key": apiKey || "",
              "accept": "application/json",
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.result?.user?.fid) {
            const user = data.result.user;
            console.log("[lookup-fid] ✅ FID found via direct API:", user.fid);
            return NextResponse.json({
              fid: user.fid,
              username: user.username,
              displayName: user.display_name,
            });
          }
        }
      } catch (apiError: any) {
        console.error("[lookup-fid] Direct API fallback also failed:", apiError?.message);
      }
    }

    // All methods failed - return helpful error message
    return NextResponse.json(
      { 
        error: "FID not found for this address",
        message: "No Farcaster account found for this wallet address. Make sure the wallet is connected to a Farcaster account, or use Farcaster context from Base App.",
      },
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

