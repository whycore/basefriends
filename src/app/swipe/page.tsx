"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { getFarcasterContext } from "@/lib/farcaster";

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDevBypass(params.get("dev") === "1");
  }, []);

  useEffect(() => {
    const checkContext = async () => {
      try {
        const ctx = await getFarcasterContext();
        setHasFarcaster(!!ctx?.fid && ctx.fid > 0);
      } catch {
        setHasFarcaster(false);
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
    try {
      const res = await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toFid: current.fid, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (action === "follow" && json?.deeplink) {
        window.open(json.deeplink, "_blank");
      }
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


