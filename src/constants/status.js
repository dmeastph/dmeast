// src/constants/status.js
// Phase 1 extraction — order and payment status helpers

export const orderStatusColor = s => ({
  pending:       {bg:"#FEF9C3",color:"#A16207"},
  confirmed:     {bg:"#DBEAFE",color:"#1E40AF"},
  processing:    {bg:"#EDE9FE",color:"#5B21B6"},
  shipped:       {bg:"#DCFCE7",color:"#166534"},
  delivered:     {bg:"#D1FAE5",color:"#065F46"},
  cancelled:     {bg:"#FEE2E2",color:"#991B1B"},
  out_of_stock:  {bg:"#FFF7ED",color:"#C2410C"},
  international_inquiry:{bg:"#F0FDF4",color:"#15803D"},
}[s]||{bg:"#F3F4F6",color:"#374151"});

export const ORDER_STATUS_LABELS = {
  pending:      "Pending",
  confirmed:    "Confirmed",
  processing:   "Processing",
  shipped:      "Shipped",
  delivered:    "Delivered",
  cancelled:    "Cancelled",
  out_of_stock: "Out of Stock",
  international_inquiry: "International Inquiry",
};

// NEW IN V11: Payment status labels
export const PAYMENT_STATUS_LABELS = {
  awaiting:  "Awaiting Payment",
  submitted: "Proof Submitted — Pending Review",
  confirmed: "Payment Confirmed ✓",
  rejected:  "Payment Rejected — Re-upload Needed",
};

export const paymentStatusColor = s => ({
  awaiting:  {bg:"#FEF9C3",color:"#A16207"},
  submitted: {bg:"#DBEAFE",color:"#1E40AF"},
  confirmed: {bg:"#D1FAE5",color:"#065F46"},
  rejected:  {bg:"#FEE2E2",color:"#991B1B"},
}[s]||{bg:"#F3F4F6",color:"#374151"});
