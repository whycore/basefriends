"use client";

import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Logo component that displays the BaseFriends logo.
 * Falls back to text if logo image is not available.
 */
export default function Logo({ size = 40, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      {/* Try to load logo.svg first, fallback to logo.png, then text */}
      <picture>
        <source srcSet="/logo.svg" type="image/svg+xml" />
        <img
          src="/logo.png"
          alt="BaseFriends"
          width={size}
          height={size}
          className="object-contain"
          onError={(e) => {
            // If image fails to load, hide it and show text fallback
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent && !parent.querySelector(".logo-fallback")) {
              const fallback = document.createElement("span");
              fallback.className = "logo-fallback text-blue-700 font-bold text-xl";
              fallback.textContent = "BaseFriends";
              parent.appendChild(fallback);
            }
          }}
        />
      </picture>
    </div>
  );
}

