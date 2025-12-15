"use client";

import { useState } from "react";

export type EmbedMapProps = {
  zipCode: string;
  wrapperClassName?: string;
  iframeClassName?: string;
};

export function EmbedMap({
  zipCode,
  wrapperClassName = "",
  iframeClassName = "",
}: EmbedMapProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`
        relative overflow-hidden
        border border-white/15
        bg-[#0B0B0F]
        ${wrapperClassName}
      `}
    >
      {/* Loader */}
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          {/* muted panel backdrop */}
          <div className="absolute inset-0 bg-[#0B0B0F]" />
          <div className="absolute inset-0 animate-pulse bg-white/5" />

          {/* minimal spinner */}
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        </div>
      )}

      <iframe
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.google.com/maps?q=${zipCode}&output=embed`}
        onLoad={() => setLoaded(true)}
        className={`
          w-full h-48
          transition-opacity duration-300
          ${loaded ? "opacity-100" : "opacity-0"}
          ${iframeClassName}
        `}
      />
    </div>
  );
}
