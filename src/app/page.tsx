"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getFarcasterContext, initializeFarcasterSDK } from "@/lib/farcaster";
import { useAccount, useConnect } from "wagmi";

export default function Home() {
  const router = useRouter();
  const [fid, setFid] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [devBypass, setDevBypass] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDevBypass(params.get("dev") === "1");
  }, []);

  const checkFid = useCallback(async () => {
    try {
      // Initialize SDK first (calls ready() to hide splash screen)
      await initializeFarcasterSDK();
      
      // Small delay to ensure SDK is ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get Farcaster context
      const ctx = await getFarcasterContext();
      const detectedFid = ctx?.fid || 0;
      
      setFid(detectedFid > 0 ? detectedFid : null);
      setLoading(false);
      
      console.log("[home] FID detected:", detectedFid);
      
      // If FID detected and not in dev mode, auto-redirect to swipe
      if (detectedFid > 0 && !devBypass) {
        setTimeout(() => {
          router.push("/swipe");
        }, 1500);
      }
      
      return detectedFid > 0;
    } catch (e) {
      console.warn("[home] Failed to get FID:", e);
      setFid(null);
      setLoading(false);
      return false;
    }
  }, [router, devBypass]);

  useEffect(() => {
    let mounted = true;
    
    // Add timeout to prevent infinite loading (fallback)
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn("[home] Timeout reached, stopping loading");
        setLoading(false);
      }
    }, 3000);
    
    checkFid();
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [checkFid]);

  const handleConnect = async () => {
    try {
      // Try to connect via Farcaster Mini App connector
      const farcasterConnector = connectors.find(
        (c) => c.id === "farcasterMiniApp"
      );
      
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
      }
      
      // Re-check FID after a delay
      setTimeout(async () => {
        const success = await checkFid();
        if (success) {
          router.push("/swipe");
        } else {
          setRetryCount((prev) => prev + 1);
        }
      }, 1000);
    } catch (e) {
      console.error("[home] Connect failed:", e);
      // Fallback: redirect to swipe with dev mode
      router.push("/swipe?dev=1");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
          <p className="text-blue-700 font-medium">Loading BaseFriends...</p>
        </div>
      </div>
    );
  }

  if (fid && !devBypass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-blue-700 mb-2">Welcome to BaseFriends!</h1>
            <p className="text-blue-600">Redirecting you to start swiping...</p>
          </div>
          <div className="mt-4">
            <a
              href="/swipe"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to Swipe →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-700 mb-4">BaseFriends</h1>
          <p className="text-xl text-blue-600 mb-2">Meet builders on Base</p>
          <p className="text-gray-600">
            Connect with like-minded builders and expand your network
          </p>
        </div>

        {!fid ? (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-200">
            <div className="mb-4">
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Connect Your Account
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Connect your Farcaster account to start meeting builders on Base.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConnect}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Connect With Your Account
              </button>
              {retryCount > 0 && (
                <button
                  onClick={async () => {
                    setRetryCount(0);
                    setLoading(true);
                    await checkFid();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Retry Connection
                </button>
              )}
              {devBypass && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Development Mode</p>
                  <a
                    href="/swipe?dev=1"
                    className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    Continue with Dev Mode →
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-green-200">
            <div className="mb-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Connected!
              </h2>
              <p className="text-gray-600 text-sm mb-2">
                FID: <span className="font-mono font-semibold">{fid}</span>
              </p>
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <a
                href="/swipe"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Swiping →
              </a>
              <a
                href="/onboarding"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Complete Profile
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
