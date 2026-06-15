// ─── DMEAST admin roles & permissions ───────────────────────────────────────
//
// Extracted from src/App.jsx in Phase 1 of the refactor.
// Pure data + 3 tiny helper functions. No external dependencies.
//
// Edit ADMIN_ROLES to add or remove staff. Edit ROLE_PERMISSIONS to change
// what each role can see and do.
//
// Original location: App.jsx lines ~304–380 (pre-refactor).

// Legacy admin email list — kept for backward compat with v14 and older.
export const ADMIN_EMAILS = ["info@dmeastph.com", "admin@dmeastph.com"];

// v15 Role-Based Access Control
// Map admin emails to their role. Edit this list to add/remove staff.
export const ADMIN_ROLES = {
  // SUPER ADMINS (Edward — owner) — full access to everything
  "info@dmeastph.com":       "super",
  "admin@dmeastph.com":      "super",
  // OPERATIONS ADMIN — sales coordinator / order processor
  // Sees: Overview, Orders, Receivables, Products, Customers, Rx
  // Cannot: see margins/expenses/billings/profits, delete orders
  "ops@dmeastph.com":        "operations",
  // ACCOUNTING ADMIN — bookkeeper / finance / accountant
  // Sees: Overview, Receivables, Expenses, Billings, Margin, Customers (read-only)
  // Cannot: edit orders or products, manage prescriptions
  "accounting@dmeastph.com": "accounting",
};

// Role definitions: label, icon, color, allowed tabs, and per-feature flags.
export const ROLE_PERMISSIONS = {
  super: {
    label: "Super Admin",
    icon: "👑",
    color: "#7C3AED",
    description: "Full access to all features",
    tabs: ["overview","orders","receivables","expenses","billings","margin","products","customers","rx","blog","suppliers","rfq","settings"],
    canEditOrders: true,
    canDeleteOrders: true,
    canEditProducts: true,
    canSeeMargins: true,
    canSeeExpenses: true,
    canManageUsers: true,
    canEditBlog: true,
  },
  operations: {
    label: "Operations Admin",
    icon: "🔧",
    color: "#0EA5E9",
    description: "Manages orders, customers, products, prescriptions, margin dashboard",
    tabs: ["overview","orders","receivables","margin","products","customers","rx","blog"],
    canEditOrders: true,
    canDeleteOrders: false,
    canEditProducts: true,
    canSeeMargins: true,
    canSeeExpenses: false,
    canManageUsers: false,
    canEditBlog: true,
  },
  accounting: {
    label: "Accounting Admin",
    icon: "💼",
    color: "#10B981",
    description: "Manages financial records, expenses, billings",
    tabs: ["overview","receivables","expenses","billings","margin","customers"],
    canEditOrders: false,
    canDeleteOrders: false,
    canEditProducts: false,
    canSeeMargins: true,
    canSeeExpenses: true,
    canManageUsers: false,
    canEditBlog: false,
  },
};

// v15: Get role for current user (replaces simple admin email check)
export const getUserRole = (email) => {
  if (!email) return null;
  const lower = email.toLowerCase();
  return ADMIN_ROLES[lower] || null;
};

export const isAdminUser = (email) => getUserRole(email) !== null;

export const getPermissions = (email) => {
  const role = getUserRole(email);
  return role ? ROLE_PERMISSIONS[role] : null;
};
