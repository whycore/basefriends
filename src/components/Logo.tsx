"use client";

import { useState } from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Logo component that displays the BaseFriends logo.
 * Falls back to text if logo image is not available.
 */
export default function Logo({ size = 40, className = "" }: LogoProps) {
  const [imageError, setImageError] = useState(false);
  const [trySvg, setTrySvg] = useState(false); // Start with PNG since that's what we have

  // Try logo.png first (since that's what exists), then logo.svg, then text fallback
  const handleImageError = () => {
    if (!trySvg) {
      // Try SVG if PNG failed
      setTrySvg(true);
    } else {
      // Both failed, show text fallback
      setImageError(true);
    }
  };

  if (imageError) {
    // Text fallback
    return (
      <div className={`flex items-center ${className}`}>
        <span className="text-blue-700 font-bold" style={{ fontSize: `${size * 0.6}px` }}>
          BaseFriends
        </span>
      </div>
    );
  }

  // Try PNG first (since that's what exists), then SVG
  const logoSrc = trySvg ? "/logo.svg" : "/logo.png";

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={logoSrc}
        alt="BaseFriends"
        width={size}
        height={size}
        className="object-contain"
        onError={handleImageError}
        style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
      />
    </div>
  );
}

