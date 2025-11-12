"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { getFarcasterContext } from "@/lib/farcaster";
import { sdk } from "@farcaster/miniapp-sdk";

type Candidate = {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  followerCount?: number;
  followingCount?: number;
  bio?: string;
};

export default function SwipePage() {
  const { address, isConnected } = useAccount();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasFarcaster, setHasFarcaster] = useState<boolean>(false);
  const [devBypass, setDevBypass] = useState<boolean>(false);
  const [siwnConnected, setSiwnConnected] = useState<boolean>(false);
  const [currentFid, setCurrentFid] = useState<number>(0);
  const enableSiwn =
    typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_ENABLE_SIWN || "").toLowerCase() === "true";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDevBypass(params.get("dev") === "1");
    if (params.get("siwn") === "1") {
      try {
        localStorage.setItem("siwn_connected", "1");
      } catch {}
    }
    try {
      setSiwnConnected(localStorage.getItem("siwn_connected") === "1");
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

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const q = devBypass ? "?dev=1" : "";
        const res = await fetch(`/api/candidates${q}`);
        const data = (await res.json()) as { candidates: Candidate[] };
        setCandidates(data.candidates ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [devBypass]);

  const current = useMemo(() => candidates[0], [candidates]);

  const handleAction = async (action: "follow" | "skip") => {
    if (!current) return;
    setCandidates((prev) => prev.slice(1));

    // Precompute deeplink to keep user-gesture context and avoid blockers on mobile.
    const deeplink = `https://warpcast.com/~/profiles/${current.fid}`;
    const isMobile =
      typeof navigator !== "undefined" &&
      /iphone|ipad|ipod|android|mobile/i.test(navigator.userAgent);

    if (action === "follow") {
      // If SIWN connected, attempt server-side follow first
      if (siwnConnected) {
        try {
          const res = await fetch("/api/follow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toFid: current.fid }),
          });
          const ok = res.ok;
          if (ok) return; // success, nothing else to do
        } catch {}
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
      console.error(e);
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

  if (loading) {
    return <div className="p-6">Loading profiles…</div>;
  }

  if (!current) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div>No more profiles. Please check back later.</div>
        <a
          href="/onboarding"
          className="inline-block mt-4 px-4 py-3 rounded-xl border border-blue-300 text-blue-700"
        >
          Update preferences
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-blue-100">
        <div className="p-6">
          <div className="flex justify-end">
            {!siwnConnected && enableSiwn && (
              <a
                href="/auth/neynar/start"
                className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700"
              >
                Connect Farcaster
              </a>
            )}
          </div>
          <div className="flex items-center gap-4">
            {current.pfpUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={current.username || String(current.fid)}
                src={current.pfpUrl}
                className="w-16 h-16 rounded-full border border-blue-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100" />
            )}
            <div>
              <div className="text-lg font-semibold text-blue-700">
                {current.displayName || current.username || `FID ${current.fid}`}
              </div>
              <div className="text-sm text-blue-500">@{current.username || current.fid}</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-700">{current.bio || "—"}</div>
          <div className="mt-3 text-xs text-gray-500">
            Followers {current.followerCount ?? 0} • Following {current.followingCount ?? 0}
          </div>
          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 py-3 rounded-xl border text-blue-700 border-blue-300 hover:bg-blue-50"
              onClick={() => handleAction("skip")}
            >
              Skip
            </button>
            <button
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => handleAction("follow")}
            >
              Follow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


