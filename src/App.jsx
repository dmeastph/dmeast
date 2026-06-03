/**
 * DMEAST — Medical Solutions Platform  v16.17
 *
 * v16.17 PAYMENT METHOD TOGGLES + MAYA LINK ON PI:
 * - ⚙️ Admin Settings tab (Super Admin only) — 4 toggle switches:
 *      🏦 Bank Wire Transfer (T/T)
 *      💳 Fiuu QR Code (Credit/Debit Card)
 *      💸 PayPal
 *      📱 Maya Payment Link (static link, customer enters amount)
 * - 💾 Toggles saved to Firestore: settings/paymentMethods
 * - 📄 Proforma Invoice PDF respects toggles — only shows active methods
 * - 🔗 Maya Link added as Option 4 on PI:
 *      https://payments.maya.ph/invoice?id=7e50e078-1e45-4f3c-b431-2f8fa669a173
 *      Customer enters PHP amount from the PI themselves
 * - ✅ All existing payment flows unchanged
 *
 * v16.16 MAYA INVOICE PAYMENT INTEGRATION:
 * - 💳 Admin can send Maya payment link directly from OrderEditorModal
 *      "Details" tab → 💳 Maya Payment section
 * - 🔗 Calls /api/maya-invoice (Vercel serverless) — secret key stays server-side
 * - 📧 Payment link auto-emailed to customer via EmailJS on send
 * - 💾 Link + status saved to Firestore on order doc
 * - 🔄 Payment status: awaiting → link_sent → paid (auto via webhook)
 * - ✅ Fiuu stays as QR-on-PDF — no API needed
 * - ✅ All existing flows unchanged (bank transfer, manual proof upload, etc.)
 *
 * v16.15 FIUU QR EMBEDDED:
 * - 💳 Real Fiuu in-store QR code is now embedded as base64 PNG (~110KB)
 *      Cropped clean (no Fiuu chrome/branding) for tidy PDF layout
 *      400x400 px, sharp at the PDF's 100pt × 100pt render area
 *      Replaces the "[QR placeholder]" box in v16.14
 *
 * v16.14 PROFORMA INVOICE — THREE PAYMENT OPTIONS:
 * - 🏦 OPTION 1: Bank Wire Transfer (T/T) — China Bank account 150600002424
 *           Full SWIFT details, reference number, "Recommended for orders over $1,000"
 * - 💳 OPTION 2: Credit/Debit Card via Fiuu QR
 *           QR code image embed (placeholder until real QR pasted as base64)
 *           5-step "How to pay by card" instructions
 *           Clear PHP amount + reference number for customer to enter
 *           FX warning: "Card charged in PHP, your bank converts at its rate"
 * - 💸 OPTION 3: PayPal — info@dmeastph.com
 *           Recipient, amount, reference note
 *           ⚠ Red warning: PayPal holds $500+ orders for 21 days
 * - 📃 Smart page-break logic — ensureSpace() helper adds new page when needed
 * - 🎨 Color-coded options: Wire (yellow), Card (blue), PayPal (purple)
 * - 📋 Expanded PI terms (now 8 clauses, includes card-FX note)
 * - ✅ China Bank account number 150600002424 hardcoded
 *
 * NOTE: To enable the Fiuu QR image on PIs, paste base64-encoded PNG data
 *       into FIUU_QR_IMAGE_DATA constant. Until then, shows a "[QR placeholder]" box.
 *
 * v16.13 PROFORMA INVOICE FOR INTERNATIONAL ORDERS:
 * - 🌍 NEW: "Proforma Invoice" document type (only shows for international orders)
 *           Auto-selected when generating doc for intl orders
 * - 💱 Foreign currency display — primary in customer's currency, PHP indicative below
 *           Supports USD/EUR/GBP/JPY/AUD/SGD/AED/HKD/CNY/PHP
 *           Spot rate + 1% buffer per Edward's request
 * - 📦 Incoterms selector (EXW/FOB/CIF/CPT/DAP/DDP)
 *           Auto-defaults: FOB for port-to-port, DDP for door-to-door
 *           Each shows plain-English explanation
 * - 🏦 Wire transfer instructions block on PI with China Bank SWIFT details
 *           Beneficiary, bank name/address, SWIFT, account info
 *           Bank info in DMEAST_BANK_INFO constant (edit in code when needed)
 * - 📋 PI-specific terms (7 clauses) — FX, shipping, duties, title transfer
 * - 🎯 International badge on Generate Document modal title
 * - ✅ Quotation/SO/DR/PR docs still work as before for local orders
 *
 * v16.12 INTERNATIONAL ORDER INQUIRY — BUG FIX + DELIVERY MODES:
 * - 🐛 FIXED: International submit was failing 422 "recipients address is empty"
 *           Root cause: EmailJS payload missing required to_email field
 *           Fix: pass to_email + to_name; also added admin notification (info@dmeastph.com)
 * - 🚢 NEW: Port-to-Port vs Door-to-Door radio toggle
 *           Port = wholesale/bulk, ends at customer's seaport/airport
 *           Door = retail/personal, full DDP shipping with duties
 * - 🏠 NEW: Conditional Street Address field (only when Door-to-Door mode)
 *           Required for door delivery, not shown for port-to-port
 * - 🏷️ Field label adapts: "Port of Entry" vs "City" based on mode
 * - 🎯 Cart sidebar hint adapts to mode (DDP terms vs port clearance)
 * - 📦 Firestore order doc stores intlDeliveryMode + intlStreetAddress fields
 *
 * v16.11 INTERNATIONAL ORDER INQUIRY OVERHAUL:
 * - 👤 Auto-populate from user account (if signed in) with radio toggle:
 *      "Same as my account" (gold) | "Different contact person" (red)
 * - 🌍 Country dropdown — all ~195 countries with flag emojis (ISO 3166-1)
 * - 🏙️ City/Port — free text (flexible for ports vs cities worldwide)
 * - 📮 ZIP/Postal Code field — always optional, smart placeholder per country
 * - 💱 Expanded currency dropdown (USD/PHP/SGD/AED/EUR/GBP/JPY/AUD)
 * - 🛒 Editable cart on inquiry page: qty +/- AND remove item (with confirm)
 * - 🚫 Submit disabled if cart empty (with friendly empty state + link to shop)
 * - 📦 Order doc now stores granular intlCountry/intlCountryISO/intlZip fields
 * - 📧 EmailJS template enriched with full country code phone + ZIP
 * - ✅ Default currency changed PHP → USD (more sensible for intl)
 *
 * v16.10 MAYA PAYMENT INTEGRATION (FRONTEND):
 * - 💳 Customer clicks GCash/Maya/Visa/MC/QR Ph → redirected to Maya Checkout
 * - 🔄 Pre-creates order in Firestore before redirect (status: redirecting_to_maya)
 * - 🎯 PaymentReturnPage handles success/failure/cancel returns from Maya
 * - 🧹 URL params cleaned up after processing (no leftover ?payment=success in URL)
 * - ✅ Bank Transfer flow unchanged (still works for non-Maya customers)
 * - 🔐 All secret keys stay server-side via /api/maya-create-checkout
 *
 * v16.9 SANDBOX-READY ARCHITECTURE:
 * - 🔧 Firebase config moved to environment variables (VITE_FIREBASE_*)
 * - 🌍 IS_SANDBOX detection (env flag + hostname auto-detect)
 * - 🧪 SandboxBanner: prominent visual indicator on sandbox/preview deploys
 * - 💛 Yellow striped borders + center badge — IMPOSSIBLE to confuse with prod
 * - 🔄 Backward compatible: falls back to hardcoded production config if env missing
 *
 * v16.8 RX BULK HIDE/SHOW (for Fiuu approval):
 * - 🙈 Bulk-hide all Rx products from public shop (one click)
 * - 👁️ Bulk-show them back later (one click)
 * - 📝 Products remain in admin, just hidden from /products page
 * - ✅ Reversible workaround for payment gateway requirements
 *
 * v16.7.1 HOTFIX:
 * - 🙈 Import Full Catalog button auto-hides if catalog already imported
 *   (checks for any product with seedImport===true)
 *
 * v16.7 BULK CATALOG IMPORT:
 * - 📦 130 product seed (23 medicines + 107 medical equipment)
 * - 🌱 New "Import Full Catalog" button in admin Products tab
 * - 🦽 New categories added: Mobility, Hospital Beds, Respiratory Care
 * - 🖼️ Product images delivered as static files in public/seed/ folder
 * - ❓ All seeded products show "Price upon request" → Quote button (no prices yet)
 *
 * v16.6 LIVE CHAT WIDGET:
 * - 💬 Floating chat bubble (bottom-right) on every page
 * - 📱 Multi-channel: Messenger / WhatsApp / Phone / Email
 * - ✨ Pulse animation on initial load (6 seconds, then settles)
 * - 🚫 Auto-hidden on admin pages
 *
 * v16.5 BLOG SYSTEM:
 * - 📝 Full blog system: public listing page (/blog), individual articles (/blog/:slug)
 * - 🛠️ Admin Posts tab — create/edit/publish articles via dashboard
 * - 🔍 Per-article SEO meta tags + structured data
 * - 🏷️ Categories, tags, author, featured image, draft/published states
 * - 🌟 Latest articles section on homepage
 * - 🔥 Related articles at bottom of each post
 * - 📊 Read time estimation, slug auto-generation
 *
 * v16.4 SEO + DISCOVERABILITY:
 * - 🔍 Per-page meta titles + descriptions (Google sees each page as unique)
 * - 📱 Open Graph tags (Facebook/Messenger/WhatsApp link previews)
 * - 🐦 Twitter Card tags
 * - 🔗 Canonical URLs (prevents duplicate content issues)
 * - 🤖 robots/keywords meta tags
 * - 📋 New static files: sitemap.xml, robots.txt, manifest.json
 *
 * v16.3 FIUU COMPLIANCE:
 * - 📋 Added Cancellation & Termination Policy page (required by Fiuu)
 * - 🔗 Linked in footer alongside Privacy, Terms, Refund, Shipping
 *
 * v16.1 PRODUCTS PAGE REDESIGN:
 * - 🛒 ProductCard: hover lift, category labels, stock indicator, larger price
 * - 🔍 ProductsPage: prominent search bar, horizontal pill nav, sort dropdown
 * - 🎯 Better empty state with helpful CTAs (clear filters, request quote)
 * - 📱 Mobile-friendly: 2-col grid on phones, 1-col on tiny screens
 * - 🗑️ Removed redundant StatsTrustBand from homepage (already in hero)
 *
 * v16.2 CART/CHECKOUT REDESIGN:
 * - 🛒 Improved empty cart with trust signals
 * - 🛡️ Trust signals strip on cart review page
 * - 📦 Mobile-responsive cart items with better quantity stepper
 * - 💰 VAT breakdown visible in order summary (subtotal, VAT, shipping, total)
 * - 📌 Sticky order summary on desktop
 *
 * v16.0.2 HOTFIXES:
 * - 🎨 Logo updated to white-bg version (works on both PDF and website)
 * - 🔴 Top announcement bar: gold → red gradient (matches brand)
 *
 * v16.0.1 HOTFIXES:
 * - 🐛 PDF: Black header band reverted to WHITE (user preferred)
 * - 🐛 Hero: Right side reverted to v15 design (4 stat tiles + dark info panel)
 * - 🎨 Logo on website: Drop logo.png in /public folder (BrandLogo already references it)
 * - ✨ Kept all other v16.0 sections (StatsTrustBand, Categories, Trending, etc.)
 *
 * v16.0 HOMEPAGE REDESIGN:
 * - 🎨 Modern hero with floating cards, search bar, dual CTA, trust badges
 * - 📊 Stats trust band (5+ Years / 500+ Products / 50+ Institutions / Quality-First)
 * - 🛒 Category grid with circular icon tiles (mobile-friendly)
 * - 🔥 Trending Products section with proper grid + CTA
 * - 💎 Promo cards (color-blocked feature products in red/gold/pink)
 * - ✨ Why DMEAST USPs (4 cards with hover effects)
 * - 💼 Institutional CTA banner (dark with gold accents)
 * - 💬 Testimonials with disclaimer (sample reviews until real ones)
 * - ❓ FAQ accordion (6 common questions, SEO-friendly)
 *
 * v15.4:
 * - 💰 VAT Treatment toggle per order: VAT Inclusive (default) / VAT Exempt / Zero-Rated
 *   (BIR-compliant for senior citizen, PWD, PEZA, export sales, etc.)
 * - 🎨 Real DMEAST logo embedded in PDF headers (black band header design)
 * - 🏷️ VAT badges on order rows (VAT EXEMPT / ZERO-RATED visible at-a-glance)
 * - 📄 PDF generator lets admin override VAT treatment per-PDF if needed
 *
 * v15.3 NEW: AUTO-ATTACH PDF EMAIL
 * - 📎 PDF documents (Quotation/SO/DR/PR) now attach automatically to email
 * - ✉️ Click "Email to Customer" → adds personal message → sends with attachment
 * - 🛡️ Fallback to manual mailto if EmailJS template not yet configured
 * - 🔧 Requires NEW EmailJS template "template_pdf_doc" with Variable Attachment
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

// v16.9: Firebase config now read from environment variables (Vite exposes VITE_* to client)
// Falls back to production config if env vars missing (e.g., legacy deploys)
// This allows production + sandbox to share the same code with different env values
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyAV30NWtnxAnj8jIjN4f5Pa6je43oM4rrw",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "dmeast-516cc.firebaseapp.com",
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL       || "https://dmeast-516cc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "dmeast-516cc",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "dmeast-516cc.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID|| "805825630764",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:805825630764:web:9aa00bf55ece3b3f37b789",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || "G-904XX7S1HY",
};

// v16.9: Detect environment (sandbox vs production) for visual indicator + behavior
const IS_SANDBOX = (
  // Explicit env flag (set in Vercel for sandbox deploy)
  import.meta.env.VITE_ENVIRONMENT === "sandbox" ||
  // Auto-detect by hostname (fallback if env var not set)
  (typeof window !== "undefined" && window.location.hostname.includes("sandbox.")) ||
  // Vercel preview deployments are also non-production
  (typeof window !== "undefined" && window.location.hostname.includes(".vercel.app"))
);

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
    tabs: ["overview","orders","receivables","expenses","billings","margin","products","customers","rx","blog","settings"],
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
    canDeleteOrders: false,        // Operations cannot delete orders
    canEditProducts: true,
    canSeeMargins: true,            // v15.2: now allowed to see margin dashboard
    canSeeExpenses: false,           // but NOT detailed expenses (still hidden)
    canManageUsers: false,
    canEditBlog: true,              // v16.5: ops can manage blog
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
    canEditBlog: false,             // v16.5: accounting doesn't manage blog
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
  pdfTemplateId:       "template_pdf_doc",  // v15.3: To: {{to_email}} — PDF document (Quotation/SO/DR/PR) with attachment. CONFIGURE IN EMAILJS DASHBOARD.
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

// v15.4: VAT treatment options (legitimate BIR-compliant options)
const VAT_TREATMENT_OPTIONS = [
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

const findVATTreatment = (id) => VAT_TREATMENT_OPTIONS.find(v => v.id === id) || VAT_TREATMENT_OPTIONS[0];

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
  @media(max-width:768px){.dm-grid-2{grid-template-columns:1fr}.dm-grid-3{grid-template-columns:1fr}.dm-grid-4{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:480px){.dm-grid-4{grid-template-columns:1fr}}
  .dm-hero-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:60px;align-items:center}
  @media(max-width:1100px){.dm-hero-grid{grid-template-columns:1fr;gap:40px}}
  @media(max-width:768px){.dm-hero-grid{gap:32px;padding:0 4px}.dm-hero-visual{min-height:380px}.dm-hero-right{display:none}}
  @media(max-width:480px){.dm-hero-grid{gap:24px}.dm-hero-section{padding:40px 0 48px !important}}
  .dm-cat-pills::-webkit-scrollbar{height:4px}
  .dm-cat-pills::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);border-radius:2px}
  @keyframes dm-chat-pulse{0%{transform:scale(1);opacity:0.4}100%{transform:scale(1.7);opacity:0}}
  @keyframes dm-chat-fade-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @media(max-width:900px){.dm-cart-grid{grid-template-columns:1fr !important}.dm-cart-summary{position:relative !important;top:auto !important}}
  @media(max-width:560px){.dm-cart-item{grid-template-columns:1fr !important;gap:10px !important;padding:18px 0 !important}}
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

// v16.4: SEO metadata for each page (used by useSEO hook)
// Goal: every page has unique title + description for Google + good link previews
const SEO_META = {
  home: {
    title: "DM EAST · Quality Medical Solutions Delivered Nationwide | Pharmaceuticals, Equipment, Supplies",
    description: "DMEAST is your trusted source for pharmaceuticals, medical equipment, and healthcare essentials in the Philippines. BIR-registered. Delivered nationwide. Trusted by 50+ healthcare institutions, hospitals, LGUs, and clinics.",
    keywords: "medical supplies Philippines, pharmaceuticals Manila, medical equipment supplier, healthcare distributor Philippines, hospital supplies, LGU medical supplier, BIR registered medical trader, DMEAST",
  },
  products: {
    title: "Shop Medical Supplies & Pharmaceuticals · Free Delivery NCR | DM EAST",
    description: "Browse 500+ healthcare products: pharmaceuticals, medical equipment, supplies, and more. PHP prices, BIR-compliant invoicing, nationwide delivery from Metro Manila to provinces.",
    keywords: "buy medical supplies online Philippines, pharmaceutical online store, medical equipment shop, Philippine healthcare ecommerce",
  },
  about: {
    title: "About DM EAST · Medical Trading Company in Manila Since 2020",
    description: "DM EAST (Decon Medical Equipment and Supplies Trading) — Philippine-based medical trading company established 2020. Sourcing pharmaceuticals, medical equipment, and supplies from authorized FDA-licensed suppliers.",
    keywords: "about DMEAST, medical trading company Philippines, Decon Medical Equipment, Manila medical supplier",
  },
  institutional: {
    title: "Institutional Orders · Hospitals, LGUs, Clinics | DM EAST",
    description: "Special pricing and dedicated account support for hospitals, LGUs, RHUs, BPO companies, and corporate buyers. Bulk orders, BIR-compliant documentation, formal quotations.",
    keywords: "LGU medical supplier, hospital procurement Philippines, bulk medical supplies, RHU equipment supplier, BPO medical kits",
  },
  quote: {
    title: "Request a Quote · Bulk & Specialized Medical Orders | DM EAST",
    description: "Need bulk pharmaceuticals, specialized medical equipment, or institutional supplies? Request a formal quotation. We respond within 24-48 hours with PHP-priced quotation and BIR-compliant terms.",
    keywords: "medical supplies quote Philippines, bulk pharmaceutical pricing, hospital equipment quotation",
  },
  track: {
    title: "Track Your Order | DM EAST",
    description: "Track your DM EAST order status. Upload payment proof and view delivery progress.",
    keywords: "track order DMEAST, medical supplies delivery tracking",
  },
  contact: {
    title: "Contact DM EAST · Manila Medical Supplier",
    description: "Contact DM EAST: info@dmeastph.com | +63 951 040 1708. Office: 1146 M. Natividad St., Sta. Cruz, Manila. Business hours Mon-Sat 9 AM - 6 PM.",
    keywords: "DMEAST contact, Manila medical supplier phone, Sta Cruz Manila medical company",
  },
  cart: {
    title: "Your Cart | DM EAST",
    description: "Review your cart and proceed to checkout. Secure payment, BIR-compliant invoicing, nationwide delivery.",
  },
  privacy: {
    title: "Privacy Policy | DM EAST",
    description: "How DM EAST handles your personal information, data security practices, and your privacy rights.",
  },
  terms: {
    title: "Terms & Conditions | DM EAST",
    description: "Terms and conditions for using dmeastph.com and ordering from DM EAST.",
  },
  refunds: {
    title: "Return & Refund Policy | DM EAST",
    description: "DM EAST 7-day replacement guarantee, refund eligibility, and returns process.",
  },
  shipping: {
    title: "Shipping Policy · Nationwide & International | DM EAST",
    description: "DM EAST domestic and international shipping policy. Delivery times, tracking, and damaged-in-transit handling.",
  },
  cancellation: {
    title: "Cancellation & Termination Policy | DM EAST",
    description: "How to cancel DM EAST orders, refund methods, account termination procedures, and dispute resolution.",
  },
  account: {
    title: "My Account | DM EAST",
    description: "Manage your DM EAST account, view order history, addresses, and rewards.",
  },
  admin: {
    title: "Admin Dashboard | DM EAST",
    description: "Admin control panel.",
  },
  blog: {
    title: "Blog · Healthcare Insights & Procurement Guidance | DM EAST",
    description: "Industry insights, procurement guidance, and healthcare news from DM EAST. Resources for hospital pharmacists, LGU procurement officers, and clinic managers in the Philippines.",
    keywords: "medical procurement Philippines, healthcare blog Philippines, BIR-compliant procurement, LGU medical supplies guide, Filipino pharmacy industry insights",
  },
  blogPost: {
    title: "Article | DMEAST Blog",  // Will be overridden dynamically in the BlogPostPage
    description: "Read healthcare insights and procurement guidance from DMEAST.",
  },
};

// v16.4/v16.5: SEO hook — updates document head metadata when page changes
function useSEO(page, activePost) {
  useEffect(() => {
    let meta = SEO_META[page] || SEO_META.home;
    const baseUrl = "https://dmeastph.com";
    let canonical = page === "home" ? baseUrl : `${baseUrl}/${page}`;
    let ogImage = `${baseUrl}/logo.png`;
    
    // v16.5: For individual blog posts, override title/description with article meta
    if (page === "blogPost" && activePost) {
      meta = {
        title: `${activePost.title} | DMEAST Blog`,
        description: activePost.metaDescription || activePost.excerpt || activePost.title,
        keywords: (activePost.tags || []).join(", "),
      };
      canonical = `${baseUrl}/blog/${activePost.slug}`;
      if (activePost.featuredImage) ogImage = activePost.featuredImage;
    }
    
    // Title
    document.title = meta.title;
    
    // Helper to set or create a meta tag
    const setMeta = (name, content, attr = "name") => {
      if (!content) return;
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    
    // Standard SEO
    setMeta("description", meta.description);
    if (meta.keywords) setMeta("keywords", meta.keywords);
    setMeta("robots", "index, follow");
    setMeta("author", "DM EAST");
    
    // Open Graph (Facebook, Messenger, WhatsApp)
    setMeta("og:title", meta.title, "property");
    setMeta("og:description", meta.description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", canonical, "property");
    setMeta("og:image", ogImage, "property");
    setMeta("og:site_name", "DM EAST", "property");
    setMeta("og:locale", "en_PH", "property");
    
    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", meta.title);
    setMeta("twitter:description", meta.description);
    setMeta("twitter:image", ogImage);
    
    // Canonical URL
    let link = document.querySelector("link[rel='canonical']");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);
    
  }, [page]);
}

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
  // v16.7: New categories for equipment catalog
  {id:"mobility",   label:"Mobility & Walking Aids",color:"#0277BD",accent:"#0288D1",icon:"🦽", institutional:false},
  {id:"beds",       label:"Hospital Beds & Furniture",color:"#37474F",accent:"#546E7A",icon:"🛏️", institutional:false},
  {id:"respiratory",label:"Respiratory Care",      color:"#00695C",accent:"#00897B",icon:"💨", institutional:false},
  {id:"laboratory", label:"Laboratory Equipment",  color:"#0F4C81",accent:"#1A7BB4",icon:"🔬", institutional:true},
  {id:"imaging",    label:"Imaging & Radiology",   color:"#5C3317",accent:"#8B5E3C",icon:"🩻", institutional:true},
  {id:"icu",        label:"ICU & Emergency",       color:"#7B1FA2",accent:"#AB47BC",icon:"🚨", institutional:true},
  {id:"specialized",label:"Specialized Systems",   color:"#004D40",accent:"#00897B",icon:"⚙️", institutional:true},
  {id:"vehicles",   label:"Medical Vehicles",      color:"#BF360C",accent:"#F4511E",icon:"🚑", institutional:true},
];

// v16.7: Catalog seed data — 130 products (23 medicines + 107 equipment)
const CATALOG_SEED_PRODUCTS = [
  { id: "med_01", name: "Atorvastatin 20mg (Ranvast)", category: "pharma", desc: "HMG-CoA Reductase Inhibitor (cholesterol-lowering). Film-Coated Tablet - 20mg. Pack: 100 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_01.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_02", name: "Atorvastatin 10mg (Vazi2r)", category: "pharma", desc: "HMG-CoA Reductase Inhibitor (cholesterol-lowering). Film-Coated Tablet - 10mg. Pack: 100 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_02.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_03", name: "Atorvastatin 10mg (Fredtor)", category: "pharma", desc: "HMG-CoA Reductase Inhibitor (cholesterol-lowering). Film-Coated Tablet - 10mg. Pack: 100 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_03.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_04", name: "Atorvastatin 10mg (Atorsaph 10)", category: "pharma", desc: "HMG-CoA Reductase Inhibitor (cholesterol-lowering). Film-Coated Tablet - 10mg. Pack: 100 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_04.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_05", name: "Aspirin 80mg (Scheeprin)", category: "pharma", desc: "Antithrombotic / Antiplatelet. Tablet - 80mg. Pack: 100 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_05.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_06", name: "Ascorbic Acid 500mg (Regicee)", category: "pharma", desc: "Vitamin C / Dietary Supplement. Tablet - 500mg. Pack: 100 Tablets. Dietary supplement.", imageSrc: "/seed/med_06.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_07", name: "Ascorbic Acid 100mg Syrup (Raph C) 250ml", category: "pharma", desc: "Vitamin C / Dietary Supplement. Syrup - 100mg/5mL. Pack: 250 mL. Dietary supplement.", imageSrc: "/seed/med_07.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_08", name: "Ascorbic Acid 100mg Syrup (Raph C) 60ml", category: "pharma", desc: "Vitamin C / Dietary Supplement. Syrup - 100mg/5mL. Pack: 60 mL. Dietary supplement.", imageSrc: "/seed/med_08.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_09", name: "Apixaban 5mg (Thromboxain 5)", category: "pharma", desc: "Antithrombotic Agent (Direct Factor Xa Inhibitor). Film-Coated Tablet - 5mg. Pack: 10 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_09.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_10", name: "Apixaban 5mg (Carepixban)", category: "pharma", desc: "Antithrombotic Agent (Direct Factor Xa Inhibitor). Film-Coated Tablet - 5mg. Pack: 30 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_10.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_11", name: "Amoxicillin 500mg (Savermox)", category: "pharma", desc: "Antibacterial (Penicillin with extended spectrum). Capsule - 500mg. Pack: 100 Capsules. ⚠️ Prescription required.", imageSrc: "/seed/med_11.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_12", name: "Amlodipine 10mg (Sitivax)", category: "pharma", desc: "Calcium Channel Blocker (antihypertensive). Tablet - 10mg. Pack: 100 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_12.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_13", name: "Aciclovir 400mg (Zealor)", category: "pharma", desc: "Antiviral. Tablet - 400mg. Pack: 30 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_13.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_14", name: "Aciclovir 200mg (Zealor)", category: "pharma", desc: "Antiviral. Tablet - 200mg. Pack: 100 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_14.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_15", name: "Amoxicillin 500mg (Ambimox)", category: "pharma", desc: "Antibacterial. Capsule - 500mg. Pack: 100 Capsules. ⚠️ Prescription required.", imageSrc: "/seed/med_15.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_16", name: "Ascorbic Acid 100mg + Zinc (Marlum C Plus)", category: "pharma", desc: "Vitamin + Mineral Supplement. Syrup - 100mg/10mg per 5mL. Pack: 120 mL. Dietary supplement.", imageSrc: "/seed/med_16.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_17", name: "Ampalaya 500mg (Better Ampalaya)", category: "pharma", desc: "Herbal Food Supplement. Capsule - 500mg. Pack: 100 Capsules. Dietary supplement.", imageSrc: "/seed/med_17.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_18", name: "Ampalaya 500mg (Amplas)", category: "pharma", desc: "Herbal Food Supplement. Capsule - 500mg. Pack: 30 Capsules. Dietary supplement.", imageSrc: "/seed/med_18.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_19", name: "Allopurinol 100mg (Urisol)", category: "pharma", desc: "Antigout (Xanthine Oxidase Inhibitor). Tablet - 100mg. Pack: 100 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_19.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_20", name: "Aciclovir 400mg (Xyclovirax)", category: "pharma", desc: "Antiviral. Tablet - 400mg. Pack: 30 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_20.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_21", name: "Aciclovir 200mg (Xyclovirax)", category: "pharma", desc: "Antiviral. Tablet - 200mg. Pack: 100 Tablets. ⚠️ Prescription required.", imageSrc: "/seed/med_21.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_22", name: "Acetylcysteine 600mg (Ac-Lyte 600)", category: "pharma", desc: "Mucolytic. Powder for Oral Solution - 600mg. Pack: 10 Sachets. ⚠️ Prescription required.", imageSrc: "/seed/med_22.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "med_23", name: "Acetylcysteine 600mg (Cysaphteine 600)", category: "pharma", desc: "Mucolytic. Powder for Oral Solution - 600mg. Pack: 10 Sachets. ⚠️ Prescription required.", imageSrc: "/seed/med_23.jpg", price: null, requiresPrescription: true, cta: "quote", tag: "Pharmaceuticals", available: "available", featured: false },
  { id: "eqp_001", name: "Walker - Silver", category: "mobility", desc: "Lightweight aluminum walker with adjustable height. Helps patients with balance and mobility support.", imageSrc: "/seed/eqp_001.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_002", name: "Infusion Pump", category: "icu", desc: "Medical-grade infusion pump for controlled IV fluid and medication delivery in hospital and clinic settings.", imageSrc: "/seed/eqp_002.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_003", name: "Vital Sign Monitor", category: "monitoring", desc: "Multi-parameter vital sign monitor for measuring blood pressure, pulse, temperature, SpO2, and respiratory rate.", imageSrc: "/seed/eqp_003.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_004", name: "Vein Finder", category: "monitoring", desc: "Portable infrared vein visualization device. Improves IV insertion success rate and patient comfort.", imageSrc: "/seed/eqp_004.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_005", name: "Vacuum Stretcher Mattress", category: "icu", desc: "Vacuum stretcher mattress for safe immobilization and transport of trauma patients.", imageSrc: "/seed/eqp_005.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_006", name: "Uprise Medical Folding Walker (Without Wheels)", category: "mobility", desc: "Folding walker without wheels. Adjustable height. Foldable for easy storage and transport.", imageSrc: "/seed/eqp_006.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_007", name: "Under Arm Crutches", category: "mobility", desc: "Adult underarm crutches with adjustable height. Pair, ergonomic grip and rubber tips.", imageSrc: "/seed/eqp_007.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_008", name: "Pedia Crutches", category: "mobility", desc: "Pediatric underarm crutches sized for younger users. Adjustable height and lightweight aluminum frame.", imageSrc: "/seed/eqp_008.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_009", name: "Trolley Infusion Pump", category: "icu", desc: "Mobile trolley-mounted infusion pump for ICU, ER, and ward use.", imageSrc: "/seed/eqp_009.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_010", name: "ECG Trolley", category: "monitoring", desc: "Mobile cart designed for ECG machines. Includes cable management and accessory drawers.", imageSrc: "/seed/eqp_010.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_011", name: "Vertical Pressure Sterilizer 50L", category: "specialized", desc: "50-liter vertical autoclave for medical instrument sterilization. Ideal for clinics and small hospitals.", imageSrc: "/seed/eqp_011.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_012", name: "Table Top Steam Sterilizer 24L", category: "specialized", desc: "Compact 24-liter tabletop steam autoclave. Suitable for dental clinics, small medical practices.", imageSrc: "/seed/eqp_012.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_013", name: "Horizontal Cylindrical Pressure Steam Sterilizer 100L", category: "specialized", desc: "Large-capacity 100-liter horizontal autoclave for hospital sterilization needs.", imageSrc: "/seed/eqp_013.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_014", name: "Syringe Pump", category: "icu", desc: "Precision syringe pump for accurate, low-volume medication delivery in pediatrics and ICU.", imageSrc: "/seed/eqp_014.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_015", name: "Suction Machine", category: "respiratory", desc: "Medical suction machine for clearing airways and surgical sites. Adjustable vacuum, portable.", imageSrc: "/seed/eqp_015.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_016", name: "Suction Catheter", category: "respiratory", desc: "Disposable suction catheter (sold by box). Various French sizes available.", imageSrc: "/seed/eqp_016.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_017", name: "Stethoscope", category: "monitoring", desc: "Dual-head stethoscope for adult auscultation. Quality acoustic chest piece, comfortable earpieces.", imageSrc: "/seed/eqp_017.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_018", name: "Dialysis Chair", category: "beds", desc: "Reclining dialysis chair with adjustable backrest, leg rest, and armrests for patient comfort during treatment.", imageSrc: "/seed/eqp_018.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_019", name: "Star Chair Stretcher", category: "icu", desc: "Star chair stretcher for emergency transport in tight spaces (stairs, narrow corridors).", imageSrc: "/seed/eqp_019.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_020", name: "Travel Wheelchair", category: "mobility", desc: "Lightweight travel wheelchair, foldable, available in colors: orange, green, blue, red, pink, purple.", imageSrc: "/seed/eqp_020.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_021", name: "Electric Wheelchair", category: "mobility", desc: "Battery-powered electric wheelchair. Joystick control, foldable for transport.", imageSrc: "/seed/eqp_021.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_022", name: "Standard Wheelchair with IV Pole", category: "mobility", desc: "Standard adult wheelchair with attached IV pole for hospital patient transfer.", imageSrc: "/seed/eqp_022.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_023", name: "Standard Wheelchair Chrome", category: "mobility", desc: "Standard adult wheelchair, chrome-plated frame, foldable.", imageSrc: "/seed/eqp_023.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_024", name: "Mag Wheelchair Chrome", category: "mobility", desc: "Mag wheel adult wheelchair with chrome frame. Heavy-duty, foldable design.", imageSrc: "/seed/eqp_024.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_025", name: "Mag Wheelchair Black", category: "mobility", desc: "Mag wheel adult wheelchair with black frame. Heavy-duty, foldable design.", imageSrc: "/seed/eqp_025.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_026", name: "Standard Wheelchair Chrome (with IV Pole)", category: "mobility", desc: "Standard wheelchair, chrome frame, with attached IV pole for clinical use.", imageSrc: "/seed/eqp_026.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_027", name: "Wheelchair Black", category: "mobility", desc: "Standard adult wheelchair with black frame, foldable.", imageSrc: "/seed/eqp_027.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_028", name: "Pedia Mag Wheelchair Chrome", category: "mobility", desc: "Pediatric mag wheelchair with chrome frame, sized for children.", imageSrc: "/seed/eqp_028.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_029", name: "Pedia Mag Wheelchair Black", category: "mobility", desc: "Pediatric mag wheelchair with black frame, sized for children.", imageSrc: "/seed/eqp_029.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_030", name: "Reclining Commode Wheelchair", category: "mobility", desc: "Reclining commode wheelchair with detachable bedpan. Adjustable backrest.", imageSrc: "/seed/eqp_030.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_031", name: "Standard E-Cart", category: "icu", desc: "Standard emergency cart / crash cart for hospitals. Multiple drawers, lockable.", imageSrc: "/seed/eqp_031.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_032", name: "E-Cart (Luxurious)", category: "icu", desc: "Premium emergency cart / crash cart with enhanced features and durable construction.", imageSrc: "/seed/eqp_032.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_033", name: "Stainless Basket Stretcher", category: "icu", desc: "Stainless steel basket stretcher for rescue and patient extraction. Durable, water-resistant.", imageSrc: "/seed/eqp_033.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_034", name: "Spine Board", category: "icu", desc: "Rigid spine board for spinal injury immobilization and patient transport.", imageSrc: "/seed/eqp_034.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_035", name: "Folding Dental Chair", category: "beds", desc: "Portable folding dental chair for mobile clinics and outreach programs.", imageSrc: "/seed/eqp_035.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_036", name: "Hydraulic Stretcher Cart", category: "icu", desc: "Hydraulic patient stretcher cart with adjustable height. For hospital and ER use.", imageSrc: "/seed/eqp_036.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_037", name: "Hydraulic Massage Bed", category: "beds", desc: "Hydraulic massage / treatment bed for clinics, spas, physiotherapy.", imageSrc: "/seed/eqp_037.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_038", name: "5-Function Electric Nursing Bed", category: "beds", desc: "Premium hospital bed with 5 electric adjustment functions: head, foot, height, Trendelenburg, reverse Trendelenburg.", imageSrc: "/seed/eqp_038.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_039", name: "Extrication Device", category: "icu", desc: "KED-style extrication device for spinal immobilization during vehicle accidents.", imageSrc: "/seed/eqp_039.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_040", name: "Single Cane with Flashlight", category: "mobility", desc: "Single-point cane with built-in LED flashlight for nighttime use. Adjustable height.", imageSrc: "/seed/eqp_040.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_041", name: "Single Cane", category: "mobility", desc: "Standard single-point walking cane. Adjustable height, ergonomic handle.", imageSrc: "/seed/eqp_041.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_042", name: "Quad Cane", category: "mobility", desc: "Quad-base cane for enhanced stability. Wide or narrow base options.", imageSrc: "/seed/eqp_042.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_043", name: "Quad Cane U-Type Wide Base Bronze", category: "mobility", desc: "Quad cane with U-shaped wide base in bronze finish. Provides maximum stability.", imageSrc: "/seed/eqp_043.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_044", name: "Pedia Walker", category: "mobility", desc: "Pediatric walker for children. Adjustable height, foldable, lightweight.", imageSrc: "/seed/eqp_044.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_045", name: "IV Stand", category: "specialized", desc: "Adjustable height IV stand on castors. Stainless steel construction.", imageSrc: "/seed/eqp_045.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_046", name: "Foldable Cane", category: "mobility", desc: "Foldable walking cane that collapses for travel. Adjustable height.", imageSrc: "/seed/eqp_046.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_047", name: "Foot Stool", category: "specialized", desc: "Medical foot stool / step stool for patient access to exam tables.", imageSrc: "/seed/eqp_047.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_048", name: "Single Arm OR Light LED", category: "specialized", desc: "Single-arm operating room LED surgical light. Bright, shadowless illumination.", imageSrc: "/seed/eqp_048.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_049", name: "LED Examination Light (Fixed Brightness)", category: "monitoring", desc: "Fixed-brightness LED examination light for clinics and exam rooms.", imageSrc: "/seed/eqp_049.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_050", name: "Gooseneck Examination Lamp (with Net)", category: "monitoring", desc: "Gooseneck examination lamp with mesh netting. Flexible positioning.", imageSrc: "/seed/eqp_050.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_051", name: "Infant Phototherapy", category: "specialized", desc: "Infant phototherapy unit for treating neonatal jaundice. Blue LED lighting.", imageSrc: "/seed/eqp_051.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_052", name: "Silver Walker with Wheels", category: "mobility", desc: "Silver walker with front wheels for easier mobility. Adjustable height.", imageSrc: "/seed/eqp_052.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_053", name: "Scoop Stretcher PE", category: "icu", desc: "Polyethylene scoop stretcher for trauma patient transfer. Splits in half for easy loading.", imageSrc: "/seed/eqp_053.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_054", name: "Scoop Stretcher Aluminum Alloy", category: "icu", desc: "Aluminum alloy scoop stretcher. Durable, lightweight, and X-ray translucent.", imageSrc: "/seed/eqp_054.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_055", name: "Folding Stretcher (2 Folds)", category: "icu", desc: "Two-fold folding stretcher for compact storage and ambulance use.", imageSrc: "/seed/eqp_055.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_056", name: "Folding Stretcher", category: "icu", desc: "Standard folding stretcher for emergency response and patient transport.", imageSrc: "/seed/eqp_056.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_057", name: "Emergency Table", category: "icu", desc: "Emergency examination table for trauma and ER use.", imageSrc: "/seed/eqp_057.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_058", name: "Emergency Stretcher with Weighing Scale", category: "icu", desc: "Emergency stretcher with built-in weighing scale for critical patient assessment.", imageSrc: "/seed/eqp_058.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_059", name: "Emergency Hospital Stretcher", category: "icu", desc: "Hospital emergency stretcher with side rails and IV pole holder.", imageSrc: "/seed/eqp_059.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_060", name: "Emergency Hospital Stretcher (Premium)", category: "icu", desc: "Premium hospital emergency stretcher with enhanced features and adjustable height.", imageSrc: "/seed/eqp_060.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_061", name: "Eco Bed", category: "beds", desc: "Economy hospital bed - manually adjustable. Suitable for clinics and home care.", imageSrc: "/seed/eqp_061.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_062", name: "Emergency Blanket", category: "icu", desc: "Mylar emergency / thermal blanket. Reflective, retains body heat.", imageSrc: "/seed/eqp_062.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_063", name: "Foldable Baby Weighing Scale", category: "monitoring", desc: "Portable foldable infant weighing scale. Digital display, accurate to grams.", imageSrc: "/seed/eqp_063.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_064", name: "Head Immobilizer", category: "icu", desc: "Head immobilizer for spinal injury management. Used with spine boards.", imageSrc: "/seed/eqp_064.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_065", name: "Pedia Pulse Oximeter", category: "monitoring", desc: "Pediatric pulse oximeter for measuring SpO2 and pulse rate in children.", imageSrc: "/seed/eqp_065.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_066", name: "Pulse Oximeter", category: "monitoring", desc: "Standard fingertip pulse oximeter. Measures SpO2 and pulse rate, battery-powered.", imageSrc: "/seed/eqp_066.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_067", name: "Handheld Pulse Oximeter", category: "monitoring", desc: "Professional handheld pulse oximeter with detachable probe. For clinical use.", imageSrc: "/seed/eqp_067.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_068", name: "Fully Automatic Multifunctional Thermometer", category: "monitoring", desc: "Multifunction medical thermometer - forehead, ear, ambient temperature.", imageSrc: "/seed/eqp_068.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_069", name: "Fetal Doppler", category: "monitoring", desc: "Pocket fetal doppler for monitoring fetal heart rate. Built-in speaker.", imageSrc: "/seed/eqp_069.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_070", name: "Hemoglobin Meter", category: "monitoring", desc: "Portable hemoglobin meter for quick blood hemoglobin level testing.", imageSrc: "/seed/eqp_070.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_071", name: "Oxygen Concentrator - 5L", category: "respiratory", desc: "5-liter oxygen concentrator. Continuous oxygen supply for home and clinical use.", imageSrc: "/seed/eqp_071.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_072", name: "Oxygen Mask with Tube", category: "respiratory", desc: "Adult oxygen mask with connecting tube. Disposable, sterile.", imageSrc: "/seed/eqp_072.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_073", name: "Oxygen Concentrator (10L / 20L / 40L)", category: "respiratory", desc: "High-capacity oxygen concentrators available in 10L, 20L, and 40L variants for hospital and ICU use.", imageSrc: "/seed/eqp_073.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_074", name: "Overbed Table (Wooden)", category: "specialized", desc: "Adjustable wooden overbed table for hospital and home patient meals.", imageSrc: "/seed/eqp_074.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_075", name: "Operating Table", category: "specialized", desc: "Surgical operating table with multiple position adjustments for various procedures.", imageSrc: "/seed/eqp_075.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_076", name: "Obstetric Table", category: "specialized", desc: "Obstetric / gynecology examination and delivery table.", imageSrc: "/seed/eqp_076.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_077", name: "Non-Touch Thermometer", category: "monitoring", desc: "Infrared non-contact thermometer. Hygienic, fast forehead temperature reading.", imageSrc: "/seed/eqp_077.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_078", name: "Digital Thermometer", category: "monitoring", desc: "Standard digital thermometer with LCD display.", imageSrc: "/seed/eqp_078.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_079", name: "Nebulizer Kit (with Mouthpiece and Connector)", category: "respiratory", desc: "Nebulizer treatment kit with mouthpiece, tubing, and connectors.", imageSrc: "/seed/eqp_079.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_080", name: "Nebulizer Kit with Mask", category: "respiratory", desc: "Nebulizer treatment kit with mask, tubing, and medication cup.", imageSrc: "/seed/eqp_080.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_081", name: "Nasal Oxygen Cannula", category: "respiratory", desc: "Disposable nasal oxygen cannula. Comfortable, sterile, single-use.", imageSrc: "/seed/eqp_081.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_082", name: "Multisure GCTU Meter", category: "monitoring", desc: "Multifunction Glucose / Cholesterol / Triglyceride / Uric Acid meter.", imageSrc: "/seed/eqp_082.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_083", name: "Medical Oxygen Regulator", category: "respiratory", desc: "Medical-grade oxygen regulator with flow meter and pressure gauge.", imageSrc: "/seed/eqp_083.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_084", name: "Solitaire Mag Wheelchair Black (RST-OE-11)", category: "mobility", desc: "Solitaire premium mag wheelchair, black frame, model RST-OE-11. Heavy-duty wheelchair with chromed steel frame, fixed armrest, aluminum footrest. Net weight 19kg. With 8\'\' front wheel and 24\'\' rear wheel. Foldable, ideal for home and hospital use.", imageSrc: "/seed/eqp_084.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_085", name: "Digital BP Monitor", category: "monitoring", desc: "Digital arm blood pressure monitor with memory function.", imageSrc: "/seed/eqp_085.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_086", name: "CPR Mask", category: "icu", desc: "CPR pocket mask with one-way valve for emergency rescue breathing.", imageSrc: "/seed/eqp_086.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_087", name: "Compressor Nebulizer", category: "respiratory", desc: "Standard compressor nebulizer machine for respiratory medication delivery.", imageSrc: "/seed/eqp_087.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_088", name: "Compressor Nebulizer Mini", category: "respiratory", desc: "Compact mini compressor nebulizer. Portable for travel and home use.", imageSrc: "/seed/eqp_088.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_089", name: "Commode Chair with Wheels", category: "mobility", desc: "Commode chair with wheels for bedside or bathroom use. Adjustable height.", imageSrc: "/seed/eqp_089.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_090", name: "Commode Chair with Foam", category: "mobility", desc: "Commode chair with cushioned foam seat for added comfort.", imageSrc: "/seed/eqp_090.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_091", name: "Child Traction Set", category: "specialized", desc: "Pediatric traction set for orthopedic treatment in children.", imageSrc: "/seed/eqp_091.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_092", name: "Cervical Collar", category: "icu", desc: "Adjustable cervical collar / neck brace for cervical spine immobilization.", imageSrc: "/seed/eqp_092.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_093", name: "Cerebral Palsy Wheelchair Adult", category: "mobility", desc: "Specialized wheelchair for adults with cerebral palsy. Padded supports, headrest.", imageSrc: "/seed/eqp_093.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_094", name: "Cerebral Palsy Wheelchair Pedia", category: "mobility", desc: "Specialized pediatric wheelchair for children with cerebral palsy. Padded supports.", imageSrc: "/seed/eqp_094.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_095", name: "Blind Cane", category: "mobility", desc: "White cane for visually impaired users. Foldable, lightweight.", imageSrc: "/seed/eqp_095.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_096", name: "Bedside Table with Wheels", category: "specialized", desc: "Mobile bedside table with wheels for hospital and home patient use.", imageSrc: "/seed/eqp_096.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_097", name: "Basket Stretcher", category: "icu", desc: "Standard basket stretcher for vertical and rescue extraction.", imageSrc: "/seed/eqp_097.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_098", name: "Basket Stretcher (Separable)", category: "icu", desc: "Separable two-part basket stretcher for tight space rescues.", imageSrc: "/seed/eqp_098.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_099", name: "Anesthesia Trolley", category: "specialized", desc: "Mobile anesthesia trolley with multiple drawers for anesthetic supplies.", imageSrc: "/seed/eqp_099.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_100", name: "Ambulance Stretcher", category: "icu", desc: "Standard ambulance stretcher with adjustable backrest and IV pole holder.", imageSrc: "/seed/eqp_100.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_101", name: "Ambulance Stretcher (8 Wheels)", category: "icu", desc: "Ambulance stretcher with 8-wheel system for smooth maneuvering.", imageSrc: "/seed/eqp_101.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_102", name: "Ambulance Stretcher (10 Wheels)", category: "icu", desc: "Premium ambulance stretcher with 10-wheel system for ultimate stability.", imageSrc: "/seed/eqp_102.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_103", name: "ABS Overbed Table", category: "specialized", desc: "Lightweight ABS plastic overbed table. Easy to clean, height adjustable.", imageSrc: "/seed/eqp_103.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_104", name: "4 Wheels Rolator with Foot Rest", category: "mobility", desc: "Four-wheel rollator walker with built-in seat and foot rest. Folding, with brakes.", imageSrc: "/seed/eqp_104.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_105", name: "4 Fold Screen Panel", category: "specialized", desc: "Four-panel folding privacy screen for hospital wards and exam rooms.", imageSrc: "/seed/eqp_105.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_106", name: "2 Crank Paramount Bed", category: "beds", desc: "Hospital bed with 2-crank manual height and position adjustment.", imageSrc: "/seed/eqp_106.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false },
  { id: "eqp_107", name: "2 Crank Manual Bed", category: "beds", desc: "Standard 2-crank manually-operated hospital bed.", imageSrc: "/seed/eqp_107.jpg", price: null, requiresPrescription: false, cta: "quote", tag: "Equipment", available: "available", featured: false }
];

// v16.7: Bulk import all CATALOG_SEED_PRODUCTS into Firestore
async function bulkImportCatalog(onProgress) {
  let success = 0;
  let failed = 0;
  const total = CATALOG_SEED_PRODUCTS.length;
  const errors = [];
  for (let i = 0; i < total; i++) {
    const p = CATALOG_SEED_PRODUCTS[i];
    try {
      await setDoc(doc(db, "products", p.id), {
        name: p.name,
        slug: p.id,
        category: p.category,
        desc: p.desc,
        imageSrc: p.imageSrc,
        price: p.price,
        requiresPrescription: p.requiresPrescription,
        cta: p.cta,
        tag: p.tag,
        available: p.available,
        featured: p.featured,
        visible: true,
        rxCategory: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        seedImport: true,  // marker so we know these came from bulk import
      }, { merge: true });
      success++;
    } catch(e) {
      failed++;
      errors.push(p.name + ": " + e.message);
    }
    if (onProgress) onProgress(i + 1, total, success, failed);
  }
  return { success, failed, total, errors };
}

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

// v16.1: Improved product card with hover lift, better hierarchy, quick-add feedback
function ProductCard({product,addToCart,setPage,wishlist,toggleWishlist}){
  const [feedback,setFeedback]=useState(null);
  const [hover,setHover]=useState(false);
  const inWishlist=wishlist&&wishlist.includes(product.id);
  const handleBuy=useCallback(()=>{addToCart(product);setFeedback("added");setTimeout(()=>setFeedback(null),2000);},[product,addToCart]);
  
  // Determine accent color from category
  const cat = CATEGORIES.find(c=>c.id===product.category);
  const accentColor = cat?.accent || ds.color.red;
  
  return(
    <div 
      onMouseEnter={()=>setHover(true)} 
      onMouseLeave={()=>setHover(false)}
      style={{
        background:ds.color.white,
        border:`1px solid ${hover?accentColor+"55":ds.color.border}`,
        borderRadius:ds.radius.lg,
        overflow:"hidden",
        boxShadow:hover?ds.shadow.md:ds.shadow.xs,
        position:"relative",
        transform:hover?"translateY(-3px)":"translateY(0)",
        transition:"all 0.2s ease",
        display:"flex",
        flexDirection:"column",
        height:"100%",
      }}
    >
      {/* Top right badges container */}
      <div style={{position:"absolute",top:10,right:10,zIndex:2,display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
        {toggleWishlist&&(
          <button onClick={()=>toggleWishlist(product.id)} title={inWishlist?"Remove from wishlist":"Add to wishlist"}
            style={{background:"rgba(255,255,255,0.95)",border:`1px solid ${ds.color.border}`,borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer",boxShadow:ds.shadow.xs}}>
            {inWishlist?"❤️":"🤍"}
          </button>
        )}
      </div>
      
      {/* Top-left CTA badge (smaller, cleaner) */}
      {product.cta && product.cta !== "buy" && (
        <div style={{position:"absolute",top:10,left:10,zIndex:2}}>
          {product.cta==="quote" && <span style={{fontSize:9.5,fontWeight:700,letterSpacing:"0.06em",padding:"3px 8px",borderRadius:ds.radius.pill,background:ds.color.goldLight,color:ds.color.gold,border:`1px solid ${ds.color.goldBorder}`,textTransform:"uppercase"}}>By Quote</span>}
          {product.cta==="sales" && <span style={{fontSize:9.5,fontWeight:700,letterSpacing:"0.06em",padding:"3px 8px",borderRadius:ds.radius.pill,background:ds.color.canvas,color:ds.color.textBody,border:`1px solid ${ds.color.border}`,textTransform:"uppercase"}}>Contact Sales</span>}
        </div>
      )}
      
      <ProductImg imageSrc={product.imageSrc} category={product.category} name={product.name}/>
      
      <div style={{padding:"16px 18px 18px",display:"flex",flexDirection:"column",flex:1}}>
        {/* Category label (small, above name) */}
        {cat && (
          <div style={{fontSize:10,fontWeight:700,color:accentColor,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>
            {cat.label}
          </div>
        )}
        
        {/* Product name */}
        <h3 style={{fontSize:14,fontWeight:600,color:ds.color.textDark,lineHeight:1.35,marginBottom:6,minHeight:38}}>
          {product.name}
        </h3>
        
        {/* Rx badge inline if needed */}
        {product.requiresPrescription&&(
          <div style={{display:"inline-flex",alignItems:"center",gap:4,background:"#FFF3CD",border:"1px solid #FBBF24",borderRadius:ds.radius.pill,padding:"2px 8px",marginBottom:8,alignSelf:"flex-start"}}>
            <span style={{fontSize:10}}>💊</span>
            <span style={{fontSize:9,fontWeight:700,color:"#92400E",letterSpacing:"0.05em",textTransform:"uppercase"}}>Rx Required</span>
          </div>
        )}
        
        {/* Description (truncated) */}
        <p style={{
          fontSize:12,
          color:ds.color.textMuted,
          lineHeight:1.55,
          marginBottom:12,
          display:"-webkit-box",
          WebkitLineClamp:2,
          WebkitBoxOrient:"vertical",
          overflow:"hidden",
          flex:1,
        }}>{product.desc}</p>
        
        {/* Price + Stock indicator */}
        {product.price ? (
          <div style={{marginBottom:12,display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8}}>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:ds.color.textDark,lineHeight:1,fontFamily:ds.font.body}}>{formatPHP(product.price)}</div>
              <div style={{fontSize:10.5,color:ds.color.textLight,marginTop:2}}>VAT incl.</div>
            </div>
            {/* Stock indicator (always "in stock" for now since you have all photos) */}
            <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10.5,color:"#10B981",fontWeight:600}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#10B981"}}></span>
              In Stock
            </div>
          </div>
        ) : (
          <div style={{marginBottom:12,fontSize:12,color:ds.color.textMuted,fontStyle:"italic"}}>
            Price upon request
          </div>
        )}
        
        {/* CTA button */}
        {product.cta==="buy"  &&<Btn variant={feedback==="added"?"success":"primary"} size="sm" fullWidth onClick={handleBuy}>{feedback==="added"?"✓ Added to Cart":"+ Add to Cart"}</Btn>}
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

  const links=[{id:"home",label:"Home"},{id:"about",label:"About Us"},{id:"products",label:"Shop"},{id:"institutional",label:"Institutional"},{id:"blog",label:"Blog"},{id:"quote",label:"Request Quote"},{id:"track",label:"Track Order"},{id:"contact",label:"Contact"}];
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
  
  // v16.5: Refresh just blog posts
  const refreshPosts = async () => {
    try {
      const pSnap=await getDocs(query(collection(db,"posts"),orderBy("createdAt","desc")));
      setPosts(pSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh posts failed:", e.message); }
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
// v15.4: DMEAST logo as base64 JPEG (resized from original ~3MB to 36KB)
// The logo design uses gold/red on dark — PDFs render it on a small black band header
const DMEAST_LOGO_DATA = "data:image/jpeg;base64,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";
const DMEAST_LOGO_URL = null; // Legacy - kept for compatibility

// Document number prefixes
const DOC_PREFIXES = {
  quotation:    "QT",
  salesOrder:   "SO",
  deliveryReceipt: "DR",
  provisionalReceipt: "PR",
  proformaInvoice: "PI",  // v16.13: International orders
};

const DOC_TITLES = {
  quotation:    "QUOTATION",
  salesOrder:   "SALES ORDER",
  deliveryReceipt: "DELIVERY RECEIPT",
  provisionalReceipt: "PROVISIONAL RECEIPT",
  proformaInvoice: "PROFORMA INVOICE",  // v16.13: International orders
};

// v16.13: Incoterms reference — international trade shipping terms
const INCOTERMS = [
  { code: "EXW",  label: "EXW — Ex Works",           desc: "Customer picks up from our warehouse in Manila. Customer handles all logistics." },
  { code: "FOB",  label: "FOB — Free On Board",      desc: "We deliver to Manila port. Customer takes over from there (responsible for freight, insurance, duties)." },
  { code: "CPT",  label: "CPT — Carriage Paid To",   desc: "We arrange shipping to destination port. Customer handles insurance and duties." },
  { code: "CIF",  label: "CIF — Cost, Insurance & Freight", desc: "We arrange shipping AND insurance to destination port. Customer handles duties." },
  { code: "DAP",  label: "DAP — Delivered At Place", desc: "We deliver to customer's address. Customer handles import duties and local clearance." },
  { code: "DDP",  label: "DDP — Delivered Duty Paid", desc: "We handle everything door-to-door including duties. Most expensive for us, simplest for customer." },
];

// v16.13: Default incoterm based on delivery mode
const defaultIncoterm = (deliveryMode) => deliveryMode === "door" ? "DDP" : "FOB";

// v16.13: Currency symbols for international PI
const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", AUD: "A$",
  SGD: "S$", AED: "AED", PHP: "₱", CNY: "¥", HKD: "HK$",
};
const formatForeignCurrency = (amount, currency) => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + " ";
  const fixed = Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol}${fixed}`;
};

// v16.13: Approximate FX rates (PHP per 1 unit of foreign currency)
// These are rough indicative rates for PI generation. Customer pays based on actual bank rate at time of wire.
// Updated periodically — admin can override per PI if needed.
const FX_RATES_PHP_PER_UNIT = {
  USD: 57.00, EUR: 62.00, GBP: 72.00, JPY: 0.38, AUD: 38.00,
  SGD: 43.00, AED: 15.50, CNY: 7.85, HKD: 7.30, PHP: 1.00,
};
// Convert PHP amount → foreign currency, with 1% buffer added (per Edward's request)
function phpToForeign(phpAmount, currency) {
  if (currency === "PHP") return phpAmount;
  const rate = FX_RATES_PHP_PER_UNIT[currency] || 57; // fallback USD
  const foreign = phpAmount / rate;
  return foreign * 1.01; // 1% buffer for FX volatility
}

// v16.13/v16.14: International payment info for proforma invoices
// Edit these values in code when bank/payment info changes
const DMEAST_BANK_INFO = {
  beneficiary:  "DECON MEDICAL EQUIPMENT AND SUPPLIES TRADING",
  bankName:     "China Banking Corporation",
  bankAddress:  "8745 Paseo de Roxas, Makati City, Philippines",
  swiftCode:    "CHBKPHMM",
  accountName:  "DECON MEDICAL EQUIPMENT AND SUPPLIES TRADING",
  accountNo:    "150600002424",
  accountType:  "PHP Account (USD/foreign wires will be auto-converted at China Bank's prevailing rate)",
};

// v16.14: PayPal account info
const DMEAST_PAYPAL_INFO = {
  email:        "info@dmeastph.com",
  holdWarning:  "Important: PayPal holds transactions over $500 USD for up to 21 days. For faster processing on larger orders, please use wire transfer or credit/debit card instead.",
};

// v16.17: Maya static payment link (customer enters their own amount)
const DMEAST_MAYA_LINK = "https://payments.maya.ph/invoice?id=7e50e078-1e45-4f3c-b431-2f8fa669a173";

// v16.17: Default payment method toggle settings (used if Firestore not yet set)
const DEFAULT_PAYMENT_METHODS = {
  wireTransfer: true,
  fiuuQR:       true,
  paypal:       true,
  mayaLink:     true,
};

// v16.14: Fiuu in-store QR code (base64-encoded PNG)
// To update: convert your Fiuu QR PNG to base64 and replace the empty string below.
// Quick conversion: use https://www.base64-image.de or run in terminal:
//   base64 -i fiuu-qr.png | pbcopy   (macOS)
//   certutil -encode fiuu-qr.png tmp.txt && type tmp.txt   (Windows)
// Then paste the data URL ("data:image/png;base64,iVBORw0KG...") between the quotes below.
const FIUU_QR_IMAGE_DATA = "data:image/png;base64,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"; // v16.15: Real Fiuu QR embedded

// v16.14: Fiuu card payment info
const DMEAST_FIUU_INFO = {
  merchantName: "DECON MEDICAL EQUIPMENT AND SUPPLIES TRADING",
  // If you have a clickable URL alongside the QR, add it here for the email version
  paymentUrl:   "", // Optional: paste Fiuu hosted payment page URL if available
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

// v15: Calculate VAT breakdown based on treatment type
// VAT Inclusive: Total / 1.12 = Net of VAT, then VAT = Total - Net (matches BIR Sales Invoice booklet)
// VAT Exempt:    No VAT computation, all amount = Net (with "VAT EXEMPT" annotation)
// Zero-Rated:    No VAT computation, all amount = Net (with "ZERO-RATED" annotation)
function computeVATBreakdown(totalAmount, vatTreatment = "vat_inclusive") {
  const total = Number(totalAmount) || 0;
  const treatment = findVATTreatment(vatTreatment);
  
  if (treatment.applies) {
    // Standard 12% VAT inclusive
    const netOfVAT = total / 1.12;
    const vat = total - netOfVAT;
    return {
      total,
      netOfVAT: Math.round(netOfVAT * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      treatment: treatment,
      hasVAT: true,
    };
  } else {
    // VAT Exempt or Zero-Rated: no VAT, all amount is net
    return {
      total,
      netOfVAT: total,
      vat: 0,
      treatment: treatment,
      hasVAT: false,
    };
  }
}

// v15: Main PDF generator - creates all 4 document types
async function generateDocumentPDF({ order, docType, docNumber, validityDays = 30, vatTreatment, intlOptions = {} }) {
  // v16.13: For proforma invoice (international), intlOptions contains:
  //   { currency: "USD", incoterm: "FOB", customRate: null|number }
  const isPI = docType === "proformaInvoice";
  const piCurrency = intlOptions.currency || order.intlCurrency || "USD";
  const piIncoterm = intlOptions.incoterm || defaultIncoterm(order.intlDeliveryMode || "port");
  const fxRate = intlOptions.customRate || FX_RATES_PHP_PER_UNIT[piCurrency] || 57;
  const phpToForeignWithBuffer = (php) => isPI ? (php / fxRate) * 1.01 : php;
  const formatPI = (php) => formatForeignCurrency(phpToForeignWithBuffer(php), piCurrency);
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
  
  // ── HEADER (white background, logo on left) v16.0.1 ───────────────────
  // Note: white background is the document default; no rect needed
  // Logo placed naturally in upper-left
  try {
    if (DMEAST_LOGO_DATA) {
      // Logo aspect ratio is 800x565 = 1.42:1
      // Display at height ~52pt, width auto-calculated
      const logoH = 52;
      const logoW = logoH * 1.42; // ~74pt
      pdf.addImage(DMEAST_LOGO_DATA, "JPEG", margin, y - 5, logoW, logoH);
    }
  } catch(e) {
    // Fallback to text logo if image fails
    setColor(colors.red);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("DM EAST", margin, y + 22);
  }
  
  // Document title (right side, dark text on white)
  setColor(colors.dark);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(DOC_TITLES[docType], pageWidth - margin, y + 14, { align: "right" });
  
  // Doc number (right, below title — red brand color)
  setColor(colors.red);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`No. ${docNumber}`, pageWidth - margin, y + 30, { align: "right" });
  
  y += 56;
  
  // Gold accent line under header
  setDraw(colors.gold);
  pdf.setLineWidth(1.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 14;
  
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
  
  // ── VAT BREAKDOWN (v15.4: supports VAT Inclusive / Exempt / Zero-Rated) ────
  // Use order's vatTreatment, or fall back to passed parameter, or default to vat_inclusive
  const effectiveVAT = vatTreatment || order.vatTreatment || "vat_inclusive";
  const vat = computeVATBreakdown(order.total || 0, effectiveVAT);
  
  const totalsX = margin + contentWidth - 200;
  
  setColor(colors.dark);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  
  if (vat.hasVAT) {
    // Standard VAT Inclusive breakdown (matches BIR Sales Invoice booklet)
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
  } else {
    // VAT Exempt or Zero-Rated: show as single line
    const treatmentLabel = vat.treatment.short.toUpperCase();
    
    pdf.text(`Total Sales (${treatmentLabel}):`, totalsX, y);
    pdf.setFont("helvetica", "bold");
    pdf.text(formatPHPNum(vat.total), margin + contentWidth - 10, y, { align: "right" });
    y += 14;
    
    pdf.setFont("helvetica", "normal");
    pdf.text("VAT:", totalsX, y);
    pdf.text("0.00", margin + contentWidth - 10, y, { align: "right" });
    y += 14;
    
    pdf.text("Net Amount:", totalsX, y);
    pdf.text(formatPHPNum(vat.total), margin + contentWidth - 10, y, { align: "right" });
    y += 14;
    
    // Add VAT treatment notation as required by BIR
    setColor([240, 168, 28]); // gold
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(`** ${treatmentLabel} **`, totalsX, y);
    setColor(colors.dark);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    y += 14;
  }
  
  // Grand total box
  // v16.13: For Proforma Invoice, show TOTAL DUE in foreign currency (large)
  //          and PHP equivalent (small reference line below)
  if (isPI) {
    setFill(colors.red);
    pdf.rect(totalsX - 10, y - 4, 220, 22, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(`TOTAL DUE (${piCurrency}):`, totalsX, y + 11);
    pdf.text(formatPI(vat.total), margin + contentWidth - 10, y + 11, { align: "right" });
    y += 26;
    // Reference: PHP equivalent
    setColor(colors.muted);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    pdf.text(`Indicative PHP reference: ${formatPHP(vat.total)}  ·  @ rate ~${fxRate.toFixed(2)} PHP/${piCurrency} + 1% buffer`, totalsX, y);
    y += 14;
  } else {
    setFill(colors.red);
    pdf.rect(totalsX - 10, y - 4, 220, 22, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("TOTAL AMOUNT DUE:", totalsX, y + 11);
    pdf.text(formatPHP(vat.total), margin + contentWidth - 10, y + 11, { align: "right" });
    y += 30;
  }
  
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
  } else if (docType === "proformaInvoice") {
    // v16.13: International Proforma Invoice — shipping terms + wire transfer instructions
    
    // Shipping & Incoterms section
    pdf.setFont("helvetica", "bold");
    setColor(colors.dark);
    pdf.setFontSize(10);
    pdf.text("SHIPPING & DELIVERY TERMS:", margin, y); y += 14;
    pdf.setFont("helvetica", "normal");
    setColor(colors.muted);
    pdf.setFontSize(9);
    const incotermObj = INCOTERMS.find(i => i.code === piIncoterm) || INCOTERMS[1];
    pdf.text(`Incoterms: ${incotermObj.label}`, margin, y); y += 11;
    const incoLines = pdf.splitTextToSize(incotermObj.desc, contentWidth);
    incoLines.forEach(line => { pdf.text(line, margin, y); y += 10; });
    
    const deliveryMode = order.intlDeliveryMode === "door" ? "Door-to-Door" : "Port-to-Port";
    pdf.text(`Delivery Mode: ${deliveryMode}`, margin, y); y += 11;
    pdf.text(`Destination: ${order.intlCity || "—"}, ${order.intlCountry || "—"}${order.intlZip ? " " + order.intlZip : ""}`, margin, y); y += 11;
    pdf.text(`Preferred Shipping: ${order.intlShipping || "To be advised"}`, margin, y); y += 11;
    pdf.text(`Estimated Lead Time: 5–15 business days from payment receipt`, margin, y); y += 16;
    
    // v16.14: PAYMENT OPTIONS — Wire / Card (Fiuu QR) / PayPal
    // Helper to add page break when running out of space
    const ensureSpace = (needed) => {
      if (y + needed > pageHeight - 80) {
        pdf.addPage();
        y = margin;
      }
    };
    
    // Compute the PHP amount + indicative info upfront (used in all payment blocks)
    const phpAmount = vat.total;
    const phpAmountFmt = formatPHP(phpAmount);
    const foreignAmountFmt = formatPI(phpAmount);
    
    // ── Choose Payment Method Header ────────────────────────────
    // v16.17: Read payment method toggles (passed in via intlOptions or use defaults)
    const pm = (intlOptions && intlOptions.paymentMethods) ? intlOptions.paymentMethods : DEFAULT_PAYMENT_METHODS;
    
    // Build list of active methods with sequential option numbers
    const activeMethods = [
      { key: "wireTransfer", enabled: pm.wireTransfer },
      { key: "fiuuQR",       enabled: pm.fiuuQR },
      { key: "paypal",       enabled: pm.paypal },
      { key: "mayaLink",     enabled: pm.mayaLink },
    ].filter(m => m.enabled);
    
    if (activeMethods.length > 0) {
      ensureSpace(30);
      setColor(colors.dark);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("CHOOSE YOUR PAYMENT METHOD", margin, y); y += 6;
      setDraw(colors.gold);
      pdf.setLineWidth(1.5);
      pdf.line(margin, y, margin + 160, y);
      pdf.setLineWidth(0.5);
      y += 12;
      
      setColor(colors.muted);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.text(`Total amount due: ${foreignAmountFmt}  (≈ ${phpAmountFmt})  ·  Reference: PI #${docNumber}`, margin, y);
      y += 16;
    }
    
    let optionNum = 0;
    
    // ── Option: WIRE TRANSFER ────────────────────────────────
    if (pm.wireTransfer) {
      optionNum++;
      ensureSpace(135);
      setFill([254, 243, 199]); // light yellow
      pdf.rect(margin, y, contentWidth, 125, "F");
      setColor([146, 64, 14]); // dark amber
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(`OPTION ${optionNum}  —  BANK WIRE TRANSFER (T/T)  ·  Recommended for orders over $1,000`, margin + 10, y + 14);
      
      setColor(colors.dark);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      let py = y + 28;
      pdf.text(`Beneficiary:     ${DMEAST_BANK_INFO.beneficiary}`, margin + 10, py); py += 11;
      pdf.text(`Bank Name:       ${DMEAST_BANK_INFO.bankName}`, margin + 10, py); py += 11;
      pdf.text(`Bank Address:    ${DMEAST_BANK_INFO.bankAddress}`, margin + 10, py); py += 11;
      pdf.text(`SWIFT Code:      ${DMEAST_BANK_INFO.swiftCode}`, margin + 10, py); py += 11;
      pdf.text(`Account Number:  ${DMEAST_BANK_INFO.accountNo}`, margin + 10, py); py += 11;
      pdf.text(`Account Type:    ${DMEAST_BANK_INFO.accountType}`, margin + 10, py); py += 11;
      
      setColor([146, 64, 14]);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7.5);
      pdf.text(`Please include "PI #${docNumber}" in the wire transfer reference. Funds clear in 3-5 banking days.`, margin + 10, py);
      
      y += 135;
    }
    
    // ── Option: CREDIT / DEBIT CARD (Fiuu QR) ────────────────
    if (pm.fiuuQR) {
      optionNum++;
      ensureSpace(170);
      setFill([224, 242, 254]); // light blue
      pdf.rect(margin, y, contentWidth, 160, "F");
      setColor([7, 89, 133]); // dark blue
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(`OPTION ${optionNum}  —  CREDIT / DEBIT CARD  ·  Visa & Mastercard accepted`, margin + 10, y + 14);
      
      // QR area (left side ~110pt wide)
      const qrSize = 100;
      const qrX = margin + 10;
      const qrY = y + 25;
      try {
        if (FIUU_QR_IMAGE_DATA && FIUU_QR_IMAGE_DATA.length > 100) {
          pdf.addImage(FIUU_QR_IMAGE_DATA, "PNG", qrX, qrY, qrSize, qrSize);
        } else {
          setDraw([7, 89, 133]);
          pdf.setLineWidth(1);
          pdf.rect(qrX, qrY, qrSize, qrSize);
          pdf.setLineWidth(0.5);
          setColor([7, 89, 133]);
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(7);
          pdf.text("[ Fiuu Payment", qrX + qrSize/2, qrY + qrSize/2 - 6, { align: "center" });
          pdf.text("QR Code ]", qrX + qrSize/2, qrY + qrSize/2 + 6, { align: "center" });
          pdf.text("Will appear here", qrX + qrSize/2, qrY + qrSize/2 + 18, { align: "center" });
        }
      } catch(e) {
        console.warn("QR render failed:", e);
      }
      
      const instX = qrX + qrSize + 15;
      const instY = y + 28;
      setColor(colors.dark);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.text("How to pay by card:", instX, instY);
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      let iy = instY + 12;
      const cardSteps = [
        `1. Scan QR code with your phone camera (or use Fiuu app)`,
        `2. Enter amount:  ${phpAmountFmt}  (PHP only)`,
        `3. Enter reference:  PI-${docNumber.replace(/^PI-/, "")}`,
        `4. Enter your card details + complete 3D Secure verification`,
        `5. Forward the Fiuu confirmation receipt to info@dmeastph.com`,
      ];
      cardSteps.forEach(step => {
        const stepLines = pdf.splitTextToSize(step, contentWidth - qrSize - 35);
        stepLines.forEach(line => { pdf.text(line, instX, iy); iy += 10; });
      });
      
      setColor([7, 89, 133]);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7);
      pdf.text(`Important: Card will be charged in PHP. Your bank converts to your local currency at its own FX rate (typically 1-3% above market). Final amount on your card statement may vary slightly.`, margin + 10, y + 145, { maxWidth: contentWidth - 20 });
      
      y += 170;
    }
    
    // ── Option: PAYPAL ─────────────────────────────────────────
    if (pm.paypal) {
      optionNum++;
      ensureSpace(90);
      setFill([245, 243, 255]); // light purple
      pdf.rect(margin, y, contentWidth, 80, "F");
      setColor([88, 28, 135]); // dark purple
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(`OPTION ${optionNum}  —  PAYPAL  ·  Send to: ${DMEAST_PAYPAL_INFO.email}`, margin + 10, y + 14);
      
      setColor(colors.dark);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      let pyy = y + 28;
      pdf.text(`Recipient PayPal:   ${DMEAST_PAYPAL_INFO.email}`, margin + 10, pyy); pyy += 11;
      pdf.text(`Amount:             ${foreignAmountFmt}  (or PHP equivalent ${phpAmountFmt})`, margin + 10, pyy); pyy += 11;
      pdf.text(`Note/Reference:     PI-${docNumber.replace(/^PI-/, "")} — please include this in PayPal message`, margin + 10, pyy); pyy += 11;
      
      setColor([153, 27, 27]); // red
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.text("⚠ IMPORTANT: PayPal holds transactions over $500 USD for up to 21 days. Order processing", margin + 10, pyy); pyy += 9;
      pdf.text("will be delayed accordingly. For faster delivery on large orders, use wire transfer or card.", margin + 10, pyy);
      
      y += 90;
    }
    
    // ── Option: MAYA PAYMENT LINK ───────────────────────────────
    // v16.17: Maya static link — customer enters amount themselves
    if (pm.mayaLink) {
      optionNum++;
      ensureSpace(115);
      setFill([219, 234, 254]); // light teal-blue
      pdf.rect(margin, y, contentWidth, 105, "F");
      setColor([5, 95, 138]); // Maya brand blue
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(`OPTION ${optionNum}  —  MAYA  ·  GCash / Visa / Mastercard / QR Ph`, margin + 10, y + 14);
      
      setColor(colors.dark);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      let mpy = y + 28;
      pdf.text(`Payment Link:  ${DMEAST_MAYA_LINK}`, margin + 10, mpy); mpy += 14;
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("How to pay:", margin + 10, mpy); mpy += 11;
      pdf.setFont("helvetica", "normal");
      const mayaSteps = [
        `1. Open the payment link above in your browser`,
        `2. Enter the exact PHP amount: ${phpAmountFmt}`,
        `3. Enter reference: PI-${docNumber.replace(/^PI-/, "")}`,
        `4. Choose payment method: Maya wallet, GCash, Visa, Mastercard, or QR Ph`,
        `5. Complete payment and forward confirmation to info@dmeastph.com`,
      ];
      mayaSteps.forEach(step => {
        const stepLines = pdf.splitTextToSize(step, contentWidth - 20);
        stepLines.forEach(line => { pdf.text(line, margin + 10, mpy); mpy += 9; });
      });
      
      y += 115;
    }
    
    // ── Proforma Terms ─────────────────────────────────────────
    ensureSpace(110);
    pdf.setFont("helvetica", "bold");
    setColor(colors.dark);
    pdf.setFontSize(9);
    pdf.text("PROFORMA TERMS & CONDITIONS:", margin, y); y += 12;
    pdf.setFont("helvetica", "normal");
    setColor(colors.muted);
    pdf.setFontSize(8);
    const piTerms = [
      `1. This Proforma Invoice is valid for ${validityDays} days from issue date.`,
      `2. Quoted in ${piCurrency} at indicative spot rate + 1% buffer. Final amount per actual FX rate at time of receipt.`,
      "3. Funds received in foreign currency will be converted to PHP at China Bank's prevailing rate.",
      "4. Card payments are processed in PHP; customer's bank handles FX conversion at its own rate.",
      "5. Prices exclude destination duties, taxes, and customs fees (unless DDP incoterms selected).",
      "6. Shipment commences only upon confirmed receipt of full payment.",
      "7. Buyer is responsible for compliance with import regulations in destination country.",
      "8. Title to goods transfers upon payment; risk transfers per Incoterms.",
    ];
    piTerms.forEach(t => {
      const lines = pdf.splitTextToSize(t, contentWidth);
      lines.forEach(line => { pdf.text(line, margin, y); y += 9.5; });
    });
    y += 4;
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
    const disclaimer = isPI
      ? "This Proforma Invoice is for international trade documentation. Indicative pricing in " + piCurrency + " is shown for buyer's bank/customs reference. A BIR Official Sales Invoice will be issued upon payment receipt per Philippine regulations."
      : "This document is generated electronically by DMEAST Operations System. It is NOT a BIR Official Receipt. An Official Sales Invoice or Receipt will be issued separately upon payment per BIR regulations.";
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

// v15.3: Convert jsPDF document to base64 string for EmailJS attachment
function pdfToBase64(pdf) {
  // jsPDF outputs as a data URI: "data:application/pdf;base64,JVBERi0xLjMKMyAw..."
  // EmailJS Variable Attachment expects either a data URL or just base64 — both work
  return pdf.output("datauristring");
}

// v15.3: Send PDF document via email with auto-attachment
// Requires EmailJS template (pdfTemplateId) to have a Variable Attachment configured
// with parameter name = "pdf_attachment"
async function sendPDFviaEmail({ order, pdf, docType, docNumber, customMessage }) {
  if (!order?.email) return { ok: false, reason: "No email on file for this customer." };
  if (!pdf) return { ok: false, reason: "No PDF generated." };
  
  try {
    const base64 = pdfToBase64(pdf);
    const docTitle = DOC_TITLES[docType] || "Document";
    
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.pdfTemplateId, {
      // Standard variables for the email body
      customer_name:    order.name || "Customer",
      customer_email:   order.email,
      customer_phone:   order.phone || "—",
      doc_type:         docTitle,
      doc_number:       docNumber,
      order_ref:        "#" + order.id.slice(-6).toUpperCase(),
      order_total:      order.total ? formatPHP(order.total) : "—",
      custom_message:   customMessage || `Please find attached the ${docTitle.toLowerCase()} for your reference.`,
      from_name:        "DM EAST Team",
      from_email:       CONTACT.email,
      from_phone:       CONTACT.phone1,
      to_email:         order.email,
      reply_to:         CONTACT.email,
      // Attachment variable — must match the EmailJS template's Variable Attachment parameter name
      pdf_attachment:   base64,
      // Filename suggestion (also configured in EmailJS template, but pass it for reference)
      pdf_filename:     docNumber + ".pdf",
    }, EMAILJS_CONFIG.publicKey);
    
    return { ok: true };
  } catch(e) {
    console.error("PDF email failed:", e);
    return { ok: false, reason: e.message || e.text || String(e) };
  }
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
  // v15.4: VAT treatment for this PDF (defaults to order's saved treatment, but admin can override per-PDF)
  const [pdfVatTreatment, setPdfVatTreatment] = useState(order.vatTreatment || "vat_inclusive");
  // v16.13: International PI options — currency + incoterm
  const [piCurrency, setPiCurrency] = useState(order.intlCurrency || "USD");
  const [piIncoterm, setPiIncoterm] = useState(() => {
    if (order.intlDeliveryMode === "door") return "DDP";
    return "FOB";
  });
  // v16.17: Load payment method toggles from Firestore
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  useEffect(() => {
    getDoc(doc(db, "settings", "paymentMethods")).then(snap => {
      if (snap.exists()) setPaymentMethods({ ...DEFAULT_PAYMENT_METHODS, ...snap.data() });
    }).catch(() => {});
  }, []);
  
  // v16.13: Auto-switch to PI doc type if international order
  useEffect(() => {
    const isIntl = order.paymentMethod === "International Inquiry" 
      || order.status === "international_inquiry"
      || !!order.intlCountryISO;
    if (isIntl && docType === "quotation") {
      setDocType("proformaInvoice");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleGenerate = async () => {
    setGenerating(true); setErrMsg("");
    try {
      const num = await getNextDocumentNumber(docType);
      setDocNumber(num);
      // v15.4: Pass VAT treatment from order (or override if user changed it in this modal)
      const pdf = await generateDocumentPDF({ 
        order, docType, docNumber: num, validityDays,
        vatTreatment: pdfVatTreatment,
        intlOptions: { currency: piCurrency, incoterm: piIncoterm, paymentMethods },  // v16.13/v16.17
      });
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
  
  // v15.3: Auto-send PDF as email attachment (no manual drag-drop required)
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState(""); // "" | "success" | "error"
  const [emailError, setEmailError] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  const handleEmail = async () => {
    if (!generatedPdf || !order.email) {
      alert("No email on file for this customer. Please add an email to the order first, or download the PDF to send manually.");
      return;
    }
    setEmailSending(true);
    setEmailStatus("");
    setEmailError("");
    
    const result = await sendPDFviaEmail({
      order,
      pdf: generatedPdf,
      docType,
      docNumber,
      customMessage: customMsg.trim() || null,
    });
    
    if (result.ok) {
      setEmailStatus("success");
      setShowEmailForm(false);
    } else {
      setEmailStatus("error");
      setEmailError(result.reason || "Unknown error");
    }
    setEmailSending(false);
  };
  
  // Fallback: original mailto-based email (if EmailJS template not yet configured)
  const handleEmailManual = () => {
    if (!generatedPdf || !order.email) {
      alert("No email on file for this customer.");
      return;
    }
    const subject = encodeURIComponent(`${DOC_TITLES[docType]} ${docNumber} from DMEAST`);
    const body = encodeURIComponent(
      `Dear ${order.name || "Customer"},\n\n` +
      `Please find attached the ${DOC_TITLES[docType].toLowerCase()} (${docNumber}) ` +
      `for your reference.\n\n` +
      `Order Reference: #${order.id.slice(-6).toUpperCase()}\n` +
      `Total Amount: ${formatPHP(order.total||0)}\n\n` +
      `Please don't hesitate to contact us for any questions or clarifications.\n\n` +
      `Best regards,\nDMEAST Team\n${CONTACT.email}\n${CONTACT.phone1}\n\n` +
      `--\n📎 Please attach the downloaded ${docNumber}.pdf to this email before sending.`
    );
    window.location.href = `mailto:${order.email}?subject=${subject}&body=${body}`;
    handleDownload();
  };
  
  const handlePrint = () => {
    if (!generatedPdf) return;
    generatedPdf.autoPrint();
    window.open(generatedPdf.output("bloburl"), "_blank");
  };
  
  // v16.13: Detect if this is an international order
  const isIntlOrder = order.paymentMethod === "International Inquiry" 
    || order.status === "international_inquiry"
    || !!order.intlCountryISO;
  
  const docTypes = [
    { id: "quotation",          label: "Quotation",          icon: "📋", desc: "Formal quote for prospective orders, with validity period" },
    // v16.13: Proforma Invoice — only shown for international orders
    ...(isIntlOrder ? [{ id: "proformaInvoice", label: "Proforma Invoice", icon: "🌍", desc: "International order: foreign currency, incoterms, wire transfer instructions" }] : []),
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
            <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>📄 Generate Document{isIntlOrder && <span style={{fontSize:13,color:"#92400e",background:"#fef3c7",padding:"2px 8px",borderRadius:8,marginLeft:10,fontWeight:600}}>🌍 International</span>}</div>
            <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>Order #{order.id.slice(-6).toUpperCase()} · {order.name} · {formatPHP(order.total||0)}{isIntlOrder && order.intlCountry && ` · ${order.intlCountry}`}</div>
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
                  <label style={{fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5}}>{docType==="proformaInvoice"?"PI Validity Period (days)":"Validity Period (days)"}</label>
                  <select value={validityDays} onChange={e=>setValidityDays(Number(e.target.value))} style={{...inp,cursor:"pointer"}}>
                    <option value={7}>7 days</option>
                    <option value={15}>15 days</option>
                    <option value={30}>30 days (recommended)</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              )}
              
              {/* v16.13: International PI options — currency + incoterm (only shown for PI doc type) */}
              {docType === "proformaInvoice" && (
                <div style={{padding:"14px 16px",background:"#fef3c7",border:`1px solid #fbbf24`,borderRadius:ds.radius.md,marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#92400e",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>🌍 International Proforma Invoice Options</div>
                  
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5}}>Quoted Currency</label>
                      <select value={piCurrency} onChange={e=>setPiCurrency(e.target.value)} style={{...inp,cursor:"pointer"}}>
                        <option value="USD">USD ($) — US Dollar</option>
                        <option value="EUR">EUR (€) — Euro</option>
                        <option value="GBP">GBP (£) — British Pound</option>
                        <option value="JPY">JPY (¥) — Japanese Yen</option>
                        <option value="AUD">AUD (A$) — Australian Dollar</option>
                        <option value="SGD">SGD (S$) — Singapore Dollar</option>
                        <option value="AED">AED — UAE Dirham</option>
                        <option value="HKD">HKD (HK$) — Hong Kong Dollar</option>
                        <option value="CNY">CNY (¥) — Chinese Yuan</option>
                        <option value="PHP">PHP (₱) — Philippine Peso</option>
                      </select>
                      <div style={{fontSize:11,color:ds.color.textMuted,marginTop:4}}>Indicative FX: 1 {piCurrency} ≈ ₱{(FX_RATES_PHP_PER_UNIT[piCurrency]||57).toFixed(2)} (+ 1% buffer)</div>
                    </div>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5}}>Incoterms</label>
                      <select value={piIncoterm} onChange={e=>setPiIncoterm(e.target.value)} style={{...inp,cursor:"pointer"}}>
                        {INCOTERMS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                      </select>
                      <div style={{fontSize:11,color:ds.color.textMuted,marginTop:4,lineHeight:1.4}}>{INCOTERMS.find(i=>i.code===piIncoterm)?.desc || ""}</div>
                    </div>
                  </div>
                  
                  <div style={{fontSize:11,color:"#78350f",lineHeight:1.5,padding:"8px 10px",background:"rgba(255,255,255,0.5)",borderRadius:ds.radius.sm}}>
                    💡 <strong>Tip:</strong> Wire transfer instructions and your China Bank SWIFT details will be auto-included on the PI. {(order.intlDeliveryMode==="door"||piIncoterm==="DDP") ? "DDP means you absorb all shipping + duties — make sure to pad the quoted price." : "Customer is responsible for destination duties under " + piIncoterm + " terms."}
                  </div>
                </div>
              )}
              
              {/* v15.4: VAT Treatment selector */}
              <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:8}}>💰 VAT Treatment for this PDF</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {VAT_TREATMENT_OPTIONS.map(opt=>(
                    <button key={opt.id} type="button" onClick={()=>setPdfVatTreatment(opt.id)} style={{
                      padding:"8px 12px",
                      borderRadius:ds.radius.sm,
                      border:`1.5px solid ${pdfVatTreatment===opt.id?opt.badgeColor:ds.color.border}`,
                      background:pdfVatTreatment===opt.id?opt.badgeColor+"22":"#fff",
                      cursor:"pointer", fontSize:11.5, fontWeight:600,
                      color:pdfVatTreatment===opt.id?opt.badgeColor:ds.color.textBody,
                      fontFamily:ds.font.body
                    }}>
                      {opt.short}
                    </button>
                  ))}
                </div>
                {order.vatTreatment && order.vatTreatment !== pdfVatTreatment && (
                  <div style={{marginTop:8,fontSize:11,color:ds.color.textMuted,fontStyle:"italic"}}>
                    Order's saved treatment: {findVATTreatment(order.vatTreatment).short}
                  </div>
                )}
              </div>
              
              {/* Preview info */}
              <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Document Preview</div>
                <div style={{fontSize:12,color:ds.color.textBody,lineHeight:1.6}}>
                  📌 <strong>Customer:</strong> {order.name || "—"}<br/>
                  📌 <strong>Items:</strong> {(order.items||[]).length} item{(order.items||[]).length!==1?"s":""} {(order.otherCharges||[]).length>0&&` + ${(order.otherCharges||[]).length} charge${(order.otherCharges||[]).length!==1?"s":""}`}<br/>
                  📌 <strong>VAT Treatment:</strong> <span style={{color:findVATTreatment(pdfVatTreatment).badgeColor,fontWeight:700}}>{findVATTreatment(pdfVatTreatment).label}</span><br/>
                  📌 <strong>Total Amount:</strong> {formatPHP(order.total||0)}
                  {findVATTreatment(pdfVatTreatment).applies && <><br/>📌 <strong>VAT (12%):</strong> {formatPHP(computeVATBreakdown(order.total||0,pdfVatTreatment).vat)}</>}
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
              {/* v15.3: Email status feedback */}
              {emailStatus === "success" && (
                <div style={{padding:"12px 16px",background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>✉️</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:ds.color.success}}>Email sent to {order.email}!</div>
                    <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>The PDF was attached automatically. The customer will receive it shortly.</div>
                  </div>
                </div>
              )}
              {emailStatus === "error" && (
                <div style={{padding:"12px 16px",background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:ds.color.red}}>⚠ Email failed to send</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:4}}>{emailError}</div>
                  <div style={{fontSize:11.5,color:ds.color.textMuted,marginTop:6}}>
                    💡 Make sure your EmailJS dashboard has the PDF template configured. See setup guide. As a workaround, click <button onClick={handleEmailManual} style={{background:"none",border:"none",color:ds.color.red,cursor:"pointer",fontWeight:700,padding:0,textDecoration:"underline",fontFamily:ds.font.body,fontSize:11.5}}>here</button> to email manually (download PDF + open mail draft).
                  </div>
                </div>
              )}
              
              {/* v15.3: Email composition form */}
              {showEmailForm && emailStatus !== "success" && (
                <div style={{padding:"16px",background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark,marginBottom:10}}>✉️ Email PDF to {order.email}</div>
                  <div style={{fontSize:11.5,color:ds.color.textMuted,marginBottom:8}}>Add a personal message (optional). The PDF will be attached automatically.</div>
                  <textarea
                    value={customMsg}
                    onChange={e=>setCustomMsg(e.target.value)}
                    placeholder="Hi! Please find attached the quotation as discussed..."
                    rows={3}
                    style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.sm,fontSize:13,fontFamily:ds.font.body,outline:"none",resize:"vertical",boxSizing:"border-box",marginBottom:10}}
                  />
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                    <Btn variant="outline" size="sm" onClick={()=>setShowEmailForm(false)}>Cancel</Btn>
                    <Btn variant="primary" size="sm" disabled={emailSending} onClick={handleEmail}>{emailSending ? "Sending…" : "📤 Send Email with PDF"}</Btn>
                  </div>
                </div>
              )}
              
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  style={{width:"100%",height:380,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md}}
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
              <Btn variant="outline" size="md" onClick={()=>{setGeneratedPdf(null);setPreviewUrl(null);setEmailStatus("");setShowEmailForm(false);}}>← Generate Another</Btn>
              <Btn variant="outline" size="md" onClick={handlePrint}>🖨️ Print</Btn>
              {order.email && (
                <Btn variant="outline" size="md" onClick={()=>setShowEmailForm(true)} disabled={emailSending}>
                  {emailSending ? "Sending…" : "✉️ Email to Customer"}
                </Btn>
              )}
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
  // v15.4: VAT treatment for this order
  const [vatTreatment, setVatTreatment] = useState("vat_inclusive");
  
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
        // v15.4: VAT treatment
        vatTreatment: vatTreatment,
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
              {/* v15.4: VAT Treatment Selector — full width */}
              <div style={{gridColumn:"1/-1",padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`}}>
                <label style={{...lbl,marginBottom:8}}>💰 VAT Treatment</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {VAT_TREATMENT_OPTIONS.map(opt=>(
                    <button key={opt.id} type="button" onClick={()=>setVatTreatment(opt.id)} style={{
                      padding:"10px 14px",
                      borderRadius:ds.radius.md,
                      border:`2px solid ${vatTreatment===opt.id?opt.badgeColor:ds.color.border}`,
                      background:vatTreatment===opt.id?opt.badgeColor+"22":"#fff",
                      cursor:"pointer", flex:"1 1 200px", minWidth:0,
                      textAlign:"left", fontFamily:ds.font.body
                    }}>
                      <div style={{fontSize:12.5,fontWeight:700,color:vatTreatment===opt.id?opt.badgeColor:ds.color.textDark,marginBottom:3}}>
                        {opt.label}
                      </div>
                      <div style={{fontSize:10.5,color:ds.color.textMuted,lineHeight:1.35}}>
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
                {vatTreatment !== "vat_inclusive" && (
                  <div style={{marginTop:10,padding:"8px 12px",background:"#FEF3C7",borderRadius:ds.radius.sm,fontSize:11,color:"#92400E",lineHeight:1.4}}>
                    ⚠️ <strong>Reminder:</strong> {findVATTreatment(vatTreatment).label} status must be substantiated by proper documentation (Senior/PWD ID, PEZA cert, export docs, etc.) for BIR compliance.
                  </div>
                )}
              </div>
              
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
  // v15.4: VAT treatment (defaults to vat_inclusive for legacy orders)
  const [vatTreatment, setVatTreatment]   = useState(order.vatTreatment || "vat_inclusive");
  
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
        // v15.4: VAT treatment
        vatTreatment: vatTreatment,
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
              {/* v15.4: VAT Treatment Selector */}
              <div style={{gridColumn:"1/-1",padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`}}>
                <label style={{...lbl,marginBottom:8}}>💰 VAT Treatment</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {VAT_TREATMENT_OPTIONS.map(opt=>(
                    <button key={opt.id} type="button" onClick={()=>setVatTreatment(opt.id)} style={{
                      padding:"10px 14px",
                      borderRadius:ds.radius.md,
                      border:`2px solid ${vatTreatment===opt.id?opt.badgeColor:ds.color.border}`,
                      background:vatTreatment===opt.id?opt.badgeColor+"22":"#fff",
                      cursor:"pointer", flex:"1 1 200px", minWidth:0,
                      textAlign:"left", fontFamily:ds.font.body
                    }}>
                      <div style={{fontSize:12.5,fontWeight:700,color:vatTreatment===opt.id?opt.badgeColor:ds.color.textDark,marginBottom:3}}>
                        {opt.label}
                      </div>
                      <div style={{fontSize:10.5,color:ds.color.textMuted,lineHeight:1.35}}>
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
                {vatTreatment !== "vat_inclusive" && (
                  <div style={{marginTop:10,padding:"8px 12px",background:"#FEF3C7",borderRadius:ds.radius.sm,fontSize:11,color:"#92400E",lineHeight:1.4}}>
                    ⚠️ <strong>Reminder:</strong> {findVATTreatment(vatTreatment).label} status must be substantiated by proper documentation for BIR compliance.
                  </div>
                )}
              </div>
              
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
                  <option value="link_sent">💳 Maya Link Sent</option>
                  <option value="paid">✅ Paid via Maya</option>
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
              
              {/* ── v16.16: MAYA PAYMENT LINK ─────────────────────────────── */}
              <MayaPaymentPanel order={{...order, email, name, total}} onPaymentLinkSent={(invoiceUrl)=>{
                setPaymentStatusValue("link_sent");
              }}/>
              
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


// ─── v16.16: MAYA PAYMENT PANEL ──────────────────────────────────────────────
// Shown inside OrderEditorModal → Details tab
// Calls /api/maya-invoice serverless function, then emails the link to customer
function MayaPaymentPanel({ order, onPaymentLinkSent }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState(order?.mayaInvoiceUrl || null);
  const [payStatus, setPayStatus] = useState(order?.paymentStatus || "awaiting");
  const [errMsg, setErrMsg] = useState("");

  // Sync from order prop when modal re-opens
  useEffect(() => {
    setInvoiceUrl(order?.mayaInvoiceUrl || null);
    setPayStatus(order?.paymentStatus || "awaiting");
  }, [order?.id]);

  // Only show for local (non-international) orders that haven't been paid yet
  const isIntl = !!order?.intlCountryISO || order?.paymentMethod === "International Inquiry";
  const isPaid = payStatus === "paid";

  const handleSend = async () => {
    if (!order?.email && !confirm("No email on file for this customer. The link will be saved to the order but cannot be emailed. Continue?")) return;
    setSending(true); setErrMsg("");

    try {
      // Step 1 — Create Maya invoice via serverless function
      const resp = await fetch("/api/maya-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId:       order.orderNumber || order.id,
          orderRef:      order.orderNumber || order.id,
          amountPHP:     order.total || 0,
          customerEmail: order.email || "",
          customerName:  order.name  || "",
          description:   `DMEAST Order ${order.orderNumber || order.id}`,
        }),
      });

      const data = await resp.json();

      if (!data.success || !data.invoiceUrl) {
        throw new Error(data.error || "Maya did not return a payment link. Check Vercel logs.");
      }

      const link = data.invoiceUrl;

      // Step 2 — Save link + status to Firestore
      await updateDoc(doc(db, "orders", order.id), {
        mayaInvoiceUrl:    link,
        mayaInvoiceId:     data.invoiceId   || null,
        mayaInvoiceRef:    data.requestReferenceNumber || null,
        paymentStatus:     "link_sent",
        paymentLinkSentAt: new Date().toISOString(),
        updatedAt:         new Date().toISOString(),
      });

      // Step 3 — Email link to customer (if email available)
      if (order.email) {
        try {
          await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            {
              from_name: "DM EAST Team",
              company: "DM EAST",
              from_email: CONTACT.email,
              phone: CONTACT.phone1,
              product: `Payment Link — Order #${(order.orderNumber || order.id || "").slice(-6).toUpperCase()}`,
              quantity: "—",
              budget: formatPHP(order.total || 0),
              timeline: "Immediate",
              location: order.address || "—",
              details: `Your payment link is ready:\n\n${link}\n\nAmount: ${formatPHP(order.total || 0)}\nReference: ${order.orderNumber || order.id}\n\nThis link is valid for 24 hours. You can pay via GCash, Maya, Visa, Mastercard, or QR Ph.\n\nIf you have questions, reply to this email or contact us at ${CONTACT.phone1}.`,
              reply_to: CONTACT.email,
              to_email: order.email,
            },
            EMAILJS_CONFIG.publicKey
          );
        } catch(emailErr) {
          console.warn("Email send failed (link still saved):", emailErr);
        }
      }

      setInvoiceUrl(link);
      setPayStatus("link_sent");
      setSent(true);
      onPaymentLinkSent && onPaymentLinkSent(link);

    } catch(err) {
      console.error("Maya payment link error:", err);
      setErrMsg(err.message || "Failed to create payment link.");
    }

    setSending(false);
  };

  // Don't render for international orders
  if (isIntl) return null;

  return (
    <div style={{
      gridColumn:"1/-1",
      marginTop:4,
      borderTop:`1px dashed ${ds.color.border}`,
      paddingTop:16,
    }}>
      <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>
        💳 Maya Payment Link
      </div>

      {/* Already paid */}
      {isPaid && (
        <div style={{padding:"12px 16px",background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>✅</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:ds.color.success}}>Paid via Maya</div>
            {order?.paidAt && <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>Paid on: {new Date(order.paidAt).toLocaleString("en-PH")}</div>}
          </div>
        </div>
      )}

      {/* Link sent, awaiting payment */}
      {!isPaid && payStatus === "link_sent" && invoiceUrl && !sent && (
        <div style={{padding:"12px 16px",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:ds.radius.md}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1D4ED8",marginBottom:6}}>💳 Payment link sent — awaiting customer payment</div>
          <div style={{fontSize:11.5,color:ds.color.textMuted,marginBottom:8,wordBreak:"break-all"}}>{invoiceUrl}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <a href={invoiceUrl} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:ds.radius.sm,background:"#1D4ED8",color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none"}}>🔗 Open Link</a>
            <button onClick={()=>{navigator.clipboard.writeText(invoiceUrl);}} style={{padding:"6px 12px",borderRadius:ds.radius.sm,border:"1px solid #1D4ED8",background:"#fff",color:"#1D4ED8",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body}}>📋 Copy</button>
            <button onClick={handleSend} disabled={sending} style={{padding:"6px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",color:ds.color.textBody,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ds.font.body}}>🔄 Resend</button>
          </div>
        </div>
      )}

      {/* Success — just sent */}
      {sent && invoiceUrl && (
        <div style={{padding:"12px 16px",background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md}}>
          <div style={{fontSize:13,fontWeight:700,color:ds.color.success,marginBottom:6}}>✅ Payment link sent{order?.email ? ` to ${order.email}` : ""}!</div>
          <div style={{fontSize:11.5,color:ds.color.textMuted,marginBottom:8,wordBreak:"break-all"}}>{invoiceUrl}</div>
          <div style={{display:"flex",gap:8}}>
            <a href={invoiceUrl} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:ds.radius.sm,background:ds.color.success,color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none"}}>🔗 Open Link</a>
            <button onClick={()=>{navigator.clipboard.writeText(invoiceUrl);}} style={{padding:"6px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.success}`,background:"#fff",color:ds.color.success,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body}}>📋 Copy</button>
          </div>
        </div>
      )}

      {/* Ready to send */}
      {!isPaid && payStatus !== "link_sent" && !sent && (
        <div style={{padding:"14px 16px",background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md}}>
          <div style={{fontSize:12.5,color:ds.color.textBody,marginBottom:10,lineHeight:1.5}}>
            Generate a Maya payment link for <strong>{order?.name || "this customer"}</strong> — amount: <strong style={{color:ds.color.red}}>{formatPHP(order?.total || 0)}</strong>.<br/>
            <span style={{fontSize:11.5,color:ds.color.textMuted}}>Accepts GCash, Maya, Visa, Mastercard, QR Ph. Link emailed to customer automatically.</span>
          </div>
          {!order?.email && (
            <div style={{padding:"8px 10px",background:"#FEF3C7",borderRadius:ds.radius.sm,fontSize:11.5,color:"#92400E",marginBottom:10}}>
              ⚠️ No customer email on file — link will be saved but not emailed. Add an email in the Customer Info tab first.
            </div>
          )}
          <button
            onClick={handleSend}
            disabled={sending || (order?.total || 0) <= 0}
            style={{
              padding:"10px 20px",
              borderRadius:ds.radius.md,
              border:"none",
              background:sending?"#94A3B8":"#1A56DB",
              color:"#fff",
              fontSize:13,
              fontWeight:700,
              cursor:sending?"not-allowed":"pointer",
              fontFamily:ds.font.body,
              display:"flex",
              alignItems:"center",
              gap:8,
              opacity:(order?.total || 0) <= 0 ? 0.5 : 1,
            }}
          >
            {sending ? "⏳ Creating link…" : "💳 Send Maya Payment Link"}
          </button>
          {(order?.total || 0) <= 0 && (
            <div style={{marginTop:8,fontSize:11.5,color:ds.color.textMuted}}>⚠️ Order total must be greater than ₱0 before sending a payment link.</div>
          )}
        </div>
      )}

      {errMsg && (
        <div style={{marginTop:10,padding:"10px 14px",background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,fontSize:12.5,color:ds.color.red}}>
          ⚠️ {errMsg}
          <div style={{fontSize:11,marginTop:4,color:ds.color.textMuted}}>Check that MAYA_SECRET_KEY is set in Vercel and the /api/maya-invoice function is deployed.</div>
        </div>
      )}
    </div>
  );
}

// ─── v16.17: PAYMENT METHOD SETTINGS ────────────────────────────────────────
// Firestore doc: settings/paymentMethods
// Super Admin only — toggles which payment methods appear on Proforma Invoices
function PaymentMethodSettings(){
  const [methods, setMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    getDoc(doc(db, "settings", "paymentMethods")).then(snap => {
      if (snap.exists()) setMethods({ ...DEFAULT_PAYMENT_METHODS, ...snap.data() });
      setLoading(false);
    }).catch(e => { setErrMsg("Failed to load settings: " + e.message); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setErrMsg("");
    try {
      await setDoc(doc(db, "settings", "paymentMethods"), methods);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch(e) {
      setErrMsg("Failed to save: " + e.message);
    }
    setSaving(false);
  };

  const toggle = (key) => setMethods(prev => ({ ...prev, [key]: !prev[key] }));

  const METHODS = [
    {
      key:   "wireTransfer",
      label: "Bank Wire Transfer (T/T)",
      desc:  "SWIFT wire to China Bank account 150600002424. Recommended for orders over $1,000.",
      icon:  "🏦",
      color: "#92400E",
      bg:    "#FEF3C7",
    },
    {
      key:   "fiuuQR",
      label: "Fiuu QR Code — Credit/Debit Card",
      desc:  "Visa & Mastercard via Fiuu in-store QR. Card charged in PHP.",
      icon:  "💳",
      color: "#075985",
      bg:    "#E0F2FE",
    },
    {
      key:   "paypal",
      label: "PayPal",
      desc:  "Send to info@dmeastph.com. ⚠️ PayPal holds transactions over $500 USD for 21 days.",
      icon:  "💸",
      color: "#581C87",
      bg:    "#F5F3FF",
    },
    {
      key:   "mayaLink",
      label: "Maya Payment Link",
      desc:  "Static Maya link — customer enters their own amount. Accepts Maya, GCash, Visa, Mastercard, QR Ph.",
      icon:  "📱",
      color: "#055F8A",
      bg:    "#DBE4FE",
    },
  ];

  if (loading) return (
    <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"40px",textAlign:"center",color:ds.color.textMuted}}>
      <Spinner size={28}/> <span style={{marginLeft:10}}>Loading settings…</span>
    </div>
  );

  return (
    <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs,maxWidth:720}}>
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>⚙️ Payment Method Settings</div>
        <div style={{fontSize:13,color:ds.color.textMuted,marginTop:4}}>
          Control which payment methods appear on Proforma Invoices (PI). Changes take effect on the next generated PI.
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
        {METHODS.map(m => (
          <div key={m.key} style={{
            display:"flex",
            alignItems:"center",
            gap:16,
            padding:"16px 18px",
            background: methods[m.key] ? m.bg : ds.color.canvas,
            border:`1.5px solid ${methods[m.key] ? m.color + "60" : ds.color.border}`,
            borderRadius:ds.radius.md,
            transition:"all 0.15s",
            cursor:"pointer",
          }} onClick={() => toggle(m.key)}>
            {/* Toggle switch */}
            <div style={{
              width:44, height:24, borderRadius:12, flexShrink:0,
              background: methods[m.key] ? m.color : "#CBD5E1",
              position:"relative", transition:"background 0.2s",
            }}>
              <div style={{
                position:"absolute",
                top:3, left: methods[m.key] ? 23 : 3,
                width:18, height:18, borderRadius:"50%",
                background:"#fff",
                boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
                transition:"left 0.2s",
              }}/>
            </div>
            {/* Icon + text */}
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{m.icon}</span>
                <span style={{fontSize:14,fontWeight:700,color: methods[m.key] ? m.color : ds.color.textMuted}}>
                  {m.label}
                </span>
                <span style={{
                  fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:ds.radius.pill,
                  background: methods[m.key] ? m.color : "#94A3B8",
                  color:"#fff",
                }}>
                  {methods[m.key] ? "ON" : "OFF"}
                </span>
              </div>
              <div style={{fontSize:12,color:ds.color.textMuted,marginTop:4,lineHeight:1.5}}>
                {m.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Maya link display */}
      <div style={{padding:"12px 14px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,marginBottom:20,fontSize:12}}>
        <span style={{fontWeight:700,color:ds.color.textDark}}>📱 Maya Link URL: </span>
        <span style={{color:ds.color.textMuted,wordBreak:"break-all"}}>{DMEAST_MAYA_LINK}</span>
        <div style={{marginTop:4,fontSize:11,color:ds.color.textMuted}}>
          This is a static link — customers enter their own payment amount. To change this link, update <code>DMEAST_MAYA_LINK</code> in the source code.
        </div>
      </div>

      {/* Active count warning */}
      {Object.values(methods).filter(Boolean).length === 0 && (
        <div style={{padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red,marginBottom:16}}>
          ⚠️ At least one payment method must be active. PIs with no payment methods will not show a payment section.
        </div>
      )}

      {errMsg && (
        <div style={{padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red,marginBottom:16}}>
          ⚠️ {errMsg}
        </div>
      )}

      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <Btn variant="primary" size="md" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "💾 Save Settings"}
        </Btn>
        {saved && (
          <span style={{fontSize:13,color:ds.color.success,fontWeight:600}}>✅ Saved! Next PI will use these settings.</span>
        )}
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
  // v16.5: Blog posts
  const [posts,setPosts]=useState([]);
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
  
  // v16.7: Bulk import the 130-product catalog (medicines + equipment) from PDFs
  const seedFullCatalog = async () => {
    if (!confirm("This will import "+CATALOG_SEED_PRODUCTS.length+" products (medicines + equipment) into your catalog. Existing products with matching IDs will be updated. Continue?")) return;
    setSeeding(true); setSeedingMessage("⏳ Importing 0/"+CATALOG_SEED_PRODUCTS.length+"…");
    try {
      const result = await bulkImportCatalog((current, total, success, failed) => {
        setSeedingMessage("⏳ Importing "+current+"/"+total+" ("+success+" ok"+(failed?", "+failed+" failed":"")+")");
      });
      if (result.failed === 0) {
        setSeedingMessage("✓ Imported "+result.success+" products successfully");
      } else {
        setSeedingMessage("⚠ "+result.success+" imported, "+result.failed+" failed");
        console.warn("Bulk import errors:", result.errors);
      }
      await refreshProducts();
    } catch (e) { setSeedingMessage("⚠ "+e.message); }
    setSeeding(false);
    setTimeout(()=>setSeedingMessage(""), 6000);
  };
  
  // v16.8: Bulk hide all Rx products (for Fiuu payment gateway approval)
  const bulkHideRxProducts = async () => {
    const rxProducts = PRODUCTS.filter(p => p.requiresPrescription === true && p.visible !== false);
    if (rxProducts.length === 0) {
      setSeedingMessage("ℹ No visible Rx products to hide");
      setTimeout(()=>setSeedingMessage(""), 3500);
      return;
    }
    if (!confirm("This will HIDE "+rxProducts.length+" prescription medicines from the public shop. They remain in admin and can be re-shown anytime. Continue?")) return;
    setSeeding(true); setSeedingMessage("⏳ Hiding "+rxProducts.length+" Rx products…");
    try {
      const batch = writeBatch(db);
      rxProducts.forEach(p => {
        const docId = p._docId || p.id;
        const ref = doc(db, "products", docId);
        batch.update(ref, { visible: false, hiddenReason: "rx_pending_approval", hiddenAt: serverTimestamp() });
      });
      await batch.commit();
      setSeedingMessage("✓ Hidden "+rxProducts.length+" Rx products from public shop");
      await refreshProducts();
    } catch (e) { setSeedingMessage("⚠ "+e.message); }
    setSeeding(false);
    setTimeout(()=>setSeedingMessage(""), 5000);
  };
  
  // v16.8: Re-show previously hidden Rx products
  const bulkShowRxProducts = async () => {
    const hiddenRx = PRODUCTS.filter(p => p.requiresPrescription === true && p.visible === false);
    if (hiddenRx.length === 0) {
      setSeedingMessage("ℹ No hidden Rx products to restore");
      setTimeout(()=>setSeedingMessage(""), 3500);
      return;
    }
    if (!confirm("This will RESTORE visibility for "+hiddenRx.length+" prescription medicines on the public shop. Continue?")) return;
    setSeeding(true); setSeedingMessage("⏳ Restoring "+hiddenRx.length+" Rx products…");
    try {
      const batch = writeBatch(db);
      hiddenRx.forEach(p => {
        const docId = p._docId || p.id;
        const ref = doc(db, "products", docId);
        batch.update(ref, { visible: true, hiddenReason: null });
      });
      await batch.commit();
      setSeedingMessage("✓ Restored "+hiddenRx.length+" Rx products to public shop");
      await refreshProducts();
    } catch (e) { setSeedingMessage("⚠ "+e.message); }
    setSeeding(false);
    setTimeout(()=>setSeedingMessage(""), 5000);
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
      // v16.5: Blog posts
      try {
        const pSnap=await getDocs(query(collection(db,"posts"),orderBy("createdAt","desc")));
        setPosts(pSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Blog posts load failed:", e.message); }
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
  
  // v16.5: Refresh just blog posts
  const refreshPosts = async () => {
    try {
      const pSnap=await getDocs(query(collection(db,"posts"),orderBy("createdAt","desc")));
      setPosts(pSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh posts failed:", e.message); }
  };
  const allTabs=[{id:"overview",label:"Overview",icon:"📊"},{id:"orders",label:`Orders${pendingPaymentCount>0?" 🔔":""}`,icon:"📦"},{id:"receivables",label:"Receivables",icon:"💰"},{id:"expenses",label:"Expenses",icon:"🏢"},{id:"billings",label:"Billings",icon:"📝"},{id:"margin",label:"Margin",icon:"📈"},{id:"products",label:"Products",icon:"🗂️"},{id:"customers",label:"Customers",icon:"👥"},{id:"rx",label:"Rx Uploads",icon:"💊"},{id:"blog",label:"Blog",icon:"📝"},{id:"settings",label:"Settings",icon:"⚙️"}];
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
                      {o.vatTreatment && o.vatTreatment !== "vat_inclusive" && (()=>{const v=findVATTreatment(o.vatTreatment);return <span style={{fontSize:9,marginLeft:5,padding:"2px 7px",background:v.badgeColor+"22",color:v.badgeColor,borderRadius:ds.radius.pill,fontWeight:700,letterSpacing:"0.04em"}}>{v.badge}</span>;})()}
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
                {!PRODUCTS.some(p=>p.seedImport===true) && (
                  <Btn variant="secondary" size="sm" onClick={seedFullCatalog} disabled={seeding} title="Import 130 products (23 medicines + 107 equipment) from the catalog seed">{seeding?"Importing…":"📦 Import Full Catalog (130)"}</Btn>
                )}
                {/* v16.8: Bulk hide/show Rx products (Fiuu approval workaround) */}
                {(()=>{
                  const visibleRx = PRODUCTS.filter(p => p.requiresPrescription === true && p.visible !== false).length;
                  const hiddenRx = PRODUCTS.filter(p => p.requiresPrescription === true && p.visible === false).length;
                  if (visibleRx > 0) {
                    return <Btn variant="outline" size="sm" onClick={bulkHideRxProducts} disabled={seeding} title="Hide all Rx products from the public shop (for Fiuu / payment gateway approval)">{seeding?"Hiding…":`🙈 Hide ${visibleRx} Rx Product${visibleRx!==1?"s":""}`}</Btn>;
                  }
                  if (hiddenRx > 0) {
                    return <Btn variant="gold" size="sm" onClick={bulkShowRxProducts} disabled={seeding} title="Re-show all hidden Rx products">{seeding?"Restoring…":`👁️ Show ${hiddenRx} Hidden Rx Product${hiddenRx!==1?"s":""}`}</Btn>;
                  }
                  return null;
                })()}
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
        
        {/* v16.5: Blog/Posts tab */}
        {tab==="blog"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <PostsTab posts={posts} refreshPosts={refreshPosts} userRole={userRole}/>
          </div>
        )}
        
        {/* v16.17: Settings Tab — Payment Method Toggles (Super Admin only) */}
        {tab==="settings"&&(
          <PaymentMethodSettings/>
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
// ─── v16.0 HOMEPAGE COMPONENTS ───────────────────────────────────────────────
// New homepage redesign inspired by leading pharmacy ecommerce, but using DMEAST's
// brand palette (red, gold, pink, white) and serif display typography.

// v16.0: Top announcement bar (dismissible)
function TopAnnouncementBar(){
  const [show, setShow] = useState(true);
  if (!show) return null;
  return (
    <div style={{
      background: `linear-gradient(90deg, ${ds.color.red} 0%, #B91C2A 50%, ${ds.color.red} 100%)`,
      color: "#fff",
      padding: "8px 28px",
      fontSize: 12.5,
      fontWeight: 600,
      textAlign: "center",
      letterSpacing: "0.02em",
      position: "relative",
      zIndex: 50,
    }}>
      <span style={{marginRight:6}}>🚚</span>
      Free delivery within Metro Manila on orders ₱5,000+
      <span style={{margin:"0 12px",opacity:0.6}}>·</span>
      <span>📞 +63 951 040 1708</span>
      <button onClick={()=>setShow(false)} aria-label="Close announcement" style={{
        position:"absolute",
        right:14,
        top:"50%",
        transform:"translateY(-50%)",
        background:"none",
        border:"none",
        color:"#fff",
        cursor:"pointer",
        fontSize:14,
        opacity:0.8,
        padding:4,
      }}>✕</button>
    </div>
  );
}

// v16.0: Modern hero with photo slot, trust badges, dual CTA
function HeroSectionV16({setPage}){
  return (
    <section className="dm-hero-section" style={{
      background: `linear-gradient(150deg, ${ds.color.canvasWarm} 0%, ${ds.color.white} 60%, ${ds.color.canvasGold} 100%)`,
      padding: "72px 0 80px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div className="dm-dot-bg" style={{position:"absolute",right:0,top:0,width:"55%",height:"100%",opacity:0.55,pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"-100px",right:"-80px",width:480,height:480,borderRadius:"50%",border:`2px solid ${ds.color.goldBright}25`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-160px",left:"-100px",width:380,height:380,borderRadius:"50%",background:`radial-gradient(circle, ${ds.color.redLight} 0%, transparent 70%)`,opacity:0.6,pointerEvents:"none"}}/>
      
      <div style={{maxWidth:1280,margin:"0 auto",padding:"0 28px",position:"relative",zIndex:1}}>
        <div className="dm-hero-grid">
          
          {/* LEFT: Text content */}
          <div>
            {/* Trust badges row */}
            <div className="dm-fade-up" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:6,background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.pill,padding:"5px 12px",fontSize:11.5,color:ds.color.red,fontWeight:700,letterSpacing:"0.02em"}}>
                <span style={{fontSize:11}}>📋</span> BIR-Registered
              </span>
              <span style={{display:"inline-flex",alignItems:"center",gap:6,background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.pill,padding:"5px 12px",fontSize:11.5,color:ds.color.gold,fontWeight:700,letterSpacing:"0.02em"}}>
                <span style={{fontSize:11}}>🏥</span> 50+ Healthcare Institutions
              </span>
              <span style={{display:"inline-flex",alignItems:"center",gap:6,background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.pill,padding:"5px 12px",fontSize:11.5,color:ds.color.textBody,fontWeight:600,letterSpacing:"0.02em"}}>
                <span style={{fontSize:11}}>✓</span> FDA-Licensed Suppliers
              </span>
            </div>
            
            <h1 className="dm-fade-up dm-fade-up-1" style={{fontFamily:ds.font.display,fontSize:"clamp(2.2rem,4.5vw,3.6rem)",fontWeight:400,color:ds.color.textDark,lineHeight:1.1,marginBottom:8}}>
              Your Trusted Source for
            </h1>
            <h1 className="dm-fade-up dm-fade-up-2" style={{fontFamily:ds.font.display,fontSize:"clamp(2.2rem,4.5vw,3.6rem)",fontWeight:400,lineHeight:1.1,marginBottom:24}}>
              <span style={{color:ds.color.red}}>Quality Medical</span><br/>
              <span style={{color:ds.color.textDark}}>Solutions</span>
              <span style={{color:ds.color.gold}}>.</span>
            </h1>
            
            <p className="dm-fade-up dm-fade-up-3" style={{fontSize:16,color:ds.color.textMuted,lineHeight:1.75,maxWidth:520,marginBottom:32}}>
              Pharmaceuticals, medical equipment, and healthcare essentials —
              delivered nationwide. Trusted by hospitals, clinics, LGUs, and 
              individuals across the Philippines.
            </p>
            
            {/* Search bar */}
            <div className="dm-fade-up dm-fade-up-3" style={{maxWidth:520,marginBottom:24}}>
              <button onClick={()=>setPage("products")} style={{
                width:"100%",
                background:"#fff",
                border:`2px solid ${ds.color.border}`,
                borderRadius:ds.radius.lg,
                padding:"14px 18px 14px 50px",
                fontSize:14,
                color:ds.color.textMuted,
                cursor:"pointer",
                position:"relative",
                fontFamily:ds.font.body,
                textAlign:"left",
                transition:"border-color 0.15s, box-shadow 0.15s",
                boxShadow:ds.shadow.xs,
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=ds.color.red;e.currentTarget.style.boxShadow=ds.shadow.sm;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=ds.color.border;e.currentTarget.style.boxShadow=ds.shadow.xs;}}
              >
                <span style={{position:"absolute",left:18,top:"50%",transform:"translateY(-50%)",fontSize:18}}>🔍</span>
                Search medicines, equipment, or browse our catalog…
                <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:ds.color.red,color:"#fff",borderRadius:ds.radius.md,padding:"6px 14px",fontSize:12,fontWeight:700}}>Browse →</span>
              </button>
            </div>
            
            {/* Dual CTA */}
            <div className="dm-fade-up dm-fade-up-4" style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:28}}>
              <Btn variant="primary" size="lg" onClick={()=>setPage("products")}>Shop Products</Btn>
              <Btn variant="outline" size="lg" onClick={()=>setPage("quote")}>Request Bulk Quote</Btn>
            </div>
            
            {/* Trust line */}
            <div className="dm-fade-up dm-fade-up-4" style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",fontSize:12,color:ds.color.textMuted}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{display:"inline-flex"}}>{"★★★★★".split("").map((s,i)=><span key={i} style={{color:ds.color.gold}}>★</span>)}</span>
                <span style={{fontWeight:700,color:ds.color.textDark}}>5.0</span>
                <span>from healthcare partners</span>
              </div>
              <span style={{opacity:0.4}}>·</span>
              <span>🚚 Nationwide delivery</span>
              <span style={{opacity:0.4}}>·</span>
              <span>🔒 Secure checkout</span>
            </div>
          </div>
          
          {/* RIGHT: v15-style stat tiles + dark info panel — hidden on mobile via dm-hero-right */}
          <div className="dm-hero-right" style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="dm-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
              {[
                {v:"5+",l:"Years Serving PH",accent:ds.color.red},
                {v:"500+",l:"Clients Nationwide",accent:ds.color.goldBright},
                {v:"9",l:"Product Categories",accent:ds.color.red},
                {v:"24/7",l:"Order Support",accent:ds.color.goldBright}
              ].map((s,i)=>(
                <div key={i} style={{
                  background:ds.color.white,
                  border:`1px solid ${ds.color.border}`,
                  borderRadius:ds.radius.lg,
                  padding:"22px 18px",
                  textAlign:"center",
                  borderTop:`3px solid ${s.accent}`,
                  boxShadow:ds.shadow.xs
                }}>
                  <div style={{fontFamily:ds.font.display,fontSize:"2rem",color:s.accent,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:11,color:ds.color.textMuted,marginTop:6,fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase"}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{
              background:ds.color.textDark,
              borderRadius:ds.radius.lg,
              padding:"22px 24px"
            }}>
              <div style={{fontSize:10,fontWeight:700,color:ds.color.goldBright,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Why Choose DMEAST</div>
              <div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:8}}>Products from Authorized Suppliers</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",lineHeight:1.7}}>
                All products are sourced from verified and authorized suppliers. Standard items available for direct purchase. Institutional and specialized orders handled upon request.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


// v16.0: Stats trust band
function StatsTrustBand(){
  const stats = [
    { icon:"🏆", value:"5+", label:"Years of Excellence", color:ds.color.red },
    { icon:"💊", value:"500+", label:"Quality Products", color:ds.color.goldBright },
    { icon:"🏥", value:"50+", label:"Healthcare Institutions", color:ds.color.red },
    { icon:"⭐", value:"100%", label:"Quality-First Promise", color:ds.color.goldBright },
  ];
  return (
    <section style={{background:ds.color.white,padding:"40px 28px",borderTop:`1px solid ${ds.color.borderLight}`,borderBottom:`1px solid ${ds.color.borderLight}`}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:20}}>
          {stats.map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"4px"}}>
              <div style={{width:50,height:50,borderRadius:ds.radius.md,background:s.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {s.icon}
              </div>
              <div>
                <div style={{fontFamily:ds.font.display,fontSize:24,color:s.color,lineHeight:1,fontWeight:400}}>{s.value}</div>
                <div style={{fontSize:12,color:ds.color.textMuted,marginTop:4,fontWeight:500}}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// v16.0: Category grid (icon-based, mobile-friendly)
function CategoryGridV16({setPage,setActiveCategory}){
  const allCats = CATEGORIES.filter(c => !c.institutional);
  return (
    <section style={{background:ds.color.canvas,padding:"64px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.gold,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Browse by Category</div>
          <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400,marginBottom:8}}>What are you looking for today?</h2>
          <p style={{fontSize:14,color:ds.color.textMuted,maxWidth:560,margin:"0 auto"}}>Find pharmaceuticals, medical supplies, and healthcare essentials — all in one place.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:14}}>
          {allCats.map((cat,i)=>{
            const colors = [ds.color.red, ds.color.gold, ds.color.red, ds.color.gold];
            const accent = colors[i % colors.length];
            return (
              <button key={cat.id} onClick={()=>{setActiveCategory(cat.id);setPage("products");}} style={{
                background:"#fff",
                border:`1px solid ${ds.color.border}`,
                borderRadius:ds.radius.lg,
                padding:"24px 16px",
                cursor:"pointer",
                fontFamily:ds.font.body,
                transition:"transform 0.15s, border-color 0.15s, box-shadow 0.15s",
                boxShadow:ds.shadow.xs,
                textAlign:"center",
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=accent;e.currentTarget.style.boxShadow=ds.shadow.md;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor=ds.color.border;e.currentTarget.style.boxShadow=ds.shadow.xs;}}
              >
                <div style={{
                  width:54,
                  height:54,
                  borderRadius:"50%",
                  background:`linear-gradient(135deg, ${accent}22 0%, ${accent}11 100%)`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  margin:"0 auto 12px",
                  fontSize:24,
                  border:`2px solid ${accent}33`,
                }}>
                  {cat.icon || "💊"}
                </div>
                <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark,marginBottom:4}}>{cat.label}</div>
                <div style={{fontSize:11,color:ds.color.textMuted}}>Browse →</div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// v16.0: Trending products section (horizontal scroll on mobile)
function TrendingProductsV16({setPage, addToCart}){
  const { products: PRODUCTS } = useProducts();
  const trending = PRODUCTS.filter(p =>
    p.featured && p.cta === "buy" && !p.requiresPrescription &&
    !CATEGORIES.find(c=>c.id===p.category)?.institutional
  ).slice(0,8);
  const fallback = trending.length >= 4 ? trending : PRODUCTS.filter(p => p.cta === "buy").slice(0,8);
  const display = fallback.length >= 4 ? fallback : trending;

  return (
    <section style={{background:ds.color.white,padding:"64px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32,flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:ds.color.red,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>🔥 Trending</div>
            <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400,marginBottom:6}}>Most Popular Products</h2>
            <p style={{fontSize:14,color:ds.color.textMuted,maxWidth:520}}>Top-selling healthcare essentials, ready to ship.</p>
          </div>
          <button onClick={()=>setPage("products")} style={{background:"none",border:"none",color:ds.color.red,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:ds.font.body,padding:"6px 0"}}>
            See All Products →
          </button>
        </div>
        
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
          {display.slice(0,4).map(p=><ProductCard key={p.id} product={p} addToCart={addToCart} setPage={setPage}/>)}
        </div>
      </div>
    </section>
  );
}

// v16.0: Promo deal cards (color-blocked feature products)
function PromoCardsV16({setPage}){
  const { products: PRODUCTS } = useProducts();
  const promos = PRODUCTS.filter(p => p.featured && p.cta === "buy" && !p.requiresPrescription).slice(0,3);
  
  if (promos.length < 2) return null;
  
  const styles = [
    { bg:`linear-gradient(135deg, ${ds.color.redLight} 0%, ${ds.color.canvasWarm} 100%)`, accent:ds.color.red, badge:"BEST SELLER" },
    { bg:`linear-gradient(135deg, ${ds.color.goldLight} 0%, ${ds.color.canvasGold} 100%)`, accent:ds.color.gold, badge:"NEW" },
    { bg:`linear-gradient(135deg, #FCE7F3 0%, ${ds.color.canvas} 100%)`, accent:"#EC4899", badge:"POPULAR" },
  ];
  
  return (
    <section style={{background:ds.color.canvas,padding:"40px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
          {promos.map((p,i)=>{
            const s = styles[i % styles.length];
            return (
              <button key={p.id} onClick={()=>setPage("products")} style={{
                background:s.bg,
                border:`1px solid ${s.accent}33`,
                borderRadius:ds.radius.xl,
                padding:"24px 24px",
                cursor:"pointer",
                fontFamily:ds.font.body,
                textAlign:"left",
                position:"relative",
                overflow:"hidden",
                transition:"transform 0.15s, box-shadow 0.15s",
                boxShadow:ds.shadow.xs,
                minHeight:160,
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=ds.shadow.md;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=ds.shadow.xs;}}
              >
                <div style={{position:"absolute",top:14,right:14,fontSize:9.5,fontWeight:700,color:s.accent,letterSpacing:"0.08em",background:"#fff",padding:"3px 9px",borderRadius:ds.radius.pill,border:`1px solid ${s.accent}44`}}>{s.badge}</div>
                <div style={{fontSize:48,marginBottom:8,opacity:0.7}}>💊</div>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:4,lineHeight:1.2,maxWidth:200}}>{p.name}</div>
                {p.price && <div style={{fontSize:14,color:s.accent,fontWeight:700,marginBottom:10}}>{formatPHP(p.price)}</div>}
                <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,color:s.accent}}>
                  Shop Now →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// v16.0: Why DMEAST (4 USPs)
function WhyDMEASTV16(){
  const reasons = [
    { icon:"🏥", title:"Authorized Distributor", desc:"All products sourced from FDA-licensed and verified suppliers across the Philippines." },
    { icon:"📋", title:"BIR-Compliant Documentation", desc:"Proper Sales Invoices and Official Receipts for every transaction. Tax-ready paperwork." },
    { icon:"🚚", title:"Nationwide Delivery", desc:"From Metro Manila to Mindanao — fast, reliable shipping with tracking." },
    { icon:"💼", title:"Bulk Pricing for Institutions", desc:"Special rates for hospitals, LGUs, clinics, and corporate buyers. Request a quote." },
  ];
  return (
    <section style={{background:ds.color.white,padding:"72px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.red,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Why DMEAST</div>
          <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400}}>Healthcare you can trust.</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:20}}>
          {reasons.map((r,i)=>(
            <div key={i} style={{
              background:ds.color.white,
              border:`1px solid ${ds.color.border}`,
              borderRadius:ds.radius.lg,
              padding:"28px 22px",
              textAlign:"left",
              transition:"transform 0.15s, box-shadow 0.15s, border-color 0.15s",
              borderTop:`3px solid ${i%2===0?ds.color.red:ds.color.goldBright}`,
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=ds.shadow.md;}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}
            >
              <div style={{
                width:52,height:52,borderRadius:ds.radius.md,
                background:`linear-gradient(135deg, ${i%2===0?ds.color.redLight:ds.color.goldLight} 0%, ${i%2===0?ds.color.canvasWarm:ds.color.canvasGold} 100%)`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:18,
                border:`1px solid ${i%2===0?ds.color.redBorder:ds.color.goldBorder}`,
              }}>{r.icon}</div>
              <div style={{fontSize:16,fontWeight:700,color:ds.color.textDark,marginBottom:8}}>{r.title}</div>
              <div style={{fontSize:13.5,color:ds.color.textMuted,lineHeight:1.65}}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// v16.0: Institutional CTA banner
function InstitutionalCTABannerV16({setPage}){
  return (
    <section style={{background:ds.color.canvas,padding:"56px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{
          background:`linear-gradient(135deg, ${ds.color.textDark} 0%, #2a2018 100%)`,
          borderRadius:ds.radius.xl,
          padding:"48px 40px",
          position:"relative",
          overflow:"hidden",
        }}>
          {/* Decorative golden circle */}
          <div style={{
            position:"absolute",top:-80,right:-80,width:280,height:280,borderRadius:"50%",
            background:`radial-gradient(circle, ${ds.color.gold}33 0%, transparent 70%)`,
            pointerEvents:"none",
          }}/>
          <div style={{
            position:"absolute",bottom:-60,left:-60,width:200,height:200,borderRadius:"50%",
            border:`2px solid ${ds.color.gold}33`,
            pointerEvents:"none",
          }}/>
          
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:32,alignItems:"center",position:"relative",zIndex:1}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.goldBright,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:14}}>For Institutions</div>
              <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,2.6vw,2rem)",color:"#fff",fontWeight:400,marginBottom:14,lineHeight:1.2}}>
                Buying for a hospital, LGU, or clinic?
              </h2>
              <p style={{fontSize:14.5,color:"rgba(255,255,255,0.75)",lineHeight:1.7,marginBottom:0,maxWidth:560}}>
                Get bulk pricing, dedicated account support, and BIR-compliant documentation 
                for institutional purchases. Equipment, supplies, and pharmaceuticals — sourced and delivered.
              </p>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{display:"inline-flex",flexDirection:"column",gap:10,alignItems:"stretch"}}>
                <Btn variant="gold" size="lg" onClick={()=>setPage("quote")}>Request Bulk Quote</Btn>
                <Btn variant="outline" size="md" onClick={()=>setPage("institutional")}>Browse Institutional Products</Btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// v16.0: Testimonials (with disclaimer note as you requested)
function TestimonialsV16(){
  // Sample testimonials with disclaimer — replace with real ones when available
  const testimonials = [
    { 
      name:"Dr. Maria Santos", 
      role:"Hospital Pharmacy Director, QC", 
      quote:"DMEAST consistently delivers on time with proper documentation. Their BIR-compliant invoicing makes audit season easy.",
      rating: 5,
      avatar: "👩‍⚕️"
    },
    { 
      name:"Engr. Robert Cruz", 
      role:"LGU Procurement Officer", 
      quote:"Reliable supplier for our health center supplies. Bulk pricing helps stretch our budget for the community.",
      rating: 5,
      avatar: "👨‍💼"
    },
    { 
      name:"Nurse Jenny Reyes", 
      role:"Clinic Manager, Cavite", 
      quote:"Fast nationwide delivery. The team is responsive on Messenger and answers questions about products knowledgeably.",
      rating: 5,
      avatar: "👩‍⚕️"
    },
    { 
      name:"Dr. Paolo Tan", 
      role:"Medical Director", 
      quote:"From pharmaceuticals to lab equipment — DMEAST is our go-to for institutional needs. Quality is consistent.",
      rating: 5,
      avatar: "👨‍⚕️"
    },
  ];
  
  return (
    <section style={{background:ds.color.white,padding:"72px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.gold,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>What Our Partners Say</div>
          <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400,marginBottom:8}}>Trusted by healthcare professionals.</h2>
          <p style={{fontSize:13,color:ds.color.textLight,fontStyle:"italic"}}>Sample testimonials shown · Real customer reviews coming soon</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18}}>
          {testimonials.map((t,i)=>(
            <div key={i} style={{
              background:ds.color.canvas,
              border:`1px solid ${ds.color.border}`,
              borderRadius:ds.radius.lg,
              padding:"24px 22px",
              position:"relative",
            }}>
              <div style={{display:"flex",gap:2,marginBottom:12}}>
                {Array.from({length:t.rating}).map((_,j)=><span key={j} style={{color:ds.color.gold,fontSize:14}}>★</span>)}
              </div>
              <p style={{fontSize:13.5,color:ds.color.textBody,lineHeight:1.65,marginBottom:18,fontStyle:"italic"}}>"{t.quote}"</p>
              <div style={{display:"flex",alignItems:"center",gap:10,paddingTop:14,borderTop:`1px solid ${ds.color.borderLight}`}}>
                <div style={{
                  width:40,height:40,borderRadius:"50%",
                  background:`linear-gradient(135deg, ${ds.color.redLight} 0%, ${ds.color.goldLight} 100%)`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
                  border:`1px solid ${ds.color.border}`,
                }}>{t.avatar}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark}}>{t.name}</div>
                  <div style={{fontSize:11,color:ds.color.textMuted}}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// v16.0: FAQ accordion (great for SEO and customer trust)
function FAQAccordionV16(){
  const faqs = [
    { q:"How long does delivery take?", a:"Metro Manila orders ship within 1-2 business days. Provincial orders typically arrive within 3-7 business days, depending on location. Bulk institutional orders may take longer based on item availability." },
    { q:"Do you accept LGU Purchase Orders (POs)?", a:"Yes! We process orders for LGUs, hospitals, government health centers, and other institutional buyers. Contact us with your PO requirements and we'll prepare a formal quotation." },
    { q:"Are your products FDA-registered?", a:"Yes. All pharmaceutical products are sourced from FDA-licensed distributors and manufacturers. Medical equipment meets BFAD/FDA standards. Documentation available upon request." },
    { q:"Do you provide official BIR receipts?", a:"Absolutely. DMEAST is a BIR-registered VAT entity (TIN: 417-877-476-00000). We issue proper Sales Invoices and Official Receipts for all transactions, tax-ready for your records." },
    { q:"What payment methods do you accept?", a:"GCash, Maya, bank transfer (BDO, BPI, Metrobank), and credit terms for verified institutional clients (Net 15/30/60). We're working on integrating online card payments." },
    { q:"Can I return or exchange products?", a:"Returns are accepted for damaged or incorrect items within 7 days of delivery. Pharmaceutical products in original sealed packaging. Contact us within 24 hours of receipt to start a return." },
  ];
  
  const [openIdx, setOpenIdx] = useState(0);
  
  return (
    <section style={{background:ds.color.canvas,padding:"72px 28px"}}>
      <div style={{maxWidth:880,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.red,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Common Questions</div>
          <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400}}>Frequently Asked Questions</h2>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {faqs.map((f,i)=>(
            <div key={i} style={{
              background:"#fff",
              border:`1px solid ${openIdx===i?ds.color.red:ds.color.border}`,
              borderRadius:ds.radius.lg,
              overflow:"hidden",
              transition:"border-color 0.15s",
            }}>
              <button onClick={()=>setOpenIdx(openIdx===i?-1:i)} style={{
                width:"100%",
                padding:"16px 20px",
                background:"none",
                border:"none",
                cursor:"pointer",
                fontFamily:ds.font.body,
                textAlign:"left",
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:16,
                fontSize:14.5,
                fontWeight:600,
                color:ds.color.textDark,
              }}>
                <span>{f.q}</span>
                <span style={{
                  fontSize:18,
                  color:openIdx===i?ds.color.red:ds.color.textMuted,
                  transform:openIdx===i?"rotate(45deg)":"rotate(0deg)",
                  transition:"transform 0.2s, color 0.15s",
                  flexShrink:0,
                  fontWeight:300,
                }}>+</span>
              </button>
              {openIdx===i && (
                <div style={{padding:"0 20px 18px",fontSize:13.5,color:ds.color.textMuted,lineHeight:1.7}}>
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:32,fontSize:13,color:ds.color.textMuted}}>
          Have a different question? <a href="mailto:info@dmeastph.com" style={{color:ds.color.red,fontWeight:700,textDecoration:"none"}}>Email us at info@dmeastph.com</a>
        </div>
      </div>
    </section>
  );
}


// ─── LEGACY (v15) HERO — kept for fallback, no longer rendered ──────────────
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

function HomePage({setPage,setActiveCategory,addToCart,setActivePost}){
  return(
    <div style={{paddingTop:67}}>
      <TopAnnouncementBar/>
      <HeroSectionV16 setPage={setPage}/>
      <CategoryGridV16 setPage={setPage} setActiveCategory={setActiveCategory}/>
      <TrendingProductsV16 setPage={setPage} addToCart={addToCart}/>
      <PromoCardsV16 setPage={setPage}/>
      <WhyDMEASTV16/>
      <InstitutionalCTABannerV16 setPage={setPage}/>
      <TestimonialsV16/>
      <FAQAccordionV16/>
      <LatestArticlesSection setPage={setPage} setActivePost={setActivePost}/>
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
// v16.1: Improved ProductsPage with pill nav, sort dropdown, better UX
function ProductsPage({setPage,addToCart,setActiveCategory,activeCategory,wishlist,toggleWishlist}){
  const { products: PRODUCTS } = useProducts();
  const [search,setSearch]=useState("");
  const [cat,setCat]=useState(activeCategory||null);
  const [showAll,setShowAll]=useState(false);
  const [sortBy,setSortBy]=useState("default"); // default | price-asc | price-desc | name
  useEffect(()=>{if(activeCategory)setCat(activeCategory);},[activeCategory]);

  const shopCats = CATEGORIES.filter(c=>!c.institutional);
  const institutionalCats = CATEGORIES.filter(c=>c.institutional);
  const isInstitutionalCat = cat && CATEGORIES.find(c=>c.id===cat)?.institutional;

  let filtered=PRODUCTS.filter(p=>{
    const mc=!cat||p.category===cat;
    const q=search.toLowerCase();
    const ms=!q||p.name.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q)||p.tag.toLowerCase().includes(q);
    const notInstit = showAll||cat||q ? true : !CATEGORIES.find(c=>c.id===p.category)?.institutional;
    return mc&&ms&&notInstit;
  });

  // Sort
  if(sortBy==="price-asc")  filtered = [...filtered].sort((a,b)=>(a.price||0)-(b.price||0));
  if(sortBy==="price-desc") filtered = [...filtered].sort((a,b)=>(b.price||0)-(a.price||0));
  if(sortBy==="name")       filtered = [...filtered].sort((a,b)=>a.name.localeCompare(b.name));

  const shopProductCount = PRODUCTS.filter(p=>!CATEGORIES.find(c=>c.id===p.category)?.institutional).length;
  const clearFilters = ()=>{setSearch("");setCat(null);setActiveCategory(null);setSortBy("default");setShowAll(false);};
  const hasActiveFilters = !!cat || !!search || sortBy!=="default";

  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Online Shop" title="Healthcare Products & Medical Supplies" subtitle={`${shopProductCount}+ products available for direct purchase with nationwide delivery.`}/>
      
      <div style={{maxWidth:1280,margin:"0 auto",padding:"32px 28px"}}>
        
        {/* Search bar - prominent at top */}
        <div style={{
          background:"#fff",
          border:`1px solid ${ds.color.border}`,
          borderRadius:ds.radius.lg,
          padding:"6px 6px 6px 16px",
          display:"flex",
          alignItems:"center",
          gap:10,
          boxShadow:ds.shadow.xs,
          marginBottom:20,
        }}>
          <span style={{fontSize:18,color:ds.color.textMuted}}>🔍</span>
          <input 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
            placeholder="Search by product name, description, or category…"
            style={{
              flex:1,
              border:"none",
              fontSize:14,
              outline:"none",
              fontFamily:ds.font.body,
              color:ds.color.textDark,
              background:"transparent",
              padding:"8px 0",
            }}
          />
          {search && (
            <button onClick={()=>setSearch("")} style={{background:"none",border:"none",fontSize:18,color:ds.color.textMuted,cursor:"pointer",padding:"0 8px"}}>✕</button>
          )}
        </div>

        {/* Category pill nav - horizontal scroll on mobile */}
        <div style={{
          display:"flex",
          gap:8,
          marginBottom:18,
          flexWrap:"nowrap",
          overflowX:"auto",
          paddingBottom:6,
          WebkitOverflowScrolling:"touch",
        }} className="dm-cat-pills">
          <button onClick={()=>{setCat(null);setActiveCategory(null);}} style={{
            padding:"8px 16px",
            borderRadius:ds.radius.pill,
            border:`1.5px solid ${!cat?ds.color.red:ds.color.border}`,
            background:!cat?ds.color.red:"#fff",
            color:!cat?"#fff":ds.color.textBody,
            cursor:"pointer",
            fontSize:13,
            fontWeight:600,
            fontFamily:ds.font.body,
            whiteSpace:"nowrap",
            flexShrink:0,
            transition:"all 0.15s",
          }}>All Products</button>
          {shopCats.map(c=>(
            <button key={c.id} onClick={()=>{setCat(c.id);setActiveCategory(c.id);}} style={{
              padding:"8px 14px",
              borderRadius:ds.radius.pill,
              border:`1.5px solid ${cat===c.id?c.accent:ds.color.border}`,
              background:cat===c.id?c.accent:"#fff",
              color:cat===c.id?"#fff":ds.color.textBody,
              cursor:"pointer",
              fontSize:13,
              fontWeight:600,
              fontFamily:ds.font.body,
              whiteSpace:"nowrap",
              flexShrink:0,
              display:"flex",
              alignItems:"center",
              gap:6,
              transition:"all 0.15s",
            }}>
              <span style={{fontSize:14}}>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
          {showAll && institutionalCats.map(c=>(
            <button key={c.id} onClick={()=>{setCat(c.id);setActiveCategory(c.id);}} style={{
              padding:"8px 14px",
              borderRadius:ds.radius.pill,
              border:`1.5px solid ${cat===c.id?ds.color.gold:ds.color.goldBorder}`,
              background:cat===c.id?ds.color.gold:ds.color.goldLight,
              color:cat===c.id?"#fff":ds.color.gold,
              cursor:"pointer",
              fontSize:13,
              fontWeight:600,
              fontFamily:ds.font.body,
              whiteSpace:"nowrap",
              flexShrink:0,
              display:"flex",
              alignItems:"center",
              gap:6,
            }}>
              <span style={{fontSize:14}}>{c.icon}</span>
              <span>{c.label}</span>
              <span style={{fontSize:9,padding:"2px 6px",background:cat===c.id?"rgba(255,255,255,0.25)":ds.color.gold+"33",borderRadius:ds.radius.pill,fontWeight:700,letterSpacing:"0.04em"}}>BIZ</span>
            </button>
          ))}
        </div>

        {/* Institutional category banner */}
        {isInstitutionalCat && (
          <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.lg,padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
            <div style={{fontSize:13.5,color:ds.color.gold}}>
              <strong>ℹ️ Institutional Category:</strong> Items are available through formal quotation. <button onClick={()=>setPage("institutional")} style={{background:"none",border:"none",color:ds.color.gold,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body,fontSize:13.5,textDecoration:"underline"}}>Learn more →</button>
            </div>
            <Btn variant="gold" size="sm" onClick={()=>setPage("quote")}>Request a Quote</Btn>
          </div>
        )}

        {/* Result count + sort row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:13,color:ds.color.textMuted}}>
            <strong style={{color:ds.color.textDark}}>{filtered.length}</strong> product{filtered.length!==1?"s":""} 
            {cat && <> in <strong style={{color:ds.color.textDark}}>{CATEGORIES.find(c=>c.id===cat)?.label}</strong></>}
            {search && <> matching "<strong style={{color:ds.color.textDark}}>{search}</strong>"</>}
            {hasActiveFilters && (
              <button onClick={clearFilters} style={{marginLeft:10,background:"none",border:"none",color:ds.color.red,fontWeight:600,cursor:"pointer",fontSize:12,fontFamily:ds.font.body,textDecoration:"underline"}}>Clear filters</button>
            )}
          </div>
          
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:12.5,color:ds.color.textMuted,fontWeight:500}}>Sort:</span>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{
              padding:"7px 12px",
              border:`1.5px solid ${ds.color.border}`,
              borderRadius:ds.radius.sm,
              fontSize:13,
              outline:"none",
              fontFamily:ds.font.body,
              background:"#fff",
              cursor:"pointer",
              color:ds.color.textBody,
            }}>
              <option value="default">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Show institutional toggle */}
        {!showAll&&!cat&&!search&&(
          <div style={{textAlign:"center",marginBottom:20}}>
            <button onClick={()=>setShowAll(true)} style={{background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.pill,padding:"6px 16px",cursor:"pointer",fontSize:12,color:ds.color.textBody,fontFamily:ds.font.body,fontWeight:600}}>+ Show institutional categories</button>
          </div>
        )}

        {/* Product grid */}
        <div className="dm-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16}}>
          {filtered.map(p=><ProductCard key={p.id} product={p} addToCart={addToCart} setPage={setPage} wishlist={wishlist} toggleWishlist={toggleWishlist}/>)}
        </div>

        {/* Empty state */}
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"60px 28px",background:ds.color.canvas,borderRadius:ds.radius.lg,border:`1px solid ${ds.color.border}`}}>
            <div style={{fontSize:48,marginBottom:14,opacity:0.6}}>🔍</div>
            <div style={{fontSize:16,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>No products found</div>
            <div style={{fontSize:13.5,color:ds.color.textMuted,marginBottom:20,maxWidth:380,margin:"0 auto 20px"}}>
              {search ? `We couldn't find anything matching "${search}". Try different keywords or browse by category.` : "Try selecting a different category or clearing your filters."}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <Btn variant="primary" size="sm" onClick={clearFilters}>Clear Filters</Btn>
              <Btn variant="outline" size="sm" onClick={()=>setPage("quote")}>Request a Quote Instead</Btn>
            </div>
          </div>
        )}

        {/* Bottom institutional CTA */}
        {!isInstitutionalCat&&filtered.length>0&&(
          <div style={{marginTop:48,padding:"28px 32px",background:`linear-gradient(135deg, ${ds.color.canvasWarm} 0%, ${ds.color.canvasGold} 100%)`,borderRadius:ds.radius.xl,border:`1px solid ${ds.color.goldBorder}`,textAlign:"center"}}>
            <div style={{fontSize:15,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>Need hospital equipment, imaging systems, or specialized devices?</div>
            <div style={{fontSize:13.5,color:ds.color.textMuted,marginBottom:16}}>Institutional and bulk orders are handled separately with formal BIR-compliant quotation.</div>
            <Btn variant="gold" size="md" onClick={()=>setPage("quote")}>Request Bulk Quote →</Btn>
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

// ─── v16.11: COUNTRY LIST FOR INTERNATIONAL DROPDOWN ────────────────────────
// ISO 3166-1 alpha-2 codes with flag emojis, sorted alphabetically by common name
// Common ports/major shipping destinations are flagged with a star prefix for display
const COUNTRIES = [
  {c:"AF",n:"Afghanistan",f:"🇦🇫"},{c:"AL",n:"Albania",f:"🇦🇱"},{c:"DZ",n:"Algeria",f:"🇩🇿"},{c:"AD",n:"Andorra",f:"🇦🇩"},
  {c:"AO",n:"Angola",f:"🇦🇴"},{c:"AG",n:"Antigua and Barbuda",f:"🇦🇬"},{c:"AR",n:"Argentina",f:"🇦🇷"},{c:"AM",n:"Armenia",f:"🇦🇲"},
  {c:"AU",n:"Australia",f:"🇦🇺"},{c:"AT",n:"Austria",f:"🇦🇹"},{c:"AZ",n:"Azerbaijan",f:"🇦🇿"},{c:"BS",n:"Bahamas",f:"🇧🇸"},
  {c:"BH",n:"Bahrain",f:"🇧🇭"},{c:"BD",n:"Bangladesh",f:"🇧🇩"},{c:"BB",n:"Barbados",f:"🇧🇧"},{c:"BY",n:"Belarus",f:"🇧🇾"},
  {c:"BE",n:"Belgium",f:"🇧🇪"},{c:"BZ",n:"Belize",f:"🇧🇿"},{c:"BJ",n:"Benin",f:"🇧🇯"},{c:"BT",n:"Bhutan",f:"🇧🇹"},
  {c:"BO",n:"Bolivia",f:"🇧🇴"},{c:"BA",n:"Bosnia and Herzegovina",f:"🇧🇦"},{c:"BW",n:"Botswana",f:"🇧🇼"},{c:"BR",n:"Brazil",f:"🇧🇷"},
  {c:"BN",n:"Brunei",f:"🇧🇳"},{c:"BG",n:"Bulgaria",f:"🇧🇬"},{c:"BF",n:"Burkina Faso",f:"🇧🇫"},{c:"BI",n:"Burundi",f:"🇧🇮"},
  {c:"KH",n:"Cambodia",f:"🇰🇭"},{c:"CM",n:"Cameroon",f:"🇨🇲"},{c:"CA",n:"Canada",f:"🇨🇦"},{c:"CV",n:"Cape Verde",f:"🇨🇻"},
  {c:"CF",n:"Central African Republic",f:"🇨🇫"},{c:"TD",n:"Chad",f:"🇹🇩"},{c:"CL",n:"Chile",f:"🇨🇱"},{c:"CN",n:"China",f:"🇨🇳"},
  {c:"CO",n:"Colombia",f:"🇨🇴"},{c:"KM",n:"Comoros",f:"🇰🇲"},{c:"CG",n:"Congo (Republic)",f:"🇨🇬"},{c:"CD",n:"Congo (DR)",f:"🇨🇩"},
  {c:"CR",n:"Costa Rica",f:"🇨🇷"},{c:"CI",n:"Côte d'Ivoire",f:"🇨🇮"},{c:"HR",n:"Croatia",f:"🇭🇷"},{c:"CU",n:"Cuba",f:"🇨🇺"},
  {c:"CY",n:"Cyprus",f:"🇨🇾"},{c:"CZ",n:"Czechia",f:"🇨🇿"},{c:"DK",n:"Denmark",f:"🇩🇰"},{c:"DJ",n:"Djibouti",f:"🇩🇯"},
  {c:"DM",n:"Dominica",f:"🇩🇲"},{c:"DO",n:"Dominican Republic",f:"🇩🇴"},{c:"EC",n:"Ecuador",f:"🇪🇨"},{c:"EG",n:"Egypt",f:"🇪🇬"},
  {c:"SV",n:"El Salvador",f:"🇸🇻"},{c:"GQ",n:"Equatorial Guinea",f:"🇬🇶"},{c:"ER",n:"Eritrea",f:"🇪🇷"},{c:"EE",n:"Estonia",f:"🇪🇪"},
  {c:"SZ",n:"Eswatini",f:"🇸🇿"},{c:"ET",n:"Ethiopia",f:"🇪🇹"},{c:"FJ",n:"Fiji",f:"🇫🇯"},{c:"FI",n:"Finland",f:"🇫🇮"},
  {c:"FR",n:"France",f:"🇫🇷"},{c:"GA",n:"Gabon",f:"🇬🇦"},{c:"GM",n:"Gambia",f:"🇬🇲"},{c:"GE",n:"Georgia",f:"🇬🇪"},
  {c:"DE",n:"Germany",f:"🇩🇪"},{c:"GH",n:"Ghana",f:"🇬🇭"},{c:"GR",n:"Greece",f:"🇬🇷"},{c:"GD",n:"Grenada",f:"🇬🇩"},
  {c:"GT",n:"Guatemala",f:"🇬🇹"},{c:"GN",n:"Guinea",f:"🇬🇳"},{c:"GW",n:"Guinea-Bissau",f:"🇬🇼"},{c:"GY",n:"Guyana",f:"🇬🇾"},
  {c:"HT",n:"Haiti",f:"🇭🇹"},{c:"HN",n:"Honduras",f:"🇭🇳"},{c:"HK",n:"Hong Kong",f:"🇭🇰"},{c:"HU",n:"Hungary",f:"🇭🇺"},
  {c:"IS",n:"Iceland",f:"🇮🇸"},{c:"IN",n:"India",f:"🇮🇳"},{c:"ID",n:"Indonesia",f:"🇮🇩"},{c:"IR",n:"Iran",f:"🇮🇷"},
  {c:"IQ",n:"Iraq",f:"🇮🇶"},{c:"IE",n:"Ireland",f:"🇮🇪"},{c:"IL",n:"Israel",f:"🇮🇱"},{c:"IT",n:"Italy",f:"🇮🇹"},
  {c:"JM",n:"Jamaica",f:"🇯🇲"},{c:"JP",n:"Japan",f:"🇯🇵"},{c:"JO",n:"Jordan",f:"🇯🇴"},{c:"KZ",n:"Kazakhstan",f:"🇰🇿"},
  {c:"KE",n:"Kenya",f:"🇰🇪"},{c:"KI",n:"Kiribati",f:"🇰🇮"},{c:"KW",n:"Kuwait",f:"🇰🇼"},{c:"KG",n:"Kyrgyzstan",f:"🇰🇬"},
  {c:"LA",n:"Laos",f:"🇱🇦"},{c:"LV",n:"Latvia",f:"🇱🇻"},{c:"LB",n:"Lebanon",f:"🇱🇧"},{c:"LS",n:"Lesotho",f:"🇱🇸"},
  {c:"LR",n:"Liberia",f:"🇱🇷"},{c:"LY",n:"Libya",f:"🇱🇾"},{c:"LI",n:"Liechtenstein",f:"🇱🇮"},{c:"LT",n:"Lithuania",f:"🇱🇹"},
  {c:"LU",n:"Luxembourg",f:"🇱🇺"},{c:"MO",n:"Macao",f:"🇲🇴"},{c:"MG",n:"Madagascar",f:"🇲🇬"},{c:"MW",n:"Malawi",f:"🇲🇼"},
  {c:"MY",n:"Malaysia",f:"🇲🇾"},{c:"MV",n:"Maldives",f:"🇲🇻"},{c:"ML",n:"Mali",f:"🇲🇱"},{c:"MT",n:"Malta",f:"🇲🇹"},
  {c:"MH",n:"Marshall Islands",f:"🇲🇭"},{c:"MR",n:"Mauritania",f:"🇲🇷"},{c:"MU",n:"Mauritius",f:"🇲🇺"},{c:"MX",n:"Mexico",f:"🇲🇽"},
  {c:"FM",n:"Micronesia",f:"🇫🇲"},{c:"MD",n:"Moldova",f:"🇲🇩"},{c:"MC",n:"Monaco",f:"🇲🇨"},{c:"MN",n:"Mongolia",f:"🇲🇳"},
  {c:"ME",n:"Montenegro",f:"🇲🇪"},{c:"MA",n:"Morocco",f:"🇲🇦"},{c:"MZ",n:"Mozambique",f:"🇲🇿"},{c:"MM",n:"Myanmar",f:"🇲🇲"},
  {c:"NA",n:"Namibia",f:"🇳🇦"},{c:"NR",n:"Nauru",f:"🇳🇷"},{c:"NP",n:"Nepal",f:"🇳🇵"},{c:"NL",n:"Netherlands",f:"🇳🇱"},
  {c:"NZ",n:"New Zealand",f:"🇳🇿"},{c:"NI",n:"Nicaragua",f:"🇳🇮"},{c:"NE",n:"Niger",f:"🇳🇪"},{c:"NG",n:"Nigeria",f:"🇳🇬"},
  {c:"KP",n:"North Korea",f:"🇰🇵"},{c:"MK",n:"North Macedonia",f:"🇲🇰"},{c:"NO",n:"Norway",f:"🇳🇴"},{c:"OM",n:"Oman",f:"🇴🇲"},
  {c:"PK",n:"Pakistan",f:"🇵🇰"},{c:"PW",n:"Palau",f:"🇵🇼"},{c:"PS",n:"Palestine",f:"🇵🇸"},{c:"PA",n:"Panama",f:"🇵🇦"},
  {c:"PG",n:"Papua New Guinea",f:"🇵🇬"},{c:"PY",n:"Paraguay",f:"🇵🇾"},{c:"PE",n:"Peru",f:"🇵🇪"},{c:"PH",n:"Philippines",f:"🇵🇭"},
  {c:"PL",n:"Poland",f:"🇵🇱"},{c:"PT",n:"Portugal",f:"🇵🇹"},{c:"QA",n:"Qatar",f:"🇶🇦"},{c:"RO",n:"Romania",f:"🇷🇴"},
  {c:"RU",n:"Russia",f:"🇷🇺"},{c:"RW",n:"Rwanda",f:"🇷🇼"},{c:"KN",n:"Saint Kitts and Nevis",f:"🇰🇳"},{c:"LC",n:"Saint Lucia",f:"🇱🇨"},
  {c:"VC",n:"Saint Vincent and the Grenadines",f:"🇻🇨"},{c:"WS",n:"Samoa",f:"🇼🇸"},{c:"SM",n:"San Marino",f:"🇸🇲"},{c:"ST",n:"São Tomé and Príncipe",f:"🇸🇹"},
  {c:"SA",n:"Saudi Arabia",f:"🇸🇦"},{c:"SN",n:"Senegal",f:"🇸🇳"},{c:"RS",n:"Serbia",f:"🇷🇸"},{c:"SC",n:"Seychelles",f:"🇸🇨"},
  {c:"SL",n:"Sierra Leone",f:"🇸🇱"},{c:"SG",n:"Singapore",f:"🇸🇬"},{c:"SK",n:"Slovakia",f:"🇸🇰"},{c:"SI",n:"Slovenia",f:"🇸🇮"},
  {c:"SB",n:"Solomon Islands",f:"🇸🇧"},{c:"SO",n:"Somalia",f:"🇸🇴"},{c:"ZA",n:"South Africa",f:"🇿🇦"},{c:"KR",n:"South Korea",f:"🇰🇷"},
  {c:"SS",n:"South Sudan",f:"🇸🇸"},{c:"ES",n:"Spain",f:"🇪🇸"},{c:"LK",n:"Sri Lanka",f:"🇱🇰"},{c:"SD",n:"Sudan",f:"🇸🇩"},
  {c:"SR",n:"Suriname",f:"🇸🇷"},{c:"SE",n:"Sweden",f:"🇸🇪"},{c:"CH",n:"Switzerland",f:"🇨🇭"},{c:"SY",n:"Syria",f:"🇸🇾"},
  {c:"TW",n:"Taiwan",f:"🇹🇼"},{c:"TJ",n:"Tajikistan",f:"🇹🇯"},{c:"TZ",n:"Tanzania",f:"🇹🇿"},{c:"TH",n:"Thailand",f:"🇹🇭"},
  {c:"TL",n:"Timor-Leste",f:"🇹🇱"},{c:"TG",n:"Togo",f:"🇹🇬"},{c:"TO",n:"Tonga",f:"🇹🇴"},{c:"TT",n:"Trinidad and Tobago",f:"🇹🇹"},
  {c:"TN",n:"Tunisia",f:"🇹🇳"},{c:"TR",n:"Türkiye",f:"🇹🇷"},{c:"TM",n:"Turkmenistan",f:"🇹🇲"},{c:"TV",n:"Tuvalu",f:"🇹🇻"},
  {c:"UG",n:"Uganda",f:"🇺🇬"},{c:"UA",n:"Ukraine",f:"🇺🇦"},{c:"AE",n:"United Arab Emirates",f:"🇦🇪"},{c:"GB",n:"United Kingdom",f:"🇬🇧"},
  {c:"US",n:"United States",f:"🇺🇸"},{c:"UY",n:"Uruguay",f:"🇺🇾"},{c:"UZ",n:"Uzbekistan",f:"🇺🇿"},{c:"VU",n:"Vanuatu",f:"🇻🇺"},
  {c:"VA",n:"Vatican City",f:"🇻🇦"},{c:"VE",n:"Venezuela",f:"🇻🇪"},{c:"VN",n:"Vietnam",f:"🇻🇳"},{c:"YE",n:"Yemen",f:"🇾🇪"},
  {c:"ZM",n:"Zambia",f:"🇿🇲"},{c:"ZW",n:"Zimbabwe",f:"🇿🇼"},
];

// Helper: get ZIP placeholder hint based on country code
const ZIP_HINTS = {
  US:"e.g., 94105", CA:"e.g., M5V 3A8", GB:"e.g., SW1A 1AA", AU:"e.g., 2000", 
  DE:"e.g., 10115", FR:"e.g., 75001", JP:"e.g., 100-0001", IN:"e.g., 110001",
  SG:"e.g., 049145", PH:"e.g., 1014", CN:"e.g., 100000", BR:"e.g., 01310-100",
  IT:"e.g., 00100", ES:"e.g., 28001", MX:"e.g., 06000", KR:"e.g., 04524",
  TH:"e.g., 10100", ID:"e.g., 10110", MY:"e.g., 50000", VN:"e.g., 100000",
};
const getZipHint = (countryCode) => ZIP_HINTS[countryCode] || "Optional";

// ─── v16.10: MAYA PAYMENT INTEGRATION ────────────────────────────────────────
// Methods that go through Maya Checkout (instead of manual bank transfer)
const MAYA_METHODS = ["Maya", "GCash", "Visa", "Mastercard", "QR Ph"];
const isMayaMethod = (method) => MAYA_METHODS.includes(method);

// Call backend to create Maya checkout session, return redirect URL
async function createMayaCheckout({ orderId, totalAmount, items, buyer }){
  const res = await fetch("/api/maya-create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      totalAmount,
      items: items.map(i => ({
        name: i.name,
        quantity: i.qty,
        amount: i.price,
        code: i.id,
      })),
      buyerEmail:     buyer.email,
      buyerFirstName: buyer.firstName,
      buyerLastName:  buyer.lastName,
      buyerPhone:     buyer.phone,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.hint || "Failed to create Maya checkout");
  }
  return data;  // { success, checkoutId, redirectUrl, requestReferenceNumber }
}

// Manually verify a Maya payment via our backend (fallback if webhook delayed)
async function verifyMayaPayment(checkoutId){
  const res = await fetch(`/api/maya-verify?checkoutId=${encodeURIComponent(checkoutId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Verification failed");
  return data;
}

// v16.10: Payment return page (shown when customer comes back from Maya)
function PaymentReturnPage({ status, orderId, setPage }){
  const [verifying, setVerifying] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState("");
  
  useEffect(() => {
    if (!orderId) return;
    setVerifying(true);
    (async () => {
      try {
        // Wait briefly for webhook to potentially fire first
        await new Promise(r => setTimeout(r, 1500));
        const snap = await getDoc(doc(db, "orders", orderId));
        if (snap.exists()) {
          setOrderData({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        setError("Couldn't fetch order details: " + e.message);
      }
      setVerifying(false);
    })();
  }, [orderId]);
  
  const isSuccess = status === "success";
  const isFailure = status === "failure";
  const isCancel  = status === "cancel";
  
  const iconBg = isSuccess ? ds.color.success : isFailure ? ds.color.red : ds.color.gold;
  const icon = isSuccess ? "✓" : isFailure ? "✕" : "⊘";
  const title = isSuccess ? "Payment Successful!" : isFailure ? "Payment Failed" : "Payment Cancelled";
  const subtitle = isSuccess 
    ? "Your order has been confirmed and will be processed shortly."
    : isFailure
      ? "We weren't able to process your payment. You can try again or use a different method."
      : "You cancelled the payment. Your order is still pending — you can complete payment anytime.";
  
  return (
    <div style={{paddingTop:67,minHeight:"calc(100vh - 67px)",background:ds.color.canvas}}>
      <div style={{maxWidth:580,margin:"0 auto",padding:"60px 28px"}}>
        <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"48px 36px",boxShadow:ds.shadow.md,textAlign:"center",border:`1px solid ${ds.color.borderLight}`}}>
          <div style={{
            width:80,height:80,borderRadius:"50%",
            background:iconBg,color:"#fff",
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            fontSize:42,fontWeight:700,marginBottom:24,
          }}>{icon}</div>
          
          <h1 style={{fontFamily:ds.font.display,fontSize:28,color:ds.color.textDark,marginBottom:12}}>{title}</h1>
          <p style={{fontSize:15,color:ds.color.textMuted,lineHeight:1.6,marginBottom:28}}>{subtitle}</p>
          
          {orderId && (
            <div style={{background:ds.color.canvas,borderRadius:ds.radius.md,padding:"14px 18px",marginBottom:24,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Reference</div>
              <div style={{fontSize:15,fontWeight:700,color:ds.color.textDark,fontFamily:"ui-monospace,monospace"}}>{orderId}</div>
              {verifying && <div style={{fontSize:12,color:ds.color.textMuted,marginTop:8}}>⏳ Verifying with bank…</div>}
              {orderData && orderData.status === "paid" && <div style={{fontSize:12,color:ds.color.success,marginTop:8,fontWeight:600}}>✓ Payment confirmed</div>}
              {orderData && orderData.status === "pending" && isSuccess && <div style={{fontSize:12,color:ds.color.gold,marginTop:8,fontWeight:600}}>⏳ Awaiting bank confirmation (may take a few minutes)</div>}
            </div>
          )}
          
          {error && <div style={{padding:"12px 16px",background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,color:ds.color.red,fontSize:13,marginBottom:18}}>{error}</div>}
          
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            {isSuccess && (
              <>
                <Btn variant="primary" size="md" onClick={()=>setPage("track")}>Track Order</Btn>
                <Btn variant="outline" size="md" onClick={()=>setPage("home")}>Continue Shopping</Btn>
              </>
            )}
            {isFailure && (
              <>
                <Btn variant="primary" size="md" onClick={()=>setPage("cart")}>Try Again</Btn>
                <Btn variant="outline" size="md" onClick={()=>setPage("home")}>Back to Home</Btn>
              </>
            )}
            {isCancel && (
              <>
                <Btn variant="primary" size="md" onClick={()=>setPage("track")}>View Order Status</Btn>
                <Btn variant="outline" size="md" onClick={()=>setPage("home")}>Back to Home</Btn>
              </>
            )}
          </div>
          
          {isSuccess && (
            <p style={{fontSize:12,color:ds.color.textLight,marginTop:24,lineHeight:1.6}}>
              📧 A confirmation email has been sent to your inbox.<br/>
              You'll be notified once your order ships.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [intlForm,setIntlForm] = useState({name:"",company:"",email:"",phone:"",countryCode:"+1",country:"",countryISO:"",city:"",zip:"",streetAddress:"",shippingMethod:"",currency:"USD",details:""});
  // v16.11: For international — same as account holder or different contact person?
  const [intlForSomeoneElse,setIntlForSomeoneElse] = useState(false);
  // v16.12: Delivery mode — port-to-port (wholesale) or door-to-door (retail)
  const [intlDeliveryMode,setIntlDeliveryMode] = useState("port"); // "port" or "door"
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

  // v16.11: Auto-populate international form from user profile (when same as account holder)
  useEffect(()=>{
    if(!user||intlForSomeoneElse) return;
    if(!profileLoaded) return;  // Wait until profile loaded
    (async()=>{
      try{
        const snap = await getDoc(doc(db,"customers",user.uid));
        if(snap.exists()){
          const d = snap.data();
          setIntlForm(prev=>({
            ...prev,
            name:  d.name  || prev.name,
            email: d.email || user.email || prev.email,
            phone: d.phone || prev.phone,
          }));
        } else {
          setIntlForm(prev=>({...prev, email: user.email||""}));
        }
      }catch(_){}
    })();
  },[user, intlForSomeoneElse, profileLoaded]);
  
  // v16.11: When toggling "for someone else", clear the prefilled fields
  useEffect(()=>{
    if(intlForSomeoneElse){
      setIntlForm(prev=>({...prev, name:"", email:"", phone:""}));
    }
  },[intlForSomeoneElse]);

  const fullPhone = countryCode + details.phoneNum.replace(/^0+/,"");
  const fullRecipientPhone = recipient.phoneCode + recipient.phoneNum.replace(/^0+/,"");
  const total     = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const hasRx     = cart.some(i=>i.requiresPrescription);
  const intlFilled = intlForm.name&&intlForm.email&&intlForm.phone&&intlForm.countryISO && (intlDeliveryMode==="port" || (intlDeliveryMode==="door" && intlForm.streetAddress.trim().length>0));
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
      
      // v16.10: If Maya-supported method, redirect to Maya Checkout instead of regular flow
      if (isMayaMethod(method)) {
        try {
          // Split name into first + last for Maya buyer info
          const nameParts = (details.name || "").trim().split(/\s+/);
          const firstName = nameParts[0] || "Customer";
          const lastName = nameParts.slice(1).join(" ") || "";
          
          // Use Firestore doc ID as orderId reference
          const mayaResult = await createMayaCheckout({
            orderId: orderRef.id,
            totalAmount: total,
            items: cart,
            buyer: {
              email: details.email,
              firstName,
              lastName,
              phone,
            },
          });
          
          // Update order with Maya checkout ID before redirect
          try {
            await updateDoc(doc(db, "orders", orderRef.id), {
              mayaCheckoutId: mayaResult.checkoutId,
              paymentStatus: "redirecting_to_maya",
            });
          } catch(_){}
          
          // Redirect customer to Maya hosted checkout
          window.location.href = mayaResult.redirectUrl;
          return;  // Stop here — customer is leaving the site
        } catch (mayaErr) {
          console.error("Maya checkout failed:", mayaErr);
          setErrMsg("Couldn't connect to " + method + " payment gateway: " + mayaErr.message + ". Please try a different payment method or contact us.");
          setSending(false);
          // Note: order is still created in Firestore with paymentStatus "awaiting"
          // Customer can retry with a different method
          return;
        }
      }
      
      // Non-Maya flow continues here (Bank Transfer, etc.)
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
    if(cart.length===0){ setIntlErr("Cart is empty. Please add products before submitting."); return; }
    setIntlSending(true); setIntlErr("");
    try {
      // v16.11: Build full phone with country code
      const fullIntlPhone = (intlForm.countryCode || "+1") + " " + intlForm.phone.replace(/^0+/, "").trim();
      // v16.11: Build address line with ZIP if provided
      const addressLine = intlForm.zip 
        ? `${intlForm.city||"—"}, ${intlForm.country} ${intlForm.zip}`
        : `${intlForm.city||"—"}, ${intlForm.country}`;
      
      // v16.12: Notify customer (with to_email — this was the bug!)
      // Customer gets a confirmation email with their submitted details
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
        to_email: intlForm.email,
        to_name:  intlForm.name,
        from_name:intlForm.name, 
        company:intlForm.company||"N/A",
        from_email:intlForm.email, 
        phone:fullIntlPhone,
        product:orderSummary, 
        quantity:cart.reduce((s,i)=>s+i.qty,0)+" items",
        budget:`${formatPHP(total)} — INTERNATIONAL ORDER`,
        location:addressLine, 
        timeline:"International Inquiry",
        details:`🌍 INTERNATIONAL ORDER INQUIRY\n\nDelivery Mode: ${intlDeliveryMode==="door"?"Door-to-Door (Retail)":"Port-to-Port (Wholesale)"}\nCountry: ${intlForm.country} (${intlForm.countryISO||"—"})\nCity/Port: ${intlForm.city||"—"}\n${intlDeliveryMode==="door"?`Street Address: ${intlForm.streetAddress||"—"}\n`:""}ZIP/Postal: ${intlForm.zip||"—"}\nShipping: ${intlForm.shippingMethod||"Let DMEAST advise"}\nCurrency: ${intlForm.currency}\n\nItems:\n${orderSummary}\n\nValue: ${formatPHP(total)} (${formatUSD(total)} indicative)\n\nNotes:\n${intlForm.details||"None"}`,
        reply_to:intlForm.email,
      }, EMAILJS_CONFIG.publicKey);
      
      // v16.12: Also send admin notification (so DMEAST team gets the inquiry)
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          to_email: "info@dmeastph.com",
          to_name:  "DMEAST Team",
          from_name:intlForm.name, 
          company:intlForm.company||"N/A",
          from_email:intlForm.email, 
          phone:fullIntlPhone,
          product:orderSummary, 
          quantity:cart.reduce((s,i)=>s+i.qty,0)+" items",
          budget:`${formatPHP(total)} — INTERNATIONAL ORDER`,
          location:addressLine, 
          timeline:"International Inquiry — NEEDS PROFORMA INVOICE",
          details:`🌍 NEW INTERNATIONAL INQUIRY — Please prepare proforma invoice\n\nCustomer: ${intlForm.name} <${intlForm.email}>\nPhone: ${fullIntlPhone}\nCompany: ${intlForm.company||"—"}\n\nDelivery Mode: ${intlDeliveryMode==="door"?"Door-to-Door (Retail)":"Port-to-Port (Wholesale)"}\nCountry: ${intlForm.country} (${intlForm.countryISO||"—"})\nCity/Port: ${intlForm.city||"—"}\n${intlDeliveryMode==="door"?`Street Address: ${intlForm.streetAddress||"—"}\n`:""}ZIP/Postal: ${intlForm.zip||"—"}\nShipping: ${intlForm.shippingMethod||"Let DMEAST advise"}\nCurrency: ${intlForm.currency}\n\nItems:\n${orderSummary}\n\nIndicative Value: ${formatPHP(total)} (${formatUSD(total)})\n\nCustomer Notes:\n${intlForm.details||"None"}`,
          reply_to:intlForm.email,
        }, EMAILJS_CONFIG.publicKey);
      } catch(adminErr) {
        // Admin email failure shouldn't block the inquiry — log but continue
        console.warn("Admin notification failed:", adminErr);
      }
      await addDoc(collection(db,"orders"),{
        name:intlForm.name, email:intlForm.email, phone:fullIntlPhone,
        company: intlForm.company || "",
        address: intlDeliveryMode==="door" && intlForm.streetAddress 
          ? `${intlForm.streetAddress}, ${addressLine}` 
          : addressLine,
        // v16.11/16.12: Granular international fields for reporting / shipping integration
        intlDeliveryMode,  // v16.12: "port" or "door"
        intlStreetAddress: intlForm.streetAddress || "",  // v16.12: only relevant for door mode
        intlCountry: intlForm.country,
        intlCountryISO: intlForm.countryISO,
        intlCity: intlForm.city,
        intlZip: intlForm.zip,
        intlShipping: intlForm.shippingMethod || "advise",
        intlCurrency: intlForm.currency,
        intlNotes: intlForm.details || "",
        paymentMethod:"International Inquiry",
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

  // v16.2: Better empty cart state with trust signals
  if(cart.length===0) return(
    <div style={{paddingTop:67,minHeight:"80vh",background:`linear-gradient(180deg, ${ds.color.canvas} 0%, ${ds.color.canvasWarm} 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",maxWidth:480,padding:"40px 24px"}}>
        <div style={{
          width:120,height:120,borderRadius:"50%",
          background:`radial-gradient(circle, ${ds.color.redLight} 0%, transparent 70%)`,
          margin:"0 auto 24px",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:56,
        }}>🛒</div>
        <div style={{fontFamily:ds.font.display,fontSize:26,color:ds.color.textDark,marginBottom:10}}>Your cart is empty</div>
        <p style={{fontSize:14.5,color:ds.color.textMuted,lineHeight:1.7,marginBottom:28}}>Browse our catalog of pharmaceuticals, medical equipment, and healthcare essentials. We deliver nationwide.</p>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:32}}>
          <Btn variant="primary" size="lg" onClick={()=>setPage("products")}>Browse Products</Btn>
          <Btn variant="outline" size="lg" onClick={()=>setPage("quote")}>Request Quote</Btn>
        </div>
        {/* Trust signals */}
        <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap",fontSize:11.5,color:ds.color.textMuted}}>
          <span>📋 BIR-Registered</span>
          <span style={{opacity:0.4}}>·</span>
          <span>🚚 Nationwide Delivery</span>
          <span style={{opacity:0.4}}>·</span>
          <span>🔒 Secure Checkout</span>
        </div>
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
          <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:24,alignItems:"start"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              
              {/* v16.11: Auto-populate radio toggle (only shown if user is signed in) */}
              {user&&(
                <div style={{marginBottom:24,padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.borderLight}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Contact for this inquiry</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${!intlForSomeoneElse?ds.color.gold:ds.color.border}`,background:!intlForSomeoneElse?"#fff8e6":"#fff",fontSize:13,fontWeight:600,color:!intlForSomeoneElse?"#8B6914":ds.color.textBody}}>
                      <input type="radio" name="intlOrderFor" checked={!intlForSomeoneElse} onChange={()=>setIntlForSomeoneElse(false)} style={{accentColor:ds.color.gold}}/>
                      👤 Same as my account
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${intlForSomeoneElse?ds.color.red:ds.color.border}`,background:intlForSomeoneElse?ds.color.redLight:"#fff",fontSize:13,fontWeight:600,color:intlForSomeoneElse?ds.color.red:ds.color.textBody}}>
                      <input type="radio" name="intlOrderFor" checked={intlForSomeoneElse} onChange={()=>setIntlForSomeoneElse(true)} style={{accentColor:ds.color.red}}/>
                      🏢 Different contact person
                    </label>
                  </div>
                  {!intlForSomeoneElse && (
                    <div style={{fontSize:12,color:ds.color.textMuted,marginTop:10,lineHeight:1.5}}>
                      ✓ Your account details will auto-fill below. Edit any field if needed.
                    </div>
                  )}
                </div>
              )}
              
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Contact Information</div>
              
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px",marginBottom:16}}>
                {[["Full Name *","name","text","Your full name"],["Company / Organization","company","text","Hospital, clinic…"],["Email Address *","email","email","you@email.com"]].map(([l,k,t,ph])=>(
                  <div key={k}><label style={lbl}>{l}</label><input type={t} value={intlForm[k]} onChange={setI(k)} placeholder={ph} style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/></div>
                ))}
                <div>
                  <label style={lbl}>Phone / WhatsApp *</label>
                  <div style={{display:"flex",gap:8}}>
                    <select value={intlForm.countryCode||"+1"} onChange={e=>setIntlForm(p=>({...p,countryCode:e.target.value}))} style={{...inp,width:"auto",minWidth:90,flexShrink:0,padding:"11px 10px",cursor:"pointer"}}>
                      {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                    <input value={intlForm.phone} onChange={setI("phone")} placeholder="Phone number" style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
                  </div>
                </div>
              </div>
              
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12,marginTop:24}}>Delivery Destination</div>
              
              {/* v16.12: Delivery mode toggle — Port-to-Port vs Door-to-Door */}
              <div style={{marginBottom:20,padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.borderLight}`}}>
                <div style={{fontSize:12,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>How will you receive this order?</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <label style={{flex:"1 1 200px",display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"12px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${intlDeliveryMode==="port"?ds.color.gold:ds.color.border}`,background:intlDeliveryMode==="port"?"#fff8e6":"#fff"}}>
                    <input type="radio" name="intlDeliveryMode" checked={intlDeliveryMode==="port"} onChange={()=>setIntlDeliveryMode("port")} style={{accentColor:ds.color.gold,marginTop:3}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:intlDeliveryMode==="port"?"#8B6914":ds.color.textBody,marginBottom:2}}>🚢 Port-to-Port</div>
                      <div style={{fontSize:11.5,color:ds.color.textMuted,lineHeight:1.4}}>Wholesale/bulk. We deliver to your seaport or airport — you handle local clearance.</div>
                    </div>
                  </label>
                  <label style={{flex:"1 1 200px",display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"12px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${intlDeliveryMode==="door"?ds.color.red:ds.color.border}`,background:intlDeliveryMode==="door"?ds.color.redLight:"#fff"}}>
                    <input type="radio" name="intlDeliveryMode" checked={intlDeliveryMode==="door"} onChange={()=>setIntlDeliveryMode("door")} style={{accentColor:ds.color.red,marginTop:3}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:intlDeliveryMode==="door"?ds.color.red:ds.color.textBody,marginBottom:2}}>🚪 Door-to-Door</div>
                      <div style={{fontSize:11.5,color:ds.color.textMuted,lineHeight:1.4}}>Direct to your address. We handle shipping + duties (DDP). Smaller orders, personal use.</div>
                    </div>
                  </label>
                </div>
              </div>
              
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px",marginBottom:16}}>
                {/* v16.11: Country dropdown with flags */}
                <div>
                  <label style={lbl}>Country *</label>
                  <select 
                    value={intlForm.countryISO} 
                    onChange={e=>{
                      const iso=e.target.value;
                      const country=COUNTRIES.find(c=>c.c===iso);
                      setIntlForm(p=>({...p,countryISO:iso,country:country?country.n:""}));
                    }} 
                    style={{...inp,cursor:"pointer"}}
                  >
                    <option value="">Select country…</option>
                    {COUNTRIES.map(c=><option key={c.c} value={c.c}>{c.f} {c.n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>{intlDeliveryMode==="port"?"Port of Entry":"City"} {intlDeliveryMode==="door"?"*":""}</label>
                  <input value={intlForm.city} onChange={setI("city")} placeholder={intlDeliveryMode==="port"?"e.g. Jebel Ali, Singapore Port, JFK…":"e.g. Dubai, Singapore, New York…"} style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
                </div>
                
                {/* v16.12: Conditional street address — only shown for door-to-door */}
                {intlDeliveryMode==="door" && (
                  <div style={{gridColumn:"1 / -1"}}>
                    <label style={lbl}>Street Address *</label>
                    <textarea 
                      value={intlForm.streetAddress} 
                      onChange={setI("streetAddress")} 
                      rows={2}
                      placeholder="Building/House No., Street, District/Suburb"
                      style={{...inp,resize:"vertical",lineHeight:1.5}}
                      onFocus={fo} 
                      onBlur={e=>e.target.style.borderColor=ds.color.border}
                    />
                    <div style={{fontSize:11,color:ds.color.textLight,marginTop:4}}>Full delivery address (we'll calculate door-to-door shipping + duties on the proforma invoice).</div>
                  </div>
                )}
                {/* v16.11: ZIP / postal code field — always optional */}
                <div>
                  <label style={lbl}>ZIP / Postal Code <span style={{fontWeight:400,color:ds.color.textLight}}>(optional)</span></label>
                  <input value={intlForm.zip} onChange={setI("zip")} placeholder={getZipHint(intlForm.countryISO)} style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
                </div>
                <div>
                  <label style={lbl}>Preferred Shipping</label>
                  <select value={intlForm.shippingMethod} onChange={setI("shippingMethod")} style={{...inp,cursor:"pointer"}}>
                    <option value="">Let DMEAST advise</option>
                    <option>Air Cargo (5–10 days)</option>
                    <option>Sea Cargo (15–45 days)</option>
                    <option>FedEx / DHL Express (3–7 days)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Preferred Currency</label>
                  <select value={intlForm.currency} onChange={setI("currency")} style={{...inp,cursor:"pointer"}}>
                    <option value="USD">USD ($)</option>
                    <option value="PHP">PHP (₱)</option>
                    <option value="SGD">SGD (S$)</option>
                    <option value="AED">AED</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>
              </div>
              
              <div style={{marginBottom:20}}>
                <label style={lbl}>Additional Notes</label>
                <textarea value={intlForm.details} onChange={setI("details")} rows={3} placeholder="Delivery port, special requirements, expected use…" style={{...inp,resize:"vertical",lineHeight:1.65}} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
              </div>
              
              {intlErr&&<div style={{marginBottom:14,padding:"12px 16px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{intlErr}</div>}
              
              <Btn variant={(intlFilled&&cart.length>0)?"gold":"outline"} size="lg" fullWidth disabled={!intlFilled||intlSending||cart.length===0} onClick={handleIntlSubmit}>{intlSending?"Sending…":cart.length===0?"Cart is empty":"Submit International Inquiry →"}</Btn>
            </div>
            
            {/* v16.11: Editable cart summary (qty +/- and remove) */}
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"24px",border:`1px solid ${ds.color.border}`,position:"sticky",top:90}}>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Order Summary</div>
              
              {cart.length===0 ? (
                <div style={{padding:"20px 0",textAlign:"center",color:ds.color.textMuted,fontSize:13}}>
                  Your cart is empty.<br/>
                  <button onClick={()=>{setOrderMode(null);setPage("products");}} style={{marginTop:10,background:"none",border:"none",color:ds.color.gold,fontSize:13,fontWeight:600,cursor:"pointer",textDecoration:"underline"}}>Browse products →</button>
                </div>
              ) : (
                <>
                  {cart.map(item=>(
                    <div key={item.id} style={{marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${ds.color.borderLight}`}}>
                      <div style={{fontSize:12.5,color:ds.color.textBody,marginBottom:8,fontWeight:500,lineHeight:1.4}}>{item.name}</div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                        {/* Qty controls */}
                        <div style={{display:"flex",alignItems:"center",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.sm,overflow:"hidden"}}>
                          <button onClick={()=>updateQty(item.id,Math.max(1,item.qty-1))} disabled={item.qty<=1} style={{width:26,height:26,border:"none",background:item.qty<=1?ds.color.canvas:"#fff",cursor:item.qty<=1?"not-allowed":"pointer",fontSize:14,fontWeight:600,color:item.qty<=1?ds.color.textLight:ds.color.textDark}}>−</button>
                          <span style={{padding:"0 10px",fontSize:13,fontWeight:600,minWidth:26,textAlign:"center"}}>{item.qty}</span>
                          <button onClick={()=>updateQty(item.id,item.qty+1)} style={{width:26,height:26,border:"none",background:"#fff",cursor:"pointer",fontSize:14,fontWeight:600,color:ds.color.textDark}}>+</button>
                        </div>
                        <span style={{fontWeight:600,fontSize:13,color:ds.color.textDark}}>{formatPHP(item.price*item.qty)}</span>
                        {/* Remove button */}
                        <button onClick={()=>{if(confirm(`Remove "${item.name}" from your inquiry?`))removeFromCart(item.id);}} title="Remove from inquiry" style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textLight,padding:4,borderRadius:ds.radius.sm}} onMouseEnter={e=>{e.currentTarget.style.color=ds.color.red;e.currentTarget.style.background=ds.color.redLight;}} onMouseLeave={e=>{e.currentTarget.style.color=ds.color.textLight;e.currentTarget.style.background="none";}}>🗑️</button>
                      </div>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:14,marginTop:6}}>
                    <span>Subtotal</span>
                    <span>{formatPHP(total)}</span>
                  </div>
                  <div style={{fontSize:11,color:ds.color.textLight,marginTop:4}}>{formatUSD(total)} · indicative</div>
                  <div style={{fontSize:11,color:ds.color.textMuted,marginTop:10,padding:"8px 10px",background:ds.color.canvas,borderRadius:ds.radius.sm,lineHeight:1.5}}>
                    💡 {intlDeliveryMode==="door" 
                      ? "Door-to-door shipping + duties will be added on the proforma invoice (DDP terms)." 
                      : "Port shipping costs will be added. You'll handle local customs clearance."}
                  </div>
                </>
              )}
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

        {/* v16.2: Trust signals bar above cart */}
        {step===1 && cart.length > 0 && (
          <div style={{
            display:"flex",
            gap:14,
            justifyContent:"center",
            flexWrap:"wrap",
            padding:"14px 20px",
            background:"#fff",
            borderRadius:ds.radius.lg,
            border:`1px solid ${ds.color.borderLight}`,
            marginBottom:18,
            fontSize:12,
            color:ds.color.textBody,
          }}>
            <span style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{color:ds.color.success}}>✓</span> Secure Checkout
            </span>
            <span style={{opacity:0.4}}>·</span>
            <span style={{display:"flex",alignItems:"center",gap:5}}>
              <span>🚚</span> Nationwide Delivery
            </span>
            <span style={{opacity:0.4}}>·</span>
            <span style={{display:"flex",alignItems:"center",gap:5}}>
              <span>📋</span> BIR-Compliant Receipts
            </span>
            <span style={{opacity:0.4}}>·</span>
            <span style={{display:"flex",alignItems:"center",gap:5}}>
              <span>💬</span> Support 24/7
            </span>
          </div>
        )}

        {/* ── Step 1 — Cart Review */}
        {step===1&&(
          <div className="dm-cart-grid" style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:24,alignItems:"start"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"28px 32px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:20}}>🛒 Your Cart ({cart.length} item{cart.length!==1?"s":""})</div>
              {cart.map(item=>(
                <div key={item.id} style={{
                  display:"grid",
                  gridTemplateColumns:"1fr auto auto auto",
                  alignItems:"center",
                  gap:14,
                  padding:"16px 0",
                  borderBottom:`1px solid ${ds.color.borderLight}`,
                }} className="dm-cart-item">
                  {/* Item info */}
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark,marginBottom:3}}>{item.name}</div>
                    <div style={{fontSize:11.5,color:ds.color.textMuted}}>
                      {formatPHP(item.price)} <span style={{opacity:0.6}}>per unit</span>
                    </div>
                    {item.requiresPrescription&&<div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:5,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:ds.radius.pill,background:"#FFF3CD",border:"1px solid #FBBF24",color:"#92400E"}}>💊 RX REQUIRED</div>}
                  </div>
                  
                  {/* Qty stepper */}
                  <div style={{display:"flex",alignItems:"center",gap:0,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,overflow:"hidden",background:"#fff"}}>
                    <button onClick={()=>updateQty(item.id,Math.max(1,item.qty-1))} disabled={item.qty<=1} style={{width:30,height:32,border:"none",background:item.qty<=1?ds.color.canvas:"#fff",cursor:item.qty<=1?"not-allowed":"pointer",fontSize:16,fontWeight:600,color:item.qty<=1?ds.color.textLight:ds.color.textDark,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                    <span style={{fontSize:13,fontWeight:700,minWidth:32,textAlign:"center",color:ds.color.textDark,padding:"0 6px",borderLeft:`1px solid ${ds.color.borderLight}`,borderRight:`1px solid ${ds.color.borderLight}`,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>{item.qty}</span>
                    <button onClick={()=>updateQty(item.id,item.qty+1)} style={{width:30,height:32,border:"none",background:"#fff",cursor:"pointer",fontSize:16,fontWeight:600,color:ds.color.textDark,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                  </div>
                  
                  {/* Line total */}
                  <div style={{fontSize:14,fontWeight:700,minWidth:88,textAlign:"right",color:ds.color.textDark}}>{formatPHP(item.price*item.qty)}</div>
                  
                  {/* Remove button */}
                  <button onClick={()=>removeFromCart(item.id)} title="Remove from cart" style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textLight,padding:6,borderRadius:ds.radius.sm,transition:"color 0.15s, background 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.color=ds.color.red;e.currentTarget.style.background=ds.color.redLight;}}
                    onMouseLeave={e=>{e.currentTarget.style.color=ds.color.textLight;e.currentTarget.style.background="none";}}
                  >✕</button>
                </div>
              ))}
              
              {/* Continue shopping link */}
              <div style={{textAlign:"center",paddingTop:18}}>
                <button onClick={()=>setPage("products")} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:ds.color.red,fontFamily:ds.font.body,fontWeight:600}}>
                  ← Continue Shopping
                </button>
              </div>
            </div>
            <div className="dm-cart-summary" style={{background:"#fff",borderRadius:ds.radius.xl,padding:"24px",border:`1px solid ${ds.color.border}`,boxShadow:ds.shadow.sm,position:"sticky",top:90}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:16}}>Order Summary</div>
              
              {/* v16.2: Show VAT breakdown */}
              {(()=>{ 
                const vat = computeVATBreakdown(total, "vat_inclusive");
                return (
                  <div style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody,marginBottom:6}}>
                      <span>Subtotal ({cart.length} item{cart.length!==1?"s":""})</span>
                      <span>{formatPHP(vat.netOfVAT)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody,marginBottom:6}}>
                      <span>VAT (12%)</span>
                      <span>{formatPHP(vat.vat)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textMuted,marginBottom:14}}>
                      <span>Shipping</span>
                      <span style={{color:ds.color.success,fontWeight:600}}>Calculated next →</span>
                    </div>
                    <div style={{borderTop:`1px solid ${ds.color.borderLight}`,paddingTop:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:700,color:ds.color.textDark}}>
                        <span>Total</span>
                        <span>{formatPHP(total)}</span>
                      </div>
                      <div style={{fontSize:11,color:ds.color.textLight,marginTop:4,textAlign:"right"}}>VAT included · {formatUSD(total)} approx.</div>
                    </div>
                  </div>
                );
              })()}
              
              {hasRx&&<div style={{background:"#FFF3CD",border:"1px solid #FBBF24",borderRadius:ds.radius.md,padding:"10px 14px",fontSize:12,color:"#92400E",marginBottom:14,lineHeight:1.5}}>💊 <strong>Prescription items in cart.</strong> You'll be asked to upload a valid Rx during checkout.</div>}
              {user&&<div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,padding:"10px 12px",fontSize:12,color:ds.color.gold,marginBottom:14}}>⭐ You'll earn <strong>{Math.floor(total*POINTS_PER_PHP)} points</strong> with this order!</div>}
              
              <Btn variant="primary" size="lg" fullWidth onClick={()=>setStep(2)}>Proceed to Checkout →</Btn>
              
              {/* Trust signals below button */}
              <div style={{marginTop:14,padding:"10px 0",borderTop:`1px solid ${ds.color.borderLight}`,fontSize:11,color:ds.color.textMuted,textAlign:"center",lineHeight:1.6}}>
                <div>🔒 Your data is securely encrypted</div>
                <div style={{marginTop:4}}>📞 Need help? <a href="mailto:info@dmeastph.com" style={{color:ds.color.red,fontWeight:600,textDecoration:"none"}}>info@dmeastph.com</a></div>
              </div>
              
              <button onClick={()=>setOrderMode(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11.5,color:ds.color.textLight,fontFamily:ds.font.body,marginTop:10,display:"block",width:"100%",textAlign:"center"}}>← Change shipping region</button>
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

// ─── v16.5 BLOG SYSTEM (Public-facing) ───────────────────────────────────────

// v16.5: Helper - generate URL-friendly slug from title
function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

// v16.5: Helper - estimate read time from content
function estimateReadTime(htmlContent) {
  const text = (htmlContent || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = text.split(" ").filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

// v16.5: Helper - format publish date nicely
function formatBlogDate(d) {
  if (!d) return "";
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

// v16.5: Hook to load published blog posts
function usePublishedPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "posts"), orderBy("publishedAt", "desc")));
        if (cancelled) return;
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPosts(all.filter(p => p.status === "published"));
      } catch(e) {
        console.warn("Blog posts load failed:", e.message);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);
  
  return { posts, loading };
}

// v16.5: Blog listing page (public, SEO-optimized)
function BlogPage({ setPage, setActivePost }) {
  const { posts, loading } = usePublishedPosts();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  
  // Get unique categories
  const allCategories = [...new Set(posts.map(p => p.category).filter(Boolean))].sort();
  
  const filtered = posts.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      p.title?.toLowerCase().includes(q) || 
      p.excerpt?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q));
    const matchesCategory = !activeCategory || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
  
  const handleArticleClick = (post) => {
    setActivePost(post);
    setPage("blogPost");
  };
  
  return (
    <div style={{paddingTop:67}}>
      <PageHero 
        eyebrow="Insights & News" 
        title="DMEAST Blog" 
        subtitle="Healthcare insights, industry updates, and procurement guidance for medical professionals and institutional buyers." 
      />
      
      <div style={{maxWidth:1280,margin:"0 auto",padding:"40px 28px"}}>
        
        {/* Search bar */}
        <div style={{
          background:"#fff",
          border:`1px solid ${ds.color.border}`,
          borderRadius:ds.radius.lg,
          padding:"6px 6px 6px 16px",
          display:"flex",
          alignItems:"center",
          gap:10,
          boxShadow:ds.shadow.xs,
          marginBottom:20,
          maxWidth:600,
        }}>
          <span style={{fontSize:18,color:ds.color.textMuted}}>🔍</span>
          <input 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
            placeholder="Search articles…"
            style={{
              flex:1,border:"none",fontSize:14,outline:"none",
              fontFamily:ds.font.body,color:ds.color.textDark,
              background:"transparent",padding:"8px 0",
            }}
          />
          {search && (
            <button onClick={()=>setSearch("")} style={{background:"none",border:"none",fontSize:18,color:ds.color.textMuted,cursor:"pointer",padding:"0 8px"}}>✕</button>
          )}
        </div>
        
        {/* Category pills */}
        {allCategories.length > 0 && (
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>
            <button onClick={()=>setActiveCategory(null)} style={{
              padding:"7px 14px",borderRadius:ds.radius.pill,
              border:`1.5px solid ${!activeCategory?ds.color.red:ds.color.border}`,
              background:!activeCategory?ds.color.red:"#fff",
              color:!activeCategory?"#fff":ds.color.textBody,
              cursor:"pointer",fontSize:12.5,fontWeight:600,fontFamily:ds.font.body,
            }}>All Articles</button>
            {allCategories.map(c => (
              <button key={c} onClick={()=>setActiveCategory(c)} style={{
                padding:"7px 14px",borderRadius:ds.radius.pill,
                border:`1.5px solid ${activeCategory===c?ds.color.gold:ds.color.border}`,
                background:activeCategory===c?ds.color.gold:"#fff",
                color:activeCategory===c?"#fff":ds.color.textBody,
                cursor:"pointer",fontSize:12.5,fontWeight:600,fontFamily:ds.font.body,
              }}>{c}</button>
            ))}
          </div>
        )}
        
        {/* Loading state */}
        {loading && (
          <div style={{textAlign:"center",padding:"60px 0",color:ds.color.textMuted}}>
            Loading articles…
          </div>
        )}
        
        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{textAlign:"center",padding:"60px 28px",background:ds.color.canvas,borderRadius:ds.radius.lg,border:`1px solid ${ds.color.border}`}}>
            <div style={{fontSize:48,marginBottom:14,opacity:0.6}}>📝</div>
            <div style={{fontSize:16,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>
              {posts.length === 0 ? "No articles yet" : "No matching articles"}
            </div>
            <div style={{fontSize:13.5,color:ds.color.textMuted,marginBottom:20,maxWidth:380,margin:"0 auto 20px"}}>
              {posts.length === 0 ? "Check back soon — we're working on insightful content for medical professionals." : "Try different keywords or browse all articles."}
            </div>
            {posts.length > 0 && (
              <Btn variant="primary" size="sm" onClick={()=>{setSearch("");setActiveCategory(null);}}>Show All Articles</Btn>
            )}
          </div>
        )}
        
        {/* Article grid */}
        {!loading && filtered.length > 0 && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:24}}>
            {filtered.map(post => (
              <article key={post.id} 
                onClick={()=>handleArticleClick(post)}
                style={{
                  background:"#fff",
                  border:`1px solid ${ds.color.border}`,
                  borderRadius:ds.radius.lg,
                  overflow:"hidden",
                  cursor:"pointer",
                  transition:"transform 0.2s, box-shadow 0.2s, border-color 0.2s",
                  display:"flex",
                  flexDirection:"column",
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=ds.shadow.md;e.currentTarget.style.borderColor=ds.color.redBorder;}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=ds.color.border;}}
              >
                {/* Featured image */}
                <div style={{
                  width:"100%",
                  height:180,
                  background:post.featuredImage ? `url(${post.featuredImage}) center/cover no-repeat` : `linear-gradient(135deg, ${ds.color.redLight} 0%, ${ds.color.goldLight} 100%)`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}>
                  {!post.featuredImage && <span style={{fontSize:56,opacity:0.4}}>📰</span>}
                </div>
                
                {/* Content */}
                <div style={{padding:"20px 22px",flex:1,display:"flex",flexDirection:"column"}}>
                  {/* Category + date */}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,fontSize:11,color:ds.color.textMuted}}>
                    {post.category && (
                      <span style={{color:ds.color.gold,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>
                        {post.category}
                      </span>
                    )}
                    {post.category && <span style={{opacity:0.4}}>·</span>}
                    <span>{formatBlogDate(post.publishedAt)}</span>
                  </div>
                  
                  {/* Title */}
                  <h3 style={{
                    fontFamily:ds.font.display,
                    fontSize:18,
                    color:ds.color.textDark,
                    lineHeight:1.3,
                    marginBottom:10,
                    fontWeight:400,
                  }}>{post.title}</h3>
                  
                  {/* Excerpt */}
                  <p style={{
                    fontSize:13.5,
                    color:ds.color.textMuted,
                    lineHeight:1.6,
                    marginBottom:16,
                    flex:1,
                    display:"-webkit-box",
                    WebkitLineClamp:3,
                    WebkitBoxOrient:"vertical",
                    overflow:"hidden",
                  }}>{post.excerpt}</p>
                  
                  {/* Read more */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,color:ds.color.textLight,paddingTop:14,borderTop:`1px solid ${ds.color.borderLight}`}}>
                    <span>📖 {post.readTime || estimateReadTime(post.content)}</span>
                    <span style={{color:ds.color.red,fontWeight:700}}>Read article →</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        
        {/* Bottom CTA */}
        {!loading && filtered.length > 0 && (
          <div style={{marginTop:60,padding:"32px",background:`linear-gradient(135deg, ${ds.color.canvasWarm} 0%, ${ds.color.canvasGold} 100%)`,borderRadius:ds.radius.xl,border:`1px solid ${ds.color.goldBorder}`,textAlign:"center"}}>
            <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark,marginBottom:10}}>Have questions about medical procurement?</div>
            <div style={{fontSize:14,color:ds.color.textMuted,marginBottom:18,maxWidth:520,margin:"0 auto 18px"}}>Our team responds to inquiries within 24-48 hours with formal quotations and BIR-compliant documentation.</div>
            <Btn variant="gold" size="md" onClick={()=>setPage("quote")}>Request a Quote →</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// v16.5: Individual blog post page
function BlogPostPage({ post, setPage, setActivePost }) {
  const { posts: allPosts } = usePublishedPosts();
  
  if (!post) {
    return (
      <div style={{paddingTop:67,textAlign:"center",padding:"100px 28px"}}>
        <div style={{fontSize:48,marginBottom:16,opacity:0.6}}>📰</div>
        <div style={{fontFamily:ds.font.display,fontSize:24,color:ds.color.textDark,marginBottom:12}}>Article not found</div>
        <p style={{fontSize:14,color:ds.color.textMuted,marginBottom:24}}>The article you're looking for might have been moved or removed.</p>
        <Btn variant="primary" size="md" onClick={()=>setPage("blog")}>← Back to Blog</Btn>
      </div>
    );
  }
  
  // Find related articles (same category, exclude current)
  const related = allPosts.filter(p => p.id !== post.id && p.category === post.category).slice(0, 3);
  
  return (
    <div style={{paddingTop:67}}>
      <article style={{maxWidth:780,margin:"0 auto",padding:"40px 28px"}}>
        {/* Back link */}
        <button onClick={()=>{setActivePost(null);setPage("blog");}} style={{
          background:"none",border:"none",cursor:"pointer",fontSize:13,
          color:ds.color.red,fontWeight:600,fontFamily:ds.font.body,
          marginBottom:24,padding:0,
        }}>← Back to Blog</button>
        
        {/* Category */}
        {post.category && (
          <div style={{fontSize:11,fontWeight:700,color:ds.color.gold,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>
            {post.category}
          </div>
        )}
        
        {/* Title */}
        <h1 style={{
          fontFamily:ds.font.display,
          fontSize:"clamp(1.8rem,4vw,2.8rem)",
          color:ds.color.textDark,
          lineHeight:1.2,
          marginBottom:18,
          fontWeight:400,
        }}>{post.title}</h1>
        
        {/* Meta row */}
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:32,fontSize:13,color:ds.color.textMuted,flexWrap:"wrap"}}>
          {post.author && (
            <span style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg, ${ds.color.redLight} 0%, ${ds.color.goldLight} 100%)`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:14}}>👤</span>
              <span style={{fontWeight:600,color:ds.color.textBody}}>{post.author}</span>
            </span>
          )}
          {post.author && <span style={{opacity:0.4}}>·</span>}
          <span>{formatBlogDate(post.publishedAt)}</span>
          <span style={{opacity:0.4}}>·</span>
          <span>📖 {post.readTime || estimateReadTime(post.content)}</span>
        </div>
        
        {/* Featured image */}
        {post.featuredImage && (
          <div style={{
            width:"100%",
            aspectRatio:"16/9",
            background:`url(${post.featuredImage}) center/cover no-repeat`,
            borderRadius:ds.radius.lg,
            marginBottom:32,
          }}/>
        )}
        
        {/* Excerpt as lead paragraph */}
        {post.excerpt && (
          <p style={{
            fontSize:18,
            color:ds.color.textBody,
            lineHeight:1.65,
            marginBottom:32,
            paddingLeft:18,
            borderLeft:`3px solid ${ds.color.goldBright}`,
            fontStyle:"italic",
          }}>{post.excerpt}</p>
        )}
        
        {/* Content (HTML rendered) */}
        <div 
          className="dm-blog-content"
          style={{
            fontSize:15.5,
            color:ds.color.textBody,
            lineHeight:1.8,
          }}
          dangerouslySetInnerHTML={{ __html: post.content || "" }}
        />
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{marginTop:40,paddingTop:24,borderTop:`1px solid ${ds.color.borderLight}`,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:ds.color.textMuted,fontWeight:600}}>Tags:</span>
            {post.tags.map(t => (
              <span key={t} style={{padding:"4px 12px",background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.pill,fontSize:11.5,color:ds.color.textBody,fontFamily:ds.font.body}}>
                #{t}
              </span>
            ))}
          </div>
        )}
        
        {/* CTA */}
        <div style={{marginTop:48,padding:"28px 32px",background:`linear-gradient(135deg, ${ds.color.redLight} 0%, ${ds.color.canvasWarm} 100%)`,borderRadius:ds.radius.xl,border:`1px solid ${ds.color.redBorder}`,textAlign:"center"}}>
          <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:10}}>Need medical supplies for your institution?</div>
          <div style={{fontSize:13.5,color:ds.color.textMuted,marginBottom:18,maxWidth:520,margin:"0 auto 18px"}}>DMEAST sources from FDA-licensed suppliers and provides BIR-compliant documentation. Bulk pricing for hospitals, LGUs, and clinics.</div>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn variant="primary" size="md" onClick={()=>setPage("products")}>Shop Products</Btn>
            <Btn variant="outline" size="md" onClick={()=>setPage("quote")}>Request Quote</Btn>
          </div>
        </div>
      </article>
      
      {/* Related articles */}
      {related.length > 0 && (
        <section style={{background:ds.color.canvas,padding:"60px 28px",marginTop:60}}>
          <div style={{maxWidth:1280,margin:"0 auto"}}>
            <h2 style={{fontFamily:ds.font.display,fontSize:24,color:ds.color.textDark,marginBottom:24,textAlign:"center",fontWeight:400}}>Related Articles</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:18,maxWidth:920,margin:"0 auto"}}>
              {related.map(p => (
                <button key={p.id} onClick={()=>{setActivePost(p);setPage("blogPost");window.scrollTo({top:0,behavior:"instant"});}} style={{
                  background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,
                  padding:"18px 22px",cursor:"pointer",textAlign:"left",fontFamily:ds.font.body,
                  transition:"box-shadow 0.2s, border-color 0.2s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow=ds.shadow.md;e.currentTarget.style.borderColor=ds.color.redBorder;}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=ds.color.border;}}
                >
                  <div style={{fontSize:10,fontWeight:700,color:ds.color.gold,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{p.category}</div>
                  <div style={{fontFamily:ds.font.display,fontSize:15,color:ds.color.textDark,lineHeight:1.35,marginBottom:8}}>{p.title}</div>
                  <div style={{fontSize:11.5,color:ds.color.textMuted}}>{formatBlogDate(p.publishedAt)} · {p.readTime || estimateReadTime(p.content)}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// v16.5: Latest articles section for homepage
function LatestArticlesSection({ setPage, setActivePost }) {
  const { posts, loading } = usePublishedPosts();
  const featured = posts.slice(0, 3);
  
  if (loading || featured.length === 0) return null;
  
  return (
    <section style={{background:ds.color.white,padding:"64px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32,flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:ds.color.gold,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>📝 From Our Blog</div>
            <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400,marginBottom:6}}>Latest Insights</h2>
            <p style={{fontSize:14,color:ds.color.textMuted,maxWidth:520}}>Healthcare industry updates and procurement guidance.</p>
          </div>
          <button onClick={()=>setPage("blog")} style={{background:"none",border:"none",color:ds.color.red,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:ds.font.body,padding:"6px 0"}}>
            View All Articles →
          </button>
        </div>
        
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:18}}>
          {featured.map(post => (
            <article key={post.id} 
              onClick={()=>{setActivePost(post);setPage("blogPost");}}
              style={{
                background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,
                overflow:"hidden",cursor:"pointer",transition:"all 0.2s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=ds.shadow.md;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}
            >
              <div style={{
                width:"100%",height:160,
                background:post.featuredImage ? `url(${post.featuredImage}) center/cover no-repeat` : `linear-gradient(135deg, ${ds.color.redLight} 0%, ${ds.color.goldLight} 100%)`,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                {!post.featuredImage && <span style={{fontSize:42,opacity:0.4}}>📰</span>}
              </div>
              <div style={{padding:"18px 20px"}}>
                {post.category && <div style={{fontSize:10,fontWeight:700,color:ds.color.gold,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>{post.category}</div>}
                <h3 style={{fontFamily:ds.font.display,fontSize:16,color:ds.color.textDark,lineHeight:1.3,marginBottom:8,fontWeight:400}}>{post.title}</h3>
                <p style={{fontSize:13,color:ds.color.textMuted,lineHeight:1.55,marginBottom:12,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{post.excerpt}</p>
                <div style={{fontSize:11.5,color:ds.color.textLight,display:"flex",justifyContent:"space-between"}}>
                  <span>{formatBlogDate(post.publishedAt)}</span>
                  <span>{post.readTime || estimateReadTime(post.content)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


// ─── v16.5 BLOG ADMIN COMPONENTS ──────────────────────────────────────────────

// v16.5: Posts management tab in admin dashboard
function PostsTab({ posts, refreshPosts, userRole }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | published | draft
  const [editingPost, setEditingPost] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  
  const filtered = posts.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      p.title?.toLowerCase().includes(q) ||
      p.excerpt?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  const handleDelete = async (postId, postTitle) => {
    if (!confirm(`Delete article "${postTitle}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      await refreshPosts();
    } catch(e) {
      alert("Failed to delete: " + e.message);
    }
  };
  
  const handleNewPost = () => {
    setEditingPost(null);
    setShowEditor(true);
  };
  
  const handleEdit = (post) => {
    setEditingPost(post);
    setShowEditor(true);
  };
  
  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingPost(null);
  };
  
  const handleEditorSaved = async () => {
    setShowEditor(false);
    setEditingPost(null);
    await refreshPosts();
  };
  
  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark}}>📝 Blog Articles ({posts.length})</div>
          <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:4}}>
            {posts.filter(p=>p.status==="published").length} published · {posts.filter(p=>p.status==="draft").length} drafts
          </div>
        </div>
        <Btn variant="primary" size="sm" onClick={handleNewPost}>+ New Article</Btn>
      </div>
      
      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search articles…" style={{flex:1,minWidth:200,padding:"9px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.sm,fontSize:13,outline:"none",fontFamily:ds.font.body}}/>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:"9px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.sm,fontSize:13,outline:"none",fontFamily:ds.font.body,background:"#fff",cursor:"pointer"}}>
          <option value="all">All ({posts.length})</option>
          <option value="published">Published ({posts.filter(p=>p.status==="published").length})</option>
          <option value="draft">Drafts ({posts.filter(p=>p.status==="draft").length})</option>
        </select>
      </div>
      
      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{textAlign:"center",padding:"50px 28px",background:ds.color.canvas,borderRadius:ds.radius.lg,border:`1px solid ${ds.color.border}`}}>
          <div style={{fontSize:42,marginBottom:12,opacity:0.5}}>📝</div>
          <div style={{fontSize:15,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>
            {posts.length === 0 ? "No articles yet" : "No matching articles"}
          </div>
          <div style={{fontSize:13,color:ds.color.textMuted,marginBottom:18}}>
            {posts.length === 0 ? "Click '+ New Article' to publish your first blog post." : "Try a different search or filter."}
          </div>
          {posts.length === 0 && <Btn variant="primary" size="sm" onClick={handleNewPost}>+ Create First Article</Btn>}
        </div>
      )}
      
      {/* Article list */}
      {filtered.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(post => (
            <div key={post.id} style={{
              background:"#fff",
              border:`1px solid ${ds.color.border}`,
              borderRadius:ds.radius.md,
              padding:"16px 20px",
              display:"grid",
              gridTemplateColumns:"1fr auto",
              gap:14,
              alignItems:"center",
            }}>
              <div style={{minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                  <span style={{
                    fontSize:9.5,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",
                    padding:"3px 8px",borderRadius:ds.radius.pill,
                    background: post.status==="published" ? ds.color.successBg : ds.color.canvas,
                    color: post.status==="published" ? ds.color.success : ds.color.textMuted,
                    border: `1px solid ${post.status==="published" ? ds.color.successBorder : ds.color.border}`,
                  }}>{post.status === "published" ? "✓ PUBLISHED" : "DRAFT"}</span>
                  {post.category && <span style={{fontSize:10,color:ds.color.gold,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>{post.category}</span>}
                  {post.publishedAt && <span style={{fontSize:11,color:ds.color.textMuted}}>{formatBlogDate(post.publishedAt)}</span>}
                </div>
                <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark,marginBottom:3}}>{post.title}</div>
                <div style={{fontSize:12,color:ds.color.textMuted,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:1,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{post.excerpt}</div>
                <div style={{fontSize:10.5,color:ds.color.textLight,marginTop:5}}>
                  /blog/{post.slug || "no-slug"} · {post.readTime || estimateReadTime(post.content)} · by {post.author || "—"}
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>handleEdit(post)} style={{padding:"6px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,color:ds.color.textBody,fontFamily:ds.font.body}}>✏️ Edit</button>
                <button onClick={()=>handleDelete(post.id, post.title)} style={{padding:"6px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.redBorder}`,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,color:ds.color.red,fontFamily:ds.font.body}}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Editor modal */}
      {showEditor && (
        <PostEditorModal post={editingPost} onClose={handleEditorClose} onSaved={handleEditorSaved}/>
      )}
    </div>
  );
}

// v16.5: Article editor modal
function PostEditorModal({ post, onClose, onSaved }) {
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [category, setCategory] = useState(post?.category || "Industry Insights");
  const [tags, setTags] = useState((post?.tags || []).join(", "));
  const [author, setAuthor] = useState(post?.author || "DMEAST Team");
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage || "");
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription || "");
  const [status, setStatus] = useState(post?.status || "draft");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [autoSlug, setAutoSlug] = useState(!post?.slug);
  
  // Auto-generate slug from title (until user manually edits slug)
  useEffect(() => {
    if (autoSlug) setSlug(slugify(title));
  }, [title, autoSlug]);
  
  const PRESET_CATEGORIES = ["Industry Insights", "Procurement Guide", "Healthcare Tips", "Company News", "Regulatory Updates", "Product Spotlight"];
  
  const handleSave = async (publishNow) => {
    setErrMsg("");
    if (!title.trim()) { setErrMsg("Title is required"); return; }
    if (!content.trim()) { setErrMsg("Content cannot be empty"); return; }
    if (!slug.trim()) { setErrMsg("Slug is required (auto-generated from title)"); return; }
    
    setSaving(true);
    try {
      const finalSlug = slugify(slug);
      const finalStatus = publishNow ? "published" : status;
      const tagArr = tags.split(",").map(t=>t.trim()).filter(Boolean);
      
      const data = {
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt.trim() || title.trim(),
        content: content,
        category: category,
        tags: tagArr,
        author: author.trim() || "DMEAST Team",
        featuredImage: featuredImage.trim(),
        metaDescription: metaDescription.trim() || excerpt.trim() || title.trim(),
        readTime: estimateReadTime(content),
        status: finalStatus,
        updatedAt: serverTimestamp(),
      };
      
      // Set publishedAt if publishing for first time
      if (finalStatus === "published" && (!post || post.status !== "published")) {
        data.publishedAt = serverTimestamp();
      } else if (post?.publishedAt) {
        data.publishedAt = post.publishedAt;
      }
      
      if (post?.id) {
        await updateDoc(doc(db, "posts", post.id), data);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "posts"), data);
      }
      
      onSaved();
    } catch(e) {
      console.error("Save failed:", e);
      setErrMsg("Failed to save: " + e.message);
    }
    setSaving(false);
  };
  
  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.sm,fontSize:13.5,outline:"none",fontFamily:ds.font.body,boxSizing:"border-box"};
  const lbl = {display:"block",fontSize:11.5,fontWeight:600,color:ds.color.textBody,marginBottom:6,letterSpacing:"0.02em"};
  
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:920,width:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.lg}}>
        {/* Header */}
        <div style={{padding:"22px 28px",borderBottom:`1px solid ${ds.color.borderLight}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div>
            <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>{post ? "✏️ Edit Article" : "📝 New Article"}</div>
            <div style={{fontSize:12,color:ds.color.textMuted,marginTop:3}}>{post ? `Editing: ${post.title}` : "Create a new blog post"}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:ds.color.textMuted,padding:6}}>✕</button>
        </div>
        
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
          {errMsg && <div style={{padding:"10px 14px",background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.sm,color:ds.color.red,fontSize:13,marginBottom:18}}>{errMsg}</div>}
          
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px"}}>
            {/* Title */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Article Title *</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g., 10 Essential Medical Supplies Every Philippine LGU Should Stock" style={inp}/>
            </div>
            
            {/* Slug */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>URL Slug * <span style={{color:ds.color.textMuted,fontWeight:400}}>(auto-generated from title)</span></label>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:13,color:ds.color.textMuted,padding:"10px 0"}}>dmeastph.com/blog/</span>
                <input value={slug} onChange={e=>{setSlug(e.target.value);setAutoSlug(false);}} placeholder="article-url-slug" style={{...inp,flex:1}}/>
                <button onClick={()=>{setAutoSlug(true);setSlug(slugify(title));}} style={{padding:"8px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.textMuted,fontFamily:ds.font.body,whiteSpace:"nowrap"}}>↻ Auto</button>
              </div>
            </div>
            
            {/* Excerpt */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Excerpt / Summary <span style={{color:ds.color.textMuted,fontWeight:400}}>(shown in article cards, ~150 chars)</span></label>
              <textarea value={excerpt} onChange={e=>setExcerpt(e.target.value)} rows={2} placeholder="Brief summary of the article — appears on the blog listing page and in social previews." style={{...inp,resize:"vertical",fontFamily:ds.font.body}}/>
              <div style={{fontSize:11,color:ds.color.textLight,marginTop:4,textAlign:"right"}}>{excerpt.length} / 200 characters</div>
            </div>
            
            {/* Category */}
            <div>
              <label style={lbl}>Category</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} style={{...inp,cursor:"pointer"}}>
                {PRESET_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            {/* Author */}
            <div>
              <label style={lbl}>Author</label>
              <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="DMEAST Team" style={inp}/>
            </div>
            
            {/* Tags */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Tags <span style={{color:ds.color.textMuted,fontWeight:400}}>(comma-separated, e.g.: BIR, procurement, LGU)</span></label>
              <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="medical supplies, Philippines, LGU, BIR" style={inp}/>
            </div>
            
            {/* Featured image URL */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Featured Image URL <span style={{color:ds.color.textMuted,fontWeight:400}}>(optional, paste an image URL)</span></label>
              <input value={featuredImage} onChange={e=>setFeaturedImage(e.target.value)} placeholder="https://..." style={inp}/>
              {featuredImage && (
                <div style={{marginTop:8,padding:8,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.sm,background:ds.color.canvas}}>
                  <div style={{width:"100%",aspectRatio:"16/9",background:`url(${featuredImage}) center/cover no-repeat`,borderRadius:ds.radius.sm}}/>
                </div>
              )}
            </div>
            
            {/* Content */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Article Content (HTML supported) *</label>
              <textarea value={content} onChange={e=>setContent(e.target.value)} rows={14} placeholder={`Write your article here. You can use HTML tags:\n\n<h2>Section Heading</h2>\n<p>A paragraph of text.</p>\n<p><strong>Bold</strong> or <em>italic</em>.</p>\n<ul>\n  <li>Bullet point</li>\n  <li>Another point</li>\n</ul>\n<a href="https://...">Link</a>\n<img src="https://..." alt="..."/>`} style={{...inp,fontFamily:"ui-monospace, monospace",fontSize:12.5,resize:"vertical"}}/>
              <div style={{fontSize:11,color:ds.color.textLight,marginTop:6,lineHeight:1.5}}>
                💡 <strong>Tip:</strong> Use HTML tags for formatting. Common: <code style={{background:ds.color.canvas,padding:"1px 4px",borderRadius:3}}>&lt;h2&gt;</code>, <code style={{background:ds.color.canvas,padding:"1px 4px",borderRadius:3}}>&lt;p&gt;</code>, <code style={{background:ds.color.canvas,padding:"1px 4px",borderRadius:3}}>&lt;strong&gt;</code>, <code style={{background:ds.color.canvas,padding:"1px 4px",borderRadius:3}}>&lt;ul&gt;&lt;li&gt;</code>, <code style={{background:ds.color.canvas,padding:"1px 4px",borderRadius:3}}>&lt;a href=""&gt;</code>
              </div>
              <div style={{fontSize:11,color:ds.color.textLight,marginTop:4,textAlign:"right"}}>
                {content.replace(/<[^>]+>/g," ").trim().split(/\s+/).filter(Boolean).length} words · {estimateReadTime(content)}
              </div>
            </div>
            
            {/* SEO Meta description */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Meta Description (SEO) <span style={{color:ds.color.textMuted,fontWeight:400}}>(150-160 chars optimal)</span></label>
              <textarea value={metaDescription} onChange={e=>setMetaDescription(e.target.value)} rows={2} placeholder="Description shown in Google search results and social media previews. If left blank, the excerpt will be used." style={{...inp,resize:"vertical",fontFamily:ds.font.body}}/>
              <div style={{fontSize:11,color:metaDescription.length>160?ds.color.red:ds.color.textLight,marginTop:4,textAlign:"right"}}>{metaDescription.length} / 160 characters {metaDescription.length>160 && "⚠️ too long"}</div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div style={{padding:"18px 28px",borderTop:`1px solid ${ds.color.borderLight}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{fontSize:12,color:ds.color.textMuted}}>
            Status: <strong style={{color: status === "published" ? ds.color.success : ds.color.textBody}}>{status === "published" ? "Published" : "Draft"}</strong>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="outline" size="md" disabled={saving} onClick={onClose}>Cancel</Btn>
            <Btn variant="secondary" size="md" disabled={saving} onClick={()=>handleSave(false)}>{saving?"Saving…":"💾 Save as Draft"}</Btn>
            <Btn variant="primary" size="md" disabled={saving} onClick={()=>handleSave(true)}>{saving?"Saving…":"🚀 Publish"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}


// v16.3: Cancellation/Termination of Service Policy (REQUIRED for Fiuu merchant onboarding)
function CancellationPage(){
  const sections=[
    {title:"Customer-Initiated Order Cancellation",body:"You may cancel your order BEFORE it has been processed for shipment. To request cancellation, contact us immediately at "+CONTACT.email+" or "+CONTACT.phone1+" with your order reference number. Cancellations submitted before payment processing are eligible for a full refund. Once items have been packed, dispatched, or sourced from suppliers, cancellation is no longer available."},
    {title:"Cancellation Request Window",body:"Standard online orders: cancellation must be requested within 2 hours of payment to qualify for full refund without penalty. Procurement-based orders (specialized equipment, bulk pharmaceuticals, institutional orders): cancellation must be requested within 24 hours of order confirmation. After these windows, cancellation is subject to supplier policies and any costs already incurred (e.g., supplier deposits, processing fees) will be deducted from the refund."},
    {title:"Cancellation Fees",body:"Orders cancelled within the request window: NO fee, full refund. Orders cancelled after sourcing has begun: actual costs incurred (typically 15-30% of order value) will be deducted from refund. Orders cancelled after dispatch: not eligible for cancellation; refer to our Return & Refund Policy."},
    {title:"DMEAST-Initiated Order Cancellation",body:"DM EAST reserves the right to cancel any order at our discretion in cases including: pricing or product information errors, items becoming unavailable from suppliers, suspected fraudulent activity, payment verification failures, breach of these terms, force majeure events (natural disasters, government restrictions, etc.). When DM EAST cancels an order, you will receive a full 100% refund of all amounts paid, processed within 7-14 business days."},
    {title:"Refund Method for Cancellations",body:"Approved cancellation refunds are processed in the following order of preference: (1) Original payment method — for credit/debit card and online payment cancellations, refund posts to the original card or e-wallet within 7-14 business days. (2) Store credit — alternative option, available immediately. (3) Bank transfer — for bank transfer payments, refund issued back to your originating bank account within 5-10 business days. Processing times depend on your bank or payment provider; DMEAST cannot guarantee timing once the refund has been initiated."},
    {title:"Account Termination",body:"You may close your DMEAST customer account at any time by emailing "+CONTACT.email+" with the request. Account closure removes your saved profile, addresses, and rewards points (which are forfeited upon closure). Order history may be retained for legal, accounting, and BIR compliance purposes for the period required by Philippine law (minimum 10 years for sales records). DMEAST reserves the right to terminate or suspend accounts that violate our Terms & Conditions, attempt fraudulent transactions, or engage in abuse of services or staff."},
    {title:"Service Termination by DMEAST",body:"DMEAST may suspend or discontinue any service, product line, or feature on this website at any time without prior notice. Active orders at the time of service termination will be honored or refunded in full. Subscription services or recurring orders (if applicable) will receive 30 days advance notice before termination, with prorated refunds for unused periods."},
    {title:"How to Request Cancellation",body:"Email "+CONTACT.email+" with subject line \"CANCELLATION REQUEST – Order #[your order ref]\". Include: full name, order reference number, payment method used, reason for cancellation. Or call "+CONTACT.phone1+" during business hours (Mon-Sat, 9 AM - 6 PM PHT). We respond to cancellation requests within 1 business day."},
    {title:"Disputes",body:"If you disagree with a cancellation decision or refund amount, contact "+CONTACT.email+" within 14 days. We will review the case and respond within 5 business days. Unresolved disputes may be escalated through Philippine consumer protection channels (DTI, BSP for payment-related issues)."},
    {title:"Updates to This Policy",body:"DM EAST may update this Cancellation Policy from time to time. The latest version will always be posted on this page with the \"Last updated\" date. Continued use of our services constitutes acceptance of any updates."},
  ];
  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Legal" title="Cancellation & Termination Policy" subtitle={`Last updated: ${new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}`}/>
      <div style={{maxWidth:820,margin:"0 auto",padding:"60px 28px"}}>
        <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.lg,padding:"18px 22px",marginBottom:40,fontSize:14,color:ds.color.gold,lineHeight:1.7}}>
          This policy explains how to cancel orders, account termination, and service termination. For information about returning products you've already received, please see our <button onClick={()=>{const ev=new CustomEvent("dmeast-nav",{detail:"refunds"});window.dispatchEvent(ev);}} style={{background:"none",border:"none",color:ds.color.gold,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body,fontSize:14,textDecoration:"underline",padding:0}}>Return & Refund Policy</button>.
        </div>
        {sections.map((s,i)=>(
          <div key={i} style={{marginBottom:36,paddingBottom:36,borderBottom:i<sections.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
            <h3 style={{fontSize:17,fontWeight:600,color:ds.color.textDark,marginBottom:10,fontFamily:ds.font.display}}>{i+1}. {s.title}</h3>
            <p style={{fontSize:15,color:ds.color.textBody,lineHeight:1.8,whiteSpace:"pre-line"}}>{s.body}</p>
          </div>
        ))}
        
        {/* Quick contact box */}
        <div style={{background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",marginTop:40,textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark,marginBottom:10}}>Need to cancel an order?</div>
          <div style={{fontSize:13.5,color:ds.color.textMuted,marginBottom:18,lineHeight:1.7}}>
            Contact us within the cancellation window for fastest processing.
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",fontSize:13.5}}>
            <a href={`mailto:${CONTACT.email}?subject=Cancellation Request`} style={{color:ds.color.red,fontWeight:700,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:5}}>
              ✉️ {CONTACT.email}
            </a>
            <span style={{color:ds.color.textLight}}>·</span>
            <a href={`tel:${CONTACT.phone1.replace(/\s/g,"")}`} style={{color:ds.color.red,fontWeight:700,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:5}}>
              📞 {CONTACT.phone1}
            </a>
          </div>
        </div>
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
            {[["home","Home"],["about","About Us"],["products","Shop"],["institutional","Institutional"],["blog","Blog"],["quote","Request Quote"],["track","Track Order"],["contact","Contact"]].map(([id,label])=>(
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
            {[["privacy","Privacy Policy"],["terms","Terms & Conditions"],["refunds","Return & Refund"],["shipping","Shipping Policy"],["cancellation","Cancellation Policy"]].map(([id,label])=>(
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
// v16.6: Floating chat — multi-channel quick contact (Messenger/WhatsApp/Phone/Email)
function FloatingChat({ hidden }){
  const [open, setOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  
  // Stop the pulse animation after 6 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowPulse(false), 6000);
    return () => clearTimeout(t);
  }, []);
  
  if (hidden) return null;
  
  const channels = [
    { id:"messenger", label:"Facebook Messenger", sublabel:"Chat instantly", icon:"💬", bg:"#0084FF", href:CONTACT.messenger, external:true },
    { id:"whatsapp",  label:"WhatsApp",           sublabel:"Quick reply, anytime", icon:"📱", bg:"#25D366", href:CONTACT.whatsapp, external:true },
    { id:"phone",     label:"Call us",            sublabel:CONTACT.phone1,      icon:"📞", bg:ds.color.red,  href:`tel:${CONTACT.phone1Raw}`, external:false },
    { id:"email",     label:"Email",              sublabel:CONTACT.email,       icon:"✉️", bg:ds.color.gold, href:`mailto:${CONTACT.email}`, external:false },
  ];
  
  return (
    <>
      {/* Expanded panel */}
      {open && (
        <div style={{
          position:"fixed",bottom:96,right:22,
          background:"#fff",borderRadius:ds.radius.xl,
          boxShadow:"0 10px 40px rgba(0,0,0,0.18)",
          width:300,maxWidth:"calc(100vw - 44px)",
          zIndex:998,overflow:"hidden",fontFamily:ds.font.body,
          animation:"dm-chat-fade-in 0.2s ease-out",
        }}>
          <div style={{
            background:`linear-gradient(135deg, ${ds.color.red} 0%, #B91C2A 100%)`,
            padding:"18px 20px",color:"#fff",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👋</div>
              <div>
                <div style={{fontSize:15,fontWeight:700}}>Hi! How can we help?</div>
                <div style={{fontSize:11.5,opacity:0.85,marginTop:2}}>We typically reply within 1 hour</div>
              </div>
            </div>
          </div>
          
          <div style={{padding:"8px"}}>
            {channels.map(c => (
              <a key={c.id} href={c.href} target={c.external?"_blank":"_self"} rel="noopener noreferrer"
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:ds.radius.md,textDecoration:"none",color:ds.color.textDark,transition:"background 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background=ds.color.canvas}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <div style={{width:38,height:38,borderRadius:"50%",background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",flexShrink:0}}>{c.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:600,color:ds.color.textDark}}>{c.label}</div>
                  <div style={{fontSize:11.5,color:ds.color.textMuted,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.sublabel}</div>
                </div>
                <div style={{fontSize:14,color:ds.color.textLight,flexShrink:0}}>→</div>
              </a>
            ))}
          </div>
          
          <div style={{padding:"12px 20px",background:ds.color.canvas,borderTop:`1px solid ${ds.color.borderLight}`,fontSize:10.5,color:ds.color.textMuted,textAlign:"center"}}>
            Mon–Sat · 9 AM – 6 PM (PHT)
          </div>
        </div>
      )}
      
      {/* Floating bubble button */}
      <button onClick={()=>setOpen(!open)} aria-label={open?"Close chat menu":"Open chat menu"}
        style={{
          position:"fixed",bottom:22,right:22,width:60,height:60,borderRadius:"50%",border:"none",
          background:open?ds.color.textDark:ds.color.red,color:"#fff",fontSize:24,cursor:"pointer",
          boxShadow:"0 6px 20px rgba(204,47,60,0.35)",zIndex:999,
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"transform 0.2s, background 0.2s",
        }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.06)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
      >
        {!open && showPulse && (
          <span style={{position:"absolute",inset:0,borderRadius:"50%",background:ds.color.red,opacity:0.4,animation:"dm-chat-pulse 1.6s ease-out infinite",pointerEvents:"none"}}/>
        )}
        <span style={{position:"relative",zIndex:1}}>{open?"✕":"💬"}</span>
      </button>
    </>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────────────────
// v16.9: Sandbox visual indicator — appears on sandbox.dmeastph.com & vercel preview deploys
function SandboxBanner(){
  const [collapsed, setCollapsed] = useState(false);
  if (!IS_SANDBOX) return null;
  if (collapsed) {
    return (
      <button 
        onClick={()=>setCollapsed(false)}
        style={{
          position:"fixed", top:8, right:8, zIndex:9999,
          background:"#FFC107", color:"#1A1A1A",
          border:"none", borderRadius:6, padding:"4px 10px",
          fontSize:11, fontWeight:800, cursor:"pointer",
          fontFamily:"system-ui, sans-serif",
          boxShadow:"0 2px 8px rgba(0,0,0,0.2)",
          letterSpacing:"0.05em",
        }}
        title="Show sandbox indicator"
      >🧪 SANDBOX</button>
    );
  }
  return (
    <>
      {/* Top warning stripe */}
      <div style={{
        position:"fixed", top:0, left:0, right:0, zIndex:9999,
        background:"repeating-linear-gradient(45deg, #FFC107, #FFC107 12px, #1A1A1A 12px, #1A1A1A 24px)",
        height:4, pointerEvents:"none",
      }}/>
      {/* Floating sandbox badge */}
      <div style={{
        position:"fixed", top:10, left:"50%", transform:"translateX(-50%)",
        zIndex:9999,
        background:"#FFC107", color:"#1A1A1A",
        padding:"8px 18px",
        borderRadius:24,
        fontSize:12, fontWeight:800,
        fontFamily:"system-ui, sans-serif",
        letterSpacing:"0.06em",
        boxShadow:"0 4px 12px rgba(0,0,0,0.25)",
        display:"flex", alignItems:"center", gap:10,
        border:"2px solid #1A1A1A",
      }}>
        <span style={{fontSize:16}}>🧪</span>
        <span>SANDBOX ENVIRONMENT — NOT PRODUCTION</span>
        <button 
          onClick={()=>setCollapsed(true)} 
          title="Minimize"
          style={{
            background:"rgba(0,0,0,0.15)", border:"none", color:"#1A1A1A",
            width:18, height:18, borderRadius:9, fontSize:11, lineHeight:1,
            cursor:"pointer", padding:0, fontWeight:700,
          }}
        >−</button>
      </div>
      {/* Bottom warning stripe */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:9999,
        background:"repeating-linear-gradient(45deg, #FFC107, #FFC107 12px, #1A1A1A 12px, #1A1A1A 24px)",
        height:4, pointerEvents:"none",
      }}/>
    </>
  );
}

export default function App(){
  // v16.10: Detect payment return URL params (Maya redirects back with these)
  const [paymentReturn, setPaymentReturn] = useState(()=>{
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("payment");  // "success" | "failure" | "cancel"
    const orderId = params.get("orderId");
    if (status && orderId) return { status, orderId };
    return null;
  });
  
  // Initial page is "paymentReturn" if URL has payment params, else "home"
  const [page,setPageRaw]=useState(paymentReturn ? "paymentReturn" : "home");
  // v16.5: Currently viewed blog post (when page === "blogPost")
  const [activePost,setActivePost]=useState(null);
  // v16.4/v16.5: Update meta tags on page change for SEO + social sharing
  useSEO(page, activePost);
  
  // v16.10: Clean up URL after we've processed payment return params
  useEffect(() => {
    if (paymentReturn && typeof window !== "undefined") {
      // Remove query params from URL bar (keeps the user on same page conceptually)
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [paymentReturn]);
  
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
  const shared={setPage,addToCart,setActiveCategory,activeCategory,wishlist,toggleWishlist,setActivePost};

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
        {page==="cancellation" &&<CancellationPage/>}
        {page==="blog"         &&<BlogPage setPage={setPage} setActivePost={setActivePost}/>}
        {page==="blogPost"     &&<BlogPostPage post={activePost} setPage={setPage} setActivePost={setActivePost}/>}
        {page==="track"        &&<TrackOrderPage/>}
        {page==="paymentReturn"&&<PaymentReturnPage status={paymentReturn?.status} orderId={paymentReturn?.orderId} setPage={setPage}/>}
      </main>
      <Footer setPage={setPage}/>
      <FloatingChat hidden={page === "admin"}/>
      <SandboxBanner/>
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)} onSuccess={handleAuthSuccess}/>}
    </div>
    </ProductsProvider>
  );
}
