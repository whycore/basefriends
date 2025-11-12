"use client";

import { useState, useEffect } from "react";
import { getFarcasterContext } from "@/lib/farcaster";

export default function OnboardingPage() {
  const [headline, setHeadline] = useState("");
  const [interests, setInterests] = useState("");
  const [skills, setSkills] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [currentFid, setCurrentFid] = useState<number>(0);

  useEffect(() => {
    const checkContext = async () => {
      try {
        const ctx = await getFarcasterContext();
        const fid = ctx?.fid || 0;
        setCurrentFid(fid);
        console.log("[onboarding] FID detected:", fid);
      } catch (e) {
        console.warn("[onboarding] Failed to get FID:", e);
        setCurrentFid(0);
      }
    };
    checkContext();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: currentFid, headline, interests, skills }),
      });
      setDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-green-800 font-semibold">Saved</div>
          <div className="text-green-700 text-sm mt-1">
            Your preferences are saved. You can start swiping.
          </div>
        </div>
        <a
          className="inline-block mt-6 px-4 py-3 rounded-xl bg-blue-600 text-white"
          href="/swipe"
        >
          Go to Swipe
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold text-blue-700">Tell us about you</h1>
      <p className="text-sm text-gray-600 mt-1">
        Optional. Helps us recommend better profiles.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-700">Headline</label>
          <input
            className="mt-1 w-full border rounded-lg p-2"
            placeholder="ex: Full-stack developer at XYZ"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Interests</label>
          <input
            className="mt-1 w-full border rounded-lg p-2"
            placeholder="ex: DeFi, Gaming, Infra"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Skills</label>
          <input
            className="mt-1 w-full border rounded-lg p-2"
            placeholder="ex: React, Solidity, Rust"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <a
            href="/swipe"
            className="flex-1 text-center py-3 rounded-xl border border-blue-300 text-blue-700"
          >
            Skip
          </a>
          <button
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white"
            type="submit"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}


