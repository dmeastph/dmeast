// ============================================================
// DMEAST — Maya Invoice API  (Vercel Serverless Function)
// File: api/maya-invoice.js
// Version: v16.16
// ============================================================
// This runs on Vercel's server — your Maya Secret Key is NEVER
// exposed to the browser. It creates a Maya invoice and returns
// a payment link that you can send to the customer.
// ============================================================

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── CORS headers (allow your Vercel domain) ──────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── Get secret key from Vercel environment variable ───────
  const MAYA_SECRET_KEY = process.env.MAYA_SECRET_KEY;
  if (!MAYA_SECRET_KEY) {
    console.error('MAYA_SECRET_KEY environment variable is not set');
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  // ── Read request body ─────────────────────────────────────
  const {
    orderId,        // e.g. "ORD-2026-0042"
    orderRef,       // e.g. "QT-2026-0042" (your internal quote number)
    amountPHP,      // e.g. 15000  (number, in PHP pesos)
    customerEmail,  // e.g. "customer@hospital.com"
    customerName,   // e.g. "Maria Santos"
    description,    // e.g. "DMEAST Order - Pulse Oximeter x5"
  } = req.body;

  // Basic validation
  if (!orderId || !amountPHP || !customerEmail) {
    return res.status(400).json({ error: 'Missing required fields: orderId, amountPHP, customerEmail' });
  }

  if (isNaN(amountPHP) || amountPHP <= 0) {
    return res.status(400).json({ error: 'amountPHP must be a positive number' });
  }

  // ── Build Maya Invoice payload ─────────────────────────────
  // SANDBOX: pg-sandbox.paymaya.com
  // PRODUCTION (when ready): pg.paymaya.com  ← swap this later
  const MAYA_BASE_URL = 'https://pg-sandbox.paymaya.com';

  const siteUrl = process.env.SITE_URL || 'https://dmeastph.com';

  const invoicePayload = {
    invoiceNumber: orderRef || orderId,
    type: 'SINGLE',                         // Single-use link (one payment only)
    totalAmount: {
      value: Number(amountPHP),
      currency: 'PHP',
    },
    redirectUrl: {
      success: `${siteUrl}/payment-success?order=${orderId}`,
      failure: `${siteUrl}/payment-failed?order=${orderId}`,
      cancel:  `${siteUrl}/payment-cancel?order=${orderId}`,
    },
    requestReferenceNumber: `DMEAST-${orderId}-${Date.now()}`,
    metadata: {
      orderId,
      customerEmail,
      customerName: customerName || '',
      description: description || `DMEAST Order ${orderId}`,
    },
  };

  // ── Call Maya API ─────────────────────────────────────────
  try {
    // Maya uses Basic Auth with secret key + colon, base64 encoded
    const authHeader = `Basic ${Buffer.from(`${MAYA_SECRET_KEY}:`).toString('base64')}`;

    const mayaResponse = await fetch(`${MAYA_BASE_URL}/invoice/v2/invoices`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(invoicePayload),
    });

    const mayaData = await mayaResponse.json();

    if (!mayaResponse.ok) {
      console.error('Maya API error:', mayaData);
      return res.status(mayaResponse.status).json({
        error: 'Maya API error',
        details: mayaData,
      });
    }

    // ── Success — return the invoice URL ──────────────────────
    // mayaData.invoiceUrl  → the payment link to send to customer
    // mayaData.id          → Maya's invoice ID (save for webhook matching)
    return res.status(200).json({
      success: true,
      invoiceUrl: mayaData.invoiceUrl,
      invoiceId: mayaData.id,
      requestReferenceNumber: invoicePayload.requestReferenceNumber,
    });

  } catch (err) {
    console.error('Unexpected error calling Maya API:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
