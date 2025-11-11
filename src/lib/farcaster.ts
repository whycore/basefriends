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
    const context = sdk.context as any;
    const rawUsername = context?.user?.username;
    const rawDisplayName = context?.user?.displayName;
    const username =
      rawUsername && (typeof rawUsername === "string" || typeof rawUsername === "number")
        ? String(rawUsername).trim() || undefined
        : undefined;
    const displayName =
      rawDisplayName &&
      (typeof rawDisplayName === "string" || typeof rawDisplayName === "number")
        ? String(rawDisplayName).trim() || undefined
        : undefined;
    const accountAddress = context?.account?.address;
    return {
      fid: context?.fid || 0,
      username,
      displayName,
      accountAddress: typeof accountAddress === "string" ? accountAddress : undefined,
    };
  } catch (error) {
    console.warn("Failed to get Farcaster context:", error);
    return null;
  }
}


