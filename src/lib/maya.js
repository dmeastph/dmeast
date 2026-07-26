// ─── Maya payment integration helpers for DMEAST ────────────────────────────
//
// Extracted from src/App.jsx in Phase 1 of the refactor.
//
// This module collects everything client-side related to Maya payments:
//   - The static payment link (DMEAST_MAYA_LINK)
//   - Method classification (MAYA_METHODS, isMayaMethod)
//   - API wrappers for /api/maya-create-checkout and /api/maya-verify
//
// The serverless functions themselves still live in /api/maya-*.js — those are
// invoked over HTTP. This module is purely a client-side convenience layer.
//
// NOT MOVED YET (still in App.jsx):
//   - MayaPaymentPanel React component (depends on lots of App.jsx-scope helpers)
//   - The inline /api/maya-invoice fetch inside MayaPaymentPanel (will become a
//     wrapper here in a future slice)
//
// Original locations:
//   - DMEAST_MAYA_LINK:    App.jsx line ~2459
//   - MAYA_METHODS et al:  App.jsx lines ~9362–9400

// v16.17: Maya static payment link (customer enters their own amount)
export const DMEAST_MAYA_LINK = "https://paymaya.me/DECONMEDICALEQUIPME";

// ─── v16.10: MAYA PAYMENT INTEGRATION ────────────────────────────────────────
// Methods that go through Maya Checkout (instead of manual bank transfer)
export const MAYA_METHODS = ["Maya", "GCash", "Visa", "Mastercard", "QR Ph"];
export const isMayaMethod = (method) => MAYA_METHODS.includes(method);

// Call backend to create Maya checkout session, return redirect URL
export async function createMayaCheckout({ orderId, totalAmount, items, buyer }) {
  const res = await fetch("/api/maya-create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      totalAmount,
      items: items.map(i => ({
        name: i.name,
        quantity: i.qty,
        amount: i.price,
        code: i.id,
      })),
      buyerEmail:     buyer.email,
      buyerFirstName: buyer.firstName,
      buyerLastName:  buyer.lastName,
      buyerPhone:     buyer.phone,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.hint || "Failed to create Maya checkout");
  }
  return data;  // { success, checkoutId, redirectUrl, requestReferenceNumber }
}

// Manually verify a Maya payment via our backend (fallback if webhook delayed)
export async function verifyMayaPayment(checkoutId) {
  const res = await fetch(`/api/maya-verify?checkoutId=${encodeURIComponent(checkoutId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Verification failed");
  return data;
}
