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
    // Ensure SDK is initialized
    if (!sdkInitialized) {
      await initializeFarcasterSDK();
    }
    
    // Wait a bit for SDK to be fully ready (especially in Base App)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Safely access context with proper error handling
    let context: any = null;
    try {
      // Primary method: direct access
      context = (sdk as any).context;
      
      // If context is null/undefined, try waiting a bit more (Base App might need time)
      if (!context) {
        console.log("[farcaster] Context not immediately available, waiting...");
        await new Promise(resolve => setTimeout(resolve, 300));
        context = (sdk as any).context;
      }
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
    
    // Log for debugging - safely and more detailed
    try {
      const sdkKeys = sdk ? Object.keys(sdk).slice(0, 15) : [];
      const contextKeys = context ? Object.keys(context).slice(0, 15) : [];
      
      console.log("[farcaster] Context check:", {
        hasSDK: !!sdk,
        sdkKeys: sdkKeys,
        hasContext: !!context,
        contextType: typeof context,
        contextKeys: contextKeys,
      });
      
      // Log specific context properties if available
      if (context) {
        console.log("[farcaster] Context details:", {
          fid: context.fid,
          hasUser: !!context.user,
          hasAccount: !!context.account,
          userKeys: context.user ? Object.keys(context.user).slice(0, 10) : [],
          accountKeys: context.account ? Object.keys(context.account).slice(0, 10) : [],
        });
      }
    } catch (logError) {
      console.warn("[farcaster] Logging failed:", logError);
    }
    
    // Safely extract FID - avoid any string conversion that might cause errors
    let fid = 0;
    try {
      if (context) {
        // Try multiple paths for FID extraction
        const fidPaths = [
          () => context.fid,
          () => context.user?.fid,
          () => context.user?.farcasterId,
          () => context.cast?.author?.fid,
          () => context.viewerContext?.fid,
          () => context.client?.fid,
        ];
        
        for (const getFid of fidPaths) {
          try {
            const fidValue = getFid();
            if (fidValue !== undefined && fidValue !== null && fidValue !== 0) {
              if (typeof fidValue === "number") {
                fid = fidValue;
                break;
              } else if (typeof fidValue === "string") {
                const parsed = parseInt(fidValue, 10);
                if (!isNaN(parsed) && parsed > 0) {
                  fid = parsed;
                  break;
                }
              } else if (typeof fidValue === "bigint") {
                const num = Number(fidValue);
                if (!isNaN(num) && num > 0) {
                  fid = num;
                  break;
                }
              }
            }
          } catch (e) {
            // Continue to next path
          }
        }
        
        console.log("[farcaster] FID extraction result:", { fid, hasContext: !!context });
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


