// ============================================================
// DMEAST — Maya Webhook Receiver  (Vercel Serverless Function)
// File: api/maya-webhook.js
// Version: v16.16
// ============================================================
// Maya calls this URL automatically when a customer pays.
// It updates the Firestore order document to paymentStatus: "paid".
//
// Register this URL in Maya Business Manager:
//   Sandbox: https://YOUR-VERCEL-URL.vercel.app/api/maya-webhook
//   (Settings → Webhooks → Payment Success URL)
// ============================================================

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Initialize Firebase Admin SDK (once) ─────────────────────
function getDb() {
  if (!getApps().length) {
    // These env vars are set in Vercel dashboard (see DEPLOYMENT GUIDE)
    const serviceAccount = {
      projectId:     process.env.FIREBASE_PROJECT_ID,
      clientEmail:   process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getFirestore();
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  // Maya sends POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;

    // ── Log incoming webhook (visible in Vercel logs) ─────────
    console.log('Maya webhook received:', JSON.stringify(payload, null, 2));

    // ── Parse Maya webhook payload ────────────────────────────
    // Maya sends different formats depending on the event type.
    // For payment success, the key fields are:
    //   payload.status           → "PAYMENT_SUCCESS"
    //   payload.id               → Maya's payment/checkout ID
    //   payload.metadata.orderId → Your DMEAST order ID (we set this when creating invoice)
    //   payload.totalAmount.value → Amount paid

    const status = payload?.status || payload?.paymentStatus;

    // Only process successful payments
    if (status !== 'PAYMENT_SUCCESS' && status !== 'SUCCESS') {
      console.log(`Ignoring webhook with status: ${status}`);
      // Still return 200 so Maya doesn't keep retrying
      return res.status(200).json({ received: true, processed: false, reason: `Status ${status} ignored` });
    }

    // Extract our order ID from metadata (we embedded it when creating the invoice)
    const orderId = payload?.metadata?.orderId
      || payload?.requestReferenceNumber?.replace(/^DMEAST-/, '').split('-')[0];

    if (!orderId) {
      console.error('Could not determine orderId from webhook payload');
      return res.status(200).json({ received: true, processed: false, reason: 'No orderId found' });
    }

    const amountPaid = payload?.totalAmount?.value || payload?.amount;
    const mayaPaymentId = payload?.id || payload?.paymentId;
    const paidAt = payload?.createdAt || new Date().toISOString();

    // ── Update Firestore order ────────────────────────────────
    const db = getDb();

    // Orders are stored in the 'orders' collection with orderId as doc ID
    // Try both the raw orderId and search by orderNumber field
    const ordersRef = db.collection('orders');

    // First try direct doc lookup (if Firestore doc ID === orderId)
    let orderDocRef = ordersRef.doc(orderId);
    let orderSnap = await orderDocRef.get();

    // If not found by doc ID, search by orderNumber field
    if (!orderSnap.exists) {
      const querySnap = await ordersRef
        .where('orderNumber', '==', orderId)
        .limit(1)
        .get();

      if (!querySnap.empty) {
        orderDocRef = querySnap.docs[0].ref;
        orderSnap = querySnap.docs[0];
      }
    }

    if (!orderSnap.exists) {
      console.error(`Order not found in Firestore: ${orderId}`);
      // Return 200 anyway — we don't want Maya to keep retrying
      return res.status(200).json({ received: true, processed: false, reason: `Order ${orderId} not found` });
    }

    // Update the order document
    await orderDocRef.update({
      paymentStatus: 'paid',
      paymentMethod: 'maya',
      mayaPaymentId: mayaPaymentId || null,
      amountPaid: amountPaid || null,
      paidAt: paidAt,
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Order ${orderId} marked as PAID via Maya (paymentId: ${mayaPaymentId})`);

    return res.status(200).json({
      received: true,
      processed: true,
      orderId,
      mayaPaymentId,
    });

  } catch (err) {
    console.error('Webhook processing error:', err);
    // Return 200 to prevent Maya from retrying endlessly
    // Log the error in Vercel logs for your review
    return res.status(200).json({ received: true, processed: false, error: err.message });
  }
}
