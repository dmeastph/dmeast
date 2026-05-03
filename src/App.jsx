/**
 * DMEAST — Medical Solutions Platform  v15.2
 *
 * v15.2 FIXES:
 * - 🐛 Quote Request form was failing — now sends both admin+customer emails
 *   AND saves quote to Firestore for admin tracking
 * - 🐛 Operations admin couldn't see customers — fixed by per-collection
 *   error handling (each load is independent — partial failures don't break all)
 * - 📈 Operations role now has access to Margin Dashboard
 * - 📸 Payment proof upload moved to TOP of order success screen
 *   (more prominent — customers immediately see they can upload proof)
 *
 * v15.1 ROLE ACTIVATION:
 * - 🔧 ops@dmeastph.com activated as Operations Admin
 * - 💼 accounting@dmeastph.com activated as Accounting Admin
 * - 🔒 Hardened per-action permissions (delete/edit/new order respect role)
 * - 📌 Note: Both accounts must be created in Firebase Auth first
 *
 * v15 NEW FEATURES:
 * - 👑 Role-Based Access Control (Super Admin / Operations / Accounting)
 * - 📄 PDF Document Generation:
 *     - Quotation (with validity period)
 *     - Sales Order (internal record)
 *     - Delivery Receipt (signature space)
 *     - Provisional Receipt (clearly NOT BIR receipt)
 * - 🧾 Auto-numbering: QT-2026-0001, SO-2026-0001, etc.
 * - 💰 12% VAT inclusive computation matching BIR Sales Invoice booklet
 *
 * v13.0d EMAIL FIXES:
 * - 🔧 NewOrderModal (admin "+ New Order") now sends order confirmation
 *   to BOTH admin AND customer (was missing!)
 * - 🔧 OrderEditorModal now sends update email when status changes
 * - 🔧 More status transitions now trigger emails (processing, delivered, cancelled)
 * - 🔧 Helper function unifies email sending logic across all places
 *
 * v13.0c NEW FEATURES:
 * - ✏️ Order Editor — full edit modal for any existing order
 *   (customer info, items, charges, status, payment method, supplier cost, notes)
 * - 🗑️ Delete Order — type-to-confirm safety
 * - 📅 Last edited timestamp shown on each order
 *
 * v13.0b NEW FEATURES:
 * - 🏢 Expenses + COGS Tracking (with receipt photo upload)
 * - 📝 Manual Billings (off-system invoices for verbal/special clients)
 * - 📈 Margin Dashboard (P&L, top customers/products, source breakdown)
 * - 💸 Other Charges support (delivery/service fees as line items)
 *
 * v13.0a NEW FEATURES:
 * - 🆕 Internal Order Entry (admin "+ New Order" button for offline orders)
 * - 👥 Customer Database upgraded (tags, internal notes, search, filters)
 * - 💰 Receivables tab (track unpaid credit orders + aging)
 * - 📥 Backup button + weekly reminder
 * - 💼 Margin tracking (optional supplier cost field per order)
 *
 * v11.2 FIXES:
 * - 💊 Rx files now actually upload to Firebase Storage (was missing!)
 * - 👁️ Admin can now VIEW uploaded prescriptions with thumbnail + click-to-enlarge
 *
 * v11.1 FIXES:
 * - 🗺️ Map rendering FIXED — tiles now display correctly (was showing fragmented)
 * - 📎 Payment proof upload FIXED — works for guest checkout (Firebase rules updated)
 *
 * NEW IN V11:
 * - Auto-populate name/email/phone for logged-in customers (editable)
 * - "Order for someone else" toggle with recipient name + phone fields
 * - 🗺️ OpenStreetMap (Leaflet) with DRAGGABLE PIN
 * - 📍 "Use My Location" button + click-to-place pin on map
 * - 🔧 FIXED: Orders now properly link to customer accounts (uid) — portal shows orders
 * - 🔧 FIXED: "Cart is empty" bug after successful checkout — proper success screen shown
 * - 💳 Manual Payment Confirmation system (admin reviews proof, confirms or rejects)
 * - 📧 Email notification when admin confirms or rejects payment
 * - 🔔 Customer portal shows payment status (Awaiting → Submitted → Confirmed/Rejected)
 * - npm install firebase @emailjs/browser
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, orderBy, getDocs, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAV30NWtnxAnj8jIjN4f5Pa6je43oM4rrw",
  authDomain: "dmeast-516cc.firebaseapp.com",
  databaseURL: "https://dmeast-516cc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dmeast-516cc",
  storageBucket: "dmeast-516cc.firebasestorage.app",
  messagingSenderId: "805825630764",
  appId: "1:805825630764:web:9aa00bf55ece3b3f37b789",
  measurementId: "G-904XX7S1HY",
};
const firebaseApp = initializeApp(firebaseConfig);
const auth    = getAuth(firebaseApp);
const db      = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const ADMIN_EMAILS = ["info@dmeastph.com", "admin@dmeastph.com"]; // Legacy - kept for backward compat

// ─── v15 ROLE-BASED ACCESS CONTROL ───────────────────────────────────────────
// Map admin emails to their role. Edit this list to add/remove staff.
const ADMIN_ROLES = {
  // 👑 SUPER ADMINS (Edward - owner) — full access to everything
  "info@dmeastph.com":       "super",
  "admin@dmeastph.com":      "super",
  // 🔧 OPERATIONS ADMIN — sales coordinator / order processor
  // Sees: Overview, Orders, Receivables, Products, Customers, Rx
  // Cannot: see margins/expenses/billings/profits, delete orders
  "ops@dmeastph.com":        "operations",
  // 💼 ACCOUNTING ADMIN — bookkeeper / finance / accountant
  // Sees: Overview, Receivables, Expenses, Billings, Margin, Customers (read-only)
  // Cannot: edit orders or products, manage prescriptions
  "accounting@dmeastph.com": "accounting",
};

// Role definitions and what each can access
const ROLE_PERMISSIONS = {
  super: {
    label: "Super Admin",
    icon: "👑",
    color: "#7C3AED",
    description: "Full access to all features",
    tabs: ["overview","orders","receivables","expenses","billings","margin","products","customers","rx"],
    canEditOrders: true,
    canDeleteOrders: true,
    canEditProducts: true,
    canSeeMargins: true,
    canSeeExpenses: true,
    canManageUsers: true,
  },
  operations: {
    label: "Operations Admin",
    icon: "🔧",
    color: "#0EA5E9",
    description: "Manages orders, customers, products, prescriptions, margin dashboard",
    tabs: ["overview","orders","receivables","margin","products","customers","rx"],
    canEditOrders: true,
    canDeleteOrders: false,        // Operations cannot delete orders
    canEditProducts: true,
    canSeeMargins: true,            // v15.2: now allowed to see margin dashboard
    canSeeExpenses: false,           // but NOT detailed expenses (still hidden)
    canManageUsers: false,
  },
  accounting: {
    label: "Accounting Admin",
    icon: "💼",
    color: "#10B981",
    description: "Manages financial records, expenses, billings",
    tabs: ["overview","receivables","expenses","billings","margin","customers"],
    canEditOrders: false,           // Read-only on orders
    canDeleteOrders: false,
    canEditProducts: false,
    canSeeMargins: true,
    canSeeExpenses: true,
    canManageUsers: false,
  },
};

// v15: Get role for current user (replaces simple admin email check)
const getUserRole = (email) => {
  if (!email) return null;
  const lower = email.toLowerCase();
  return ADMIN_ROLES[lower] || null;
};

const isAdminUser = (email) => getUserRole(email) !== null;

const getPermissions = (email) => {
  const role = getUserRole(email);
  return role ? ROLE_PERMISSIONS[role] : null;
};



import emailjs from "@emailjs/browser";
const EMAILJS_CONFIG = {
  serviceId:           "service_0hvjrv6",
  orderTemplateId:     "template_udt3wjn",  // To: admin (info@dmeastph.com) — order received notification
  templateId:          "template_5r24wue",  // To: {{to_email}} — universal customer notifications
  receiptTemplateId:   "template_adb2so7",  // To: {{to_email}} — customer order receipt
  publicKey:           "gV5OXqbN2PHond86B",
};

// v13.0d: Unified email sender for status updates + general customer notifications
async function sendCustomerStatusEmail({ order, subject, bodyText }) {
  if (!order || !order.email) return { ok: false, reason: "no email on order" };
  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
      from_name: "DM EAST Team",
      company: "DM EAST",
      from_email: CONTACT.email,
      phone: CONTACT.phone1,
      product: subject,
      quantity: "N/A",
      budget: order.total ? formatPHP(order.total) : "N/A",
      timeline: "Update",
      location: order.address || "",
      details: bodyText,
      reply_to: CONTACT.email,
      to_email: order.email,
    }, EMAILJS_CONFIG.publicKey);
    return { ok: true };
  } catch (e) {
    console.warn("Customer email failed:", e);
    return { ok: false, reason: e.message };
  }
}

async function sendAdminNewOrderNotification(order) {
  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.orderTemplateId, {
      customer_name:    order.name || "Customer",
      customer_email:   order.email || "Not provided",
      customer_phone:   order.phone || "Not provided",
      customer_address: order.address || "Not provided",
      order_items:      (order.items||[]).map(i=>`${i.name} x${i.qty} — ${formatPHP(i.price*i.qty)}`).join("\n"),
      order_total:      order.total ? formatPHP(order.total) : "—",
      payment_method:   order.paymentMethod || order.paymentTerms || "—",
    }, EMAILJS_CONFIG.publicKey);
    return { ok: true };
  } catch(e) {
    console.warn("Admin notification email failed:", e);
    return { ok: false, reason: e.message };
  }
}

async function sendCustomerReceiptEmail(order) {
  if (!order || !order.email) return { ok: false, reason: "no email" };
  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.receiptTemplateId, {
      customer_name:    order.name || "Customer",
      customer_email:   order.email,
      customer_phone:   order.phone || "—",
      customer_address: order.address || "—",
      order_items:      (order.items||[]).map(i=>`${i.name} x${i.qty} — ${formatPHP(i.price*i.qty)}`).join("\n"),
      order_total:      order.total ? formatPHP(order.total) : "—",
      payment_method:   order.paymentMethod || order.paymentTerms || "—",
      to_email:         order.email,
    }, EMAILJS_CONFIG.publicKey);
    return { ok: true };
  } catch(e) {
    console.warn("Customer receipt email failed:", e);
    return { ok: false, reason: e.message };
  }
}

const POINTS_PER_PHP = 1 / 200;
const POINT_VALUE    = 0.50;

// ─── v13.0a CONSTANTS ────────────────────────────────────────────────────────
// Business registration info (BIR documents)
const DMEAST_BUSINESS_INFO = {
  legalName: "DECON MEDICAL EQUIPMENT AND SUPPLIES TRADING",
  proprietor: "EDILBERTO B. CONDE",
  vatRegTIN: "417-877-476-00000",
  registeredAddress: "1146 M. Natividad St., Cor. Mayhaligue St., Brgy 316 Zone 032, 1014 Sta. Cruz NCR, City of Manila, First District Philippines",
};

// v13.0a: Order source channels
const ORDER_SOURCES = [
  { id: "website",   label: "Website",    icon: "🌐", color: "#3B82F6" },
  { id: "phone",     label: "Phone",      icon: "📞", color: "#10B981" },
  { id: "messenger", label: "Messenger",  icon: "💬", color: "#0084FF" },
  { id: "whatsapp",  label: "WhatsApp",   icon: "📱", color: "#25D366" },
  { id: "walkin",    label: "Walk-in",    icon: "🚶", color: "#F59E0B" },
  { id: "email",     label: "Email",      icon: "✉️", color: "#6366F1" },
];

// v13.0a: Payment terms
const PAYMENT_TERMS_OPTIONS = [
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

// v13.0a: Customer tags
const CUSTOMER_TAGS = [
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
const AGING_BUCKETS = [
  { label: "Current",    min: -999, max: 0,    color: "#10B981", bg: "#D1FAE5" },
  { label: "1-30 days",  min: 1,    max: 30,   color: "#F59E0B", bg: "#FEF3C7" },
  { label: "31-60 days", min: 31,   max: 60,   color: "#F97316", bg: "#FED7AA" },
  { label: "61-90 days", min: 61,   max: 90,   color: "#EF4444", bg: "#FECACA" },
  { label: "90+ days",   min: 91,   max: 9999, color: "#991B1B", bg: "#FEE2E2" },
];

// v13.0a: Helper to compute days overdue
const daysOverdue = (dueDate) => {
  if (!dueDate) return 0;
  const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
  const now = new Date();
  return Math.floor((now - due) / (1000 * 60 * 60 * 24));
};

// v13.0a: Helper to find aging bucket
const getAgingBucket = (days) => AGING_BUCKETS.find(b => days >= b.min && days <= b.max) || AGING_BUCKETS[0];

// v13.0a: Helper to find tag/source/term by id
const findTag    = (id) => CUSTOMER_TAGS.find(t => t.id === id);
const findSource = (id) => ORDER_SOURCES.find(s => s.id === id) || ORDER_SOURCES[0];
const findTerms  = (id) => PAYMENT_TERMS_OPTIONS.find(t => t.id === id);

// v13.0a: Calculate due date based on payment terms
const calculateDueDate = (orderDate, paymentTermsId) => {
  const term = findTerms(paymentTermsId);
  if (!term || term.creditDays === 0) return null;
  const due = orderDate ? new Date(orderDate.toDate ? orderDate.toDate() : orderDate) : new Date();
  due.setDate(due.getDate() + term.creditDays);
  return due;
};



const ds = {
  color: {
    white:"#FFFFFF", canvas:"#FAFAFA", canvasWarm:"#FFF8F6", canvasGold:"#FFFBF0",
    red:"#CC2F3C", redDark:"#A8252F", redLight:"#FDECEA", redBorder:"#F5C4C7",
    gold:"#D4900F", goldBright:"#F0A81C", goldLight:"#FEF6E0", goldBorder:"#F5D98A",
    pink:"#E8837A", pinkLight:"#FDF0EE",
    textDark:"#1A1410", textBody:"#3D3530", textMuted:"#7A706A", textLight:"#A89E98",
    border:"#E8E0DA", borderLight:"#F0EAE6",
    success:"#1A7F5B", successBg:"#E6F5EF", successBorder:"#A3D9C3",
  },
  font: { display:"'DM Serif Display','Georgia',serif", body:"'DM Sans','Segoe UI',system-ui,sans-serif" },
  radius: { sm:6, md:10, lg:14, xl:20, pill:999 },
  shadow: {
    xs:"0 1px 4px rgba(26,20,16,0.06)", sm:"0 2px 10px rgba(26,20,16,0.08)",
    md:"0 4px 20px rgba(26,20,16,0.10)", lg:"0 8px 40px rgba(26,20,16,0.12)",
    red:"0 4px 18px rgba(204,47,60,0.28)",
  },
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--red:#CC2F3C;--gold:#F0A81C;--canvas:#FAFAFA;--border:#E8E0DA;--text:#1A1410;--font-display:'DM Serif Display','Georgia',serif;--font-body:'DM Sans','Segoe UI',system-ui,sans-serif}
  html{scroll-behavior:smooth}
  body{font-family:var(--font-body);color:var(--text);background:#fff;-webkit-font-smoothing:antialiased}
  button{cursor:pointer;font-family:inherit}a{text-decoration:none;color:inherit}img{display:block;max-width:100%}input,textarea,select{font-family:inherit}
  .dm-desktop-nav{display:flex}.dm-mobile-btn{display:none}
  @media(max-width:900px){.dm-desktop-nav{display:none!important}.dm-mobile-btn{display:flex!important}}
  .dm-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:28px}
  .dm-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .dm-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
  .dm-grid-hero{display:grid;grid-template-columns:1.1fr 0.9fr;gap:64px;align-items:center}
  @media(max-width:1100px){.dm-grid-hero{grid-template-columns:1fr}.dm-grid-4{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:768px){.dm-grid-2{grid-template-columns:1fr}.dm-grid-3{grid-template-columns:1fr}.dm-grid-4{grid-template-columns:1fr}}
  .dm-card-hover{transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}
  .dm-card-hover:hover{transform:translateY(-3px);box-shadow:0 8px 40px rgba(26,20,16,.12);border-color:#F5C4C7!important}
  .dm-nav-link{position:relative;background:none;border:none;font-family:var(--font-body);font-size:14px;font-weight:500;letter-spacing:.01em;padding:6px 0;color:#3D3530;transition:color .18s;cursor:pointer}
  .dm-nav-link::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--red);border-radius:99px;transform:scaleX(0);transition:transform .2s ease}
  .dm-nav-link:hover{color:var(--red)}.dm-nav-link:hover::after,.dm-nav-link.active::after{transform:scaleX(1)}.dm-nav-link.active{color:var(--red)}
  @keyframes dmFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .dm-fade-up{animation:dmFadeUp .5s ease both}.dm-fade-up-1{animation-delay:.08s}.dm-fade-up-2{animation-delay:.16s}.dm-fade-up-3{animation-delay:.24s}.dm-fade-up-4{animation-delay:.32s}
  .dm-dot-bg{background-image:radial-gradient(circle,#E8E0DA 1px,transparent 1px);background-size:24px 24px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes modalIn{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  @media print{nav,footer,.dm-no-print{display:none!important}body{background:#fff!important}#dmeast-order-receipt{box-shadow:none!important;border:1px solid #ccc!important}}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#FAFAFA}::-webkit-scrollbar-thumb{background:#E8E0DA;border-radius:99px}
  .leaflet-container{font-family:var(--font-body);border-radius:10px}
  .leaflet-popup-content{font-size:12px}
`;

const CONTACT = {
  phone1:"+63 951 040 1708", phone1Raw:"+639510401708",
  phone2:"+63 2 8805 2445",  phone2Raw:"+63288052445",
  email:"info@dmeastph.com",
  address:"1146 M. Natividad Cor. Mayhaligue Sts.",
  address2:"Sta. Cruz, Manila, Philippines 1003",
  whatsapp:"https://wa.me/639510401708",
  messenger:"https://m.me/dmeastph",
};

const CATEGORIES = [
  {id:"pharma",     label:"Pharmaceuticals",       color:"#1B5E20",accent:"#388E3C",icon:"💊", institutional:false},
  {id:"beauty",     label:"Beauty & Wellness",     color:"#880E4F",accent:"#D81B60",icon:"✨", institutional:false},
  {id:"monitoring", label:"Diagnostic Devices",    color:"#8B2635",accent:"#CC2F3C",icon:"🩺", institutional:false},
  {id:"obgyne",     label:"OB Gyne & Pediatrics",  color:"#C2185B",accent:"#E91E8C",icon:"👶", institutional:false},
  {id:"laboratory", label:"Laboratory Equipment",  color:"#0F4C81",accent:"#1A7BB4",icon:"🔬", institutional:true},
  {id:"imaging",    label:"Imaging & Radiology",   color:"#5C3317",accent:"#8B5E3C",icon:"🩻", institutional:true},
  {id:"icu",        label:"ICU & Emergency",       color:"#7B1FA2",accent:"#AB47BC",icon:"🚨", institutional:true},
  {id:"specialized",label:"Specialized Systems",   color:"#004D40",accent:"#00897B",icon:"⚙️", institutional:true},
  {id:"vehicles",   label:"Medical Vehicles",      color:"#BF360C",accent:"#F4511E",icon:"🚑", institutional:true},
];

const CLIENT_TYPES = [
  {icon:"🏥",label:"Clinics & Medical Practices", desc:"Private clinics, dental offices, specialty practices, and medical centers across the Philippines."},
  {icon:"💊",label:"Pharmacies & Drugstores",     desc:"Licensed pharmacies, drugstore chains, and pharmaceutical distributors."},
  {icon:"🏢",label:"Businesses & BPOs",           desc:"Companies maintaining workplace health programs, first-aid supplies, and employee wellness."},
  {icon:"🏠",label:"Individuals & Families",      desc:"Home healthcare, personal wellness, and everyday health essentials delivered nationwide."},
  {icon:"🏛️",label:"Institutions & Government",  desc:"Hospitals, LGUs, RHUs, and government health programs. Institutional orders available upon request."},
  {icon:"🌍",label:"International Buyers",        desc:"Distributors, hospitals, and health ministries across Southeast Asia and the Middle East."},
];

const COMPANY_MILESTONES = [
  {year:"2020",title:"Founded",                  desc:"DMEAST established in Sta. Cruz, Manila as a registered medical trading company."},
  {year:"2021",title:"LGU Programs",             desc:"First local government unit partnership for ambulances and mobile clinic vehicles."},
  {year:"2022",title:"Pharmaceutical Expansion", desc:"Expanded pharmaceutical supply line, adding a wider range of branded and generic medicines."},
  {year:"2023",title:"Beauty & Wellness Launch", desc:"Launched the Beauty & Wellness product line, serving aesthetic clinics and practitioners nationwide."},
  {year:"2025",title:"500+ Clients",             desc:"Reached 500+ clients served across clinics, pharmacies, businesses, and institutions nationwide."},
  {year:"2026",title:"Online Store Launch",      desc:"Launched dmeastph.com — making it easier to shop, order, and request quotes online."},
];

const HOW_IT_WORKS = [
  {step:"01",title:"Browse the Shop",  desc:"Explore our catalog of healthcare products with clear prices and categories. Filter by what you need."},
  {step:"02",title:"Add to Cart",      desc:"Add items directly to your cart. Standard products are available for immediate online checkout."},
  {step:"03",title:"Pay Securely",     desc:"Choose your payment method — credit/debit card, GCash, Maya, or bank transfer. Fully secured checkout."},
  {step:"04",title:"Fast Nationwide Delivery", desc:"We deliver to all Philippine regions. International shipping available. Track your order after dispatch."},
];

const INSTITUTIONAL_SERVICES = [
  {title:"Diagnostic Imaging Systems",  body:"Digital X-Ray, CT Scan, MRI, ultrasound, and mammography units for hospitals and diagnostic centers.",icon:"🩻"},
  {title:"Hemodialysis Centers",        body:"Complete dialysis center setup — machines, RO water treatment, consumables, and technical support.",icon:"💧"},
  {title:"ICU & Emergency Equipment",   body:"Ventilators, defibrillators, patient monitors, and full ICU/ER equipment packages.",icon:"🚨"},
  {title:"Laboratory Setup",            body:"Complete lab equipping — analyzers, centrifuges, sterilizers, and cold storage systems.",icon:"🔬"},
  {title:"Medical Vehicles",            body:"Ambulances, ambu-trikes, and mobile clinics for healthcare programs and emergency response.",icon:"🚑"},
  {title:"Bulk & Specialized Supply",   body:"Large-volume pharmaceuticals, vaccines, hyperbaric chambers, and specialized systems upon request.",icon:"⚙️"},
];

const SHIPPING_METHODS = [
  {icon:"✈️",label:"Air Cargo",     desc:"Fast international air freight. 5–10 business days."},
  {icon:"🚢",label:"Sea Cargo",     desc:"Cost-effective sea freight for bulk orders. 15–45 days."},
  {icon:"📦",label:"FedEx / DHL",   desc:"Door-to-door express courier. 3–7 business days."},
  {icon:"🚚",label:"Local Delivery",desc:"Nationwide delivery across all Philippine regions."},
];

const REGIONS_SERVED = [
  {flag:"🇵🇭",region:"Philippines",    detail:"Nationwide — all regions"},
  {flag:"🇸🇬",region:"Singapore",       detail:"Southeast Asia hub"},
  {flag:"🇲🇾",region:"Malaysia",        detail:"Southeast Asia"},
  {flag:"🇮🇩",region:"Indonesia",       detail:"Southeast Asia"},
  {flag:"🇻🇳",region:"Vietnam",         detail:"Southeast Asia"},
  {flag:"🇹🇭",region:"Thailand",        detail:"Southeast Asia"},
  {flag:"🇦🇪",region:"UAE",             detail:"Middle East"},
  {flag:"🇸🇦",region:"Saudi Arabia",    detail:"Middle East"},
  {flag:"🇶🇦",region:"Qatar",           detail:"Middle East"},
  {flag:"🇰🇼",region:"Kuwait",          detail:"Middle East"},
  {flag:"🇵🇬",region:"Papua New Guinea",detail:"Pacific"},
  {flag:"🇹🇱",region:"Timor-Leste",     detail:"Pacific"},
  {flag:"🌐",region:"& More",           detail:"Inquire for your country"},
];

const PAYMENT_METHODS = [
  {icon:"💳",label:"Credit Card"},{icon:"💳",label:"Debit Card"},{icon:"📱",label:"GCash"},
  {icon:"💜",label:"Maya"},{icon:"🏦",label:"Bank Transfer"},{icon:"📲",label:"QR Ph"},
];

const DEFAULT_PRODUCTS = [
  // MONITORING
  {id:"pm-01",category:"monitoring",name:"5-Parameter Patient Monitor",desc:"ECG, SpO₂, NIBP, Temp, RR. 12.1″ touchscreen.",price:null,cta:"sales",imageSrc:"/images/pm-5param.png",featured:true,tag:"Patient Monitoring"},
  {id:"pm-02",category:"monitoring",name:"3-Parameter Bedside Monitor",desc:"ECG, SpO₂, NIBP. For general wards and step-down units.",price:null,cta:"quote",imageSrc:"/images/pm-3param.png",featured:false,tag:"Patient Monitoring"},
  {id:"pm-03",category:"monitoring",name:"Handheld Pulse Oximeter",desc:"Fingertip SpO₂ and pulse rate display. Suitable for home and clinical use.",price:1850,cta:"buy",imageSrc:"/images/pm-oximeter.png",featured:false,tag:"Patient Monitoring"},
  {id:"pm-04",category:"monitoring",name:"Digital Thermometer (Clinical)",desc:"Fast-read digital thermometer. Oral, axillary, rectal use.",price:450,cta:"buy",imageSrc:null,featured:false,tag:"Patient Monitoring"},
  {id:"pm-05",category:"monitoring",name:"NIBP Monitor / Digital BP",desc:"Automatic upper-arm BP monitor. Large display, irregular heartbeat detection.",price:2800,cta:"buy",imageSrc:"/images/pm-nibp.png",featured:false,tag:"Patient Monitoring"},
  {id:"pm-06",category:"monitoring",name:"Central Monitoring Station",desc:"Centralized nursing station for up to 16 bedside monitors. Alarm management.",price:null,cta:"sales",imageSrc:null,featured:false,tag:"Patient Monitoring"},
  // LABORATORY
  {id:"lab-01",category:"laboratory",name:"Hematology Analyzer (5-Diff)",desc:"5-part differential, 60 samples/hr throughput.",price:null,cta:"sales",imageSrc:"/images/lab-hematology.png",featured:true,tag:"Laboratory Equipment"},
  {id:"lab-02",category:"laboratory",name:"Chemistry Analyzer (Semi-Auto)",desc:"200+ test methods. Absorbance and reflectance modes.",price:null,cta:"quote",imageSrc:"/images/lab-chemistry.png",featured:false,tag:"Laboratory Equipment"},
  {id:"lab-03",category:"laboratory",name:"Coagulation Analyzer GA 200",desc:"Automated coagulation — PT, APTT, fibrinogen, D-dimer.",price:null,cta:"quote",imageSrc:"/images/lab-coagulation-ga200.png",featured:false,tag:"Laboratory Equipment"},
  {id:"lab-04",category:"laboratory",name:"Centrifuge (Benchtop)",desc:"High-speed benchtop centrifuge for clinical and research applications.",price:null,cta:"quote",imageSrc:"/images/lab-centrifuge.png",featured:false,tag:"Laboratory Equipment"},
  {id:"lab-05",category:"laboratory",name:"Autoclave & Steam Sterilizer",desc:"Gravity and pre-vacuum cycle sterilizers for instruments and lab materials.",price:null,cta:"quote",imageSrc:"/images/lab-autoclave.png",featured:false,tag:"Laboratory Equipment"},
  {id:"lab-06",category:"laboratory",name:"Bio-Medical Refrigerator",desc:"Precision temperature-controlled for vaccines, reagents, and specimens.",price:null,cta:"quote",imageSrc:"/images/lab-biofridge.png",featured:false,tag:"Laboratory Equipment"},
  // IMAGING
  {id:"img-01",category:"imaging",name:"Digital X-Ray System — OCTAVE Series",desc:"Digital radiography with VIVIX-S flat panel detector.",price:null,cta:"sales",imageSrc:"/images/img-xray-octave.png",featured:true,tag:"Imaging Equipment"},
  {id:"img-02",category:"imaging",name:"Mobile / Portable X-Ray Unit",desc:"Compact mobile X-ray for bedside imaging in ICU, wards, and ER.",price:null,cta:"sales",imageSrc:"/images/img-xray-mobile.png",featured:false,tag:"Imaging Equipment"},
  {id:"img-03",category:"imaging",name:"Portable Color Doppler Ultrasound",desc:"Color Doppler for OB, abdominal, cardiac, and vascular imaging.",price:null,cta:"quote",imageSrc:"/images/img-ultrasound.png",featured:false,tag:"Imaging Equipment"},
  {id:"img-04",category:"imaging",name:"CT Scan System",desc:"Multi-slice CT scanner. 16 to 128-slice configurations. Installation included.",price:null,cta:"sales",imageSrc:"/images/img-ct-scan.png",featured:false,tag:"Imaging Equipment"},
  {id:"img-05",category:"imaging",name:"MRI System",desc:"High-field MRI for neurology, MSK, and full-body diagnostics.",price:null,cta:"sales",imageSrc:"/images/img-mri.png",featured:false,tag:"Imaging Equipment"},
  {id:"img-06",category:"imaging",name:"Mammography System",desc:"Digital mammography for breast cancer screening and LGU programs.",price:null,cta:"sales",imageSrc:null,featured:false,tag:"Imaging Equipment"},
  // ICU
  {id:"icu-01",category:"icu",name:"ICU Ventilator",desc:"Critical care ventilator — VCV, PCV, SIMV, PSV modes. Adult and pediatric.",price:null,cta:"sales",imageSrc:"/images/icu-ventilator.png",featured:true,tag:"ICU & Emergency"},
  {id:"icu-02",category:"icu",name:"Biphasic Defibrillator / AED",desc:"Biphasic defibrillator with AED, 12-lead ECG, SpO₂, NIBP, pacing.",price:null,cta:"quote",imageSrc:"/images/icu-ventilator-2.png",featured:false,tag:"ICU & Emergency"},
  {id:"icu-03",category:"icu",name:"12-Lead ECG Machine",desc:"Clinical 12-lead ECG. Thermal printer, touchscreen, data export.",price:null,cta:"quote",imageSrc:null,featured:false,tag:"ICU & Emergency"},
  // OB GYNE
  {id:"ob-01",category:"obgyne",name:"Neonatal Incubator",desc:"Closed servo-controlled incubator for premature infants.",price:null,cta:"quote",imageSrc:"/images/ob-incubator.png",featured:true,tag:"OB Gyne & Pediatrics"},
  {id:"ob-02",category:"obgyne",name:"Infant Radiant Warmer",desc:"Open-care radiant warmer for newborn stabilization and resuscitation.",price:null,cta:"quote",imageSrc:"/images/ob-warmer.png",featured:false,tag:"OB Gyne & Pediatrics"},
  {id:"ob-03",category:"obgyne",name:"OB Delivery Bed",desc:"Gynecological delivery bed. Adjustable backrest, leg supports.",price:null,cta:"quote",imageSrc:"/images/ob-delivery-bed.png",featured:false,tag:"OB Gyne & Pediatrics"},
  {id:"ob-04",category:"obgyne",name:"Fetal Doppler",desc:"Handheld fetal Doppler for prenatal heart rate monitoring.",price:2850,cta:"buy",imageSrc:"/images/ob-fetal-doppler-edan.png",featured:false,tag:"OB Gyne & Pediatrics"},
  // PHARMA
  {id:"rx-01",category:"pharma",name:"Amoxicillin 500mg",desc:"Broad-spectrum penicillin antibiotic. Box of 100 capsules. ⚠️ Prescription required.",price:850,cta:"buy",imageSrc:null,featured:false,tag:"Pharmaceuticals",requiresPrescription:true,rxCategory:"Antibiotic"},
  {id:"rx-02",category:"pharma",name:"Paracetamol 500mg",desc:"Analgesic and antipyretic. OTC. Box of 100 tablets.",price:320,cta:"buy",imageSrc:null,featured:false,tag:"Pharmaceuticals",requiresPrescription:false,rxCategory:null},
  {id:"rx-03",category:"pharma",name:"Vitamin C 500mg",desc:"High-dose ascorbic acid supplement. OTC. Box of 100 tablets.",price:420,cta:"buy",imageSrc:null,featured:false,tag:"Pharmaceuticals",requiresPrescription:false,rxCategory:null},
  {id:"rx-04",category:"pharma",name:"Mefenamic Acid 500mg",desc:"NSAID analgesic for pain and dysmenorrhea. ⚠️ Prescription required.",price:680,cta:"buy",imageSrc:null,featured:false,tag:"Pharmaceuticals",requiresPrescription:true,rxCategory:"NSAID / Analgesic"},
  {id:"rx-05",category:"pharma",name:"Metformin 500mg",desc:"Oral antidiabetic for Type 2 diabetes. Box of 100 tablets. ⚠️ Prescription required.",price:520,cta:"buy",imageSrc:null,featured:false,tag:"Pharmaceuticals",requiresPrescription:true,rxCategory:"Antidiabetic / Maintenance"},
  {id:"rx-06",category:"pharma",name:"Amlodipine 5mg",desc:"Calcium channel blocker for hypertension. ⚠️ Prescription required.",price:480,cta:"buy",imageSrc:null,featured:false,tag:"Pharmaceuticals",requiresPrescription:true,rxCategory:"Antihypertensive / Maintenance"},
  {id:"rx-07",category:"pharma",name:"Antibiotics — Institutional Bulk Supply",desc:"Bulk antibiotic formulary for hospitals, RHUs, and LGU programs.",price:null,cta:"quote",imageSrc:null,featured:false,tag:"Pharmaceuticals",requiresPrescription:true,rxCategory:"Antibiotic"},
  {id:"rx-08",category:"pharma",name:"Vaccine Supply (Government / Institutional)",desc:"Government-grade vaccines for LGU immunization programs.",price:null,cta:"sales",imageSrc:null,featured:false,tag:"Pharmaceuticals",requiresPrescription:true,rxCategory:"Vaccine / Immunobiological"},
  // SPECIALIZED
  {id:"sp-01",category:"specialized",name:"Hemodialysis Machine",desc:"Single-pass hemodialysis unit. Volumetric ultrafiltration and integrated disinfection.",price:null,cta:"sales",imageSrc:null,featured:true,tag:"Specialized Equipment"},
  {id:"sp-02",category:"specialized",name:"Reverse Osmosis (RO) Water System",desc:"Medical-grade RO water system for dialysis centers.",price:null,cta:"sales",imageSrc:null,featured:false,tag:"Specialized Equipment"},
  {id:"sp-03",category:"specialized",name:"Hyperbaric Chamber (Monoplace)",desc:"Monoplace HBOT chamber for wound care and rehabilitation.",price:null,cta:"sales",imageSrc:null,featured:false,tag:"Specialized Equipment"},
  {id:"sp-04",category:"specialized",name:"Air-to-Water Generator",desc:"Atmospheric water generator for remote healthcare facilities.",price:null,cta:"quote",imageSrc:null,featured:false,tag:"Specialized Equipment"},
  // VEHICLES
  {id:"veh-01",category:"vehicles",name:"Type II Ambulance",desc:"DOH-compliant Type II ambulance van, fully equipped for emergency response.",price:null,cta:"sales",imageSrc:null,featured:true,tag:"Specialized Vehicles"},
  {id:"veh-02",category:"vehicles",name:"Ambu-Trike",desc:"Three-wheel ambulance trike for barangay-level emergency response.",price:null,cta:"sales",imageSrc:null,featured:true,tag:"Specialized Vehicles"},
  {id:"veh-03",category:"vehicles",name:"Mobile Clinic Vehicle",desc:"Fully equipped mobile clinic with examination area and pharmaceutical storage.",price:null,cta:"sales",imageSrc:null,featured:false,tag:"Specialized Vehicles"},
  {id:"veh-04",category:"vehicles",name:"Super Mobile Clinic",desc:"Large-scale mobile clinic for multi-specialty outreach and disaster response.",price:null,cta:"sales",imageSrc:null,featured:false,tag:"Specialized Vehicles"},
  {id:"veh-05",category:"vehicles",name:"Fire-Trike",desc:"Compact fire-response trike for barangay brigades.",price:null,cta:"sales",imageSrc:null,featured:false,tag:"Specialized Vehicles"},
  // BEAUTY
  {id:"bw-01",category:"beauty",name:"Nexcain Numbing Cream (500g)",desc:"Lidocaine 10.56% topical anesthesia. 500g jar. OTC.",price:2160,cta:"buy",imageSrc:"/images/bw-nexcain.png",featured:true,tag:"Beauty & Wellness",requiresPrescription:false,rxCategory:null},
  {id:"bw-02",category:"beauty",name:"P-Cain Numbing Cream (500g)",desc:"Lidocaine 25mg + Prilocaine 25mg. 500g jar. OTC.",price:2400,cta:"buy",imageSrc:"/images/bw-pcain.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:false,rxCategory:null},
  {id:"bw-03",category:"beauty",name:"Scain Numbing Cream (30g tube)",desc:"Lidocaine 10.56% + Hyaluronic Acid 24mg/ml. 30g tube.",price:1080,cta:"buy",imageSrc:"/images/bw-scain-tube.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:false,rxCategory:null},
  {id:"bw-04",category:"beauty",name:"Botulax 100 Units",desc:"Botulinum toxin. 100 units/vial. Licensed practitioners only. ⚠️ Rx required.",price:2880,cta:"buy",imageSrc:"/images/bw-botulax.png",featured:true,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Botulinum Toxin / Aesthetic"},
  {id:"bw-05",category:"beauty",name:"Nabota 100 Units",desc:"Botulinum toxin type A. 100 units/vial. Korean brand. ⚠️ Rx required.",price:2880,cta:"buy",imageSrc:"/images/bw-nabota.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Botulinum Toxin / Aesthetic"},
  {id:"bw-06",category:"beauty",name:"Wondertox 100 Units",desc:"Botulinum toxin type A. 100 units/vial. ⚠️ Rx required.",price:2040,cta:"buy",imageSrc:"/images/bw-wondertox.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Botulinum Toxin / Aesthetic"},
  {id:"bw-07",category:"beauty",name:"Rentox 100 Units",desc:"Botulinum toxin for aesthetic use. 100 units/vial. ⚠️ Rx required.",price:2880,cta:"buy",imageSrc:"/images/bw-rentox.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Botulinum Toxin / Aesthetic"},
  {id:"bw-08",category:"beauty",name:"Neuramis Volume (HA Filler)",desc:"Cross-linked HA 24mg/ml + Lidocaine 3mg/ml. Volume restoration. ⚠️ Rx required.",price:1800,cta:"buy",imageSrc:"/images/bw-neuramis-volume.png",featured:true,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Dermal Filler / Aesthetic"},
  {id:"bw-09",category:"beauty",name:"Neuramis Deep (HA Filler)",desc:"HA 20mg/ml + Lidocaine 3mg/ml. Deep filler for nasolabial folds. ⚠️ Rx required.",price:1800,cta:"buy",imageSrc:"/images/bw-neuramis-deep.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Dermal Filler / Aesthetic"},
  {id:"bw-10",category:"beauty",name:"Neuramis Light (HA Filler)",desc:"Light HA formulation for fine lines and superficial wrinkles. ⚠️ Rx required.",price:1800,cta:"buy",imageSrc:"/images/bw-neuramis-light.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Dermal Filler / Aesthetic"},
  {id:"bw-11",category:"beauty",name:"Misfill Volume (HA Filler)",desc:"HA 24mg/ml + Lidocaine 3mg/ml. Volume filler for facial contouring. ⚠️ Rx required.",price:2040,cta:"buy",imageSrc:"/images/bw-misfill-volume.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Dermal Filler / Aesthetic"},
  {id:"bw-12",category:"beauty",name:"Minerva Threads PDO (19G x 60mm)",desc:"PDO thread lifting. 19G x 60mm. 20 pcs/pack. ⚠️ Licensed practitioners.",price:3240,cta:"buy",imageSrc:"/images/bw-minerva-threads.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Aesthetic / PDO Threads"},
  {id:"bw-13",category:"beauty",name:"Minerva Threads PDO (Mono)",desc:"PDO mono threads 29G x 38mm. 20 pcs/pack. Skin tightening.",price:840,cta:"buy",imageSrc:"/images/bw-minerva-mono.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Aesthetic / PDO Threads"},
  {id:"bw-14",category:"beauty",name:"Lemon Bottle Fat Dissolving",desc:"Mesolipo fat dissolving. 10ml/vial, 5 vials/box. ⚠️ Licensed practitioners.",price:9000,cta:"buy",imageSrc:"/images/bw-lemon-bottle.png",featured:true,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Lipolysis / Aesthetic"},
  {id:"bw-15",category:"beauty",name:"Lipolab Plus (Brown Vials)",desc:"Mesolipo solution. 10ml/vial, 10 vials/box.",price:2760,cta:"buy",imageSrc:"/images/bw-lipolab.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Lipolysis / Aesthetic"},
  {id:"bw-16",category:"beauty",name:"Lipo Advance Body",desc:"Mesolipo contouring + whitening solution. 10ml/vial, 10 vials/box.",price:3720,cta:"buy",imageSrc:"/images/bw-lipo-advance.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Lipolysis / Aesthetic"},
  {id:"bw-17",category:"beauty",name:"Misfill PDRN Skin Booster",desc:"Regeneration and prevention of skin thinning. 2.2ml/syringe, 2 syringes/box.",price:3840,cta:"buy",imageSrc:"/images/bw-misfill-pdrn.png",featured:true,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"PDRN / Skin Booster"},
  {id:"bw-18",category:"beauty",name:"Ireju Aqua Skin Booster",desc:"Non cross-linked HA. 2.5ml/syringe, 10 syringes/box. Deep skin hydration.",price:4920,cta:"buy",imageSrc:"/images/bw-ireju-aqua.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"PDRN / Skin Booster"},
  {id:"bw-19",category:"beauty",name:"Hyaron Pre-Filled Injection",desc:"Sodium hyaluronate 25mg/2.5ml. Pre-filled syringe. 10 syringes/box.",price:3600,cta:"buy",imageSrc:"/images/bw-hyaron.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"PDRN / Skin Booster"},
  {id:"bw-20",category:"beauty",name:"Selastin Exo Plus (Exosome)",desc:"Exosome 1.3 billion/ml. PDRN + Growth Factor. Premium skin rejuvenation.",price:7320,cta:"buy",imageSrc:"/images/bw-selastin-exo.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Exosome / Aesthetic"},
  {id:"bw-21",category:"beauty",name:"Glutanex 1200mg (Korea)",desc:"Reduced glutathione 1,200mg. 10 vials/box. Korean. Whitening + antioxidant.",price:3960,cta:"buy",imageSrc:"/images/bw-glutanex.png",featured:true,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Whitening Injection / Rx"},
  {id:"bw-22",category:"beauty",name:"Salutha 1200mg Glutathione",desc:"Reduced glutathione 1,200mg. 10 vials/box.",price:3000,cta:"buy",imageSrc:"/images/bw-salutha.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Whitening Injection / Rx"},
  {id:"bw-23",category:"beauty",name:"Tatiomax Gold 1.2g",desc:"Reduced glutathione with booster. Premium whitening + skin glow.",price:2880,cta:"buy",imageSrc:"/images/bw-tatiomax.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Whitening Injection / Rx"},
  {id:"bw-24",category:"beauty",name:"Cindella 1.2g (Hidden Tag Seal)",desc:"Glutathione 1,200mg + Ascorbic Acid 10,000mg + Lipoic Acid 25mg. Korea.",price:7200,cta:"buy",imageSrc:"/images/bw-cindella.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Whitening Injection / Rx"},
  {id:"bw-25",category:"beauty",name:"Lustrous Pro (60 Softgels)",desc:"L-Glutathione, HA, Collagen, Polypodium Leucotomos, Vit E, Astaxanthin. Oral sunblock.",price:3600,cta:"buy",imageSrc:"/images/bw-lustrous-pro.png",featured:true,tag:"Beauty & Wellness",requiresPrescription:false,rxCategory:null},
  {id:"bw-26",category:"beauty",name:"Lustrous Glow (60 Softgels)",desc:"L-Glutathione, Sodium Ascorbate, Collagen, Stem Cells, Lycopene, Grape Seed.",price:3600,cta:"buy",imageSrc:"/images/bw-lustrous-glow.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:false,rxCategory:null},
  {id:"bw-27",category:"beauty",name:"Suntella (60 Softgels)",desc:"Oral sunblock + glutathione. Polypodium Leucotomos + Vit E. OTC.",price:2400,cta:"buy",imageSrc:"/images/bw-suntella.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:false,rxCategory:null},
  {id:"bw-28",category:"beauty",name:"Collagen Tripeptide Supplement",desc:"Hydrolyzed marine collagen tripeptide. Joint and skin health. 30 sachets. OTC.",price:1800,cta:"buy",imageSrc:"/images/bw-collagen.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:false,rxCategory:null},
  {id:"bw-29",category:"beauty",name:"Micro-Cannula Set (27G)",desc:"Blunt-tip micro-cannula. 27G x 50mm. 20 pcs/box. Reduces bruising.",price:1560,cta:"buy",imageSrc:"/images/bw-microcannula.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:true,rxCategory:"Aesthetic / Tools"},
  {id:"bw-30",category:"beauty",name:"Meso Needles 30G x 4mm",desc:"Sterile mesotherapy needles. 30G x 4mm. 100 pcs/box.",price:480,cta:"buy",imageSrc:"/images/bw-meso-needles.png",featured:false,tag:"Beauty & Wellness",requiresPrescription:false,rxCategory:null},
];

const formatPHP  = n => `₱${Number(n).toLocaleString("en-PH")}`;
const PHP_TO_USD = 0.0175;
const formatUSD  = n => `≈ $${(Number(n)*PHP_TO_USD).toFixed(2)} USD`;
const formatDate = ts => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"});
};
const orderStatusColor = s => ({
  pending:       {bg:"#FEF9C3",color:"#A16207"},
  confirmed:     {bg:"#DBEAFE",color:"#1E40AF"},
  processing:    {bg:"#EDE9FE",color:"#5B21B6"},
  shipped:       {bg:"#DCFCE7",color:"#166534"},
  delivered:     {bg:"#D1FAE5",color:"#065F46"},
  cancelled:     {bg:"#FEE2E2",color:"#991B1B"},
  out_of_stock:  {bg:"#FFF7ED",color:"#C2410C"},
  international_inquiry:{bg:"#F0FDF4",color:"#15803D"},
}[s]||{bg:"#F3F4F6",color:"#374151"});

const ORDER_STATUS_LABELS = {
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
const PAYMENT_STATUS_LABELS = {
  awaiting:  "Awaiting Payment",
  submitted: "Proof Submitted — Pending Review",
  confirmed: "Payment Confirmed ✓",
  rejected:  "Payment Rejected — Re-upload Needed",
};
const paymentStatusColor = s => ({
  awaiting:  {bg:"#FEF9C3",color:"#A16207"},
  submitted: {bg:"#DBEAFE",color:"#1E40AF"},
  confirmed: {bg:"#D1FAE5",color:"#065F46"},
  rejected:  {bg:"#FEE2E2",color:"#991B1B"},
}[s]||{bg:"#F3F4F6",color:"#374151"});

// ─── PRODUCTS CONTEXT ────────────────────────────────────────────────────────
const ProductsContext = createContext({ products: DEFAULT_PRODUCTS, loading: false, refresh: ()=>{} });
const useProducts = () => useContext(ProductsContext);

function ProductsProvider({ children }){
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [loading,  setLoading]  = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      if (snap.size === 0) {
        setProducts(DEFAULT_PRODUCTS);
      } else {
        const live = snap.docs
          .map(d => ({ ...d.data(), _docId: d.id }))
          .filter(p => p.visible !== false);
        setProducts(live);
      }
    } catch (e) {
      console.warn("Products fetch failed, using defaults:", e);
      setProducts(DEFAULT_PRODUCTS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return (
    <ProductsContext.Provider value={{ products, loading, refresh: fetchProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}

// ─── PRIMITIVE COMPONENTS ────────────────────────────────────────────────────
function Btn({variant="primary",size="md",onClick,children,disabled,fullWidth,href,type="button"}){
  const base={display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:ds.font.body,fontWeight:600,letterSpacing:"0.01em",borderRadius:ds.radius.md,border:"2px solid transparent",transition:"all 0.18s ease",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,width:fullWidth?"100%":"auto",textDecoration:"none"};
  const sizes={sm:{fontSize:13,padding:"8px 18px"},md:{fontSize:14,padding:"11px 24px"},lg:{fontSize:15,padding:"13px 30px"},xl:{fontSize:16,padding:"15px 38px"}};
  const variants={primary:{background:ds.color.red,color:"#fff",borderColor:ds.color.red,boxShadow:ds.shadow.red},secondary:{background:"#fff",color:ds.color.red,borderColor:ds.color.red},outline:{background:"#fff",color:ds.color.textBody,borderColor:ds.color.border},gold:{background:ds.color.goldLight,color:ds.color.gold,borderColor:ds.color.goldBorder},ghost:{background:"rgba(204,47,60,0.07)",color:ds.color.red,borderColor:"transparent"},dark:{background:ds.color.textDark,color:"#fff",borderColor:"transparent"},success:{background:ds.color.successBg,color:ds.color.success,borderColor:ds.color.successBorder}};
  const style={...base,...sizes[size],...variants[variant]};
  if(href) return <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

function CtaBadge({type}){
  const map={buy:{label:"Buy Now",bg:ds.color.successBg,color:ds.color.success,border:ds.color.successBorder},quote:{label:"Request Quote",bg:ds.color.goldLight,color:ds.color.gold,border:ds.color.goldBorder},sales:{label:"Talk to Sales",bg:ds.color.redLight,color:ds.color.red,border:ds.color.redBorder}};
  const t=map[type]||map.quote;
  return <span style={{display:"inline-block",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",padding:"3px 9px",borderRadius:ds.radius.pill,background:t.bg,color:t.color,border:`1px solid ${t.border}`,whiteSpace:"nowrap"}}>{t.label}</span>;
}

function Tag({children,color=ds.color.redLight,textColor=ds.color.red}){
  return <span style={{display:"inline-block",fontSize:12,fontWeight:500,padding:"4px 12px",borderRadius:ds.radius.pill,background:color,color:textColor}}>{children}</span>;
}

function SectionHeader({eyebrow,title,subtitle,center,dark}){
  return(
    <div style={{textAlign:center?"center":"left",marginBottom:48}}>
      {eyebrow&&<div style={{fontSize:11,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:dark?"rgba(255,255,255,0.6)":ds.color.red,marginBottom:10}}>{eyebrow}</div>}
      <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.75rem,3vw,2.3rem)",fontWeight:400,color:dark?"#fff":ds.color.textDark,lineHeight:1.25,marginBottom:subtitle?14:0}}>{title}</h2>
      {subtitle&&<p style={{fontSize:15,color:dark?"rgba(255,255,255,0.65)":ds.color.textMuted,lineHeight:1.75,maxWidth:center?560:"none",margin:center?"0 auto":0}}>{subtitle}</p>}
    </div>
  );
}

function BrandLogo({height=40,darkMode=false}){
  return(
    <div style={{position:"relative"}}>
      <img src="/logo.png" alt="DM EAST" style={{height,width:"auto",objectFit:"contain",filter:darkMode?"brightness(0) invert(1)":"none"}}
        onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}/>
      <div style={{display:"none",alignItems:"center",gap:2}}>
        <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:height*0.55,fontStyle:"italic",color:darkMode?"#fff":ds.color.textDark,textTransform:"uppercase",lineHeight:1}}>DM</span>
        <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:height*0.55,fontStyle:"italic",color:"#F0A81C",textTransform:"uppercase",lineHeight:1,marginLeft:4}}>EAST</span>
      </div>
    </div>
  );
}

function ProductImg({imageSrc,category,name,height=180}){
  const cat=CATEGORIES.find(c=>c.id===category)||{color:"#8B2635",accent:"#CC2F3C"};
  if(imageSrc) return(
    <div style={{height,overflow:"hidden",borderRadius:`${ds.radius.md}px ${ds.radius.md}px 0 0`,background:"#F8F7F5",display:"flex",alignItems:"center",justifyContent:"center",padding:12,boxSizing:"border-box"}}>
      <img src={imageSrc} alt={name} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",borderRadius:ds.radius.sm,filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.10))"}}/>
    </div>
  );
  return(
    <div style={{height,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:`linear-gradient(145deg,${cat.color}18,${cat.color}0A)`,borderRadius:`${ds.radius.md}px ${ds.radius.md}px 0 0`,border:`1px solid ${cat.color}20`,borderBottom:"none",position:"relative",overflow:"hidden"}}>
      <div className="dm-dot-bg" style={{position:"absolute",inset:0,opacity:0.4}}/>
      <div style={{position:"relative",zIndex:1,textAlign:"center"}}>
        <div style={{width:52,height:52,borderRadius:16,background:`${cat.accent}18`,border:`1.5px solid ${cat.accent}30`,margin:"0 auto 10px",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:24,height:24,borderRadius:6,background:`${cat.accent}40`,transform:"rotate(12deg)"}}/>
        </div>
        <div style={{fontSize:11,color:cat.color,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",opacity:0.7}}>Image Coming Soon</div>
      </div>
    </div>
  );
}

function Spinner({size=20,color=ds.color.red}){
  return <div style={{width:size,height:size,border:`2px solid ${color}30`,borderTopColor:color,borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>;
}

function PageHero({eyebrow,title,subtitle}){
  return(
    <div style={{background:`linear-gradient(160deg,${ds.color.canvasWarm} 0%,${ds.color.white} 100%)`,padding:"72px 24px 64px",borderBottom:`1px solid ${ds.color.border}`,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${ds.color.red},${ds.color.goldBright})`}}/>
      <div className="dm-dot-bg" style={{position:"absolute",right:0,top:0,width:"40%",height:"100%",opacity:0.5}}/>
      <div style={{maxWidth:800,margin:"0 auto",textAlign:"center",position:"relative"}}>
        {eyebrow&&<div style={{fontSize:11,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:ds.color.red,marginBottom:12}}>{eyebrow}</div>}
        <h1 style={{fontFamily:ds.font.display,fontSize:"clamp(2rem,4vw,2.8rem)",fontWeight:400,color:ds.color.textDark,lineHeight:1.2,marginBottom:16}}>{title}</h1>
        {subtitle&&<p style={{fontSize:16,color:ds.color.textMuted,lineHeight:1.7,maxWidth:600,margin:"0 auto"}}>{subtitle}</p>}
      </div>
    </div>
  );
}

function Divider(){return <div style={{height:1,background:ds.color.borderLight}}/>;}

function ProductCard({product,addToCart,setPage,wishlist,toggleWishlist}){
  const [feedback,setFeedback]=useState(null);
  const inWishlist=wishlist&&wishlist.includes(product.id);
  const handleBuy=useCallback(()=>{addToCart(product);setFeedback("added");setTimeout(()=>setFeedback(null),2000);},[product,addToCart]);
  return(
    <div className="dm-card-hover" style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,overflow:"hidden",boxShadow:ds.shadow.xs,position:"relative"}}>
      {toggleWishlist&&(
        <button onClick={()=>toggleWishlist(product.id)} title={inWishlist?"Remove from wishlist":"Add to wishlist"}
          style={{position:"absolute",top:10,right:10,zIndex:2,background:"rgba(255,255,255,0.92)",border:`1px solid ${ds.color.border}`,borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer"}}>
          {inWishlist?"❤️":"🤍"}
        </button>
      )}
      <ProductImg imageSrc={product.imageSrc} category={product.category} name={product.name}/>
      <div style={{padding:"18px 20px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
          <h3 style={{fontSize:14,fontWeight:600,color:ds.color.textDark,lineHeight:1.35,flex:1}}>{product.name}</h3>
          <CtaBadge type={product.cta}/>
        </div>
        {product.requiresPrescription&&(
          <div style={{display:"inline-flex",alignItems:"center",gap:5,background:"#FFF3CD",border:"1px solid #FBBF24",borderRadius:ds.radius.pill,padding:"3px 10px",marginBottom:8}}>
            <span style={{fontSize:11}}>💊</span>
            <span style={{fontSize:10,fontWeight:700,color:"#92400E",letterSpacing:"0.05em",textTransform:"uppercase"}}>Rx — Prescription Required</span>
          </div>
        )}
        <p style={{fontSize:12.5,color:ds.color.textMuted,lineHeight:1.6,marginBottom:16}}>{product.desc}</p>
        {product.price&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:19,fontWeight:700,color:ds.color.textDark,lineHeight:1}}>{formatPHP(product.price)}</div>
            <div style={{fontSize:11,color:ds.color.textLight,marginTop:3}}>{formatUSD(product.price)} · indicative rate</div>
          </div>
        )}
        {product.cta==="buy"  &&<Btn variant={feedback==="added"?"success":"primary"} size="sm" fullWidth onClick={handleBuy}>{feedback==="added"?"✓ Added to Cart":"Add to Cart"}</Btn>}
        {product.cta==="quote"&&<Btn variant="gold" size="sm" fullWidth onClick={()=>setPage("quote")}>Request Quote</Btn>}
        {product.cta==="sales"&&<Btn variant="secondary" size="sm" fullWidth onClick={()=>setPage("contact")}>Talk to Sales</Btn>}
      </div>
    </div>
  );
}

function CategoryCard({cat,onClick}){
  const { products: PRODUCTS } = useProducts();
  return(
    <button onClick={onClick} className="dm-card-hover" style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,overflow:"hidden",textAlign:"left",boxShadow:ds.shadow.xs,padding:0,width:"100%"}}>
      <div style={{height:5,background:`linear-gradient(90deg,${cat.color},${cat.accent})`}}/>
      <div style={{padding:"20px 22px 22px"}}>
        <div style={{fontSize:22,marginBottom:8}}>{cat.icon}</div>
        <div style={{fontSize:13.5,fontWeight:600,color:ds.color.textDark,marginBottom:5}}>{cat.label}</div>
        <div style={{fontSize:12,color:ds.color.textMuted}}>{PRODUCTS.filter(p=>p.category===cat.id).length} products available</div>
        <div style={{marginTop:12,fontSize:12,fontWeight:700,color:cat.accent}}>Explore →</div>
      </div>
    </button>
  );
}

// ─── AUTH MODAL ──────────────────────────────────────────────────────────────
function AuthModal({onClose,onSuccess}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [name,setName]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [ok,setOk]=useState("");
  const inp={width:"100%",padding:"11px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,outline:"none",fontFamily:ds.font.body,color:ds.color.textDark,boxSizing:"border-box",background:"#fff",transition:"border-color 0.15s"};

  const handleSubmit=async()=>{
    setError("");setOk("");setLoading(true);
    try{
      if(mode==="login"){
        const cred=await signInWithEmailAndPassword(auth,email,pw);
        onSuccess(cred.user);
      }else if(mode==="signup"){
        if(!name.trim()){setError("Please enter your name.");setLoading(false);return;}
        const cred=await createUserWithEmailAndPassword(auth,email,pw);
        await setDoc(doc(db,"customers",cred.user.uid),{
          name:name.trim(),email:email.toLowerCase(),createdAt:serverTimestamp(),
          totalOrders:0,totalSpent:0,points:0,savedAddress:"",wishlist:[],
        });
        onSuccess(cred.user);
      }else{
        await sendPasswordResetEmail(auth,email);
        setOk("Password reset email sent! Check your inbox.");
      }
    }catch(e){
      const msgs={"auth/user-not-found":"No account found with that email.","auth/wrong-password":"Incorrect password.","auth/email-already-in-use":"Email already registered. Please log in.","auth/weak-password":"Password must be at least 6 characters.","auth/invalid-email":"Please enter a valid email address.","auth/invalid-credential":"Incorrect email or password."};
      setError(msgs[e.code]||"Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(26,20,16,0.55)",padding:20}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"40px 36px",maxWidth:420,width:"100%",boxShadow:ds.shadow.lg,animation:"modalIn .25s ease",position:"relative"}} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"none",border:"none",fontSize:20,color:ds.color.textMuted,cursor:"pointer",lineHeight:1}}>✕</button>
        <div style={{textAlign:"center",marginBottom:28}}>
          <BrandLogo height={36}/>
          <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark,marginTop:16,marginBottom:4}}>
            {mode==="login"?"Welcome back":mode==="signup"?"Create your account":"Reset password"}
          </div>
          <div style={{fontSize:13,color:ds.color.textMuted}}>
            {mode==="login"?"Sign in to your DMEAST account":mode==="signup"?"Join DMEAST to track orders and earn rewards":"We'll send a reset link to your email"}
          </div>
        </div>
        {error&&<div style={{background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,padding:"10px 14px",fontSize:13,color:ds.color.red,marginBottom:16}}>{error}</div>}
        {ok&&<div style={{background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,padding:"10px 14px",fontSize:13,color:ds.color.success,marginBottom:16}}>{ok}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {mode==="signup"&&(
            <div>
              <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6}}>Full Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" style={inp} onFocus={e=>e.target.style.borderColor=ds.color.red} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
            </div>
          )}
          <div>
            <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6}}>Email Address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={inp} onFocus={e=>e.target.style.borderColor=ds.color.red} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
          </div>
          {mode!=="forgot"&&(
            <div>
              <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6}}>Password</label>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder={mode==="signup"?"At least 6 characters":"Your password"} style={inp} onFocus={e=>e.target.style.borderColor=ds.color.red} onBlur={e=>e.target.style.borderColor=ds.color.border} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
            </div>
          )}
        </div>
        {mode==="login"&&<button onClick={()=>{setMode("forgot");setError("");setOk("");}} style={{background:"none",border:"none",fontSize:12.5,color:ds.color.red,cursor:"pointer",marginTop:8,padding:0}}>Forgot password?</button>}
        <div style={{marginTop:22}}>
          <Btn variant="primary" size="lg" fullWidth disabled={loading} onClick={handleSubmit}>
            {loading?<><Spinner size={16} color="#fff"/>&nbsp;{mode==="login"?"Signing in…":mode==="signup"?"Creating account…":"Sending…"}</>:mode==="login"?"Sign In":mode==="signup"?"Create Account":"Send Reset Email"}
          </Btn>
        </div>
        <div style={{textAlign:"center",marginTop:18,fontSize:13,color:ds.color.textMuted}}>
          {mode==="login"&&<><span>Don't have an account? </span><button onClick={()=>{setMode("signup");setError("");setOk("");}} style={{background:"none",border:"none",color:ds.color.red,fontWeight:600,cursor:"pointer",fontSize:13}}>Sign up</button></>}
          {mode==="signup"&&<><span>Already have an account? </span><button onClick={()=>{setMode("login");setError("");setOk("");}} style={{background:"none",border:"none",color:ds.color.red,fontWeight:600,cursor:"pointer",fontSize:13}}>Sign in</button></>}
          {mode==="forgot"&&<button onClick={()=>{setMode("login");setError("");setOk("");}} style={{background:"none",border:"none",color:ds.color.red,fontWeight:600,cursor:"pointer",fontSize:13}}>← Back to sign in</button>}
        </div>
      </div>
    </div>
  );
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function Navbar({activePage,setPage,cartCount,user,isAdmin,onSignIn,onSignOut}){
  const [menuOpen,setMenuOpen]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  const [acctOpen,setAcctOpen]=useState(false);
  const acctRef=useRef(null);

  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>20);
    window.addEventListener("scroll",fn);
    return()=>window.removeEventListener("scroll",fn);
  },[]);
  useEffect(()=>{
    const fn=e=>{if(acctRef.current&&!acctRef.current.contains(e.target))setAcctOpen(false);};
    document.addEventListener("mousedown",fn);
    return()=>document.removeEventListener("mousedown",fn);
  },[]);

  const links=[{id:"home",label:"Home"},{id:"about",label:"About Us"},{id:"products",label:"Shop"},{id:"institutional",label:"Institutional Orders"},{id:"quote",label:"Request Quote"},{id:"track",label:"Track Order"},{id:"contact",label:"Contact"}];
  const nav=id=>{setPage(id);setMenuOpen(false);};

  return(
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,background:scrolled?"rgba(255,255,255,0.97)":"#fff",backdropFilter:"blur(12px)",borderBottom:`1px solid ${scrolled?ds.color.border:ds.color.borderLight}`,boxShadow:scrolled?ds.shadow.sm:"none",transition:"all 0.25s ease"}}>
      <div style={{height:3,background:`linear-gradient(90deg,${ds.color.red},${ds.color.goldBright})`}}/>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",height:64}}>
        <button onClick={()=>nav("home")} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center"}}><BrandLogo height={38}/></button>
        <div className="dm-desktop-nav" style={{alignItems:"center",gap:8}}>
          {links.map(l=><button key={l.id} onClick={()=>nav(l.id)} className={`dm-nav-link ${activePage===l.id?"active":""}`}>{l.label}</button>)}
          <div style={{marginLeft:16,display:"flex",gap:10,alignItems:"center"}}>
            <Btn variant="outline" size="sm" onClick={()=>nav("cart")}>
              🛒 Cart {cartCount>0&&<span style={{background:ds.color.red,color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:11,display:"inline-flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{cartCount}</span>}
            </Btn>
            {user?(
              <div ref={acctRef} style={{position:"relative"}}>
                <button onClick={()=>setAcctOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,padding:"8px 14px",cursor:"pointer",fontFamily:ds.font.body,fontSize:13,fontWeight:600,color:ds.color.red}}>
                  👤 My Account ▾
                </button>
                {acctOpen&&(
                  <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:8,minWidth:180,boxShadow:ds.shadow.md,zIndex:100}}>
                    <button onClick={()=>{nav("portal");setAcctOpen(false);}} style={{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",padding:"10px 14px",fontSize:13,fontWeight:500,color:ds.color.textBody,cursor:"pointer",borderRadius:ds.radius.sm}}>📋 My Portal</button>
                    {isAdmin&&<button onClick={()=>{nav("admin");setAcctOpen(false);}} style={{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",padding:"10px 14px",fontSize:13,fontWeight:500,color:ds.color.gold,cursor:"pointer",borderRadius:ds.radius.sm}}>⚙️ Admin Dashboard</button>}
                    <div style={{height:1,background:ds.color.borderLight,margin:"4px 0"}}/>
                    <button onClick={()=>{onSignOut();setAcctOpen(false);}} style={{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",padding:"10px 14px",fontSize:13,fontWeight:500,color:ds.color.red,cursor:"pointer",borderRadius:ds.radius.sm}}>Sign Out</button>
                  </div>
                )}
              </div>
            ):(
              <Btn variant="outline" size="sm" onClick={onSignIn}>Sign In</Btn>
            )}
            <Btn variant="primary" size="sm" onClick={()=>nav("quote")}>Get a Quote</Btn>
          </div>
        </div>
        <button className="dm-mobile-btn" onClick={()=>setMenuOpen(o=>!o)} style={{background:"none",border:"none",fontSize:22,color:ds.color.textDark,width:40,height:40,alignItems:"center",justifyContent:"center"}}>{menuOpen?"✕":"☰"}</button>
      </div>
      {menuOpen&&(
        <div style={{background:"#fff",borderTop:`1px solid ${ds.color.border}`,padding:"16px 24px 24px"}}>
          {links.map(l=><button key={l.id} onClick={()=>nav(l.id)} style={{display:"block",width:"100%",textAlign:"left",background:activePage===l.id?ds.color.redLight:"none",border:"none",cursor:"pointer",color:activePage===l.id?ds.color.red:ds.color.textBody,fontSize:15,fontWeight:500,padding:"12px 14px",borderRadius:ds.radius.md,marginBottom:2,fontFamily:ds.font.body}}>{l.label}</button>)}
          <div style={{marginTop:12,display:"flex",gap:10,flexWrap:"wrap"}}>
            <Btn variant="outline" size="sm" onClick={()=>nav("cart")} fullWidth>🛒 Cart ({cartCount})</Btn>
            {user?(<>
              <Btn variant="ghost" size="sm" onClick={()=>nav("portal")} fullWidth>📋 My Portal</Btn>
              {isAdmin&&<Btn variant="gold" size="sm" onClick={()=>nav("admin")} fullWidth>⚙️ Admin</Btn>}
              <Btn variant="outline" size="sm" onClick={onSignOut} fullWidth>Sign Out</Btn>
            </>):(
              <Btn variant="outline" size="sm" onClick={()=>{onSignIn();setMenuOpen(false);}} fullWidth>Sign In</Btn>
            )}
            <Btn variant="primary" size="sm" onClick={()=>nav("quote")} fullWidth>Get a Quote</Btn>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── LEAFLET ADDRESS MAP (NEW IN V11) ────────────────────────────────────────
// Interactive OpenStreetMap with draggable pin + reverse geocoding.
// Loads Leaflet from CDN dynamically so we don't add npm deps.
// ─── LEAFLET ADDRESS MAP (v11.1 - FIXED MAP RENDERING) ───────────────────────
// Fixes broken tile rendering by:
// - Forcing explicit width/height on map container
// - Calling invalidateSize() multiple times after init
// - Polling container dimensions before initializing
// - Restructuring toolbar so search doesn't overlap map
function LeafletAddressMap({ initialAddress, onAddressChange, onCoordsChange }){
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(!!window.L);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pinnedCoords, setPinnedCoords] = useState(null);

  const DEFAULT_CENTER = [14.5995, 120.9842];
  const DEFAULT_ZOOM = 13;

  // Load Leaflet script from CDN
  useEffect(() => {
    if (window.L) { setScriptLoaded(true); return; }
    const existing = document.querySelector('script[src*="leaflet.js"]');
    if (existing) {
      existing.addEventListener('load', () => setScriptLoaded(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Map failed to load. Please refresh the page.");
    document.head.appendChild(script);
  }, []);

  // Initialize map after script loads AND container is sized
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || mapInstanceRef.current || !window.L) return;
    const L = window.L;

    const initMap = () => {
      const el = mapRef.current;
      if (!el || el.clientWidth === 0 || el.clientHeight === 0) {
        setTimeout(initMap, 100);
        return;
      }
      const map = L.map(el, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(DEFAULT_CENTER, { draggable: true }).addTo(map);
      marker.bindPopup("📍 Drag me or click the map to set delivery location").openPopup();
      markerRef.current = marker;

      const reverseGeocode = async (lat, lng) => {
        setGeocoding(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
          const data = await res.json();
          if (data && data.display_name && onAddressChange) onAddressChange(data.display_name);
          if (onCoordsChange) onCoordsChange({ lat, lng });
          setPinnedCoords({ lat, lng });
        } catch (e) { console.warn("Reverse geocode failed:", e); }
        setGeocoding(false);
      };

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        reverseGeocode(lat, lng);
      });
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        reverseGeocode(lat, lng);
      });

      mapInstanceRef.current = map;

      // CRITICAL FIX: Call invalidateSize multiple times to force tile recalculation
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
      setTimeout(() => map.invalidateSize(), 600);
    };
    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [scriptLoaded]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported by your browser."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current && markerRef.current && window.L) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
          markerRef.current.bindPopup("📍 Your current location").openPopup();
          mapInstanceRef.current.invalidateSize();
          setGeocoding(true);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
            const data = await res.json();
            if (data && data.display_name && onAddressChange) onAddressChange(data.display_name);
            if (onCoordsChange) onCoordsChange({ lat: latitude, lng: longitude });
            setPinnedCoords({ lat: latitude, lng: longitude });
          } catch(e) {}
          setGeocoding(false);
        }
        setLocating(false);
      },
      (err) => {
        setError("Could not get your location. Please drop a pin manually on the map.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const searchAddress = async () => {
    if (!searchInput.trim()) return;
    setGeocoding(true); setError("");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}&countrycodes=ph&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latNum = parseFloat(lat), lngNum = parseFloat(lon);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latNum, lngNum], 16);
          markerRef.current.setLatLng([latNum, lngNum]);
          mapInstanceRef.current.invalidateSize();
        }
        if (onAddressChange) onAddressChange(display_name);
        if (onCoordsChange) onCoordsChange({ lat: latNum, lng: lngNum });
        setPinnedCoords({ lat: latNum, lng: lngNum });
      } else {
        setError("Address not found. Try a different search or drop a pin manually.");
      }
    } catch(e) { setError("Search failed. Please try again."); }
    setGeocoding(false);
  };

  return (
    <div style={{border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.lg,overflow:"hidden",background:"#fff"}}>
      <div style={{padding:"12px 14px",background:ds.color.canvas,borderBottom:`1px solid ${ds.color.border}`}}>
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          <button type="button" onClick={useMyLocation} disabled={locating||!scriptLoaded}
            style={{padding:"8px 14px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.red}`,background:ds.color.redLight,cursor:locating?"wait":"pointer",fontSize:12.5,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body,display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
            {locating?"⏳ Locating…":"📍 Use My Location"}
          </button>
        </div>
        <div style={{display:"flex",gap:6}}>
          <input type="text" value={searchInput} onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();searchAddress();}}}
            placeholder="🔍 Search address (e.g. SM Manila, BGC Taguig)"
            style={{flex:1,padding:"8px 12px",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.sm,fontSize:13,fontFamily:ds.font.body,outline:"none",background:"#fff",minWidth:0}}/>
          <button type="button" onClick={searchAddress} disabled={geocoding||!scriptLoaded}
            style={{padding:"8px 16px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:ds.color.textBody,whiteSpace:"nowrap"}}>
            Search
          </button>
        </div>
      </div>
      <div style={{position:"relative",width:"100%",height:320,background:ds.color.canvas}}>
        {!scriptLoaded&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,background:ds.color.canvas}}>
            <div style={{textAlign:"center"}}>
              <Spinner size={28}/>
              <div style={{marginTop:10,fontSize:12,color:ds.color.textMuted}}>Loading map…</div>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{position:"absolute",top:0,left:0,right:0,bottom:0,width:"100%",height:"100%"}}/>
        {geocoding&&scriptLoaded&&(
          <div style={{position:"absolute",top:10,right:10,background:"rgba(255,255,255,0.95)",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,padding:"6px 10px",fontSize:11,color:ds.color.textMuted,zIndex:1000,display:"flex",alignItems:"center",gap:6,boxShadow:ds.shadow.sm}}>
            <Spinner size={12}/> Locating address…
          </div>
        )}
      </div>
      <div style={{padding:"10px 14px",fontSize:11.5,color:ds.color.textMuted,background:ds.color.canvas,borderTop:`1px solid ${ds.color.borderLight}`}}>
        💡 <strong>Tip:</strong> Click anywhere on the map or drag the pin to set your exact delivery location.
        {pinnedCoords&&(<div style={{marginTop:6,color:ds.color.success,fontWeight:600}}>✓ Pinned: {pinnedCoords.lat.toFixed(5)}, {pinnedCoords.lng.toFixed(5)}</div>)}
      </div>
      {error&&<div style={{padding:"8px 14px",fontSize:12,color:ds.color.red,background:ds.color.redLight,borderTop:`1px solid ${ds.color.redBorder}`}}>⚠ {error}</div>}
    </div>
  );
}


// ─── PAYMENT PROOF UPLOAD ────────────────────────────────────────────────────
// Updated in v11 to set paymentStatus="submitted" when proof is uploaded
function PaymentProofUpload({ orderId, existingUrl, onUploaded }){
  const [uploading, setUploading] = useState(false);
  const [err,       setErr]       = useState("");
  const [url,       setUrl]       = useState(existingUrl||"");
  const fileRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.size > 10*1024*1024) { setErr("File too large. Max 10MB."); return; }
    setUploading(true); setErr("");
    try {
      const ext = file.name.split(".").pop()||"jpg";
      const path = "payment-proofs/"+orderId+"/proof-"+Date.now()+"."+ext;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      const downloadUrl = await getDownloadURL(ref);
      // V11: Save URL + update paymentStatus to "submitted" so admin sees it for review
      await updateDoc(doc(db,"orders",orderId), {
        paymentProofUrl: downloadUrl,
        paymentProofAt: serverTimestamp(),
        paymentStatus: "submitted",
      });
      setUrl(downloadUrl);
      if (onUploaded) onUploaded(downloadUrl);
    } catch(e){
      setErr("Upload failed: "+e.message);
    }
    setUploading(false);
  };

  if (url) return(
    <div style={{background:ds.color.successBg,border:"1px solid "+ds.color.successBorder,borderRadius:ds.radius.md,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <span style={{fontSize:16}}>✅</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:ds.color.success}}>Payment proof uploaded</div>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:ds.color.success,textDecoration:"underline"}}>View uploaded file →</a>
      </div>
      <button onClick={()=>{setUrl("");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:ds.color.textMuted}}>Upload new</button>
    </div>
  );

  return(
    <div style={{border:"2px dashed "+ds.color.border,borderRadius:ds.radius.lg,padding:"20px",textAlign:"center",background:ds.color.canvas}}>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={e=>handleUpload(e.target.files[0])} style={{display:"none"}}/>
      <div style={{fontSize:28,marginBottom:8}}>📎</div>
      <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark,marginBottom:4}}>Upload Payment Proof</div>
      <div style={{fontSize:12,color:ds.color.textMuted,marginBottom:12}}>GCash screenshot, bank transfer receipt, or payment confirmation</div>
      <button onClick={()=>fileRef.current?.click()} disabled={uploading}
        style={{padding:"10px 24px",borderRadius:ds.radius.md,border:"2px solid "+ds.color.red,background:ds.color.redLight,cursor:uploading?"wait":"pointer",fontSize:13,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body}}>
        {uploading?"⏳ Uploading…":"📤 Choose File"}
      </button>
      <div style={{fontSize:11,color:ds.color.textLight,marginTop:8}}>JPG, PNG, PDF · Max 10MB</div>
      {err&&<div style={{marginTop:8,fontSize:12,color:ds.color.red}}>{err}</div>}
    </div>
  );
}

// ─── CUSTOMER PORTAL ─────────────────────────────────────────────────────────
function CustomerPortal({user,setPage,addToCart,wishlist,toggleWishlist}){
  const { products: PRODUCTS } = useProducts();
  const [tab,setTab]=useState("overview");
  const [profile,setProfile]=useState(null);
  const [orders,setOrders]=useState([]);
  const [rxUps,setRxUps]=useState([]);
  const [loading,setLoading]=useState(true);
  const [address,setAddress]=useState("");
  const [addrSaved,setAddrSaved]=useState(false);

  useEffect(()=>{
    if(!user)return;
    (async()=>{
      try{
        const snap=await getDoc(doc(db,"customers",user.uid));
        if(snap.exists()){setProfile(snap.data());setAddress(snap.data().savedAddress||"");}
        // V11 FIX: Query orders by uid (was already this way but ensuring it's prioritized)
        const oSnap=await getDocs(query(collection(db,"orders"),where("uid","==",user.uid),orderBy("createdAt","desc")));
        setOrders(oSnap.docs.map(d=>({id:d.id,...d.data()})));
        const rSnap=await getDocs(query(collection(db,"rxUploads"),where("uid","==",user.uid),orderBy("createdAt","desc")));
        setRxUps(rSnap.docs.map(d=>({id:d.id,...d.data()})));
      }catch(_){}
      setLoading(false);
    })();
  },[user]);

  const saveAddress=async()=>{
    await updateDoc(doc(db,"customers",user.uid),{savedAddress:address});
    setAddrSaved(true);setTimeout(()=>setAddrSaved(false),2500);
  };
  const handleReorder=order=>{
    order.items?.forEach(item=>{const p=PRODUCTS.find(x=>x.id===item.id);if(p)addToCart(p);});
    setPage("cart");
  };

  const points=profile?.points||0;
  const totalSpent=profile?.totalSpent||0;
  const totalOrders=profile?.totalOrders||0;
  const inp={width:"100%",padding:"11px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,outline:"none",fontFamily:ds.font.body,color:ds.color.textDark,boxSizing:"border-box",background:"#fff",transition:"border-color 0.15s"};

  if(loading) return(
    <div style={{paddingTop:67,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}><Spinner size={36}/><div style={{marginTop:16,color:ds.color.textMuted,fontSize:14}}>Loading your portal…</div></div>
    </div>
  );


  // v13.0c: After order is saved (edited)
  const handleOrderSaved = (updatedOrder) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? {...o, ...updatedOrder} : o));
  };
  
  // v13.0c: After order is deleted
  const handleOrderDeleted = (orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // v13.0a: Mark a credit order as paid
  const markOrderPaid = async (orderId) => {
    try {
      await updateDoc(doc(db,"orders",orderId), {
        paymentStatus: "confirmed",
        paidAt: serverTimestamp(),
        status: "confirmed",
      });
      // Refresh
      setOrders(prev => prev.map(o => o.id===orderId ? {...o, paymentStatus:"confirmed", status:"confirmed"} : o));
    } catch(e) { alert("Failed: "+e.message); }
  };

  // v13.0a: Refresh data (after creating new order/customer)
  const refreshData = async () => {
    // v15.2: Each collection in its own try/catch — partial failures don't kill the whole refresh
    try {
      const oSnap=await getDocs(query(collection(db,"orders"),orderBy("createdAt","desc")));
      setOrders(oSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh orders failed:", e.message); }
    try {
      const cSnap=await getDocs(collection(db,"customers"));
      setCustomers(cSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh customers failed:", e.message); }
    try {
      const eSnap=await getDocs(query(collection(db,"expenses"),orderBy("date","desc")));
      setExpenses(eSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh expenses failed:", e.message); }
    try {
      const bSnap=await getDocs(query(collection(db,"manualBillings"),orderBy("date","desc")));
      setManualBillings(bSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh billings failed:", e.message); }
  };
  const tabs=[{id:"overview",label:"Overview",icon:"📊"},{id:"orders",label:"Orders",icon:"📦"},{id:"wishlist",label:"Wishlist",icon:"❤️"},{id:"address",label:"My Address",icon:"📍"},{id:"rx",label:"Rx History",icon:"💊"},{id:"rewards",label:"Rewards",icon:"⭐"}];

  return(
    <div style={{paddingTop:67,background:ds.color.canvas,minHeight:"100vh"}}>
      <div style={{background:ds.color.textDark,padding:"28px 0"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:ds.color.goldBright,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Customer Portal</div>
            <div style={{fontFamily:ds.font.display,fontSize:22,color:"#fff"}}>Hello, {profile?.name||user.email}! 👋</div>
          </div>
          <div style={{display:"flex",gap:12}}>
            {[{v:totalOrders,l:"Orders"},{v:`${points.toLocaleString()} pts`,l:"Points"},{v:formatPHP(totalSpent),l:"Total Spent"}].map((s,i)=>(
              <div key={i} style={{textAlign:"center",background:"rgba(255,255,255,0.07)",borderRadius:ds.radius.lg,padding:"12px 20px"}}>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.goldBright}}>{s.v}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"28px 28px"}}>
        <div style={{display:"flex",gap:4,marginBottom:28,background:"#fff",padding:6,borderRadius:ds.radius.lg,border:`1px solid ${ds.color.border}`,boxShadow:ds.shadow.xs,overflowX:"auto"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:"0 0 auto",padding:"10px 18px",borderRadius:ds.radius.md,border:"none",cursor:"pointer",fontFamily:ds.font.body,fontSize:13.5,fontWeight:600,background:tab===t.id?ds.color.red:"transparent",color:tab===t.id?"#fff":ds.color.textMuted,transition:"all 0.15s",whiteSpace:"nowrap"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab==="overview"&&(
          <div>
            <div className="dm-grid-4" style={{marginBottom:32}}>
              {[{icon:"📦",label:"Total Orders",value:totalOrders,color:ds.color.red},{icon:"⭐",label:"Reward Points",value:`${points.toLocaleString()} pts`,color:ds.color.gold},{icon:"💰",label:"Total Spent",value:formatPHP(totalSpent),color:ds.color.success},{icon:"💎",label:"Points Value",value:formatPHP(points*POINT_VALUE),color:"#7C3AED"}].map((s,i)=>(
                <div key={i} style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs,borderTop:`3px solid ${s.color}`}}>
                  <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontSize:20,fontWeight:700,color:ds.color.textDark,fontFamily:ds.font.display}}>{s.value}</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:18}}>Recent Orders</div>
              {orders.length===0?(
                <div style={{textAlign:"center",padding:"32px 0",color:ds.color.textMuted,fontSize:14}}>No orders yet. <button onClick={()=>setPage("products")} style={{background:"none",border:"none",color:ds.color.red,cursor:"pointer",fontWeight:600,fontFamily:ds.font.body,fontSize:14}}>Browse products →</button></div>
              ):orders.slice(0,5).map(o=>{
                const sc=orderStatusColor(o.status||"pending");
                return(
                  <div key={o.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:`1px solid ${ds.color.borderLight}`,flexWrap:"wrap",gap:10}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark}}>Order #{o.id.slice(-6).toUpperCase()}</div>
                      <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{formatDate(o.createdAt)} · {o.items?.length||0} item(s)</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:15,fontWeight:700}}>{formatPHP(o.total||0)}</span>
                      <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:ds.radius.pill,background:sc.bg,color:sc.color}}>{ORDER_STATUS_LABELS[o.status]||"Pending"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="orders"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:20}}>Order History</div>
            {orders.length===0?(
              <div style={{textAlign:"center",padding:"48px 0",color:ds.color.textMuted}}>
                <div style={{fontSize:36,marginBottom:12}}>📦</div>
                <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>No orders yet</div>
                <div style={{fontSize:13,marginBottom:20}}>Your orders will appear here after you place them.</div>
                <Btn variant="primary" size="md" onClick={()=>setPage("products")}>Shop Now</Btn>
              </div>
            ):orders.map(o=>{
              const sc=orderStatusColor(o.status||"pending");
              const isOOS = o.status==="out_of_stock";
              const statusLabel = ORDER_STATUS_LABELS[o.status]||o.status||"Pending";
              const payStatus = o.paymentStatus||"awaiting";
              const psc = paymentStatusColor(payStatus);
              return(
                <div key={o.id} style={{border:`1px solid ${isOOS?"#C2410C":ds.color.border}`,borderRadius:ds.radius.lg,marginBottom:16,overflow:"hidden"}}>
                  <div style={{background:isOOS?"#FFF7ED":ds.color.canvas,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark}}>Order #{o.id.slice(-6).toUpperCase()}</div>
                      <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{formatDate(o.createdAt)} · {o.items?.length||0} item(s)</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:16,fontWeight:700,color:ds.color.textDark}}>{formatPHP(o.total||0)}</span>
                      <span style={{fontSize:11,fontWeight:700,padding:"5px 12px",borderRadius:ds.radius.pill,background:sc.bg,color:sc.color}}>{statusLabel}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:"5px 10px",borderRadius:ds.radius.pill,background:psc.bg,color:psc.color}}>💳 {PAYMENT_STATUS_LABELS[payStatus]}</span>
                      <Btn variant="ghost" size="sm" onClick={()=>handleReorder(o)}>🔄 Reorder</Btn>
                    </div>
                  </div>
                  {isOOS&&(
                    <div style={{background:"#FEF2F2",padding:"10px 20px",fontSize:13,color:"#C2410C",borderBottom:`1px solid #FED7AA`}}>
                      ⚠️ <strong>Item(s) in this order are currently unavailable.</strong> Our team will contact you to discuss alternatives or arrange a refund. Check your email or call us at <strong>{CONTACT.phone1}</strong>.
                    </div>
                  )}
                  {payStatus==="rejected"&&(
                    <div style={{background:ds.color.redLight,padding:"10px 20px",fontSize:13,color:ds.color.red,borderBottom:`1px solid ${ds.color.redBorder}`}}>
                      ❌ <strong>Payment was rejected.</strong> Please re-upload a clearer payment proof. {o.paymentRejectReason&&<><br/>Reason: {o.paymentRejectReason}</>}
                    </div>
                  )}
                  {payStatus==="confirmed"&&(
                    <div style={{background:ds.color.successBg,padding:"10px 20px",fontSize:13,color:ds.color.success,borderBottom:`1px solid ${ds.color.successBorder}`}}>
                      ✅ <strong>Payment confirmed!</strong> Your order is now being processed.
                    </div>
                  )}
                  {!isOOS&&o.status!=="cancelled"&&(
                    <div style={{padding:"14px 20px",borderBottom:`1px solid ${ds.color.borderLight}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:0}}>
                        {["pending","confirmed","processing","shipped","delivered"].map((s,i)=>{
                          const statOrder=["pending","confirmed","processing","shipped","delivered"];
                          const curIdx=statOrder.indexOf(o.status||"pending");
                          const done=i<=curIdx; const active=i===curIdx;
                          return(
                            <div key={s} style={{display:"flex",alignItems:"center",flex:i<4?1:0}}>
                              <div style={{textAlign:"center"}}>
                                <div style={{width:24,height:24,borderRadius:"50%",background:done?ds.color.success:ds.color.borderLight,border:`2px solid ${done?ds.color.success:ds.color.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:done?"#fff":ds.color.textMuted,margin:"0 auto 4px",fontWeight:700}}>{done&&!active?"✓":i+1}</div>
                                <div style={{fontSize:9,color:active?ds.color.success:ds.color.textMuted,fontWeight:active?700:400,whiteSpace:"nowrap",textTransform:"capitalize"}}>{s}</div>
                              </div>
                              {i<4&&<div style={{flex:1,height:2,background:i<curIdx?ds.color.success:ds.color.borderLight,margin:"0 4px 14px"}}/>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div style={{padding:"14px 20px"}}>
                    {o.items?.map((item,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody,padding:"4px 0",borderBottom:i<(o.items.length-1)?`1px solid ${ds.color.borderLight}`:"none"}}>
                        <span>{item.name} × {item.qty}</span>
                        <span style={{fontWeight:600}}>{formatPHP(item.price*item.qty)}</span>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:8,borderTop:`1px solid ${ds.color.border}`,fontWeight:700,fontSize:14}}>
                      <span>Total</span><span>{formatPHP(o.total||0)}</span>
                    </div>
                    {o.recipientName&&<div style={{marginTop:8,fontSize:12,color:ds.color.gold,background:ds.color.goldLight,padding:"6px 10px",borderRadius:ds.radius.sm,display:"inline-block"}}>📦 For: {o.recipientName} ({o.recipientPhone})</div>}
                    {o.address&&<div style={{marginTop:8,fontSize:12,color:ds.color.textMuted}}>📍 {o.address}</div>}
                    {o.paymentMethod&&<div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>💳 {o.paymentMethod}</div>}
                    {/* Show payment proof upload only when needed */}
                    {(payStatus==="awaiting"||payStatus==="rejected")&&o.status!=="delivered"&&o.status!=="cancelled"&&(
                      <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid "+ds.color.borderLight}}>
                        <PaymentProofUpload orderId={o.id} existingUrl={null}/>
                      </div>
                    )}
                    {payStatus==="submitted"&&(
                      <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid "+ds.color.borderLight,fontSize:13,color:"#1E40AF"}}>
                        ⏳ Your payment proof has been submitted. We'll review it within 24 hours.
                        {o.paymentProofUrl&&<> · <a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{color:"#1E40AF",textDecoration:"underline"}}>View proof</a></>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==="wishlist"&&(
          <div>
            <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:20}}>My Wishlist</div>
            {(!wishlist||wishlist.length===0)?(
              <div style={{textAlign:"center",padding:"60px 0",color:ds.color.textMuted}}>
                <div style={{fontSize:32,marginBottom:12}}>🤍</div>
                <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>Your wishlist is empty</div>
                <div style={{fontSize:13,marginBottom:20}}>Tap the heart icon on any product to save it here.</div>
                <Btn variant="primary" size="md" onClick={()=>setPage("products")}>Browse Products</Btn>
              </div>
            ):(
              <div className="dm-grid-4">
                {PRODUCTS.filter(p=>wishlist.includes(p.id)).map(p=>(
                  <ProductCard key={p.id} product={p} addToCart={addToCart} setPage={setPage} wishlist={wishlist} toggleWishlist={toggleWishlist}/>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==="address"&&(
          <div style={{maxWidth:560}}>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"28px 32px",boxShadow:ds.shadow.xs}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:6}}>Saved Delivery Address</div>
              <div style={{fontSize:13,color:ds.color.textMuted,marginBottom:22}}>This address will pre-fill your checkout form.</div>
              <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:8}}>Full Delivery Address</label>
              <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={4} placeholder="Unit/House No., Street, Barangay, City, Province, ZIP" style={{...inp,resize:"vertical",lineHeight:1.65}} onFocus={e=>e.target.style.borderColor=ds.color.red} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
              <div style={{marginTop:16}}>
                <Btn variant={addrSaved?"success":"primary"} size="md" onClick={saveAddress}>{addrSaved?"✓ Address Saved!":"Save Address"}</Btn>
              </div>
            </div>
          </div>
        )}

        {tab==="rx"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:20}}>Prescription Upload History</div>
            {rxUps.length===0?<div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted,fontSize:14}}>No prescription uploads yet.</div>:rxUps.map(r=>(
              <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:`1px solid ${ds.color.borderLight}`,flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark}}>Order #{r.orderId?.slice(-6).toUpperCase()||"—"}</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{formatDate(r.createdAt)} · {r.fileName||"Prescription"}</div>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:ds.radius.pill,background:r.status==="verified"?ds.color.successBg:r.status==="rejected"?ds.color.redLight:"#FEF9C3",color:r.status==="verified"?ds.color.success:r.status==="rejected"?ds.color.red:"#A16207",textTransform:"capitalize"}}>{r.status||"pending"}</span>
              </div>
            ))}
          </div>
        )}

        {tab==="rewards"&&(
          <div>
            <div className="dm-grid-2" style={{marginBottom:24}}>
              <div style={{background:`linear-gradient(135deg,${ds.color.textDark},#3D3530)`,borderRadius:ds.radius.xl,padding:"28px 32px",color:"#fff"}}>
                <div style={{fontSize:11,fontWeight:700,color:ds.color.goldBright,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>Your Points Balance</div>
                <div style={{fontFamily:ds.font.display,fontSize:48,color:ds.color.goldBright,lineHeight:1}}>{points.toLocaleString()}</div>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:6}}>DMEAST Reward Points</div>
                <div style={{marginTop:20,background:"rgba(255,255,255,0.08)",borderRadius:ds.radius.md,padding:"14px 18px"}}>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.7)"}}>Cash equivalent</div>
                  <div style={{fontSize:20,fontWeight:700,color:"#fff",marginTop:4}}>{formatPHP(points*POINT_VALUE)}</div>
                </div>
              </div>
              <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.xl,padding:"28px 32px",boxShadow:ds.shadow.xs}}>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:18}}>How to Earn</div>
                {[{icon:"🛒",label:"Place an order",desc:`Earn 1 point for every ₱200 spent`},{icon:"💊",label:"Rx products",desc:"Points earned on all purchases including Rx items"},{icon:"💰",label:"Redeem points",desc:`₱${POINT_VALUE} value per point — ask us at checkout`}].map((e,i)=>(
                  <div key={i} style={{display:"flex",gap:14,marginBottom:16}}>
                    <div style={{width:36,height:36,borderRadius:ds.radius.md,background:ds.color.goldLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{e.icon}</div>
                    <div><div style={{fontSize:13.5,fontWeight:600,color:ds.color.textDark}}>{e.label}</div><div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:2}}>{e.desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:18}}>Points History</div>
              {orders.length===0?<div style={{textAlign:"center",padding:"24px 0",color:ds.color.textMuted,fontSize:14}}>No points earned yet. Place your first order!</div>:orders.map(o=>(
                <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${ds.color.borderLight}`}}>
                  <div>
                    <div style={{fontSize:13.5,fontWeight:600,color:ds.color.textDark}}>Order #{o.id.slice(-6).toUpperCase()}</div>
                    <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{formatDate(o.createdAt)} · {formatPHP(o.total||0)}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:15,fontWeight:700,color:ds.color.gold}}>+{Math.floor((o.total||0)*POINTS_PER_PHP)} pts</div>
                    <div style={{fontSize:11,color:ds.color.textLight,marginTop:2}}>earned</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PRODUCT EDIT MODAL (Admin) ──────────────────────────────────────────────
function ProductEditModal({ product, onSave, onClose }){
  const [form, setForm] = useState({
    id: product.id||"", name: product.name||"", desc: product.desc||"",
    price: product.price ?? "", cta: product.cta||"buy",
    category: product.category||"pharma", imageSrc: product.imageSrc||"",
    featured: !!product.featured, requiresPrescription: !!product.requiresPrescription,
    rxCategory: product.rxCategory||"", tag: product.tag||"",
    visible: product.visible!==false,
    available: product.available||"available",
    _docId: product._docId,
  });
  const [imageMode, setImageMode] = useState("url");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const isNew = product._new;

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true); setUploadErr("");
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `products/${form.id||"new-"+Date.now()}-${Date.now()}.${ext}`;
      const ref = storageRef(storage, filename);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      set("imageSrc")(url);
    } catch (e) {
      setUploadErr("Upload failed: " + e.message);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert("Name is required."); return; }
    if (!form.id.trim() && isNew) { alert("Product ID is required (e.g. 'pm-07' or 'custom-001')."); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inp = { width:"100%", padding:"10px 12px", border:`1.5px solid ${ds.color.border}`, borderRadius:ds.radius.md, fontSize:14, outline:"none", fontFamily:ds.font.body, color:ds.color.textDark, boxSizing:"border-box", background:"#fff" };
  const lbl = { fontSize:12, fontWeight:600, color:ds.color.textDark, display:"block", marginBottom:5 };

  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(26,20,16,0.55)",padding:20,overflowY:"auto"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",maxWidth:640,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:ds.shadow.lg,animation:"modalIn .25s ease"}} onClick={e=>e.stopPropagation()}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark}}>{isNew?"Add New Product":"Edit Product"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:ds.color.textMuted,cursor:"pointer",lineHeight:1}}>✕</button>
        </div>

        <div style={{marginBottom:14}}>
          <label style={lbl}>Product ID *</label>
          <input value={form.id} onChange={e=>set("id")(e.target.value)} disabled={!isNew} placeholder="e.g. pm-07, custom-001" style={{...inp,...(isNew?{}:{background:ds.color.canvas,color:ds.color.textMuted})}}/>
          <div style={{fontSize:11,color:ds.color.textLight,marginTop:3}}>Lowercase, no spaces. {isNew?"Cannot be changed after creation.":"Cannot be edited."}</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
          <div>
            <label style={lbl}>Product Name *</label>
            <input value={form.name} onChange={e=>set("name")(e.target.value)} placeholder="e.g. Paracetamol 500mg" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Category *</label>
            <select value={form.category} onChange={e=>set("category")(e.target.value)} style={{...inp,cursor:"pointer"}}>
              {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={lbl}>Description</label>
          <textarea value={form.desc} onChange={e=>set("desc")(e.target.value)} rows={3} placeholder="Short product description shown on the card" style={{...inp,resize:"vertical",lineHeight:1.55}}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div>
            <label style={lbl}>Price (PHP)</label>
            <input type="number" value={form.price} onChange={e=>set("price")(e.target.value)} placeholder="Leave blank for Quote/Sales" style={inp}/>
            <div style={{fontSize:11,color:ds.color.textLight,marginTop:3}}>Leave empty for non-priced items.</div>
          </div>
          <div>
            <label style={lbl}>CTA Button *</label>
            <select value={form.cta} onChange={e=>set("cta")(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="buy">Buy Now (add to cart)</option>
              <option value="quote">Request Quote</option>
              <option value="sales">Talk to Sales</option>
            </select>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={lbl}>Product Image</label>
          <div style={{display:"flex",gap:0,marginBottom:10,background:ds.color.canvas,borderRadius:ds.radius.md,padding:3,border:`1px solid ${ds.color.border}`}}>
            <button type="button" onClick={()=>setImageMode("url")} style={{flex:1,padding:"7px",background:imageMode==="url"?"#fff":"transparent",border:"none",borderRadius:ds.radius.sm,fontSize:12.5,fontWeight:600,color:imageMode==="url"?ds.color.red:ds.color.textMuted,cursor:"pointer",fontFamily:ds.font.body}}>🔗 Paste URL</button>
            <button type="button" onClick={()=>setImageMode("upload")} style={{flex:1,padding:"7px",background:imageMode==="upload"?"#fff":"transparent",border:"none",borderRadius:ds.radius.sm,fontSize:12.5,fontWeight:600,color:imageMode==="upload"?ds.color.red:ds.color.textMuted,cursor:"pointer",fontFamily:ds.font.body}}>📤 Upload File</button>
          </div>
          {imageMode==="url" && (
            <input value={form.imageSrc||""} onChange={e=>set("imageSrc")(e.target.value)} placeholder="https://example.com/image.png or /images/myproduct.png" style={inp}/>
          )}
          {imageMode==="upload" && (
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={e=>handleFileUpload(e.target.files[0])} style={{display:"none"}}/>
              <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={uploading} style={{width:"100%",padding:"24px",border:`2px dashed ${ds.color.border}`,borderRadius:ds.radius.lg,background:ds.color.canvas,cursor:uploading?"wait":"pointer",fontFamily:ds.font.body}}>
                <div style={{fontSize:24,marginBottom:6}}>{uploading?"⏳":"📤"}</div>
                <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark}}>{uploading?"Uploading…":"Click to choose image"}</div>
                <div style={{fontSize:11,color:ds.color.textLight,marginTop:4}}>JPG, PNG, WebP · Max ~5MB</div>
              </button>
              {uploadErr && <div style={{marginTop:8,padding:"8px 12px",background:ds.color.redLight,borderRadius:ds.radius.sm,fontSize:12,color:ds.color.red}}>{uploadErr}</div>}
            </div>
          )}
          {form.imageSrc && (
            <div style={{marginTop:10,padding:"10px 12px",background:ds.color.canvas,borderRadius:ds.radius.md,display:"flex",alignItems:"center",gap:10}}>
              <img src={form.imageSrc} alt="" style={{width:48,height:48,objectFit:"contain",borderRadius:4,background:"#fff",flexShrink:0}}/>
              <div style={{flex:1,minWidth:0,fontSize:11,color:ds.color.textMuted,wordBreak:"break-all"}}>{form.imageSrc}</div>
              <button type="button" onClick={()=>set("imageSrc")("")} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textMuted}}>✕</button>
            </div>
          )}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div>
            <label style={lbl}>Availability</label>
            <select value={form.available} onChange={e=>set("available")(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="available">✓ Available</option>
              <option value="on_request">⚠ On Request</option>
              <option value="out_of_stock">✗ Out of Stock</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Visibility on Site</label>
            <select value={form.visible?"true":"false"} onChange={e=>set("visible")(e.target.value==="true")} style={{...inp,cursor:"pointer"}}>
              <option value="true">👁️ Visible</option>
              <option value="false">🙈 Hidden</option>
            </select>
          </div>
        </div>

        <div style={{background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,padding:"12px 16px",marginBottom:18,display:"flex",gap:24,flexWrap:"wrap"}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:ds.color.textBody}}>
            <input type="checkbox" checked={form.featured} onChange={e=>set("featured")(e.target.checked)} style={{width:16,height:16,accentColor:ds.color.red,cursor:"pointer"}}/>
            ⭐ Featured (show on homepage)
          </label>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:ds.color.textBody}}>
            <input type="checkbox" checked={form.requiresPrescription} onChange={e=>set("requiresPrescription")(e.target.checked)} style={{width:16,height:16,accentColor:ds.color.red,cursor:"pointer"}}/>
            💊 Requires Prescription (Rx)
          </label>
        </div>

        {form.requiresPrescription && (
          <div style={{marginBottom:18}}>
            <label style={lbl}>Rx Category (optional)</label>
            <input value={form.rxCategory||""} onChange={e=>set("rxCategory")(e.target.value)} placeholder="e.g. Antibiotic, Antihypertensive" style={inp}/>
          </div>
        )}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:16,borderTop:`1px solid ${ds.color.borderLight}`}}>
          <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" size="md" onClick={handleSave} disabled={saving||uploading}>
            {saving?"Saving…":(isNew?"Add Product":"Save Changes")}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────


// ─── v15 PDF DOCUMENT GENERATION ─────────────────────────────────────────────
// Loads jsPDF from CDN and generates DMEAST-branded business documents.
// IMPORTANT: These are NOT BIR Official Receipts. A clear disclaimer is on each.

// Logo: when you have a logo file, replace the URL or set as base64 data URI
// To use base64: const DMEAST_LOGO_DATA = "data:image/png;base64,..."
// To use URL: const DMEAST_LOGO_URL = "https://dmeastph.com/logo.png"
const DMEAST_LOGO_URL = null; // Set to URL string when ready, or null for text logo

// Document number prefixes
const DOC_PREFIXES = {
  quotation:    "QT",
  salesOrder:   "SO",
  deliveryReceipt: "DR",
  provisionalReceipt: "PR",
};

const DOC_TITLES = {
  quotation:    "QUOTATION",
  salesOrder:   "SALES ORDER",
  deliveryReceipt: "DELIVERY RECEIPT",
  provisionalReceipt: "PROVISIONAL RECEIPT",
};

// v15: Get next document number from Firestore counter
async function getNextDocumentNumber(docType) {
  const year = new Date().getFullYear();
  const counterId = `${docType}_${year}`;
  const counterRef = doc(db, "docCounters", counterId);
  try {
    const snap = await getDoc(counterRef);
    let next = 1;
    if (snap.exists()) {
      next = (snap.data().count || 0) + 1;
    }
    await setDoc(counterRef, { count: next, lastUsed: serverTimestamp() }, { merge: true });
    const prefix = DOC_PREFIXES[docType] || "DOC";
    return `${prefix}-${year}-${String(next).padStart(4,"0")}`;
  } catch(e) {
    console.warn("Doc counter failed, using timestamp:", e);
    return `${DOC_PREFIXES[docType]||"DOC"}-${year}-${Date.now().toString().slice(-4)}`;
  }
}

// v15: Load jsPDF from CDN
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const existing = document.querySelector('script[src*="jspdf"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.jspdf.jsPDF));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js";
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = () => reject(new Error("Failed to load PDF library"));
    document.head.appendChild(script);
  });
}

// v15: Calculate VAT inclusive breakdown (matches BIR Sales Invoice booklet)
// Total Sales = Customer pays this (already VAT inclusive)
// Net of VAT = Total / 1.12
// VAT = Total - Net of VAT
function computeVATBreakdown(totalInclusiveOfVAT) {
  const total = Number(totalInclusiveOfVAT) || 0;
  const netOfVAT = total / 1.12;
  const vat = total - netOfVAT;
  return {
    total,
    netOfVAT: Math.round(netOfVAT * 100) / 100,
    vat: Math.round(vat * 100) / 100,
  };
}

// v15: Main PDF generator - creates all 4 document types
async function generateDocumentPDF({ order, docType, docNumber, validityDays = 30 }) {
  const jsPDF = await loadJsPDF();
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  
  // Colors (match DMEAST branding)
  const colors = {
    red:    [204, 47, 60],     // ds.color.red
    dark:   [26, 20, 16],      // ds.color.textDark
    muted:  [115, 115, 115],   // textMuted
    light:  [210, 210, 210],   // border
    canvas: [248, 246, 243],   // canvas bg
    gold:   [240, 168, 28],    // gold
  };
  
  const setColor = (rgb) => pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFill  = (rgb) => pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setDraw  = (rgb) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);

  let y = margin;
  
  // ── HEADER ─────────────────────────────────────────────────
  // Logo area (left)
  if (DMEAST_LOGO_URL) {
    try {
      // pdf.addImage works if img is loaded — this requires a URL load
      // For now, fall through to text if URL fails
      pdf.addImage(DMEAST_LOGO_URL, "PNG", margin, y, 100, 50);
    } catch(e) {
      // fallback to text
      setColor(colors.red);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(24);
      pdf.text("DM EAST", margin, y + 22);
    }
  } else {
    setColor(colors.red);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.text("DM EAST", margin, y + 22);
  }
  
  // Document title (right side)
  setColor(colors.dark);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(DOC_TITLES[docType], pageWidth - margin, y + 14, { align: "right" });
  
  // Doc number (right, below title)
  setColor(colors.red);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`No. ${docNumber}`, pageWidth - margin, y + 32, { align: "right" });
  
  y += 56;
  
  // Company info (full width line below logo)
  setColor(colors.dark);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(DMEAST_BUSINESS_INFO.legalName, margin, y);
  y += 12;
  
  setColor(colors.muted);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  const addrLines = pdf.splitTextToSize(DMEAST_BUSINESS_INFO.registeredAddress, contentWidth);
  addrLines.forEach(line => { pdf.text(line, margin, y); y += 10; });
  
  pdf.text(`${DMEAST_BUSINESS_INFO.proprietor} - Prop.`, margin, y); y += 10;
  pdf.text(`VAT Reg. TIN: ${DMEAST_BUSINESS_INFO.vatRegTIN}`, margin, y); y += 10;
  
  // Horizontal line
  setDraw(colors.light);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y + 6, pageWidth - margin, y + 6);
  y += 18;
  
  // ── BILL TO + DATE/TERMS ───────────────────────────────────
  const colWidth = contentWidth / 2 - 10;
  const leftCol = margin;
  const rightCol = margin + colWidth + 20;
  
  setColor(colors.muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("SOLD TO:", leftCol, y);
  pdf.text("DATE:", rightCol, y);
  
  setColor(colors.dark);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(order.name || "—", leftCol + 60, y);
  
  const dateStr = new Date().toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
  pdf.text(dateStr, rightCol + 40, y);
  y += 14;
  
  setColor(colors.muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("ADDRESS:", leftCol, y);
  pdf.text(docType === "quotation" ? "VALID UNTIL:" : "TERMS:", rightCol, y);
  
  setColor(colors.dark);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const addr = order.address || "—";
  const addrShort = addr.length > 50 ? addr.substring(0, 50) + "..." : addr;
  pdf.text(addrShort, leftCol + 60, y);
  
  if (docType === "quotation") {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);
    pdf.text(validUntil.toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" }), rightCol + 70, y);
  } else {
    const terms = order.paymentMethod || (order.paymentTerms ? findTerms(order.paymentTerms)?.label : "—") || "—";
    pdf.text(terms, rightCol + 50, y);
  }
  y += 14;
  
  setColor(colors.muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("PHONE:", leftCol, y);
  pdf.text("ORDER REF:", rightCol, y);
  setColor(colors.dark);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(order.phone || "—", leftCol + 60, y);
  pdf.text(`#${order.id.slice(-6).toUpperCase()}`, rightCol + 60, y);
  y += 14;
  
  if (order.email) {
    setColor(colors.muted);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("EMAIL:", leftCol, y);
    setColor(colors.dark);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(order.email, leftCol + 60, y);
    y += 14;
  }
  
  y += 8;
  
  // ── ITEMS TABLE ────────────────────────────────────────────
  setFill(colors.canvas);
  pdf.rect(margin, y, contentWidth, 22, "F");
  setDraw(colors.light);
  pdf.rect(margin, y, contentWidth, 22, "S");
  
  setColor(colors.dark);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("QTY",         margin + 10,                  y + 14);
  pdf.text("UNIT",        margin + 50,                  y + 14);
  pdf.text("DESCRIPTION", margin + 90,                  y + 14);
  pdf.text("UNIT PRICE",  margin + contentWidth - 130,  y + 14, { align: "left" });
  pdf.text("AMOUNT",      margin + contentWidth - 50,   y + 14, { align: "left" });
  y += 22;
  
  // Items rows
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  setColor(colors.dark);
  
  let rowsDrawn = 0;
  const rowHeight = 18;
  const minRows = 8; // ensure consistent layout
  
  (order.items || []).forEach(item => {
    pdf.line(margin, y, margin + contentWidth, y);
    pdf.text(String(item.qty || 1),    margin + 10, y + 12);
    pdf.text("pc",                      margin + 50, y + 12);
    
    const descLines = pdf.splitTextToSize(item.name || "—", 240);
    pdf.text(descLines[0],              margin + 90, y + 12);
    
    pdf.text(formatPHPNum(item.price || 0),  margin + contentWidth - 130, y + 12);
    pdf.text(formatPHPNum((item.price||0) * (item.qty||0)), margin + contentWidth - 50, y + 12);
    y += rowHeight;
    rowsDrawn++;
  });
  
  // Other charges as additional rows
  (order.otherCharges || []).forEach(charge => {
    pdf.line(margin, y, margin + contentWidth, y);
    pdf.text("1",              margin + 10, y + 12);
    pdf.text("svc",             margin + 50, y + 12);
    setColor(colors.muted);
    pdf.text(charge.description || "Other charge", margin + 90, y + 12);
    setColor(colors.dark);
    pdf.text(formatPHPNum(charge.amount || 0),  margin + contentWidth - 130, y + 12);
    pdf.text(formatPHPNum(charge.amount || 0),  margin + contentWidth - 50,  y + 12);
    y += rowHeight;
    rowsDrawn++;
  });
  
  // Pad with empty rows so layout looks consistent
  while (rowsDrawn < minRows) {
    pdf.line(margin, y, margin + contentWidth, y);
    y += rowHeight;
    rowsDrawn++;
  }
  pdf.line(margin, y, margin + contentWidth, y);
  
  // Vertical lines for the table
  pdf.line(margin + 40, y - rowHeight*rowsDrawn - 22, margin + 40, y);
  pdf.line(margin + 80, y - rowHeight*rowsDrawn - 22, margin + 80, y);
  pdf.line(margin + contentWidth - 140, y - rowHeight*rowsDrawn - 22, margin + contentWidth - 140, y);
  pdf.line(margin + contentWidth - 60, y - rowHeight*rowsDrawn - 22, margin + contentWidth - 60, y);
  pdf.line(margin, y - rowHeight*rowsDrawn - 22, margin, y);
  pdf.line(margin + contentWidth, y - rowHeight*rowsDrawn - 22, margin + contentWidth, y);
  
  y += 14;
  
  // ── VAT BREAKDOWN ──────────────────────────────────────────
  const vat = computeVATBreakdown(order.total || 0);
  
  // Two columns: left=labels, right=amounts
  const totalsX = margin + contentWidth - 200;
  
  setColor(colors.dark);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  
  // Total Sales (VAT Inclusive)
  pdf.text("Total Sales (VAT Inclusive):", totalsX, y);
  pdf.setFont("helvetica", "bold");
  pdf.text(formatPHPNum(vat.total), margin + contentWidth - 10, y, { align: "right" });
  y += 14;
  
  pdf.setFont("helvetica", "normal");
  pdf.text("Less: VAT (12%):", totalsX, y);
  pdf.text(`(${formatPHPNum(vat.vat)})`, margin + contentWidth - 10, y, { align: "right" });
  y += 14;
  
  pdf.text("Amount Net of VAT:", totalsX, y);
  pdf.text(formatPHPNum(vat.netOfVAT), margin + contentWidth - 10, y, { align: "right" });
  y += 14;
  
  pdf.text("Add: VAT:", totalsX, y);
  pdf.text(formatPHPNum(vat.vat), margin + contentWidth - 10, y, { align: "right" });
  y += 14;
  
  // Grand total box
  setFill(colors.red);
  pdf.rect(totalsX - 10, y - 4, 220, 22, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("TOTAL AMOUNT DUE:", totalsX, y + 11);
  pdf.text(formatPHP(vat.total), margin + contentWidth - 10, y + 11, { align: "right" });
  y += 30;
  
  // ── DOCUMENT-SPECIFIC SECTIONS ─────────────────────────────
  setColor(colors.muted);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  
  if (docType === "quotation") {
    pdf.setFont("helvetica", "bold");
    setColor(colors.dark);
    pdf.text("TERMS AND CONDITIONS:", margin, y);
    y += 12;
    pdf.setFont("helvetica", "normal");
    setColor(colors.muted);
    const terms = [
      `1. This quotation is valid for ${validityDays} days from the date issued.`,
      "2. Prices are quoted in Philippine Peso (PHP), VAT inclusive.",
      "3. Payment terms: " + (order.paymentMethod || (order.paymentTerms ? findTerms(order.paymentTerms)?.label : "As agreed")),
      "4. Delivery timeline subject to product availability and confirmation.",
      "5. This quotation is subject to acceptance via signed PO or written confirmation.",
    ];
    terms.forEach(t => { pdf.text(t, margin, y); y += 10; });
  } else if (docType === "deliveryReceipt") {
    pdf.setFont("helvetica", "bold");
    setColor(colors.dark);
    pdf.text("RECEIVED BY:", margin, y); y += 14;
    pdf.setFont("helvetica", "normal");
    pdf.line(margin, y + 16, margin + 200, y + 16);
    pdf.line(pageWidth - margin - 200, y + 16, pageWidth - margin, y + 16);
    setColor(colors.muted);
    pdf.setFontSize(7);
    pdf.text("Signature over Printed Name", margin, y + 28);
    pdf.text("Date Received", pageWidth - margin - 200, y + 28);
    y += 40;
  } else if (docType === "salesOrder") {
    pdf.setFont("helvetica", "bold");
    setColor(colors.dark);
    pdf.text("ORDER DETAILS:", margin, y); y += 12;
    pdf.setFont("helvetica", "normal");
    setColor(colors.muted);
    pdf.text(`Order Source: ${findSource(order.source)?.label || "Direct"}`, margin, y); y += 10;
    pdf.text(`Order Date: ${formatDate(order.createdAt)}`, margin, y); y += 10;
    if (order.paymentTerms) {
      pdf.text(`Payment Terms: ${findTerms(order.paymentTerms)?.label || order.paymentTerms}`, margin, y); y += 10;
    }
  } else if (docType === "provisionalReceipt") {
    setFill([254, 243, 199]); // light yellow
    pdf.rect(margin, y, contentWidth, 50, "F");
    setColor([146, 64, 14]); // dark amber
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("⚠ PROVISIONAL RECEIPT — NOT A BIR OFFICIAL RECEIPT", margin + 10, y + 14);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const note = "This document acknowledges receipt of payment provisionally. An official BIR-registered Sales Invoice or Official Receipt will be issued separately within the period required by law.";
    const noteLines = pdf.splitTextToSize(note, contentWidth - 20);
    let ny = y + 24;
    noteLines.forEach(line => { pdf.text(line, margin + 10, ny); ny += 10; });
    y += 60;
  }
  
  // ── FOOTER ─────────────────────────────────────────────────
  const footerY = pageHeight - 60;
  setDraw(colors.light);
  pdf.line(margin, footerY, pageWidth - margin, footerY);
  
  setColor(colors.muted);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7);
  
  if (docType !== "provisionalReceipt") {
    const disclaimer = "This document is generated electronically by DMEAST Operations System. It is NOT a BIR Official Receipt. An Official Sales Invoice or Receipt will be issued separately upon payment per BIR regulations.";
    const disclaimerLines = pdf.splitTextToSize(disclaimer, contentWidth);
    let dy = footerY + 10;
    disclaimerLines.forEach(line => { pdf.text(line, margin, dy); dy += 9; });
  }
  
  setColor(colors.dark);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(`Generated: ${new Date().toLocaleString("en-PH")}`, margin, pageHeight - 16);
  pdf.text(`dmeastph.com  |  ${CONTACT.email}  |  ${CONTACT.phone1}`, pageWidth - margin, pageHeight - 16, { align: "right" });
  
  return pdf;
}

// Helper: format number without ₱ (for tables in PDFs)
function formatPHPNum(amount) {
  return Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── v15 PDF GENERATOR MODAL ─────────────────────────────────────────────────
function PDFGeneratorModal({ order, onClose }){
  const [docType, setDocType] = useState("quotation");
  const [validityDays, setValidityDays] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const [docNumber, setDocNumber] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const handleGenerate = async () => {
    setGenerating(true); setErrMsg("");
    try {
      const num = await getNextDocumentNumber(docType);
      setDocNumber(num);
      const pdf = await generateDocumentPDF({ order, docType, docNumber: num, validityDays });
      setGeneratedPdf(pdf);
      // Preview as data URL
      const dataUrl = pdf.output("datauristring");
      setPreviewUrl(dataUrl);
    } catch(e) {
      console.error("PDF generation failed:", e);
      setErrMsg("Failed to generate PDF: " + e.message);
    }
    setGenerating(false);
  };
  
  const handleDownload = () => {
    if (!generatedPdf) return;
    generatedPdf.save(`${docNumber}.pdf`);
  };
  
  const handleEmail = () => {
    if (!generatedPdf || !order.email) {
      alert("No email on file for this customer.");
      return;
    }
    // Open mail client with pre-filled email — user can attach the downloaded PDF
    const subject = encodeURIComponent(`${DOC_TITLES[docType]} ${docNumber} from DMEAST`);
    const body = encodeURIComponent(
      `Dear ${order.name || "Customer"},\n\n` +
      `Please find attached the ${DOC_TITLES[docType].toLowerCase()} (${docNumber}) ` +
      `for your reference.\n\n` +
      `Order Reference: #${order.id.slice(-6).toUpperCase()}\n` +
      `Total Amount: ${formatPHP(order.total||0)}\n\n` +
      `Please don't hesitate to contact us for any questions or clarifications.\n\n` +
      `Best regards,\n` +
      `DMEAST Team\n` +
      `${CONTACT.email}\n${CONTACT.phone1}\n\n` +
      `--\n` +
      `📎 Please attach the downloaded ${docNumber}.pdf to this email before sending.`
    );
    window.location.href = `mailto:${order.email}?subject=${subject}&body=${body}`;
    // Also auto-download for them
    handleDownload();
  };
  
  const handlePrint = () => {
    if (!generatedPdf) return;
    generatedPdf.autoPrint();
    window.open(generatedPdf.output("bloburl"), "_blank");
  };
  
  const docTypes = [
    { id: "quotation",          label: "Quotation",          icon: "📋", desc: "Formal quote for prospective orders, with validity period" },
    { id: "salesOrder",         label: "Sales Order",        icon: "📑", desc: "Internal record of confirmed order" },
    { id: "deliveryReceipt",    label: "Delivery Receipt",   icon: "🚚", desc: "Document for courier/customer to sign upon delivery" },
    { id: "provisionalReceipt", label: "Provisional Receipt",icon: "🧾", desc: "Acknowledges payment received (before BIR Official Receipt)" },
  ];
  
  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,fontFamily:ds.font.body,outline:"none",boxSizing:"border-box"};
  
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:900,width:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        
        {/* Header */}
        <div style={{padding:"18px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>📄 Generate Document</div>
            <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>Order #{order.id.slice(-6).toUpperCase()} · {order.name} · {formatPHP(order.total||0)}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:24,color:ds.color.textMuted,padding:4}}>✕</button>
        </div>
        
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"22px 28px"}}>
          {!generatedPdf ? (
            <>
              {/* Document type selection */}
              <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.06em"}}>Select Document Type</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
                {docTypes.map(d=>(
                  <button key={d.id} onClick={()=>setDocType(d.id)} style={{
                    padding:"14px 16px",
                    borderRadius:ds.radius.md,
                    border:`2px solid ${docType===d.id?ds.color.red:ds.color.border}`,
                    background:docType===d.id?ds.color.redLight:"#fff",
                    cursor:"pointer", textAlign:"left", fontFamily:ds.font.body,
                    transition:"all 0.15s"
                  }}>
                    <div style={{fontSize:15,fontWeight:700,color:docType===d.id?ds.color.red:ds.color.textDark,marginBottom:4}}>{d.icon} {d.label}</div>
                    <div style={{fontSize:11.5,color:ds.color.textMuted,lineHeight:1.4}}>{d.desc}</div>
                  </button>
                ))}
              </div>
              
              {/* Quotation: validity */}
              {docType === "quotation" && (
                <div style={{marginBottom:20}}>
                  <label style={{fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5}}>Validity Period (days)</label>
                  <select value={validityDays} onChange={e=>setValidityDays(Number(e.target.value))} style={{...inp,cursor:"pointer"}}>
                    <option value={7}>7 days</option>
                    <option value={15}>15 days</option>
                    <option value={30}>30 days (recommended)</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              )}
              
              {/* Preview info */}
              <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Document Preview</div>
                <div style={{fontSize:12,color:ds.color.textBody,lineHeight:1.6}}>
                  📌 <strong>Customer:</strong> {order.name || "—"}<br/>
                  📌 <strong>Items:</strong> {(order.items||[]).length} item{(order.items||[]).length!==1?"s":""} {(order.otherCharges||[]).length>0&&` + ${(order.otherCharges||[]).length} charge${(order.otherCharges||[]).length!==1?"s":""}`}<br/>
                  📌 <strong>Total (VAT inclusive):</strong> {formatPHP(order.total||0)}<br/>
                  📌 <strong>VAT (12%):</strong> {formatPHP(computeVATBreakdown(order.total||0).vat)}
                </div>
              </div>
              
              <div style={{padding:"10px 14px",background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,fontSize:11.5,color:ds.color.gold}}>
                ℹ️ <strong>Reminder:</strong> This document is for business reference only. It is NOT a BIR Official Receipt. Please continue issuing official BIR Sales Invoices/Receipts from your booklets per BIR regulations.
              </div>
              
              {errMsg && <div style={{marginTop:12,padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>⚠ {errMsg}</div>}
            </>
          ) : (
            <>
              {/* Generated — show preview */}
              <div style={{padding:"12px 16px",background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>✓</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:ds.color.success}}>Document generated: {docNumber}</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>Preview below — choose to download, print, or email.</div>
                </div>
              </div>
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  style={{width:"100%",height:480,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md}}
                />
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div style={{padding:"14px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"flex-end",gap:8,flexWrap:"wrap"}}>
          {!generatedPdf ? (
            <>
              <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
              <Btn variant="primary" size="md" disabled={generating} onClick={handleGenerate}>
                {generating ? "Generating…" : "📄 Generate PDF"}
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="outline" size="md" onClick={()=>{setGeneratedPdf(null);setPreviewUrl(null);}}>← Generate Another</Btn>
              <Btn variant="outline" size="md" onClick={handlePrint}>🖨️ Print</Btn>
              {order.email && <Btn variant="outline" size="md" onClick={handleEmail}>✉️ Email + Download</Btn>}
              <Btn variant="primary" size="md" onClick={handleDownload}>📥 Download PDF</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── v13.0a: NEW ORDER MODAL (Admin Internal Order Entry) ────────────────────
function NewOrderModal({ onClose, onSaved, customers: existingCustomers, products: existingProducts }){
  const [step, setStep] = useState(1); // 1=customer, 2=items, 3=details
  
  // Customer selection
  const [customerMode, setCustomerMode] = useState("existing"); // "existing" or "new"
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "", email: "", phone: "", address: "",
    customerType: "individual", tags: [], internalNotes: ""
  });
  
  // Items
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState([]); // [{productId, name, qty, unitPrice, total}]
  // v13.0b: Other Charges (delivery, service fees, etc)
  const [otherCharges, setOtherCharges] = useState([]); // [{description, amount}]
  
  // Order details
  const [source, setSource]               = useState("phone");
  const [paymentTerms, setPaymentTerms]   = useState("cod");
  const [paymentTermsNotes, setTermsNotes]= useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [supplierCost, setSupplierCost]   = useState(""); // optional margin tracking
  const [supplierName, setSupplierName]   = useState("");
  
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  
  const filteredCustomers = customerSearch.trim()
    ? existingCustomers.filter(c => {
        const q = customerSearch.toLowerCase();
        return (c.name||"").toLowerCase().includes(q) ||
               (c.email||"").toLowerCase().includes(q) ||
               (c.phone||"").toLowerCase().includes(q);
      }).slice(0, 8)
    : existingCustomers.slice(0, 8);

  const filteredProducts = productSearch.trim()
    ? existingProducts.filter(p => {
        const q = productSearch.toLowerCase();
        return (p.name||"").toLowerCase().includes(q) ||
               (p.tag||"").toLowerCase().includes(q);
      }).slice(0, 6)
    : [];
  
  const itemsTotal = items.reduce((s, i) => s + (i.qty * i.unitPrice), 0);
  const chargesTotal = otherCharges.reduce((s, c) => s + (Number(c.amount)||0), 0);
  const total = itemsTotal + chargesTotal;
  const margin = supplierCost ? total - Number(supplierCost) : null;
  
  const customerValid = selectedCustomer || (newCustomer.name && newCustomer.phone);
  const itemsValid    = items.length > 0;
  const canSave       = customerValid && itemsValid && source && paymentTerms;
  
  const addProduct = (p) => {
    const existing = items.find(i => i.productId === p.id);
    if (existing) {
      setItems(items.map(i => i.productId === p.id ? {...i, qty: i.qty + 1} : i));
    } else {
      setItems([...items, {
        productId: p.id, name: p.name,
        qty: 1, unitPrice: p.price || 0,
        requiresPrescription: !!p.requiresPrescription,
      }]);
    }
    setProductSearch("");
  };
  
  const updateItem = (idx, field, value) => {
    const newItems = [...items];
    if (field === "qty") newItems[idx].qty = Math.max(1, Number(value) || 1);
    else if (field === "unitPrice") newItems[idx].unitPrice = Math.max(0, Number(value) || 0);
    setItems(newItems);
  };
  
  const removeItem = (idx) => setItems(items.filter((_,i) => i !== idx));
  
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true); setErrMsg("");
    try {
      // Step 1: Create or get customer
      let customerId, customerData;
      if (selectedCustomer) {
        customerId = selectedCustomer.id;
        customerData = selectedCustomer;
      } else {
        // Create new offline customer (no auth, no uid)
        const ref = await addDoc(collection(db, "customers"), {
          name: newCustomer.name,
          email: newCustomer.email || null,
          phone: newCustomer.phone,
          savedAddress: newCustomer.address || null,
          customerType: newCustomer.customerType,
          tags: newCustomer.tags,
          internalNotes: newCustomer.internalNotes || null,
          source: "manual", // admin-created (vs "registered")
          totalOrders: 0,
          totalSpent: 0,
          points: 0,
          createdAt: serverTimestamp(),
        });
        customerId = ref.id;
        customerData = { id: customerId, ...newCustomer };
      }
      
      // Step 2: Create order
      const orderDate = serverTimestamp();
      const dueDate = calculateDueDate(new Date(), paymentTerms);
      const orderData = {
        // Customer info (denormalized for fast display)
        name: customerData.name || newCustomer.name,
        email: customerData.email || newCustomer.email || null,
        phone: customerData.phone || newCustomer.phone,
        address: customerData.savedAddress || newCustomer.address || null,
        uid: customerData.uid || null,
        customerId: customerId,
        // Order
        items: items.map(i => ({
          id: i.productId, name: i.name,
          price: i.unitPrice, qty: i.qty,
          requiresPrescription: !!i.requiresPrescription,
        })),
        // v13.0b: Other charges (delivery, service fees, etc)
        otherCharges: otherCharges.filter(c => c.description && c.amount),
        total,
        // v13.0a fields
        source: source, // phone/messenger/whatsapp/walkin/email/website
        paymentMethod: findTerms(paymentTerms)?.label || paymentTerms,
        paymentTerms: paymentTerms,
        paymentTermsNotes: paymentTermsNotes || null,
        internalNotes: internalNotes || null,
        createdByAdmin: true,
        dueDate: dueDate,
        // Margin tracking (optional)
        supplierCost: supplierCost ? Number(supplierCost) : null,
        supplierName: supplierName || null,
        margin: margin,
        // Status
        status: "confirmed", // admin-created orders skip "pending" status
        paymentStatus: paymentTerms.startsWith("credit_") ? "awaiting" : "awaiting",
        createdAt: orderDate,
      };
      const orderRef = await addDoc(collection(db, "orders"), orderData);
      
      // Step 3: Update customer stats
      try {
        await updateDoc(doc(db, "customers", customerId), {
          totalOrders: (customerData.totalOrders || 0) + 1,
          totalSpent: (customerData.totalSpent || 0) + total,
        });
      } catch(_){}
      
      // v13.0d: Send email notifications for admin-created orders
      const fullOrder = { id: orderRef.id, ...orderData };
      // Notify admin
      sendAdminNewOrderNotification(fullOrder);
      // Notify customer if they have an email
      if (fullOrder.email) {
        const sourceLabel = findSource(fullOrder.source)?.label || "Direct";
        const termsLabel  = findTerms(fullOrder.paymentTerms)?.label || fullOrder.paymentMethod || "—";
        sendCustomerStatusEmail({
          order: fullOrder,
          subject: `ORDER #${orderRef.id.slice(-6).toUpperCase()} — Order Received`,
          bodyText: `Dear ${fullOrder.name || "Customer"},\n\nThank you! We have received your order via ${sourceLabel}.\n\nOrder Reference: #${orderRef.id.slice(-6).toUpperCase()}\n\nOrder Items:\n${(fullOrder.items||[]).map(i=>`${i.name} x${i.qty} — ${formatPHP(i.price*i.qty)}`).join("\n")}\n\nTotal: ${formatPHP(fullOrder.total||0)}\nPayment Terms: ${termsLabel}\n\nOur team will be in touch shortly with delivery details and payment instructions if applicable.\n\nIf you have any questions, contact us:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nThank you for choosing DM EAST!`
        });
        // Also send a receipt
        sendCustomerReceiptEmail(fullOrder);
      }
      
      onSaved && onSaved({ id: orderRef.id, ...orderData });
      onClose();
    } catch(e) {
      console.error("Failed to save order:", e);
      setErrMsg("Failed to save order: " + e.message);
    }
    setSaving(false);
  };
  
  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,fontFamily:ds.font.body,outline:"none",boxSizing:"border-box"};
  const lbl = {fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5};
  
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:880,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        
        {/* Header */}
        <div style={{padding:"20px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>+ New Internal Order</div>
            <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>Manually create an order for phone/Messenger/walk-in customers</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:24,color:ds.color.textMuted,padding:4}}>✕</button>
        </div>
        
        {/* Step indicator */}
        <div style={{padding:"12px 28px",background:ds.color.canvas,display:"flex",gap:0,alignItems:"center"}}>
          {[[1,"Customer"],[2,"Items"],[3,"Details"]].map(([n,label],i)=>(
            <div key={n} style={{display:"flex",alignItems:"center",flex:i<2?1:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:step>=n?ds.color.red:ds.color.border,color:step>=n?"#fff":ds.color.textMuted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{step>n?"✓":n}</div>
                <span style={{fontSize:12,fontWeight:500,color:step===n?ds.color.textDark:ds.color.textMuted}}>{label}</span>
              </div>
              {i<2&&<div style={{flex:1,height:2,background:step>n?ds.color.success:ds.color.borderLight,margin:"0 12px"}}/>}
            </div>
          ))}
        </div>
        
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
          
          {/* STEP 1: CUSTOMER */}
          {step===1&&(
            <div>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <button onClick={()=>setCustomerMode("existing")} style={{flex:1,padding:"10px",borderRadius:ds.radius.md,border:`1.5px solid ${customerMode==="existing"?ds.color.red:ds.color.border}`,background:customerMode==="existing"?ds.color.redLight:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:customerMode==="existing"?ds.color.red:ds.color.textBody,fontFamily:ds.font.body}}>
                  🔍 Existing Customer
                </button>
                <button onClick={()=>setCustomerMode("new")} style={{flex:1,padding:"10px",borderRadius:ds.radius.md,border:`1.5px solid ${customerMode==="new"?ds.color.red:ds.color.border}`,background:customerMode==="new"?ds.color.redLight:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:customerMode==="new"?ds.color.red:ds.color.textBody,fontFamily:ds.font.body}}>
                  ➕ New Customer
                </button>
              </div>
              
              {customerMode==="existing"?(
                <div>
                  <input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="🔍 Search by name, email, or phone…" style={{...inp,marginBottom:12}}/>
                  <div style={{maxHeight:320,overflowY:"auto",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md}}>
                    {filteredCustomers.length===0?(
                      <div style={{padding:"24px",textAlign:"center",fontSize:13,color:ds.color.textMuted}}>No customers found. Try a different search or create new.</div>
                    ):filteredCustomers.map(c=>{
                      const active = selectedCustomer?.id===c.id;
                      return(
                        <button key={c.id} onClick={()=>setSelectedCustomer(c)} style={{display:"block",width:"100%",padding:"12px 16px",border:"none",borderBottom:`1px solid ${ds.color.borderLight}`,background:active?ds.color.redLight:"#fff",cursor:"pointer",textAlign:"left",fontFamily:ds.font.body}}>
                          <div style={{fontSize:13.5,fontWeight:600,color:ds.color.textDark}}>{c.name||"Unnamed"} {active&&<span style={{color:ds.color.red}}>✓ Selected</span>}</div>
                          <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>
                            {c.email||"No email"} · {c.phone||"No phone"}
                            {c.tags&&c.tags.length>0&&<span> · {c.tags.map(t=>findTag(t)?.label).filter(Boolean).join(", ")}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 16px"}}>
                  <div><label style={lbl}>Name *</label><input value={newCustomer.name} onChange={e=>setNewCustomer({...newCustomer,name:e.target.value})} placeholder="Customer name" style={inp}/></div>
                  <div><label style={lbl}>Phone *</label><input value={newCustomer.phone} onChange={e=>setNewCustomer({...newCustomer,phone:e.target.value})} placeholder="+63 9XX XXX XXXX" style={inp}/></div>
                  <div><label style={lbl}>Email</label><input value={newCustomer.email} onChange={e=>setNewCustomer({...newCustomer,email:e.target.value})} placeholder="email@example.com" style={inp}/></div>
                  <div><label style={lbl}>Customer Type</label>
                    <select value={newCustomer.customerType} onChange={e=>setNewCustomer({...newCustomer,customerType:e.target.value})} style={{...inp,cursor:"pointer"}}>
                      <option value="individual">Individual</option>
                      <option value="institution">Institution</option>
                      <option value="walkin">Walk-in</option>
                    </select>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={lbl}>Address</label>
                    <textarea value={newCustomer.address} onChange={e=>setNewCustomer({...newCustomer,address:e.target.value})} rows={2} placeholder="Delivery address" style={{...inp,resize:"vertical"}}/>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={lbl}>Tags (click to toggle)</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {CUSTOMER_TAGS.map(tag=>{
                        const active = newCustomer.tags.includes(tag.id);
                        return(
                          <button key={tag.id} type="button" onClick={()=>{
                            const newTags = active ? newCustomer.tags.filter(t=>t!==tag.id) : [...newCustomer.tags, tag.id];
                            setNewCustomer({...newCustomer,tags:newTags});
                          }} style={{padding:"4px 10px",borderRadius:ds.radius.pill,border:`1px solid ${active?tag.color:ds.color.border}`,background:active?tag.color:"#fff",color:active?"#fff":ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{tag.label}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={lbl}>Internal Notes (admin only)</label>
                    <textarea value={newCustomer.internalNotes} onChange={e=>setNewCustomer({...newCustomer,internalNotes:e.target.value})} rows={2} placeholder="e.g. 'Always pays late', 'Refers other clinics'" style={{...inp,resize:"vertical"}}/>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* STEP 2: ITEMS */}
          {step===2&&(
            <div>
              <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="🔍 Search products to add…" style={{...inp,marginBottom:12}}/>
              {filteredProducts.length>0&&(
                <div style={{border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,marginBottom:16,maxHeight:200,overflowY:"auto"}}>
                  {filteredProducts.map(p=>(
                    <button key={p.id} onClick={()=>addProduct(p)} style={{display:"block",width:"100%",padding:"10px 14px",border:"none",borderBottom:`1px solid ${ds.color.borderLight}`,background:"#fff",cursor:"pointer",textAlign:"left",fontFamily:ds.font.body}}>
                      <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark}}>{p.name} {p.requiresPrescription&&<span style={{color:"#92400E",fontSize:11}}>💊</span>}</div>
                      <div style={{fontSize:11,color:ds.color.textMuted}}>{formatPHP(p.price||0)} · {p.tag}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {items.length===0?(
                <div style={{padding:"40px",textAlign:"center",border:`2px dashed ${ds.color.border}`,borderRadius:ds.radius.lg,color:ds.color.textMuted,fontSize:13}}>
                  No items added yet. Search and click a product to add.
                </div>
              ):(
                <div style={{border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 110px 40px",gap:8,padding:"10px 14px",background:ds.color.canvas,fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                    <div>Product</div><div>Qty</div><div>Unit Price</div><div style={{textAlign:"right"}}>Total</div><div></div>
                  </div>
                  {items.map((item,idx)=>(
                    <div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 110px 40px",gap:8,padding:"10px 14px",borderTop:`1px solid ${ds.color.borderLight}`,alignItems:"center"}}>
                      <div style={{fontSize:13,color:ds.color.textDark}}>{item.name} {item.requiresPrescription&&<span style={{color:"#92400E",fontSize:10}}>💊</span>}</div>
                      <input type="number" min="1" value={item.qty} onChange={e=>updateItem(idx,"qty",e.target.value)} style={{...inp,padding:"6px 8px",fontSize:13}}/>
                      <input type="number" min="0" value={item.unitPrice} onChange={e=>updateItem(idx,"unitPrice",e.target.value)} style={{...inp,padding:"6px 8px",fontSize:13}}/>
                      <div style={{textAlign:"right",fontSize:13,fontWeight:700}}>{formatPHP(item.qty*item.unitPrice)}</div>
                      <button onClick={()=>removeItem(idx)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textLight}}>✕</button>
                    </div>
                  ))}
                  <div style={{padding:"12px 14px",background:ds.color.canvas,borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody}}>
                    <span>Items Subtotal ({items.length} item{items.length!==1?"s":""})</span>
                    <span style={{fontWeight:700}}>{formatPHP(itemsTotal)}</span>
                  </div>
                </div>
              )}
              
              {/* v13.0b: Other Charges */}
              {items.length > 0 && (
                <div style={{marginTop:14,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,padding:"12px 14px",background:ds.color.canvas}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:otherCharges.length>0?10:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:ds.color.textDark}}>💸 Other Charges <span style={{color:ds.color.textMuted,fontWeight:400,fontSize:11}}>(optional — delivery, service fees, etc.)</span></div>
                    <button onClick={()=>setOtherCharges([...otherCharges,{description:"",amount:""}])} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.red}`,background:ds.color.redLight,cursor:"pointer",fontSize:11.5,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body}}>+ Add Charge</button>
                  </div>
                  {otherCharges.map((c,idx)=>(
                    <div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 120px 32px",gap:8,marginBottom:6,alignItems:"center"}}>
                      <input value={c.description} onChange={e=>{const arr=[...otherCharges];arr[idx].description=e.target.value;setOtherCharges(arr);}} placeholder="e.g. Delivery to Cavite" style={{...inp,padding:"7px 10px",fontSize:12.5}}/>
                      <input type="number" min="0" value={c.amount} onChange={e=>{const arr=[...otherCharges];arr[idx].amount=e.target.value;setOtherCharges(arr);}} placeholder="Amount" style={{...inp,padding:"7px 10px",fontSize:12.5}}/>
                      <button onClick={()=>setOtherCharges(otherCharges.filter((_,i)=>i!==idx))} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textLight}}>✕</button>
                    </div>
                  ))}
                  {otherCharges.length>0 && (
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:ds.color.textMuted,paddingTop:8,borderTop:`1px dashed ${ds.color.border}`,marginTop:6}}>
                      <span>Charges Subtotal</span>
                      <span style={{fontWeight:700}}>{formatPHP(chargesTotal)}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Grand Total */}
              {items.length > 0 && (
                <div style={{marginTop:14,padding:"14px 16px",background:ds.color.redLight,border:`2px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:14,fontWeight:700,color:ds.color.red}}>GRAND TOTAL</span>
                  <span style={{fontSize:18,fontWeight:700,color:ds.color.red,fontFamily:ds.font.display}}>{formatPHP(total)}</span>
                </div>
              )}
            </div>
          )}
          
          {/* STEP 3: DETAILS */}
          {step===3&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px"}}>
              <div>
                <label style={lbl}>Order Source *</label>
                <select value={source} onChange={e=>setSource(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  {ORDER_SOURCES.map(s=><option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Payment Terms *</label>
                <select value={paymentTerms} onChange={e=>setPaymentTerms(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  {PAYMENT_TERMS_OPTIONS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              {paymentTerms==="custom"&&(
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Custom Terms Description</label>
                  <input value={paymentTermsNotes} onChange={e=>setTermsNotes(e.target.value)} placeholder="e.g. 50% deposit, balance on delivery" style={inp}/>
                </div>
              )}
              {paymentTerms.startsWith("credit_")&&(
                <div style={{gridColumn:"1/-1",background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,padding:"10px 14px",borderRadius:ds.radius.md,fontSize:12.5,color:ds.color.gold}}>
                  💳 Due Date: <strong>{calculateDueDate(new Date(),paymentTerms)?.toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}</strong> · This will appear in Receivables.
                </div>
              )}
              <div style={{gridColumn:"1/-1"}}>
                <label style={lbl}>Internal Notes (admin only)</label>
                <textarea value={internalNotes} onChange={e=>setInternalNotes(e.target.value)} rows={2} placeholder="e.g. 'Special handling required', 'Customer requested rush'" style={{...inp,resize:"vertical"}}/>
              </div>
              <div style={{gridColumn:"1/-1",borderTop:`1px dashed ${ds.color.border}`,paddingTop:16,marginTop:4}}>
                <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Margin Tracking (Optional)</div>
              </div>
              <div>
                <label style={lbl}>Supplier Cost (optional)</label>
                <input type="number" min="0" value={supplierCost} onChange={e=>setSupplierCost(e.target.value)} placeholder="e.g. 35000" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Supplier Name (optional)</label>
                <input value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="e.g. MedSupply Inc" style={inp}/>
              </div>
              {margin!==null&&supplierCost&&(
                <div style={{gridColumn:"1/-1",background:margin>=0?ds.color.successBg:ds.color.redLight,border:`1px solid ${margin>=0?ds.color.successBorder:ds.color.redBorder}`,padding:"10px 14px",borderRadius:ds.radius.md,fontSize:12.5,color:margin>=0?ds.color.success:ds.color.red}}>
                  💰 Margin: <strong>{formatPHP(margin)}</strong> ({total>0?((margin/total)*100).toFixed(1):0}% of revenue)
                </div>
              )}
            </div>
          )}
          
          {errMsg&&<div style={{marginTop:16,padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
        </div>
        
        {/* Footer */}
        <div style={{padding:"16px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:13,color:ds.color.textMuted}}>
            {step===1&&!customerValid&&"Select or create a customer to continue"}
            {step===2&&!itemsValid&&"Add at least one item"}
            {step===3&&canSave&&<span style={{color:ds.color.success,fontWeight:600}}>✓ Ready to save</span>}
            {step===3&&items.length>0&&<span style={{marginLeft:12,fontWeight:700,color:ds.color.textDark}}>Total: {formatPHP(total)}</span>}
          </div>
          <div style={{display:"flex",gap:8}}>
            {step>1&&<Btn variant="outline" size="md" onClick={()=>setStep(s=>s-1)}>← Back</Btn>}
            {step<3?(
              <Btn variant="primary" size="md" disabled={(step===1&&!customerValid)||(step===2&&!itemsValid)} onClick={()=>setStep(s=>s+1)}>Next →</Btn>
            ):(
              <Btn variant="primary" size="md" disabled={!canSave||saving} onClick={handleSave}>{saving?"Saving…":"💾 Save Order"}</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── v13.0a: RECEIVABLES TAB ─────────────────────────────────────────────────
function ReceivablesTab({ orders, onMarkPaid }){
  const [filter, setFilter] = useState("all"); // all/current/overdue
  const [searchQ, setSearchQ] = useState("");
  
  // Filter to credit-term orders that aren't fully paid
  const receivables = orders.filter(o => {
    const isCreditOrder = o.paymentTerms && o.paymentTerms.startsWith("credit_");
    const isCustomTerms = o.paymentTerms === "custom";
    const isUnpaid      = o.paymentStatus !== "confirmed" && o.status !== "cancelled";
    return (isCreditOrder || isCustomTerms) && isUnpaid;
  });
  
  // Add aging info
  const enriched = receivables.map(o => {
    const days = daysOverdue(o.dueDate);
    return { ...o, days, bucket: getAgingBucket(days) };
  });
  
  // Apply filters
  const filtered = enriched.filter(o => {
    if (filter === "current"  && o.days >  0) return false;
    if (filter === "overdue"  && o.days <= 0) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      return (o.name||"").toLowerCase().includes(q) ||
             (o.id||"").toLowerCase().includes(q);
    }
    return true;
  });
  
  // Sort: most overdue first
  filtered.sort((a,b) => b.days - a.days);
  
  const totalOutstanding = filtered.reduce((s,o) => s + (o.total||0), 0);
  const overdueCount     = enriched.filter(o => o.days > 0).length;
  const currentCount     = enriched.filter(o => o.days <= 0).length;
  
  // Aging buckets summary
  const agingSummary = AGING_BUCKETS.map(b => {
    const ordersInBucket = enriched.filter(o => o.days >= b.min && o.days <= b.max);
    const total = ordersInBucket.reduce((s,o) => s + (o.total||0), 0);
    return { ...b, count: ordersInBucket.length, total };
  });

  const exportReceivablesCSV = () => {
    const headers = ["Order #","Customer","Phone","Email","Amount","Due Date","Days Overdue","Status","Payment Terms"];
    const rows = filtered.map(o => [
      "#"+o.id.slice(-6).toUpperCase(),
      (o.name||"").replace(/,/g," "),
      o.phone||"",
      o.email||"",
      o.total||0,
      o.dueDate ? formatDate(o.dueDate) : "—",
      o.days,
      o.bucket.label,
      findTerms(o.paymentTerms)?.label || o.paymentTerms || "—",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "receivables-"+new Date().toISOString().slice(0,10)+".csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>💰 Receivables ({filtered.length})</div>
          <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:3}}>Outstanding balances from credit-term orders</div>
        </div>
        <Btn variant="outline" size="sm" onClick={exportReceivablesCSV}>⬇️ Export CSV</Btn>
      </div>
      
      {/* Aging summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:20}}>
        {agingSummary.map(b=>(
          <div key={b.label} style={{padding:"12px 14px",background:b.bg,border:`1px solid ${b.color}40`,borderRadius:ds.radius.md,textAlign:"center"}}>
            <div style={{fontSize:10,fontWeight:700,color:b.color,textTransform:"uppercase",letterSpacing:"0.06em"}}>{b.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:b.color,marginTop:4}}>{b.count}</div>
            <div style={{fontSize:11,color:b.color,marginTop:2}}>{formatPHP(b.total)}</div>
          </div>
        ))}
      </div>
      
      {/* Total + Filters */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:"12px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,marginBottom:16}}>
        <div>
          <span style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Total Outstanding</span>
          <span style={{fontSize:18,fontWeight:700,color:ds.color.red,marginLeft:10}}>{formatPHP(totalOutstanding)}</span>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {id:"all",     label:`All (${enriched.length})`},
            {id:"current", label:`Current (${currentCount})`},
            {id:"overdue", label:`Overdue (${overdueCount})`},
          ].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{padding:"5px 12px",borderRadius:ds.radius.pill,border:`1px solid ${filter===f.id?ds.color.red:ds.color.border}`,background:filter===f.id?ds.color.redLight:"#fff",color:filter===f.id?ds.color.red:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{f.label}</button>
          ))}
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Search…" style={{padding:"5px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",width:140}}/>
        </div>
      </div>
      
      {/* Receivables list */}
      {filtered.length===0?(
        <div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted,fontSize:14}}>
          {enriched.length===0?"🎉 No outstanding receivables. All credit orders are paid!":"No receivables match the current filter."}
        </div>
      ):filtered.map(o=>(
        <div key={o.id} style={{border:`1px solid ${o.bucket.color}40`,borderLeft:`4px solid ${o.bucket.color}`,borderRadius:ds.radius.md,padding:"14px 18px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,background:"#fff"}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13.5,fontWeight:700,color:ds.color.textDark}}>#{o.id.slice(-6).toUpperCase()}</span>
              <span style={{fontSize:13,color:ds.color.textBody}}>{o.name||"Unknown"}</span>
              <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:ds.radius.pill,background:o.bucket.bg,color:o.bucket.color,textTransform:"uppercase",letterSpacing:"0.04em"}}>
                {o.days<=0?o.bucket.label:`${o.days} days overdue`}
              </span>
            </div>
            <div style={{fontSize:11.5,color:ds.color.textMuted,marginTop:4}}>
              {o.phone||"—"} · {o.email||"—"} · Due: {o.dueDate?formatDate(o.dueDate):"—"} · Terms: {findTerms(o.paymentTerms)?.label||"—"}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:16,fontWeight:700,color:o.bucket.color}}>{formatPHP(o.total||0)}</div>
            <button onClick={()=>{
              if(!confirm("Mark this order as paid?")) return;
              onMarkPaid(o.id);
            }} style={{marginTop:6,padding:"5px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.success}`,background:ds.color.successBg,color:ds.color.success,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:ds.font.body}}>✓ Mark Paid</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── v13.0a: CUSTOMER EDITOR MODAL ───────────────────────────────────────────
function CustomerEditorModal({ customer, onClose, onSaved }){
  const [data, setData] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    savedAddress: customer?.savedAddress || "",
    customerType: customer?.customerType || "individual",
    tags: customer?.tags || [],
    internalNotes: customer?.internalNotes || "",
  });
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  
  const handleSave = async () => {
    if (!data.name || !data.phone) { setErrMsg("Name and phone are required."); return; }
    setSaving(true); setErrMsg("");
    try {
      if (customer?.id) {
        await updateDoc(doc(db,"customers",customer.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db,"customers"), {
          ...data,
          source: "manual",
          totalOrders: 0, totalSpent: 0, points: 0,
          createdAt: serverTimestamp(),
        });
      }
      onSaved && onSaved();
      onClose();
    } catch(e) {
      setErrMsg("Failed to save: "+e.message);
    }
    setSaving(false);
  };
  
  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,fontFamily:ds.font.body,outline:"none",boxSizing:"border-box"};
  const lbl = {fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5};
  
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:600,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        <div style={{padding:"20px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>{customer?.id?"Edit Customer":"+ New Customer"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:ds.color.textMuted}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px 18px"}}>
          <div><label style={lbl}>Name *</label><input value={data.name} onChange={e=>setData({...data,name:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>Phone *</label><input value={data.phone} onChange={e=>setData({...data,phone:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>Email</label><input value={data.email} onChange={e=>setData({...data,email:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>Customer Type</label>
            <select value={data.customerType} onChange={e=>setData({...data,customerType:e.target.value})} style={{...inp,cursor:"pointer"}}>
              <option value="individual">Individual</option>
              <option value="institution">Institution</option>
              <option value="walkin">Walk-in</option>
            </select>
          </div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Address</label><textarea value={data.savedAddress} onChange={e=>setData({...data,savedAddress:e.target.value})} rows={2} style={{...inp,resize:"vertical"}}/></div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Tags</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {CUSTOMER_TAGS.map(tag=>{
                const active = data.tags.includes(tag.id);
                return(
                  <button key={tag.id} type="button" onClick={()=>{
                    const newTags = active ? data.tags.filter(t=>t!==tag.id) : [...data.tags, tag.id];
                    setData({...data,tags:newTags});
                  }} style={{padding:"4px 10px",borderRadius:ds.radius.pill,border:`1px solid ${active?tag.color:ds.color.border}`,background:active?tag.color:"#fff",color:active?"#fff":ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{tag.label}</button>
                );
              })}
            </div>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Internal Notes (admin only)</label>
            <textarea value={data.internalNotes} onChange={e=>setData({...data,internalNotes:e.target.value})} rows={3} placeholder="Special instructions, preferences, history…" style={{...inp,resize:"vertical"}}/>
          </div>
          {errMsg&&<div style={{gridColumn:"1/-1",padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
        </div>
        <div style={{padding:"16px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"flex-end",gap:8}}>
          <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" size="md" disabled={saving} onClick={handleSave}>{saving?"Saving…":"💾 Save"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── v13.0a: BACKUP UTILITY ──────────────────────────────────────────────────
async function performFullBackup(){
  try {
    const collections = ["orders","customers","products","rxUploads","expenses","manualBillings"];
    const backup = { exportedAt: new Date().toISOString(), exportedBy: "DMEAST Admin" };
    for (const col of collections) {
      const snap = await getDocs(collection(db, col));
      backup[col] = snap.docs.map(d => {
        const data = d.data();
        // Convert Firestore timestamps to ISO strings
        Object.keys(data).forEach(k => {
          if (data[k]?.toDate) data[k] = data[k].toDate().toISOString();
        });
        return { id: d.id, ...data };
      });
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dmeast-backup-"+new Date().toISOString().slice(0,10)+".json";
    a.click();
    URL.revokeObjectURL(url);
    // Mark backup completed
    localStorage.setItem("dmeast-last-backup", new Date().toISOString());
    return { ok: true, counts: collections.reduce((acc,c) => ({...acc,[c]:backup[c].length}), {}) };
  } catch(e) {
    console.error("Backup failed:", e);
    return { ok: false, error: e.message };
  }
}

function BackupReminder(){
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState("");
  
  useEffect(()=>{
    const last = localStorage.getItem("dmeast-last-backup");
    if (!last) { setShow(true); return; }
    const days = (Date.now() - new Date(last).getTime()) / (1000*60*60*24);
    if (days >= 7) setShow(true);
  },[]);
  
  if (!show) return null;
  
  const last = localStorage.getItem("dmeast-last-backup");
  const lastStr = last ? new Date(last).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"}) : "Never";
  
  const handleBackup = async () => {
    setBusy(true); setMsg("");
    const r = await performFullBackup();
    setBusy(false);
    if (r.ok) {
      setMsg("✓ Backup downloaded! "+Object.entries(r.counts).map(([k,v])=>`${k}: ${v}`).join(" · "));
      setTimeout(()=>setShow(false), 3000);
    } else {
      setMsg("⚠ Backup failed: "+r.error);
    }
  };
  
  return (
    <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.lg,padding:"14px 18px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:ds.color.gold}}>📥 Time for your weekly backup</div>
        <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>Last backup: {lastStr}. Download a full data backup as JSON.</div>
        {msg&&<div style={{fontSize:12,color:msg.startsWith("⚠")?ds.color.red:ds.color.success,marginTop:4,fontWeight:600}}>{msg}</div>}
      </div>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>setShow(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:ds.color.textMuted,fontFamily:ds.font.body,padding:"6px 10px"}}>Dismiss</button>
        <Btn variant="gold" size="sm" disabled={busy} onClick={handleBackup}>{busy?"Backing up…":"📥 Download Backup"}</Btn>
      </div>
    </div>
  );
}



// ─── v13.0b CONSTANTS ────────────────────────────────────────────────────────
// Expense categories
const EXPENSE_CATEGORIES = [
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

const EXPENSE_PAYMENT_STATUS = [
  { id: "paid",    label: "Paid",    color: "#10B981", bg: "#D1FAE5" },
  { id: "unpaid",  label: "Unpaid",  color: "#EF4444", bg: "#FEE2E2" },
  { id: "partial", label: "Partial", color: "#F59E0B", bg: "#FEF3C7" },
];

const findExpenseCategory = (id) => EXPENSE_CATEGORIES.find(c => c.id === id) || EXPENSE_CATEGORIES[8];

// ─── v13.0b: EXPENSE EDITOR MODAL ────────────────────────────────────────────
function ExpenseEditorModal({ expense, orders, onClose, onSaved }){
  const [data, setData] = useState({
    date: expense?.date ? (expense.date.toDate ? expense.date.toDate().toISOString().slice(0,10) : new Date(expense.date).toISOString().slice(0,10)) : new Date().toISOString().slice(0,10),
    vendor: expense?.vendor || "",
    category: expense?.category || "cogs",
    amount: expense?.amount || "",
    description: expense?.description || "",
    linkedOrderId: expense?.linkedOrderId || "",
    paymentStatus: expense?.paymentStatus || "paid",
    paymentMethod: expense?.paymentMethod || "",
    notes: expense?.notes || "",
    receiptUrl: expense?.receiptUrl || null,
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(expense?.receiptUrl || null);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  
  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); return; }
    e.target.value = "";
    setReceiptFile(file);
    const r = new FileReader();
    r.onload = ev => setReceiptPreview(ev.target.result);
    r.readAsDataURL(file);
  };
  
  const filteredOrders = orderSearch.trim()
    ? orders.filter(o => {
        const q = orderSearch.toLowerCase();
        return o.id.toLowerCase().includes(q) || (o.name||"").toLowerCase().includes(q);
      }).slice(0, 5)
    : [];

  const linkedOrder = data.linkedOrderId ? orders.find(o => o.id === data.linkedOrderId) : null;

  const handleSave = async () => {
    if (!data.vendor || !data.amount || !data.category) { setErrMsg("Vendor, amount, and category are required."); return; }
    setSaving(true); setErrMsg("");
    try {
      let receiptUrl = data.receiptUrl;
      // Upload receipt file if new one selected
      if (receiptFile) {
        try {
          const ext = receiptFile.name.split(".").pop() || "jpg";
          const path = "expenses/" + Date.now() + "-" + Math.random().toString(36).slice(2,8) + "." + ext;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, receiptFile);
          receiptUrl = await getDownloadURL(fileRef);
        } catch(uploadErr) {
          console.warn("Receipt upload failed:", uploadErr);
          setErrMsg("Receipt upload failed but expense will be saved. " + uploadErr.message);
        }
      }

      const payload = {
        date: new Date(data.date),
        vendor: data.vendor,
        category: data.category,
        amount: Number(data.amount),
        description: data.description || null,
        linkedOrderId: data.linkedOrderId || null,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
        receiptUrl: receiptUrl,
        updatedAt: serverTimestamp(),
      };

      if (expense?.id) {
        await updateDoc(doc(db, "expenses", expense.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "expenses"), payload);
      }
      onSaved && onSaved();
      onClose();
    } catch(e) {
      setErrMsg("Failed to save: " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!expense?.id) return;
    if (!confirm("Delete this expense entry? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "expenses", expense.id));
      onSaved && onSaved();
      onClose();
    } catch(e) {
      setErrMsg("Delete failed: " + e.message);
    }
  };

  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,fontFamily:ds.font.body,outline:"none",boxSizing:"border-box"};
  const lbl = {fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:720,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        <div style={{padding:"20px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>{expense?.id?"Edit Expense":"+ New Expense"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:ds.color.textMuted}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px 18px"}}>
            <div><label style={lbl}>Date *</label><input type="date" value={data.date} onChange={e=>setData({...data,date:e.target.value})} style={inp}/></div>
            <div><label style={lbl}>Vendor / Supplier *</label><input value={data.vendor} onChange={e=>setData({...data,vendor:e.target.value})} placeholder="e.g. MedSupply Inc" style={inp}/></div>
            <div><label style={lbl}>Category *</label>
              <select value={data.category} onChange={e=>setData({...data,category:e.target.value})} style={{...inp,cursor:"pointer"}}>
                {EXPENSE_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Amount *</label><input type="number" min="0" step="0.01" value={data.amount} onChange={e=>setData({...data,amount:e.target.value})} placeholder="e.g. 35000" style={inp}/></div>
            <div style={{gridColumn:"1/-1"}}><label style={lbl}>Description</label><input value={data.description} onChange={e=>setData({...data,description:e.target.value})} placeholder="What was this expense for?" style={inp}/></div>
            <div><label style={lbl}>Payment Status</label>
              <select value={data.paymentStatus} onChange={e=>setData({...data,paymentStatus:e.target.value})} style={{...inp,cursor:"pointer"}}>
                {EXPENSE_PAYMENT_STATUS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Payment Method</label>
              <input value={data.paymentMethod} onChange={e=>setData({...data,paymentMethod:e.target.value})} placeholder="Cash / Bank / GCash / Check" style={inp}/>
            </div>
            
            {/* Link to order (for COGS) */}
            {data.category === "cogs" && (
              <div style={{gridColumn:"1/-1",background:ds.color.canvas,padding:"12px 14px",borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`}}>
                <label style={lbl}>🔗 Link to Order (for COGS / margin tracking)</label>
                {linkedOrder ? (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#fff",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`}}>
                    <div>
                      <span style={{fontSize:13,fontWeight:700}}>#{linkedOrder.id.slice(-6).toUpperCase()}</span>
                      <span style={{fontSize:12,color:ds.color.textMuted,marginLeft:10}}>{linkedOrder.name} · {formatPHP(linkedOrder.total||0)}</span>
                    </div>
                    <button onClick={()=>setData({...data,linkedOrderId:""})} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.red}}>✕ Unlink</button>
                  </div>
                ) : (
                  <>
                    <input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="🔍 Search order # or customer name…" style={{...inp,padding:"8px 12px",fontSize:13}}/>
                    {filteredOrders.length>0 && (
                      <div style={{marginTop:6,maxHeight:140,overflowY:"auto",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.sm,background:"#fff"}}>
                        {filteredOrders.map(o=>(
                          <button key={o.id} onClick={()=>{setData({...data,linkedOrderId:o.id});setOrderSearch("");}} style={{display:"block",width:"100%",padding:"8px 12px",border:"none",borderBottom:`1px solid ${ds.color.borderLight}`,background:"#fff",cursor:"pointer",textAlign:"left",fontFamily:ds.font.body}}>
                            <div style={{fontSize:12.5,fontWeight:600}}>#{o.id.slice(-6).toUpperCase()} · {o.name}</div>
                            <div style={{fontSize:11,color:ds.color.textMuted}}>{formatPHP(o.total||0)}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            {/* Receipt upload */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>📎 Receipt / Invoice Photo</label>
              <div style={{border:`2px dashed ${receiptPreview?ds.color.success:ds.color.border}`,borderRadius:ds.radius.md,padding:16,background:receiptPreview?ds.color.successBg:ds.color.canvas,textAlign:"center"}}>
                {receiptPreview ? (
                  <div>
                    {receiptPreview.startsWith("data:application/pdf")||receiptPreview.toLowerCase().endsWith(".pdf") ? (
                      <div style={{fontSize:32,marginBottom:8}}>📄</div>
                    ) : (
                      <img src={receiptPreview} alt="Receipt" style={{maxWidth:200,maxHeight:160,objectFit:"contain",borderRadius:ds.radius.sm,margin:"0 auto",display:"block"}}/>
                    )}
                    <div style={{fontSize:12,color:ds.color.success,marginTop:8,fontWeight:600}}>✓ Receipt attached</div>
                    <button onClick={()=>{setReceiptFile(null);setReceiptPreview(null);setData({...data,receiptUrl:null});}} style={{marginTop:6,background:"none",border:"none",color:ds.color.red,cursor:"pointer",fontSize:12,fontFamily:ds.font.body}}>Remove</button>
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:24,marginBottom:6}}>📎</div>
                    <label htmlFor="exp-receipt-input" style={{display:"inline-block",padding:"8px 16px",borderRadius:ds.radius.sm,border:`1.5px solid ${ds.color.red}`,background:ds.color.redLight,cursor:"pointer",fontSize:12,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body}}>📷 Upload Receipt</label>
                    <input id="exp-receipt-input" type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} style={{display:"none"}}/>
                    <div style={{fontSize:11,color:ds.color.textLight,marginTop:8}}>JPG, PNG, PDF · Max 10MB</div>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Notes</label>
              <textarea value={data.notes} onChange={e=>setData({...data,notes:e.target.value})} rows={2} placeholder="Optional notes…" style={{...inp,resize:"vertical"}}/>
            </div>
            
            {errMsg && <div style={{gridColumn:"1/-1",padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
          </div>
        </div>
        <div style={{padding:"16px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            {expense?.id && <button onClick={handleDelete} style={{background:"none",border:`1px solid ${ds.color.red}`,color:ds.color.red,padding:"6px 12px",borderRadius:ds.radius.sm,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:ds.font.body}}>🗑️ Delete</button>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" size="md" disabled={saving} onClick={handleSave}>{saving?"Saving…":"💾 Save Expense"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── v13.0b: EXPENSES TAB ────────────────────────────────────────────────────
function ExpensesTab({ expenses, orders, onEdit, onNew, onRefresh }){
  const [filter, setFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [dateRange, setDateRange] = useState("month"); // month/year/all
  
  // Apply date filter
  const now = new Date();
  const filterByDate = (exp) => {
    if (dateRange === "all") return true;
    const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
    if (dateRange === "month") {
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    }
    if (dateRange === "year") {
      return expDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filtered = expenses.filter(e => {
    if (!filterByDate(e)) return false;
    if (filter !== "all" && e.category !== filter) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      return (e.vendor||"").toLowerCase().includes(q) ||
             (e.description||"").toLowerCase().includes(q);
    }
    return true;
  });
  
  // Sort: most recent first
  filtered.sort((a,b) => {
    const aD = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
    const bD = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
    return bD - aD;
  });

  const totalAmount = filtered.reduce((s,e) => s + (Number(e.amount)||0), 0);
  const cogsTotal = filtered.filter(e => e.category === "cogs").reduce((s,e) => s + (Number(e.amount)||0), 0);
  const opexTotal = filtered.filter(e => e.category !== "cogs").reduce((s,e) => s + (Number(e.amount)||0), 0);
  const unpaidTotal = filtered.filter(e => e.paymentStatus === "unpaid").reduce((s,e) => s + (Number(e.amount)||0), 0);

  // Category breakdown
  const byCategory = EXPENSE_CATEGORIES.map(cat => {
    const items = filtered.filter(e => e.category === cat.id);
    return { ...cat, count: items.length, total: items.reduce((s,e)=>s+(Number(e.amount)||0),0) };
  }).filter(c => c.count > 0).sort((a,b) => b.total - a.total);

  const exportCSV = () => {
    const headers = ["Date","Vendor","Category","Amount","Description","Linked Order","Status","Method","Notes"];
    const rows = filtered.map(e => {
      const cat = findExpenseCategory(e.category);
      const linkedOrder = e.linkedOrderId ? orders.find(o=>o.id===e.linkedOrderId) : null;
      return [
        formatDate(e.date),
        (e.vendor||"").replace(/,/g," "),
        cat.label,
        e.amount||0,
        (e.description||"").replace(/,/g," "),
        linkedOrder ? "#"+linkedOrder.id.slice(-6).toUpperCase() : "",
        e.paymentStatus||"",
        (e.paymentMethod||"").replace(/,/g," "),
        (e.notes||"").replace(/,/g," "),
      ];
    });
    const csv = [headers, ...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "expenses-"+new Date().toISOString().slice(0,10)+".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>🏢 Expenses ({filtered.length})</div>
          <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:3}}>Track DMEAST's costs — supplier bills, office, transport, utilities</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="primary" size="sm" onClick={onNew}>+ New Expense</Btn>
          <Btn variant="outline" size="sm" onClick={exportCSV}>⬇️ CSV</Btn>
        </div>
      </div>
      
      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid ${ds.color.red}`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Total Spent</div>
          <div style={{fontSize:18,fontWeight:700,color:ds.color.red,marginTop:4}}>{formatPHP(totalAmount)}</div>
        </div>
        <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid #EF4444`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>COGS</div>
          <div style={{fontSize:18,fontWeight:700,color:"#EF4444",marginTop:4}}>{formatPHP(cogsTotal)}</div>
        </div>
        <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid #3B82F6`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>OpEx</div>
          <div style={{fontSize:18,fontWeight:700,color:"#3B82F6",marginTop:4}}>{formatPHP(opexTotal)}</div>
        </div>
        <div style={{padding:"14px 16px",background:unpaidTotal>0?"#FEE2E2":ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid ${unpaidTotal>0?ds.color.red:"#10B981"}`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Unpaid Bills</div>
          <div style={{fontSize:18,fontWeight:700,color:unpaidTotal>0?ds.color.red:"#10B981",marginTop:4}}>{formatPHP(unpaidTotal)}</div>
        </div>
      </div>
      
      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Search vendor/description…" style={{padding:"6px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",width:200}}/>
        <select value={dateRange} onChange={e=>setDateRange(e.target.value)} style={{padding:"6px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",cursor:"pointer"}}>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
        <button onClick={()=>setFilter("all")} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${filter==="all"?ds.color.red:ds.color.border}`,background:filter==="all"?ds.color.redLight:"#fff",color:filter==="all"?ds.color.red:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>All Categories</button>
        {EXPENSE_CATEGORIES.map(c=>(
          <button key={c.id} onClick={()=>setFilter(c.id)} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${filter===c.id?c.color:ds.color.border}`,background:filter===c.id?c.color+"22":"#fff",color:filter===c.id?c.color:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{c.icon} {c.label}</button>
        ))}
      </div>
      
      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div style={{padding:"12px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Breakdown by Category</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {byCategory.map(c=>(
              <div key={c.id} style={{padding:"4px 10px",background:c.color+"22",borderRadius:ds.radius.pill,fontSize:11.5,color:c.color,fontWeight:600}}>
                {c.icon} {c.label}: {formatPHP(c.total)} ({c.count})
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* List */}
      {filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted,fontSize:14}}>
          {expenses.length===0 ? "No expenses yet. Click \"+ New Expense\" to add one." : "No expenses match the current filter."}
        </div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:`2px solid ${ds.color.border}`}}>
              {["Date","Vendor","Category","Description","Linked","Amount","Status","",""].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontWeight:700,color:ds.color.textDark,fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(e=>{
                const cat = findExpenseCategory(e.category);
                const status = EXPENSE_PAYMENT_STATUS.find(s=>s.id===e.paymentStatus) || EXPENSE_PAYMENT_STATUS[0];
                const linkedOrder = e.linkedOrderId ? orders.find(o=>o.id===e.linkedOrderId) : null;
                return(
                  <tr key={e.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                    <td style={{padding:"10px 12px",color:ds.color.textBody,fontSize:12}}>{formatDate(e.date)}</td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:ds.color.textDark}}>{e.vendor||"—"}</td>
                    <td style={{padding:"10px 12px"}}><span style={{fontSize:11,padding:"3px 8px",borderRadius:ds.radius.pill,background:cat.color+"22",color:cat.color,fontWeight:600}}>{cat.icon} {cat.label}</span></td>
                    <td style={{padding:"10px 12px",color:ds.color.textMuted,fontSize:12,maxWidth:200}}>{e.description||"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:11.5}}>{linkedOrder ? <span style={{color:ds.color.red,fontWeight:600}}>#{linkedOrder.id.slice(-6).toUpperCase()}</span> : <span style={{color:ds.color.textLight}}>—</span>}</td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:ds.color.textDark}}>{formatPHP(e.amount||0)}</td>
                    <td style={{padding:"10px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:ds.radius.pill,background:status.bg,color:status.color,fontWeight:700,textTransform:"uppercase"}}>{status.label}</span></td>
                    <td style={{padding:"10px 12px"}}>{e.receiptUrl?<a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:ds.color.red,fontWeight:600,textDecoration:"underline"}}>📎 View</a>:<span style={{color:ds.color.textLight,fontSize:11}}>—</span>}</td>
                    <td style={{padding:"10px 12px"}}><button onClick={()=>onEdit(e)} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.textBody,fontFamily:ds.font.body}}>✏️ Edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── v13.0b: MANUAL BILLING EDITOR ───────────────────────────────────────────
const MANUAL_BILLING_STATUS = [
  { id: "draft",     label: "Draft",     color: "#6B7280", bg: "#F3F4F6" },
  { id: "sent",      label: "Sent",      color: "#3B82F6", bg: "#DBEAFE" },
  { id: "paid",      label: "Paid",      color: "#10B981", bg: "#D1FAE5" },
  { id: "cancelled", label: "Cancelled", color: "#EF4444", bg: "#FEE2E2" },
];

function ManualBillingEditorModal({ billing, onClose, onSaved }){
  const [data, setData] = useState({
    date: billing?.date ? (billing.date.toDate ? billing.date.toDate().toISOString().slice(0,10) : new Date(billing.date).toISOString().slice(0,10)) : new Date().toISOString().slice(0,10),
    billTo: billing?.billTo || "",
    contactInfo: billing?.contactInfo || "",
    description: billing?.description || "",
    amount: billing?.amount || "",
    status: billing?.status || "draft",
    notes: billing?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleSave = async () => {
    if (!data.billTo || !data.amount || !data.description) {
      setErrMsg("Bill To, description, and amount are required.");
      return;
    }
    setSaving(true); setErrMsg("");
    try {
      const payload = {
        date: new Date(data.date),
        billTo: data.billTo,
        contactInfo: data.contactInfo || null,
        description: data.description,
        amount: Number(data.amount),
        status: data.status,
        notes: data.notes || null,
        paidAt: data.status === "paid" ? serverTimestamp() : (billing?.paidAt || null),
        updatedAt: serverTimestamp(),
      };

      if (billing?.id) {
        await updateDoc(doc(db, "manualBillings", billing.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "manualBillings"), payload);
      }
      onSaved && onSaved();
      onClose();
    } catch(e) {
      setErrMsg("Failed to save: " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!billing?.id) return;
    if (!confirm("Delete this manual billing? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "manualBillings", billing.id));
      onSaved && onSaved();
      onClose();
    } catch(e) {
      setErrMsg("Delete failed: " + e.message);
    }
  };

  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,fontFamily:ds.font.body,outline:"none",boxSizing:"border-box"};
  const lbl = {fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:600,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        <div style={{padding:"20px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>{billing?.id?"Edit Manual Billing":"+ New Manual Billing"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:ds.color.textMuted}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px 18px"}}>
          <div><label style={lbl}>Date *</label><input type="date" value={data.date} onChange={e=>setData({...data,date:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>Status</label>
            <select value={data.status} onChange={e=>setData({...data,status:e.target.value})} style={{...inp,cursor:"pointer"}}>
              {MANUAL_BILLING_STATUS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Bill To *</label><input value={data.billTo} onChange={e=>setData({...data,billTo:e.target.value})} placeholder="Customer/client name" style={inp}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Contact Info</label><input value={data.contactInfo} onChange={e=>setData({...data,contactInfo:e.target.value})} placeholder="Phone or email" style={inp}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Description *</label><textarea value={data.description} onChange={e=>setData({...data,description:e.target.value})} rows={2} placeholder="What is being billed?" style={{...inp,resize:"vertical"}}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Amount *</label><input type="number" min="0" step="0.01" value={data.amount} onChange={e=>setData({...data,amount:e.target.value})} placeholder="e.g. 5000" style={inp}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Notes</label><textarea value={data.notes} onChange={e=>setData({...data,notes:e.target.value})} rows={2} placeholder="Optional notes…" style={{...inp,resize:"vertical"}}/></div>
          {errMsg && <div style={{gridColumn:"1/-1",padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
        </div>
        <div style={{padding:"16px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            {billing?.id && <button onClick={handleDelete} style={{background:"none",border:`1px solid ${ds.color.red}`,color:ds.color.red,padding:"6px 12px",borderRadius:ds.radius.sm,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:ds.font.body}}>🗑️ Delete</button>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" size="md" disabled={saving} onClick={handleSave}>{saving?"Saving…":"💾 Save"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── v13.0b: MANUAL BILLINGS TAB ─────────────────────────────────────────────
function ManualBillingsTab({ billings, onEdit, onNew }){
  const [filter, setFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  
  const filtered = billings.filter(b => {
    if (filter !== "all" && b.status !== filter) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      return (b.billTo||"").toLowerCase().includes(q) ||
             (b.description||"").toLowerCase().includes(q);
    }
    return true;
  }).sort((a,b)=>{
    const aD = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
    const bD = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
    return bD - aD;
  });

  const totalBilled = filtered.reduce((s,b) => s + (Number(b.amount)||0), 0);
  const totalPaid = filtered.filter(b=>b.status==="paid").reduce((s,b) => s + (Number(b.amount)||0), 0);
  const totalOutstanding = filtered.filter(b=>b.status==="sent" || b.status==="draft").reduce((s,b) => s + (Number(b.amount)||0), 0);

  const exportCSV = () => {
    const headers = ["Date","Bill To","Description","Amount","Status","Contact","Notes"];
    const rows = filtered.map(b => [
      formatDate(b.date),
      (b.billTo||"").replace(/,/g," "),
      (b.description||"").replace(/,/g," "),
      b.amount||0,
      b.status||"",
      (b.contactInfo||"").replace(/,/g," "),
      (b.notes||"").replace(/,/g," "),
    ]);
    const csv = [headers, ...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "manual-billings-"+new Date().toISOString().slice(0,10)+".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>📝 Manual Billings ({filtered.length})</div>
          <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:3}}>Off-system invoices for special clients (verbal agreements, services, etc)</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="primary" size="sm" onClick={onNew}>+ New Billing</Btn>
          <Btn variant="outline" size="sm" onClick={exportCSV}>⬇️ CSV</Btn>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid ${ds.color.red}`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Total Billed</div>
          <div style={{fontSize:18,fontWeight:700,color:ds.color.red,marginTop:4}}>{formatPHP(totalBilled)}</div>
        </div>
        <div style={{padding:"14px 16px",background:ds.color.successBg,borderRadius:ds.radius.md,borderTop:`3px solid ${ds.color.success}`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Paid</div>
          <div style={{fontSize:18,fontWeight:700,color:ds.color.success,marginTop:4}}>{formatPHP(totalPaid)}</div>
        </div>
        <div style={{padding:"14px 16px",background:totalOutstanding>0?"#FEF3C7":ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid #F59E0B`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Outstanding</div>
          <div style={{fontSize:18,fontWeight:700,color:"#F59E0B",marginTop:4}}>{formatPHP(totalOutstanding)}</div>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Search billings…" style={{padding:"6px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",width:200}}/>
        <button onClick={()=>setFilter("all")} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${filter==="all"?ds.color.red:ds.color.border}`,background:filter==="all"?ds.color.redLight:"#fff",color:filter==="all"?ds.color.red:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>All</button>
        {MANUAL_BILLING_STATUS.map(s=>(
          <button key={s.id} onClick={()=>setFilter(s.id)} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${filter===s.id?s.color:ds.color.border}`,background:filter===s.id?s.bg:"#fff",color:filter===s.id?s.color:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{s.label}</button>
        ))}
      </div>

      {filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted,fontSize:14}}>
          {billings.length===0?"No manual billings yet. Click \"+ New Billing\" to add one.":"No billings match the current filter."}
        </div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:`2px solid ${ds.color.border}`}}>
              {["Date","Bill To","Description","Amount","Status","Contact",""].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontWeight:700,color:ds.color.textDark,fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(b=>{
                const status = MANUAL_BILLING_STATUS.find(s=>s.id===b.status) || MANUAL_BILLING_STATUS[0];
                return(
                  <tr key={b.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                    <td style={{padding:"10px 12px",color:ds.color.textBody,fontSize:12}}>{formatDate(b.date)}</td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:ds.color.textDark}}>{b.billTo||"—"}</td>
                    <td style={{padding:"10px 12px",color:ds.color.textMuted,fontSize:12,maxWidth:240}}>{b.description||"—"}</td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:ds.color.textDark}}>{formatPHP(b.amount||0)}</td>
                    <td style={{padding:"10px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:ds.radius.pill,background:status.bg,color:status.color,fontWeight:700,textTransform:"uppercase"}}>{status.label}</span></td>
                    <td style={{padding:"10px 12px",fontSize:12,color:ds.color.textMuted}}>{b.contactInfo||"—"}</td>
                    <td style={{padding:"10px 12px"}}><button onClick={()=>onEdit(b)} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.textBody,fontFamily:ds.font.body}}>✏️ Edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── v13.0b: MARGIN DASHBOARD ────────────────────────────────────────────────
function MarginDashboardTab({ orders, expenses }){
  const [dateRange, setDateRange] = useState("month"); // month/year/all
  
  const now = new Date();
  const filterByDate = (item) => {
    if (dateRange === "all") return true;
    const d = item.createdAt?.toDate ? item.createdAt.toDate() : (item.date?.toDate ? item.date.toDate() : new Date(item.createdAt || item.date));
    if (dateRange === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateRange === "year") return d.getFullYear() === now.getFullYear();
    return true;
  };
  
  // Filter only paid/confirmed orders with revenue
  const validOrders = orders.filter(o => 
    filterByDate(o) && 
    o.status !== "cancelled" && 
    o.status !== "out_of_stock" &&
    (o.total || 0) > 0
  );
  
  const totalRevenue = validOrders.reduce((s,o) => s + (o.total||0), 0);
  
  // COGS — sum of:
  //   1. Order's supplierCost field (manual entry from NewOrderModal)
  //   2. Expenses linked to orders via linkedOrderId
  const orderCOGSMap = {};
  validOrders.forEach(o => {
    if (o.supplierCost) orderCOGSMap[o.id] = (orderCOGSMap[o.id] || 0) + Number(o.supplierCost);
  });
  expenses.filter(filterByDate).forEach(e => {
    if (e.linkedOrderId && e.category === "cogs") {
      orderCOGSMap[e.linkedOrderId] = (orderCOGSMap[e.linkedOrderId] || 0) + Number(e.amount || 0);
    }
  });
  
  const totalCOGS = Object.values(orderCOGSMap).reduce((s,v) => s + v, 0);
  
  // OpEx (operating expenses, not COGS)
  const totalOpEx = expenses.filter(e => filterByDate(e) && e.category !== "cogs")
    .reduce((s,e) => s + (Number(e.amount)||0), 0);
  
  const grossMargin = totalRevenue - totalCOGS;
  const netProfit = grossMargin - totalOpEx;
  const grossMarginPct = totalRevenue > 0 ? (grossMargin / totalRevenue * 100) : 0;
  const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;
  
  // Per-order breakdown (orders with COGS data)
  const ordersWithMargin = validOrders.map(o => {
    const cogs = orderCOGSMap[o.id] || 0;
    const margin = (o.total || 0) - cogs;
    const marginPct = (o.total||0) > 0 ? (margin / (o.total||0) * 100) : 0;
    return { ...o, cogs, margin, marginPct, hasCOGS: cogs > 0 };
  }).filter(o => o.hasCOGS).sort((a,b) => b.margin - a.margin);
  
  // Top customers by revenue
  const customerMap = {};
  validOrders.forEach(o => {
    const key = o.customerId || o.uid || o.email || o.name || "unknown";
    if (!customerMap[key]) customerMap[key] = { name: o.name||"Unknown", revenue: 0, cogs: 0, orders: 0 };
    customerMap[key].revenue += (o.total || 0);
    customerMap[key].cogs += orderCOGSMap[o.id] || 0;
    customerMap[key].orders += 1;
  });
  const topCustomers = Object.values(customerMap)
    .map(c => ({ ...c, margin: c.revenue - c.cogs, marginPct: c.revenue > 0 ? ((c.revenue - c.cogs)/c.revenue*100) : 0 }))
    .sort((a,b) => b.revenue - a.revenue)
    .slice(0, 10);
    
  // Top products by revenue
  const productMap = {};
  validOrders.forEach(o => {
    (o.items||[]).forEach(item => {
      const key = item.id || item.name;
      if (!productMap[key]) productMap[key] = { name: item.name, revenue: 0, qty: 0 };
      productMap[key].revenue += (item.price * item.qty);
      productMap[key].qty += item.qty;
    });
  });
  const topProducts = Object.values(productMap).sort((a,b) => b.revenue - a.revenue).slice(0, 10);
  
  // Source breakdown
  const sourceMap = {};
  ORDER_SOURCES.forEach(s => sourceMap[s.id] = { ...s, revenue: 0, count: 0 });
  validOrders.forEach(o => {
    const src = o.source || "website";
    if (sourceMap[src]) {
      sourceMap[src].revenue += (o.total || 0);
      sourceMap[src].count += 1;
    }
  });
  const sourceBreakdown = Object.values(sourceMap).filter(s => s.count > 0).sort((a,b) => b.revenue - a.revenue);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>📈 Margin Dashboard</div>
          <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:3}}>Profit analysis — revenue, COGS, operating expenses, and net margin</div>
        </div>
        <select value={dateRange} onChange={e=>setDateRange(e.target.value)} style={{padding:"8px 14px",borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,fontSize:13,fontFamily:ds.font.body,outline:"none",cursor:"pointer",background:"#fff"}}>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>
      
      {/* Big numbers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderTop:`3px solid ${ds.color.red}`,borderRadius:ds.radius.lg,padding:"18px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Revenue</div>
          <div style={{fontSize:22,fontWeight:700,color:ds.color.red,marginTop:6,fontFamily:ds.font.display}}>{formatPHP(totalRevenue)}</div>
          <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>{validOrders.length} orders</div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderTop:`3px solid #EF4444`,borderRadius:ds.radius.lg,padding:"18px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Cost of Goods</div>
          <div style={{fontSize:22,fontWeight:700,color:"#EF4444",marginTop:6,fontFamily:ds.font.display}}>{formatPHP(totalCOGS)}</div>
          <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>Direct product costs</div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderTop:`3px solid ${grossMargin>=0?ds.color.success:ds.color.red}`,borderRadius:ds.radius.lg,padding:"18px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Gross Margin</div>
          <div style={{fontSize:22,fontWeight:700,color:grossMargin>=0?ds.color.success:ds.color.red,marginTop:6,fontFamily:ds.font.display}}>{formatPHP(grossMargin)}</div>
          <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>{grossMarginPct.toFixed(1)}% of revenue</div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderTop:`3px solid ${netProfit>=0?ds.color.success:ds.color.red}`,borderRadius:ds.radius.lg,padding:"18px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Net Profit</div>
          <div style={{fontSize:22,fontWeight:700,color:netProfit>=0?ds.color.success:ds.color.red,marginTop:6,fontFamily:ds.font.display}}>{formatPHP(netProfit)}</div>
          <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>After OpEx ({formatPHP(totalOpEx)})</div>
        </div>
      </div>
      
      {/* P&L summary */}
      <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs,marginBottom:20}}>
        <div style={{fontFamily:ds.font.display,fontSize:16,color:ds.color.textDark,marginBottom:16}}>Profit & Loss Summary</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px 16px"}}>
          <div style={{fontSize:13,color:ds.color.textBody}}>Revenue</div>
          <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark,textAlign:"right"}}>{formatPHP(totalRevenue)}</div>
          <div style={{fontSize:13,color:ds.color.textMuted,paddingLeft:16}}>Less: Cost of Goods Sold</div>
          <div style={{fontSize:13,color:"#EF4444",textAlign:"right"}}>({formatPHP(totalCOGS)})</div>
          <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark,paddingTop:8,borderTop:`1px solid ${ds.color.border}`}}>Gross Margin</div>
          <div style={{fontSize:13,fontWeight:700,color:grossMargin>=0?ds.color.success:ds.color.red,textAlign:"right",paddingTop:8,borderTop:`1px solid ${ds.color.border}`}}>{formatPHP(grossMargin)} ({grossMarginPct.toFixed(1)}%)</div>
          <div style={{fontSize:13,color:ds.color.textMuted,paddingLeft:16}}>Less: Operating Expenses</div>
          <div style={{fontSize:13,color:"#EF4444",textAlign:"right"}}>({formatPHP(totalOpEx)})</div>
          <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark,paddingTop:8,borderTop:`2px solid ${ds.color.textDark}`}}>Net Profit</div>
          <div style={{fontSize:15,fontWeight:700,color:netProfit>=0?ds.color.success:ds.color.red,textAlign:"right",paddingTop:8,borderTop:`2px solid ${ds.color.textDark}`}}>{formatPHP(netProfit)} ({netMarginPct.toFixed(1)}%)</div>
        </div>
        {totalCOGS === 0 && validOrders.length > 0 && (
          <div style={{marginTop:14,padding:"10px 14px",background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,fontSize:12,color:ds.color.gold}}>
            💡 No COGS data yet. Add supplier costs when creating orders, or link expenses to specific orders to see your true profit margins.
          </div>
        )}
      </div>
      
      {/* Two-column: Top Customers + Top Products */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:20}}>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontFamily:ds.font.display,fontSize:15,color:ds.color.textDark,marginBottom:14}}>👑 Top Customers</div>
          {topCustomers.length===0?(
            <div style={{textAlign:"center",padding:"20px 0",color:ds.color.textLight,fontSize:13}}>No data for this period</div>
          ):topCustomers.map((c,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<topCustomers.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i+1}. {c.name}</div>
                <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>{c.orders} order{c.orders!==1?"s":""}{c.cogs>0?` · ${c.marginPct.toFixed(0)}% margin`:""}</div>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:ds.color.red}}>{formatPHP(c.revenue)}</div>
            </div>
          ))}
        </div>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontFamily:ds.font.display,fontSize:15,color:ds.color.textDark,marginBottom:14}}>🥇 Top Products</div>
          {topProducts.length===0?(
            <div style={{textAlign:"center",padding:"20px 0",color:ds.color.textLight,fontSize:13}}>No data for this period</div>
          ):topProducts.map((p,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<topProducts.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i+1}. {p.name}</div>
                <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>{p.qty} unit{p.qty!==1?"s":""}</div>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:ds.color.red}}>{formatPHP(p.revenue)}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Source breakdown */}
      <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs,marginBottom:20}}>
        <div style={{fontFamily:ds.font.display,fontSize:15,color:ds.color.textDark,marginBottom:14}}>🌐 Revenue by Source Channel</div>
        {sourceBreakdown.length===0?(
          <div style={{textAlign:"center",padding:"20px 0",color:ds.color.textLight,fontSize:13}}>No data for this period</div>
        ):sourceBreakdown.map(s=>{
          const pct = totalRevenue > 0 ? (s.revenue / totalRevenue * 100) : 0;
          return(
            <div key={s.id} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:ds.color.textBody,fontWeight:600}}>{s.icon} {s.label} <span style={{color:ds.color.textMuted,fontWeight:400,marginLeft:4}}>({s.count} order{s.count!==1?"s":""})</span></span>
                <span style={{color:ds.color.textDark,fontWeight:700}}>{formatPHP(s.revenue)} · {pct.toFixed(1)}%</span>
              </div>
              <div style={{height:6,background:ds.color.borderLight,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:pct+"%",background:s.color,borderRadius:3,transition:"width 0.3s"}}/>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Per-order margins (orders with COGS) */}
      {ordersWithMargin.length > 0 && (
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontFamily:ds.font.display,fontSize:15,color:ds.color.textDark,marginBottom:14}}>💼 Top Margin Orders ({ordersWithMargin.length} orders with COGS data)</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
              <thead><tr style={{borderBottom:`2px solid ${ds.color.border}`}}>
                {["Order","Customer","Revenue","COGS","Margin","Margin %"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",fontWeight:700,fontSize:10.5,color:ds.color.textDark,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {ordersWithMargin.slice(0,15).map(o=>(
                  <tr key={o.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                    <td style={{padding:"8px 10px",fontWeight:600,color:ds.color.red}}>#{o.id.slice(-6).toUpperCase()}</td>
                    <td style={{padding:"8px 10px",color:ds.color.textBody}}>{o.name}</td>
                    <td style={{padding:"8px 10px",color:ds.color.textDark,fontWeight:600}}>{formatPHP(o.total||0)}</td>
                    <td style={{padding:"8px 10px",color:"#EF4444"}}>{formatPHP(o.cogs)}</td>
                    <td style={{padding:"8px 10px",color:o.margin>=0?ds.color.success:ds.color.red,fontWeight:700}}>{formatPHP(o.margin)}</td>
                    <td style={{padding:"8px 10px"}}>
                      <span style={{fontSize:11,padding:"2px 7px",borderRadius:ds.radius.pill,background:o.marginPct>=20?ds.color.successBg:o.marginPct>=10?"#FEF3C7":"#FEE2E2",color:o.marginPct>=20?ds.color.success:o.marginPct>=10?"#92400E":ds.color.red,fontWeight:700}}>{o.marginPct.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── v13.0c: ORDER EDITOR MODAL ──────────────────────────────────────────────
// Lets admin edit any field on an existing order: customer info, items, charges,
// payment method, source, status, supplier cost, notes, address, recipient
function OrderEditorModal({ order, products: existingProducts, onClose, onSaved, onDeleted, onGeneratePDF, showMarginFields = true, canDelete = true, canEdit = true }){
  const [tab, setTab] = useState("info"); // info | items | details
  
  // Customer info
  const [name, setName]               = useState(order.name || "");
  const [email, setEmail]             = useState(order.email || "");
  const [phone, setPhone]             = useState(order.phone || "");
  const [address, setAddress]         = useState(order.address || "");
  const [instructions, setInstructions] = useState(order.instructions || "");
  
  // Recipient (if for someone else)
  const [hasRecipient, setHasRecipient] = useState(!!order.recipientName);
  const [recipientName, setRecipientName]   = useState(order.recipientName || "");
  const [recipientPhone, setRecipientPhone] = useState(order.recipientPhone || "");
  
  // Items + charges
  const [items, setItems] = useState(
    (order.items || []).map(i => ({
      productId: i.id, name: i.name,
      qty: i.qty || 1, unitPrice: i.price || 0,
      requiresPrescription: !!i.requiresPrescription,
    }))
  );
  const [otherCharges, setOtherCharges] = useState(order.otherCharges || []);
  const [productSearch, setProductSearch] = useState("");
  
  // Order details
  const [source, setSource]               = useState(order.source || "website");
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod || "");
  const [paymentTerms, setPaymentTerms]   = useState(order.paymentTerms || "");
  const [paymentTermsNotes, setTermsNotes]= useState(order.paymentTermsNotes || "");
  const [internalNotes, setInternalNotes] = useState(order.internalNotes || "");
  const [supplierCost, setSupplierCost]   = useState(order.supplierCost || "");
  const [supplierName, setSupplierName]   = useState(order.supplierName || "");
  const [orderStatus, setOrderStatus]     = useState(order.status || "pending");
  const [paymentStatusValue, setPaymentStatusValue] = useState(order.paymentStatus || "awaiting");
  
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  
  // Recalculate totals
  const itemsTotal = items.reduce((s,i) => s + (i.qty * i.unitPrice), 0);
  const chargesTotal = otherCharges.reduce((s,c) => s + (Number(c.amount)||0), 0);
  const total = itemsTotal + chargesTotal;
  const margin = supplierCost ? total - Number(supplierCost) : null;
  
  const filteredProducts = productSearch.trim()
    ? existingProducts.filter(p => {
        const q = productSearch.toLowerCase();
        return (p.name||"").toLowerCase().includes(q) ||
               (p.tag||"").toLowerCase().includes(q);
      }).slice(0, 6)
    : [];
  
  const addProduct = (p) => {
    const existing = items.find(i => i.productId === p.id);
    if (existing) {
      setItems(items.map(i => i.productId === p.id ? {...i, qty: i.qty + 1} : i));
    } else {
      setItems([...items, {
        productId: p.id, name: p.name,
        qty: 1, unitPrice: p.price || 0,
        requiresPrescription: !!p.requiresPrescription,
      }]);
    }
    setProductSearch("");
  };
  
  const updateItem = (idx, field, value) => {
    const arr = [...items];
    if (field === "qty") arr[idx].qty = Math.max(1, Number(value) || 1);
    else if (field === "unitPrice") arr[idx].unitPrice = Math.max(0, Number(value) || 0);
    else arr[idx][field] = value;
    setItems(arr);
  };
  
  const removeItem = (idx) => setItems(items.filter((_,i) => i !== idx));
  
  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) { setErrMsg("Name and phone are required."); return; }
    if (items.length === 0) { setErrMsg("Order must have at least one item."); return; }
    
    setSaving(true); setErrMsg("");
    try {
      // Build update payload — only include fields we want to update
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim(),
        address: address.trim() || null,
        instructions: instructions.trim() || null,
        recipientName: hasRecipient ? (recipientName.trim() || null) : null,
        recipientPhone: hasRecipient ? (recipientPhone.trim() || null) : null,
        items: items.map(i => ({
          id: i.productId, name: i.name,
          price: i.unitPrice, qty: i.qty,
          requiresPrescription: !!i.requiresPrescription,
        })),
        otherCharges: otherCharges.filter(c => c.description && c.amount),
        total,
        source: source,
        paymentMethod: paymentMethod || null,
        paymentTerms: paymentTerms || null,
        paymentTermsNotes: paymentTermsNotes || null,
        internalNotes: internalNotes || null,
        supplierCost: supplierCost ? Number(supplierCost) : null,
        supplierName: supplierName || null,
        margin: margin,
        status: orderStatus,
        paymentStatus: paymentStatusValue,
        // Audit trail: track edit
        lastEditedAt: serverTimestamp(),
        lastEditedBy: "admin",
      };
      
      await updateDoc(doc(db, "orders", order.id), payload);
      
      // v13.0d: Send email if status changed
      const statusChanged = order.status !== orderStatus;
      const paymentChanged = order.paymentStatus !== paymentStatusValue;
      if ((statusChanged || paymentChanged) && payload.email) {
        const orderRef = order.id.slice(-6).toUpperCase();
        const updatedOrder = { ...order, ...payload };
        let subject = `ORDER #${orderRef} — Updated`;
        let body = `Dear ${updatedOrder.name||"Customer"},\n\nYour order #${orderRef} has been updated.\n\n`;
        if (statusChanged) {
          subject = `ORDER #${orderRef} — Status: ${ORDER_STATUS_LABELS[orderStatus]||orderStatus}`;
          body += `Order Status: ${ORDER_STATUS_LABELS[orderStatus]||orderStatus}\n`;
        }
        if (paymentChanged) {
          body += `Payment Status: ${PAYMENT_STATUS_LABELS[paymentStatusValue]||paymentStatusValue}\n`;
        }
        body += `\nOrder Items:\n${(payload.items||[]).map(i=>`${i.name} x${i.qty} — ${formatPHP(i.price*i.qty)}`).join("\n")}\n\nTotal: ${formatPHP(payload.total||0)}\n\nIf you have any questions, contact us:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nThank you for choosing DM EAST!`;
        sendCustomerStatusEmail({ order: updatedOrder, subject, bodyText: body });
      }
      
      onSaved && onSaved({ id: order.id, ...order, ...payload });
      onClose();
    } catch(e) {
      console.error("Failed to save order:", e);
      setErrMsg("Failed to save: " + e.message);
    }
    setSaving(false);
  };
  
  const handleDelete = async () => {
    const confirmText = prompt(
      `⚠️ DELETE ORDER #${order.id.slice(-6).toUpperCase()}?\n\nThis cannot be undone. The order will be permanently removed.\n\nType DELETE to confirm:`
    );
    if (confirmText !== "DELETE") {
      if (confirmText !== null) alert("Order NOT deleted. You must type DELETE exactly.");
      return;
    }
    try {
      await deleteDoc(doc(db, "orders", order.id));
      onDeleted && onDeleted(order.id);
      onClose();
    } catch(e) {
      setErrMsg("Delete failed: " + e.message);
    }
  };
  
  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,fontFamily:ds.font.body,outline:"none",boxSizing:"border-box"};
  const lbl = {fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5};
  const tabBtn = (active) => ({padding:"10px 16px",border:"none",background:active?"#fff":"transparent",cursor:"pointer",fontSize:13,fontWeight:active?700:500,color:active?ds.color.red:ds.color.textBody,fontFamily:ds.font.body,borderBottom:active?`2px solid ${ds.color.red}`:"2px solid transparent",borderRadius:0});
  
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:920,width:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        
        {/* Header */}
        <div style={{padding:"18px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>Edit Order #{order.id.slice(-6).toUpperCase()}</div>
            <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>
              Created: {formatDate(order.createdAt)}
              {order.lastEditedAt && <span> · Last edited: {formatDate(order.lastEditedAt)}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:24,color:ds.color.textMuted,padding:4}}>✕</button>
        </div>
        
        {/* Tabs */}
        <div style={{padding:"0 28px",background:ds.color.canvas,borderBottom:`1px solid ${ds.color.border}`,display:"flex",gap:0}}>
          <button onClick={()=>setTab("info")}    style={tabBtn(tab==="info")}>👤 Customer Info</button>
          <button onClick={()=>setTab("items")}   style={tabBtn(tab==="items")}>📦 Items & Charges</button>
          <button onClick={()=>setTab("details")} style={tabBtn(tab==="details")}>⚙️ Order Details</button>
        </div>
        
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"22px 28px"}}>
          
          {/* TAB: Customer Info */}
          {tab==="info" && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px 18px"}}>
                <div><label style={lbl}>Customer Name *</label><input value={name} onChange={e=>setName(e.target.value)} style={inp}/></div>
                <div><label style={lbl}>Phone *</label><input value={phone} onChange={e=>setPhone(e.target.value)} style={inp}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={lbl}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={lbl}>Delivery Address</label><textarea value={address} onChange={e=>setAddress(e.target.value)} rows={2} style={{...inp,resize:"vertical"}}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={lbl}>Delivery Instructions</label><input value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Gate code, landmark, etc." style={inp}/></div>
              </div>
              
              {/* Recipient toggle */}
              <div style={{marginTop:18,padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`}}>
                <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13.5,fontWeight:600,color:ds.color.textDark,marginBottom:hasRecipient?12:0}}>
                  <input type="checkbox" checked={hasRecipient} onChange={e=>setHasRecipient(e.target.checked)} style={{accentColor:ds.color.red}}/>
                  📦 Order is for someone else (different recipient)
                </label>
                {hasRecipient && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px"}}>
                    <div><label style={lbl}>Recipient Name</label><input value={recipientName} onChange={e=>setRecipientName(e.target.value)} placeholder="Person receiving the order" style={inp}/></div>
                    <div><label style={lbl}>Recipient Phone</label><input value={recipientPhone} onChange={e=>setRecipientPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" style={inp}/></div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* TAB: Items & Charges */}
          {tab==="items" && (
            <div>
              <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="🔍 Search products to add…" style={{...inp,marginBottom:12}}/>
              {filteredProducts.length>0 && (
                <div style={{border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,marginBottom:14,maxHeight:180,overflowY:"auto"}}>
                  {filteredProducts.map(p=>(
                    <button key={p.id} onClick={()=>addProduct(p)} style={{display:"block",width:"100%",padding:"10px 14px",border:"none",borderBottom:`1px solid ${ds.color.borderLight}`,background:"#fff",cursor:"pointer",textAlign:"left",fontFamily:ds.font.body}}>
                      <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark}}>{p.name} {p.requiresPrescription&&<span style={{color:"#92400E",fontSize:11}}>💊</span>}</div>
                      <div style={{fontSize:11,color:ds.color.textMuted}}>{formatPHP(p.price||0)} · {p.tag}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Items table */}
              {items.length===0 ? (
                <div style={{padding:"40px",textAlign:"center",border:`2px dashed ${ds.color.border}`,borderRadius:ds.radius.lg,color:ds.color.textMuted,fontSize:13}}>
                  No items in this order. Add at least one product above.
                </div>
              ) : (
                <div style={{border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 110px 40px",gap:8,padding:"10px 14px",background:ds.color.canvas,fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                    <div>Product</div><div>Qty</div><div>Unit Price</div><div style={{textAlign:"right"}}>Total</div><div></div>
                  </div>
                  {items.map((item,idx)=>(
                    <div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 110px 40px",gap:8,padding:"10px 14px",borderTop:`1px solid ${ds.color.borderLight}`,alignItems:"center"}}>
                      <div style={{fontSize:13,color:ds.color.textDark}}>{item.name} {item.requiresPrescription&&<span style={{color:"#92400E",fontSize:10}}>💊</span>}</div>
                      <input type="number" min="1" value={item.qty} onChange={e=>updateItem(idx,"qty",e.target.value)} style={{...inp,padding:"6px 8px",fontSize:13}}/>
                      <input type="number" min="0" value={item.unitPrice} onChange={e=>updateItem(idx,"unitPrice",e.target.value)} style={{...inp,padding:"6px 8px",fontSize:13}}/>
                      <div style={{textAlign:"right",fontSize:13,fontWeight:700}}>{formatPHP(item.qty*item.unitPrice)}</div>
                      <button onClick={()=>removeItem(idx)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textLight}}>✕</button>
                    </div>
                  ))}
                  <div style={{padding:"10px 14px",background:ds.color.canvas,borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",fontSize:13}}>
                    <span>Items Subtotal</span>
                    <span style={{fontWeight:700}}>{formatPHP(itemsTotal)}</span>
                  </div>
                </div>
              )}
              
              {/* Other Charges */}
              <div style={{marginTop:14,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,padding:"12px 14px",background:ds.color.canvas}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:otherCharges.length>0?10:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:ds.color.textDark}}>💸 Other Charges <span style={{color:ds.color.textMuted,fontWeight:400,fontSize:11}}>(delivery, service fees, etc.)</span></div>
                  <button onClick={()=>setOtherCharges([...otherCharges,{description:"",amount:""}])} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.red}`,background:ds.color.redLight,cursor:"pointer",fontSize:11.5,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body}}>+ Add Charge</button>
                </div>
                {otherCharges.map((c,idx)=>(
                  <div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 120px 32px",gap:8,marginBottom:6,alignItems:"center"}}>
                    <input value={c.description} onChange={e=>{const arr=[...otherCharges];arr[idx].description=e.target.value;setOtherCharges(arr);}} placeholder="e.g. Delivery to Cavite" style={{...inp,padding:"7px 10px",fontSize:12.5}}/>
                    <input type="number" min="0" value={c.amount} onChange={e=>{const arr=[...otherCharges];arr[idx].amount=e.target.value;setOtherCharges(arr);}} placeholder="Amount" style={{...inp,padding:"7px 10px",fontSize:12.5}}/>
                    <button onClick={()=>setOtherCharges(otherCharges.filter((_,i)=>i!==idx))} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textLight}}>✕</button>
                  </div>
                ))}
                {otherCharges.length>0 && (
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:ds.color.textMuted,paddingTop:8,borderTop:`1px dashed ${ds.color.border}`,marginTop:6}}>
                    <span>Charges Subtotal</span>
                    <span style={{fontWeight:700}}>{formatPHP(chargesTotal)}</span>
                  </div>
                )}
              </div>
              
              {/* Grand Total */}
              <div style={{marginTop:14,padding:"14px 16px",background:ds.color.redLight,border:`2px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:14,fontWeight:700,color:ds.color.red}}>GRAND TOTAL</span>
                <span style={{fontSize:18,fontWeight:700,color:ds.color.red,fontFamily:ds.font.display}}>{formatPHP(total)}</span>
              </div>
            </div>
          )}
          
          {/* TAB: Order Details */}
          {tab==="details" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px 18px"}}>
              <div>
                <label style={lbl}>Order Status</label>
                <select value={orderStatus} onChange={e=>setOrderStatus(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Payment Status</label>
                <select value={paymentStatusValue} onChange={e=>setPaymentStatusValue(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  <option value="awaiting">Awaiting Payment</option>
                  <option value="submitted">Proof Submitted</option>
                  <option value="confirmed">Confirmed (Paid)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div>
                <label style={lbl}>Order Source</label>
                <select value={source} onChange={e=>setSource(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  {ORDER_SOURCES.map(s=><option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Payment Terms</label>
                <select value={paymentTerms} onChange={e=>setPaymentTerms(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  <option value="">— None set —</option>
                  {PAYMENT_TERMS_OPTIONS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              
              <div style={{gridColumn:"1/-1"}}>
                <label style={lbl}>Payment Method</label>
                <input value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} placeholder="GCash / Bank Transfer / Cash / etc." style={inp}/>
              </div>
              
              {paymentTerms === "custom" && (
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Custom Terms Description</label>
                  <input value={paymentTermsNotes} onChange={e=>setTermsNotes(e.target.value)} placeholder="e.g. 50% deposit, balance on delivery" style={inp}/>
                </div>
              )}
              
              <div style={{gridColumn:"1/-1"}}>
                <label style={lbl}>Internal Notes (admin only)</label>
                <textarea value={internalNotes} onChange={e=>setInternalNotes(e.target.value)} rows={2} placeholder="Notes about this specific order…" style={{...inp,resize:"vertical"}}/>
              </div>
              
              {showMarginFields && (<>
              <div style={{gridColumn:"1/-1",borderTop:`1px dashed ${ds.color.border}`,paddingTop:14,marginTop:4}}>
                <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Margin Tracking (Optional)</div>
              </div>
              <div>
                <label style={lbl}>Supplier Cost</label>
                <input type="number" min="0" value={supplierCost} onChange={e=>setSupplierCost(e.target.value)} placeholder="e.g. 35000" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Supplier Name</label>
                <input value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="e.g. MedSupply Inc" style={inp}/>
              </div>
              {margin !== null && supplierCost && (
                <div style={{gridColumn:"1/-1",background:margin>=0?ds.color.successBg:ds.color.redLight,border:`1px solid ${margin>=0?ds.color.successBorder:ds.color.redBorder}`,padding:"10px 14px",borderRadius:ds.radius.md,fontSize:12.5,color:margin>=0?ds.color.success:ds.color.red}}>
                  💰 Margin: <strong>{formatPHP(margin)}</strong> ({total>0?((margin/total)*100).toFixed(1):0}% of revenue)
                </div>
              )}
              </>)}
            </div>
          )}
          
          {errMsg && <div style={{marginTop:14,padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
        </div>
        
        {/* Footer */}
        <div style={{padding:"14px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {canDelete && <button onClick={handleDelete} style={{padding:"7px 14px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.red}`,background:"#fff",color:ds.color.red,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:ds.font.body}}>🗑️ Delete Order</button>}
            {onGeneratePDF && <button onClick={()=>onGeneratePDF({id:order.id,...order,name,email,phone,address,instructions,items:items.map(i=>({id:i.productId,name:i.name,price:i.unitPrice,qty:i.qty,requiresPrescription:!!i.requiresPrescription})),otherCharges:otherCharges.filter(c=>c.description&&c.amount),total,paymentMethod,paymentTerms,source})} style={{padding:"7px 14px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.red}`,background:ds.color.redLight,color:ds.color.red,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:ds.font.body}}>📄 Generate Document</button>}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:13,color:ds.color.textMuted,marginRight:8}}>
              Total: <strong style={{color:ds.color.red,fontSize:14}}>{formatPHP(total)}</strong>
            </span>
            <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
            {canEdit ? (
              <Btn variant="primary" size="md" disabled={saving} onClick={handleSave}>{saving?"Saving…":"💾 Save Changes"}</Btn>
            ) : (
              <Btn variant="outline" size="md" disabled={true}>🔒 Read-Only</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function AdminDashboard({ user }){
  const { products: PRODUCTS, refresh: refreshProducts } = useProducts();
  const [tab,setTab]=useState("overview");
  const [orders,setOrders]=useState([]);
  const [customers,setCustomers]=useState([]);
  const [rxUps,setRxUps]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editingProduct,setEditingProduct]=useState(null);
  const [seeding,setSeeding]=useState(false);
  const [seedingMessage,setSeedingMessage]=useState("");
  // v13.0a state
  const [showNewOrderModal,setShowNewOrderModal]=useState(false);
  const [showCustomerEditor,setShowCustomerEditor]=useState(null);
  const [orderSourceFilter,setOrderSourceFilter]=useState("all");
  const [orderSearch,setOrderSearch]=useState("");
  const [customerSearch,setCustomerSearch]=useState("");
  const [customerTagFilter,setCustomerTagFilter]=useState("all");
  // v13.0b state
  const [expenses,setExpenses]=useState([]);
  const [showExpenseEditor,setShowExpenseEditor]=useState(null);
  const [manualBillings,setManualBillings]=useState([]);
  const [showBillingEditor,setShowBillingEditor]=useState(null);
  // v13.0c: Order editor state
  const [showOrderEditor,setShowOrderEditor]=useState(null);
  // v15: PDF modal + role
  const [showPDFModal,setShowPDFModal]=useState(null); // null or order obj
  const userRole = user ? getUserRole(user.email) : null;
  const userPerms = userRole ? ROLE_PERMISSIONS[userRole] : null;
  
  // v15: If current tab not accessible by role, switch to first available
  useEffect(()=>{
    if(userPerms && !userPerms.tabs.includes(tab) && userPerms.tabs.length>0){
      setTab(userPerms.tabs[0]);
    }
  },[userPerms, tab]);

  useEffect(()=>{
    (async()=>{
      try {
        const snap = await getDocs(collection(db,"products"));
        if (snap.size === 0) {
          setSeedingMessage("⏳ Seeding default products…");
          const batch = writeBatch(db);
          DEFAULT_PRODUCTS.forEach(p => {
            const ref = doc(db, "products", p.id);
            batch.set(ref, { ...p, visible: true, available: "available", createdAt: serverTimestamp() });
          });
          await batch.commit();
          setSeedingMessage("✓ "+DEFAULT_PRODUCTS.length+" products seeded successfully");
          await refreshProducts();
          setTimeout(()=>setSeedingMessage(""), 3500);
        }
      } catch (e) { console.warn("Auto-seed failed:", e); }
    })();
  }, [refreshProducts]);

  const seedProductsFromDefaults = async () => {
    if (!confirm("This will add the 63 default products to your Firestore. Continue?")) return;
    setSeeding(true); setSeedingMessage("⏳ Seeding…");
    try {
      const batch = writeBatch(db);
      DEFAULT_PRODUCTS.forEach(p => {
        const ref = doc(db, "products", p.id);
        batch.set(ref, { ...p, visible: true, available: "available", createdAt: serverTimestamp() });
      });
      await batch.commit();
      setSeedingMessage("✓ "+DEFAULT_PRODUCTS.length+" products seeded");
      await refreshProducts();
    } catch (e) { setSeedingMessage("⚠ "+e.message); }
    setSeeding(false);
    setTimeout(()=>setSeedingMessage(""), 3500);
  };

  const saveProduct = async (productData) => {
    try {
      const id = productData.id?.trim() || ("custom-"+Date.now());
      const dataToSave = {
        id, name: productData.name||"", desc: productData.desc||"",
        price: productData.price ? Number(productData.price) : null,
        cta: productData.cta||"buy", category: productData.category||"pharma",
        imageSrc: productData.imageSrc||null,
        featured: !!productData.featured,
        requiresPrescription: !!productData.requiresPrescription,
        rxCategory: productData.rxCategory||null,
        tag: productData.tag||CATEGORIES.find(c=>c.id===productData.category)?.label||"",
        visible: productData.visible!==false,
        available: productData.available||"available",
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, "products", id), dataToSave, { merge: true });
      setEditingProduct(null);
      await refreshProducts();
    } catch (e) { alert("Save failed: "+e.message); }
  };

  const deleteProduct = async (p) => {
    if (!confirm("Delete \""+p.name+"\"? This cannot be undone.")) return;
    try {
      const docId = p._docId || p.id;
      await deleteDoc(doc(db, "products", docId));
      await refreshProducts();
    } catch (e) { alert("Delete failed: "+e.message); }
  };

  const toggleProductVisibility = async (p) => {
    try {
      const docId = p._docId || p.id;
      await updateDoc(doc(db, "products", docId), { visible: p.visible===false ? true : false });
      await refreshProducts();
    } catch (e) { alert("Toggle failed: "+e.message); }
  };

  useEffect(()=>{
    (async()=>{
      // v15.2: Load each collection independently so one permission error doesn't kill all data
      try {
        const oSnap=await getDocs(query(collection(db,"orders"),orderBy("createdAt","desc")));
        setOrders(oSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Orders load failed:", e.message); }
      try {
        const cSnap=await getDocs(collection(db,"customers"));
        setCustomers(cSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Customers load failed:", e.message); }
      try {
        const rSnap=await getDocs(query(collection(db,"rxUploads"),orderBy("createdAt","desc")));
        setRxUps(rSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Rx uploads load failed:", e.message); }
      try {
        const eSnap=await getDocs(query(collection(db,"expenses"),orderBy("date","desc")));
        setExpenses(eSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Expenses load failed:", e.message); }
      try {
        const bSnap=await getDocs(query(collection(db,"manualBillings"),orderBy("date","desc")));
        setManualBillings(bSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Manual billings load failed:", e.message); }
      setLoading(false);
    })();
  },[]);

  const updateOrderStatus=async(id,status)=>{
    await updateDoc(doc(db,"orders",id),{status, statusUpdatedAt: serverTimestamp()});
    setOrders(os=>os.map(o=>o.id===id?{...o,status}:o));
    const order = orders.find(o=>o.id===id);
    if(!order) return;
    const customerEmail = order.email;
    const customerName  = order.name || "Customer";
    const orderRef      = id.slice(-6).toUpperCase();
    if(status==="out_of_stock"){
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `ORDER #${orderRef} — Out of Stock Notice`,
          quantity: "N/A", budget: "N/A", timeline: "Immediate",
          location: order.address||"",
          details: `Dear ${customerName},\n\nWe regret to inform you that one or more items in your order #${orderRef} are currently unavailable.\n\nOrder Items:\n${order.items?.map(i=>i.name+" x"+i.qty).join("\n")||""}\n\nOur team will contact you shortly to discuss alternatives or arrange a full refund.\n\nYou can reach us at:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nWe apologize for the inconvenience.`,
          reply_to: CONTACT.email,
          to_email: customerEmail,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e){ console.warn("Out-of-stock email failed:", e); }
    }
    if(status==="confirmed"){
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `ORDER #${orderRef} — Confirmed`,
          quantity: "N/A", budget: order.total ? formatPHP(order.total) : "N/A",
          timeline: "In Progress", location: order.address||"",
          details: `Dear ${customerName},\n\nGreat news! Your order #${orderRef} has been confirmed and is now being processed.\n\nOrder Items:\n${order.items?.map(i=>i.name+" x"+i.qty).join("\n")||""}\n\nTotal: ${order.total ? formatPHP(order.total) : "N/A"}\nPayment Method: ${order.paymentMethod||""}\n\nOur team will be in touch with payment instructions and delivery details.\n\nThank you for choosing DM EAST!`,
          reply_to: CONTACT.email,
          to_email: customerEmail,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e){ console.warn("Confirmed email failed:", e); }
    }
    if(status==="shipped"){
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `ORDER #${orderRef} — Shipped`,
          quantity: "N/A", budget: "N/A", timeline: "In Transit",
          location: order.address||"",
          details: `Dear ${customerName},\n\nYour order #${orderRef} has been shipped!\n\nDelivery Address: ${order.address||""}\n\nFor delivery updates or questions, contact us:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n\nThank you for choosing DM EAST!`,
          reply_to: CONTACT.email,
          to_email: customerEmail,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e){ console.warn("Shipped email failed:", e); }
    }
    // v13.0d: Email for "processing" status
    if(status==="processing"){
      sendCustomerStatusEmail({
        order, 
        subject: `ORDER #${orderRef} — Now Processing`,
        bodyText: `Dear ${customerName},\n\nYour order #${orderRef} is now being processed and prepared for shipment.\n\nWe'll send another update once it's been shipped.\n\nIf you have any questions, contact us:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n\nThank you for choosing DM EAST!`
      });
    }
    // v13.0d: Email for "delivered" status
    if(status==="delivered"){
      sendCustomerStatusEmail({
        order,
        subject: `ORDER #${orderRef} — Delivered ✓`,
        bodyText: `Dear ${customerName},\n\n🎉 Your order #${orderRef} has been delivered!\n\nWe hope you're satisfied with your purchase. If you have any concerns, please don't hesitate to contact us within 7 days.\n\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nThank you for choosing DM EAST!`
      });
    }
    // v13.0d: Email for "cancelled" status
    if(status==="cancelled"){
      sendCustomerStatusEmail({
        order,
        subject: `ORDER #${orderRef} — Cancelled`,
        bodyText: `Dear ${customerName},\n\nYour order #${orderRef} has been cancelled.\n\nIf you didn't request this cancellation or have questions, please contact us immediately:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nIf any payment was made, our team will arrange a refund.\n\nThank you for your understanding.`
      });
    }
  };

  // V11 NEW: Confirm payment manually
  const confirmPayment = async (orderId) => {
    if (!confirm("Confirm payment for this order? An email will be sent to the customer.")) return;
    try {
      await updateDoc(doc(db,"orders",orderId), {
        paymentStatus: "confirmed",
        paymentConfirmedAt: serverTimestamp(),
      });
      setOrders(os => os.map(o => o.id===orderId ? {...o, paymentStatus:"confirmed"} : o));
      const order = orders.find(o=>o.id===orderId);
      if (!order) return;
      const orderRef = orderId.slice(-6).toUpperCase();
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `ORDER #${orderRef} — Payment Confirmed ✓`,
          quantity: "N/A", budget: order.total ? formatPHP(order.total) : "N/A",
          timeline: "Processing", location: order.address||"",
          details: `Dear ${order.name||"Customer"},\n\n✅ Great news! Your payment for order #${orderRef} has been confirmed.\n\nOrder Total: ${order.total ? formatPHP(order.total) : "N/A"}\nPayment Method: ${order.paymentMethod||""}\n\nYour order is now being processed and will be prepared for shipment shortly. We'll send another update when your order is dispatched.\n\nIf you have any questions, contact us at:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nThank you for choosing DM EAST!`,
          reply_to: CONTACT.email,
          to_email: order.email,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e) { console.warn("Payment confirmation email failed:", e); }
    } catch(e) {
      alert("Failed to confirm payment: " + e.message);
    }
  };

  // V11 NEW: Reject payment
  const rejectPayment = async (orderId) => {
    const reason = prompt("Reason for rejecting this payment? (e.g. 'Receipt is unclear', 'Amount does not match'). The customer will see this.");
    if (!reason) return;
    try {
      await updateDoc(doc(db,"orders",orderId), {
        paymentStatus: "rejected",
        paymentRejectReason: reason,
        paymentProofUrl: null, // Clear so customer can re-upload
      });
      setOrders(os => os.map(o => o.id===orderId ? {...o, paymentStatus:"rejected", paymentRejectReason:reason, paymentProofUrl:null} : o));
      const order = orders.find(o=>o.id===orderId);
      if (!order) return;
      const orderRef = orderId.slice(-6).toUpperCase();
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `ORDER #${orderRef} — Payment Re-upload Needed`,
          quantity: "N/A", budget: order.total ? formatPHP(order.total) : "N/A",
          timeline: "Action Required", location: order.address||"",
          details: `Dear ${order.name||"Customer"},\n\nWe were unable to verify your payment proof for order #${orderRef}.\n\nReason: ${reason}\n\nPlease re-upload a clearer payment proof through your customer portal or the track-order page.\n\nIf you need assistance, contact us at:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n\nThank you for your patience.`,
          reply_to: CONTACT.email,
          to_email: order.email,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e) { console.warn("Payment rejection email failed:", e); }
    } catch(e) {
      alert("Failed to reject payment: " + e.message);
    }
  };

  const updateRxStatus=async(id,status)=>{
    await updateDoc(doc(db,"rxUploads",id),{status});
    setRxUps(rs=>rs.map(r=>r.id===id?{...r,status}:r));
  };

  const exportCSV=()=>{
    const rows=[["Order ID","Customer","Email","Total","Items","Payment","PaymentStatus","OrderStatus","Date"]];
    orders.forEach(o=>rows.push([o.id.slice(-6).toUpperCase(),o.name||"",o.email||"",o.total||0,o.items?.map(i=>`${i.name}x${i.qty}`).join("; ")||"",o.paymentMethod||"",o.paymentStatus||"awaiting",o.status||"pending",formatDate(o.createdAt)]));
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`dmeast-orders-${Date.now()}.csv`;a.click();
  };

  const totalRevenue=orders.reduce((s,o)=>s+(o.total||0),0);
  const pendingCount=orders.filter(o=>!o.status||o.status==="pending").length;
  const pendingPaymentCount=orders.filter(o=>o.paymentStatus==="submitted").length;
  const statuses=["pending","confirmed","processing","shipped","delivered","cancelled","out_of_stock"];
  const selS={padding:"7px 12px",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:13,outline:"none",fontFamily:ds.font.body,background:"#fff",cursor:"pointer"};

  if(loading) return(
    <div style={{paddingTop:67,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}><Spinner size={36}/><div style={{marginTop:16,color:ds.color.textMuted,fontSize:14}}>Loading dashboard…</div></div>
    </div>
  );


  // v13.0c: After order is saved (edited)
  const handleOrderSaved = (updatedOrder) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? {...o, ...updatedOrder} : o));
  };
  
  // v13.0c: After order is deleted
  const handleOrderDeleted = (orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // v13.0a: Mark a credit order as paid
  const markOrderPaid = async (orderId) => {
    try {
      await updateDoc(doc(db,"orders",orderId), {
        paymentStatus: "confirmed",
        paidAt: serverTimestamp(),
        status: "confirmed",
      });
      // Refresh
      setOrders(prev => prev.map(o => o.id===orderId ? {...o, paymentStatus:"confirmed", status:"confirmed"} : o));
    } catch(e) { alert("Failed: "+e.message); }
  };

  // v13.0a: Refresh data (after creating new order/customer)
  const refreshData = async () => {
    // v15.2: Each collection in its own try/catch — partial failures don't kill the whole refresh
    try {
      const oSnap=await getDocs(query(collection(db,"orders"),orderBy("createdAt","desc")));
      setOrders(oSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh orders failed:", e.message); }
    try {
      const cSnap=await getDocs(collection(db,"customers"));
      setCustomers(cSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh customers failed:", e.message); }
    try {
      const eSnap=await getDocs(query(collection(db,"expenses"),orderBy("date","desc")));
      setExpenses(eSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh expenses failed:", e.message); }
    try {
      const bSnap=await getDocs(query(collection(db,"manualBillings"),orderBy("date","desc")));
      setManualBillings(bSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh billings failed:", e.message); }
  };
  const allTabs=[{id:"overview",label:"Overview",icon:"📊"},{id:"orders",label:`Orders${pendingPaymentCount>0?" 🔔":""}`,icon:"📦"},{id:"receivables",label:"Receivables",icon:"💰"},{id:"expenses",label:"Expenses",icon:"🏢"},{id:"billings",label:"Billings",icon:"📝"},{id:"margin",label:"Margin",icon:"📈"},{id:"products",label:"Products",icon:"🗂️"},{id:"customers",label:"Customers",icon:"👥"},{id:"rx",label:"Rx Uploads",icon:"💊"}];
  // v15: Filter tabs based on user role
  const tabs = userPerms ? allTabs.filter(t=>userPerms.tabs.includes(t.id)) : allTabs;

  return(
    <div style={{paddingTop:67,background:ds.color.canvas,minHeight:"100vh"}}>
      <div style={{background:ds.color.textDark,padding:"28px 0"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:ds.color.goldBright,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Admin Dashboard</div>
            <div style={{fontFamily:ds.font.display,fontSize:22,color:"#fff"}}>DMEAST Control Panel ⚙️</div>
            {userPerms && (
              <div style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:8,padding:"4px 12px",borderRadius:ds.radius.pill,background:userPerms.color+"33",border:`1px solid ${userPerms.color}66`}}>
                <span style={{fontSize:13}}>{userPerms.icon}</span>
                <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>{userPerms.label}</span>
                {user&&<span style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>· {user.email}</span>}
              </div>
            )}
          </div>
          <Btn variant="gold" size="md" onClick={exportCSV}>⬇️ Export Orders CSV</Btn>
        </div>
      </div>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"28px 28px"}}>
        <div style={{display:"flex",gap:4,marginBottom:28,background:"#fff",padding:6,borderRadius:ds.radius.lg,border:`1px solid ${ds.color.border}`,boxShadow:ds.shadow.xs,overflowX:"auto"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:"0 0 auto",padding:"10px 18px",borderRadius:ds.radius.md,border:"none",cursor:"pointer",fontFamily:ds.font.body,fontSize:13.5,fontWeight:600,background:tab===t.id?ds.color.textDark:"transparent",color:tab===t.id?"#fff":ds.color.textMuted,transition:"all 0.15s",whiteSpace:"nowrap"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab==="overview"&&(
          <div>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
                <button onClick={async()=>{
                  if(!confirm("Download a full backup of orders, customers, products, and Rx uploads as JSON?")) return;
                  const r=await performFullBackup();
                  alert(r.ok?("✓ Backup downloaded! "+Object.entries(r.counts).map(([k,v])=>k+": "+v).join(" · ")):("⚠ "+r.error));
                }} style={{padding:"8px 14px",borderRadius:ds.radius.md,border:`1px solid ${ds.color.gold}`,background:ds.color.goldLight,cursor:"pointer",fontSize:12,fontWeight:700,color:ds.color.gold,fontFamily:ds.font.body}}>📥 Download Backup</button>
              </div>
            <div className="dm-grid-4" style={{marginBottom:32}}>
              {[{icon:"📦",label:"Total Orders",value:orders.length,color:ds.color.red},{icon:"🔔",label:"Payments to Review",value:pendingPaymentCount,color:"#1E40AF"},{icon:"💰",label:"Total Revenue",value:formatPHP(totalRevenue),color:ds.color.success},{icon:"👥",label:"Customers",value:customers.length,color:"#6366F1"}].map((s,i)=>(
                <div key={i} style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs,borderTop:`3px solid ${s.color}`}}>
                  <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontSize:22,fontWeight:700,color:ds.color.textDark,fontFamily:ds.font.display}}>{s.value}</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>Recent Orders</div>
                <Btn variant="outline" size="sm" onClick={exportCSV}>Export CSV</Btn>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{borderBottom:`2px solid ${ds.color.border}`}}>
                    {["Order ID","Customer","Total","Items","Payment","Pay Status","Status","Date"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontWeight:700,color:ds.color.textDark,fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {orders.slice(0,10).map(o=>{const sc=orderStatusColor(o.status||"pending");const psc=paymentStatusColor(o.paymentStatus||"awaiting");return(
                      <tr key={o.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                        <td style={{padding:"12px",fontWeight:700,color:ds.color.textDark}}>#{o.id.slice(-6).toUpperCase()}</td>
                        <td style={{padding:"12px",color:ds.color.textBody}}>{o.name||"—"}</td>
                        <td style={{padding:"12px",fontWeight:600}}>{formatPHP(o.total||0)}</td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{o.items?.length||0}</td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{o.paymentMethod||"—"}</td>
                        <td style={{padding:"12px"}}><span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:ds.radius.pill,background:psc.bg,color:psc.color}}>{PAYMENT_STATUS_LABELS[o.paymentStatus||"awaiting"]}</span></td>
                        <td style={{padding:"12px"}}><span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:ds.radius.pill,background:sc.bg,color:sc.color}}>{ORDER_STATUS_LABELS[o.status]||"Pending"}</span></td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{formatDate(o.createdAt)}</td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab==="orders"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>All Orders ({orders.length})</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {userPerms?.canEditOrders !== false && <Btn variant="primary" size="sm" onClick={()=>setShowNewOrderModal(true)}>+ New Order</Btn>}
                <Btn variant="outline" size="sm" onClick={exportCSV}>⬇️ CSV</Btn>
              </div>
            </div>
            {/* v13.0a: Source filter and search */}
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
              <input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="🔍 Search orders…" style={{padding:"6px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",width:160}}/>
              <button onClick={()=>setOrderSourceFilter("all")} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${orderSourceFilter==="all"?ds.color.red:ds.color.border}`,background:orderSourceFilter==="all"?ds.color.redLight:"#fff",color:orderSourceFilter==="all"?ds.color.red:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>All Sources</button>
              {ORDER_SOURCES.map(s=>(
                <button key={s.id} onClick={()=>setOrderSourceFilter(s.id)} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${orderSourceFilter===s.id?s.color:ds.color.border}`,background:orderSourceFilter===s.id?s.color+"22":"#fff",color:orderSourceFilter===s.id?s.color:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{s.icon} {s.label}</button>
              ))}
            </div>
            {pendingPaymentCount>0&&(
              <div style={{background:"#DBEAFE",border:"1px solid #93C5FD",borderRadius:ds.radius.md,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#1E40AF"}}>
                🔔 <strong>{pendingPaymentCount} payment proof{pendingPaymentCount!==1?"s":""} awaiting your review.</strong> Click "Confirm Payment" or "Reject Payment" on each order below.
              </div>
            )}
            {(()=>{
              const filteredOrders = orders.filter(o=>{
                if(orderSourceFilter!=="all" && (o.source||"website")!==orderSourceFilter) return false;
                if(orderSearch.trim()){
                  const q = orderSearch.toLowerCase();
                  return (o.name||"").toLowerCase().includes(q) ||
                         (o.email||"").toLowerCase().includes(q) ||
                         (o.phone||"").toLowerCase().includes(q) ||
                         (o.id||"").toLowerCase().includes(q);
                }
                return true;
              });
              return filteredOrders.length===0?<div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>{orders.length===0?"No orders yet.":"No orders match the current filter."}</div>:filteredOrders.map(o=>{
              const sc=orderStatusColor(o.status||"pending");
              const psc=paymentStatusColor(o.paymentStatus||"awaiting");
              const isOOS = o.status==="out_of_stock";
              const needsReview = o.paymentStatus==="submitted";
              return(
                <div key={o.id} style={{border:`2px solid ${needsReview?"#1E40AF":isOOS?"#C2410C":ds.color.border}`,borderRadius:ds.radius.lg,marginBottom:14,overflow:"hidden"}}>
                  <div style={{background:needsReview?"#DBEAFE":isOOS?"#FFF7ED":ds.color.canvas,padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                    <div>
                      <span style={{fontWeight:700,color:ds.color.textDark,fontSize:14}}>#{o.id.slice(-6).toUpperCase()}</span>
                      {(()=>{const src=findSource(o.source||"website");return <span style={{fontSize:10,marginLeft:8,padding:"2px 7px",background:src.color+"22",color:src.color,borderRadius:ds.radius.pill,fontWeight:700}}>{src.icon} {src.label}</span>;})()}
                      {o.createdByAdmin&&<span style={{fontSize:10,marginLeft:5,padding:"2px 7px",background:ds.color.goldLight,color:ds.color.gold,borderRadius:ds.radius.pill,fontWeight:700}}>👤 Admin</span>}
                      <span style={{fontSize:12,color:ds.color.textMuted,marginLeft:12}}>{o.name||"Guest"}</span>
                      <span style={{fontSize:12,color:ds.color.textMuted,marginLeft:8}}>· {o.email||"—"}</span>
                      {o.uid&&o.uid!=="guest"&&<span style={{fontSize:10,marginLeft:8,padding:"2px 6px",background:ds.color.successBg,color:ds.color.success,borderRadius:ds.radius.pill,fontWeight:700}}>✓ Registered</span>}
                      {o.phone&&<span style={{fontSize:12,marginLeft:8}}>·
                        <a href={`https://wa.me/${o.phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                          style={{color:"#25D366",fontWeight:700,marginLeft:4}}>💬 {o.phone}</a>
                      </span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:15}}>{formatPHP(o.total||0)}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:ds.radius.pill,background:psc.bg,color:psc.color}}>💳 {PAYMENT_STATUS_LABELS[o.paymentStatus||"awaiting"]}</span>
                      <select value={o.status||"pending"} onChange={e=>updateOrderStatus(o.id,e.target.value)}
                        style={{...selS,fontWeight:600,color:sc.color,background:sc.bg,minWidth:140}}>
                        {statuses.map(s=><option key={s} value={s} style={{color:ds.color.textDark,background:"#fff"}}>
                          {ORDER_STATUS_LABELS[s]||s}
                        </option>)}
                      </select>
                      <button onClick={()=>setShowOrderEditor(o)} style={{padding:"5px 12px",borderRadius:ds.radius.pill,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:11.5,fontWeight:600,color:ds.color.textBody,fontFamily:ds.font.body}}>✏️ Edit</button>
                      <span style={{fontSize:12,color:ds.color.textMuted}}>{formatDate(o.createdAt)}</span>
                    </div>
                  </div>
                  {needsReview&&(
                    <div style={{background:"#DBEAFE",borderBottom:"1px solid #93C5FD",padding:"12px 18px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                      <span style={{fontSize:13,color:"#1E40AF",fontWeight:600}}>🔔 Payment proof submitted — please review:</span>
                      {o.paymentProofUrl&&<a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{padding:"6px 14px",background:"#fff",border:"1px solid #93C5FD",borderRadius:ds.radius.pill,color:"#1E40AF",fontSize:12,fontWeight:700,textDecoration:"none"}}>📎 View Proof →</a>}
                      <button onClick={()=>confirmPayment(o.id)} style={{padding:"6px 14px",background:ds.color.success,color:"#fff",border:"none",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body}}>✅ Confirm Payment</button>
                      <button onClick={()=>rejectPayment(o.id)} style={{padding:"6px 14px",background:ds.color.red,color:"#fff",border:"none",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body}}>❌ Reject</button>
                    </div>
                  )}
                  {isOOS&&(
                    <div style={{background:"#FFF7ED",borderBottom:`1px solid #FED7AA`,padding:"8px 18px",fontSize:12.5,color:"#C2410C",display:"flex",alignItems:"center",gap:8}}>
                      ⚠️ <strong>Out of Stock</strong> — Customer auto-notified by email. Contact them directly:
                      {o.phone&&<a href={`https://wa.me/${o.phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                        style={{background:"#25D366",color:"#fff",padding:"3px 10px",borderRadius:ds.radius.pill,fontWeight:700,fontSize:12,marginLeft:4}}>
                        💬 WhatsApp {o.phone}
                      </a>}
                    </div>
                  )}
                  <div style={{padding:"10px 18px"}}>
                    {o.recipientName&&<div style={{fontSize:12.5,color:ds.color.gold,background:ds.color.goldLight,padding:"4px 10px",borderRadius:ds.radius.sm,display:"inline-block",marginBottom:6}}>📦 Ship to: {o.recipientName} ({o.recipientPhone})</div>}
                    {o.items?.map((item,i)=><div key={i} style={{fontSize:12.5,color:ds.color.textBody,padding:"2px 0"}}>{item.name} × {item.qty} — {formatPHP(item.price*item.qty)}</div>)}
                    {o.address&&<div style={{fontSize:12,color:ds.color.textMuted,marginTop:6}}>📍 {o.address}</div>}
                    {o.deliveryCoords&&<div style={{fontSize:11,color:ds.color.textLight,marginTop:2}}>🗺️ Coords: {o.deliveryCoords.lat?.toFixed(5)}, {o.deliveryCoords.lng?.toFixed(5)} · <a href={`https://www.openstreetmap.org/?mlat=${o.deliveryCoords.lat}&mlon=${o.deliveryCoords.lng}#map=17/${o.deliveryCoords.lat}/${o.deliveryCoords.lng}`} target="_blank" rel="noopener noreferrer" style={{color:ds.color.red,textDecoration:"underline"}}>View map</a></div>}
                    {o.instructions&&<div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>📝 {o.instructions}</div>}
                    {o.paymentProofUrl&&!needsReview?(
                      <div style={{marginTop:6,display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:ds.radius.pill,background:ds.color.successBg,color:ds.color.success}}>📎 Payment Proof</span>
                        <a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:ds.color.success,textDecoration:"underline"}}>View →</a>
                      </div>
                    ):!needsReview&&!o.paymentProofUrl?(
                      <div style={{marginTop:6,fontSize:11,color:ds.color.textLight}}>📎 No payment proof yet</div>
                    ):null}
                    {o.paymentRejectReason&&<div style={{marginTop:6,fontSize:12,color:ds.color.red}}>❌ Rejected: {o.paymentRejectReason}</div>}
                  </div>
                </div>
              );
            });
            })()}
          </div>
        )}

        {tab==="receivables"&&(
          <ReceivablesTab orders={orders} onMarkPaid={markOrderPaid}/>
        )}

        {tab==="expenses"&&(
          <ExpensesTab
            expenses={expenses}
            orders={orders}
            onEdit={(e)=>setShowExpenseEditor(e)}
            onNew={()=>setShowExpenseEditor({})}
            onRefresh={refreshData}
          />
        )}

        {tab==="billings"&&(
          <ManualBillingsTab
            billings={manualBillings}
            onEdit={(b)=>setShowBillingEditor(b)}
            onNew={()=>setShowBillingEditor({})}
          />
        )}

        {tab==="margin"&&(
          <MarginDashboardTab orders={orders} expenses={expenses}/>
        )}


        {tab==="products"&&(
          <div>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 28px",boxShadow:ds.shadow.xs,marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>Product Catalog</div>
                <div style={{fontSize:13,color:ds.color.textMuted,marginTop:2}}>{PRODUCTS.length} products live · Changes appear on the site instantly.</div>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                {seedingMessage&&<span style={{fontSize:12,color:seedingMessage.startsWith("✓")?ds.color.success:ds.color.textMuted}}>{seedingMessage}</span>}
                {PRODUCTS.length===0&&<Btn variant="gold" size="sm" onClick={seedProductsFromDefaults} disabled={seeding}>{seeding?"Seeding…":"🌱 Seed 63 Default Products"}</Btn>}
                <Btn variant="primary" size="sm" onClick={()=>setEditingProduct({_new:true,id:"",name:"",desc:"",price:null,cta:"buy",imageSrc:"",category:"pharma",featured:false,requiresPrescription:false,rxCategory:null,tag:"",visible:true,available:"available"})}>+ Add New Product</Btn>
              </div>
            </div>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
              {CATEGORIES.map(cat=>{
                const catProds=PRODUCTS.filter(p=>p.category===cat.id);
                if(catProds.length===0) return null;
                return(
                  <div key={cat.id} style={{marginBottom:32}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:10,borderBottom:`2px solid ${cat.color}30`}}>
                      <span style={{fontSize:18}}>{cat.icon}</span>
                      <span style={{fontWeight:700,fontSize:15,color:ds.color.textDark}}>{cat.label}</span>
                      <span style={{fontSize:12,color:ds.color.textMuted}}>({catProds.length} products)</span>
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                        <thead><tr style={{borderBottom:`1px solid ${ds.color.border}`}}>
                          {["Image","Name","Price","CTA","Stock","Rx","Visible","Actions"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",fontWeight:700,color:ds.color.textMuted,fontSize:11,textTransform:"uppercase"}}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {catProds.map(p=>(
                            <tr key={p.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`,opacity:p.visible===false?0.5:1}}>
                              <td style={{padding:"9px 10px"}}>
                                {p.imageSrc?<img src={p.imageSrc} alt="" style={{width:36,height:36,objectFit:"contain",borderRadius:4,background:"#F8F7F5"}}/>:<div style={{width:36,height:36,borderRadius:4,background:ds.color.canvas,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:ds.color.textLight}}>📦</div>}
                              </td>
                              <td style={{padding:"9px 10px",fontWeight:600,color:ds.color.textDark}}>{p.name}<div style={{fontSize:10,color:ds.color.textLight,fontFamily:"monospace",marginTop:2}}>{p.id}</div></td>
                              <td style={{padding:"9px 10px",color:p.price?ds.color.success:ds.color.textMuted,fontWeight:600}}>{p.price?formatPHP(p.price):"Quote"}</td>
                              <td style={{padding:"9px 10px"}}><CtaBadge type={p.cta}/></td>
                              <td style={{padding:"9px 10px"}}>
                                <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:ds.radius.pill,background:p.available==="out_of_stock"?"#FEE2E2":p.available==="on_request"?"#FEF9C3":ds.color.successBg,color:p.available==="out_of_stock"?ds.color.red:p.available==="on_request"?"#A16207":ds.color.success}}>
                                  {p.available==="out_of_stock"?"Out":p.available==="on_request"?"On Req":"OK"}
                                </span>
                              </td>
                              <td style={{padding:"9px 10px"}}>{p.requiresPrescription?<span style={{fontSize:10,color:"#92400E",background:"#FFF3CD",padding:"2px 6px",borderRadius:ds.radius.pill}}>Rx</span>:<span style={{fontSize:10,color:ds.color.success}}>OTC</span>}</td>
                              <td style={{padding:"9px 10px"}}>
                                <button onClick={()=>toggleProductVisibility(p)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14}}>{p.visible===false?"🙈":"👁️"}</button>
                              </td>
                              <td style={{padding:"9px 10px"}}>
                                <div style={{display:"flex",gap:6}}>
                                  <button onClick={()=>setEditingProduct({...p})} style={{padding:"4px 10px",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.sm,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.textBody}}>Edit</button>
                                  <button onClick={()=>deleteProduct(p)} style={{padding:"4px 10px",border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.sm,background:ds.color.redLight,cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.red}}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              {PRODUCTS.length===0&&(
                <div style={{textAlign:"center",padding:"60px 20px",color:ds.color.textMuted}}>
                  <div style={{fontSize:36,marginBottom:12}}>📦</div>
                  <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>No products yet</div>
                  <div style={{fontSize:13,marginBottom:20}}>Click "Seed 63 Default Products" above to populate, or add your own.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab==="customers"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>Customers ({customers.length})</div>
              {userPerms?.canEditOrders !== false && <Btn variant="primary" size="sm" onClick={()=>setShowCustomerEditor({})}>+ New Customer</Btn>}
            </div>
            {/* v13.0a: Customer search + tag filter */}
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
              <input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="🔍 Search by name, email, phone…" style={{padding:"6px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",width:200}}/>
              <button onClick={()=>setCustomerTagFilter("all")} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${customerTagFilter==="all"?ds.color.red:ds.color.border}`,background:customerTagFilter==="all"?ds.color.redLight:"#fff",color:customerTagFilter==="all"?ds.color.red:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>All</button>
              {CUSTOMER_TAGS.map(t=>(
                <button key={t.id} onClick={()=>setCustomerTagFilter(t.id)} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${customerTagFilter===t.id?t.color:ds.color.border}`,background:customerTagFilter===t.id?t.color+"22":"#fff",color:customerTagFilter===t.id?t.color:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{t.label}</button>
              ))}
            </div>
            {(()=>{
              const filteredCustomers = customers.filter(c=>{
                if(customerTagFilter!=="all"){
                  if(!c.tags||!c.tags.includes(customerTagFilter)) return false;
                }
                if(customerSearch.trim()){
                  const q = customerSearch.toLowerCase();
                  return (c.name||"").toLowerCase().includes(q) ||
                         (c.email||"").toLowerCase().includes(q) ||
                         (c.phone||"").toLowerCase().includes(q);
                }
                return true;
              });
              return filteredCustomers.length===0?(
                <div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>{customers.length===0?"No customers yet. Click \"+ New Customer\" to add one.":"No customers match the current filter."}</div>
              ):(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{borderBottom:`2px solid ${ds.color.border}`}}>
                    {["Name","Contact","Tags","Orders","Spent","Points","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontWeight:700,color:ds.color.textDark,fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredCustomers.map(c=>(
                      <tr key={c.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                        <td style={{padding:"12px",fontWeight:600,color:ds.color.textDark}}>
                          {c.name||"—"}
                          {c.source==="manual"&&<span style={{fontSize:9,marginLeft:6,padding:"2px 6px",background:ds.color.canvas,borderRadius:ds.radius.pill,color:ds.color.textMuted}}>OFFLINE</span>}
                        </td>
                        <td style={{padding:"12px",color:ds.color.textBody,fontSize:12}}>
                          {c.email||"—"}<br/>
                          <span style={{color:ds.color.textMuted}}>{c.phone||"—"}</span>
                        </td>
                        <td style={{padding:"12px"}}>
                          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                            {(c.tags||[]).map(t=>{
                              const tag = findTag(t);
                              return tag?<span key={t} style={{fontSize:10,padding:"2px 7px",borderRadius:ds.radius.pill,background:tag.color+"22",color:tag.color,fontWeight:600}}>{tag.label}</span>:null;
                            })}
                            {(!c.tags||c.tags.length===0)&&<span style={{fontSize:11,color:ds.color.textLight}}>—</span>}
                          </div>
                        </td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{c.totalOrders||0}</td>
                        <td style={{padding:"12px",fontWeight:600,color:ds.color.success,fontSize:12}}>{formatPHP(c.totalSpent||0)}</td>
                        <td style={{padding:"12px",color:ds.color.gold,fontWeight:600,fontSize:12}}>{(c.points||0).toLocaleString()}</td>
                        <td style={{padding:"12px"}}>
                          {userPerms?.canEditOrders !== false ? (<button onClick={()=>setShowCustomerEditor(c)} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.textBody,fontFamily:ds.font.body}}>✏️ Edit</button>) : (<span style={{fontSize:11,color:ds.color.textLight}}>🔒</span>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })()}
          </div>
        )}

        {tab==="rx"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:20}}>Prescription Uploads ({rxUps.length})</div>
            {rxUps.length===0?<div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>No prescription uploads yet.</div>:rxUps.map(r=>(
              <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:`1px solid ${ds.color.borderLight}`,flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:14,flex:1,minWidth:0}}>
                  {/* V11.2: Show thumbnail/preview of uploaded Rx */}
                  {r.fileUrl?(
                    <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,width:60,height:60,borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,overflow:"hidden",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                      {r.fileName?.toLowerCase().endsWith('.pdf')?(
                        <span style={{fontSize:24}}>📄</span>
                      ):(
                        <img src={r.fileUrl} alt="Rx" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      )}
                    </a>
                  ):(
                    <div style={{flexShrink:0,width:60,height:60,borderRadius:ds.radius.sm,border:`1px dashed ${ds.color.border}`,background:ds.color.canvas,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:ds.color.textLight}}>📋</div>
                  )}
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark}}>Order #{r.orderId?.slice(-6).toUpperCase()||"—"}</div>
                    <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{r.customerName||"Guest"} · {r.fileName||"Prescription"} · {formatDate(r.createdAt)}</div>
                    {r.fileUrl?(
                      <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:ds.color.red,fontWeight:700,textDecoration:"underline",marginTop:4,display:"inline-block"}}>
                        🔍 View Full Prescription →
                      </a>
                    ):(
                      <div style={{fontSize:11,color:ds.color.textLight,marginTop:4,fontStyle:"italic"}}>⚠ No file attached (uploaded before v11.2 fix)</div>
                    )}
                  </div>
                </div>
                <select value={r.status||"pending"} onChange={e=>updateRxStatus(r.id,e.target.value)} style={selS}>
                  {["pending","verified","rejected"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
      {editingProduct && <ProductEditModal product={editingProduct} onSave={saveProduct} onClose={()=>setEditingProduct(null)}/>}
      
      {/* v13.0a Modals */}
      {showNewOrderModal && (
        <NewOrderModal
          onClose={()=>setShowNewOrderModal(false)}
          onSaved={refreshData}
          customers={customers}
          products={PRODUCTS}
        />
      )}
      {showCustomerEditor !== null && (
        <CustomerEditorModal
          customer={showCustomerEditor}
          onClose={()=>setShowCustomerEditor(null)}
          onSaved={refreshData}
        />
      )}
      {showExpenseEditor !== null && (
        <ExpenseEditorModal
          expense={showExpenseEditor}
          orders={orders}
          onClose={()=>setShowExpenseEditor(null)}
          onSaved={refreshData}
        />
      )}
      {showBillingEditor !== null && (
        <ManualBillingEditorModal
          billing={showBillingEditor}
          onClose={()=>setShowBillingEditor(null)}
          onSaved={refreshData}
        />
      )}
      {showOrderEditor !== null && (
        <OrderEditorModal
          order={showOrderEditor}
          products={PRODUCTS}
          onClose={()=>setShowOrderEditor(null)}
          onSaved={handleOrderSaved}
          onDeleted={handleOrderDeleted}
          onGeneratePDF={(o)=>{setShowOrderEditor(null); setShowPDFModal(o);}}
          showMarginFields={userPerms?.canSeeMargins !== false}
          canDelete={userPerms?.canDeleteOrders === true}
          canEdit={userPerms?.canEditOrders === true}
        />
      )}
      {showPDFModal !== null && (
        <PDFGeneratorModal
          order={showPDFModal}
          onClose={()=>setShowPDFModal(null)}
        />
      )}
      <BackupReminder/>
    </div>
  );
}

// ─── HOME SECTIONS ───────────────────────────────────────────────────────────
function HeroSection({setPage}){
  return(
    <section style={{background:`linear-gradient(150deg,${ds.color.canvasWarm} 0%,${ds.color.white} 60%,${ds.color.canvasGold} 100%)`,padding:"88px 0 80px",position:"relative",overflow:"hidden"}}>
      <div className="dm-dot-bg" style={{position:"absolute",right:0,top:0,width:"50%",height:"100%",opacity:0.6,pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"-60px",right:"-60px",width:360,height:360,borderRadius:"50%",border:`2px solid ${ds.color.goldBright}25`,pointerEvents:"none"}}/>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"0 28px",position:"relative",zIndex:1}}>
        <div className="dm-grid-hero">
          <div>
            <div className="dm-fade-up" style={{display:"inline-flex",alignItems:"center",gap:8,background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.pill,padding:"6px 16px 6px 8px",marginBottom:28}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:ds.color.red,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12}}>🇵🇭</span>
              <span style={{fontSize:12,color:ds.color.red,fontWeight:600,letterSpacing:"0.04em"}}>Philippine-Based · Nationwide Delivery · Est. 2020</span>
            </div>
            <h1 className="dm-fade-up dm-fade-up-1" style={{fontFamily:ds.font.display,fontSize:"clamp(2.4rem,4.5vw,3.6rem)",fontWeight:400,color:ds.color.textDark,lineHeight:1.12,marginBottom:6}}>Affordable Medical</h1>
            <h1 className="dm-fade-up dm-fade-up-2" style={{fontFamily:ds.font.display,fontSize:"clamp(2.4rem,4.5vw,3.6rem)",fontWeight:400,lineHeight:1.12,marginBottom:24}}>
              <span style={{color:ds.color.red}}>Supplies & Healthcare</span><br/><span style={{color:ds.color.textDark}}>Products Online.</span>
            </h1>
            <p className="dm-fade-up dm-fade-up-3" style={{fontSize:16,color:ds.color.textMuted,lineHeight:1.8,maxWidth:500,marginBottom:36}}>Shop healthcare products, pharmaceuticals, diagnostic devices, and beauty & wellness essentials — trusted by clinics, businesses, and individuals across the Philippines.</p>
            <div className="dm-fade-up dm-fade-up-4" style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:44}}>
              <Btn variant="primary" size="lg" onClick={()=>setPage("products")}>Shop Now</Btn>
              <Btn variant="secondary" size="lg" onClick={()=>setPage("institutional")}>Institutional Orders</Btn>
            </div>
            <div className="dm-fade-up dm-fade-up-4" style={{display:"flex",gap:24,flexWrap:"wrap"}}>
              {[["🚚","Fast Nationwide Delivery"],["🔒","Secure Checkout"],["✅","Authorized Suppliers"],["💬","Dedicated Support"]].map(([icon,label])=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>{icon}</span><span style={{fontSize:12,color:ds.color.textMuted,fontWeight:500}}>{label}</span></div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="dm-grid-4" style={{gridTemplateColumns:"repeat(2,1fr)"}}>
              {[{v:"5+",l:"Years Serving PH",accent:ds.color.red},{v:"500+",l:"Clients Nationwide",accent:ds.color.goldBright},{v:"9",l:"Product Categories",accent:ds.color.red},{v:"24/7",l:"Order Support",accent:ds.color.goldBright}].map((s,i)=>(
                <div key={i} style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"22px 18px",textAlign:"center",borderTop:`3px solid ${s.accent}`,boxShadow:ds.shadow.xs}}>
                  <div style={{fontFamily:ds.font.display,fontSize:"2rem",color:s.accent,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:11,color:ds.color.textMuted,marginTop:6,fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase"}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:ds.color.textDark,borderRadius:ds.radius.lg,padding:"22px 24px"}}>
              <div style={{fontSize:10,fontWeight:700,color:ds.color.goldBright,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Why Choose DMEAST</div>
              <div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:8}}>Products from Authorized Suppliers</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",lineHeight:1.7}}>All products are sourced from verified and authorized suppliers. Standard items available for direct purchase. Institutional and specialized orders handled upon request.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoriesSection({setPage,setActiveCategory}){
  const shopCats = CATEGORIES.filter(c => !c.institutional);
  return(
    <section style={{background:ds.color.canvas,padding:"80px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <SectionHeader eyebrow="Shop by Category" title="Find What You Need" subtitle="Browse healthcare products, pharmaceuticals, diagnostic devices, and beauty & wellness essentials — all available for direct online purchase." center/>
        <div className="dm-grid-4" style={{marginBottom:36}}>
          {shopCats.map(cat=><CategoryCard key={cat.id} cat={cat} onClick={()=>{setActiveCategory(cat.id);setPage("products");}}/>)}
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:13,color:ds.color.textMuted,marginBottom:12}}>Looking for hospital equipment, imaging systems, or specialized medical devices?</div>
          <Btn variant="outline" size="md" onClick={()=>setPage("institutional")}>View Institutional Orders →</Btn>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection(){
  return(
    <section style={{background:ds.color.white,padding:"80px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <SectionHeader eyebrow="How It Works" title="Ordering Is Simple" center/>
        <div className="dm-grid-4">
          {HOW_IT_WORKS.map((s,i)=>(
            <div key={i} style={{textAlign:"center",padding:"24px 18px"}}>
              <div style={{width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${ds.color.red},${ds.color.goldBright})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",boxShadow:ds.shadow.red}}>
                <span style={{fontFamily:ds.font.display,fontSize:16,color:"#fff"}}>{s.step}</span>
              </div>
              <div style={{fontSize:15,fontWeight:700,color:ds.color.textDark,marginBottom:8}}>{s.title}</div>
              <div style={{fontSize:13.5,color:ds.color.textMuted,lineHeight:1.65}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InstitutionalPreviewSection({setPage}){
  return(
    <section style={{background:ds.color.canvas,padding:"72px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:ds.color.red,marginBottom:12}}>Institutional & Enterprise</div>
            <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,2.5vw,2.1rem)",fontWeight:400,color:ds.color.textDark,lineHeight:1.3,marginBottom:16}}>Specialized & Large-Scale Healthcare Solutions</h2>
            <p style={{fontSize:15,color:ds.color.textMuted,lineHeight:1.8,marginBottom:24}}>For hospitals, diagnostic centers, and healthcare institutions requiring specialized equipment, bulk supply, or complete facility setups — we handle institutional orders upon request with formal quotation and dedicated account support.</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:28}}>
              {["Imaging Systems","Dialysis Centers","ICU Equipment","Medical Vehicles","Lab Setup","Bulk Pharma"].map(tag=>(
                <span key={tag} style={{fontSize:12,fontWeight:500,padding:"5px 12px",borderRadius:ds.radius.pill,background:ds.color.white,border:`1px solid ${ds.color.border}`,color:ds.color.textBody}}>{tag}</span>
              ))}
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <Btn variant="primary" size="md" onClick={()=>setPage("institutional")}>View Institutional Orders</Btn>
              <Btn variant="outline" size="md" onClick={()=>setPage("quote")}>Request a Quote</Btn>
            </div>
          </div>
          <div className="dm-grid-3" style={{gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
            {INSTITUTIONAL_SERVICES.map((s,i)=>(
              <div key={i} style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 18px",boxShadow:ds.shadow.xs}}>
                <div style={{fontSize:22,marginBottom:10}}>{s.icon}</div>
                <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark,marginBottom:5}}>{s.title}</div>
                <div style={{fontSize:12,color:ds.color.textMuted,lineHeight:1.6}}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaBanner({setPage}){
  return(
    <section style={{background:`linear-gradient(135deg,${ds.color.red} 0%,${ds.color.redDark} 100%)`,padding:"72px 28px"}}>
      <div style={{maxWidth:800,margin:"0 auto",textAlign:"center"}}>
        <div style={{fontFamily:ds.font.display,fontSize:"clamp(1.8rem,3.5vw,2.6rem)",color:"#fff",lineHeight:1.2,marginBottom:16}}>Your health needs, delivered nationwide.</div>
        <p style={{fontSize:16,color:"rgba(255,255,255,0.8)",lineHeight:1.7,marginBottom:32}}>From everyday health essentials to professional clinic supplies — DMEAST has you covered with fast, reliable delivery across the Philippines.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn variant="dark" size="xl" onClick={()=>setPage("products")}>Shop Now →</Btn>
          <Btn href={CONTACT.whatsapp} variant="outline" size="xl">💬 Chat with Us</Btn>
        </div>
      </div>
    </section>
  );
}

function PaymentMethodsSection(){
  return(
    <section style={{background:ds.color.white,padding:"60px 28px"}}>
      <div style={{maxWidth:900,margin:"0 auto",textAlign:"center"}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:ds.color.red,marginBottom:12}}>Secure Payments</div>
        <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.5rem,2.5vw,2rem)",fontWeight:400,color:ds.color.textDark,marginBottom:12}}>Multiple Payment Options</h2>
        <p style={{fontSize:15,color:ds.color.textMuted,marginBottom:32,maxWidth:500,margin:"0 auto 32px"}}>Pay your way — we accept all major payment methods for a smooth and secure checkout experience.</p>
        <div style={{display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap",marginBottom:20}}>
          {[{icon:"💳",label:"Credit Card",sub:"Visa & Mastercard"},{icon:"💳",label:"Debit Card",sub:"All major banks"},{icon:"📱",label:"GCash",sub:"Instant transfer"},{icon:"💜",label:"Maya",sub:"Instant transfer"},{icon:"🏦",label:"Bank Transfer",sub:"All PH banks"},{icon:"📲",label:"QR Ph",sub:"Scan & pay"}].map(m=>(
            <div key={m.label} style={{background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 24px",textAlign:"center",minWidth:110}}>
              <div style={{fontSize:28,marginBottom:8}}>{m.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark}}>{m.label}</div>
              <div style={{fontSize:11,color:ds.color.textMuted,marginTop:3}}>{m.sub}</div>
            </div>
          ))}
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.pill,padding:"8px 20px",fontSize:13,color:ds.color.success,fontWeight:600}}>
          🔒 All transactions are SSL-secured and encrypted
        </div>
      </div>
    </section>
  );
}

function WhyChooseSection(){
  const points=[
    {icon:"✅",title:"Authorized Suppliers",desc:"All products are sourced from verified and authorized suppliers. Quality you can trust."},
    {icon:"🚚",title:"Nationwide Delivery",desc:"We deliver to all Philippine regions — Metro Manila, Visayas, Mindanao, and everywhere in between."},
    {icon:"💊",title:"Wide Product Range",desc:"Pharmaceuticals, diagnostic devices, beauty & wellness, and healthcare essentials all in one place."},
    {icon:"🏥",title:"Trusted by Clinics",desc:"Hundreds of clinics, pharmacies, and healthcare businesses rely on DMEAST for their supply needs."},
    {icon:"💬",title:"Dedicated Support",desc:"Our team is ready to assist with orders, inquiries, and after-sales questions via call, email, or chat."},
    {icon:"🌍",title:"International Shipping",desc:"We serve customers worldwide. International orders handled with full export documentation."},
  ];
  return(
    <section style={{background:ds.color.canvasWarm,padding:"80px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <SectionHeader eyebrow="Why Choose DMEAST" title="Reliable. Affordable. Trusted." subtitle="Here's why clinics, businesses, and individuals across the Philippines choose us." center/>
        <div className="dm-grid-3">
          {points.map((p,i)=>(
            <div key={i} style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"26px 24px",boxShadow:ds.shadow.xs,display:"flex",gap:16}}>
              <div style={{width:44,height:44,borderRadius:ds.radius.md,background:ds.color.redLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{p.icon}</div>
              <div>
                <div style={{fontSize:14.5,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>{p.title}</div>
                <div style={{fontSize:13.5,color:ds.color.textMuted,lineHeight:1.65}}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomePage({setPage,setActiveCategory,addToCart}){
  const { products: PRODUCTS } = useProducts();
  const featuredStandard = PRODUCTS.filter(p =>
    p.featured && p.cta === "buy" && !p.requiresPrescription &&
    !CATEGORIES.find(c=>c.id===p.category)?.institutional
  ).slice(0,4);
  const featured = featuredStandard.length >= 4
    ? featuredStandard
    : PRODUCTS.filter(p => p.featured && p.cta === "buy").slice(0,4);

  return(
    <div style={{paddingTop:67}}>
      <HeroSection setPage={setPage}/>
      <section style={{background:ds.color.white,padding:"80px 28px"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <SectionHeader eyebrow="Featured Products" title="Popular Health & Wellness Products" subtitle="Directly available for online purchase with fast nationwide delivery." center/>
          <div className="dm-grid-4">
            {featured.map(p=><ProductCard key={p.id} product={p} addToCart={addToCart} setPage={setPage}/>)}
          </div>
          <div style={{textAlign:"center",marginTop:36}}><Btn variant="secondary" size="lg" onClick={()=>setPage("products")}>View All Products →</Btn></div>
        </div>
      </section>
      <CategoriesSection setPage={setPage} setActiveCategory={setActiveCategory}/>
      <HowItWorksSection/>
      <PaymentMethodsSection/>
      <WhyChooseSection/>
      <InstitutionalPreviewSection setPage={setPage}/>
      <CtaBanner setPage={setPage}/>
    </div>
  );
}

// ─── ABOUT PAGE ──────────────────────────────────────────────────────────────
function AboutPage(){
  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="About Us" title="Affordable Healthcare Products, Delivered Nationwide" subtitle="Since 2020, DMEAST has been a trusted source of medical supplies, pharmaceuticals, diagnostic devices, and healthcare essentials for clinics, businesses, and individuals across the Philippines."/>
      <div style={{maxWidth:1160,margin:"0 auto",padding:"72px 28px"}}>
        <div className="dm-grid-2" style={{gap:64,marginBottom:72}}>
          <div>
            <SectionHeader eyebrow="Our Story" title="From Manila to the Philippines and Beyond"/>
            <p style={{fontSize:15,color:ds.color.textBody,lineHeight:1.85,marginBottom:18}}>DMEAST (Decon Medical Equipment and Supplies Trading) was established in 2020 in Sta. Cruz, Manila — with a mission to make quality healthcare products accessible to everyone who needs them, from individual buyers to clinics and institutions.</p>
            <p style={{fontSize:15,color:ds.color.textBody,lineHeight:1.85,marginBottom:18}}>We carry a wide range of standard healthcare products available for direct online purchase, along with specialized and institutional solutions handled upon request. All products are sourced from verified and authorized suppliers.</p>
            <p style={{fontSize:15,color:ds.color.textBody,lineHeight:1.85}}>Over the years, DMEAST has grown into a trusted partner for over 500 clients — serving clinics, pharmacies, businesses, and healthcare institutions nationwide and internationally.</p>
          </div>
          <div>
            <SectionHeader eyebrow="Milestones" title="Our Journey"/>
            {COMPANY_MILESTONES.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:20,marginBottom:24,paddingBottom:24,borderBottom:i<COMPANY_MILESTONES.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
                <div style={{width:52,height:28,background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.pill,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:11,fontWeight:700,color:ds.color.red}}>{m.year}</span>
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark,marginBottom:4}}>{m.title}</div>
                  <div style={{fontSize:13.5,color:ds.color.textMuted,lineHeight:1.65}}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <WhyChooseSection/>
      </div>
    </div>
  );
}

// ─── PRODUCTS PAGE (SHOP) ────────────────────────────────────────────────────
function ProductsPage({setPage,addToCart,setActiveCategory,activeCategory,wishlist,toggleWishlist}){
  const { products: PRODUCTS } = useProducts();
  const [search,setSearch]=useState("");
  const [cat,setCat]=useState(activeCategory||null);
  const [showAll,setShowAll]=useState(false);
  useEffect(()=>{if(activeCategory)setCat(activeCategory);},[activeCategory]);

  const shopCats = CATEGORIES.filter(c=>!c.institutional);
  const isInstitutionalCat = cat && CATEGORIES.find(c=>c.id===cat)?.institutional;

  const filtered=PRODUCTS.filter(p=>{
    const mc=!cat||p.category===cat;
    const q=search.toLowerCase();
    const ms=!q||p.name.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q)||p.tag.toLowerCase().includes(q);
    const notInstit = showAll||cat||q ? true : !CATEGORIES.find(c=>c.id===p.category)?.institutional;
    return mc&&ms&&notInstit;
  });

  const shopProductCount = PRODUCTS.filter(p=>!CATEGORIES.find(c=>c.id===p.category)?.institutional).length;

  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Online Shop" title="Healthcare Products & Medical Supplies" subtitle={`${shopProductCount}+ products available for direct purchase with nationwide delivery.`}/>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"40px 28px"}}>
        {isInstitutionalCat && (
          <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.lg,padding:"14px 20px",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
            <div style={{fontSize:13.5,color:ds.color.gold}}>
              <strong>ℹ️ Institutional Category:</strong> Items in this category are available through institutional inquiry. <button onClick={()=>setPage("institutional")} style={{background:"none",border:"none",color:ds.color.gold,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body,fontSize:13.5,textDecoration:"underline"}}>View Institutional Orders →</button>
            </div>
            <Btn variant="gold" size="sm" onClick={()=>setPage("quote")}>Request a Quote</Btn>
          </div>
        )}
        <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap",alignItems:"center"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search products…" style={{flex:1,minWidth:200,padding:"11px 16px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,outline:"none",fontFamily:ds.font.body}} onFocus={e=>e.target.style.borderColor=ds.color.red} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
          <select value={cat||""} onChange={e=>{setCat(e.target.value||null);setActiveCategory(e.target.value||null);}} style={{padding:"11px 16px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,outline:"none",fontFamily:ds.font.body,background:"#fff",cursor:"pointer"}}>
            <option value="">All Shop Categories</option>
            {shopCats.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            <optgroup label="── Institutional Orders ──">
              {CATEGORIES.filter(c=>c.institutional).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </optgroup>
          </select>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22,flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:13,color:ds.color.textMuted}}>{filtered.length} product{filtered.length!==1?"s":""} found</div>
          {!showAll&&!cat&&!search&&(
            <button onClick={()=>setShowAll(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:ds.color.red,fontFamily:ds.font.body,fontWeight:600}}>Show all products including institutional →</button>
          )}
        </div>
        <div className="dm-grid-4">
          {filtered.map(p=><ProductCard key={p.id} product={p} addToCart={addToCart} setPage={setPage} wishlist={wishlist} toggleWishlist={toggleWishlist}/>)}
        </div>
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"60px 0",color:ds.color.textMuted}}>
            <div style={{fontSize:32,marginBottom:12}}>🔍</div>
            <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>No products found</div>
            <div style={{fontSize:13}}>Try a different search term or category.</div>
          </div>
        )}
        {!isInstitutionalCat&&(
          <div style={{marginTop:48,padding:"28px 32px",background:ds.color.canvas,borderRadius:ds.radius.xl,border:`1px solid ${ds.color.border}`,textAlign:"center"}}>
            <div style={{fontSize:15,fontWeight:600,color:ds.color.textDark,marginBottom:6}}>Need hospital equipment, imaging systems, or specialized devices?</div>
            <div style={{fontSize:13.5,color:ds.color.textMuted,marginBottom:16}}>Institutional and specialized orders are handled separately with formal quotation.</div>
            <Btn variant="secondary" size="md" onClick={()=>setPage("institutional")}>View Institutional Orders →</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── INSTITUTIONAL ORDERS PAGE ───────────────────────────────────────────────
function InstitutionalOrdersPage({setPage}){
  const { products: PRODUCTS } = useProducts();
  const institutionalCats = CATEGORIES.filter(c=>c.institutional);
  const institutionalProducts = PRODUCTS.filter(p=>CATEGORIES.find(c=>c.id===p.category)?.institutional);
  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Institutional Orders" title="Specialized & Enterprise Healthcare Solutions" subtitle="For hospitals, diagnostic centers, and healthcare institutions requiring specialized equipment, bulk pharmaceutical supply, or complete facility setups."/>
      <div style={{maxWidth:1160,margin:"0 auto",padding:"72px 28px"}}>
        <div style={{background:ds.color.canvas,borderRadius:ds.radius.xl,border:`1px solid ${ds.color.border}`,padding:"32px 36px",marginBottom:56}}>
          <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:20}}>How Institutional Orders Work</div>
          <div className="dm-grid-4">
            {[{step:"01",icon:"📋",title:"Submit a Request",desc:"Fill out our quote request form with your requirements, quantities, and specifications."},
              {step:"02",icon:"💬",title:"We Review & Confirm",desc:"Our team reviews your request and follows up within 24–48 hours to confirm details."},
              {step:"03",icon:"📄",title:"Formal Quotation",desc:"We provide a formal quotation with pricing, lead times, and delivery terms."},
              {step:"04",icon:"🚚",title:"Fulfillment & Delivery",desc:"Upon payment confirmation, we source, prepare, and arrange delivery to your location."},
            ].map((s,i)=>(
              <div key={i} style={{textAlign:"center",padding:"16px 12px"}}>
                <div style={{width:48,height:48,borderRadius:"50%",background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:20}}>{s.icon}</div>
                <div style={{fontSize:10,fontWeight:700,color:ds.color.red,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Step {s.step}</div>
                <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>{s.title}</div>
                <div style={{fontSize:13,color:ds.color.textMuted,lineHeight:1.6}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <SectionHeader eyebrow="Available Categories" title="Institutional Product Areas" subtitle="Pricing and availability for institutional items are confirmed upon request."/>
        <div className="dm-grid-3" style={{marginBottom:56}}>
          {institutionalCats.map(cat=>{
            const catProds = institutionalProducts.filter(p=>p.category===cat.id);
            return(
              <div key={cat.id} style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,overflow:"hidden",boxShadow:ds.shadow.xs}}>
                <div style={{height:5,background:`linear-gradient(90deg,${cat.color},${cat.accent})`}}/>
                <div style={{padding:"24px 22px"}}>
                  <div style={{fontSize:24,marginBottom:10}}>{cat.icon}</div>
                  <div style={{fontSize:15,fontWeight:700,color:ds.color.textDark,marginBottom:8}}>{cat.label}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:16}}>
                    {catProds.slice(0,4).map(p=>(
                      <div key={p.id} style={{fontSize:12.5,color:ds.color.textMuted,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{color:cat.accent,fontSize:10}}>●</span>{p.name}
                      </div>
                    ))}
                    {catProds.length>4&&<div style={{fontSize:12,color:ds.color.textLight}}>+{catProds.length-4} more items</div>}
                  </div>
                  <Btn variant="outline" size="sm" fullWidth onClick={()=>setPage("quote")}>Request Quote</Btn>
                </div>
              </div>
            );
          })}
        </div>
        <SectionHeader eyebrow="What We Handle" title="Full-Scope Institutional Solutions"/>
        <div className="dm-grid-3" style={{marginBottom:56}}>
          {INSTITUTIONAL_SERVICES.map((s,i)=>(
            <div key={i} style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"28px 24px",boxShadow:ds.shadow.xs}}>
              <div style={{fontSize:32,marginBottom:14}}>{s.icon}</div>
              <div style={{fontFamily:ds.font.display,fontSize:17,color:ds.color.textDark,marginBottom:10}}>{s.title}</div>
              <div style={{fontSize:14,color:ds.color.textMuted,lineHeight:1.75}}>{s.body}</div>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",padding:"48px 0",background:ds.color.canvasWarm,borderRadius:ds.radius.xl,border:`1px solid ${ds.color.borderLight}`}}>
          <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark,marginBottom:10}}>Ready to submit an institutional order?</div>
          <p style={{fontSize:15,color:ds.color.textMuted,marginBottom:8,maxWidth:520,margin:"0 auto 8px"}}>Tell us your requirements and we'll prepare a detailed formal quotation within 24–48 hours.</p>
          <p style={{fontSize:13,color:ds.color.textLight,marginBottom:28}}>Pricing and availability for institutional items are subject to confirmation.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn variant="primary" size="lg" onClick={()=>setPage("quote")}>Submit a Quote Request</Btn>
            <Btn variant="outline" size="lg" onClick={()=>setPage("contact")}>Talk to Our Team</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QUOTE PAGE ──────────────────────────────────────────────────────────────
function QuotePage(){
  const [form,setForm]=useState({name:"",company:"",email:"",phone:"",product:"",quantity:"",budget:"",location:"",timeline:"",details:""});
  const [status,setStatus]=useState("idle");
  const [errorMsg,setErrorMsg]=useState("");
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const filled=form.name&&form.email&&form.phone&&form.product;
  const inp={width:"100%",padding:"11px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,color:ds.color.textDark,outline:"none",fontFamily:ds.font.body,boxSizing:"border-box",background:"#fff",transition:"border-color 0.15s"};
  const lbl={fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6};
  const fo=e=>e.target.style.borderColor=ds.color.red;
  const bl=e=>e.target.style.borderColor=ds.color.border;

  const handleSubmit=async()=>{
    if(!filled)return;
    setStatus("sending");setErrorMsg("");
    try{
      // v15.2 FIX: include to_email so EmailJS template can route it (template_5r24wue uses {{to_email}})
      // Send admin notification + customer confirmation
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.orderTemplateId, {
        customer_name:    form.name,
        customer_email:   form.email,
        customer_phone:   form.phone,
        customer_address: form.location || "Not specified",
        order_items:      `QUOTE REQUEST: ${form.product}` + (form.quantity?` (Qty: ${form.quantity})`:""),
        order_total:      form.budget ? `Target: ${form.budget}` : "TBD",
        payment_method:   "Quote Request - Pending",
      }, EMAILJS_CONFIG.publicKey);
      // Send confirmation to customer
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `Quote Request Received: ${form.product}`,
          quantity: form.quantity || "TBD",
          budget: form.budget || "TBD",
          timeline: form.timeline || "TBD",
          location: form.location || "TBD",
          details: `Dear ${form.name},\n\nThank you for your quotation request. We have received your inquiry for: ${form.product}.\n\nOur team will review your requirements and respond within 24-48 hours with a formal quotation.\n\nDetails submitted:\n- Product: ${form.product}\n- Quantity: ${form.quantity||"TBD"}\n- Budget: ${form.budget||"TBD"}\n- Location: ${form.location||"TBD"}\n- Timeline: ${form.timeline||"TBD"}\n${form.details?'- Details: '+form.details:''}\n\nIf urgent, please contact us:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nThank you for choosing DM EAST!`,
          reply_to: CONTACT.email,
          to_email: form.email,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e) { console.warn("Customer confirmation email failed:", e); }
      // Save to Firestore for admin tracking
      try {
        await addDoc(collection(db, "quotes"), {
          ...form,
          status: "new",
          createdAt: serverTimestamp(),
        });
      } catch(e) { console.warn("Quote save to Firestore failed:", e); }
      setStatus("success");
    }catch(e){console.error("Quote submission error:",e);setErrorMsg("Failed to send. Please email us directly at "+CONTACT.email+" or message us on WhatsApp. Error: "+e.message);setStatus("error");}
  };

  if(status==="success") return(
    <div style={{paddingTop:67,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",background:ds.color.canvas}}>
      <div style={{textAlign:"center",maxWidth:460,padding:"0 24px"}}>
        <div style={{width:76,height:76,borderRadius:"50%",background:ds.color.successBg,border:`2px solid ${ds.color.successBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 24px"}}>✓</div>
        <div style={{fontFamily:ds.font.display,fontSize:26,color:ds.color.textDark,marginBottom:10}}>Quote Request Sent!</div>
        <p style={{fontSize:15,color:ds.color.textMuted,lineHeight:1.7,marginBottom:24}}>Thank you, <strong>{form.name}</strong>! Our team will respond to <strong>{form.email}</strong> within 24–48 hours.</p>
        <Btn variant="primary" size="md" onClick={()=>setStatus("idle")}>Submit Another</Btn>
      </div>
    </div>
  );

  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Quote Request" title="Request a Quotation" subtitle="Fill in the form and we'll prepare a formal quotation for your requirements."/>
      <div style={{maxWidth:860,margin:"0 auto",padding:"60px 28px"}}>
        <div style={{background:ds.color.white,borderRadius:ds.radius.xl,padding:"40px 48px",boxShadow:ds.shadow.md,border:`1px solid ${ds.color.borderLight}`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"18px 24px",marginBottom:18}}>
            {[["Full Name *","name","text","Your full name"],["Company / Organization","company","text","Hospital, LGU, clinic…"],["Email Address *","email","email","you@email.com"],["Phone / WhatsApp *","phone","text","+63 9XX XXX XXXX"]].map(([l,k,t,ph])=>(
              <div key={k}><label style={lbl}>{l}</label><input type={t} value={form[k]} onChange={set(k)} placeholder={ph} style={inp} onFocus={fo} onBlur={bl}/></div>
            ))}
          </div>
          <div style={{marginBottom:18}}><label style={lbl}>Products / Equipment Required *</label><input value={form.product} onChange={set("product")} placeholder="List the products or equipment you need" style={inp} onFocus={fo} onBlur={bl}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"18px 24px",marginBottom:18}}>
            {[["Quantity / Volume","quantity","text","e.g. 5 units, 100 boxes"],["Target Budget (optional)","budget","text","e.g. ₱500,000"],["Delivery Location","location","text","City, Province, Country"],["Required Timeline","timeline","text","e.g. Within 30 days"]].map(([l,k,t,ph])=>(
              <div key={k}><label style={lbl}>{l}</label><input type={t} value={form[k]} onChange={set(k)} placeholder={ph} style={inp} onFocus={fo} onBlur={bl}/></div>
            ))}
          </div>
          <div style={{marginBottom:24}}><label style={lbl}>Project Details / Special Requirements</label><textarea value={form.details} onChange={set("details")} rows={5} placeholder="Describe your project, specifications, regulatory requirements…" style={{...inp,resize:"vertical",lineHeight:1.65}} onFocus={fo} onBlur={bl}/></div>
          {status==="error"&&<div style={{marginBottom:18,padding:"12px 16px",background:ds.color.redLight,borderRadius:ds.radius.md,border:`1px solid ${ds.color.redBorder}`,fontSize:13,color:ds.color.red}}>{errorMsg}</div>}
          <Btn variant={filled?"primary":"outline"} size="lg" fullWidth disabled={!filled||status==="sending"} onClick={handleSubmit}>{status==="sending"?"Sending…":"Submit Quote Request →"}</Btn>
          <p style={{textAlign:"center",fontSize:13,color:ds.color.textMuted,marginTop:16,lineHeight:1.6}}>We respond within <strong style={{color:ds.color.textDark}}>24–48 hours</strong>. Urgent? Call us:<br/><strong>{CONTACT.phone1}</strong> · <strong>{CONTACT.phone2}</strong></p>
        </div>
      </div>
    </div>
  );
}

// ─── CONTACT PAGE ────────────────────────────────────────────────────────────
function ContactPage(){
  const [form,setForm]=useState({name:"",email:"",subject:"",message:""});
  const [sent,setSent]=useState(false);
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const inp={width:"100%",padding:"11px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,outline:"none",fontFamily:ds.font.body,color:ds.color.textDark,boxSizing:"border-box",background:ds.color.white,transition:"border-color 0.15s"};
  const handleSend=async()=>{
    if(!form.name||!form.email||!form.message)return;
    try{await emailjs.send(EMAILJS_CONFIG.serviceId,EMAILJS_CONFIG.templateId,{from_name:form.name,from_email:form.email,product:form.subject||"General Inquiry",details:form.message,reply_to:form.email,company:"N/A",phone:"N/A",quantity:"N/A",budget:"N/A",location:"N/A",timeline:"N/A"},EMAILJS_CONFIG.publicKey);}catch(_){}
    setSent(true);
  };
  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Contact" title="Get in Touch" subtitle="Ready to order, request a quote, or explore a project? We're here to help."/>
      <div style={{maxWidth:1160,margin:"0 auto",padding:"64px 28px"}}>
        <div className="dm-grid-2" style={{gap:52}}>
          <div>
            <div style={{fontFamily:ds.font.display,fontSize:21,color:ds.color.textDark,marginBottom:28}}>Office & Contact Information</div>
            {[{icon:"📍",title:"Address",lines:[CONTACT.address,CONTACT.address2]},{icon:"📞",title:"Telephone",lines:[CONTACT.phone2]},{icon:"📱",title:"Mobile",lines:[CONTACT.phone1]},{icon:"✉️",title:"Email",lines:[CONTACT.email]},{icon:"🕐",title:"Business Hours",lines:["Monday – Friday","8:00 AM – 6:00 PM"]}].map(item=>(
              <div key={item.title} style={{display:"flex",gap:16,marginBottom:24,paddingBottom:24,borderBottom:`1px solid ${ds.color.borderLight}`}}>
                <div style={{width:42,height:42,flexShrink:0,background:ds.color.redLight,borderRadius:ds.radius.md,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{item.icon}</div>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:ds.color.red,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>{item.title}</div>
                  {item.lines.map(l=><div key={l} style={{fontSize:14,color:ds.color.textBody,lineHeight:1.6}}>{l}</div>)}
                </div>
              </div>
            ))}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:10,fontWeight:700,color:ds.color.textDark,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12}}>Chat with Us</div>
              <div style={{display:"flex",gap:10}}>
                <Btn href={CONTACT.whatsapp} variant="primary" size="md">💬 WhatsApp</Btn>
                <Btn href={CONTACT.messenger} variant="dark" size="md">💬 Messenger</Btn>
              </div>
            </div>
          </div>
          <div style={{background:ds.color.white,borderRadius:ds.radius.xl,padding:"36px 40px",boxShadow:ds.shadow.md,border:`1px solid ${ds.color.borderLight}`}}>
            {sent?(
              <div style={{textAlign:"center",padding:"44px 0"}}>
                <div style={{width:60,height:60,borderRadius:"50%",background:ds.color.successBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 18px"}}>✓</div>
                <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark,marginBottom:8}}>Message Sent!</div>
                <div style={{fontSize:14,color:ds.color.textMuted,marginBottom:22}}>We'll reply within 24 business hours.</div>
                <Btn variant="secondary" size="sm" onClick={()=>setSent(false)}>Send Another</Btn>
              </div>
            ):(
              <>
                <div style={{fontFamily:ds.font.display,fontSize:21,color:ds.color.textDark,marginBottom:24}}>Send Us a Message</div>
                {[["Full Name","name","text","Your full name"],["Email","email","email","your@email.com"]].map(([l,k,t,ph])=>(
                  <div key={k} style={{marginBottom:16}}>
                    <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6}}>{l}</label>
                    <input type={t} value={form[k]} onChange={f(k)} placeholder={ph} style={inp} onFocus={e=>e.target.style.borderColor="#CC2F3C"} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
                  </div>
                ))}
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6}}>Subject</label>
                  <select value={form.subject} onChange={f("subject")} style={{...inp,cursor:"pointer",color:form.subject?ds.color.textDark:ds.color.textLight}}>
                    <option value="">Select topic</option>
                    <option>Product Inquiry</option><option>Request a Quote</option><option>Project Discussion</option><option>Delivery Information</option><option>Other</option>
                  </select>
                </div>
                <div style={{marginBottom:24}}>
                  <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6}}>Message</label>
                  <textarea value={form.message} onChange={f("message")} rows={5} placeholder="How can we help you?" style={{...inp,resize:"vertical",lineHeight:1.65}} onFocus={e=>e.target.style.borderColor="#CC2F3C"} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
                </div>
                <Btn variant={form.name&&form.email&&form.message?"primary":"outline"} size="lg" fullWidth disabled={!form.name||!form.email||!form.message} onClick={handleSend}>Send Message →</Btn>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  {code:"+63",flag:"🇵🇭",name:"Philippines"},
  {code:"+1", flag:"🇺🇸",name:"USA / Canada"},
  {code:"+65",flag:"🇸🇬",name:"Singapore"},
  {code:"+60",flag:"🇲🇾",name:"Malaysia"},
  {code:"+62",flag:"🇮🇩",name:"Indonesia"},
  {code:"+66",flag:"🇹🇭",name:"Thailand"},
  {code:"+84",flag:"🇻🇳",name:"Vietnam"},
  {code:"+971",flag:"🇦🇪",name:"UAE"},
  {code:"+966",flag:"🇸🇦",name:"Saudi Arabia"},
  {code:"+974",flag:"🇶🇦",name:"Qatar"},
  {code:"+44",flag:"🇬🇧",name:"UK"},
  {code:"+61",flag:"🇦🇺",name:"Australia"},
  {code:"+81",flag:"🇯🇵",name:"Japan"},
  {code:"+82",flag:"🇰🇷",name:"South Korea"},
];

const validateEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
const validateName  = n => n.trim().length >= 2;
const validatePhone = p => p.replace(/\D/g,"").length >= 7;

const PAYMENT_METHODS_DATA = [
  {id:"gcash",    label:"GCash",         color:"#007DFF", bg:"#E8F2FF",
   logo: <svg viewBox="0 0 80 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{height:22,width:"auto"}}><text x="4" y="21" fontFamily="Arial Black,Arial" fontWeight="900" fontSize="20" fill="#007DFF">G</text><text x="22" y="21" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="16" fill="#1A1410">Cash</text></svg>},
  {id:"maya",     label:"Maya",          color:"#5B2D8E", bg:"#F0E8FF",
   logo: <svg viewBox="0 0 80 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{height:22,width:"auto"}}><rect x="2" y="4" width="20" height="20" rx="5" fill="#5B2D8E"/><text x="6" y="19" fontFamily="Arial" fontWeight="900" fontSize="14" fill="#fff">M</text><text x="26" y="21" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="16" fill="#1A1410">maya</text></svg>},
  {id:"visa",     label:"Visa",          color:"#1A1F71", bg:"#EEF0FF",
   logo: <svg viewBox="0 0 60 24" fill="none" style={{height:22,width:"auto"}}><rect width="60" height="24" rx="4" fill="#1A1F71"/><text x="6" y="18" fontFamily="Arial" fontWeight="900" fontStyle="italic" fontSize="16" fill="#fff" letterSpacing="-1">VISA</text></svg>},
  {id:"mastercard",label:"Mastercard",   color:"#EB001B", bg:"#FFF0F0",
   logo: <svg viewBox="0 0 52 24" fill="none" style={{height:22,width:"auto"}}><circle cx="18" cy="12" r="10" fill="#EB001B"/><circle cx="34" cy="12" r="10" fill="#F79E1B"/><ellipse cx="26" cy="12" rx="4" ry="9.5" fill="#FF5F00"/></svg>},
  {id:"bank",     label:"Bank Transfer", color:"#1A7F5B", bg:"#E6F5EF",
   logo: <svg viewBox="0 0 80 28" fill="none" style={{height:22,width:"auto"}}><rect x="2" y="10" width="18" height="14" rx="2" fill="#1A7F5B"/><polygon points="11,2 2,10 20,10" fill="#1A7F5B"/><rect x="5" y="14" width="4" height="7" fill="#fff"/><rect x="12" y="14" width="4" height="7" fill="#fff"/><text x="24" y="21" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="13" fill="#1A1410">Bank Transfer</text></svg>},
  {id:"qrph",     label:"QR Ph",         color:"#CC2F3C", bg:"#FDECEA",
   logo: <svg viewBox="0 0 70 28" fill="none" style={{height:22,width:"auto"}}><rect x="2" y="2" width="11" height="11" rx="1.5" stroke="#CC2F3C" strokeWidth="2" fill="none"/><rect x="5" y="5" width="5" height="5" rx="0.5" fill="#CC2F3C"/><rect x="17" y="2" width="11" height="11" rx="1.5" stroke="#CC2F3C" strokeWidth="2" fill="none"/><rect x="20" y="5" width="5" height="5" rx="0.5" fill="#CC2F3C"/><rect x="2" y="17" width="11" height="11" rx="1.5" stroke="#CC2F3C" strokeWidth="2" fill="none"/><rect x="5" y="20" width="5" height="5" rx="0.5" fill="#CC2F3C"/><rect x="17" y="17" width="3" height="3" fill="#CC2F3C"/><rect x="22" y="17" width="3" height="3" fill="#CC2F3C"/><rect x="25" y="20" width="3" height="3" fill="#CC2F3C"/><rect x="17" y="25" width="3" height="3" fill="#CC2F3C"/><rect x="22" y="22" width="3" height="6" fill="#CC2F3C"/><text x="34" y="21" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="14" fill="#CC2F3C">QR Ph</text></svg>},
];

// ─── CART PAGE (v11) ─────────────────────────────────────────────────────────
// Major v11 changes:
// - Auto-populate name/email/phone from logged-in user profile (editable)
// - "Order for someone else" toggle adds recipient name + phone fields
// - Leaflet OpenStreetMap with draggable pin
// - FIXED: order placement now stores final cart snapshot in successOrder state
//   so success screen shows even after cart is cleared
// - paymentStatus field tracked separately ("awaiting" → "submitted" → "confirmed"/"rejected")
function CartPage({cart,removeFromCart,updateQty,setPage,user,onOrderComplete}){
  const [step,setStep]         = useState(1);
  const [orderMode,setOrderMode] = useState(null);
  const [forSomeoneElse,setForSomeoneElse] = useState(false);
  const [countryCode,setCountryCode] = useState("+63");
  const [details,setDetails]   = useState({name:"",email:"",phoneNum:"",address:"",instructions:""});
  // V11 NEW: recipient details when ordering for someone else
  const [recipient,setRecipient] = useState({name:"",phoneCode:"+63",phoneNum:""});
  const [fieldErrors,setFieldErrors] = useState({});
  const [method,setMethod]     = useState("");
  const [sending,setSending]   = useState(false);
  const [errMsg,setErrMsg]     = useState("");
  const [prescription,setPrescription] = useState(null);
  const [intlForm,setIntlForm] = useState({name:"",company:"",email:"",phone:"",country:"",city:"",shippingMethod:"",currency:"PHP",details:""});
  const [intlSending,setIntlSending] = useState(false);
  const [intlErr,setIntlErr]   = useState("");
  const [intlDone,setIntlDone] = useState(false);
  const [profileLoaded,setProfileLoaded] = useState(false);
  const [confirmedOrderId,setConfirmedOrderId] = useState("");
  // V11 FIX: Snapshot of cart at order time for success screen (cart will be cleared)
  const [successOrder,setSuccessOrder] = useState(null);
  // V11 NEW: Map coordinates
  const [deliveryCoords,setDeliveryCoords] = useState(null);
  const [showMap,setShowMap] = useState(false);

  // Auto-populate from logged-in user profile
  useEffect(()=>{
    if(!user||profileLoaded) return;
    (async()=>{
      try{
        const snap = await getDoc(doc(db,"customers",user.uid));
        if(snap.exists()){
          const d = snap.data();
          setDetails(prev=>({
            ...prev,
            name:    d.name    || prev.name,
            email:   d.email   || user.email || prev.email,
            address: d.savedAddress || prev.address,
          }));
          if(d.phone){
            const saved = d.phone;
            const matchedCode = COUNTRY_CODES.find(c=>saved.startsWith(c.code));
            if(matchedCode){
              setCountryCode(matchedCode.code);
              setDetails(prev=>({...prev, phoneNum: saved.slice(matchedCode.code.length).trim()}));
            } else {
              setDetails(prev=>({...prev, phoneNum: saved}));
            }
          }
        } else {
          setDetails(prev=>({...prev, email: user.email||""}));
        }
      }catch(_){}
      setProfileLoaded(true);
    })();
  },[user, profileLoaded]);

  const fullPhone = countryCode + details.phoneNum.replace(/^0+/,"");
  const fullRecipientPhone = recipient.phoneCode + recipient.phoneNum.replace(/^0+/,"");
  const total     = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const hasRx     = cart.some(i=>i.requiresPrescription);
  const intlFilled = intlForm.name&&intlForm.email&&intlForm.phone&&intlForm.country;
  const orderSummary = cart.map(i=>`${i.name} x${i.qty} — ${formatPHP(i.price*i.qty)}`).join("\n");

  const validateFields = () => {
    const errs = {};
    if(!validateName(details.name))      errs.name    = "Please enter your full name (at least 2 characters).";
    if(!validateEmail(details.email))    errs.email   = "Please enter a valid email address (e.g. you@email.com).";
    if(!validatePhone(details.phoneNum)) errs.phoneNum= "Please enter a valid phone number.";
    if(!details.address.trim())          errs.address = "Delivery address is required.";
    // V11: Validate recipient fields if ordering for someone else
    if(forSomeoneElse){
      if(!validateName(recipient.name))      errs.recipientName    = "Recipient's name is required (at least 2 characters).";
      if(!validatePhone(recipient.phoneNum)) errs.recipientPhoneNum= "Recipient's phone number is required.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const detFilled = validateName(details.name) && validateEmail(details.email) &&
                    validatePhone(details.phoneNum) && details.address.trim().length>0 &&
                    (!forSomeoneElse || (validateName(recipient.name) && validatePhone(recipient.phoneNum)));

  const inp    = {width:"100%",padding:"11px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,color:ds.color.textDark,outline:"none",fontFamily:ds.font.body,boxSizing:"border-box",background:"#fff",transition:"border-color 0.15s"};
  const inpErr = {border:`1.5px solid ${ds.color.red}`};
  const lbl    = {fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6};
  const errTxt = {fontSize:11.5,color:ds.color.red,marginTop:4};
  const fo     = e => e.target.style.borderColor = ds.color.red;
  const bl     = (e,key) => { e.target.style.borderColor = fieldErrors[key] ? ds.color.red : ds.color.border; };
  const setD   = k => e => { setDetails(p=>({...p,[k]:e.target.value})); if(fieldErrors[k]) setFieldErrors(p=>({...p,[k]:""})); };
  const setR   = k => e => { setRecipient(p=>({...p,[k]:e.target.value})); const errKey="recipient"+k.charAt(0).toUpperCase()+k.slice(1); if(fieldErrors[errKey]) setFieldErrors(p=>({...p,[errKey]:""})); };
  const setI   = k => e => setIntlForm(p=>({...p,[k]:e.target.value}));

  const handleRxUpload = e => {
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 10*1024*1024){ alert("File too large. Max 10MB."); return; }
    e.target.value = "";
    const r = new FileReader();
    r.onload = ev => setPrescription({preview:ev.target.result, name:file.name, file: file});
    r.readAsDataURL(file);
  };

  const goNext = () => { if(step===2&&!hasRx) setStep(4); else setStep(s=>s+1); };
  const goBack = () => { if(step===4&&!hasRx) setStep(2); else setStep(s=>s-1); };

  const handleContinue = () => {
    if(validateFields()) goNext();
  };

  const handlePlaceOrder = async () => {
    if(!method) return;
    setSending(true); setErrMsg("");
    const phone = fullPhone;
    // V11 FIX: ensure uid is properly stored for registered customers
    const orderData = {
      name: details.name, email: details.email, phone,
      address: details.address,
      instructions: details.instructions || null,
      paymentMethod: method,
      paymentStatus: "awaiting", // V11: separate payment tracking
      items: cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty,requiresPrescription:!!i.requiresPrescription})),
      total, status:"pending", createdAt: serverTimestamp(),
      uid: user ? user.uid : "guest",
      // V11: Recipient info if ordering for someone else
      recipientName:  forSomeoneElse ? recipient.name : null,
      recipientPhone: forSomeoneElse ? fullRecipientPhone : null,
      // V11: Map coordinates if dropped
      deliveryCoords: deliveryCoords,
    };

    const orderNotifParams = {
      customer_name:    details.name,
      customer_email:   details.email,
      customer_phone:   phone,
      customer_address: details.address,
      order_items:      orderSummary,
      order_total:      formatPHP(total),
      payment_method:   method,
    };
    const receiptParams = {
      customer_name:    details.name,
      customer_email:   details.email,
      customer_phone:   phone,
      customer_address: details.address,
      order_items:      orderSummary,
      order_total:      formatPHP(total),
      payment_method:   method,
      to_email:         details.email,
    };
    const withTimeout = (promise, ms=10000) =>
      Promise.race([promise, new Promise((_,reject)=>setTimeout(()=>reject(new Error("Request timed out. Check your connection and try again.")),ms))]);

    try {
      const orderRef = await withTimeout(addDoc(collection(db,"orders"), orderData));

      if(user){
        const earnedPts = Math.floor(total * POINTS_PER_PHP);
        try {
          const cSnap = await getDoc(doc(db,"customers",user.uid));
          if(cSnap.exists()){
            const d = cSnap.data();
            await updateDoc(doc(db,"customers",user.uid),{
              totalOrders:(d.totalOrders||0)+1,
              totalSpent:(d.totalSpent||0)+total,
              points:(d.points||0)+earnedPts,
              phone: phone,
            });
          }
        } catch(_){}
        if(hasRx && prescription){
          try {
            // V11.2 FIX: Upload the actual Rx file to Storage so admin can view it
            let rxFileUrl = null;
            if(prescription.file){
              try {
                const ext = prescription.name.split(".").pop()||"jpg";
                const path = "rx-uploads/"+orderRef.id+"/rx-"+Date.now()+"."+ext;
                const fileRef = storageRef(storage, path);
                await uploadBytes(fileRef, prescription.file);
                rxFileUrl = await getDownloadURL(fileRef);
              } catch(uploadErr){
                console.warn("Rx file upload failed:", uploadErr);
              }
            }
            await addDoc(collection(db,"rxUploads"),{
              uid:user.uid, customerName:details.name, orderId:orderRef.id,
              fileName:prescription.name,
              fileUrl: rxFileUrl,
              status:"pending", createdAt:serverTimestamp(),
            });
          } catch(_){}
        }
      }

      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.orderTemplateId, orderNotifParams, EMAILJS_CONFIG.publicKey);
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.receiptTemplateId, receiptParams, EMAILJS_CONFIG.publicKey);
      } catch(emailErr){
        console.warn("Email send failed (order still placed):", emailErr);
      }

      // V11 FIX: snapshot cart + details BEFORE clearing cart so success screen has data
      setSuccessOrder({
        id: orderRef.id,
        items: [...cart],
        total,
        details: {...details},
        fullPhone: phone,
        method,
        forSomeoneElse,
        recipient: forSomeoneElse ? {name:recipient.name, phone:fullRecipientPhone} : null,
      });
      setConfirmedOrderId(orderRef.id);
      setStep(5);
      // Clear cart AFTER snapshot is saved
      if(onOrderComplete) onOrderComplete();
    } catch(err) {
      console.error("Order placement error:", err);
      const msg = err.message?.includes("timed out")
        ? "Connection timed out. Please check your internet and try again."
        : err.message?.includes("permission")
        ? "Order could not be saved. Please contact us at "+CONTACT.email+" or try again."
        : "Something went wrong. Please try again or contact us at "+CONTACT.email;
      setErrMsg(msg);
    } finally {
      setSending(false);
    }
  };

  const handleIntlSubmit = async () => {
    if(!intlFilled) return;
    setIntlSending(true); setIntlErr("");
    try {
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
        from_name:intlForm.name, company:intlForm.company||"N/A",
        from_email:intlForm.email, phone:intlForm.phone,
        product:orderSummary, quantity:cart.reduce((s,i)=>s+i.qty,0)+" items",
        budget:`${formatPHP(total)} — INTERNATIONAL ORDER`,
        location:`${intlForm.city}, ${intlForm.country}`, timeline:"International Inquiry",
        details:`🌍 INTERNATIONAL\n\nCountry: ${intlForm.country}\nCity: ${intlForm.city}\nShipping: ${intlForm.shippingMethod||"Advise"}\nCurrency: ${intlForm.currency}\n\nItems:\n${orderSummary}\n\nValue: ${formatPHP(total)} (${formatUSD(total)} indicative)\n\nNotes:\n${intlForm.details||"None"}`,
        reply_to:intlForm.email,
      }, EMAILJS_CONFIG.publicKey);
      await addDoc(collection(db,"orders"),{
        name:intlForm.name, email:intlForm.email, phone:intlForm.phone,
        address:`${intlForm.city}, ${intlForm.country}`, paymentMethod:"International Inquiry",
        items:cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})),
        total, status:"international_inquiry",
        paymentStatus:"awaiting",
        createdAt:serverTimestamp(),
        uid: user ? user.uid : "guest",
      });
      setIntlDone(true);
      if(onOrderComplete) onOrderComplete();
    } catch(err) {
      console.error("Intl submit error:", err);
      setIntlErr("Something went wrong. Please email "+CONTACT.email);
    } finally {
      setIntlSending(false);
    }
  };

  // V11 FIX: Show success screen FIRST (before empty cart check) so it persists after cart clears
  if(step===5 && successOrder) return(
    <div style={{paddingTop:67,background:ds.color.canvas,minHeight:"100vh"}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"48px 24px"}}>

        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:ds.color.successBg,border:`3px solid ${ds.color.successBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 20px"}}>✓</div>
          <div style={{fontFamily:ds.font.display,fontSize:30,color:ds.color.textDark,marginBottom:8}}>Order Confirmed!</div>
          <p style={{fontSize:15,color:ds.color.textMuted,lineHeight:1.7}}>
            Thank you, <strong>{successOrder.details.name}</strong>! Your order has been received.<br/>
            A confirmation email has been sent to <strong>{successOrder.details.email}</strong>.
          </p>
          <div style={{fontSize:13,color:ds.color.textBody,marginTop:8,fontWeight:600}}>
            Order Reference: <span style={{color:ds.color.red,fontFamily:"monospace"}}>#{successOrder.id.slice(-6).toUpperCase()}</span>
          </div>
        </div>

        {/* v15.2: PROMINENT Payment Proof Upload Section — directly after order confirmation */}
        {successOrder.method !== "International Inquiry" && (
          <div style={{background:"#fff",border:`2px solid ${ds.color.red}`,borderRadius:ds.radius.xl,padding:"24px 28px",boxShadow:ds.shadow.md,marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:ds.color.redLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📸</div>
              <div>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>Upload Your Payment Proof</div>
                <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:2}}>Snap a screenshot of your GCash/Maya/bank transfer receipt and upload it here.</div>
              </div>
            </div>
            <PaymentProofUpload orderId={successOrder.id} onUploaded={()=>{}}/>
            <div style={{fontSize:11.5,color:ds.color.textMuted,marginTop:12,textAlign:"center",lineHeight:1.5}}>
              💡 <strong>Tip:</strong> Upload now to speed up order processing. Our team reviews payment proofs within 24 hours.
            </div>
          </div>
        )}

        <div id="dmeast-order-receipt" style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.md,marginBottom:24}}>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,paddingBottom:20,borderBottom:`2px solid ${ds.color.border}`}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Order Reference</div>
              <div style={{fontFamily:ds.font.display,fontSize:26,color:ds.color.red,letterSpacing:"0.04em"}}>#{successOrder.id.slice(-6).toUpperCase()}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <span style={{fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:ds.radius.pill,background:"#FEF9C3",color:"#A16207"}}>⏳ Awaiting Payment</span>
              <div style={{fontSize:11,color:ds.color.textMuted,marginTop:6}}>{new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}</div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 24px",marginBottom:24}}>
            {[
              {label:"Customer Name",  value:successOrder.details.name},
              {label:"Email",          value:successOrder.details.email},
              {label:"Phone",          value:successOrder.fullPhone},
              {label:"Payment Method", value:successOrder.method},
            ].map(f=>(
              <div key={f.label}>
                <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{f.label}</div>
                <div style={{fontSize:14,color:ds.color.textDark,fontWeight:500}}>{f.value||"—"}</div>
              </div>
            ))}
            {successOrder.forSomeoneElse&&successOrder.recipient&&(
              <div style={{gridColumn:"1/-1",background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,padding:"10px 14px"}}>
                <div style={{fontSize:10,fontWeight:700,color:ds.color.gold,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>📦 Recipient (Order is for someone else)</div>
                <div style={{fontSize:13,color:ds.color.textDark,fontWeight:600}}>{successOrder.recipient.name} · {successOrder.recipient.phone}</div>
              </div>
            )}
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Delivery Address</div>
              <div style={{fontSize:14,color:ds.color.textDark,fontWeight:500}}>{successOrder.details.address}</div>
              {successOrder.details.instructions&&<div style={{fontSize:12,color:ds.color.textMuted,marginTop:3}}>📝 {successOrder.details.instructions}</div>}
            </div>
          </div>

          <div style={{background:ds.color.canvas,borderRadius:ds.radius.lg,padding:"18px 20px",marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Order Items</div>
            {successOrder.items.map(item=>(
              <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${ds.color.borderLight}`}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark}}>{item.name}</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>
                    {formatPHP(item.price)} × {item.qty}
                    {item.requiresPrescription&&<span style={{marginLeft:8,color:"#92400E",fontWeight:600}}>💊 Rx</span>}
                  </div>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:ds.color.textDark}}>{formatPHP(item.price*item.qty)}</div>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:14,marginTop:4,fontSize:17,fontWeight:700,color:ds.color.textDark}}>
              <span>Total Amount</span>
              <span style={{color:ds.color.red}}>{formatPHP(successOrder.total)}</span>
            </div>
          </div>

          {user&&(
            <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:22}}>⭐</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:ds.color.gold}}>You earned {Math.floor(successOrder.total*POINTS_PER_PHP)} reward points!</div>
                <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>Worth {formatPHP(Math.floor(successOrder.total*POINTS_PER_PHP)*POINT_VALUE)} in store credit. View in your portal.</div>
              </div>
            </div>
          )}

          <div style={{borderTop:`1px solid ${ds.color.borderLight}`,paddingTop:20}}>
            <div style={{fontSize:12,fontWeight:700,color:ds.color.textDark,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>What Happens Next</div>
            {[
              {step:"1",icon:"💳",title:"Send your payment",desc:"Use your selected payment method ("+successOrder.method+") to send the total amount."},
              {step:"2",icon:"📎",title:"Upload payment proof",desc:"Upload your payment screenshot below or in your customer portal/track-order page."},
              {step:"3",icon:"✅",title:"We confirm your payment",desc:"Our team reviews your proof within 24 hours and confirms your payment via email."},
              {step:"4",icon:"🚚",title:"Order shipped & delivered",desc:"Once confirmed, your order is prepared and shipped to your address."},
            ].map(s=>(
              <div key={s.step} style={{display:"flex",gap:14,marginBottom:14}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{s.icon}</div>
                <div>
                  <div style={{fontSize:13.5,fontWeight:700,color:ds.color.textDark,marginBottom:2}}>Step {s.step}: {s.title}</div>
                  <div style={{fontSize:12.5,color:ds.color.textMuted,lineHeight:1.6}}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{borderTop:"1px solid "+ds.color.borderLight,paddingTop:20,marginTop:4}}>
            <div style={{fontSize:12,fontWeight:700,color:ds.color.textDark,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Or Track Your Order Later</div>
            <div style={{fontSize:13,color:ds.color.textMuted,marginBottom:0}}>You can also track your order and upload payment proof later.</div>
          </div>

          <div style={{background:ds.color.canvas,borderRadius:ds.radius.md,padding:"14px 18px",marginTop:16,textAlign:"center"}}>
            <div style={{fontSize:13,color:ds.color.textMuted}}>Track your order anytime: <button onClick={()=>setPage("track")} style={{background:"none",border:"none",color:ds.color.red,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:ds.font.body}}>Track Order →</button></div>
          </div>

          <div style={{background:ds.color.canvas,borderRadius:ds.radius.md,padding:"14px 18px",marginTop:8,display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{fontSize:12,color:ds.color.textMuted,fontWeight:600}}>Need help? Contact us:</div>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:6,background:"#25D366",color:"#fff",padding:"6px 14px",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,textDecoration:"none"}}>
              💬 WhatsApp
            </a>
            <a href={"tel:"+CONTACT.phone1Raw}
              style={{display:"inline-flex",alignItems:"center",gap:6,background:ds.color.redLight,color:ds.color.red,padding:"6px 14px",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,textDecoration:"none"}}>
              📞 {CONTACT.phone1}
            </a>
          </div>
        </div>

        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}>
          <button onClick={()=>window.print()} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"11px 22px",borderRadius:ds.radius.md,border:`1.5px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontFamily:ds.font.body,fontSize:14,fontWeight:600,color:ds.color.textBody}}>
            🖨️ Print / Save as PDF
          </button>
          {user&&<Btn variant="ghost" size="md" onClick={()=>setPage("portal")}>📋 View My Orders</Btn>}
          <Btn variant="primary" size="md" onClick={()=>setPage("home")}>Back to Home</Btn>
        </div>
        <p style={{textAlign:"center",fontSize:12,color:ds.color.textLight}}>Screenshot or print this page for your records. Your order reference is <strong>#{successOrder.id.slice(-6).toUpperCase()}</strong>.</p>
      </div>
    </div>
  );

  // ── Empty cart (only show if NOT in success state)
  if(cart.length===0) return(
    <div style={{paddingTop:67,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",background:ds.color.canvas}}>
      <div style={{textAlign:"center",maxWidth:400,padding:"0 24px"}}>
        <div style={{fontSize:48,marginBottom:16}}>🛒</div>
        <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark,marginBottom:10}}>Your cart is empty</div>
        <p style={{fontSize:14,color:ds.color.textMuted,lineHeight:1.7,marginBottom:24}}>Browse our catalog and add items to your cart.</p>
        <Btn variant="primary" size="md" onClick={()=>setPage("products")}>Browse Products</Btn>
      </div>
    </div>
  );

  // ── Step 0 — Choose Local or International
  if(orderMode===null) return(
    <div style={{paddingTop:67,minHeight:"80vh",background:ds.color.canvas,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:620,width:"100%",padding:"0 24px"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontFamily:ds.font.display,fontSize:26,color:ds.color.textDark,marginBottom:10}}>Where are you ordering from?</div>
          <p style={{fontSize:14,color:ds.color.textMuted,lineHeight:1.7}}>This helps us give you the right checkout process and accurate shipping options.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          {[{flag:"🇵🇭",title:"Philippines",desc:"Local delivery nationwide. Standard checkout with payment selection.",features:["✓ Direct checkout","✓ GCash / Maya / Bank","✓ 1–7 day delivery"],mode:"local",accent:ds.color.red},
            {flag:"🌍",title:"International",desc:"Outside the Philippines. We'll prepare a proforma invoice.",features:["✓ Proforma invoice","✓ FedEx / Air / Sea Cargo","✓ Full export docs"],mode:"intl",accent:ds.color.gold}
          ].map(o=>(
            <button key={o.mode} onClick={()=>setOrderMode(o.mode)} style={{background:ds.color.white,border:`2px solid ${ds.color.border}`,borderRadius:ds.radius.xl,padding:"32px 24px",cursor:"pointer",textAlign:"center",transition:"all 0.2s",fontFamily:ds.font.body}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=o.accent;e.currentTarget.style.boxShadow=ds.shadow.md;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=ds.color.border;e.currentTarget.style.boxShadow="none";}}>
              <div style={{fontSize:48,marginBottom:14}}>{o.flag}</div>
              <div style={{fontSize:17,fontWeight:700,color:ds.color.textDark,marginBottom:8}}>{o.title}</div>
              <div style={{fontSize:13,color:ds.color.textMuted,lineHeight:1.6,marginBottom:16}}>{o.desc}</div>
              {o.features.map(f=><div key={f} style={{fontSize:12,color:o.mode==="local"?ds.color.success:ds.color.gold,fontWeight:500,marginBottom:3}}>{f}</div>)}
            </button>
          ))}
        </div>
        <div style={{marginTop:20,textAlign:"center"}}><button onClick={()=>setPage("products")} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:ds.color.textMuted,fontFamily:ds.font.body}}>← Continue browsing</button></div>
      </div>
    </div>
  );

  // ── International
  if(orderMode==="intl"){
    if(intlDone) return(
      <div style={{paddingTop:67,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",background:ds.color.canvas}}>
        <div style={{textAlign:"center",maxWidth:460,padding:"0 24px"}}>
          <div style={{width:76,height:76,borderRadius:"50%",background:"#FEF6E0",border:`2px solid ${ds.color.goldBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 24px"}}>🌍</div>
          <div style={{fontFamily:ds.font.display,fontSize:26,color:ds.color.textDark,marginBottom:10}}>International Inquiry Received!</div>
          <p style={{fontSize:15,color:ds.color.textMuted,lineHeight:1.7,marginBottom:24}}>Thank you, <strong>{intlForm.name}</strong>! Our team will respond to <strong>{intlForm.email}</strong> with a Proforma Invoice within 24–48 hours.</p>
          <Btn variant="primary" size="md" onClick={()=>{setOrderMode(null);setIntlDone(false);setPage("home");}}>Back to Home</Btn>
        </div>
      </div>
    );
    return(
      <div style={{paddingTop:67,background:ds.color.canvas,minHeight:"80vh"}}>
        <div style={{maxWidth:860,margin:"0 auto",padding:"44px 28px"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
            <button onClick={()=>setOrderMode(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:ds.color.textMuted}}>←</button>
            <div>
              <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark}}>🌍 International Order Inquiry</div>
              <div style={{fontSize:13,color:ds.color.textMuted,marginTop:2}}>We'll prepare a Proforma Invoice with full landed cost.</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24,alignItems:"start"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px",marginBottom:16}}>
                {[["Full Name *","name","text","Your full name"],["Company / Organization","company","text","Hospital, clinic…"],["Email Address *","email","email","you@email.com"]].map(([l,k,t,ph])=>(
                  <div key={k}><label style={lbl}>{l}</label><input type={t} value={intlForm[k]} onChange={setI(k)} placeholder={ph} style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/></div>
                ))}
                <div>
                  <label style={lbl}>Phone / WhatsApp *</label>
                  <div style={{display:"flex",gap:8}}>
                    <select value={intlForm.countryCode||"+63"} onChange={e=>setIntlForm(p=>({...p,countryCode:e.target.value}))} style={{...inp,width:"auto",minWidth:90,flexShrink:0,padding:"11px 10px"}}>
                      {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                    <input value={intlForm.phone} onChange={setI("phone")} placeholder="9XX XXX XXXX" style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px",marginBottom:16}}>
                {[["Country *","country","text","e.g. Singapore, UAE…"],["City / Port","city","text","e.g. Dubai, Singapore…"]].map(([l,k,t,ph])=>(
                  <div key={k}><label style={lbl}>{l}</label><input type={t} value={intlForm[k]} onChange={setI(k)} placeholder={ph} style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/></div>
                ))}
                <div><label style={lbl}>Preferred Shipping</label>
                  <select value={intlForm.shippingMethod} onChange={setI("shippingMethod")} style={{...inp,cursor:"pointer"}}>
                    <option value="">Let DMEAST advise</option><option>Air Cargo (5–10 days)</option><option>Sea Cargo (15–45 days)</option><option>FedEx / DHL Express</option>
                  </select>
                </div>
                <div><label style={lbl}>Preferred Currency</label>
                  <select value={intlForm.currency} onChange={setI("currency")} style={{...inp,cursor:"pointer"}}>
                    <option value="PHP">PHP (₱)</option><option value="USD">USD ($)</option><option value="SGD">SGD (S$)</option><option value="AED">AED</option>
                  </select>
                </div>
              </div>
              <div style={{marginBottom:20}}><label style={lbl}>Additional Notes</label><textarea value={intlForm.details} onChange={setI("details")} rows={3} placeholder="Delivery port, special requirements…" style={{...inp,resize:"vertical",lineHeight:1.65}} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/></div>
              {intlErr&&<div style={{marginBottom:14,padding:"12px 16px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{intlErr}</div>}
              <Btn variant={intlFilled?"gold":"outline"} size="lg" fullWidth disabled={!intlFilled||intlSending} onClick={handleIntlSubmit}>{intlSending?"Sending…":"Submit International Inquiry →"}</Btn>
            </div>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"24px",border:`1px solid ${ds.color.border}`}}>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Order Summary</div>
              {cart.map(item=><div key={item.id} style={{display:"flex",justifyContent:"space-between",fontSize:12.5,color:ds.color.textBody,marginBottom:6}}><span style={{flex:1}}>{item.name} × {item.qty}</span><span style={{fontWeight:600,marginLeft:8}}>{formatPHP(item.price*item.qty)}</span></div>)}
              <div style={{borderTop:`1px solid ${ds.color.border}`,marginTop:10,paddingTop:10,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:14}}><span>Subtotal</span><span>{formatPHP(total)}</span></div>
              <div style={{fontSize:11,color:ds.color.textLight,marginTop:6}}>{formatUSD(total)} · indicative</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Local checkout
  const stepLabels=[["1","Review"],["2","Details"],["3","Rx"],["4","Payment"]];

  return(
    <div style={{paddingTop:67,background:ds.color.canvas,minHeight:"80vh"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:"40px 28px"}}>

        <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:32,maxWidth:500}}>
          {stepLabels.map(([n,label],i)=>{
            const s=parseInt(n); const active=step===s; const done=step>s;
            return(
              <div key={n} style={{display:"flex",alignItems:"center",flex:i<3?1:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:done?ds.color.success:active?ds.color.red:ds.color.border,color:done||active?"#fff":ds.color.textMuted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{done?"✓":n}</div>
                  <span style={{fontSize:12,fontWeight:500,color:active?ds.color.textDark:ds.color.textMuted,whiteSpace:"nowrap"}}>{label}</span>
                </div>
                {i<3&&<div style={{flex:1,height:2,background:done?ds.color.success:ds.color.borderLight,margin:"0 12px"}}/>}
              </div>
            );
          })}
        </div>

        {/* ── Step 1 — Cart Review */}
        {step===1&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:24,alignItems:"start"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"28px 32px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:20}}>🛒 Your Cart ({cart.length} item{cart.length!==1?"s":""})</div>
              {cart.map(item=>(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 0",borderBottom:`1px solid ${ds.color.borderLight}`}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark}}>{item.name}</div>
                    {item.requiresPrescription&&<div style={{fontSize:11,color:"#92400E",marginTop:2}}>💊 Prescription required</div>}
                    <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{formatPHP(item.price)} per unit</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <button onClick={()=>updateQty(item.id,item.qty-1)} style={{width:28,height:28,borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                    <span style={{fontSize:14,fontWeight:600,minWidth:20,textAlign:"center"}}>{item.qty}</span>
                    <button onClick={()=>updateQty(item.id,item.qty+1)} style={{width:28,height:28,borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,minWidth:90,textAlign:"right"}}>{formatPHP(item.price*item.qty)}</div>
                  <button onClick={()=>removeFromCart(item.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:ds.color.textLight,padding:4}}>✕</button>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"24px",border:`1px solid ${ds.color.border}`}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:16}}>Order Total</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:700,marginBottom:6}}><span>Total</span><span>{formatPHP(total)}</span></div>
              <div style={{fontSize:12,color:ds.color.textLight,marginBottom:20}}>{formatUSD(total)} · indicative</div>
              {hasRx&&<div style={{background:"#FFF3CD",border:"1px solid #FBBF24",borderRadius:ds.radius.md,padding:"10px 14px",fontSize:12,color:"#92400E",marginBottom:16}}>💊 Prescription items in cart. You'll be asked to upload a valid Rx.</div>}
              {user&&<div style={{background:ds.color.goldLight,borderRadius:ds.radius.md,padding:"10px 12px",fontSize:12,color:ds.color.gold,marginBottom:16}}>⭐ You'll earn <strong>{Math.floor(total*POINTS_PER_PHP)} points</strong> for this order!</div>}
              <Btn variant="primary" size="lg" fullWidth onClick={()=>setStep(2)}>Proceed to Checkout →</Btn>
              <button onClick={()=>setOrderMode(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12.5,color:ds.color.textMuted,fontFamily:ds.font.body,marginTop:12,display:"block",width:"100%",textAlign:"center"}}>← Change shipping region</button>
            </div>
          </div>
        )}

        {/* ── Step 2 — Delivery Details (V11: redesigned) */}
        {step===2&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24,alignItems:"start"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:8}}>📦 Delivery Details</div>

              {/* V11: Radio question — Who is this order for? */}
              {user&&(
                <div style={{background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"14px 16px",marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark,marginBottom:10}}>Who is this order for?</div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${!forSomeoneElse?ds.color.red:ds.color.border}`,background:!forSomeoneElse?ds.color.redLight:"#fff",fontSize:13,fontWeight:600,color:!forSomeoneElse?ds.color.red:ds.color.textBody}}>
                      <input type="radio" name="orderFor" checked={!forSomeoneElse} onChange={()=>setForSomeoneElse(false)} style={{accentColor:ds.color.red}}/>
                      🙋 For myself
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${forSomeoneElse?ds.color.red:ds.color.border}`,background:forSomeoneElse?ds.color.redLight:"#fff",fontSize:13,fontWeight:600,color:forSomeoneElse?ds.color.red:ds.color.textBody}}>
                      <input type="radio" name="orderFor" checked={forSomeoneElse} onChange={()=>setForSomeoneElse(true)} style={{accentColor:ds.color.red}}/>
                      📦 For someone else
                    </label>
                  </div>
                </div>
              )}

              {user&&!forSomeoneElse&&(
                <div style={{background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,padding:"10px 14px",marginBottom:20,fontSize:13,color:ds.color.success}}>
                  ✓ Auto-filled from your profile. You can edit any field below.
                </div>
              )}

              {/* Account holder details */}
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>{forSomeoneElse?"Your Contact Info (Account Holder)":"Your Information"}</div>

              <div style={{marginBottom:16}}>
                <label style={lbl}>Full Name *</label>
                <input value={details.name} onChange={setD("name")} placeholder="Full name" style={{...inp,...(fieldErrors.name?inpErr:{})}} onFocus={fo} onBlur={e=>bl(e,"name")}/>
                {fieldErrors.name&&<div style={errTxt}>⚠ {fieldErrors.name}</div>}
              </div>

              <div style={{marginBottom:16}}>
                <label style={lbl}>Email Address *</label>
                <input type="email" value={details.email} onChange={setD("email")} placeholder="you@email.com" style={{...inp,...(fieldErrors.email?inpErr:{})}} onFocus={fo} onBlur={e=>bl(e,"email")}/>
                {fieldErrors.email&&<div style={errTxt}>⚠ {fieldErrors.email}</div>}
              </div>

              <div style={{marginBottom:20}}>
                <label style={lbl}>Phone / WhatsApp *</label>
                <div style={{display:"flex",gap:8}}>
                  <select value={countryCode} onChange={e=>setCountryCode(e.target.value)} style={{...inp,width:"auto",minWidth:100,flexShrink:0,padding:"11px 10px",cursor:"pointer"}}>
                    {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                  <div style={{flex:1}}>
                    <input value={details.phoneNum} onChange={setD("phoneNum")} placeholder={countryCode==="+63"?"9XX XXX XXXX":"Phone number"} style={{...inp,...(fieldErrors.phoneNum?inpErr:{})}} onFocus={fo} onBlur={e=>bl(e,"phoneNum")}/>
                    {fieldErrors.phoneNum&&<div style={errTxt}>⚠ {fieldErrors.phoneNum}</div>}
                  </div>
                </div>
                <div style={{fontSize:11,color:ds.color.textLight,marginTop:4}}>Full number: {fullPhone||"—"}</div>
              </div>

              {/* V11: Recipient info section */}
              {forSomeoneElse&&(
                <>
                  <div style={{fontSize:11,fontWeight:700,color:ds.color.gold,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12,marginTop:8,paddingTop:18,borderTop:`1px dashed ${ds.color.border}`}}>📦 Recipient's Info (Person Receiving the Order)</div>

                  <div style={{marginBottom:16}}>
                    <label style={lbl}>Recipient's Full Name *</label>
                    <input value={recipient.name} onChange={setR("name")} placeholder="Person who will receive the order" style={{...inp,...(fieldErrors.recipientName?inpErr:{})}} onFocus={fo} onBlur={e=>e.target.style.borderColor=fieldErrors.recipientName?ds.color.red:ds.color.border}/>
                    {fieldErrors.recipientName&&<div style={errTxt}>⚠ {fieldErrors.recipientName}</div>}
                  </div>

                  <div style={{marginBottom:20}}>
                    <label style={lbl}>Recipient's Phone *</label>
                    <div style={{display:"flex",gap:8}}>
                      <select value={recipient.phoneCode} onChange={e=>setRecipient(p=>({...p,phoneCode:e.target.value}))} style={{...inp,width:"auto",minWidth:100,flexShrink:0,padding:"11px 10px",cursor:"pointer"}}>
                        {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                      </select>
                      <div style={{flex:1}}>
                        <input value={recipient.phoneNum} onChange={setR("phoneNum")} placeholder={recipient.phoneCode==="+63"?"9XX XXX XXXX":"Phone number"} style={{...inp,...(fieldErrors.recipientPhoneNum?inpErr:{})}} onFocus={fo} onBlur={e=>e.target.style.borderColor=fieldErrors.recipientPhoneNum?ds.color.red:ds.color.border}/>
                        {fieldErrors.recipientPhoneNum&&<div style={errTxt}>⚠ {fieldErrors.recipientPhoneNum}</div>}
                      </div>
                    </div>
                    <div style={{fontSize:11,color:ds.color.textLight,marginTop:4}}>Recipient phone: {fullRecipientPhone||"—"}</div>
                  </div>
                </>
              )}

              {/* Address with map */}
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12,marginTop:4,paddingTop:18,borderTop:`1px dashed ${ds.color.border}`}}>🗺️ Delivery Location</div>

              <div style={{marginBottom:12}}>
                <label style={lbl}>Delivery Address *</label>
                <textarea value={details.address} onChange={setD("address")} rows={3} placeholder="Unit/House No., Street, Barangay, City, Province, ZIP" style={{...inp,...(fieldErrors.address?inpErr:{}),resize:"vertical",lineHeight:1.65}} onFocus={fo} onBlur={e=>bl(e,"address")}/>
                {fieldErrors.address&&<div style={errTxt}>⚠ {fieldErrors.address}</div>}
              </div>

              {/* V11: Toggle map */}
              <div style={{marginBottom:16}}>
                {!showMap?(
                  <button type="button" onClick={()=>setShowMap(true)} style={{padding:"10px 16px",borderRadius:ds.radius.md,border:`1.5px solid ${ds.color.red}`,background:ds.color.redLight,cursor:"pointer",fontSize:13,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body,display:"inline-flex",alignItems:"center",gap:8}}>
                    🗺️ Pin Exact Location on Map
                  </button>
                ):(
                  <>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <div style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark}}>🗺️ Pin Your Exact Delivery Location</div>
                      <button type="button" onClick={()=>setShowMap(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:ds.color.textMuted,fontFamily:ds.font.body}}>Hide map ✕</button>
                    </div>
                    <LeafletAddressMap
                      onAddressChange={(addr)=>{ setDetails(p=>({...p,address:addr})); if(fieldErrors.address) setFieldErrors(p=>({...p,address:""})); }}
                      onCoordsChange={(c)=>setDeliveryCoords(c)}
                    />
                    {deliveryCoords&&<div style={{fontSize:11,color:ds.color.success,marginTop:6}}>✓ Location pinned: {deliveryCoords.lat.toFixed(5)}, {deliveryCoords.lng.toFixed(5)}</div>}
                  </>
                )}
              </div>

              <div style={{marginBottom:24}}>
                <label style={lbl}>Delivery Instructions <span style={{fontSize:11,fontWeight:400,color:ds.color.textMuted}}>(optional)</span></label>
                <input value={details.instructions} onChange={setD("instructions")} placeholder="Gate code, landmark, leave at door…" style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
              </div>

              <div style={{display:"flex",gap:12}}>
                <Btn variant="outline" size="lg" onClick={()=>setStep(1)}>← Back</Btn>
                <div style={{flex:1}}><Btn variant={detFilled?"primary":"outline"} size="lg" fullWidth disabled={!detFilled} onClick={handleContinue}>Continue →</Btn></div>
              </div>
              {Object.keys(fieldErrors).length>0&&(
                <div style={{marginTop:12,padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>
                  ⚠ Please correct the highlighted fields above to continue.
                </div>
              )}
            </div>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"24px",border:`1px solid ${ds.color.border}`}}>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Order Summary</div>
              {cart.map(item=><div key={item.id} style={{display:"flex",justifyContent:"space-between",fontSize:12.5,color:ds.color.textBody,marginBottom:6}}><span>{item.name} × {item.qty}</span><span style={{fontWeight:600}}>{formatPHP(item.price*item.qty)}</span></div>)}
              <div style={{borderTop:`1px solid ${ds.color.border}`,marginTop:10,paddingTop:10,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:14}}><span>Total</span><span>{formatPHP(total)}</span></div>
            </div>
          </div>
        )}

        {/* ── Step 3 — Prescription */}
        {step===3&&hasRx&&(
          <div style={{maxWidth:600,margin:"0 auto"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"36px 40px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:8}}>💊 Prescription Upload</div>
              <p style={{fontSize:14,color:ds.color.textMuted,lineHeight:1.7,marginBottom:24}}>Your cart contains prescription-only items. A valid doctor's prescription is required to process your order.</p>
              <div style={{border:`2px dashed ${prescription?ds.color.success:ds.color.border}`,borderRadius:ds.radius.lg,padding:28,textAlign:"center",background:prescription?ds.color.successBg:ds.color.canvas,marginBottom:20,transition:"all 0.2s"}}>
                {prescription?(
                  <>
                    <div style={{fontSize:32,marginBottom:8}}>✅</div>
                    <div style={{fontSize:14,fontWeight:700,color:ds.color.success,marginBottom:4}}>Prescription Uploaded</div>
                    <div style={{fontSize:12,color:ds.color.textMuted,marginBottom:12}}>{prescription.name}</div>
                    {prescription.preview&&prescription.preview.startsWith("data:image")&&<img src={prescription.preview} alt="Rx" style={{maxWidth:200,maxHeight:150,objectFit:"contain",borderRadius:ds.radius.md,margin:"0 auto 12px",display:"block"}}/>}
                    <button onClick={()=>setPrescription(null)} style={{background:"none",border:"none",color:ds.color.red,cursor:"pointer",fontSize:13,fontFamily:ds.font.body}}>Remove and re-upload</button>
                  </>
                ):(
                  <>
                    <div style={{fontSize:40,marginBottom:10}}>📋</div>
                    <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark,marginBottom:16}}>Upload your doctor's prescription</div>
                    <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:12}}>
                      <label htmlFor="rx-camera-input" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 20px",borderRadius:ds.radius.lg,border:`2px solid ${ds.color.red}`,background:ds.color.redLight,cursor:"pointer",fontSize:14,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body}}>
                        📷 Take a Photo
                      </label>
                      <label htmlFor="rx-file-input" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 20px",borderRadius:ds.radius.lg,border:`2px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,color:ds.color.textBody,fontFamily:ds.font.body}}>
                        📁 Upload from Device
                      </label>
                    </div>
                    <div style={{fontSize:12,color:ds.color.textLight}}>Accepted: JPG, PNG, PDF · Max 10MB</div>
                  </>
                )}
              </div>
              <input id="rx-camera-input" type="file" accept="image/*" capture="environment" onChange={handleRxUpload} style={{display:"none"}}/>
              <input id="rx-file-input" type="file" accept="image/*,application/pdf" onChange={handleRxUpload} style={{display:"none"}}/>
              <div style={{fontSize:12,color:ds.color.textMuted,lineHeight:1.7,marginBottom:24,padding:"12px 14px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.borderLight}`}}>
                <strong style={{color:ds.color.textDark}}>Valid prescription must show:</strong><br/>
                ✓ Doctor's name and PRC license · ✓ Patient name and date<br/>
                ✓ Medicine name, dosage, quantity · ✓ Doctor's signature · ✓ Not more than 1 year old
              </div>
              <div style={{display:"flex",gap:12}}>
                <Btn variant="outline" size="lg" onClick={goBack}>← Back</Btn>
                <div style={{flex:1}}><Btn variant={prescription?"primary":"outline"} size="lg" fullWidth disabled={!prescription} onClick={goNext}>{prescription?"Continue to Payment →":"Upload prescription to continue"}</Btn></div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4 — Payment */}
        {step===4&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24,alignItems:"start"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:6}}>Select Payment Method</div>
              <p style={{fontSize:14,color:ds.color.textMuted,marginBottom:22}}>Payment instructions will be sent to <strong>{details.email}</strong> after placing your order. You can upload your payment proof immediately on the next screen.</p>

              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:24,padding:"12px 14px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.borderLight}`,alignItems:"center"}}>
                <span style={{fontSize:13}}>🔒</span><span style={{fontSize:11,fontWeight:700,color:ds.color.success}}>Secure Checkout</span>
                <div style={{width:1,height:16,background:ds.color.border}}/>
                <span style={{fontSize:11,color:ds.color.textMuted}}>All payments processed securely</span>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
                {PAYMENT_METHODS_DATA.map(m=>(
                  <button key={m.id} onClick={()=>setMethod(m.label)} style={{
                    padding:"18px 12px",borderRadius:ds.radius.lg,
                    border:`2px solid ${method===m.label?m.color:ds.color.border}`,
                    background:method===m.label?m.bg:ds.color.canvas,
                    cursor:"pointer",fontFamily:ds.font.body,
                    display:"flex",flexDirection:"column",alignItems:"center",gap:10,
                    transition:"all 0.15s",boxShadow:method===m.label?`0 0 0 3px ${m.color}22`:"none",
                  }}>
                    <div style={{height:26,display:"flex",alignItems:"center",justifyContent:"center"}}>{m.logo}</div>
                    <span style={{fontSize:11.5,fontWeight:600,color:method===m.label?m.color:ds.color.textBody}}>{m.label}</span>
                  </button>
                ))}
              </div>

              {errMsg&&<div style={{marginBottom:14,padding:"12px 16px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
              <div style={{display:"flex",gap:12}}>
                <Btn variant="outline" size="lg" onClick={goBack}>← Back</Btn>
                <div style={{flex:1}}><Btn variant={method?"primary":"outline"} size="lg" fullWidth disabled={!method||sending} onClick={handlePlaceOrder}>
                  {sending?<><Spinner size={16} color="#fff"/>&nbsp;Placing Order…</>:method?`Place Order — ${formatPHP(total)} →`:"Select a payment method"}
                </Btn></div>
              </div>
              <p style={{textAlign:"center",fontSize:12,color:ds.color.textMuted,marginTop:12,lineHeight:1.6}}>By placing your order you agree to be contacted for payment and delivery confirmation.</p>
            </div>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"24px",border:`1px solid ${ds.color.border}`}}>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Order Summary</div>
              {cart.map(item=><div key={item.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody,marginBottom:6}}><span>{item.name} × {item.qty}{item.requiresPrescription?" 💊":""}</span><span style={{fontWeight:600}}>{formatPHP(item.price*item.qty)}</span></div>)}
              <div style={{borderTop:`1px solid ${ds.color.border}`,marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:15}}><span>Total</span><span>{formatPHP(total)}</span></div>
              <div style={{marginTop:8,fontSize:13,color:ds.color.textMuted}}>📍 {details.address}</div>
              {forSomeoneElse&&<div style={{marginTop:4,fontSize:12,color:ds.color.gold}}>📦 For: {recipient.name} ({fullRecipientPhone})</div>}
              {hasRx&&prescription&&<div style={{marginTop:4,fontSize:13,color:ds.color.success}}>✓ Rx: {prescription.name}</div>}
              {user&&<div style={{marginTop:12,background:ds.color.goldLight,borderRadius:ds.radius.md,padding:"10px 12px",fontSize:12,color:ds.color.gold}}>⭐ Earn <strong>{Math.floor(total*POINTS_PER_PHP)} points</strong> for this order!</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TRACK ORDER PAGE ────────────────────────────────────────────────────────
function TrackOrderPage(){
  const [refInput, setRefInput] = useState("");
  const [order,    setOrder]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const ref = refInput.trim().toUpperCase().replace("#","");
    if (ref.length < 4) { setError("Please enter a valid order reference number."); return; }
    setLoading(true); setError(""); setOrder(null); setSearched(true);
    try {
      const snap = await getDocs(collection(db,"orders"));
      const match = snap.docs.find(d => d.id.slice(-6).toUpperCase() === ref.slice(-6).toUpperCase());
      if (match) {
        setOrder({ id: match.id, ...match.data() });
      } else {
        setError("No order found with reference \""+ref+"\". Please check and try again.");
      }
    } catch(e) {
      setError("Could not search orders. Please try again or contact us.");
    }
    setLoading(false);
  };

  const statusSteps = ["pending","confirmed","processing","shipped","delivered"];
  const inp = {width:"100%",padding:"14px 18px",border:"2px solid "+ds.color.border,borderRadius:ds.radius.lg,fontSize:16,outline:"none",fontFamily:ds.font.body,color:ds.color.textDark,boxSizing:"border-box",background:"#fff",textAlign:"center",letterSpacing:"0.1em",fontWeight:700,textTransform:"uppercase"};

  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Order Tracking" title="Track Your Order" subtitle="Enter your order reference number to check the current status of your order."/>
      <div style={{maxWidth:600,margin:"0 auto",padding:"48px 24px"}}>
        <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.md,border:"1px solid "+ds.color.borderLight,marginBottom:32}}>
          <div style={{fontSize:13,color:ds.color.textMuted,marginBottom:16,textAlign:"center"}}>Your order reference was shown on the confirmation screen and included in your confirmation email.</div>
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <input value={refInput} onChange={e=>setRefInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()} placeholder="e.g. A3F9C2" style={inp}/>
            <Btn variant="primary" size="lg" onClick={handleSearch} disabled={loading}>{loading?"Searching…":"Track"}</Btn>
          </div>
          {error&&<div style={{background:ds.color.redLight,border:"1px solid "+ds.color.redBorder,borderRadius:ds.radius.md,padding:"10px 14px",fontSize:13,color:ds.color.red,textAlign:"center"}}>{error}</div>}
        </div>

        {order&&(
          <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"28px 32px",boxShadow:ds.shadow.sm,border:"1px solid "+ds.color.borderLight}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,paddingBottom:18,borderBottom:"2px solid "+ds.color.border}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Order Reference</div>
                <div style={{fontFamily:ds.font.display,fontSize:24,color:ds.color.red}}>#{order.id.slice(-6).toUpperCase()}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:ds.radius.pill,background:orderStatusColor(order.status||"pending").bg,color:orderStatusColor(order.status||"pending").color}}>{ORDER_STATUS_LABELS[order.status]||"Pending"}</span>
                <div style={{fontSize:11,color:ds.color.textMuted,marginTop:6}}>{formatDate(order.createdAt)}</div>
              </div>
            </div>

            {/* V11: Payment status banner */}
            <div style={{marginBottom:20,padding:"10px 14px",borderRadius:ds.radius.md,background:paymentStatusColor(order.paymentStatus||"awaiting").bg,color:paymentStatusColor(order.paymentStatus||"awaiting").color,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
              💳 Payment: {PAYMENT_STATUS_LABELS[order.paymentStatus||"awaiting"]}
            </div>

            {order.paymentRejectReason&&(
              <div style={{background:ds.color.redLight,border:"1px solid "+ds.color.redBorder,borderRadius:ds.radius.md,padding:"10px 14px",marginBottom:16,fontSize:13,color:ds.color.red}}>
                ❌ Payment rejected: {order.paymentRejectReason}. Please re-upload a clearer payment proof below.
              </div>
            )}

            {order.status!=="cancelled"&&order.status!=="out_of_stock"&&(
              <div style={{marginBottom:24}}>
                <div style={{display:"flex",alignItems:"center",gap:0}}>
                  {statusSteps.map((s,i)=>{
                    const curIdx = statusSteps.indexOf(order.status||"pending");
                    const done   = i<=curIdx;
                    const active = i===curIdx;
                    return(
                      <div key={s} style={{display:"flex",alignItems:"center",flex:i<4?1:0}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{width:32,height:32,borderRadius:"50%",background:done?ds.color.success:ds.color.borderLight,border:"2px solid "+(done?ds.color.success:ds.color.border),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:done?"#fff":ds.color.textMuted,margin:"0 auto 6px",fontWeight:700}}>{done&&!active?"✓":i+1}</div>
                          <div style={{fontSize:10,color:active?ds.color.success:ds.color.textMuted,fontWeight:active?700:400,whiteSpace:"nowrap",textTransform:"capitalize"}}>{ORDER_STATUS_LABELS[s]||s}</div>
                        </div>
                        {i<4&&<div style={{flex:1,height:2,background:i<curIdx?ds.color.success:ds.color.borderLight,margin:"0 4px 20px"}}/>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {order.status==="out_of_stock"&&(
              <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:ds.radius.md,padding:"12px 16px",marginBottom:20,fontSize:13,color:"#C2410C"}}>
                ⚠️ <strong>Item(s) unavailable.</strong> Our team has been notified and will contact you to discuss alternatives or arrange a refund. Call us: <strong>{CONTACT.phone1}</strong>
              </div>
            )}
            {order.status==="cancelled"&&(
              <div style={{background:ds.color.redLight,border:"1px solid "+ds.color.redBorder,borderRadius:ds.radius.md,padding:"12px 16px",marginBottom:20,fontSize:13,color:ds.color.red}}>
                ❌ This order has been cancelled. If you have questions, contact us at <strong>{CONTACT.email}</strong>.
              </div>
            )}

            <div style={{background:ds.color.canvas,borderRadius:ds.radius.md,padding:"14px 18px",marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Items Ordered</div>
              {order.items?.map((item,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody,padding:"6px 0",borderBottom:i<(order.items.length-1)?"1px solid "+ds.color.borderLight:"none"}}>
                  <span>{item.name} x {item.qty}</span>
                  <span style={{fontWeight:600}}>{formatPHP(item.price*item.qty)}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,fontWeight:700,fontSize:15,borderTop:"1px solid "+ds.color.border}}>
                <span>Total</span><span style={{color:ds.color.red}}>{formatPHP(order.total||0)}</span>
              </div>
            </div>

            {order.recipientName&&<div style={{fontSize:13,color:ds.color.gold,background:ds.color.goldLight,padding:"8px 12px",borderRadius:ds.radius.sm,marginBottom:8,display:"inline-block"}}>📦 For: {order.recipientName} ({order.recipientPhone})</div>}
            {order.address&&<div style={{fontSize:13,color:ds.color.textMuted,marginBottom:6}}>📍 {order.address}</div>}
            {order.paymentMethod&&<div style={{fontSize:13,color:ds.color.textMuted,marginBottom:16}}>💳 {order.paymentMethod}</div>}

            {/* V11: Show upload only when needed */}
            {(order.paymentStatus==="awaiting"||order.paymentStatus==="rejected"||(!order.paymentStatus&&order.status!=="delivered"&&order.status!=="cancelled"))&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:ds.color.textDark,marginBottom:8}}>Payment Proof</div>
                <PaymentProofUpload orderId={order.id} existingUrl={null} onUploaded={url=>setOrder(prev=>({...prev,paymentProofUrl:url,paymentStatus:"submitted"}))}/>
              </div>
            )}
            {order.paymentStatus==="submitted"&&(
              <div style={{marginBottom:16,padding:"12px 14px",background:"#DBEAFE",borderRadius:ds.radius.md,fontSize:13,color:"#1E40AF"}}>
                ⏳ Your payment proof is being reviewed. We'll notify you within 24 hours.
                {order.paymentProofUrl&&<> · <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{color:"#1E40AF",textDecoration:"underline"}}>View proof</a></>}
              </div>
            )}

            <div style={{background:ds.color.canvas,borderRadius:ds.radius.md,padding:"14px 18px",display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{fontSize:12,color:ds.color.textMuted,fontWeight:600}}>Need help with this order?</div>
              <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,background:"#25D366",color:"#fff",padding:"6px 14px",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,textDecoration:"none"}}>💬 WhatsApp</a>
              <a href={"tel:"+CONTACT.phone1Raw} style={{display:"inline-flex",alignItems:"center",gap:6,background:ds.color.redLight,color:ds.color.red,padding:"6px 14px",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,textDecoration:"none"}}>📞 Call Us</a>
            </div>
          </div>
        )}

        {searched&&!order&&!loading&&!error&&(
          <div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>
            <div style={{fontSize:32,marginBottom:12}}>🔍</div>
            <div style={{fontSize:14}}>No order found. Please double-check your reference number.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── POLICY PAGES ────────────────────────────────────────────────────────────
function PrivacyPage(){
  const sections=[
    {title:"Information We Collect",body:"When you submit a form, create an account, or place an order, we collect your name, company, email, phone, address, and order details. Registered customers have order history and account data stored securely."},
    {title:"How We Use Your Information",body:"We use your data to respond to inquiries, prepare quotations, process orders, provide customer support, and administer your DMEAST account and rewards. We do not share your information for unrelated marketing."},
    {title:"Information Sharing",body:"DM EAST does not sell, rent, or trade your personal information. We may share with authorized suppliers solely for fulfilling your order."},
    {title:"Data Security",body:"We use Firebase (Google Cloud) to secure your account data with industry-standard encryption. No internet transmission is 100% secure."},
    {title:"Cookies",body:"This website may use basic browser cookies to improve your experience. No advertising trackers are used."},
    {title:"Rewards Program",body:"Your reward points and purchase history are stored securely in your account. Points are non-transferable and have no cash value except as DMEAST purchase credits."},
    {title:"Your Rights",body:"You may request access to, correction of, or deletion of your personal data. Contact us at "+CONTACT.email+" to exercise these rights."},
    {title:"Contact About Privacy",body:"Questions? Contact us at "+CONTACT.email+" or "+CONTACT.phone1+"."},
  ];
  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Legal" title="Privacy Policy" subtitle={`Last updated: ${new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}`}/>
      <div style={{maxWidth:820,margin:"0 auto",padding:"60px 28px"}}>
        <div style={{background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.lg,padding:"18px 22px",marginBottom:40,fontSize:14,color:ds.color.red,lineHeight:1.7}}>DM EAST is committed to protecting your privacy. This policy explains what we collect, how we use it, and your rights.</div>
        {sections.map((s,i)=>(
          <div key={i} style={{marginBottom:36,paddingBottom:36,borderBottom:i<sections.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
            <h3 style={{fontSize:17,fontWeight:600,color:ds.color.textDark,marginBottom:10,fontFamily:ds.font.display}}>{i+1}. {s.title}</h3>
            <p style={{fontSize:15,color:ds.color.textBody,lineHeight:1.8}}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TermsPage(){
  const sections=[
    {title:"Acceptance of Terms",body:"By accessing dmeastph.com and placing orders, you agree to these Terms and Conditions."},
    {title:"Company Information",body:"DM EAST (Decon Medical Equipment and Supplies Trading). Address: 1146 M. Natividad Cor. Mayhaligue Sts., Sta. Cruz, Manila. Contact: info@dmeastph.com | +63 951 040 1708."},
    {title:"Products and Pricing",body:"Prices are in Philippine Peso (PHP). Direct-purchase prices are fixed at checkout. Quote/sales items are confirmed via formal quotation. International orders exclude shipping, duties, and taxes."},
    {title:"Minimum Order",body:"Minimum order value for direct purchase is ₱500.00. No minimum for quote-based orders."},
    {title:"Payment Terms",body:"Full payment required before order processing. Accepted: credit card, debit card, GCash, Maya, bank transfer, QR Ph."},
    {title:"Rewards Program",body:"Registered customers earn 1 reward point for every ₱200 spent. Each point is worth ₱0.50 and can be redeemed as purchase credits. Points are non-transferable, non-encashable, and subject to DMEAST's rewards terms. DMEAST reserves the right to modify or cancel the rewards program at any time."},
    {title:"Order Processing",body:"All orders subject to availability. DM EAST sources on confirmed orders. We reserve the right to cancel orders due to pricing errors, unavailability, or force majeure."},
    {title:"Out of Stock Items",body:"If an item becomes unavailable after payment, we will offer a full refund as store credit or an alternative product with your approval."},
    {title:"Delivery and Shipping",body:"Nationwide delivery across the Philippines. International shipping via FedEx, air cargo, and sea freight. International shipping fees and import duties are the buyer's responsibility."},
    {title:"Warranty",body:"Medical equipment carries standard manufacturer warranty (generally 1 year). 7-day replacement for items damaged upon delivery. Pharmaceuticals and consumables follow manufacturer expiry."},
    {title:"Prescription Medicines",body:"Prescription items require a valid Philippine FDA-compliant doctor's prescription. Orders without valid Rx may be cancelled and refunded."},
    {title:"Limitation of Liability",body:"DMEAST's maximum liability shall not exceed the total amount paid for the relevant order. We are not responsible for delays due to force majeure events."},
  ];
  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Legal" title="Terms & Conditions" subtitle={`Last updated: ${new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}`}/>
      <div style={{maxWidth:820,margin:"0 auto",padding:"60px 28px"}}>
        {sections.map((s,i)=>(
          <div key={i} style={{marginBottom:36,paddingBottom:36,borderBottom:i<sections.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
            <h3 style={{fontSize:17,fontWeight:600,color:ds.color.textDark,marginBottom:10,fontFamily:ds.font.display}}>{i+1}. {s.title}</h3>
            <p style={{fontSize:15,color:ds.color.textBody,lineHeight:1.8}}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RefundPage(){
  const sections=[
    {title:"7-Day Replacement Guarantee",body:"If an item arrives damaged, defective, or different from what was ordered, contact us within 7 calendar days of delivery. We will arrange replacement or refund upon verification."},
    {title:"Eligibility for Returns",body:"Items must be unused and in original packaging, returned within 7 days with proof of purchase. Pharmaceuticals, consumables, and Rx items are non-returnable unless damaged upon arrival."},
    {title:"Refund Process",body:"Approved refunds are issued as Store Credit within 5–7 business days. Direct payment refunds may take 7–14 business days depending on your bank or payment provider."},
    {title:"Out-of-Stock Substitutions",body:"If an ordered item becomes unavailable, we'll offer a full refund as Store Credit, or an alternative product of equal or lesser value with your explicit approval."},
    {title:"Non-Refundable Items",body:"Pharmaceuticals and medical consumables (opened or undamaged), prescription medicines without valid Rx, custom or special-order equipment, and shipping fees are non-refundable."},
    {title:"How to Request",body:"Email "+CONTACT.email+" or call "+CONTACT.phone1+" with your order number and photos. Our team will respond within 2 business days."},
  ];
  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Legal" title="Return & Refund Policy" subtitle={`Last updated: ${new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}`}/>
      <div style={{maxWidth:820,margin:"0 auto",padding:"60px 28px"}}>
        {sections.map((s,i)=>(
          <div key={i} style={{marginBottom:36,paddingBottom:36,borderBottom:i<sections.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
            <h3 style={{fontSize:17,fontWeight:600,color:ds.color.textDark,marginBottom:10,fontFamily:ds.font.display}}>{i+1}. {s.title}</h3>
            <p style={{fontSize:15,color:ds.color.textBody,lineHeight:1.8}}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShippingPage(){
  const sections=[
    {title:"Domestic Shipping (Philippines)",body:"We deliver nationwide via trusted logistics partners (LBC, J&T, Grab, Lalamove). Estimated delivery: Metro Manila 1–3 days; Provincial areas 3–7 business days. Delivery fees vary by location."},
    {title:"International Shipping",body:"We ship worldwide via FedEx, DHL, air cargo, and sea freight. Estimated: FedEx/DHL 3–7 days, Air Cargo 5–10 days, Sea Cargo 15–45 days. Shipping fees, import duties, and taxes are the buyer's responsibility."},
    {title:"Processing Time",body:"All orders are procurement-based. Processing typically takes 3–15 business days after payment confirmation. We'll notify you of the estimated timeline at order confirmation."},
    {title:"Order Tracking",body:"Tracking information will be provided via email once dispatched. For freight shipments, a bill of lading and export documentation will be provided."},
    {title:"Shipping Restrictions",body:"Certain pharmaceutical products may have export restrictions. Prescription medicines require valid documentation for international shipment. DMEAST will advise on requirements for your destination."},
    {title:"Damaged in Transit",body:"If your shipment arrives damaged, photograph the packaging immediately and contact us within 24 hours of delivery. We will initiate a replacement or refund claim."},
  ];
  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Legal" title="Shipping Policy" subtitle={`Last updated: ${new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}`}/>
      <div style={{maxWidth:820,margin:"0 auto",padding:"60px 28px"}}>
        {sections.map((s,i)=>(
          <div key={i} style={{marginBottom:36,paddingBottom:36,borderBottom:i<sections.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
            <h3 style={{fontSize:17,fontWeight:600,color:ds.color.textDark,marginBottom:10,fontFamily:ds.font.display}}>{i+1}. {s.title}</h3>
            <p style={{fontSize:15,color:ds.color.textBody,lineHeight:1.8}}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function Footer({setPage}){
  return(
    <footer style={{background:ds.color.textDark,color:"#fff",padding:"64px 28px 32px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div className="dm-grid-4" style={{marginBottom:48}}>
          <div>
            <BrandLogo height={36} darkMode/>
            <p style={{fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.8,marginTop:16}}>Philippine-based medical solutions provider. Supplying hospitals, LGUs, and institutions worldwide since 2020.</p>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,background:"#25D366",color:"#fff",padding:"8px 14px",borderRadius:ds.radius.md,fontSize:12,fontWeight:600}}>💬 WhatsApp</a>
              <a href={CONTACT.messenger} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,background:"#0084FF",color:"#fff",padding:"8px 14px",borderRadius:ds.radius.md,fontSize:12,fontWeight:600}}>💬 Messenger</a>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:16}}>Quick Links</div>
            {[["home","Home"],["about","About Us"],["products","Shop"],["institutional","Institutional Orders"],["quote","Request Quote"],["track","Track Order"],["contact","Contact"]].map(([id,label])=>(
              <button key={id} onClick={()=>setPage(id)} style={{display:"block",background:"none",border:"none",cursor:"pointer",fontSize:13.5,color:"rgba(255,255,255,0.6)",fontFamily:ds.font.body,padding:"4px 0",textAlign:"left"}}
                onMouseEnter={e=>e.target.style.color="#F0A81C"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.6)"}>{label}</button>
            ))}
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:16}}>Shop Categories</div>
            {CATEGORIES.filter(c=>!c.institutional).map(c=>(
              <button key={c.id} onClick={()=>setPage("products")} style={{display:"block",background:"none",border:"none",cursor:"pointer",fontSize:13.5,color:"rgba(255,255,255,0.6)",fontFamily:ds.font.body,padding:"4px 0",textAlign:"left"}}
                onMouseEnter={e=>e.target.style.color="#F0A81C"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.6)"}>{c.label}</button>
            ))}
            <button onClick={()=>setPage("institutional")} style={{display:"block",background:"none",border:"none",cursor:"pointer",fontSize:13.5,color:ds.color.goldBright,fontFamily:ds.font.body,padding:"4px 0",textAlign:"left",marginTop:6,fontWeight:600}}
              onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color=ds.color.goldBright}>Institutional Orders →</button>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:16}}>Contact</div>
            {[["📍",CONTACT.address],["📍",CONTACT.address2],["📱",CONTACT.phone1],["📞",CONTACT.phone2],["✉️",CONTACT.email]].map(([icon,text],i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:8}}>
                <span style={{fontSize:12,opacity:0.5}}>{icon}</span>
                <span style={{fontSize:13,color:"rgba(255,255,255,0.55)",lineHeight:1.5}}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:28,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:16,alignItems:"center"}}>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.25)"}}>© {new Date().getFullYear()} DM EAST — Decon Medical Equipment & Supplies Trading. All rights reserved.</div>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {[["privacy","Privacy Policy"],["terms","Terms & Conditions"],["refunds","Return & Refund"],["shipping","Shipping Policy"]].map(([id,label])=>(
              <button key={id} onClick={()=>setPage(id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"rgba(255,255,255,0.25)",fontFamily:ds.font.body}}
                onMouseEnter={e=>e.target.style.color="#F0A81C"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.25)"}>{label}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── FLOATING CHAT ───────────────────────────────────────────────────────────
function FloatingChat(){
  const [open,setOpen]=useState(false);
  return(
    <div style={{position:"fixed",bottom:24,right:24,zIndex:999,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
      {open&&(
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.xl,padding:"16px 18px",boxShadow:ds.shadow.lg,minWidth:190}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>Chat with Us</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:10,background:"#25D366",color:"#fff",padding:"9px 14px",borderRadius:ds.radius.md,fontSize:13.5,fontWeight:600}}>💬 WhatsApp</a>
            <a href={CONTACT.messenger} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:10,background:"#0084FF",color:"#fff",padding:"9px 14px",borderRadius:ds.radius.md,fontSize:13.5,fontWeight:600}}>💬 Messenger</a>
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(o=>!o)} style={{width:52,height:52,borderRadius:"50%",background:ds.color.red,border:"none",cursor:"pointer",color:"#fff",fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:ds.shadow.red,transition:"transform 0.2s"}}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
        {open?"✕":"💬"}
      </button>
    </div>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────────────────
export default function App(){
  const [page,setPageRaw]=useState("home");
  const [cart,setCart]=useState([]);
  const [activeCategory,setActiveCategory]=useState(null);
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [isAdmin,setIsAdmin]=useState(false);
  const [showAuth,setShowAuth]=useState(false);
  const [wishlist,setWishlist]=useState([]);

  const setPage=useCallback(p=>{setPageRaw(p);window.scrollTo({top:0,behavior:"instant"});},[]);

  useEffect(()=>{
    return onAuthStateChanged(auth,async u=>{
      setUser(u);
      if(u){
        setIsAdmin(isAdminUser(u.email));
        try{const snap=await getDoc(doc(db,"customers",u.uid));if(snap.exists())setWishlist(snap.data().wishlist||[]);}catch(_){}
      }else{setIsAdmin(false);setWishlist([]);}
      setAuthLoading(false);
    });
  },[]);

  const handleSignIn=()=>setShowAuth(true);
  const handleSignOut=async()=>{await signOut(auth);setPage("home");};
  const handleAuthSuccess=u=>{setShowAuth(false);setUser(u);setIsAdmin(isAdminUser(u.email));};

  const addToCart=useCallback(product=>{
    setCart(c=>{const e=c.find(i=>i.id===product.id);return e?c.map(i=>i.id===product.id?{...i,qty:i.qty+1}:i):[...c,{...product,qty:1}];});
  },[]);
  const removeFromCart=useCallback(id=>setCart(c=>c.filter(i=>i.id!==id)),[]);
  const updateQty=useCallback((id,qty)=>{if(qty<1){removeFromCart(id);return;}setCart(c=>c.map(i=>i.id===id?{...i,qty}:i));},[removeFromCart]);

  const toggleWishlist=useCallback(async productId=>{
    if(!user){setShowAuth(true);return;}
    const next=wishlist.includes(productId)?wishlist.filter(x=>x!==productId):[...wishlist,productId];
    setWishlist(next);
    try{await updateDoc(doc(db,"customers",user.uid),{wishlist:next});}catch(_){}
  },[user,wishlist]);

  const handleOrderComplete=useCallback(()=>{
    setCart([]);
  },[]);

  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const shared={setPage,addToCart,setActiveCategory,activeCategory,wishlist,toggleWishlist};

  if(authLoading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#fff",fontFamily:ds.font.body}}>
      <div style={{textAlign:"center"}}>
        <Spinner size={40}/>
        <div style={{marginTop:16,fontSize:14,color:ds.color.textMuted}}>Loading DMEAST…</div>
      </div>
    </div>
  );

  return(
    <ProductsProvider>
    <div style={{fontFamily:ds.font.body,minHeight:"100vh",background:ds.color.white,color:ds.color.textBody}}>
      <style>{GLOBAL_CSS}</style>
      <Navbar activePage={page} setPage={setPage} cartCount={cartCount} user={user} isAdmin={isAdmin} onSignIn={handleSignIn} onSignOut={handleSignOut}/>
      <main>
        {page==="home"         &&<HomePage     {...shared}/>}
        {page==="about"        &&<AboutPage/>}
        {page==="products"     &&<ProductsPage {...shared}/>}
        {page==="institutional"&&<InstitutionalOrdersPage setPage={setPage}/>}
        {page==="quote"        &&<QuotePage/>}
        {page==="contact"      &&<ContactPage/>}
        {page==="cart"         &&<CartPage cart={cart} removeFromCart={removeFromCart} updateQty={updateQty} setPage={setPage} user={user} onOrderComplete={handleOrderComplete}/>}
        {page==="portal"       &&(user?<CustomerPortal user={user} setPage={setPage} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist}/>:<div style={{paddingTop:67,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{fontSize:32,marginBottom:12}}>🔒</div><div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:12}}>Sign in to access your portal</div><Btn variant="primary" size="md" onClick={handleSignIn}>Sign In</Btn></div></div>)}
        {page==="admin"        &&(isAdmin?<AdminDashboard user={user}/>:<div style={{paddingTop:67,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center",color:ds.color.textMuted}}>⛔ Admin access only.</div></div>)}
        {page==="privacy"      &&<PrivacyPage/>}
        {page==="terms"        &&<TermsPage/>}
        {page==="refunds"      &&<RefundPage/>}
        {page==="shipping"     &&<ShippingPage/>}
        {page==="track"        &&<TrackOrderPage/>}
      </main>
      <Footer setPage={setPage}/>
      <FloatingChat/>
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)} onSuccess={handleAuthSuccess}/>}
    </div>
    </ProductsProvider>
  );
}
