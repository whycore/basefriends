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
    
    // Try multiple ways to access context
    const context = (sdk as any).context || (sdk as any).client?.context || (sdk as any).getContext?.();
    
    // Log for debugging - more detailed
    console.log("[farcaster] Full SDK object:", {
      hasSDK: !!sdk,
      sdkKeys: Object.keys(sdk || {}),
      hasContext: !!context,
      contextKeys: context ? Object.keys(context) : [],
    });
    
    console.log("[farcaster] Context details:", {
      hasContext: !!context,
      fid: context?.fid,
      hasUser: !!context?.user,
      hasAccount: !!context?.account,
      userKeys: context?.user ? Object.keys(context.user) : [],
      accountKeys: context?.account ? Object.keys(context.account) : [],
    });
    
    // Try different paths for FID
    let fid = 0;
    if (context?.fid) {
      fid = Number(context.fid) || 0;
    } else if (context?.user?.fid) {
      fid = Number(context.user.fid) || 0;
    } else if (context?.cast?.author?.fid) {
      fid = Number(context.cast.author.fid) || 0;
    }
    
    const rawUsername = context?.user?.username || context?.username;
    const rawDisplayName = context?.user?.displayName || context?.displayName;
    const username =
      rawUsername && (typeof rawUsername === "string" || typeof rawUsername === "number")
        ? String(rawUsername).trim() || undefined
        : undefined;
    const displayName =
      rawDisplayName &&
      (typeof rawDisplayName === "string" || typeof rawDisplayName === "number")
        ? String(rawDisplayName).trim() || undefined
        : undefined;
    const accountAddress = context?.account?.address || context?.address;
    
    const result = {
      fid,
      username,
      displayName,
      accountAddress: typeof accountAddress === "string" ? accountAddress : undefined,
    };
    
    console.log("[farcaster] Extracted context:", { fid, username, displayName, accountAddress });
    return result;
  } catch (error) {
    console.warn("Failed to get Farcaster context:", error);
    return { fid: 0 }; // Return default instead of null
  }
}


