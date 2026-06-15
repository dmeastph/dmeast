// ─── EmailJS configuration for DMEAST ───────────────────────────────────────
//
// Extracted from src/App.jsx in Phase 1 of the refactor.
//
// This module exports:
//   - `emailjs` — the @emailjs/browser SDK (re-exported as a named export)
//   - `EMAILJS_CONFIG` — service + template IDs + public key
//
// The 3 wrapper helpers (sendCustomerStatusEmail, sendAdminNewOrderNotification,
// sendCustomerReceiptEmail) still live in App.jsx because they depend on
// other App.jsx-level constants (CONTACT, formatPHP). They will move here in a
// later slice once those are extracted.
//
// Note: EmailJS service/template IDs and the public key are intentionally
// visible client-side — the public key is meant to be public, and template IDs
// just identify which email template to send. Real send authorization is
// controlled in the EmailJS dashboard (allowed origins, rate limits, etc.).
//
// Original location: App.jsx lines ~384–392 (pre-refactor).

import emailjsLib from "@emailjs/browser";

export const emailjs = emailjsLib;

export const EMAILJS_CONFIG = {
  serviceId:           "service_0hvjrv6",
  orderTemplateId:     "template_udt3wjn",  // To: admin (info@dmeastph.com) — order received notification
  templateId:          "template_5r24wue",  // To: {{to_email}} — universal customer notifications
  receiptTemplateId:   "template_adb2so7",  // To: {{to_email}} — customer order receipt
  pdfTemplateId:       "template_pdf_doc",  // v15.3: To: {{to_email}} — PDF document (Quotation/SO/DR/PR) with attachment. CONFIGURE IN EMAILJS DASHBOARD.
  publicKey:           "gV5OXqbN2PHond86B",
};
