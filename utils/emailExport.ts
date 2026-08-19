/**
 * Builds a downloadable .eml (RFC 822) with plain-text body and PDF attachment.
 * Opens in the user's local mail client - nothing is sent by HassMelden.
 */
export function buildComplaintEml(input: {
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  pdfBase64DataUrl: string;
  pdfFilename?: string;
}): Blob {
  const {
    fromName,
    fromEmail,
    subject,
    bodyText,
    pdfBase64DataUrl,
    pdfFilename = "strafanzeige-HassMelden.pdf",
  } = input;

  const pdfBase64 = pdfBase64DataUrl.includes(",")
    ? pdfBase64DataUrl.split(",")[1]
    : pdfBase64DataUrl;

  const boundary = `HassMelden_${Date.now().toString(36)}`;
  const encodedSubject = `=?UTF-8?B?${btoa(
    unescape(encodeURIComponent(subject))
  )}?=`;
  const encodedFromName = `=?UTF-8?B?${btoa(
    unescape(encodeURIComponent(fromName))
  )}?=`;

  // Fold base64 into 76-char lines per MIME
  const foldedPdf = (pdfBase64.match(/.{1,76}/g) || [pdfBase64]).join("\r\n");

  const eml = [
    `From: ${encodedFromName} <${fromEmail}>`,
    `To: `,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    bodyText.replace(/\n/g, "\r\n"),
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    ``,
    foldedPdf,
    ``,
    `--${boundary}--`,
    ``,
  ].join("\r\n");

  return new Blob([eml], { type: "message/rfc822" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
