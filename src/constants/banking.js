// ─── DMEAST banking & payment info ──────────────────────────────────────────
//
// Extracted from src/App.jsx in Phase 1 of the refactor.
// Used in proforma invoices, payment instructions, and admin UI.
//
// Original location: App.jsx lines ~2454–2476 (pre-refactor).

// v16.13/v16.14: International wire transfer info for proforma invoices
// Edit these values when bank/payment info changes
export const DMEAST_BANK_INFO = {
  beneficiary:  "DECON MEDICAL EQUIPMENT AND SUPPLIES TRADING",
  bankName:     "China Banking Corporation",
  bankAddress:  "8745 Paseo de Roxas, Makati City, Philippines",
  swiftCode:    "CHBKPHMM",
  accountName:  "DECON MEDICAL EQUIPMENT AND SUPPLIES TRADING",
  accountNo:    "150600002424",
  accountType:  "PHP Account (USD/foreign wires will be auto-converted at China Bank's prevailing rate)",
};

// v16.14: PayPal account info
export const DMEAST_PAYPAL_INFO = {
  email:        "info@dmeastph.com",
  holdWarning:  "Important: PayPal holds transactions over $500 USD for up to 21 days. For faster processing on larger orders, please use wire transfer or credit/debit card instead.",
};

// v16.17: Default payment method toggle settings (used if Firestore not yet set)
export const DEFAULT_PAYMENT_METHODS = {
  wireTransfer: true,
  fiuuQR:       true,
  paypal:       true,
  mayaLink:     true,
};
