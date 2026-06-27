// src/constants/status.ts — order and payment status helpers

interface StatusStyle { bg: string; color: string }

export const orderStatusColor = (s: string): StatusStyle => (({
  pending:               { bg: "#FEF9C3", color: "#A16207" },
  confirmed:             { bg: "#DBEAFE", color: "#1E40AF" },
  processing:            { bg: "#EDE9FE", color: "#5B21B6" },
  shipped:               { bg: "#DCFCE7", color: "#166534" },
  delivered:             { bg: "#D1FAE5", color: "#065F46" },
  cancelled:             { bg: "#FEE2E2", color: "#991B1B" },
  out_of_stock:          { bg: "#FFF7ED", color: "#C2410C" },
  international_inquiry: { bg: "#F0FDF4", color: "#15803D" },
} as Record<string, StatusStyle>)[s] ?? { bg: "#F3F4F6", color: "#374151" });

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:               "Pending",
  confirmed:             "Confirmed",
  processing:            "Processing",
  shipped:               "Shipped",
  delivered:             "Delivered",
  cancelled:             "Cancelled",
  out_of_stock:          "Out of Stock",
  international_inquiry: "International Inquiry",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  awaiting:  "Awaiting Payment",
  submitted: "Proof Submitted — Pending Review",
  confirmed: "Payment Confirmed ✓",
  rejected:  "Payment Rejected — Re-upload Needed",
};

export const paymentStatusColor = (s: string): StatusStyle => (({
  awaiting:  { bg: "#FEF9C3", color: "#A16207" },
  submitted: { bg: "#DBEAFE", color: "#1E40AF" },
  confirmed: { bg: "#D1FAE5", color: "#065F46" },
  rejected:  { bg: "#FEE2E2", color: "#991B1B" },
} as Record<string, StatusStyle>)[s] ?? { bg: "#F3F4F6", color: "#374151" });
