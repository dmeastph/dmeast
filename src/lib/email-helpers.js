// ─── DMEAST email helper functions ──────────────────────────────────────────
//
// Extracted from src/App.jsx in Phase 1 of the refactor.
//
// Originally these were going to live alongside the config in src/lib/emailjs.js,
// but the file pipe couldn't grow that file, so they live here as a sibling.
//
// All three wrap @emailjs/browser to send template-based emails to customers
// and admins. They depend on CONTACT (for from-address) and formatPHP (for
// currency display in templates).

import { emailjs, EMAILJS_CONFIG } from "./emailjs";
import { CONTACT } from "../constants/contact";
import { formatPHP } from "../utils/format";

// v13.0d: Unified email sender for status updates + general customer notifications
export async function sendCustomerStatusEmail({ order, subject, bodyText }) {
  if (!order || !order.email) return { ok: false, reason: "no email on order" };
  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
      from_name: "DM EAST Team",
      company: "DM EAST",
      from_email: CONTACT.email,
      phone: CONTACT.phone1,
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
      order_items:      (order.items||[]).map(i=>i.name+" x"+i.qty+" - "+formatPHP(i.price*i.qty)).join("\n"),
      order_total:      order.total ? formatPHP(order.total) : "-",
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
}
