// ─── BUSINESS / LOYALTY CONSTANTS ─────────────────────────────────────────────
// Extracted from App.jsx as part of Phase 1 refactor.

// Loyalty points: 1 point per ₱200 spent, redeemable at ₱0.50/point
export const POINTS_PER_PHP = 1 / 200;
export const POINT_VALUE    = 0.50;

// ─── v13.0a BUSINESS REGISTRATION INFO ───────────────────────────────────────
// BIR-registered entity details (used in PDF generators and invoices)
export const DMEAST_BUSINESS_INFO = {
  legalName: "DECON MEDICAL EQUIPMENT AND SUPPLIES TRADING",
  proprietor: "EDILBERTO B. CONDE",
  vatRegTIN: "417-877-476-00000",
  registeredAddress: "1146 M. Natividad St., Cor. Mayhaligue St., Brgy 316 Zone 032, 1014 Sta. Cruz NCR, City of Manila, First District Philippines",
};
