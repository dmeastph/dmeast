// src/constants/order.js
// Phase 1 extraction — order/customer/receivables constants and helpers

export const ORDER_SOURCES = [
  { id: "website",   label: "Website",    icon: "🌐", color: "#3B82F6" },
  { id: "phone",     label: "Phone",      icon: "📞", color: "#10B981" },
  { id: "messenger", label: "Messenger",  icon: "💬", color: "#0084FF" },
  { id: "whatsapp",  label: "WhatsApp",   icon: "📱", color: "#25D366" },
  { id: "walkin",    label: "Walk-in",    icon: "🚶", color: "#F59E0B" },
  { id: "email",     label: "Email",      icon: "✉️", color: "#6366F1" },
];

// v13.0a: Payment terms
export const PAYMENT_TERMS_OPTIONS = [
  { id: "cod",          label: "Cash on Delivery",   creditDays: 0  },
  { id: "gcash",        label: "GCash",              creditDays: 0  },
  { id: "maya",         label: "Maya",               creditDays: 0  },
  { id: "bank_transfer",label: "Bank Transfer",      creditDays: 0  },
  { id: "credit_15",    label: "Credit 15 days",     creditDays: 15 },
  { id: "credit_30",    label: "Credit 30 days",     creditDays: 30 },
  { id: "credit_60",    label: "Credit 60 days",     creditDays: 60 },
  { id: "credit_90",    label: "Credit 90 days",     creditDays: 90 },
  { id: "custom",       label: "Custom Terms",       creditDays: 0  },
];

// v15.4: VAT treatment options (legitimate BIR-compliant options)
export const VAT_TREATMENT_OPTIONS = [
  { 
    id: "vat_inclusive",  
    label: "VAT Inclusive (12%)",
    short: "VAT Inclusive",
    desc: "Standard 12% VAT included in price (default for most sales)",
    badge: "12% VAT",
    badgeColor: "#10B981",
    rate: 0.12,
    applies: true,
  },
  { 
    id: "vat_exempt",
    label: "VAT Exempt",
    short: "VAT Exempt",
    desc: "For senior citizen/PWD discounts, agricultural, or BIR-exempt transactions (RA 9994/RA 10754)",
    badge: "VAT EXEMPT",
    badgeColor: "#F59E0B",
    rate: 0,
    applies: false,
  },
  { 
    id: "zero_rated",
    label: "Zero-Rated",
    short: "Zero-Rated",
    desc: "For export sales, PEZA-registered entities, or zero-rated transactions per BIR",
    badge: "ZERO-RATED",
    badgeColor: "#3B82F6",
    rate: 0,
    applies: false,
  },
];

export const findVATTreatment = (id) => VAT_TREATMENT_OPTIONS.find(v => v.id === id) || VAT_TREATMENT_OPTIONS[0];

// v13.0a: Customer tags
export const CUSTOMER_TAGS = [
  { id: "vip",         label: "VIP",         color: "#F59E0B" },
  { id: "lgu",         label: "LGU",         color: "#3B82F6" },
  { id: "hospital",    label: "Hospital",    color: "#EF4444" },
  { id: "clinic",      label: "Clinic",      color: "#10B981" },
  { id: "pharmacy",    label: "Pharmacy",    color: "#8B5CF6" },
  { id: "bpo",         label: "BPO",         color: "#06B6D4" },
  { id: "distributor", label: "Distributor", color: "#EC4899" },
  { id: "walkin",      label: "Walk-in",     color: "#6B7280" },
  { id: "individual",  label: "Individual",  color: "#84CC16" },
];

// v13.0a: Receivables aging buckets (days overdue)
export const AGING_BUCKETS = [
  { label: "Current",    min: -999, max: 0,    color: "#10B981", bg: "#D1FAE5" },
  { label: "1-30 days",  min: 1,    max: 30,   color: "#F59E0B", bg: "#FEF3C7" },
  { label: "31-60 days", min: 31,   max: 60,   color: "#F97316", bg: "#FED7AA" },
  { label: "61-90 days", min: 61,   max: 90,   color: "#EF4444", bg: "#FECACA" },
  { label: "90+ days",   min: 91,   max: 9999, color: "#991B1B", bg: "#FEE2E2" },
];

// v13.0a: Helper to compute days overdue
export const daysOverdue = (dueDate) => {
  if (!dueDate) return 0;
  const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
  const now = new Date();
  return Math.floor((now - due) / (1000 * 60 * 60 * 24));
};

// v13.0a: Helper to find aging bucket
export const getAgingBucket = (days) => AGING_BUCKETS.find(b => days >= b.min && days <= b.max) || AGING_BUCKETS[0];

// v13.0a: Helper to find tag/source/term by id
export const findTag    = (id) => CUSTOMER_TAGS.find(t => t.id === id);
export const findSource = (id) => ORDER_SOURCES.find(s => s.id === id) || ORDER_SOURCES[0];
export const findTerms  = (id) => PAYMENT_TERMS_OPTIONS.find(t => t.id === id);

// v13.0a: Calculate due date based on payment terms
export const calculateDueDate = (orderDate, paymentTermsId) => {
  const term = findTerms(paymentTermsId);
  if (!term || term.creditDays === 0) return null;
  const due = orderDate ? new Date(orderDate.toDate ? orderDate.toDate() : orderDate) : new Date();
  due.setDate(due.getDate() + term.creditDays);
  return due;
};
