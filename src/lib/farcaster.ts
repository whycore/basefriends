import { sdk } from "@farcaster/miniapp-sdk";

export interface FarcasterContext {
  fid: number;
  username?: string;
  displayName?: string;
  accountAddress?: string;
}

let sdkInitialized = false;

export async function initializeFarcasterSDK(): Promise<void> {
  if (sdkInitialized) return;
  try {
    await sdk.actions.ready();
    sdkInitialized = true;
  } catch (error) {
    console.warn(
      "Farcaster SDK initialization failed (might be running outside Base App):",
      error,
    );
  }
}

export async function getFarcasterContext(): Promise<FarcasterContext | null> {
  try {
    if (!sdkInitialized) {
      await initializeFarcasterSDK();
    }
    
    // Safely access context with proper error handling
    let context: any = null;
    try {
      context = (sdk as any).context;
    } catch (e) {
      console.log("[farcaster] Direct context access failed, trying alternatives");
      try {
        context = (sdk as any).client?.context;
      } catch (e2) {
        try {
          context = typeof (sdk as any).getContext === "function" ? (sdk as any).getContext() : null;
        } catch (e3) {
          console.warn("[farcaster] All context access methods failed");
        }
      }
    }
    
    // Log for debugging - safely
    try {
      console.log("[farcaster] Context check:", {
        hasSDK: !!sdk,
        hasContext: !!context,
        contextType: typeof context,
      });
      
      if (context) {
        console.log("[farcaster] Context keys:", Object.keys(context).slice(0, 10));
      }
    } catch (logError) {
      console.warn("[farcaster] Logging failed:", logError);
    }
    
    // Safely extract FID
    let fid = 0;
    try {
      if (context) {
        if (typeof context.fid === "number") {
          fid = context.fid;
        } else if (typeof context.fid === "string") {
          fid = parseInt(context.fid, 10) || 0;
        } else if (context.user?.fid) {
          fid = typeof context.user.fid === "number" 
            ? context.user.fid 
            : parseInt(String(context.user.fid), 10) || 0;
        } else if (context.cast?.author?.fid) {
          fid = typeof context.cast.author.fid === "number"
            ? context.cast.author.fid
            : parseInt(String(context.cast.author.fid), 10) || 0;
        }
      }
    } catch (fidError) {
      console.warn("[farcaster] FID extraction failed:", fidError);
    }
    
    // Safely extract other fields
    let username: string | undefined;
    let displayName: string | undefined;
    let accountAddress: string | undefined;
    
    try {
      const rawUsername = context?.user?.username || context?.username;
      if (rawUsername) {
        username = String(rawUsername).trim() || undefined;
      }
    } catch (e) {
      // Ignore
    }
    
    try {
      const rawDisplayName = context?.user?.displayName || context?.displayName;
      if (rawDisplayName) {
        displayName = String(rawDisplayName).trim() || undefined;
      }
    } catch (e) {
      // Ignore
    }
    
    try {
      const addr = context?.account?.address || context?.address;
      if (typeof addr === "string") {
        accountAddress = addr;
      }
    } catch (e) {
      // Ignore
    }
    
    const result = {
      fid,
      username,
      displayName,
      accountAddress,
    };
    
    console.log("[farcaster] Extracted context:", { fid, username, displayName, accountAddress });
    return result;
  } catch (error: any) {
    console.warn("Failed to get Farcaster context:", error?.message || error);
    return { fid: 0 }; // Return default instead of null
  }
}


