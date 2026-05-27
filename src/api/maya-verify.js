// /api/maya-verify.js
// Vercel serverless function — manually verifies the status of a Maya checkout.
// Used as a fallback if webhook hasn't fired yet (e.g., right after customer returns from payment page).
//
// USAGE: GET /api/maya-verify?checkoutId=abc-123
// Returns: { status, paymentStatus, isPaid, ... }

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    const MAYA_SECRET_KEY = process.env.MAYA_SECRET_KEY;
    const MAYA_API_URL = process.env.MAYA_API_URL || "https://pg-sandbox.paymaya.com";

    if (!MAYA_SECRET_KEY) {
      return res.status(500).json({ error: "Maya secret key not configured" });
    }

    const { checkoutId } = req.query;
    if (!checkoutId) {
      return res.status(400).json({ error: "Missing checkoutId query parameter" });
    }

    const authHeader = "Basic " + Buffer.from(`${MAYA_SECRET_KEY}:`).toString("base64");

    const response = await fetch(`${MAYA_API_URL}/checkout/v1/checkouts/${checkoutId}`, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Maya API error", 
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      checkoutId: data.id || checkoutId,
      isPaid: data.isPaid || false,
      paymentStatus: data.paymentStatus || data.status,
      requestReferenceNumber: data.requestReferenceNumber,
      totalAmount: data.totalAmount,
      raw: data,  // Include full response for debugging
    });

  } catch (err) {
    console.error("maya-verify error:", err);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: err.message,
    });
  }
}
