import { NextRequest, NextResponse } from "next/server";

/**
 * Check FID for a wallet address
 * GET /api/check-fid?address=0x...
 * 
 * Example:
 * /api/check-fid?address=0xA9561EC5d5ac4964aD0AB7682B6aC5031c2F65F6
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    
    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { 
          error: "Address parameter is required",
          usage: "/api/check-fid?address=0x...",
          example: "/api/check-fid?address=0xA9561EC5d5ac4964aD0AB7682B6aC5031c2F65F6"
        },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();
    
    console.log("[check-fid] Checking FID for address:", normalizedAddress);
    
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { 
          error: "Neynar API key not configured",
          address: normalizedAddress,
          hasFid: false,
        },
        { status: 500 }
      );
    }

    try {
      const { getNeynarClient } = await import("@/lib/neynar");
      const client = getNeynarClient();
      const apiKey = process.env.NEYNAR_API_KEY;
      
      // Log available methods for debugging
      const availableMethods = Object.keys(client).filter(k => 
        k.toLowerCase().includes("address") || 
        k.toLowerCase().includes("verification") ||
        k.toLowerCase().includes("user") ||
        k.toLowerCase().includes("fetch")
      );
      console.log("[check-fid] Available Neynar client methods:", availableMethods.slice(0, 20));
      
      // Method 1: Try custody address lookup via SDK
      console.log("[check-fid] Method 1: Trying custody address lookup via SDK...");
      try {
        const response = await (client as any).fetchBulkUsersByEthOrSolAddress({
          addresses: [normalizedAddress],
        });
        
        if (response.users && response.users.length > 0) {
          const user = response.users[0];
          console.log("[check-fid] ✅ FID found (custody address):", user.fid);
          return NextResponse.json({
            success: true,
            hasFid: true,
            address: normalizedAddress,
            fid: user.fid,
            username: user.username,
            displayName: user.display_name,
            pfpUrl: user.pfp_url,
            method: "custody_address_sdk",
          });
        }
        console.log("[check-fid] Method 1: No users found");
      } catch (e1: any) {
        console.log("[check-fid] Method 1 failed:", e1?.message);
      }
      
      // Method 2: Try direct API call for custody address
      console.log("[check-fid] Method 2: Trying direct API call (custody address)...");
      try {
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/by_custody_address?custody_address=${normalizedAddress}`,
          {
            headers: {
              "api_key": apiKey || "",
              "accept": "application/json",
            },
          }
        );
        
        console.log("[check-fid] Method 2 response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("[check-fid] Method 2 response data:", JSON.stringify(data).substring(0, 500));
          
          let user = null;
          if (data.result?.user) user = data.result.user;
          else if (data.user) user = data.user;
          else if (data.result?.fid) user = data.result;
          
          if (user?.fid) {
            console.log("[check-fid] ✅ FID found (custody address API):", user.fid);
            return NextResponse.json({
              success: true,
              hasFid: true,
              address: normalizedAddress,
              fid: user.fid,
              username: user.username,
              displayName: user.display_name,
              pfpUrl: user.pfp_url,
              method: "custody_address_api",
            });
          }
        } else {
          const errorText = await response.text();
          console.log("[check-fid] Method 2 error:", errorText.substring(0, 300));
        }
      } catch (e2: any) {
        console.log("[check-fid] Method 2 failed:", e2?.message);
      }
      
      // Method 3: Try verification address lookup via SDK
      console.log("[check-fid] Method 3: Trying verification address lookup via SDK...");
      try {
        if (typeof (client as any).lookupUserByVerification === "function") {
          const verifResponse = await (client as any).lookupUserByVerification(normalizedAddress);
          if (verifResponse?.fid) {
            console.log("[check-fid] ✅ FID found (verification address SDK):", verifResponse.fid);
            return NextResponse.json({
              success: true,
              hasFid: true,
              address: normalizedAddress,
              fid: verifResponse.fid,
              username: verifResponse.username,
              displayName: verifResponse.display_name,
              pfpUrl: verifResponse.pfp_url,
              method: "verification_address_sdk",
            });
          }
        }
      } catch (e3: any) {
        console.log("[check-fid] Method 3 failed:", e3?.message);
      }
      
      // Method 4: Try direct API call for verification address
      console.log("[check-fid] Method 4: Trying direct API call (verification address)...");
      try {
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/by_verification?verification=${normalizedAddress}`,
          {
            headers: {
              "api_key": apiKey || "",
              "accept": "application/json",
            },
          }
        );
        
        console.log("[check-fid] Method 4 response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("[check-fid] Method 4 response data:", JSON.stringify(data).substring(0, 500));
          
          let user = null;
          if (data.result?.user) user = data.result.user;
          else if (data.user) user = data.user;
          else if (data.result?.fid) user = data.result;
          
          if (user?.fid) {
            console.log("[check-fid] ✅ FID found (verification address API):", user.fid);
            return NextResponse.json({
              success: true,
              hasFid: true,
              address: normalizedAddress,
              fid: user.fid,
              username: user.username,
              displayName: user.display_name,
              pfpUrl: user.pfp_url,
              method: "verification_address_api",
            });
          }
        } else {
          const errorText = await response.text();
          console.log("[check-fid] Method 4 error:", errorText.substring(0, 300));
        }
      } catch (e4: any) {
        console.log("[check-fid] Method 4 failed:", e4?.message);
      }
      
      // No FID found after trying all methods
      console.log("[check-fid] ❌ No FID found for address after trying all methods:", normalizedAddress);
      return NextResponse.json({
        success: true,
        hasFid: false,
        address: normalizedAddress,
        message: "No Farcaster account found for this wallet address using Neynar API lookup methods.",
        note: "If this wallet is connected to Farcaster, it might be that: 1) The address is not indexed by Neynar yet, 2) The address is a verification address but not custody address, 3) Or you need to use Farcaster context from Base App instead.",
        methodsTried: [
          "fetchBulkUsersByEthOrSolAddress (SDK)",
          "by_custody_address (Direct API)",
          "lookupUserByVerification (SDK)",
          "by_verification (Direct API)",
        ],
        suggestion: "If you're using Base App, FID should be available from Farcaster context (sdk.context.fid) without needing API lookup.",
      });
      
    } catch (error: any) {
      console.error("[check-fid] Lookup error:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      
      return NextResponse.json({
        success: false,
        hasFid: false,
        address: normalizedAddress,
        error: error?.message || "Failed to lookup FID",
        details: error?.response?.data,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("[check-fid] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to check FID" },
      { status: 500 }
    );
  }
}

