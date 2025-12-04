// src/lib/geo.ts

export type ZipLocation = {
    city: string;
    state: string;
    stateCode: string;
    zip: string;
  };
  
  export async function resolveZip(zip: string): Promise<ZipLocation | null> {
    const trimmed = String(zip ?? "").trim();
  
    if (!/^\d{5}$/.test(trimmed)) {
      return null;
    }
  
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${trimmed}`, {
        // Edge/runtime-friendly; no need for extra headers
        cache: "force-cache",
      });
  
      if (!res.ok) {
        // ZIP not found or API error
        return null;
      }
  
      const data = await res.json();
  
      const place = Array.isArray(data.places) && data.places[0];
      if (!place) return null;
  
      return {
        city: place["place name"],
        state: place["state"],
        stateCode: place["state abbreviation"],
        zip: data["post code"] ?? trimmed,
      };
    } catch (err) {
      console.error("Failed to resolve ZIP", err);
      return null;
    }
  }
  