/**
 * Renders a fake social-feed screenshot for demo scenarios (client-only).
 */
export async function createDemoScreenshotFile(input: {
  handle: string;
  platformLabel: string;
  lines: string[];
  filename: string;
}): Promise<File> {
  const width = 720;
  const height = 900;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas nicht verfügbar.");
  }

  // Background
  ctx.fillStyle = "#0f1419";
  ctx.fillRect(0, 0, width, height);

  // Demo banner
  ctx.fillStyle = "#b45309";
  ctx.fillRect(0, 0, width, 56);
  ctx.fillStyle = "#fff7ed";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("⚠ TEST / DEMO – kein echter Vorfall", 24, 36);

  // Card
  ctx.fillStyle = "#1a2330";
  roundRect(ctx, 24, 80, width - 48, height - 120, 16);
  ctx.fill();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "16px sans-serif";
  ctx.fillText(input.platformLabel, 48, 120);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(input.handle, 48, 156);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "20px sans-serif";
  let y = 210;
  for (const line of input.lines) {
    ctx.fillText(line, 48, y);
    y += 32;
  }

  ctx.fillStyle = "#64748b";
  ctx.font = "14px sans-serif";
  ctx.fillText("HassMelden Prototyp – Dummy-Screenshot", 48, height - 56);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png"
    );
  });

  return new File([blob], input.filename, { type: "image/png" });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
