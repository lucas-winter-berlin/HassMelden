import PDFDocument from "pdfkit";
import {
  formatEvidenceTimestamp,
  formatHashShort,
  sha256Hex,
} from "@/lib/evidence";
import {
  Complainant,
  Platform,
  ScreenshotAsset,
  STRAFANTRAG_CLAUSE,
  VisionAnalysis,
} from "@/lib/types";

const PLATFORM_LABELS: Record<Platform, string> = {
  X: "X (Twitter)",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  OTHER: "Sonstige Plattform",
};

/** Title + image + hash/meta lines kept together */
const EVIDENCE_BLOCK_MIN_HEIGHT = 280;
const HASH_META_HEIGHT = 52;
const IMAGE_MAX_HEIGHT = 360;
const IMAGE_MIN_HEIGHT = 140;

function formatIncidentDate(incidentDate: string): string {
  const [datePart, timePart] = incidentDate.split("T");
  if (!datePart || !timePart) {
    return incidentDate;
  }
  const [year, month, day] = datePart.split("-");
  return `${day}.${month}.${year}, ${timePart} Uhr`;
}

function collectPdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);
  });
}

function remainingPageHeight(doc: PDFKit.PDFDocument): number {
  return doc.page.height - doc.y - doc.page.margins.bottom;
}

/** Start a new page if the remaining space cannot fit `needed` points. */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (remainingPageHeight(doc) < needed) {
    doc.addPage();
  }
}

function writeComplainant(doc: PDFKit.PDFDocument, complainant: Complainant) {
  doc.font("Helvetica-Bold").fontSize(12).text("Anzeigenerstatter:in");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(11);
  doc.text(complainant.fullName);

  if (complainant.addressDisclosure === "protected") {
    doc.text(`E-Mail: ${complainant.email}`);
    if (complainant.phone) {
      doc.text(`Telefon: ${complainant.phone}`);
    }
    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Ladungsfähige Anschrift / Zustellung");
    doc.font("Helvetica").fontSize(11);
    doc.text(
      complainant.deliveryNote?.trim() ||
        "Zustellung erbeten über geschützte Angabe."
    );
    doc
      .font("Helvetica-Oblique")
      .fontSize(9)
      .fillColor("#444444")
      .text(
        "Hinweis: Privatanschrift aus Schutzgründen nicht offen ausgewiesen (Schutz vor Repressalien / Doxxing)."
      );
    doc.fillColor("#000000");
  } else {
    doc.text(complainant.street);
    doc.text(`${complainant.zip} ${complainant.city}`);
    doc.text(`E-Mail: ${complainant.email}`);
    if (complainant.phone) {
      doc.text(`Telefon: ${complainant.phone}`);
    }
  }
}

function writeHashMeta(
  doc: PDFKit.PDFDocument,
  hash: string,
  capturedAtLabel: string,
  maxWidth: number
) {
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#333333")
    .text(`Erfasst: ${capturedAtLabel}`, { width: maxWidth });
  doc.text(`SHA256: ${hash}`, { width: maxWidth });
  doc
    .fontSize(7)
    .fillColor("#666666")
    .text(`(Kurzform: ${formatHashShort(hash)})`, { width: maxWidth });
  doc.fillColor("#000000");
}

/**
 * Keeps title, image and hash on one page whenever possible.
 * Falls back to a dedicated page if the current page is too short.
 */
function embedScreenshot(
  doc: PDFKit.PDFDocument,
  shot: ScreenshotAsset,
  index: number,
  total: number,
  hash: string,
  capturedAtLabel: string
) {
  const maxWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Always start each evidence item with enough room for the full block
  ensureSpace(doc, EVIDENCE_BLOCK_MIN_HEIGHT);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`Screenshot ${index + 1} von ${total}`);
  doc.moveDown(0.35);

  if (shot.mimeType === "image/png" || shot.mimeType === "image/jpeg") {
    try {
      const availableForImage = Math.max(
        IMAGE_MIN_HEIGHT,
        remainingPageHeight(doc) - HASH_META_HEIGHT - 8
      );
      const fitHeight = Math.min(IMAGE_MAX_HEIGHT, availableForImage);

      // If still too tight after title, move the whole remaining block to next page
      if (fitHeight < IMAGE_MIN_HEIGHT + 20) {
        doc.addPage();
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(`Screenshot ${index + 1} von ${total}`);
        doc.moveDown(0.35);
      }

      const finalFit = Math.min(
        IMAGE_MAX_HEIGHT,
        Math.max(
          IMAGE_MIN_HEIGHT,
          remainingPageHeight(doc) - HASH_META_HEIGHT - 8
        )
      );

      doc.image(shot.buffer, {
        fit: [maxWidth, finalFit],
        align: "center",
      });
      doc.moveDown(0.45);

      // Hash must stay with image - if somehow near edge, new page with hash only is worse;
      // re-check and pull hash up by ensuring space for meta lines
      if (remainingPageHeight(doc) < HASH_META_HEIGHT) {
        doc.addPage();
        doc
          .font("Helvetica-Oblique")
          .fontSize(8)
          .fillColor("#666666")
          .text(
            `(Fortsetzung Beweismittel - Screenshot ${index + 1} von ${total})`
          );
        doc.fillColor("#000000");
        doc.moveDown(0.3);
      }

      writeHashMeta(doc, hash, capturedAtLabel, maxWidth);
    } catch {
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(
          "Screenshot konnte nicht eingebettet werden. Bitte Originaldatei separat beifügen."
        );
      doc.moveDown(0.35);
      writeHashMeta(doc, hash, capturedAtLabel, maxWidth);
    }
  } else {
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        "Screenshot liegt als WEBP vor und wurde zur Analyse verwendet, konnte aber nicht in das PDF eingebettet werden. Bitte Originaldatei separat beifügen."
      );
    doc.moveDown(0.35);
    writeHashMeta(doc, hash, capturedAtLabel, maxWidth);
  }

  doc.moveDown(0.9);
}

