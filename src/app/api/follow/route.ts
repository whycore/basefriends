import { NextRequest, NextResponse } from "next/server";
import { getNeynarClient } from "@/lib/neynar";
import { getSigner } from "@/lib/signer";

/**
 * Follow a user on Farcaster
 * POST /api/follow
 * Body: { toFid: number, fromFid?: number }
 * 
 * Requires SIWN integration - user must have authorized the app via OAuth
 * and have an active signer stored in the database.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toFid = Number(body?.toFid);
    const fromFid = Number(body?.fromFid) || 0;
    
    if (!toFid) {
      return NextResponse.json({ error: "invalid_toFid" }, { status: 400 });
    }

    if (!fromFid || fromFid === 0) {
      return NextResponse.json({ 
        error: "invalid_fromFid",
        message: "FID is required. Please ensure you're logged in with Farcaster."
      }, { status: 400 });
    }

    console.log("[follow] Follow request:", { fromFid, toFid });

    // Get user's stored signer
    const signer = await getSigner(fromFid);

    if (!signer) {
      console.log("[follow] No active signer found for FID:", fromFid);
      return NextResponse.json({ 
        error: "no_signer",
        message: "No active signer found. Please connect your Farcaster account via SIWN.",
        requiresAuth: true
      }, { status: 401 });
    }

    console.log("[follow] Using signer:", signer.signerUuid);

    // Use Neynar SDK to follow user
    try {
      const client = getNeynarClient();
      
      // Call Neynar API to follow user
      // Note: The exact method name may vary based on Neynar SDK version
      // Check Neynar SDK documentation for the correct method
      const followResponse = await fetch("https://api.neynar.com/v2/farcaster/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_key": process.env.NEYNAR_API_KEY || "",
        },
        body: JSON.stringify({
          signer_uuid: signer.signerUuid,
          target_fid: toFid,
        }),
      });

      if (!followResponse.ok) {
        const errorText = await followResponse.text();
        console.error("[follow] Neynar API error:", followResponse.status, errorText);
        
        // If 401/403, signer might be invalid
        if (followResponse.status === 401 || followResponse.status === 403) {
          return NextResponse.json({ 
            error: "signer_invalid",
            message: "Signer is invalid or expired. Please reconnect your Farcaster account.",
            requiresAuth: true
          }, { status: 401 });
        }

        return NextResponse.json({ 
          error: "follow_failed",
          message: `Failed to follow user: ${followResponse.status}`,
          details: errorText
        }, { status: followResponse.status });
      }

      const followData = await followResponse.json();
      console.log("[follow] Successfully followed user:", toFid);

      return NextResponse.json({ 
        ok: true,
        message: "Successfully followed user",
        data: followData
      });
    } catch (apiError: any) {
      console.error("[follow] API call error:", apiError);
      return NextResponse.json({ 
        error: "api_error",
        message: apiError?.message || "Failed to call Neynar API"
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("[follow] Error:", error);
    return NextResponse.json({ 
      error: "failed", 
      message: error?.message || "Internal server error"
    }, { status: 500 });
  }
}


