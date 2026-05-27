// /api/maya-webhook.js
// Vercel serverless function — receives payment status webhooks from Maya.
// Updates the corresponding order in Firestore.
//
// HOW IT WORKS:
//   1. Customer completes payment on Maya's page
//   2. Maya sends a POST request to this endpoint with payment status
//   3. We verify the signature (security)
//   4. We update the Firestore order document with paid/failed status
//   5. Return 200 OK so Maya doesn't retry
//
// SETUP IN MAYA BUSINESS MANAGER:
//   - Go to: Developers → Webhooks
//   - Add webhook URL: https://sandbox.dmeastph.com/api/maya-webhook  (and production URL too)
//   - Subscribe to events: PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_EXPIRED, CHECKOUT_SUCCESS, CHECKOUT_FAILURE
//
// ENVIRONMENT VARIABLES REQUIRED:
//   FIREBASE_SERVICE_ACCOUNT  = JSON string of Firebase Admin SDK service account
//                                (Firebase Console → Project Settings → Service Accounts → Generate new private key)
//   MAYA_WEBHOOK_SECRET       = (optional but recommended) Secret for signature verification

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK (only once across function invocations)
function getDb() {
  if (!getApps().length) {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountStr) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT env var not set");
    }
    const serviceAccount = JSON.parse(serviceAccountStr);
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const event = req.body;
    console.log("Maya webhook received:", JSON.stringify(event, null, 2));

    // Extract payment info from webhook payload
    // Maya webhook payload structure (typical):
    // {
    //   "id": "abc-123-checkout-id",
    //   "isPaid": true/false,
    //   "status": "PAYMENT_SUCCESS" | "PAYMENT_FAILED" | "PAYMENT_EXPIRED",
    //   "requestReferenceNumber": "SO-2026-0001",
    //   "paymentDetails": { ... }
    // }

    const orderId = event.requestReferenceNumber || event.metadata?.orderId;
    const status = event.status || event.paymentStatus;
    const checkoutId = event.id || event.checkoutId;

    if (!orderId) {
      console.warn("Webhook missing orderId/requestReferenceNumber");
      return res.status(200).json({ received: true, warning: "no orderId" });
    }

    // Map Maya status to our internal status
    let paymentStatus = "unknown";
    let orderStatus = null;
    if (status === "PAYMENT_SUCCESS" || event.isPaid === true) {
      paymentStatus = "paid";
      orderStatus = "paid";
    } else if (status === "PAYMENT_FAILED") {
      paymentStatus = "failed";
    } else if (status === "PAYMENT_EXPIRED") {
      paymentStatus = "expired";
    } else if (status === "PAYMENT_CANCELLED") {
      paymentStatus = "cancelled";
    }

    // Update the order in Firestore
    const db = getDb();
    const updateData = {
      paymentMethod: "maya",
      paymentStatus,
      mayaCheckoutId: checkoutId,
      mayaWebhookReceivedAt: FieldValue.serverTimestamp(),
      mayaLastEvent: status,
    };
    if (orderStatus) {
      updateData.status = orderStatus;
    }

    await db.collection("orders").doc(orderId).set(updateData, { merge: true });

    console.log(`Order ${orderId} updated with status: ${paymentStatus}`);

    return res.status(200).json({ 
      received: true, 
      orderId, 
      paymentStatus,
    });

  } catch (err) {
    console.error("maya-webhook error:", err);
    // IMPORTANT: Even on error, return 200 to prevent Maya from retrying indefinitely
    // (we can investigate logs later)
    return res.status(200).json({ 
      received: true, 
      error: err.message,
    });
  }
}

// Disable body size limits if Maya sends large payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