function writeDigitalConfirmation(
  doc: PDFKit.PDFDocument,
  capturedAtLabel: string
) {
  ensureSpace(doc, 72);
  doc.moveDown(0.6);

  const maxWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc
    .strokeColor("#c7d4cc")
    .lineWidth(0.8)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + maxWidth, doc.y)
    .stroke();
  doc.moveDown(0.7);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#000000")
    .text("Digitale Bestätigung / Quittierung", { width: maxWidth });
  doc.moveDown(0.35);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#333333")
    .text(
      `Digital generiert am ${capturedAtLabel} durch HassMelden • Keine Unterschrift erforderlich gemäß E-Gov-Standard / elektronische Einreichung.`,
      { width: maxWidth, align: "left" }
    );
  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor("#555555")
    .text(
      "Dieses Dokument wurde clientseitig angefordert und serverseitig ohne dauerhafte Speicherung der Nutzdaten erzeugt (Zero-Persistence).",
      { width: maxWidth }
    );
  doc.fillColor("#000000");
}

export async function buildComplaintPdf(input: {
  complainant: Complainant;
  platform: Platform;
  sourceUrl?: string;
  incidentDate: string;
  analysis: VisionAnalysis;
  screenshots: ScreenshotAsset[];
  userContext?: string;
  screenshotHashes?: string[];
  capturedAtLabel?: string;
}): Promise<Buffer> {
  const {
    complainant,
    platform,
    sourceUrl,
    incidentDate,
    analysis,
    screenshots,
    userContext,
    capturedAtLabel = formatEvidenceTimestamp(),
  } = input;

  const hashes =
    input.screenshotHashes ??
    screenshots.map((shot) => sha256Hex(shot.buffer));

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 56, bottom: 56, left: 56, right: 56 },
    info: {
      Title: "Strafanzeige & Strafantrag - HassMelden",
      Author: "HassMelden",
    },
  });

  const done = collectPdfBuffer(doc);

  // Extra breathing room so the main title reads as the primary headline
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(18).text("STRAFANZEIGE & STRAFANTRAG", {
    align: "center",
  });
  doc.moveDown(0.55);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#444444")
    .text("Erstellt mit HassMelden (Zero-Persistence)", {
      align: "center",
    });
  doc.fillColor("#000000");
  doc.moveDown(1.6);

  writeComplainant(doc, complainant);
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(12).text("Beschuldigte:r & Plattform-Daten");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(11);
  doc.text(`Plattform: ${PLATFORM_LABELS[platform]}`);
  doc.text(`Account-Handle: ${analysis.accusedHandle}`);
  doc.text(
    analysis.profileUrl
      ? `Profil-URL: ${analysis.profileUrl}`
      : "Profil-URL: nicht angegeben"
  );
  doc.text(
    analysis.accountId
      ? `Interne Account-ID: ${analysis.accountId}`
      : "Interne Account-ID: nicht bekannt / nicht angegeben"
  );
  doc.text(`Tatzeitpunkt: ${formatIncidentDate(incidentDate)}`);
  doc.text(
    sourceUrl
      ? `Quellen-URL (Post/Kommentar): ${sourceUrl}`
      : "Quellen-URL (Post/Kommentar): nicht angegeben"
  );
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(12).text("Rechtliche Einordnung (Vorprüfung)");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(11);
  doc.text("Es besteht der Verdacht auf:");
  doc.text(analysis.legalCategorization);
  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").fontSize(12).text("Rechtserklärung");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(11).text(STRAFANTRAG_CLAUSE, {
    align: "justify",
  });
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(12).text("Sachverhalt");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(11).text(analysis.incidentDescription, {
    align: "justify",
  });
  doc.moveDown(1);

  if (userContext) {
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Zusätzlicher Kontext der anzeigenden Person");
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(11).text(userContext, { align: "justify" });
    doc.moveDown(1);
  }

  doc.font("Helvetica-Bold").fontSize(12).text("Extrahierter Originaltext");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(11).text(analysis.extractedText);
  doc.moveDown(1.2);

  ensureSpace(doc, 56);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(
      screenshots.length > 1
        ? "Beweismittel: Screenshots"
        : "Beweismittel: Screenshot"
    );
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#444444")
    .text(
      "Je Datei: Erfassungszeitpunkt und SHA-256-Hash der Originaldatei (Integritätshinweis). Bild und Hash bleiben zusammen auf einer Seite."
    );
  doc.fillColor("#000000");
  doc.moveDown(0.7);

  screenshots.forEach((shot, index) => {
    // Separate page per screenshot keeps multi-upload layouts clean
    if (index === 0) {
      ensureSpace(doc, EVIDENCE_BLOCK_MIN_HEIGHT);
    } else {
      doc.addPage();
    }
    embedScreenshot(
      doc,
      shot,
      index,
      screenshots.length,
      hashes[index] ?? sha256Hex(shot.buffer),
      capturedAtLabel
    );
  });

  writeDigitalConfirmation(doc, capturedAtLabel);

  doc.end();
  return done;
}

export function pdfBufferToDataUrl(pdfBuffer: Buffer): string {
  return `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
}
