// /api/maya-create-checkout.js
// Vercel serverless function — creates a Maya Checkout session and returns the redirect URL.
//
// HOW IT WORKS:
//   1. Frontend calls this endpoint with order details (amount, items, customer info)
//   2. This function calls Maya's API server-to-server (keeping secret key safe)
//   3. Maya returns a redirectUrl + checkoutId
//   4. We return those to the frontend
//   5. Frontend redirects customer to the redirectUrl (Maya's payment page)
//
// ENVIRONMENT VARIABLES REQUIRED (set in Vercel):
//   MAYA_PUBLIC_KEY   = pk-XXXXX (from Maya Business Manager)
//   MAYA_SECRET_KEY   = sk-XXXXX (from Maya Business Manager — NEVER expose to client)
//   MAYA_API_URL      = https://pg-sandbox.paymaya.com  (sandbox) or  https://pg.paymaya.com  (production)
//   APP_BASE_URL      = https://sandbox.dmeastph.com  (or https://dmeastph.com for prod)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // CORS — allow our own domain to call this
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    const MAYA_PUBLIC_KEY = process.env.MAYA_PUBLIC_KEY;
    const MAYA_SECRET_KEY = process.env.MAYA_SECRET_KEY;
    const MAYA_API_URL = process.env.MAYA_API_URL || "https://pg-sandbox.paymaya.com";
    const APP_BASE_URL = process.env.APP_BASE_URL || "https://dmeastph.com";

    if (!MAYA_PUBLIC_KEY || !MAYA_SECRET_KEY) {
      return res.status(500).json({ 
        error: "Maya credentials not configured", 
        hint: "Set MAYA_PUBLIC_KEY and MAYA_SECRET_KEY in Vercel environment variables"
      });
    }

    const { 
      orderId,        // e.g., "SO-2026-0001"
      totalAmount,    // number in PHP (e.g., 2160.00)
      items,          // [{ name, quantity, amount, currency: "PHP" }]
      buyerEmail,
      buyerFirstName,
      buyerLastName,
      buyerPhone,
    } = req.body;

    if (!orderId || !totalAmount || !items || items.length === 0) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        required: ["orderId", "totalAmount", "items"]
      });
    }

    // Maya Checkout API payload
    const payload = {
      totalAmount: {
        value: Number(totalAmount).toFixed(2),
        currency: "PHP",
      },
      buyer: {
        firstName: buyerFirstName || "Customer",
        lastName: buyerLastName || "",
        contact: {
          email: buyerEmail || "info@dmeastph.com",
          phone: buyerPhone || "",
        },
      },
      items: items.map(item => ({
        name: String(item.name).substring(0, 256),  // Maya limits item name length
        quantity: item.quantity || 1,
        code: item.code || "ITEM",
        amount: {
          value: Number(item.amount).toFixed(2),
          currency: "PHP",
        },
        totalAmount: {
          value: Number(item.amount * (item.quantity || 1)).toFixed(2),
          currency: "PHP",
        },
      })),
      redirectUrl: {
        success: `${APP_BASE_URL}/?payment=success&orderId=${encodeURIComponent(orderId)}`,
        failure: `${APP_BASE_URL}/?payment=failure&orderId=${encodeURIComponent(orderId)}`,
        cancel:  `${APP_BASE_URL}/?payment=cancel&orderId=${encodeURIComponent(orderId)}`,
      },
      requestReferenceNumber: orderId,
      metadata: {
        source: "dmeast-web",
      },
    };

    // Maya uses Basic auth with secret key (base64 encoded with trailing colon)
    const authHeader = "Basic " + Buffer.from(`${MAYA_SECRET_KEY}:`).toString("base64");

    const response = await fetch(`${MAYA_API_URL}/checkout/v1/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Maya API error:", response.status, data);
      return res.status(response.status).json({ 
        error: "Maya API rejected the checkout", 
        details: data,
        hint: data.message || data.error || "Check Maya credentials and payload format",
      });
    }

    // Success — return the redirect URL to frontend
    return res.status(200).json({
      success: true,
      checkoutId: data.checkoutId,
      redirectUrl: data.redirectUrl,
      requestReferenceNumber: orderId,
    });

  } catch (err) {
    console.error("maya-create-checkout error:", err);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: err.message,
    });
  }
}
