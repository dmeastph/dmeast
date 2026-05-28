// /api/maya-create-checkout.js
// DEBUG VERSION v16.10.1 — adds detailed logging to diagnose 401 errors
// This logs key fingerprints (first 8 chars + last 4 chars) and length
// SAFE: doesn't log full keys, only enough to verify they loaded correctly

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    const MAYA_PUBLIC_KEY = process.env.MAYA_PUBLIC_KEY;
    const MAYA_SECRET_KEY = process.env.MAYA_SECRET_KEY;
    const MAYA_API_URL = process.env.MAYA_API_URL || "https://pg-sandbox.paymaya.com";
    const APP_BASE_URL = process.env.APP_BASE_URL || "https://dmeastph.com";

    // ============ DEBUG LOGGING ============
    console.log("=== MAYA CHECKOUT DEBUG ===");
    console.log("MAYA_API_URL:", MAYA_API_URL);
    console.log("APP_BASE_URL:", APP_BASE_URL);
    
    if (!MAYA_PUBLIC_KEY) {
      console.log("MAYA_PUBLIC_KEY: NOT SET (undefined)");
    } else {
      console.log("MAYA_PUBLIC_KEY length:", MAYA_PUBLIC_KEY.length);
      console.log("MAYA_PUBLIC_KEY starts with:", MAYA_PUBLIC_KEY.substring(0, 8));
      console.log("MAYA_PUBLIC_KEY ends with:", "..." + MAYA_PUBLIC_KEY.substring(MAYA_PUBLIC_KEY.length - 4));
      console.log("MAYA_PUBLIC_KEY has leading whitespace:", MAYA_PUBLIC_KEY !== MAYA_PUBLIC_KEY.trimStart());
      console.log("MAYA_PUBLIC_KEY has trailing whitespace:", MAYA_PUBLIC_KEY !== MAYA_PUBLIC_KEY.trimEnd());
      console.log("MAYA_PUBLIC_KEY contains newline:", MAYA_PUBLIC_KEY.includes("\n") || MAYA_PUBLIC_KEY.includes("\r"));
    }
    
    if (!MAYA_SECRET_KEY) {
      console.log("MAYA_SECRET_KEY: NOT SET (undefined)");
    } else {
      console.log("MAYA_SECRET_KEY length:", MAYA_SECRET_KEY.length);
      console.log("MAYA_SECRET_KEY starts with:", MAYA_SECRET_KEY.substring(0, 8));
      console.log("MAYA_SECRET_KEY ends with:", "..." + MAYA_SECRET_KEY.substring(MAYA_SECRET_KEY.length - 4));
      console.log("MAYA_SECRET_KEY has leading whitespace:", MAYA_SECRET_KEY !== MAYA_SECRET_KEY.trimStart());
      console.log("MAYA_SECRET_KEY has trailing whitespace:", MAYA_SECRET_KEY !== MAYA_SECRET_KEY.trimEnd());
      console.log("MAYA_SECRET_KEY contains newline:", MAYA_SECRET_KEY.includes("\n") || MAYA_SECRET_KEY.includes("\r"));
    }
    // ============ END DEBUG ============

    if (!MAYA_PUBLIC_KEY || !MAYA_SECRET_KEY) {
      return res.status(500).json({ 
        error: "Maya credentials not configured", 
        hint: "Set MAYA_PUBLIC_KEY and MAYA_SECRET_KEY in Vercel environment variables"
      });
    }

    // Trim any accidental whitespace from keys (defensive)
    const cleanSecretKey = MAYA_SECRET_KEY.trim();
    const cleanPublicKey = MAYA_PUBLIC_KEY.trim();

    const { 
      orderId,
      totalAmount,
      items,
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
        name: String(item.name).substring(0, 256),
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

    // ============ AUTH HEADER DEBUG ============
    // Maya uses Basic auth: base64(SECRET_KEY + ":")
    // IMPORTANT: According to Maya docs, the PUBLIC key is for client-side ops,
    // SECRET key is for server-side (creating checkouts). We use SECRET key.
    const authString = `${cleanSecretKey}:`;
    const base64Auth = Buffer.from(authString).toString("base64");
    const authHeader = "Basic " + base64Auth;
    
    console.log("Auth string length (secret + colon):", authString.length);
    console.log("Base64 auth length:", base64Auth.length);
    console.log("Auth header preview:", authHeader.substring(0, 20) + "..." + authHeader.substring(authHeader.length - 8));
    console.log("Calling URL:", `${MAYA_API_URL}/checkout/v1/checkouts`);
    // ============ END AUTH DEBUG ============

    const response = await fetch(`${MAYA_API_URL}/checkout/v1/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // ============ RESPONSE DEBUG ============
    console.log("Maya response status:", response.status);
    console.log("Maya response body:", JSON.stringify(data));
    console.log("=== END DEBUG ===");
    // ============ END ============

    if (!response.ok) {
      console.error("Maya API error:", response.status, data);
      return res.status(response.status).json({ 
        error: "Maya API rejected the checkout", 
        details: data,
        hint: data.message || data.error || "Check Maya credentials and payload format",
        debug: {
          mayaStatus: response.status,
          mayaMessage: data.message || data.error,
          urlCalled: `${MAYA_API_URL}/checkout/v1/checkouts`,
        }
      });
    }

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
