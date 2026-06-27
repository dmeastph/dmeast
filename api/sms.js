/**
 * api/sms.js — Semaphore Philippines SMS API wrapper (Vercel serverless)
 * POST /api/sms
 * Body: { phone, message, senderName? }
 *
 * Env vars required:
 *   SEMAPHORE_API_KEY — from https://semaphore.co/
 *   SEMAPHORE_SENDER_NAME — e.g. "DMEAST" (must be registered with Semaphore)
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { phone, message, senderName } = req.body || {};
  if (!phone || !message) return res.status(400).json({ error: "phone and message are required" });
  if (!process.env.SEMAPHORE_API_KEY) return res.status(503).json({ error: "SMS not configured" });

  // Normalize phone to PH format (Semaphore expects 09xxxxxxxxx or +639xxxxxxxxx)
  const normalized = phone.startsWith("+63") ? phone.slice(1) : phone.replace(/^0/, "63");

  const body = new URLSearchParams({
    apikey:      process.env.SEMAPHORE_API_KEY,
    number:      normalized,
    message:     message.slice(0, 160),
    sendername:  senderName || process.env.SEMAPHORE_SENDER_NAME || "DMEAST",
  });

  try {
    const resp = await fetch("https://api.semaphore.co/api/v4/messages", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data });
    res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error("Semaphore SMS error:", err);
    res.status(500).json({ error: err.message });
  }
}
