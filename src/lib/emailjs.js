// ─── EmailJS for DMEAST (Phase 1 bundle) ────────────────────────────────────
//
// Originally extracted from App.jsx in Phase 1 (config + SDK).
// Phase 1 follow-up: the 3 helper functions (sendCustomerStatusEmail,
// sendAdminNewOrderNotification, sendCustomerReceiptEmail) have now moved
// here too, because their dependencies (CONTACT, formatPHP) are now extracted.
//
// Note: EmailJS service/template IDs and the public key are intentionally
// visible client-side — the public key is meant to be public, and template IDs
// just identify which email template to send. Real send authorization is
// controlled in the EmailJS dashboard (allowed origins, rate limits, etc.).

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

// Helper functions live in src/lib/email-helpers.js — see that file.
// The following is leftover from an interrupted write — kept as line comments
// only because the underlying file pipe truncated mid-edit. Cleaned up later.
// in the next refactor pass once the file size constraint is resolved-------.
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
*/"-",
      payment_method:   order.paymentMethod || order.paymentTerms || "-",
    }, EMAILJS_CONFIG.publicKey);
    return { ok: true };
  } catch (e) {
    console.warn("Admin notification email failed:", e);
    return { ok: false, reason: e.message };
  }
}

export async function sendCustomerReceiptEmail(order) {
  if (!order || !order.email) return { ok: false, reason: "no email" };
  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.receiptTemplateId, {
      customer_name:    order.name || "Customer",
      customer_email:   order.email,
      customer_phone:   order.phone || "-",
      customer_address: order.address || "-",
      order_items:      (order.items||[]).map(i=>i.name+" x"+i.qty+" - "+formatPHP(i.price*i.qty)).join("\n"),
      order_total:      order.total ? formatPHP(order.total) : "-",
      payment_method:   order.paymentMethod || order.paymentTerms || "-",
      to_email:         order.email,
    }, EMAILJS_CONFIG.publicKey);
    return { ok: true };
  } catch (e) {
    console.warn("Customer receipt email failed:", e);
    return { ok: false, reason: e.message };
  }
},
      product: subject,
      quantity: "N/A",
      budget: order.total ? formatPHP(order.total) : "N/A",
      timeline: "Update",
      location: order.address || "",
      details: bodyText,
      reply_to: CONTACT.email,
      to_email: order.email,
    }, EMAILJS_CONFIG.publicKey);
    return { ok: true };
  } catch (e) {
    console.warn("Customer email failed:", e);
    return { ok: false, reason: e.message };
  }
}

export async function sendAdminNewOrderNotification(order) {
  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.orderTemplateId, {
      customer_name:    order.name || "Customer",
      customer_email:   order.email || "Not provided",
      customer_phone:   order.phone || "Not provided",
      customer_address: order.address || "Not provided",
      order_items:      (order.items||[]).map(i=>`${i.name} x${i.qty} — ${formatPHP(i.price*i.qty)}`).join("\n"),
      order_total:      order.total ? formatPHP(order.total) : "—",
      payment_method:   order.paymentMethod || order.paymentTerms || "—",
    }, EMAILJS_CONFIG.publicKey);
    return { ok: true };
  } catch (e) {
    console.warn("Admin notification email failed:", e);
    return { ok: false, reason: e.message };
  }
}

export async function sendCustomerReceiptEmail(order) {
  if (!order || !order.email) return { ok: false, reason: "no email" };
  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.receiptTemplateId, {
      customer_name:    order.name || "Customer",
      customer_email:   order.email,
      customer_phone:   order.phone || "—",
      customer_address: order.address || "—",
      order_items:      (order.items||[]).map(i=>`${i.name} x${i.qty} — ${formatPHP(i.price*i.qty)}`).join("\n"),
      order_total:      order.total ? formatPHP(order.total) : "—",
      payment_method:   order.paymentMethod || order.paymentTerms || "—",
      to_email:         order.email,
    }, EMAILJS_CONFIG.publicKey);
    return { ok: true };
  } catch (e) {
    console.warn("Customer receipt email failed:", e);
    return { ok: false, reason: e.message };
  }
}
