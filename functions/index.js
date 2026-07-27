/**
 * DMEAST Firebase Cloud Functions
 * ─────────────────────────────────
 * weeklyStorageCleanup  — runs every Sunday 2 AM Manila time (auto)
 * triggerStorageCleanup — HTTP endpoint for manual / emergency runs
 *
 * What gets deleted:
 *   payment-proofs/{orderId}/**  older than 60 days where paymentStatus = approved | rejected
 *   rx-uploads/{orderId}/**      older than 90 days where rxUpload status  = approved | rejected
 *
 * What is NEVER touched:
 *   products/**   (product catalogue images — permanent)
 *   expenses/**   (accounting receipts — permanent)
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest }  = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore }  = require("firebase-admin/firestore");
const { getStorage }    = require("firebase-admin/storage");

initializeApp();

const REGION  = "asia-southeast1";   // Singapore — closest to Manila
const BUCKET  = "dmeast-516cc.firebasestorage.app";

// How many days before a reviewed file is eligible for deletion
const PAYMENT_PROOF_TTL_DAYS = 60;
const RX_UPLOAD_TTL_DAYS     = 90;

// Secret header / query param for the HTTP endpoint
// Set this as a Firebase secret: firebase functions:secrets:set CLEANUP_SECRET
const CLEANUP_SECRET = process.env.CLEANUP_SECRET || "dmeast-cleanup-secret-2024";

// ─── Core cleanup logic ────────────────────────────────────────────────────────
async function runCleanup() {
  const db     = getFirestore();
  const bucket = getStorage().bucket(BUCKET);
  const now    = Date.now();
  let deleted  = 0;
  let skipped  = 0;
  let errors   = 0;
  const log    = [];

  // ── 1. payment-proofs/ ──────────────────────────────────────────────────────
  const paymentCutoff = now - PAYMENT_PROOF_TTL_DAYS * 86400_000;
  try {
    const [paymentFiles] = await bucket.getFiles({ prefix: "payment-proofs/" });
    log.push(`Found ${paymentFiles.length} files under payment-proofs/`);

    for (const file of paymentFiles) {
      // Skip "folder" placeholder objects (zero-byte files ending in /)
      if (file.name.endsWith("/")) continue;

      const created = new Date(file.metadata.timeCreated).getTime();
      if (created > paymentCutoff) { skipped++; continue; }

      // path: payment-proofs/{orderId}/proof-xxx.jpg  →  parts[1] = orderId
      const orderId = file.name.split("/")[1];
      if (!orderId) { skipped++; continue; }

      try {
        const orderSnap = await db.collection("orders").doc(orderId).get();

        if (!orderSnap.exists) {
          // Orphan — order record is gone, safe to delete
          await file.delete();
          deleted++;
          log.push(`[DEL] orphan proof: ${file.name}`);
          continue;
        }

        const status = orderSnap.data().paymentStatus;
        if (status === "approved" || status === "rejected") {
          await file.delete();
          deleted++;
          log.push(`[DEL] ${status} proof (${orderId}): ${file.name}`);
        } else {
          skipped++;
          log.push(`[SKIP] status="${status}" (${orderId}): ${file.name}`);
        }
      } catch (e) {
        errors++;
        log.push(`[ERR] ${file.name}: ${e.message}`);
      }
    }
  } catch (e) {
    errors++;
    log.push(`[ERR] listing payment-proofs/: ${e.message}`);
  }

  // ── 2. rx-uploads/ ──────────────────────────────────────────────────────────
  const rxCutoff = now - RX_UPLOAD_TTL_DAYS * 86400_000;
  try {
    const [rxFiles] = await bucket.getFiles({ prefix: "rx-uploads/" });
    log.push(`Found ${rxFiles.length} files under rx-uploads/`);

    for (const file of rxFiles) {
      if (file.name.endsWith("/")) continue;

      const created = new Date(file.metadata.timeCreated).getTime();
      if (created > rxCutoff) { skipped++; continue; }

      const orderId = file.name.split("/")[1];
      if (!orderId) { skipped++; continue; }

      try {
        const rxSnap = await db.collection("rxUploads")
          .where("orderId", "==", orderId)
          .limit(1)
          .get();

        let shouldDelete = false;
        let reason       = "orphan";

        if (rxSnap.empty) {
          shouldDelete = true;  // No matching Firestore record
        } else {
          const st = rxSnap.docs[0].data().status;
          if (st === "approved" || st === "rejected") {
            shouldDelete = true;
            reason = st;
          }
        }

        if (shouldDelete) {
          await file.delete();
          deleted++;
          log.push(`[DEL] rx ${reason} (${orderId}): ${file.name}`);
        } else {
          skipped++;
        }
      } catch (e) {
        errors++;
        log.push(`[ERR] ${file.name}: ${e.message}`);
      }
    }
  } catch (e) {
    errors++;
    log.push(`[ERR] listing rx-uploads/: ${e.message}`);
  }

  return {
    deleted,
    skipped,
    errors,
    log,
    timestamp: new Date().toISOString(),
  };
}

// ─── Scheduled trigger — every Sunday at 2:00 AM Manila (UTC+8 = 18:00 Sat UTC) ──
exports.weeklyStorageCleanup = onSchedule(
  {
    schedule:  "0 18 * * 0",   // Sunday 18:00 UTC = Monday 02:00 PHT
    timeZone:  "UTC",
    region:    REGION,
    memory:    "256MiB",
    timeoutSeconds: 300,
  },
  async () => {
    console.log("=== Weekly storage cleanup starting ===");
    const result = await runCleanup();
    console.log(`Deleted: ${result.deleted} | Skipped: ${result.skipped} | Errors: ${result.errors}`);
    result.log.forEach(l => console.log(l));
  }
);

// ─── HTTP trigger — call manually for emergency / one-time cleanup ──────────
//
//   curl -X POST \
//     -H "x-cleanup-secret: dmeast-cleanup-secret-2024" \
//     https://asia-southeast1-dmeast-516cc.cloudfunctions.net/triggerStorageCleanup
//
exports.triggerStorageCleanup = onRequest(
  {
    region:         REGION,
    memory:         "256MiB",
    timeoutSeconds: 300,
    invoker:        "public",   // callable without Google auth (protected by secret)
  },
  async (req, res) => {
    const secret = req.headers["x-cleanup-secret"] || req.query.secret;
    if (secret !== CLEANUP_SECRET) {
      return res.status(403).json({ error: "Forbidden — wrong secret" });
    }

    console.log("=== Manual storage cleanup triggered ===");
    try {
      const result = await runCleanup();
      console.log("Cleanup done:", JSON.stringify(result));
      res.json({ success: true, ...result });
    } catch (e) {
      console.error("Cleanup failed:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  }
);
