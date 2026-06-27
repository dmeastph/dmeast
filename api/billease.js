/**
 * api/billease.js — BillEase Buy Now Pay Later checkout initiation
 * POST /api/billease
 *
 * BillEase is a Philippine BNPL provider (billease.ph).
 * Minimum order: ₱3,000. Available in Metro Manila initially.
 *
 * Env vars:
 *   BILLEASE_API_KEY    — from BillEase merchant dashboard
 *   BILLEASE_SHOP_ID    — merchant shop ID
 *   BILLEASE_SECRET     — webhook secret for signature verification
 *   BILLEASE_SANDBOX    — "true" for sandbox environment
 *
 * Docs: https://docs.billease.ph/
 */

const BILLEASE_BASE = process.env.BILLEASE_SANDBOX === "true"
  ? "https://sandbox.billease.ph/api"
  : "https://app.billease.ph/api";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { orderId, amount, customer, items, successUrl, failUrl } = req.body || {};

  if (!orderId || !amount || amount < 3000) {
    return res.status(400).json({ error: "BillEase requires minimum ₱3,000 order" });
  }
  if (!process.env.BILLEASE_API_KEY) {
    return res.status(503).json({ error: "BillEase not configured" });
  }

  const payload = {
    shop_id:    process.env.BILLEASE_SHOP_ID,
    order_id:   orderId,
    amount:     amount,
    currency:   "PHP",
    success_url: successUrl || `${process.env.VITE_APP_URL || "https://dmeastph.com"}/payment-return?status=success&ref=${orderId}`,
    fail_url:    failUrl    || `${process.env.VITE_APP_URL || "https://dmeastph.com"}/payment-return?status=fail&ref=${orderId}`,
    customer: {
      first_name: customer?.firstName || customer?.name?.split(" ")[0] || "Customer",
      last_name:  customer?.lastName  || customer?.name?.split(" ").slice(1).join(" ") || "",
      email:      customer?.email     || "",
      phone:      customer?.phone     || "",
    },
    items: (items || []).map(i => ({
      name:     i.name,
      amount:   i.price,
      quantity: i.qty || i.quantity || 1,
    })),
  };

  try {
    const resp = await fetch(`${BILLEASE_BASE}/v1/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.BILLEASE_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data });
    // Returns { checkout_url, token }
    res.status(200).json({ checkoutUrl: data.checkout_url, token: data.token });
  } catch (err) {
    console.error("BillEase error:", err);
    res.status(500).json({ error: err.message });
  }
}
