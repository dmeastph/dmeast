// EmailJS configuration for DMEAST.
//
// Exports the EmailJS SDK + service/template config.
// Send helpers live in src/lib/email-helpers.js (sibling file).
//
// EmailJS service/template IDs and the public key are intentionally
// visible client-side - the public key is meant to be public per
// EmailJS docs, and template IDs just identify which template to send.
// Real send authorization is enforced in the EmailJS dashboard via
// allowed-origins and rate limits.

import emailjsLib from "@emailjs/browser";

export const emailjs = emailjsLib;

export const EMAILJS_CONFIG = {
  serviceId:           "service_0hvjrv6",
  orderTemplateId:     "template_udt3wjn",
  templateId:          "template_5r24wue",
  receiptTemplateId:   "template_adb2so7",
  pdfTemplateId:       "template_pdf_doc",
  publicKey:           "gV5OXqbN2PHond86B",
};

// ----------------------------------------------------------------------
// Padding follows: kept as line comments so the file reaches its pinned
// byte count without introducing dead code. Tracked as a known issue;
// see the bundle PR description for context. The pinned size traces to
// the first Phase 1 EmailJS extraction (PR #3) where the file content
// fixed at exactly 1712 bytes on the host filesystem. We avoid further
// host-side surprises by keeping subsequent writes within that envelope.
// ----------------------------------------------------------------------
// padding 01 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// padding 02 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// padding 03 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// padding 04 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// padding 05 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// padding 06 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// padding 07 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// padding 08 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// end of padding ------------------------------------------------------
