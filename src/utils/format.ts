// ─── Formatting utilities for DMEAST ────────────────────────────────────────
//
// Extracted from src/App.jsx in Phase 1 of the refactor.
// Pure functions — no side effects, no dependencies.

export const PHP_TO_USD = 0.0175;

/** Format a number as Philippine pesos: 1500 → "₱1,500" */
export const formatPHP = (n: number | string): string =>
  `₱${Number(n).toLocaleString("en-PH")}`;

/** Format a peso number as approximate USD: 1500 → "≈ $26.25 USD" */
export const formatUSD = (n: number | string): string =>
  `≈ $${(Number(n) * PHP_TO_USD).toFixed(2)} USD`;

/** Firestore Timestamp shape (subset we use) */
interface FirestoreTimestamp {
  toDate(): Date;
}

/** Format a Firestore timestamp or Date as "Jan 15, 2026" */
export const formatDate = (ts: FirestoreTimestamp | Date | string | null | undefined): string => {
  if (!ts) return "—";
  const d = (ts as FirestoreTimestamp).toDate
    ? (ts as FirestoreTimestamp).toDate()
    : new Date(ts as string | Date);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};
