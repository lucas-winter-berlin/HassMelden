const MAX_FILE_BYTES = 10 * 1024 * 1024;

export class ImageHandlerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageHandlerError";
  }
}

function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

export type PreparedImage = {
  file: File;
  previewUrl: string;
  convertedFromHeic: boolean;
};

/**
 * Validates and optionally converts HEIC/HEIF uploads to JPEG (client-side).
 * Caller must revoke `previewUrl` with URL.revokeObjectURL when done.
 */
export async function prepareImageUpload(file: File): Promise<PreparedImage> {
  let working: File = file;
  let convertedFromHeic = false;

  if (isHeicFile(file)) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.85,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!blob) {
      throw new ImageHandlerError("HEIC-Konvertierung fehlgeschlagen.");
    }
    const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "screenshot";
    working = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    convertedFromHeic = true;
  }

  const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!allowed.has(working.type)) {
    throw new ImageHandlerError(
      "Nur PNG, JPEG, WEBP oder HEIC/HEIF werden unterstützt."
    );
  }

  if (working.size > MAX_FILE_BYTES) {
    throw new ImageHandlerError("Datei zu groß (max. 10 MB).");
  }

  return {
    file: working,
    previewUrl: URL.createObjectURL(working),
    convertedFromHeic,
  };
}
