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
    // Neynar supports lookupUserByVerification with address
    try {
      // Try using lookupUserByVerification (standard method for address lookup)
      const user = await client.lookupUserByVerification(address);
      
      if (user && user.fid) {
        return NextResponse.json({
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
        });
      }
    } catch (e: any) {
      console.log("[lookup-fid] lookupUserByVerification failed, trying fetchBulkUsers:", e?.message);
      
      // Fallback: try using fetchBulkUsers with addresses parameter
      try {
        const resp = await client.fetchBulkUsers({
          addresses: [address.toLowerCase()], // Ensure lowercase
        });
        
        if (resp.users && resp.users.length > 0) {
          const user = resp.users[0];
          return NextResponse.json({
            fid: user.fid,
            username: user.username,
            displayName: user.display_name,
          });
        }
      } catch (e2: any) {
        console.error("[lookup-fid] fetchBulkUsers also failed:", e2?.message);
        
        // Last resort: try with viewerFid
        try {
          const resp = await client.fetchBulkUsers({
            addresses: [address.toLowerCase()],
            viewerFid: 1, // Use a valid FID
          });
          
          if (resp.users && resp.users.length > 0) {
            const user = resp.users[0];
            return NextResponse.json({
              fid: user.fid,
              username: user.username,
              displayName: user.display_name,
            });
          }
        } catch (e3: any) {
          console.error("[lookup-fid] All methods failed:", e3?.message);
        }
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

