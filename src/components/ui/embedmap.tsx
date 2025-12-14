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
      className={`relative rounded-lg overflow-hidden border shadow-sm ${wrapperClassName}`}
    >
      {/* Premium loader overlay */}
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          {/* soft glass/shimmer backdrop */}
          <div className="absolute inset-0 bg-slate-950/50" />
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800/30 via-slate-900/20 to-slate-800/30" />

          {/* premium spinner */}
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-lg" />
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-700 border-t-sky-400 border-r-sky-300" />
          </div>
        </div>
      )}

      <iframe
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.google.com/maps?q=${zipCode}&output=embed`}
        onLoad={() => setLoaded(true)}
        className={`w-full h-48 transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${iframeClassName}`}
      />
    </div>
  );
}
