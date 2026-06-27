// Expense tracking constants
export const EXPENSE_CATEGORIES = [
  { id: "cogs",       label: "Cost of Goods (COGS)", icon: "📦", color: "#EF4444" },
  { id: "office",     label: "Office Expenses",      icon: "🏢", color: "#3B82F6" },
  { id: "transport",  label: "Transportation",       icon: "🚚", color: "#F59E0B" },
  { id: "utilities",  label: "Utilities",            icon: "💡", color: "#8B5CF6" },
  { id: "marketing",  label: "Marketing",            icon: "📢", color: "#EC4899" },
  { id: "salary",     label: "Salaries / Payroll",   icon: "👥", color: "#10B981" },
  { id: "rent",       label: "Rent / Lease",         icon: "🏠", color: "#06B6D4" },
  { id: "tax",        label: "Tax / Government",     icon: "📋", color: "#6B7280" },
  { id: "other",      label: "Other",                icon: "📝", color: "#84CC16" },
];

export const EXPENSE_PAYMENT_STATUS = [
  { id: "paid",    label: "Paid",    color: "#10B981", bg: "#D1FAE5" },
  { id: "unpaid",  label: "Unpaid",  color: "#EF4444", bg: "#FEE2E2" },
  { id: "partial", label: "Partial", color: "#F59E0B", bg: "#FEF3C7" },
];

export const findExpenseCategory = (id) => EXPENSE_CATEGORIES.find(c => c.id === id) || EXPENSE_CATEGORIES[8];

