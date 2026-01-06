import type { XProfile } from "@/types/social";

/**
 * Client-side version of deserializeProfile
 * Decodes base64url-encoded profile data
 */
export function deserializeProfile(value: string): XProfile | null {
  try {
    // Decode base64url to base64
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const normalized = base64 + pad;
    
    // Decode base64 to string (browser-compatible)
    const decoded = atob(normalized);
    
    // Parse JSON
    return JSON.parse(decoded) as XProfile;
  } catch {
    return null;
  }
}

