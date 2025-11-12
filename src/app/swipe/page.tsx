"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { getFarcasterContext } from "@/lib/farcaster";
import { sdk } from "@farcaster/miniapp-sdk";
import Logo from "@/components/Logo";

type Candidate = {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  followerCount?: number;
  followingCount?: number;
  bio?: string;
  matchScore?: number; // Match score percentage (0-100) from preferences matching
};

export default function SwipePage() {
  const { address, isConnected } = useAccount();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasFarcaster, setHasFarcaster] = useState<boolean>(false);
  const [devBypass, setDevBypass] = useState<boolean>(false);
  const [siwnConnected, setSiwnConnected] = useState<boolean>(false);
  const [currentFid, setCurrentFid] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enableSiwn =
    typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_ENABLE_SIWN || "").toLowerCase() === "true";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDevBypass(params.get("dev") === "1");
    
    // Check for SIWN connection status from URL params or cookies
    if (params.get("siwn") === "1") {
      try {
        localStorage.setItem("siwn_connected", "1");
        setSiwnConnected(true);
      } catch {}
    }
    
    // Check for SIWN errors
    const siwnError = params.get("siwn_error");
    if (siwnError) {
      console.error("[swipe] SIWN error:", siwnError);
      setError(`Connection failed: ${siwnError}`);
    }
    
    // Check localStorage for SIWN connection status
    try {
      const stored = localStorage.getItem("siwn_connected");
      if (stored === "1") {
        setSiwnConnected(true);
      }
    } catch {}
    
    // Also check cookies (set by server)
    try {
      const cookies = document.cookie.split(";");
      const siwnCookie = cookies.find(c => c.trim().startsWith("siwn_connected="));
      if (siwnCookie && siwnCookie.includes("1")) {
        setSiwnConnected(true);
        localStorage.setItem("siwn_connected", "1");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const checkContext = async () => {
      try {
        const ctx = await getFarcasterContext();
        const fid = ctx?.fid || 0;
        setHasFarcaster(fid > 0);
        setCurrentFid(fid);
        console.log("[swipe] FID detected:", fid);
      } catch (e) {
        console.warn("[swipe] Failed to get FID:", e);
        setHasFarcaster(false);
        setCurrentFid(0);
      }
    };
    checkContext();
  }, []);

  const fetchCandidates = useCallback(async (append = false) => {
    try {
      if (!append) setLoading(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (devBypass) params.set("dev", "1");
      if (currentFid > 0) params.set("viewerFid", String(currentFid));
      params.set("limit", "10");
      
      const q = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/candidates${q}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch candidates: ${res.status}`);
      }
      
      const data = (await res.json()) as { candidates: Candidate[] };
      const newCandidates = data.candidates ?? [];
      
      if (append) {
        setCandidates((prev) => [...prev, ...newCandidates]);
      } else {
        setCandidates(newCandidates);
      }
      setError(null); // Clear any previous errors
    } catch (e: any) {
      console.error("[swipe] Failed to fetch candidates:", e);
      const errorMessage = e?.message || "Failed to load candidates";
      setError(errorMessage);
      // Show error to user but don't block the UI
      if (!append) {
        setCandidates([]);
      }
    } finally {
      setLoading(false);
    }
  }, [devBypass, currentFid]);

  useEffect(() => {
    fetchCandidates(false);
  }, [fetchCandidates]);

  const current = useMemo(() => candidates[0], [candidates]);

  const handleAction = async (action: "follow" | "skip") => {
    if (!current || actionLoading) return;
    
    setActionLoading(action);
    
    try {
      // Remove current candidate from list immediately for better UX
      const remainingCandidates = candidates.slice(1);
      setCandidates(remainingCandidates);
      
      // If we're running low on candidates (less than 3), fetch more
      if (remainingCandidates.length <= 3) {
        fetchCandidates(true); // Append new candidates
      }

    // Precompute deeplink to keep user-gesture context and avoid blockers on mobile.
    const deeplink = `https://warpcast.com/~/profiles/${current.fid}`;
    const isMobile =
      typeof navigator !== "undefined" &&
      /iphone|ipad|ipod|android|mobile/i.test(navigator.userAgent);

    try {
      if (action === "follow") {
        // If SIWN connected, attempt server-side follow first
        if (siwnConnected) {
          try {
            const res = await fetch("/api/follow", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                toFid: current.fid,
                fromFid: currentFid 
              }),
            });
            
            if (res.ok) {
              const data = await res.json();
              console.log("[swipe] Follow successful via SIWN:", data);
              
              // Record swipe action in background
              try {
                if ("sendBeacon" in navigator) {
                  const blob = new Blob(
                    [JSON.stringify({ fromFid: currentFid, toFid: current.fid, action })],
                    { type: "application/json" },
                  );
                  // @ts-ignore
                  navigator.sendBeacon("/api/swipe", blob);
                } else {
                  fetch("/api/swipe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fromFid: currentFid, toFid: current.fid, action }),
                    keepalive: true,
                  }).catch(() => {});
                }
              } catch {}
              
              setActionLoading(null);
              return; // success, nothing else to do
            } else {
              const errorData = await res.json().catch(() => ({}));
              console.warn("[swipe] Follow via SIWN failed:", res.status, errorData);
              
              // If signer is missing/invalid, mark SIWN as disconnected
              if (errorData.requiresAuth || res.status === 401) {
                setSiwnConnected(false);
                try {
                  localStorage.removeItem("siwn_connected");
                } catch {}
                // Fall through to deeplink fallback
              } else {
                // Other error, fall through to deeplink fallback
              }
            }
          } catch (fetchError) {
            console.error("[swipe] Follow API call failed:", fetchError);
            // Fall through to deeplink fallback
          }
        }

        // Try native profile view if inside Base App / supported clients
        try {
          if (sdk && sdk.actions && typeof (sdk as any).actions.viewProfile === "function") {
            // Fire-and-forget POST in background
            try {
              if ("sendBeacon" in navigator) {
                const blob = new Blob(
                  [JSON.stringify({ fromFid: currentFid, toFid: current.fid, action })],
                  { type: "application/json" },
                );
                // @ts-ignore
                navigator.sendBeacon("/api/swipe", blob);
              } else {
                fetch("/api/swipe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fromFid: currentFid, toFid: current.fid, action }),
                  keepalive: true,
                }).catch(() => {});
              }
            } catch {}
            await sdk.actions.viewProfile({ fid: current.fid });
            setActionLoading(null);
            return;
          }
        } catch {
          // fall through to web deeplink
        }

        // Open Warpcast profile immediately to preserve user gesture
        if (isMobile) {
          window.location.assign(deeplink);
        } else {
          window.open(deeplink, "_blank", "noopener,noreferrer");
        }

        // Fire-and-forget POST after navigation attempt
        try {
          if ("sendBeacon" in navigator) {
            const blob = new Blob(
              [JSON.stringify({ fromFid: currentFid, toFid: current.fid, action })],
              { type: "application/json" },
            );
            // @ts-ignore
            navigator.sendBeacon("/api/swipe", blob);
          } else {
            fetch("/api/swipe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fromFid: currentFid, toFid: current.fid, action }),
              keepalive: true,
            }).catch(() => {});
          }
        } catch {}
        setActionLoading(null);
        return;
      }

      // Skip path: simple POST
      try {
        await fetch("/api/swipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromFid: currentFid, toFid: current.fid, action }),
        });
      } catch (e) {
        console.error("[swipe] Failed to record action:", e);
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (!devBypass && !hasFarcaster) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-blue-800 font-semibold">Open in Base App</div>
          <div className="text-blue-700 text-sm mt-1">
            Please open BaseFriends inside the Base App to continue. For development, append <code>?dev=1</code> to bypass.
          </div>
        </div>
      </div>
    );
  }

  if (loading && candidates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-blue-700 font-medium">Loading profiles...</div>
          <div className="text-sm text-gray-500 mt-2">Finding the best matches for you</div>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-blue-100 p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-blue-700 mb-2">All Caught Up!</h2>
          <p className="text-gray-600 mb-6">
            You've reviewed all available profiles. Check back later for new builders to connect with.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/onboarding"
              className="px-6 py-3 rounded-xl border border-blue-300 text-blue-700 font-semibold hover:bg-blue-50 transition-colors"
            >
              Update Preferences
            </a>
            <button
              onClick={() => fetchCandidates(false)}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-blue-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Logo size={40} />
            <div className="flex justify-end">
              {!siwnConnected && enableSiwn && (
                <a
                  href={`/auth/neynar/start${currentFid > 0 ? `?fid=${currentFid}` : ""}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  Connect Farcaster
                </a>
              )}
              {siwnConnected && (
                <div className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700">
                  ✓ Connected
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {current.pfpUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={current.username || String(current.fid)}
                src={current.pfpUrl}
                className="w-16 h-16 rounded-full border border-blue-100 object-cover"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector(".pfp-placeholder")) {
                    const placeholder = document.createElement("div");
                    placeholder.className = "pfp-placeholder w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold";
                    placeholder.textContent = (current.displayName || current.username || "?")[0].toUpperCase();
                    parent.appendChild(placeholder);
                  }
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                {(current.displayName || current.username || "?")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="text-lg font-semibold text-blue-700">
                  {current.displayName || current.username || `FID ${current.fid}`}
                </div>
                {current.matchScore !== undefined && current.matchScore > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                    {current.matchScore}% match
                  </span>
                )}
              </div>
              <div className="text-sm text-blue-500">@{current.username || current.fid}</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-700">{current.bio || "—"}</div>
          <div className="mt-3 text-xs text-gray-500">
            Followers {current.followerCount ?? 0} • Following {current.followingCount ?? 0}
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
              <button
                onClick={() => fetchCandidates(false)}
                className="ml-2 underline font-semibold"
              >
                Retry
              </button>
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 py-3 rounded-xl border text-blue-700 border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleAction("skip")}
              disabled={actionLoading !== null}
            >
              {actionLoading === "skip" ? "Skipping..." : "Skip"}
            </button>
            <button
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleAction("follow")}
              disabled={actionLoading !== null}
            >
              {actionLoading === "follow" ? "Following..." : "Follow"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


