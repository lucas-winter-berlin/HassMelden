export const PLATFORMS = ["X", "INSTAGRAM", "FACEBOOK", "TIKTOK", "OTHER"] as const;

export type Platform = (typeof PLATFORMS)[number];

export type ImageMimeType = "image/png" | "image/jpeg" | "image/webp";

/** full = Privatadresse im Dokument; protected = Zustellung über Alternative */
export type AddressDisclosure = "full" | "protected";

export interface Complainant {
  fullName: string;
  street: string;
  /** 5-stellige deutsche Postleitzahl */
  zip: string;
  city: string;
  email: string;
  phone?: string;
  addressDisclosure?: AddressDisclosure;
  /** z. B. „Zustellung erbeten über Rechtsanwalt … / Postfach …“ */
  deliveryNote?: string;
}

export interface ScreenshotAsset {
  buffer: Buffer;
  mimeType: ImageMimeType;
}

export interface VisionAnalysis {
  accusedHandle: string;
  /** Aus Screenshot/URL abgeleitet oder vom Nutzer ergänzt */
  profileUrl?: string;
  /** Unveränderliche Plattform-ID falls erkennbar/angegeben */
  accountId?: string;
  extractedText: string;
  legalCategorization: string;
  incidentDescription: string;
}

export interface ValidatedGenerateRequest {
  screenshots: ScreenshotAsset[];
  platform: Platform;
  sourceUrl?: string;
  /** Direkte Profil-URL des Beschuldigten */
  profileUrl?: string;
  /** Interne Account-ID falls bekannt */
  accountId?: string;
  incidentDate: string;
  complainant: Complainant;
  userContext?: string;
}

export interface GenerateComplaintNoOffenseAssessment {
  accusedHandle: string;
  extractedText: string;
  legalCategorization: string;
  incidentDescription: string;
}

export interface GenerateComplaintSuccessData {
  pdfBase64: string;
  accusedHandle: string;
  profileUrl?: string;
  accountId?: string;
  extractedText: string;
  legalCategorization: string;
  incidentDescription: string;
  rawCopyText: string;
  screenshotHashes: string[];
}

export interface GenerateComplaintSuccessResponse {
  success: true;
  data: GenerateComplaintSuccessData;
}

export interface GenerateComplaintErrorResponse {
  success: false;
  error: string;
  code?:
    | "VALIDATION_ERROR"
    | "AI_UNAVAILABLE"
    | "INTERNAL_ERROR"
    | "NO_OFFENSE";
  /** Bei NO_OFFENSE: Kurzfassung der KI-Analyse ohne PDF */
  assessment?: GenerateComplaintNoOffenseAssessment;
}

export const MAX_SCREENSHOTS = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_USER_CONTEXT_CHARS = 4000;

export const STRAFANTRAG_CLAUSE =
  "Hiermit erstatte ich Strafanzeige und stelle ausdrücklich Strafantrag wegen aller in Betracht kommenden Straftaten sowie aus allen sonstigen rechtlichen Gesichtspunkten.";
