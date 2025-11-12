"use client";

import { useEffect } from "react";

/**
 * Component to add Farcaster Mini App embed metadata
 * This enables preview images when sharing the app in Base/Farcaster feeds
 * 
 * Reference: https://docs.base.org/mini-apps/core-concepts/embeds-and-previews
 */
export default function FarcasterMeta() {
  useEffect(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://basefriends.vercel.app";
    
    // Base Mini App embed metadata for previews
    const fcMiniappMetadata = {
      version: "next",
      imageUrl: `${appUrl}/og-image.png`,
      button: {
        title: "Open BaseFriends",
        action: {
          type: "launch_frame",
          url: appUrl,
          name: "BaseFriends",
          splashImageUrl: `${appUrl}/splash.png`,
          splashBackgroundColor: "#0A7AFF",
        },
      },
    };

    const metadataContent = JSON.stringify(fcMiniappMetadata);

    // Remove existing meta tag if any
    const existingMeta = document.querySelector('meta[name="fc:miniapp"]');
    if (existingMeta) {
      existingMeta.setAttribute("content", metadataContent);
    } else {
      // Create and add new meta tag
      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "fc:miniapp");
      metaTag.setAttribute("content", metadataContent);
      document.head.appendChild(metaTag);
    }
  }, []);

  return null; // This component doesn't render anything
}

