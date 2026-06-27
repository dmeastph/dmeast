/**
 * src/lib/sms.js — client-side helper to send SMS via /api/sms
 * Uses Semaphore Philippines via our Vercel serverless proxy.
 */

export async function sendSMS(phone, message) {
  if (!phone || !message) return;
  try {
    const resp = await fetch("/api/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    return resp.ok;
  } catch (e) {
    console.warn("SMS send failed (non-blocking):", e);
    return false;
  }
}

export function orderConfirmationSMS(order) {
  const ref = order.id?.slice(-6).toUpperCase() || "------";
  const total = `₱${Number(order.total || 0).toLocaleString("en-PH")}`;
  return `DMEAST Order #${ref} confirmed! Total: ${total}. Payment via ${order.paymentMethod}. We'll contact you to confirm delivery. Reply STOP to opt out.`;
}

export function orderStatusSMS(order, newStatus) {
  const ref = order.id?.slice(-6).toUpperCase() || "------";
  const statusMessages = {
    confirmed:  `DMEAST Order #${ref} has been confirmed and is being prepared.`,
    processing: `DMEAST Order #${ref} is now being processed and packed.`,
    shipped:    `DMEAST Order #${ref} is on its way! Expect delivery soon.`,
    delivered:  `DMEAST Order #${ref} has been delivered. Thank you for your order!`,
    cancelled:  `DMEAST Order #${ref} has been cancelled. Contact us at info@dmeastph.com for assistance.`,
    out_of_stock: `DMEAST Order #${ref}: Some items are currently unavailable. Our team will contact you shortly.`,
  };
  return statusMessages[newStatus] || `DMEAST Order #${ref} status updated to: ${newStatus}.`;
}
