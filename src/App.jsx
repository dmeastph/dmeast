/**
 * DMEAST — Medical Solutions Platform
 * Version 4.0 — Light Minimalist Edition
 *
 * SETUP INSTRUCTIONS:
 * 1. Save your logo file as:  public/logo.png  in your Vite project
 * 2. Create a free EmailJS account at emailjs.com
 *    - Add a service (Gmail recommended) → copy Service ID
 *    - Create an email template → copy Template ID
 *    - Go to Account → copy Public Key
 *    - Paste all three into EMAILJS_CONFIG below
 * 3. Run: npm install @emailjs/browser
 *
 * UPDATING PRODUCTS:
 * - Find the PRODUCTS array below
 * - Set imageSrc: "/images/your-photo.jpg" for real photos
 *   (place photos in the public/images/ folder)
 * - Leave imageSrc: null for placeholder
 */

import { useState, useEffect, useCallback } from "react";
// ─── EMAIL SETUP ─────────────────────────────────────────────────────────────
// WHEN DEPLOYING TO PRODUCTION:
//   1. Run: npm install @emailjs/browser
//   2. Uncomment the line below:
//      import emailjs from "@emailjs/browser";
//   3. Fill in EMAILJS_CONFIG below with your EmailJS credentials
//
// For now, emailjs is mocked so the preview/sandbox works correctly.
// The UI, form validation, loading states, and success/error flow are all live.

const emailjs = {
  send: async (serviceId, templateId, params, publicKey) => {
    // Simulates a 1.5 second network request
    await new Promise(resolve => setTimeout(resolve, 1500));
    // In production this line is replaced by the real emailjs.send() call
    // Uncomment to simulate an error instead: throw new Error("Test error");
    return { status: 200, text: "OK" };
  },
};

