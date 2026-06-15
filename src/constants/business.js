// ─── DMEAST business + rewards constants ────────────────────────────────────
//
// Extracted from src/App.jsx in Phase 1 of the refactor.
// Pure data, no dependencies.
//
// Original location: App.jsx lines ~462–472 (pre-refactor).

// Rewards / loyalty points config
export const POINTS_PER_PHP = 1 / 200;   // 1 point per ₱200 spent
export const POINT_VALUE    = 0.50;       // each point worth ₱0.50

// v13.0a: Business registration info (BIR documents)
export const DMEAST_BUSINESS_INFO = {
  legalName: "DECON MEDICAL EQUIPMENT AND SUPPLIES TRADING",
  proprietor: "EDILBERTO B. CONDE",
  vatRegTIN: "417-877-476-00000",
  registeredAddress: "1146 M. Natividad St., Cor. Mayhaligue St., Brgy 316 Zone 032, 1014 Sta. Cruz NCR, City of Manila, First District Philippines",
};
