"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFarcasterContext, initializeFarcasterSDK } from "@/lib/farcaster";

export default function Home() {
  const router = useRouter();
  const [fid, setFid] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [devBypass, setDevBypass] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDevBypass(params.get("dev") === "1");
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        // Initialize SDK first (calls ready() to hide splash screen)
        await initializeFarcasterSDK();
        
        // Small delay to ensure SDK is ready
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (!mounted) return;
        
        // Get Farcaster context
        const ctx = await getFarcasterContext();
        const detectedFid = ctx?.fid || 0;
        
        if (!mounted) return;
        
        setFid(detectedFid > 0 ? detectedFid : null);
        setLoading(false);
        
        console.log("[home] FID detected:", detectedFid);
        
        // If FID detected and not in dev mode, auto-redirect to swipe
        if (detectedFid > 0 && !devBypass) {
          setTimeout(() => {
            router.push("/swipe");
          }, 1500);
        }
      } catch (e) {
        console.warn("[home] Failed to get FID:", e);
        if (mounted) {
          setFid(null);
          setLoading(false);
        }
      }
    };
    
    // Add timeout to prevent infinite loading (fallback)
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn("[home] Timeout reached, stopping loading");
        setLoading(false);
      }
    }, 3000);
    
    checkAuth();
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [router, devBypass]);

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
                Open in Base App
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                To use BaseFriends, please open this app inside the Base App.
                Your Farcaster account will be automatically connected.
              </p>
            </div>
            {devBypass && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-3">Development Mode</p>
                <a
                  href="/swipe?dev=1"
                  className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Continue with Dev Mode →
                </a>
              </div>
            )}
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
