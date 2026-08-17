import {
  Complainant,
  Platform,
  STRAFANTRAG_CLAUSE,
  VisionAnalysis,
} from "@/lib/types";
import { formatEvidenceTimestamp } from "@/lib/evidence";

const PLATFORM_LABELS: Record<Platform, string> = {
  X: "X (Twitter)",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  OTHER: "Sonstige Plattform",
};

function formatIncidentDate(incidentDate: string): string {
  const [datePart, timePart] = incidentDate.split("T");
  if (!datePart || !timePart) {
    return incidentDate;
  }
  const [year, month, day] = datePart.split("-");
  return `${day}.${month}.${year}, ${timePart} Uhr (Angabe der anzeigenden Person)`;
}

function complainantBlock(complainant: Complainant): string[] {
  const phoneLine = complainant.phone ? `Telefon: ${complainant.phone}` : null;
  const protectedMode = complainant.addressDisclosure === "protected";

  if (protectedMode) {
    return [
      "Anzeigenerstatter:in",
      complainant.fullName,
      `E-Mail: ${complainant.email}`,
      ...(phoneLine ? [phoneLine] : []),
      "Ladungsfähige Anschrift / Zustellung:",
      complainant.deliveryNote?.trim() ||
        "Zustellung erbeten über geschützte Angabe (siehe Hinweis der anzeigenden Person).",
      "(Privatanschrift aus Schutzgründen nicht im Dokument offen ausgewiesen.)",
    ];
  }

  return [
    "Anzeigenerstatter:in",
    complainant.fullName,
    complainant.street,
    `${complainant.zip} ${complainant.city}`,
    `E-Mail: ${complainant.email}`,
    ...(phoneLine ? [phoneLine] : []),
  ];
}

export function buildRawCopyText(input: {
  complainant: Complainant;
  platform: Platform;
  sourceUrl?: string;
  incidentDate: string;
  analysis: VisionAnalysis;
  userContext?: string;
  screenshotCount?: number;
  screenshotHashes?: string[];
  capturedAtLabel?: string;
}): string {
  const {
    complainant,
    platform,
    sourceUrl,
    incidentDate,
    analysis,
    userContext,
    screenshotCount = 1,
    screenshotHashes = [],
    capturedAtLabel = formatEvidenceTimestamp(),
  } = input;

  const when = formatIncidentDate(incidentDate);
  const platformLabel = PLATFORM_LABELS[platform];
  const evidenceLine =
    screenshotCount > 1
      ? `Als Beweismittel füge ich ${screenshotCount} Screenshots des Vorfalls / Verlaufs bei (mit Erfassungszeitpunkt und SHA-256-Hash je Datei).`
      : "Als Beweismittel füge ich den Screenshot des Vorfalls bei (mit Erfassungszeitpunkt und SHA-256-Hash).";

  const hashLines =
    screenshotHashes.length > 0
      ? [
          "",
          "Integrität der Bilddateien (SHA-256):",
          ...screenshotHashes.map(
            (hash, i) => `Screenshot ${i + 1}: SHA256 ${hash}`
          ),
          `Erfassungszeitpunkt (HassMelden): ${capturedAtLabel}`,
        ]
      : [];

  const lines = [
    "STRAFANZEIGE & STRAFANTRAG",
    "Erstellt mit HassMelden (Zero-Persistence)",
    "",
    ...complainantBlock(complainant),
    "",
    "An die zuständige Staatsanwaltschaft / Polizei",
    "",
    STRAFANTRAG_CLAUSE,
    "",
    "Beschuldigte:r & Plattform-Daten",
    `• Plattform: ${platformLabel}`,
    `• Account-Handle: ${analysis.accusedHandle}`,
    analysis.profileUrl
      ? `• Profil-URL: ${analysis.profileUrl}`
      : "• Profil-URL: nicht angegeben",
    analysis.accountId
      ? `• Interne Account-ID: ${analysis.accountId}`
      : "• Interne Account-ID: nicht bekannt / nicht angegeben",
    `• Tatzeitpunkt: ${when}`,
    sourceUrl
      ? `• Quellen-URL (Post/Kommentar): ${sourceUrl}`
      : "• Quellen-URL (Post/Kommentar): nicht angegeben",
    "",
    "Rechtliche Einordnung (vorläufige KI-gestützte Vorprüfung):",
    "Es besteht der Verdacht auf:",
    analysis.legalCategorization,
    "",
    "Rechtserklärung:",
    STRAFANTRAG_CLAUSE,
    "",
    "Sachverhalt:",
    analysis.incidentDescription,
    ...(userContext
      ? ["", "Zusätzlicher Kontext der anzeigenden Person:", userContext]
      : []),
    "",
    "Extrahierter Originaltext aus dem/den Screenshot(s):",
    analysis.extractedText,
    "",
    evidenceLine,
    ...hashLines,
    "",
    "Digitale Bestätigung / Quittierung:",
    `Digital generiert am ${capturedAtLabel} durch HassMelden • Keine Unterschrift erforderlich gemäß E-Gov-Standard / elektronische Einreichung.`,
    "",
    "Ich bitte um Aufnahme der Ermittlungen und um Bestätigung des Eingangs.",
    "",
    "Mit freundlichen Grüßen",
    complainant.fullName,
  ];

  return lines.join("\n");
}
