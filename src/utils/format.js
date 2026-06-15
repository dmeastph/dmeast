// ─── Formatting utilities for DMEAST ────────────────────────────────────────
//
// Extracted from src/App.jsx in Phase 1 of the refactor.
// Pure functions — no side effects, no dependencies.
//
// Original location: App.jsx lines ~1143–1149 (pre-refactor).

export const PHP_TO_USD = 0.0175;

/** Format a number as Philippine pesos: 1500 → "₱1,500" */
export const formatPHP = (n) => `₱${Number(n).toLocaleString("en-PH")}`;

/** Format a peso number as approximate USD: 1500 → "≈ $26.25 USD" */
export const formatUSD = (n) => `≈ $${(Number(n) * PHP_TO_USD).toFixed(2)} USD`;

/** Format a Firestore timestamp or Date as "Jan 15, 2026" */
export const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};