// ─── EMAILJS CONFIG — fill these in after creating your free account ───────
const EMAILJS_CONFIG = {
  serviceId:           "service_0hvjrv6",
  templateId:          "template_5r24wue",  // Quote + Order notification → to DMEAST
  receiptTemplateId:   "template_adb2so7",  // Customer receipt/confirmation
  publicKey:           "mjS5P17bfCjMw8H2l",   // ← paste your public key here (from EmailJS → Account)
};

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM — Light Minimalist, Brand Red + Gold
// ─────────────────────────────────────────────────────────────────────────────
const ds = {
  color: {
    // Backgrounds — all light
    white:       "#FFFFFF",
    canvas:      "#FAFAFA",
    canvasWarm:  "#FFF8F6",   // very light rose tint (from logo pink)
    canvasGold:  "#FFFBF0",   // very light gold tint

    // Brand Red (#CC2F3C from logo)
    red:         "#CC2F3C",
    redDark:     "#A8252F",
    redLight:    "#FDECEA",   // light rose wash
    redBorder:   "#F5C4C7",

    // Brand Gold (#F0A81C from logo)
    gold:        "#D4900F",   // slightly darker for readability on white
    goldBright:  "#F0A81C",
    goldLight:   "#FEF6E0",
    goldBorder:  "#F5D98A",

    // Brand Pink (the overlapping pink from logo icon)
    pink:        "#E8837A",
    pinkLight:   "#FDF0EE",

    // Text
    textDark:    "#1A1410",   // warm near-black
    textBody:    "#3D3530",   // warm dark brown-grey
    textMuted:   "#7A706A",
    textLight:   "#A89E98",

    // Borders & Dividers
    border:      "#E8E0DA",
    borderLight: "#F0EAE6",

    // Status
    success:     "#1A7F5B",
    successBg:   "#E6F5EF",
    successBorder:"#A3D9C3",
  },
  font: {
    display: "'DM Serif Display', 'Georgia', serif",
    body:    "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 },
  shadow: {
    xs:  "0 1px 4px rgba(26,20,16,0.06)",
    sm:  "0 2px 10px rgba(26,20,16,0.08)",
    md:  "0 4px 20px rgba(26,20,16,0.10)",
    lg:  "0 8px 40px rgba(26,20,16,0.12)",
    red: "0 4px 18px rgba(204,47,60,0.28)",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL CSS
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --red:    #CC2F3C;
    --gold:   #F0A81C;
    --canvas: #FAFAFA;
    --border: #E8E0DA;
    --text:   #1A1410;
    --font-display: 'DM Serif Display', 'Georgia', serif;
    --font-body: 'DM Sans', 'Segoe UI', system-ui, sans-serif;
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: var(--font-body);
    color: var(--text);
    background: #FFFFFF;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button { cursor: pointer; font-family: inherit; }
  a { text-decoration: none; color: inherit; }
  img { display: block; max-width: 100%; }
  input, textarea, select { font-family: inherit; }

  /* Navbar */
  .dm-desktop-nav { display: flex; }
  .dm-mobile-btn  { display: none; }
  @media (max-width: 900px) {
    .dm-desktop-nav { display: none !important; }
    .dm-mobile-btn  { display: flex !important; }
  }

  /* Responsive grids */
  .dm-grid-2    { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  .dm-grid-3    { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .dm-grid-4    { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .dm-grid-hero { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 64px; align-items: center; }
  @media (max-width: 1100px) {
    .dm-grid-hero { grid-template-columns: 1fr; }
    .dm-grid-4    { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 768px) {
    .dm-grid-2 { grid-template-columns: 1fr; }
    .dm-grid-3 { grid-template-columns: 1fr; }
    .dm-grid-4 { grid-template-columns: 1fr; }
  }

  /* Card hover */
  .dm-card-hover {
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  }
  .dm-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 40px rgba(26,20,16,0.12);
    border-color: #F5C4C7 !important;
  }

  /* Nav link underline animation */
  .dm-nav-link {
    position: relative;
    background: none;
    border: none;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.01em;
    padding: 6px 0;
    color: #3D3530;
    transition: color 0.18s;
    cursor: pointer;
  }
  .dm-nav-link::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
    background: var(--red);
    border-radius: 99px;
    transform: scaleX(0);
    transition: transform 0.2s ease;
  }
  .dm-nav-link:hover { color: var(--red); }
  .dm-nav-link:hover::after,
  .dm-nav-link.active::after { transform: scaleX(1); }
  .dm-nav-link.active { color: var(--red); }

  /* Fade in */
  @keyframes dmFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .dm-fade-up   { animation: dmFadeUp 0.5s ease both; }
  .dm-fade-up-1 { animation-delay: 0.08s; }
  .dm-fade-up-2 { animation-delay: 0.16s; }
  .dm-fade-up-3 { animation-delay: 0.24s; }
  .dm-fade-up-4 { animation-delay: 0.32s; }

  /* Section divider pattern */
  .dm-dot-bg {
    background-image: radial-gradient(circle, #E8E0DA 1px, transparent 1px);
    background-size: 24px 24px;
  }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #FAFAFA; }
  ::-webkit-scrollbar-thumb { background: #E8E0DA; border-radius: 99px; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CONTACT = {
  phone1:   "+63 951 040 1708",
  phone1Raw:"+639510401708",
  phone2:   "+63 2 8805 2445",
  phone2Raw:"+63288052445",
  email:    "info@dmeastph.com",
  address:  "1146 M. Natividad Cor. Mayhaligue Sts.",
  address2: "Sta. Cruz, Manila",
  whatsapp: "https://wa.me/639510401708",
  messenger:"https://m.me/dmeast",
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTS = [
  // ── MEDICAL EQUIPMENT ──
  { id: "med-01", category: "medical", name: "Surgical Instrument Set",
    desc: "Complete sterilized surgical instrument set for OB, minor surgery, and diagnostic procedures. Standard and custom configurations available.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "Medical Equipment" },
  { id: "med-02", category: "medical", name: "Patient Monitoring System",
    desc: "Multi-parameter bedside monitor displaying ECG, SpO₂, NIBP, temperature, and respiration rate. Suitable for wards and ICU.",
    price: null, cta: "quote", imageSrc: null, featured: true, tag: "Medical Equipment" },
  { id: "med-03", category: "medical", name: "Emergency Crash Cart",
    desc: "Fully stocked emergency crash cart including defibrillator tray, airway management tools, and resuscitation supplies.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "Medical Equipment" },

  // ── LABORATORY ──
  { id: "lab-01", category: "laboratory", name: "Hematology Analyzer GH 580",
    desc: "Fully automated hematology analyzer with autoloader. Ideal for high-volume hospital labs requiring CBC and differential analysis.",
    price: null, cta: "quote", imageSrc: null, featured: true, tag: "Laboratory Equipment" },
  { id: "lab-02", category: "laboratory", name: "Chemistry Analyzer GH 527",
    desc: "Fully automated clinical chemistry analyzer. High throughput for biochemistry panels in hospital and stand-alone diagnostics.",
    price: null, cta: "quote", imageSrc: null, featured: true, tag: "Laboratory Equipment" },
  { id: "lab-03", category: "laboratory", name: "Coagulation Analyzer GA 200",
    desc: "Fully automated coagulation analyzer for hemostasis testing — PT, APTT, fibrinogen, and D-dimer.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "Laboratory Equipment" },
  { id: "lab-04", category: "laboratory", name: "Centrifuge (Benchtop)",
    desc: "High-speed benchtop centrifuge for routine clinical and research applications. Variable speed and rotor options available.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "Laboratory Equipment" },
  { id: "lab-05", category: "laboratory", name: "Autoclave & Steam Sterilizer",
    desc: "Gravity and pre-vacuum cycle sterilizers for instruments and lab materials. Bench-top and floor-standing models available.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "Laboratory Equipment" },
  { id: "lab-06", category: "laboratory", name: "Bio-Medical Refrigerator",
    desc: "Precision temperature-controlled refrigerator for vaccines, reagents, and biological specimens. Cold-room systems also available.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "Laboratory Equipment" },

  // ── IMAGING ──
  { id: "img-01", category: "imaging", name: "Digital X-Ray System — OCTAVE Series",
    desc: "Digital radiography system with VIVIX-S flat panel detector. Curved design, wheel controller, LCD display, and gentle-sliding bucky.",
    price: null, cta: "sales", imageSrc: null, featured: true, tag: "Imaging Equipment" },
  { id: "img-02", category: "imaging", name: "Mobile / Portable X-Ray Unit",
    desc: "Compact mobile X-ray for bedside imaging in ICU, wards, and emergency departments. Battery-powered and maneuverable.",
    price: null, cta: "sales", imageSrc: null, featured: false, tag: "Imaging Equipment" },
  { id: "img-03", category: "imaging", name: "Portable Color Doppler Ultrasound",
    desc: "Compact color Doppler ultrasound for OB, abdominal, cardiac, and vascular imaging. Ideal for RHUs and clinics.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "Imaging Equipment" },
  { id: "img-04", category: "imaging", name: "CT Scan System",
    desc: "Multi-slice CT scanner for diagnostic imaging. Available in 16 to 128-slice configurations. Installation support included.",
    price: null, cta: "sales", imageSrc: null, featured: false, tag: "Imaging Equipment" },
  { id: "img-05", category: "imaging", name: "MRI System",
    desc: "High-field MRI for neurology, musculoskeletal, and full-body diagnostics. Site planning, installation, and training included.",
    price: null, cta: "sales", imageSrc: null, featured: false, tag: "Imaging Equipment" },
  { id: "img-06", category: "imaging", name: "Mammography System",
    desc: "Digital mammography unit for breast cancer screening. Suitable for diagnostic centers and LGU health initiatives.",
    price: null, cta: "sales", imageSrc: null, featured: false, tag: "Imaging Equipment" },

  // ── ICU & EMERGENCY ──
  { id: "icu-01", category: "icu", name: "ICU Ventilator",
    desc: "Critical care ventilator with multiple ventilation modes (VCV, PCV, SIMV, PSV). For adult and pediatric patients.",
    price: null, cta: "sales", imageSrc: null, featured: true, tag: "ICU & Emergency" },
  { id: "icu-02", category: "icu", name: "Biphasic Defibrillator / AED",
    desc: "Biphasic defibrillator with AED capability, 12-lead ECG, SpO₂, NIBP, and pacing. For ER, ICU, and ambulance use.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "ICU & Emergency" },
  { id: "icu-03", category: "icu", name: "12-Lead ECG Machine",
    desc: "Clinical 12-lead ECG for resting acquisition. Thermal printer, touchscreen, and data export options.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "ICU & Emergency" },

  // ── OB GYNE & PEDIATRICS ──
  { id: "ob-01", category: "obgyne", name: "Neonatal Incubator",
    desc: "Closed servo-controlled incubator for premature infants. Humidity monitoring, access ports, and integrated alarms.",
    price: null, cta: "quote", imageSrc: null, featured: true, tag: "OB Gyne & Pediatrics" },
  { id: "ob-02", category: "obgyne", name: "Infant Radiant Warmer",
    desc: "Open-care radiant warmer for stabilization and resuscitation of newborns. Servo and manual heating modes.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "OB Gyne & Pediatrics" },
  { id: "ob-03", category: "obgyne", name: "OB Delivery Bed",
    desc: "Gynecological delivery and examination bed. Adjustable backrest, leg supports, and drop-down sections.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "OB Gyne & Pediatrics" },
  { id: "ob-04", category: "obgyne", name: "Fetal Doppler",
    desc: "Handheld fetal Doppler for prenatal heart rate monitoring. Waterproof probe available.",
    price: 2850, cta: "buy", imageSrc: null, featured: false, tag: "OB Gyne & Pediatrics" },

  // ── PHARMACEUTICALS ──
  { id: "rx-01", category: "pharma", name: "Amoxicillin 500mg",
    desc: "Broad-spectrum antibiotic. Branded and generic variants. Per box of 100 capsules. Prescription required.",
    price: 850, cta: "buy", imageSrc: null, featured: false, tag: "Pharmaceuticals" },
  { id: "rx-02", category: "pharma", name: "Paracetamol 500mg",
    desc: "Analgesic and antipyretic. OTC product. Available in tablet and suspension. Fast nationwide delivery.",
    price: 320, cta: "buy", imageSrc: null, featured: false, tag: "Pharmaceuticals" },
  { id: "rx-03", category: "pharma", name: "Vitamin C 500mg",
    desc: "High-dose ascorbic acid supplement. OTC. Branded and generic. Box of 100 tablets.",
    price: 420, cta: "buy", imageSrc: null, featured: false, tag: "Pharmaceuticals" },
  { id: "rx-04", category: "pharma", name: "Antibiotics — Institutional Supply",
    desc: "Bulk antibiotic supply for government hospitals, RHUs, and LGU health programs. Volume pricing via quotation.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "Pharmaceuticals" },
  { id: "rx-05", category: "pharma", name: "Vaccine Supply (Government Programs)",
    desc: "Government-grade vaccine supply through accredited distributors for LGU immunization programs.",
    price: null, cta: "sales", imageSrc: null, featured: false, tag: "Pharmaceuticals" },

  // ── SPECIALIZED ──
  { id: "sp-01", category: "specialized", name: "Hemodialysis Machine",
    desc: "Single-pass hemodialysis unit for outpatient dialysis centers. Volumetric ultrafiltration and integrated disinfection.",
    price: null, cta: "sales", imageSrc: null, featured: true, tag: "Specialized Equipment" },
  { id: "sp-02", category: "specialized", name: "Reverse Osmosis (RO) Water System",
    desc: "Medical-grade RO water system for dialysis centers. Customizable flow rates, installation and maintenance support.",
    price: null, cta: "sales", imageSrc: null, featured: false, tag: "Specialized Equipment" },
  { id: "sp-03", category: "specialized", name: "Hyperbaric Chamber (Monoplace)",
    desc: "Monoplace hyperbaric oxygen therapy chamber for wound care, decompression illness, and rehabilitation.",
    price: null, cta: "sales", imageSrc: null, featured: false, tag: "Specialized Equipment" },
  { id: "sp-04", category: "specialized", name: "Air-to-Water Generator",
    desc: "Atmospheric water generator for healthcare facilities in remote areas. Clean potable water from air humidity.",
    price: null, cta: "quote", imageSrc: null, featured: false, tag: "Specialized Equipment" },

  // ── VEHICLES ──
  { id: "veh-01", category: "vehicles", name: "Type II Ambulance",
    desc: "DOH-compliant Type II ambulance van, fully equipped for emergency response. Medical supply package available.",
    price: null, cta: "sales", imageSrc: null, featured: true, tag: "Specialized Vehicles" },
  { id: "veh-02", category: "vehicles", name: "Ambu-Trike",
    desc: "Three-wheel ambulance trike for barangay-level emergency response. Navigates narrow roads. Ideal for LGU programs.",
    price: null, cta: "sales", imageSrc: null, featured: true, tag: "Specialized Vehicles" },
  { id: "veh-03", category: "vehicles", name: "Mobile Clinic Vehicle",
    desc: "Fully equipped mobile clinic for remote healthcare. Examination area, pharmaceutical storage, and power supply.",
    price: null, cta: "sales", imageSrc: null, featured: false, tag: "Specialized Vehicles" },
  { id: "veh-04", category: "vehicles", name: "Super Mobile Clinic",
    desc: "Large-scale mobile clinic for multi-specialty outreach, mass testing, immunization drives, and disaster response.",
    price: null, cta: "sales", imageSrc: null, featured: false, tag: "Specialized Vehicles" },
  { id: "veh-05", category: "vehicles", name: "Fire-Trike",
    desc: "Compact fire-response trike for barangay brigades. Lightweight and easily deployed in dense areas.",
    price: null, cta: "sales", imageSrc: null, featured: false, tag: "Specialized Vehicles" },
];

const CATEGORIES = [
  { id: "medical",     label: "Medical Equipment",     shortLabel: "Medical",     color: "#8B2635", accent: "#CC2F3C" },
  { id: "laboratory",  label: "Laboratory Equipment",  shortLabel: "Laboratory",  color: "#1A5C4A", accent: "#27AE81" },
  { id: "imaging",     label: "Imaging Equipment",     shortLabel: "Imaging",     color: "#2D3A8C", accent: "#4A6AD4" },
  { id: "icu",         label: "ICU & Emergency",       shortLabel: "ICU",         color: "#7A2C10", accent: "#E05A30" },
  { id: "obgyne",      label: "OB Gyne & Pediatrics",  shortLabel: "OB Gyne",    color: "#7A3070", accent: "#C855BE" },
  { id: "pharma",      label: "Pharmaceuticals",       shortLabel: "Pharma",      color: "#3B5A1A", accent: "#6AAB2E" },
  { id: "specialized", label: "Specialized Equipment", shortLabel: "Specialized", color: "#4A3A1A", accent: "#D4943A" },
  { id: "vehicles",    label: "Specialized Vehicles",  shortLabel: "Vehicles",    color: "#1A2B5A", accent: "#3A6FD4" },
];

const CLIENT_TYPES = [
  { label: "Local Government Units (LGUs)",  icon: "🏛️" },
  { label: "Rural Health Units (RHUs)",       icon: "🏥" },
  { label: "Government Hospitals",            icon: "🏨" },
  { label: "Private Hospitals",               icon: "🩺" },
  { label: "Clinics & Diagnostic Centers",   icon: "🔬" },
  { label: "Pharmaceutical Distributors",    icon: "💊" },
  { label: "BPO Companies",                  icon: "🖥️" },
  { label: "Construction Firms",             icon: "🏗️" },
  { label: "Logistics Companies",            icon: "🚚" },
  { label: "Semiconductor Plants",           icon: "⚙️" },
  { label: "Private Individuals",            icon: "👤" },
];

const COMPANY_MILESTONES = [
  { period: "2020", title: "Founded During the Pandemic",
    body: "DM EAST was founded in 2020 amidst the global pandemic, starting with a single box of Covid-19 antibody test kits — a humble beginning fueled by a mission to serve the nation's healthcare needs during its most critical hour." },
  { period: "March 2021", title: "Officially Registered Business",
    body: "After months of groundwork, DM EAST was officially established as a registered online business. Without a physical store, we embraced the digital landscape and built a reliable delivery system for clients nationwide." },
  { period: "February 2022", title: "First Dedicated Office Space",
    body: "Our growth led to our first dedicated office space — a milestone that allowed us to expand our team, formalize operations, and deliver even better service to our growing client base." },
  { period: "July 2022 — Present", title: "Fully Operational, Nationwide",
    body: "DMEAST is now fully operational, serving clients from Abra province to South Cotabato — across Luzon, Visayas, and Mindanao. Our clients include LGUs, government hospitals, private institutions, BPOs, and more." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Submit Your Request", body: "Fill out our quote form or contact us directly with your product list, quantity, and delivery location." },
  { step: "02", title: "We Source & Price",   body: "We verify with authorized local and international suppliers to get you the best price and availability." },
  { step: "03", title: "Review & Confirm",    body: "Receive a detailed quotation, review it, and confirm with your preferred payment method." },
  { step: "04", title: "Delivered Nationwide", body: "DMEAST handles all logistics — from our Manila office to your facility, safely and on schedule." },
];

const PAYMENT_METHODS = [
  { label: "Credit Card", icon: "💳" },
  { label: "Debit Card",  icon: "🏦" },
  { label: "Bank Transfer", icon: "🏛️" },
  { label: "GCash",       icon: "📱" },
  { label: "Maya",        icon: "💜" },
  { label: "QR Payment",  icon: "📲" },
];

const TURNKEY_SERVICES = [
  { title: "Hemodialysis Centers",       body: "Complete dialysis center setup — machines, RO water treatment, consumables, installation, and technical support.", icon: "💧" },
  { title: "Hospital Ward Equipping",    body: "Full equipment packages for ICU, ER, OB wards, and diagnostic areas. Sourced from verified manufacturers.", icon: "🏥" },
  { title: "Mobile Health Programs",     body: "Ambulances, ambu-trikes, mobile clinics, and super mobile clinics for LGU health programs.", icon: "🚑" },
  { title: "Laboratory Setup",           body: "Complete lab equipping for hospitals and RHUs — analyzers, centrifuges, sterilizers, cold storage.", icon: "🔬" },
  { title: "Bulk Pharmaceutical Supply", body: "Large-volume medicine, vaccine, and consumables supply for DOH programs and LGU stockpiling.", icon: "💊" },
  { title: "Specialized Systems",        body: "Hyperbaric chambers, air-to-water generators, and water purification systems for specialized care.", icon: "⚙️" },
];

const formatPHP = (n) => `₱${Number(n).toLocaleString("en-PH")}`;

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Btn({ variant = "primary", size = "md", onClick, children, disabled, fullWidth, href, type = "button" }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 8, fontFamily: ds.font.body, fontWeight: 600, letterSpacing: "0.01em",
    borderRadius: ds.radius.md, border: "2px solid transparent",
    transition: "all 0.18s ease", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1, width: fullWidth ? "100%" : "auto",
    textDecoration: "none",
  };
  const sizes = {
    sm: { fontSize: 13, padding: "8px 18px" },
    md: { fontSize: 14, padding: "11px 24px" },
    lg: { fontSize: 15, padding: "13px 30px" },
    xl: { fontSize: 16, padding: "15px 38px" },
  };
  const variants = {
    primary:   { background: ds.color.red, color: "#fff", borderColor: ds.color.red, boxShadow: ds.shadow.red },
    secondary: { background: "#fff", color: ds.color.red, borderColor: ds.color.red },
    outline:   { background: "#fff", color: ds.color.textBody, borderColor: ds.color.border },
    gold:      { background: ds.color.goldLight, color: ds.color.gold, borderColor: ds.color.goldBorder },
    ghost:     { background: "rgba(204,47,60,0.07)", color: ds.color.red, borderColor: "transparent" },
    dark:      { background: ds.color.textDark, color: "#fff", borderColor: "transparent" },
    success:   { background: ds.color.successBg, color: ds.color.success, borderColor: ds.color.successBorder },
  };
  const style = { ...base, ...sizes[size], ...variants[variant] };
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

function CtaBadge({ type }) {
  const map = {
    buy:   { label: "Buy Now",        bg: ds.color.successBg,  color: ds.color.success, border: ds.color.successBorder },
    quote: { label: "Request Quote",  bg: ds.color.goldLight,  color: ds.color.gold,    border: ds.color.goldBorder },
    sales: { label: "Talk to Sales",  bg: ds.color.redLight,   color: ds.color.red,     border: ds.color.redBorder },
  };
  const t = map[type] || map.quote;
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase", padding: "3px 9px", borderRadius: ds.radius.pill,
      background: t.bg, color: t.color, border: `1px solid ${t.border}`, whiteSpace: "nowrap",
    }}>{t.label}</span>
  );
}

function Tag({ children, color = ds.color.redLight, textColor = ds.color.red }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 12, fontWeight: 500,
      padding: "4px 12px", borderRadius: ds.radius.pill,
      background: color, color: textColor,
    }}>{children}</span>
  );
}

function SectionHeader({ eyebrow, title, subtitle, center, dark }) {
  return (
    <div style={{ textAlign: center ? "center" : "left", marginBottom: 48 }}>
      {eyebrow && (
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: dark ? "rgba(255,255,255,0.6)" : ds.color.red, marginBottom: 10 }}>
          {eyebrow}
        </div>
      )}
      <h2 style={{ fontFamily: ds.font.display, fontSize: "clamp(1.75rem, 3vw, 2.3rem)", fontWeight: 400, color: dark ? "#fff" : ds.color.textDark, lineHeight: 1.25, marginBottom: subtitle ? 14 : 0 }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 15, color: dark ? "rgba(255,255,255,0.65)" : ds.color.textMuted, lineHeight: 1.75, maxWidth: center ? 560 : "none", margin: center ? "0 auto" : 0 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// Logo component — uses real image from public/logo.png
function DMEastLogo({ height = 40, darkMode = false }) {
  return (
    <img
      src="/logo.png"
      alt="DM EAST — Your Source for Quality Medical Solutions"
      style={{
        height: height,
        width: "auto",
        objectFit: "contain",
        filter: darkMode ? "brightness(0) invert(1)" : "none",
      }}
      onError={(e) => {
        // Fallback text wordmark if logo.png is not yet added
        e.target.style.display = "none";
        e.target.nextSibling.style.display = "flex";
      }}
    />
  );
}

function LogoFallback({ height = 40, darkMode = false }) {
  const textColor = darkMode ? "#fff" : ds.color.textDark;
  const goldColor = "#F0A81C";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height }}>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: height * 0.55, fontStyle: "italic", color: textColor, textTransform: "uppercase", lineHeight: 1 }}>DM</span>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: height * 0.55, fontStyle: "italic", color: goldColor, textTransform: "uppercase", lineHeight: 1, marginLeft: 4 }}>EAST</span>
    </div>
  );
}

function BrandLogo({ height = 40, darkMode = false }) {
  return (
    <div style={{ position: "relative" }}>
      <DMEastLogo height={height} darkMode={darkMode} />
      <div style={{ display: "none", alignItems: "center", gap: 2 }}>
        <LogoFallback height={height} darkMode={darkMode} />
      </div>
    </div>
  );
}

function ProductImg({ imageSrc, category, name, height = 180 }) {
  const cat = CATEGORIES.find(c => c.id === category) || { color: "#8B2635", accent: "#CC2F3C" };
  if (imageSrc) {
    return (
      <div style={{ height, overflow: "hidden", borderRadius: `${ds.radius.md}px ${ds.radius.md}px 0 0`, background: ds.color.canvas }}>
        <img src={imageSrc} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{
      height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(145deg, ${cat.color}18, ${cat.color}0A)`,
      borderRadius: `${ds.radius.md}px ${ds.radius.md}px 0 0`,
      border: `1px solid ${cat.color}20`, borderBottom: "none",
      position: "relative", overflow: "hidden",
    }}>
      <div className="dm-dot-bg" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: `${cat.accent}18`, border: `1.5px solid ${cat.accent}30`, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: `${cat.accent}40`, transform: "rotate(12deg)" }} />
        </div>
        <div style={{ fontSize: 11, color: cat.color, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.7 }}>Image Coming Soon</div>
      </div>
    </div>
  );
}

function ProductCard({ product, addToCart, setPage }) {
  const [feedback, setFeedback] = useState(null);
  const handleBuy = useCallback(() => {
    addToCart(product);
    setFeedback("added");
    setTimeout(() => setFeedback(null), 2000);
  }, [product, addToCart]);

  return (
    <div className="dm-card-hover" style={{
      background: ds.color.white, border: `1px solid ${ds.color.border}`,
      borderRadius: ds.radius.lg, overflow: "hidden", boxShadow: ds.shadow.xs,
    }}>
      <ProductImg imageSrc={product.imageSrc} category={product.category} name={product.name} />
      <div style={{ padding: "18px 20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: ds.color.textDark, lineHeight: 1.35, flex: 1 }}>{product.name}</h3>
          <CtaBadge type={product.cta} />
        </div>
        <p style={{ fontSize: 12.5, color: ds.color.textMuted, lineHeight: 1.6, marginBottom: 16 }}>{product.desc}</p>
        {product.price && <div style={{ fontSize: 18, fontWeight: 700, color: ds.color.textDark, marginBottom: 14 }}>{formatPHP(product.price)}</div>}
        {product.cta === "buy"   && <Btn variant={feedback === "added" ? "success" : "primary"} size="sm" fullWidth onClick={handleBuy}>{feedback === "added" ? "✓ Added to Cart" : "Add to Cart"}</Btn>}
        {product.cta === "quote" && <Btn variant="gold" size="sm" fullWidth onClick={() => setPage("quote")}>Request Quote</Btn>}
        {product.cta === "sales" && <Btn variant="secondary" size="sm" fullWidth onClick={() => setPage("contact")}>Talk to Sales</Btn>}
      </div>
    </div>
  );
}

function CategoryCard({ cat, onClick }) {
  return (
    <button onClick={onClick} className="dm-card-hover" style={{
      background: ds.color.white, border: `1px solid ${ds.color.border}`,
      borderRadius: ds.radius.lg, overflow: "hidden", textAlign: "left",
      boxShadow: ds.shadow.xs, padding: 0, width: "100%",
    }}>
      <div style={{ height: 5, background: `linear-gradient(90deg, ${cat.color}, ${cat.accent})` }} />
      <div style={{ padding: "20px 22px 22px" }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: ds.color.textDark, marginBottom: 5 }}>{cat.label}</div>
        <div style={{ fontSize: 12, color: ds.color.textMuted }}>
          {PRODUCTS.filter(p => p.category === cat.id).length} products available
        </div>
        <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: cat.accent }}>Explore →</div>
      </div>
    </button>
  );
}

function PageHero({ eyebrow, title, subtitle }) {
  return (
    <div style={{
      background: `linear-gradient(160deg, ${ds.color.canvasWarm} 0%, ${ds.color.white} 100%)`,
      padding: "72px 24px 64px",
      borderBottom: `1px solid ${ds.color.border}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${ds.color.red}, ${ds.color.goldBright})` }} />
      <div className="dm-dot-bg" style={{ position: "absolute", right: 0, top: 0, width: "40%", height: "100%", opacity: 0.5 }} />
      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative" }}>
        {eyebrow && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: ds.color.red, marginBottom: 12 }}>{eyebrow}</div>}
        <h1 style={{ fontFamily: ds.font.display, fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 400, color: ds.color.textDark, lineHeight: 1.2, marginBottom: 16 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 16, color: ds.color.textMuted, lineHeight: 1.7, maxWidth: 600, margin: "0 auto" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: ds.color.borderLight }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────────────────────────────────────
function Navbar({ activePage, setPage, cartCount }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled,  setScrolled]  = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { id: "home",     label: "Home" },
    { id: "about",    label: "About Us" },
    { id: "products", label: "Products" },
    { id: "services", label: "Services" },
    { id: "quote",    label: "Request Quote" },
    { id: "contact",  label: "Contact" },
  ];

  const navigate = (id) => { setPage(id); setMenuOpen(false); };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? "rgba(255,255,255,0.97)" : "#fff",
      backdropFilter: "blur(12px)",
      borderBottom: `1px solid ${scrolled ? ds.color.border : ds.color.borderLight}`,
      boxShadow: scrolled ? ds.shadow.sm : "none",
      transition: "all 0.25s ease",
    }}>
      {/* Red accent top line */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${ds.color.red}, ${ds.color.goldBright})` }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        {/* Logo */}
        <button onClick={() => navigate("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
          <BrandLogo height={38} />
        </button>

        {/* Desktop nav */}
        <div className="dm-desktop-nav" style={{ alignItems: "center", gap: 8 }}>
          {links.map(l => (
            <button key={l.id} onClick={() => navigate(l.id)}
              className={`dm-nav-link ${activePage === l.id ? "active" : ""}`}>
              {l.label}
            </button>
          ))}
          <div style={{ marginLeft: 16, display: "flex", gap: 10 }}>
            <Btn variant="outline" size="sm" onClick={() => navigate("cart")}>
              🛒 Cart {cartCount > 0 && <span style={{ background: ds.color.red, color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{cartCount}</span>}
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => navigate("quote")}>Get a Quote</Btn>
          </div>
        </div>

        {/* Mobile toggle */}
        <button className="dm-mobile-btn" onClick={() => setMenuOpen(o => !o)}
          style={{ background: "none", border: "none", fontSize: 22, color: ds.color.textDark, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: "#fff", borderTop: `1px solid ${ds.color.border}`, padding: "16px 24px 24px" }}>
          {links.map(l => (
            <button key={l.id} onClick={() => navigate(l.id)} style={{
              display: "block", width: "100%", textAlign: "left",
              background: activePage === l.id ? ds.color.redLight : "none",
              border: "none", cursor: "pointer",
              color: activePage === l.id ? ds.color.red : ds.color.textBody,
              fontSize: 15, fontWeight: 500, padding: "12px 14px",
              borderRadius: ds.radius.md, marginBottom: 2, fontFamily: ds.font.body,
            }}>{l.label}</button>
          ))}
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <Btn variant="outline" size="sm" onClick={() => navigate("cart")} fullWidth>🛒 Cart ({cartCount})</Btn>
            <Btn variant="primary" size="sm" onClick={() => navigate("quote")} fullWidth>Get a Quote</Btn>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME SECTIONS
// ─────────────────────────────────────────────────────────────────────────────
function HeroSection({ setPage }) {
  return (
    <section style={{
      background: `linear-gradient(150deg, ${ds.color.canvasWarm} 0%, ${ds.color.white} 60%, ${ds.color.canvasGold} 100%)`,
      padding: "88px 0 80px", position: "relative", overflow: "hidden",
    }}>
      {/* Decorative dot pattern right side */}
      <div className="dm-dot-bg" style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100%", opacity: 0.6, pointerEvents: "none" }} />
      {/* Gold arc decoration */}
      <div style={{ position: "absolute", top: "-60px", right: "-60px", width: 360, height: 360, borderRadius: "50%", border: `2px solid ${ds.color.goldBright}25`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "-20px", right: "-20px", width: 240, height: 240, borderRadius: "50%", border: `1px solid ${ds.color.red}15`, pointerEvents: "none" }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px", position: "relative", zIndex: 1 }}>
        <div className="dm-grid-hero">
          {/* Left */}
          <div>
            {/* Pill badge */}
            <div className="dm-fade-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: ds.color.redLight, border: `1px solid ${ds.color.redBorder}`, borderRadius: ds.radius.pill, padding: "6px 16px 6px 8px", marginBottom: 28 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: ds.color.red, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🇵🇭</span>
              <span style={{ fontSize: 12, color: ds.color.red, fontWeight: 600, letterSpacing: "0.04em" }}>Philippine-Based · Nationwide · Est. 2020</span>
            </div>

            <h1 className="dm-fade-up dm-fade-up-1" style={{ fontFamily: ds.font.display, fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)", fontWeight: 400, color: ds.color.textDark, lineHeight: 1.12, marginBottom: 6 }}>
              Your Source for
            </h1>
            <h1 className="dm-fade-up dm-fade-up-2" style={{ fontFamily: ds.font.display, fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)", fontWeight: 400, lineHeight: 1.12, marginBottom: 24 }}>
              <span style={{ color: ds.color.red }}>Quality Medical</span>
              <br />
              <span style={{ color: ds.color.textDark }}>Solutions.</span>
            </h1>

            <p className="dm-fade-up dm-fade-up-3" style={{ fontSize: 16, color: ds.color.textMuted, lineHeight: 1.8, maxWidth: 500, marginBottom: 36 }}>
              DMEAST supplies hospitals, LGUs, RHUs, and institutions across the Philippines with medical equipment, pharmaceuticals, laboratory systems, and specialized healthcare solutions.
            </p>

            <div className="dm-fade-up dm-fade-up-4" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 44 }}>
              <Btn variant="primary" size="lg" onClick={() => setPage("products")}>Browse Products</Btn>
              <Btn variant="secondary" size="lg" onClick={() => setPage("quote")}>Request a Quote</Btn>
            </div>

            {/* Trust signals */}
            <div className="dm-fade-up dm-fade-up-4" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[
                ["🏛️", "Government & Private"],
                ["🇵🇭", "Nationwide Coverage"],
                ["🌐", "Intl. Sourcing"],
                ["📋", "Procurement-Based"],
              ].map(([icon, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: ds.color.textMuted, fontWeight: 500 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Stats + Model card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 4 stat tiles */}
            <div className="dm-grid-4" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
              {[
                { v: "5+",   l: "Years in Operation", accent: ds.color.red },
                { v: "3",    l: "Island Groups",       accent: ds.color.goldBright },
                { v: "500+", l: "Clients Nationwide",  accent: ds.color.red },
                { v: "8",    l: "Product Categories",  accent: ds.color.goldBright },
              ].map((s, i) => (
                <div key={i} style={{
                  background: ds.color.white, border: `1px solid ${ds.color.border}`,
                  borderRadius: ds.radius.lg, padding: "22px 18px", textAlign: "center",
                  borderTop: `3px solid ${s.accent}`, boxShadow: ds.shadow.xs,
                }}>
                  <div style={{ fontFamily: ds.font.display, fontSize: "2rem", color: s.accent, lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: ds.color.textMuted, marginTop: 6, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Procurement model card */}
            <div style={{ background: ds.color.textDark, borderRadius: ds.radius.lg, padding: "22px 24px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: ds.color.goldBright, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Our Model</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Procurement-Based Supply</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>We source from authorized suppliers on-demand — no heavy inventory overhead. Transparent pricing from single units to full facility setups.</div>
            </div>

            {/* Mini CTA row */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPage("services")} style={{
                flex: 1, background: ds.color.redLight, border: `1px solid ${ds.color.redBorder}`,
                borderRadius: ds.radius.md, padding: "13px", cursor: "pointer",
                fontFamily: ds.font.body, fontSize: 13, fontWeight: 600, color: ds.color.red,
              }}>Turnkey Projects →</button>
              <button onClick={() => setPage("about")} style={{
                flex: 1, background: ds.color.canvas, border: `1px solid ${ds.color.border}`,
                borderRadius: ds.radius.md, padding: "13px", cursor: "pointer",
                fontFamily: ds.font.body, fontSize: 13, fontWeight: 600, color: ds.color.textMuted,
              }}>Our Story →</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoriesSection({ setPage, setActiveCategory }) {
  return (
    <section style={{ background: ds.color.canvas, padding: "80px 28px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader eyebrow="Full Catalog" title="What We Supply" subtitle="Eight specialized categories covering the full spectrum of healthcare and institutional medical needs." center />
        <div className="dm-grid-4">
          {CATEGORIES.map(cat => (
            <CategoryCard key={cat.id} cat={cat} onClick={() => { setActiveCategory(cat.id); setPage("products"); }} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategorySpotlight({ catId, title, eyebrow, desc, setPage, addToCart, setActiveCategory, flip }) {
  const items = PRODUCTS.filter(p => p.category === catId).slice(0, 3);
  const cat   = CATEGORIES.find(c => c.id === catId);
  return (
    <section style={{ background: flip ? ds.color.canvas : ds.color.white, padding: "72px 28px", borderTop: `1px solid ${ds.color.borderLight}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 56, alignItems: "start" }}>
          <div style={{ position: "sticky", top: 88 }}>
            <div style={{ width: 40, height: 4, background: `linear-gradient(90deg, ${cat.color}, ${cat.accent})`, borderRadius: 99, marginBottom: 18 }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: ds.color.textLight, marginBottom: 10 }}>{eyebrow}</div>
            <h2 style={{ fontFamily: ds.font.display, fontSize: "clamp(1.5rem, 2.2vw, 1.9rem)", fontWeight: 400, color: ds.color.textDark, lineHeight: 1.3, marginBottom: 14 }}>{title}</h2>
            <p style={{ fontSize: 14, color: ds.color.textMuted, lineHeight: 1.75, marginBottom: 24 }}>{desc}</p>
            <Btn variant="secondary" size="sm" onClick={() => { setActiveCategory(catId); setPage("products"); }}>View All →</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 18 }}>
            {items.map(p => <ProductCard key={p.id} product={p} addToCart={addToCart} setPage={setPage} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhoWeServeSection() {
  return (
    <section style={{ background: ds.color.textDark, padding: "80px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${ds.color.red}, ${ds.color.goldBright}, ${ds.color.red})` }} />
      <div className="dm-dot-bg" style={{ position: "absolute", inset: 0, opacity: 0.15 }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        <SectionHeader eyebrow="Our Clients" title="Who We Serve" subtitle="DMEAST serves a wide range of government, private, and institutional clients across the Philippines." center dark />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {CLIENT_TYPES.map(c => (
            <div key={c.label} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: ds.radius.lg, padding: "18px 16px",
              display: "flex", alignItems: "center", gap: 12,
              transition: "background 0.2s, border-color 0.2s", cursor: "default",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = `rgba(204,47,60,0.15)`; e.currentTarget.style.borderColor = `rgba(204,47,60,0.3)`; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{c.icon}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", fontWeight: 500, lineHeight: 1.4 }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section style={{ background: ds.color.white, padding: "80px 28px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader eyebrow="Our Process" title="How It Works" subtitle="A simple, transparent four-step procurement process built for institutional and individual buyers alike." center />
        <div className="dm-grid-4">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={i} style={{ position: "relative" }}>
              {i < HOW_IT_WORKS.length - 1 && (
                <div style={{ position: "absolute", top: 26, left: "calc(50% + 26px)", right: "-50%", height: 1, background: `linear-gradient(90deg, ${ds.color.redBorder}, ${ds.color.borderLight})`, zIndex: 0 }} className="dm-desktop-nav" />
              )}
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", background: ds.color.red,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: ds.font.display, fontSize: 17, color: "#fff",
                  marginBottom: 18, boxShadow: ds.shadow.red,
                }}>{s.step}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: ds.color.textDark, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: ds.color.textMuted, lineHeight: 1.7 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TurnkeySection({ setPage }) {
  return (
    <section style={{ background: ds.color.canvasWarm, padding: "80px 28px", borderTop: `1px solid ${ds.color.borderLight}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start" }}>
          <div>
            <SectionHeader eyebrow="Beyond Products" title="Turnkey Healthcare Solutions" subtitle="DMEAST delivers complete healthcare infrastructure for government programs and institutional buyers — from procurement to installation." />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {["Full dialysis center setup", "Mobile health unit procurement", "Hospital ward equipping", "Complete laboratory setup", "Bulk pharmaceutical supply"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: ds.color.red, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: ds.color.textBody }}>{item}</span>
                </div>
              ))}
            </div>
            <Btn variant="primary" size="md" onClick={() => setPage("services")}>View All Services</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {TURNKEY_SERVICES.slice(0, 4).map((s, i) => (
              <div key={i} style={{ background: ds.color.white, border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.lg, padding: "20px 18px", boxShadow: ds.shadow.xs }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: ds.color.textDark, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: ds.color.textMuted, lineHeight: 1.6 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PaymentSection() {
  return (
    <section style={{ background: ds.color.white, padding: "72px 28px", borderTop: `1px solid ${ds.color.borderLight}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
          <div>
            <SectionHeader eyebrow="Payment Options" title="Flexible Ways to Pay" subtitle="Direct checkout for low-ticket items. Formal quotation for equipment and project-based orders." />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { type: "buy",   desc: "Direct checkout for OTC products, selected pharma, and consumables." },
                { type: "quote", desc: "RFQ process for medical equipment and institutional supply." },
                { type: "sales", desc: "Formal proposal for high-ticket, regulated, or project-based orders." },
              ].map(t => (
                <div key={t.type} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: ds.color.canvas, borderRadius: ds.radius.md, border: `1px solid ${ds.color.borderLight}` }}>
                  <CtaBadge type={t.type} />
                  <span style={{ fontSize: 13, color: ds.color.textMuted, lineHeight: 1.5 }}>{t.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: ds.color.textMuted, marginBottom: 16, letterSpacing: "0.1em", textTransform: "uppercase" }}>Accepted Payment Methods</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {PAYMENT_METHODS.map(m => (
                <div key={m.label} style={{ background: ds.color.canvas, border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.md, padding: "16px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: ds.color.textBody }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaBanner({ setPage }) {
  return (
    <section style={{ background: ds.color.red, padding: "72px 28px", position: "relative", overflow: "hidden" }}>
      <div className="dm-dot-bg" style={{ position: "absolute", inset: 0, opacity: 0.15 }} />
      <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <h2 style={{ fontFamily: ds.font.display, fontSize: "clamp(1.9rem, 3.5vw, 2.6rem)", fontWeight: 400, color: "#fff", lineHeight: 1.25, marginBottom: 16 }}>
          Need Medical Equipment or Supplies?
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", marginBottom: 32, lineHeight: 1.7 }}>
          From a single item to a full hospital setup — DMEAST sources it for you, nationwide.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn variant="dark" size="xl" onClick={() => setPage("quote")}>Get a Free Quote</Btn>
          <Btn size="xl" onClick={() => setPage("contact")} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "2px solid rgba(255,255,255,0.4)" }}>Contact Us</Btn>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGES
// ─────────────────────────────────────────────────────────────────────────────

function HomePage({ setPage, addToCart, setActiveCategory }) {
  return (
    <div>
      <HeroSection setPage={setPage} />
      <CategoriesSection setPage={setPage} setActiveCategory={setActiveCategory} />

      <CategorySpotlight catId="laboratory" title="Laboratory Equipment" eyebrow="Analyzers & Systems"
        desc="Chemistry analyzers, hematology systems, coagulation machines, centrifuges, autoclaves, and cold storage for complete lab setups."
        setPage={setPage} addToCart={addToCart} setActiveCategory={setActiveCategory} flip={false} />

      <CategorySpotlight catId="imaging" title="Imaging Equipment" eyebrow="Diagnostic Imaging"
        desc="Digital X-ray, portable units, ultrasound, CT scanners, MRI systems, and mammography from verified manufacturers."
        setPage={setPage} addToCart={addToCart} setActiveCategory={setActiveCategory} flip={true} />

      <CategorySpotlight catId="pharma" title="Pharmaceuticals" eyebrow="Medicines & Vaccines"
        desc="Branded and generic medicines, vaccines, OTC products, antibiotics, and maintenance medications from licensed distributors."
        setPage={setPage} addToCart={addToCart} setActiveCategory={setActiveCategory} flip={false} />

      <CategorySpotlight catId="specialized" title="Specialized Equipment" eyebrow="Advanced Systems"
        desc="Hemodialysis machines, RO water systems, hyperbaric chambers, and air-to-water generators for specialized care settings."
        setPage={setPage} addToCart={addToCart} setActiveCategory={setActiveCategory} flip={true} />

      <CategorySpotlight catId="vehicles" title="Specialized Vehicles" eyebrow="Mobile Healthcare"
        desc="DOH-compliant ambulances, ambu-trikes, mobile clinics, fire-trikes, and super mobile clinic vehicles for LGU programs."
        setPage={setPage} addToCart={addToCart} setActiveCategory={setActiveCategory} flip={false} />

      <WhoWeServeSection />
      <HowItWorksSection />
      <TurnkeySection setPage={setPage} />
      <PaymentSection />
      <CtaBanner setPage={setPage} />
    </div>
  );
}

function AboutPage() {
  return (
    <div style={{ paddingTop: 67 }}>
      <PageHero eyebrow="About DMEAST" title="From a Single Test Kit to a Nationwide Solution" subtitle="Founded in 2020 during the pandemic, DMEAST has grown into a trusted medical trading company serving all three Philippine island groups." />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 28px" }}>

        {/* Timeline */}
        <div style={{ marginBottom: 72 }}>
          <SectionHeader eyebrow="Company History" title="Our Journey" />
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 25, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${ds.color.red}, ${ds.color.goldBright})` }} />
            {COMPANY_MILESTONES.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 32, marginBottom: 40, position: "relative" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, background: ds.color.red, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ds.font.display, color: "#fff", fontSize: 15, boxShadow: ds.shadow.red, zIndex: 1 }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div style={{ paddingBottom: 40, borderBottom: i < COMPANY_MILESTONES.length - 1 ? `1px solid ${ds.color.borderLight}` : "none", flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ds.color.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{m.period}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: ds.color.textDark, marginBottom: 10, fontFamily: ds.font.display }}>{m.title}</div>
                  <div style={{ fontSize: 15, color: ds.color.textBody, lineHeight: 1.8 }}>{m.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mission / Vision */}
        <div className="dm-grid-2" style={{ marginBottom: 72 }}>
          {[
            { label: "Mission", bg: ds.color.textDark,  tc: "rgba(255,255,255,0.82)", ec: ds.color.goldBright,
              text: "To simplify the procurement process by providing a seamless experience for our clients — assisting them in acquiring reliable and effective medical equipment and supplies with prompt delivery. Each product and service is carefully tailored to meet the unique needs of every individual we serve." },
            { label: "Vision",  bg: ds.color.red,         tc: "rgba(255,255,255,0.88)", ec: "rgba(255,255,255,0.65)",
              text: "To establish ourselves as a trusted and reliable medical supply provider, offering an extensive range — from everyday consumables to advanced equipment — for both private and government markets, upholding our tagline: \"Your Source For Quality Medical Solutions.\"" },
          ].map((item, i) => (
            <div key={i} style={{ background: item.bg, borderRadius: ds.radius.xl, padding: "36px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: item.ec, marginBottom: 12 }}>Our {item.label}</div>
              <p style={{ fontSize: 15, color: item.tc, lineHeight: 1.85 }}>{item.text}</p>
            </div>
          ))}
        </div>

        {/* Business Model */}
        <div style={{ marginBottom: 72 }}>
          <SectionHeader eyebrow="How We Operate" title="Our Business Model" subtitle="Procurement-based and demand-driven — we source on actual client orders, keeping prices competitive with all products from authorized suppliers." />
          <div className="dm-grid-4">
            {[
              { icon: "📦", title: "No Heavy Inventory", desc: "We procure on demand — no warehouse overhead, better pricing, and broader product access." },
              { icon: "✅", title: "Authorized Sources", desc: "All products sourced from licensed local and international distributors. No grey market." },
              { icon: "🚚", title: "Direct Delivery",    desc: "DMEAST handles end-to-end logistics nationwide — from Manila to your facility." },
              { icon: "📋", title: "Any Scale",          desc: "From a single medicine box to a complete hospital setup — we handle any volume." },
            ].map(s => (
              <div key={s.title} style={{ background: ds.color.canvas, border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.lg, padding: "22px", borderTop: `3px solid ${ds.color.red}` }}>
                <div style={{ fontSize: 26, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: ds.color.textDark, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: ds.color.textMuted, lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Who We Serve */}
        <div>
          <SectionHeader eyebrow="Client Base" title="Who We Serve" subtitle="Our clientele goes beyond hospitals and LGUs — we serve the full spectrum of public and private sector clients." />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {CLIENT_TYPES.map(c => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8, background: ds.color.redLight, border: `1px solid ${ds.color.redBorder}`, borderRadius: ds.radius.pill, padding: "7px 16px" }}>
                <span style={{ fontSize: 14 }}>{c.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: ds.color.red }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsPage({ addToCart, setPage, activeCategory, setActiveCategory }) {
  const [search, setSearch] = useState("");
  const filtered = PRODUCTS.filter(p => {
    const inCat = !activeCategory || p.category === activeCategory;
    const inSearch = !search || [p.name, p.desc, p.tag].join(" ").toLowerCase().includes(search.toLowerCase());
    return inCat && inSearch;
  });

  return (
    <div style={{ paddingTop: 67 }}>
      <PageHero eyebrow="Product Catalog" title="Medical, Laboratory & Specialized Equipment" subtitle="Low-ticket items available for direct purchase. Equipment and specialized systems proceed via quotation." />

      {/* Sticky filter bar */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${ds.color.border}`, position: "sticky", top: 67, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 28px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: ds.color.textLight }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
              style={{ width: "100%", padding: "9px 14px 9px 36px", border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.md, fontSize: 14, outline: "none", fontFamily: ds.font.body, color: ds.color.textDark, boxSizing: "border-box", background: ds.color.canvas }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setActiveCategory(null)} style={{ padding: "7px 14px", borderRadius: ds.radius.pill, border: `1.5px solid ${!activeCategory ? ds.color.red : ds.color.border}`, background: !activeCategory ? ds.color.redLight : "#fff", color: !activeCategory ? ds.color.red : ds.color.textMuted, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: ds.font.body }}>All</button>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)} style={{ padding: "7px 14px", borderRadius: ds.radius.pill, border: `1.5px solid ${activeCategory === c.id ? ds.color.red : ds.color.border}`, background: activeCategory === c.id ? ds.color.redLight : "#fff", color: activeCategory === c.id ? ds.color.red : ds.color.textMuted, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: ds.font.body }}>{c.shortLabel}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 28px" }}>
        <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 14, color: ds.color.textMuted }}>{filtered.length} product{filtered.length !== 1 ? "s" : ""} found</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Tag color={ds.color.successBg} textColor={ds.color.success}>Buy Now = direct checkout</Tag>
            <Tag color={ds.color.goldLight} textColor={ds.color.gold}>Quote = RFQ process</Tag>
            <Tag color={ds.color.redLight} textColor={ds.color.red}>Sales = project inquiry</Tag>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "72px 0" }}>
            <div style={{ fontFamily: ds.font.display, fontSize: 22, color: ds.color.textDark, marginBottom: 10 }}>No products found</div>
            <div style={{ fontSize: 14, color: ds.color.textMuted, marginBottom: 24 }}>Try a different keyword or reset the filter.</div>
            <Btn variant="secondary" size="sm" onClick={() => { setSearch(""); setActiveCategory(null); }}>Clear Filters</Btn>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(265px, 1fr))", gap: 22 }}>
            {filtered.map(p => <ProductCard key={p.id} product={p} addToCart={addToCart} setPage={setPage} />)}
          </div>
        )}

        {/* Source on demand */}
        <div style={{ marginTop: 52, background: ds.color.canvasGold, border: `1px solid ${ds.color.goldBorder}`, borderRadius: ds.radius.xl, padding: "28px 32px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: ds.color.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Procurement on Demand</div>
            <div style={{ fontFamily: ds.font.display, fontSize: 19, color: ds.color.textDark, marginBottom: 6 }}>Can't find what you need?</div>
            <div style={{ fontSize: 14, color: ds.color.textBody, lineHeight: 1.65 }}>We can source almost any medical product. Send us your specifications and we'll respond within 24–48 hours.</div>
          </div>
          <Btn variant="gold" size="lg" onClick={() => setPage("quote")}>Request a Custom Quote</Btn>
        </div>
      </div>
    </div>
  );
}

function ServicesPage({ setPage }) {
  return (
    <div style={{ paddingTop: 67 }}>
      <PageHero eyebrow="Services & Projects" title="Beyond Supply — Complete Healthcare Solutions" subtitle="From single-unit procurement to full turnkey facility setups, DMEAST is your end-to-end medical solutions partner." />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 28px" }}>
        <SectionHeader eyebrow="What We Deliver" title="Our Service Offerings" subtitle="For government health programs, private facilities, and institutional buyers." center />
        <div className="dm-grid-3" style={{ marginBottom: 64 }}>
          {TURNKEY_SERVICES.map((s, i) => (
            <div key={i} style={{ background: ds.color.white, border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.xl, padding: "32px 28px", boxShadow: ds.shadow.xs }}>
              <div style={{ fontSize: 36, marginBottom: 18 }}>{s.icon}</div>
              <div style={{ fontFamily: ds.font.display, fontSize: 18, color: ds.color.textDark, marginBottom: 10 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: ds.color.textMuted, lineHeight: 1.75 }}>{s.body}</div>
            </div>
          ))}
        </div>

        {/* Project types */}
        <div style={{ background: ds.color.canvas, borderRadius: ds.radius.xl, padding: "44px 40px", marginBottom: 40 }}>
          <SectionHeader eyebrow="Project-Based Procurement" title="High-Value Healthcare Projects" subtitle="DMEAST manages large-scale, multi-component procurement for government and institutional clients." />
          <div className="dm-grid-4">
            {[
              ["💉", "Dialysis Centers",    "Machines, RO systems, consumables, infrastructure"],
              ["🚑", "Mobile Health Units", "Ambulances, trikes, and mobile clinics for LGUs"],
              ["🏥", "Hospital Ward Setup", "Full ICU, ER, OB ward, and diagnostic area equipping"],
              ["🧪", "Laboratory Setup",    "Complete lab equipment for public and private facilities"],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ background: ds.color.white, border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.lg, padding: "22px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: ds.color.textDark, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12.5, color: ds.color.textMuted, lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Services CTA */}
        <div style={{ background: ds.color.red, borderRadius: ds.radius.xl, padding: "48px 44px", textAlign: "center" }}>
          <div style={{ fontFamily: ds.font.display, fontSize: "clamp(1.5rem, 2.5vw, 2.1rem)", color: "#fff", marginBottom: 12 }}>Have a Project in Mind?</div>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", marginBottom: 28, maxWidth: 480, margin: "0 auto 28px" }}>Tell us about your healthcare program or facility need and we'll prepare a tailored proposal within 24–48 hours.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn variant="dark" size="lg" onClick={() => setPage("quote")}>Submit Project Inquiry</Btn>
            <Btn size="lg" onClick={() => setPage("contact")} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "2px solid rgba(255,255,255,0.4)" }}>Speak to Sales</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QUOTE PAGE with EmailJS ──────────────────────────────────────────────────
function QuotePage() {
  const EMPTY = { name: "", company: "", email: "", phone: "", product: "", qty: "", budget: "", location: "", timeline: "", details: "" };
  const [form,      setForm]      = useState(EMPTY);
  const [status,    setStatus]    = useState("idle"); // idle | sending | success | error
  const [errorMsg,  setErrorMsg]  = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const requiredFilled = form.name && form.email && form.phone && form.product;

  const handleSubmit = async () => {
    if (!requiredFilled) return;
    setStatus("sending");
    try {
      // Send notification email to DMEAST
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        {
          from_name:    form.name,
          company:      form.company || "N/A",
          from_email:   form.email,
          phone:        form.phone,
          product:      form.product,
          quantity:     form.qty     || "Not specified",
          budget:       form.budget  || "Not specified",
          location:     form.location,
          timeline:     form.timeline || "Not specified",
          details:      form.details  || "None",
          reply_to:     form.email,
        },
        EMAILJS_CONFIG.publicKey
      );
      // Send receipt to client (optional — only if receiptTemplateId is configured)
      if (EMAILJS_CONFIG.receiptTemplateId && EMAILJS_CONFIG.receiptTemplateId !== "YOUR_RECEIPT_TEMPLATE_ID") {
        await emailjs.send(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.receiptTemplateId,
          { to_name: form.name, to_email: form.email, product: form.product },
          EMAILJS_CONFIG.publicKey
        );
      }
      setStatus("success");
      setForm(EMPTY);
    } catch (err) {
      setStatus("error");
      setErrorMsg("Something went wrong. Please email us directly at " + CONTACT.email);
    }
  };

  const input = {
    width: "100%", padding: "11px 14px",
    border: `1.5px solid ${ds.color.border}`, borderRadius: ds.radius.md,
    fontSize: 14, color: ds.color.textDark, outline: "none",
    background: ds.color.white, fontFamily: ds.font.body, boxSizing: "border-box",
    transition: "border-color 0.15s",
  };
  const label = { fontSize: 12.5, fontWeight: 600, color: ds.color.textDark, marginBottom: 6, display: "block" };

  if (status === "success") return (
    <div style={{ paddingTop: 67, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: ds.color.canvas }}>
      <div style={{ textAlign: "center", maxWidth: 440, padding: "0 24px" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: ds.color.successBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 22px", border: `2px solid ${ds.color.successBorder}` }}>✓</div>
        <div style={{ fontFamily: ds.font.display, fontSize: 26, color: ds.color.textDark, marginBottom: 12 }}>Quote Request Received!</div>
        <p style={{ fontSize: 15, color: ds.color.textMuted, lineHeight: 1.7, marginBottom: 8 }}>Our team will review your request and respond within <strong>24–48 hours</strong> via email or phone.</p>
        <p style={{ fontSize: 14, color: ds.color.textMuted, marginBottom: 28 }}>A confirmation has been sent to <strong>{form.email || "your email"}</strong>.</p>
        <Btn variant="secondary" size="md" onClick={() => setStatus("idle")}>Submit Another Request</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop: 67 }}>
      <PageHero eyebrow="Get Pricing" title="Request a Quote" subtitle="For equipment, bulk orders, and project-based procurement. We respond within 24–48 hours." />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "52px 28px" }}>
        <div style={{ background: ds.color.white, borderRadius: ds.radius.xl, padding: "44px 48px", boxShadow: ds.shadow.md, border: `1px solid ${ds.color.borderLight}` }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 22px", marginBottom: 18 }}>
            {[["Full Name *","name","text","Juan dela Cruz"],["Company / Organization","company","text","City Health Office"]].map(([l,k,t,ph]) => (
              <div key={k}><label style={label}>{l}</label><input value={form[k]} onChange={set(k)} type={t} placeholder={ph} style={input} onFocus={e => e.target.style.borderColor="#CC2F3C"} onBlur={e => e.target.style.borderColor=ds.color.border} /></div>
            ))}
            {[["Email Address *","email","email","juan@example.com"],["Phone / Mobile *","phone","text","+63 9XX XXX XXXX"]].map(([l,k,t,ph]) => (
              <div key={k}><label style={label}>{l}</label><input value={form[k]} onChange={set(k)} type={t} placeholder={ph} style={input} onFocus={e => e.target.style.borderColor="#CC2F3C"} onBlur={e => e.target.style.borderColor=ds.color.border} /></div>
            ))}
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={label}>Product / Service Required *</label>
            <input value={form.product} onChange={set("product")} placeholder="e.g. 2 units Hematology Analyzer, 1 Ambulance, bulk Amoxicillin…" style={input} onFocus={e => e.target.style.borderColor="#CC2F3C"} onBlur={e => e.target.style.borderColor=ds.color.border} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "18px 22px", marginBottom: 18 }}>
            <div><label style={label}>Quantity</label><input value={form.qty} onChange={set("qty")} placeholder="e.g. 5 units" style={input} onFocus={e => e.target.style.borderColor="#CC2F3C"} onBlur={e => e.target.style.borderColor=ds.color.border} /></div>
            <div>
              <label style={label}>Budget Range</label>
              <select value={form.budget} onChange={set("budget")} style={{ ...input, color: form.budget ? ds.color.textDark : ds.color.textLight }}>
                <option value="">Select range</option>
                {["Below ₱50,000","₱50,000 – ₱200,000","₱200,000 – ₱1,000,000","₱1M – ₱5M","₱5M – ₱20M","₱20M and above"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div><label style={label}>Delivery Location *</label><input value={form.location} onChange={set("location")} placeholder="City, Province" style={input} onFocus={e => e.target.style.borderColor="#CC2F3C"} onBlur={e => e.target.style.borderColor=ds.color.border} /></div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={label}>Preferred Timeline</label>
            <select value={form.timeline} onChange={set("timeline")} style={{ ...input, color: form.timeline ? ds.color.textDark : ds.color.textLight }}>
              <option value="">Select timeline</option>
              {["ASAP / Urgent","Within 1 month","1 – 3 months","3 – 6 months","Project planning phase"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={label}>Project Details / Special Requirements</label>
            <textarea value={form.details} onChange={set("details")} rows={5}
              placeholder="Describe your project, specifications, regulatory requirements, or anything that will help us prepare an accurate quotation…"
              style={{ ...input, resize: "vertical", lineHeight: 1.65 }}
              onFocus={e => e.target.style.borderColor="#CC2F3C"} onBlur={e => e.target.style.borderColor=ds.color.border} />
          </div>

          {/* File upload placeholder */}
          <div style={{ marginBottom: 28, border: `2px dashed ${ds.color.border}`, borderRadius: ds.radius.lg, padding: "24px", textAlign: "center", background: ds.color.canvas }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ds.color.textBody, marginBottom: 4 }}>Attach Supporting Documents</div>
            <div style={{ fontSize: 12, color: ds.color.textMuted }}>BOQ, floor plans, specs — PDF, DOCX, XLSX. File upload active on production.</div>
          </div>

          {status === "error" && (
            <div style={{ marginBottom: 18, padding: "12px 16px", background: ds.color.redLight, borderRadius: ds.radius.md, border: `1px solid ${ds.color.redBorder}`, fontSize: 13, color: ds.color.red }}>{errorMsg}</div>
          )}

          <Btn variant={requiredFilled ? "primary" : "outline"} size="lg" fullWidth disabled={!requiredFilled || status === "sending"} onClick={handleSubmit}>
            {status === "sending" ? "Sending…" : "Submit Quote Request →"}
          </Btn>

          <p style={{ textAlign: "center", fontSize: 13, color: ds.color.textMuted, marginTop: 16, lineHeight: 1.6 }}>
            We respond within <strong style={{ color: ds.color.textDark }}>24–48 hours</strong>. Urgent? Call us:<br />
            <strong>{CONTACT.phone1}</strong> · <strong>{CONTACT.phone2}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent]  = useState(false);
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const input = { width: "100%", padding: "11px 14px", border: `1.5px solid ${ds.color.border}`, borderRadius: ds.radius.md, fontSize: 14, outline: "none", fontFamily: ds.font.body, color: ds.color.textDark, boxSizing: "border-box", background: ds.color.white, transition: "border-color 0.15s" };

  const handleSend = async () => {
    if (!form.name || !form.email || !form.message) return;
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        { from_name: form.name, from_email: form.email, product: form.subject || "General Inquiry", details: form.message, reply_to: form.email, company: "N/A", phone: "N/A", quantity: "N/A", budget: "N/A", location: "N/A", timeline: "N/A" },
        EMAILJS_CONFIG.publicKey
      );
    } catch (_) { /* Fail silently for contact form */ }
    setSent(true);
  };

  return (
    <div style={{ paddingTop: 67 }}>
      <PageHero eyebrow="Contact" title="Get in Touch" subtitle="Ready to order, request a quote, or explore a project? We're here to help." />
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 28px" }}>
        <div className="dm-grid-2" style={{ gap: 52 }}>

          {/* Info */}
          <div>
            <div style={{ fontFamily: ds.font.display, fontSize: 21, color: ds.color.textDark, marginBottom: 28 }}>Office & Contact Information</div>
            {[
              { icon: "📍", title: "Address",        lines: [CONTACT.address, CONTACT.address2] },
              { icon: "📞", title: "Telephone",      lines: [CONTACT.phone2] },
              { icon: "📱", title: "Mobile",         lines: [CONTACT.phone1] },
              { icon: "✉️",  title: "Email",         lines: [CONTACT.email] },
              { icon: "🕐", title: "Business Hours", lines: ["Monday – Friday", "8:00 AM – 6:00 PM"] },
            ].map(item => (
              <div key={item.title} style={{ display: "flex", gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${ds.color.borderLight}` }}>
                <div style={{ width: 42, height: 42, flexShrink: 0, background: ds.color.redLight, borderRadius: ds.radius.md, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: ds.color.red, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{item.title}</div>
                  {item.lines.map(l => <div key={l} style={{ fontSize: 14, color: ds.color.textBody, lineHeight: 1.6 }}>{l}</div>)}
                </div>
              </div>
            ))}

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: ds.color.textDark, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Chat with Us</div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn href={CONTACT.whatsapp} variant="primary" size="md">💬 WhatsApp</Btn>
                <Btn href={CONTACT.messenger} variant="dark" size="md">💬 Messenger</Btn>
              </div>
            </div>

            {/* Map placeholder */}
            <div style={{ height: 180, background: ds.color.canvas, borderRadius: ds.radius.lg, border: `1px solid ${ds.color.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: ds.color.redLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📍</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: ds.color.textMuted }}>Sta. Cruz, Manila</div>
              <div style={{ fontSize: 12, color: ds.color.textLight }}>Google Maps — live on production</div>
            </div>
          </div>

          {/* Form */}
          <div style={{ background: ds.color.white, borderRadius: ds.radius.xl, padding: "36px 40px", boxShadow: ds.shadow.md, border: `1px solid ${ds.color.borderLight}` }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "44px 0" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: ds.color.successBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 18px" }}>✓</div>
                <div style={{ fontFamily: ds.font.display, fontSize: 22, color: ds.color.textDark, marginBottom: 8 }}>Message Sent!</div>
                <div style={{ fontSize: 14, color: ds.color.textMuted, marginBottom: 22 }}>We'll reply within 24 business hours.</div>
                <Btn variant="secondary" size="sm" onClick={() => setSent(false)}>Send Another</Btn>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: ds.font.display, fontSize: 21, color: ds.color.textDark, marginBottom: 24 }}>Send Us a Message</div>
                {[["Full Name","name","text","Your full name"],["Email","email","email","your@email.com"]].map(([l,k,t,ph]) => (
                  <div key={k} style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: ds.color.textDark, display: "block", marginBottom: 6 }}>{l}</label>
                    <input type={t} value={form[k]} onChange={f(k)} placeholder={ph} style={input} onFocus={e => e.target.style.borderColor="#CC2F3C"} onBlur={e => e.target.style.borderColor=ds.color.border} />
                  </div>
                ))}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: ds.color.textDark, display: "block", marginBottom: 6 }}>Subject</label>
                  <select value={form.subject} onChange={f("subject")} style={{ ...input, color: form.subject ? ds.color.textDark : ds.color.textLight }}>
                    <option value="">Select topic</option>
                    <option>Product Inquiry</option>
                    <option>Request a Quote</option>
                    <option>Project Discussion</option>
                    <option>Delivery Information</option>
                    <option>Other</option>
                  </select>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: ds.color.textDark, display: "block", marginBottom: 6 }}>Message</label>
                  <textarea rows={5} value={form.message} onChange={f("message")} placeholder="How can we help you?"
                    style={{ ...input, resize: "vertical", lineHeight: 1.65 }}
                    onFocus={e => e.target.style.borderColor="#CC2F3C"} onBlur={e => e.target.style.borderColor=ds.color.border} />
                </div>
                <Btn variant="primary" size="md" fullWidth onClick={handleSend}>Send Message →</Btn>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CartPage({ cart, removeFromCart, updateQty, setPage }) {
  const total     = cart.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
  const [step,    setStep]    = useState(1); // 1=cart, 2=details, 3=payment, 4=confirm
  const [method,  setMethod]  = useState("");
  const [sending, setSending] = useState(false);
  const [errMsg,  setErrMsg]  = useState("");

  const EMPTY_DETAILS = { name: "", email: "", phone: "", address: "" };
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const setD = (k) => (e) => setDetails(d => ({ ...d, [k]: e.target.value }));

  const detailsFilled = details.name && details.email && details.phone && details.address;

  // Build a readable order summary string for the emails
  const orderSummary = cart.map(i => `${i.name} x${i.qty} — ${formatPHP(i.price * i.qty)}`).join("\n");

  const handlePlaceOrder = async () => {
    if (!method) return;
    setSending(true);
    setErrMsg("");
    try {
      // Email 1 — Notify DMEAST of the new order
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        {
          from_name:    details.name,
          company:      "N/A",
          from_email:   details.email,
          phone:        details.phone,
          product:      orderSummary,
          quantity:     cart.reduce((s, i) => s + i.qty, 0) + " items",
          budget:       formatPHP(total),
          location:     details.address,
          timeline:     "Direct Order",
          details:      `Payment Method: ${method}\n\nOrder Items:\n${orderSummary}\n\nTotal: ${formatPHP(total)}`,
          reply_to:     details.email,
        },
        EMAILJS_CONFIG.publicKey
      );

      // Email 2 — Send receipt to customer
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.receiptTemplateId,
        {
          customer_name:    details.name,
          customer_email:   details.email,
          customer_phone:   details.phone,
          customer_address: details.address,
          order_items:      orderSummary,
          order_total:      formatPHP(total),
          payment_method:   method,
          to_email:         details.email,
        },
        EMAILJS_CONFIG.publicKey
      );

      setStep(4);
    } catch (err) {
      setErrMsg("Something went wrong sending your order. Please email us directly at " + CONTACT.email);
    } finally {
      setSending(false);
    }
  };

  const inputS = {
    width: "100%", padding: "11px 14px",
    border: `1.5px solid ${ds.color.border}`, borderRadius: ds.radius.md,
    fontSize: 14, color: ds.color.textDark, outline: "none",
    fontFamily: ds.font.body, boxSizing: "border-box", background: ds.color.white,
    transition: "border-color 0.15s",
  };
  const labelS = { fontSize: 12.5, fontWeight: 600, color: ds.color.textDark, display: "block", marginBottom: 6 };

  // ── Step 4: Order Confirmed ───────────────────────────────────────────────
  if (step === 4) return (
    <div style={{ paddingTop: 67, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: ds.color.canvas }}>
      <div style={{ textAlign: "center", maxWidth: 460, padding: "0 24px" }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", background: ds.color.successBg, border: `2px solid ${ds.color.successBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 24px" }}>✓</div>
        <div style={{ fontFamily: ds.font.display, fontSize: 28, color: ds.color.textDark, marginBottom: 12 }}>Order Received!</div>
        <p style={{ fontSize: 15, color: ds.color.textMuted, lineHeight: 1.7, marginBottom: 8 }}>
          Thank you, <strong>{details.name}</strong>! Your order has been submitted successfully.
        </p>
        <p style={{ fontSize: 14, color: ds.color.textMuted, lineHeight: 1.7, marginBottom: 8 }}>
          A confirmation has been sent to <strong>{details.email}</strong>.
        </p>
        <p style={{ fontSize: 14, color: ds.color.textMuted, lineHeight: 1.7, marginBottom: 32 }}>
          Our team will contact you within <strong>24 hours</strong> to confirm your order and provide payment instructions.
        </p>

        {/* Order summary box */}
        <div style={{ background: ds.color.white, border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.lg, padding: "20px 24px", marginBottom: 28, textAlign: "left" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: ds.color.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Your Order Summary</div>
          {cart.map(item => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: ds.color.textBody, marginBottom: 6 }}>
              <span>{item.name} × {item.qty}</span>
              <span style={{ fontWeight: 600 }}>{formatPHP(item.price * item.qty)}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${ds.color.borderLight}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: ds.color.textDark }}>
            <span>Total</span><span>{formatPHP(total)}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: ds.color.textMuted }}>Payment via: <strong>{method}</strong></div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Btn variant="primary" size="md" onClick={() => { setStep(1); setDetails(EMPTY_DETAILS); setMethod(""); setPage("home"); }}>Back to Home</Btn>
          <Btn variant="secondary" size="md" onClick={() => setPage("contact")}>Contact Us</Btn>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop: 67, background: ds.color.canvas, minHeight: "80vh" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 28px" }}>

        {/* Step indicator — 4 steps */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36, flexWrap: "wrap" }}>
          {[["Cart", 1], ["Your Details", 2], ["Payment", 3], ["Confirm", 4]].map(([lbl, n], i) => (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: step >= n ? ds.color.red : ds.color.borderLight,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  color: step >= n ? "#fff" : ds.color.textMuted,
                }}>{n}</div>
                <span style={{ fontSize: 13, fontWeight: 500, color: step >= n ? ds.color.textDark : ds.color.textMuted }}>{lbl}</span>
              </div>
              {i < 3 && <div style={{ height: 1, width: 20, background: ds.color.border, marginLeft: 4 }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Cart ─────────────────────────────────────────────────── */}
        {cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <div style={{ fontFamily: ds.font.display, fontSize: 24, color: ds.color.textDark, marginBottom: 10 }}>Your cart is empty</div>
            <div style={{ fontSize: 14, color: ds.color.textMuted, marginBottom: 24 }}>Browse products or request a quote for equipment.</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn variant="primary" size="md" onClick={() => setPage("products")}>Browse Products</Btn>
              <Btn variant="secondary" size="md" onClick={() => setPage("quote")}>Request a Quote</Btn>
            </div>
          </div>
        ) : step === 1 ? (
          <>
            {cart.map(item => (
              <div key={item.id} style={{ background: ds.color.white, border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.lg, padding: "18px 22px", marginBottom: 10, display: "flex", alignItems: "center", gap: 18, boxShadow: ds.shadow.xs }}>
                <ProductImg imageSrc={item.imageSrc} category={item.category} name={item.name} height={64} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: ds.color.textDark }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: ds.color.textMuted }}>{item.tag}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${ds.color.border}`, background: ds.color.canvas, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <span style={{ fontSize: 14, fontWeight: 600, minWidth: 22, textAlign: "center" }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${ds.color.border}`, background: ds.color.canvas, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: ds.color.textDark, minWidth: 80, textAlign: "right" }}>{formatPHP(item.price * item.qty)}</div>
                <button onClick={() => removeFromCart(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: ds.color.textLight, fontSize: 18, padding: 4 }}>✕</button>
              </div>
            ))}
            <div style={{ background: ds.color.white, border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.lg, padding: "22px 24px", marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700, color: ds.color.textDark, marginBottom: 18 }}>
                <span>Order Total</span><span>{formatPHP(total)}</span>
              </div>
              <Btn variant="primary" size="lg" fullWidth onClick={() => setStep(2)}>Continue to Your Details →</Btn>
            </div>
          </>

        ) : step === 2 ? (
          /* ── STEP 2: Customer Details ──────────────────────────────────── */
          <div style={{ background: ds.color.white, border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.xl, padding: "36px 40px", boxShadow: ds.shadow.sm }}>
            <div style={{ fontFamily: ds.font.display, fontSize: 22, color: ds.color.textDark, marginBottom: 6 }}>Your Contact Details</div>
            <p style={{ fontSize: 14, color: ds.color.textMuted, marginBottom: 28 }}>We need these to confirm your order and send your receipt.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 22px", marginBottom: 18 }}>
              <div>
                <label style={labelS}>Full Name *</label>
                <input value={details.name} onChange={setD("name")} placeholder="Juan dela Cruz" style={inputS}
                  onFocus={e => e.target.style.borderColor = ds.color.red} onBlur={e => e.target.style.borderColor = ds.color.border} />
              </div>
              <div>
                <label style={labelS}>Phone / Mobile *</label>
                <input value={details.phone} onChange={setD("phone")} placeholder="+63 9XX XXX XXXX" style={inputS}
                  onFocus={e => e.target.style.borderColor = ds.color.red} onBlur={e => e.target.style.borderColor = ds.color.border} />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelS}>Email Address *</label>
              <input type="email" value={details.email} onChange={setD("email")} placeholder="juan@email.com" style={inputS}
                onFocus={e => e.target.style.borderColor = ds.color.red} onBlur={e => e.target.style.borderColor = ds.color.border} />
              <div style={{ fontSize: 12, color: ds.color.textMuted, marginTop: 6 }}>📧 Your order confirmation will be sent to this email</div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelS}>Delivery Address *</label>
              <textarea value={details.address} onChange={setD("address")} rows={3}
                placeholder="House/Unit No., Street, Barangay, City, Province, Country"
                style={{ ...inputS, resize: "vertical", lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = ds.color.red} onBlur={e => e.target.style.borderColor = ds.color.border} />
            </div>

            {/* Order mini-summary */}
            <div style={{ background: ds.color.canvas, border: `1px solid ${ds.color.borderLight}`, borderRadius: ds.radius.md, padding: "14px 18px", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: ds.color.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Order Summary</div>
              {cart.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: ds.color.textBody, marginBottom: 4 }}>
                  <span>{item.name} × {item.qty}</span>
                  <span style={{ fontWeight: 600 }}>{formatPHP(item.price * item.qty)}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${ds.color.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, color: ds.color.textDark }}>
                <span>Total</span><span>{formatPHP(total)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <Btn variant="outline" size="lg" onClick={() => setStep(1)}>← Back</Btn>
              <div style={{ flex: 1 }}>
                <Btn variant={detailsFilled ? "primary" : "outline"} size="lg" fullWidth disabled={!detailsFilled} onClick={() => setStep(3)}>
                  Continue to Payment →
                </Btn>
              </div>
            </div>
          </div>

        ) : (
          /* ── STEP 3: Payment ───────────────────────────────────────────── */
          <>
            <div style={{ background: ds.color.white, border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.xl, padding: "32px 36px", marginBottom: 18, boxShadow: ds.shadow.sm }}>
              <div style={{ fontFamily: ds.font.display, fontSize: 22, color: ds.color.textDark, marginBottom: 6 }}>Select Payment Method</div>
              <p style={{ fontSize: 14, color: ds.color.textMuted, marginBottom: 24 }}>Choose how you will pay. Payment instructions will be sent to <strong>{details.email}</strong> after you place your order.</p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m.label} onClick={() => setMethod(m.label)} style={{
                    padding: "16px 10px", borderRadius: ds.radius.lg,
                    border: `2px solid ${method === m.label ? ds.color.red : ds.color.border}`,
                    background: method === m.label ? ds.color.redLight : ds.color.canvas,
                    cursor: "pointer", fontFamily: ds.font.body,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 26 }}>{m.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: method === m.label ? ds.color.red : ds.color.textBody }}>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Final order summary */}
              <div style={{ background: ds.color.canvas, border: `1px solid ${ds.color.borderLight}`, borderRadius: ds.radius.md, padding: "16px 20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: ds.color.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Order Summary</div>
                {cart.map(item => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: ds.color.textBody, marginBottom: 5 }}>
                    <span>{item.name} × {item.qty}</span>
                    <span style={{ fontWeight: 600 }}>{formatPHP(item.price * item.qty)}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${ds.color.border}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, color: ds.color.textDark }}>
                  <span>Total</span><span>{formatPHP(total)}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: ds.color.textMuted }}>
                  <span>📦 Deliver to: </span><strong>{details.address}</strong>
                </div>
              </div>
            </div>

            {errMsg && (
              <div style={{ marginBottom: 14, padding: "12px 16px", background: ds.color.redLight, borderRadius: ds.radius.md, border: `1px solid ${ds.color.redBorder}`, fontSize: 13, color: ds.color.red }}>{errMsg}</div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <Btn variant="outline" size="lg" onClick={() => setStep(2)}>← Back</Btn>
              <div style={{ flex: 1 }}>
                <Btn
                  variant={method ? "primary" : "outline"} size="lg" fullWidth
                  disabled={!method || sending}
                  onClick={handlePlaceOrder}>
                  {sending ? "Placing Order…" : method ? `Place Order — ${formatPHP(total)} →` : "Select a payment method"}
                </Btn>
              </div>
            </div>

            <p style={{ textAlign: "center", fontSize: 12, color: ds.color.textMuted, marginTop: 14, lineHeight: 1.6 }}>
              By placing your order you agree to be contacted by our team for payment and delivery confirmation.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function PrivacyPage() {
  const sections = [
    { title: "Information We Collect", body: "When you submit a quote request or contact form on this website, we collect the following information: your name, company or organization, email address, phone number, product or service inquiries, delivery location, and any details you choose to provide. We do not collect payment information directly on this website." },
    { title: "How We Use Your Information", body: "We use the information you provide solely to respond to your inquiry, prepare quotations, process orders, and provide customer support. We may also use your contact information to send updates about your order or inquiry status. We do not use your information for unrelated marketing purposes without your consent." },
    { title: "Information Sharing", body: "DM EAST does not sell, rent, or trade your personal information to third parties. We may share your information with authorized supplier partners solely for the purpose of fulfilling your order or inquiry. All partners are bound by confidentiality agreements." },
    { title: "Data Security", body: "We take reasonable measures to protect your personal information from unauthorized access, alteration, or disclosure. However, no method of transmission over the internet is 100% secure. We encourage you to contact us directly for sensitive inquiries." },
    { title: "Cookies", body: "This website may use basic browser cookies to improve your browsing experience. We do not use tracking cookies for advertising purposes. You can disable cookies in your browser settings without affecting your ability to use this website." },
    { title: "Third-Party Services", body: "This website may use third-party services such as EmailJS for form submissions, and Google Fonts for typography. These services have their own privacy policies and we encourage you to review them." },
    { title: "Your Rights", body: "You have the right to request access to, correction of, or deletion of your personal information held by DM EAST. To exercise these rights, please contact us at " + CONTACT.email + "." },
    { title: "Contact Us About Privacy", body: "If you have questions or concerns about this Privacy Policy or how we handle your data, please contact us at " + CONTACT.email + " or call " + CONTACT.phone1 + "." },
  ];

  return (
    <div style={{ paddingTop: 67 }}>
      <PageHero eyebrow="Legal" title="Privacy Policy" subtitle={`Last updated: ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`} />
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "60px 28px" }}>
        <div style={{ background: ds.color.redLight, border: `1px solid ${ds.color.redBorder}`, borderRadius: ds.radius.lg, padding: "18px 22px", marginBottom: 40, fontSize: 14, color: ds.color.red, lineHeight: 1.7 }}>
          DM EAST is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights regarding your personal data.
        </div>
        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 36, paddingBottom: 36, borderBottom: i < sections.length - 1 ? `1px solid ${ds.color.borderLight}` : "none" }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: ds.color.textDark, marginBottom: 10, fontFamily: ds.font.display }}>{i + 1}. {s.title}</h3>
            <p style={{ fontSize: 15, color: ds.color.textBody, lineHeight: 1.8 }}>{s.body}</p>
          </div>
        ))}
        <div style={{ marginTop: 40, padding: "22px 24px", background: ds.color.canvas, borderRadius: ds.radius.lg, border: `1px solid ${ds.color.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: ds.color.textDark, marginBottom: 6 }}>DM EAST — Data Controller</div>
          <div style={{ fontSize: 13, color: ds.color.textMuted, lineHeight: 1.7 }}>
            {CONTACT.address}, {CONTACT.address2}<br />
            {CONTACT.email} · {CONTACT.phone1}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function Footer({ setPage }) {
  return (
    <footer style={{ background: ds.color.textDark, padding: "64px 28px 28px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr", gap: 44, marginBottom: 48 }}>

          {/* Brand */}
          <div>
            <div style={{ marginBottom: 18 }}>
              <BrandLogo height={36} darkMode={true} />
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.8, maxWidth: 270, marginBottom: 18 }}>
              Your Source for Quality Medical Solutions — serving hospitals, LGUs, clinics, and institutions across the Philippines since 2020.
            </p>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.9 }}>
              <div>{CONTACT.address}</div>
              <div>{CONTACT.address2}</div>
              <div style={{ marginTop: 6 }}>{CONTACT.phone1} · {CONTACT.phone2}</div>
              <div>{CONTACT.email}</div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>Quick Links</div>
            {[["home","Home"],["about","About Us"],["products","Products"],["services","Services"],["quote","Request Quote"],["contact","Contact"]].map(([id,lbl]) => (
              <button key={id} onClick={() => setPage(id)} style={{ display: "block", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "4px 0", textAlign: "left", fontFamily: ds.font.body, transition: "color 0.15s" }}
                onMouseEnter={e => e.target.style.color="#F0A81C"} onMouseLeave={e => e.target.style.color="rgba(255,255,255,0.5)"}>{lbl}</button>
            ))}
          </div>

          {/* Products */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>Categories</div>
            {CATEGORIES.map(c => (
              <div key={c.id} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", padding: "4px 0" }}>{c.label}</div>
            ))}
          </div>

          {/* Connect */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>Connect</div>
            <Btn href={CONTACT.whatsapp} variant="ghost" size="sm">💬 WhatsApp</Btn>
            <div style={{ marginTop: 10 }}>
              <Btn href={CONTACT.messenger} variant="ghost" size="sm">💬 Messenger</Btn>
            </div>
            <div style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.9 }}>
              <div>🇵🇭 Philippine-Based</div>
              <div>🌐 Local & International Sourcing</div>
              <div>📦 Procurement-Based Model</div>
            </div>
          </div>
        </div>

        <Divider />
        <div style={{ paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>© {new Date().getFullYear()} DM EAST. All rights reserved. dmeastph.com</div>
          <div style={{ display: "flex", gap: 20 }}>
            <button onClick={() => setPage("privacy")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: ds.font.body }}
              onMouseEnter={e => e.target.style.color="#F0A81C"} onMouseLeave={e => e.target.style.color="rgba(255,255,255,0.25)"}>Privacy Policy</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING CHAT
// ─────────────────────────────────────────────────────────────────────────────
function FloatingChat() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
      {open && (
        <div style={{ background: ds.color.white, border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.xl, padding: "16px 18px", boxShadow: ds.shadow.lg, minWidth: 190 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: ds.color.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Chat with Us</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 10, background: "#25D366", color: "#fff", padding: "9px 14px", borderRadius: ds.radius.md, fontSize: 13.5, fontWeight: 600 }}>
              💬 WhatsApp
            </a>
            <a href={CONTACT.messenger} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 10, background: "#0084FF", color: "#fff", padding: "9px 14px", borderRadius: ds.radius.md, fontSize: 13.5, fontWeight: 600 }}>
              💬 Messenger
            </a>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} style={{
        width: 52, height: 52, borderRadius: "50%",
        background: ds.color.red, border: "none", cursor: "pointer",
        color: "#fff", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: ds.shadow.red, transition: "transform 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,           setPageRaw]        = useState("home");
  const [cart,           setCart]           = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  const setPage = useCallback((p) => {
    setPageRaw(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const addToCart = useCallback((product) => {
    setCart(c => {
      const exists = c.find(i => i.id === product.id);
      if (exists) return c.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...product, qty: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id) => setCart(c => c.filter(i => i.id !== id)), []);

  const updateQty = useCallback((id, qty) => {
    if (qty < 1) { removeFromCart(id); return; }
    setCart(c => c.map(i => i.id === id ? { ...i, qty } : i));
  }, [removeFromCart]);

  const cartCount  = cart.reduce((s, i) => s + i.qty, 0);
  const sharedProps = { setPage, addToCart, setActiveCategory, activeCategory };

  return (
    <div style={{ fontFamily: ds.font.body, minHeight: "100vh", background: ds.color.white, color: ds.color.textBody }}>
      <style>{GLOBAL_CSS}</style>
      <Navbar activePage={page} setPage={setPage} cartCount={cartCount} />
      <main>
        {page === "home"     && <HomePage     {...sharedProps} />}
        {page === "about"    && <AboutPage />}
        {page === "products" && <ProductsPage {...sharedProps} />}
        {page === "services" && <ServicesPage setPage={setPage} />}
        {page === "quote"    && <QuotePage />}
        {page === "contact"  && <ContactPage />}
        {page === "cart"     && <CartPage cart={cart} removeFromCart={removeFromCart} updateQty={updateQty} setPage={setPage} />}
        {page === "privacy"  && <PrivacyPage />}
      </main>
      <Footer setPage={setPage} />
      <FloatingChat />
    </div>
  );
}
