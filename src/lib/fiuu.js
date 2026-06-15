// ─── Fiuu in-store QR payment info ──────────────────────────────────────────
//
// Extracted from src/App.jsx in Phase 1 of the refactor.
//
// Fiuu is a Philippine card payment processor. We embed a static QR code
// image alongside the merchant info so customers can scan it from emails
// or printed proforma invoices.
//
// Original location: App.jsx lines ~2478–2491 (pre-refactor).

// v16.15: Real Fiuu QR embedded — served from /public/fiuu-qr.png
// To update: drop a new fiuu-qr.png in /public and bump the cache if needed.
export const FIUU_QR_IMAGE_DATA = "/fiuu-qr.png";

// v16.14: Fiuu card payment info
export const DMEAST_FIUU_INFO = {
  merchantName: "DECON MEDICAL EQUIPMENT AND SUPPLIES TRADING",
  // If you have a clickable URL alongside the QR, add it here for the email version
  paymentUrl:   "", // Optional: paste Fiuu hosted payment page URL if available
};
