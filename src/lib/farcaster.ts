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
    
    // Safely extract FID - avoid any string conversion that might cause errors
    let fid = 0;
    try {
      if (context) {
        // Try direct fid property
        if (context.fid !== undefined && context.fid !== null) {
          if (typeof context.fid === "number") {
            fid = context.fid;
          } else if (typeof context.fid === "string") {
            const parsed = parseInt(context.fid, 10);
            if (!isNaN(parsed)) fid = parsed;
          } else if (typeof context.fid === "bigint") {
            fid = Number(context.fid);
          }
        }
        
        // If still 0, try user.fid
        if (fid === 0 && context.user) {
          const userFid = context.user.fid;
          if (userFid !== undefined && userFid !== null) {
            if (typeof userFid === "number") {
              fid = userFid;
            } else if (typeof userFid === "string") {
              const parsed = parseInt(userFid, 10);
              if (!isNaN(parsed)) fid = parsed;
            } else if (typeof userFid === "bigint") {
              fid = Number(userFid);
            }
          }
        }
        
        // If still 0, try cast.author.fid
        if (fid === 0 && context.cast?.author) {
          const authorFid = context.cast.author.fid;
          if (authorFid !== undefined && authorFid !== null) {
            if (typeof authorFid === "number") {
              fid = authorFid;
            } else if (typeof authorFid === "string") {
              const parsed = parseInt(authorFid, 10);
              if (!isNaN(parsed)) fid = parsed;
            } else if (typeof authorFid === "bigint") {
              fid = Number(authorFid);
            }
          }
        }
      }
    } catch (fidError: any) {
      console.warn("[farcaster] FID extraction failed:", fidError?.message || fidError);
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


