import { createHash } from "crypto";
import type { Platform } from "@/lib/types";

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function formatHashShort(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

/** Best-effort Profil-URL aus Plattform + Handle, falls Nutzer:in keine URL angibt */
export function guessProfileUrl(
  platform: Platform,
  handle: string
): string | undefined {
  const cleaned = handle.trim().replace(/^@/, "");
  if (!cleaned || /^unbekannt$/i.test(cleaned)) {
    return undefined;
  }
  const slug = encodeURIComponent(cleaned);

  switch (platform) {
    case "X":
      return `https://x.com/${slug}`;
    case "INSTAGRAM":
      return `https://www.instagram.com/${slug}/`;
    case "FACEBOOK":
      return `https://www.facebook.com/${slug}`;
    case "TIKTOK":
      return `https://www.tiktok.com/@${slug}`;
    default:
      return undefined;
  }
}

export function formatEvidenceTimestamp(date = new Date()): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Berlin",
  }).format(date);
}
