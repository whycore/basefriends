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
      
      console.log("[lookup-fid] Using Neynar SDK...");
      console.log("[lookup-fid] Client methods:", Object.keys(client).filter(k => k.includes("fetch") || k.includes("Address") || k.includes("User")).slice(0, 10));
      
      // Check if method exists
      if (typeof (client as any).fetchBulkUsersByEthOrSolAddress === "function") {
        console.log("[lookup-fid] Using fetchBulkUsersByEthOrSolAddress...");
        
        // This method is available in Starter plan
        const response = await (client as any).fetchBulkUsersByEthOrSolAddress({
          addresses: [normalizedAddress],
        });
        
        console.log("[lookup-fid] SDK response:", {
          hasUsers: !!response.users,
          userCount: response.users?.length || 0,
        });
        
        if (response.users && response.users.length > 0) {
          const user = response.users[0];
          console.log("[lookup-fid] ✅ FID found via SDK (custody address):", user.fid);
          return NextResponse.json({
            fid: user.fid,
            username: user.username,
            displayName: user.display_name,
          });
        } else {
          console.log("[lookup-fid] ⚠️ No users found for custody address, trying verification address...");
          
          // Try lookup by verification address instead (verified wallet address)
          // Some users might have verified this address but it's not their custody address
          try {
            if (typeof (client as any).lookupUserByVerification === "function") {
              console.log("[lookup-fid] Trying lookupUserByVerification...");
              const verifResponse = await (client as any).lookupUserByVerification(normalizedAddress);
              if (verifResponse?.fid) {
                console.log("[lookup-fid] ✅ FID found via verification address:", verifResponse.fid);
                return NextResponse.json({
                  fid: verifResponse.fid,
                  username: verifResponse.username,
                  displayName: verifResponse.display_name,
                });
              }
            }
          } catch (verifError: any) {
            console.log("[lookup-fid] Verification lookup also failed:", verifError?.message);
          }
          
          console.log("[lookup-fid] ⚠️ No Farcaster account found for this wallet address");
        }
      } else {
        console.log("[lookup-fid] ⚠️ fetchBulkUsersByEthOrSolAddress method not found, trying alternative...");
        throw new Error("Method not found");
      }
    } catch (sdkError: any) {
      console.error("[lookup-fid] SDK method failed:", {
        message: sdkError?.message,
        status: sdkError?.response?.status,
        statusText: sdkError?.response?.statusText,
        data: sdkError?.response?.data,
        stack: sdkError?.stack?.substring(0, 500),
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
        message: `No Farcaster account found for wallet address ${normalizedAddress}. This wallet address is not connected to any Farcaster account. To use BaseFriends, please:
1. Connect your wallet to a Farcaster account (via Warpcast or other Farcaster client)
2. Or open this app in Base App where Farcaster context is automatically available`,
        address: normalizedAddress,
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

