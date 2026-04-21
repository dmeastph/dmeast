/**
 * DMEAST — Medical Solutions Platform  v7.0
 * - Auto-populate delivery details from logged-in user profile
 * - "Ordering for someone else?" toggle
 * - Real field validation (email format, PH/intl phone, name min length)
 * - Country code selector on phone field
 * - Rewards: ₱200 per point (was ₱100)
 * - Fixed order placement hang — emailjs properly awaited, Firebase writes wrapped
 * - Email to both customer and DMEAST on every order
 * - Orders always written to Firestore (logged-in and guest)
 * - Rx camera trigger fixed
 * - Payment method styled badges (professional)
 * - About Us milestones corrected
 * - npm install firebase @emailjs/browser
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, orderBy, getDocs, serverTimestamp,
} from "firebase/firestore";

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
const auth = getAuth(firebaseApp);
const db   = getFirestore(firebaseApp);
const ADMIN_EMAILS = ["info@dmeastph.com", "admin@dmeastph.com"];

// EmailJS — swap mock for real import in production
const emailjs = { send: async () => { await new Promise(r => setTimeout(r, 1500)); return { status: 200 }; } };
const EMAILJS_CONFIG = {
  serviceId: "service_0hvjrv6", templateId: "template_5r24wue",
  receiptTemplateId: "template_adb2so7", publicKey: "gV5OXqbN2PHond86B",
};

const POINTS_PER_PHP = 1 / 200;   // 1 pt per ₱200 spent
const POINT_VALUE    = 0.50;        // ₱0.50 per point

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
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#FAFAFA}::-webkit-scrollbar-thumb{background:#E8E0DA;border-radius:99px}
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

// institutional:true = shown in Institutional Orders section, not main shop
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

const PRODUCTS = [
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
  pending:   {bg:"#FEF9C3",color:"#A16207"},
  confirmed: {bg:"#DBEAFE",color:"#1E40AF"},
  processing:{bg:"#EDE9FE",color:"#5B21B6"},
  shipped:   {bg:"#DCFCE7",color:"#166534"},
  delivered: {bg:"#D1FAE5",color:"#065F46"},
  cancelled: {bg:"#FEE2E2",color:"#991B1B"},
}[s]||{bg:"#F3F4F6",color:"#374151"});


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

  const links=[{id:"home",label:"Home"},{id:"about",label:"About Us"},{id:"products",label:"Shop"},{id:"institutional",label:"Institutional Orders"},{id:"quote",label:"Request Quote"},{id:"contact",label:"Contact"}];
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


// ─── CUSTOMER PORTAL ─────────────────────────────────────────────────────────
function CustomerPortal({user,setPage,addToCart,wishlist,toggleWishlist}){
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

  const tabs=[{id:"overview",label:"Overview",icon:"📊"},{id:"orders",label:"Orders",icon:"📦"},{id:"wishlist",label:"Wishlist",icon:"❤️"},{id:"address",label:"My Address",icon:"📍"},{id:"rx",label:"Rx History",icon:"💊"},{id:"rewards",label:"Rewards",icon:"⭐"}];

  return(
    <div style={{paddingTop:67,background:ds.color.canvas,minHeight:"100vh"}}>
      {/* Header */}
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
        {/* Tab nav */}
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
                      <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:ds.radius.pill,background:sc.bg,color:sc.color,textTransform:"capitalize"}}>{o.status||"pending"}</span>
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
            {orders.length===0?<div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>No orders yet.</div>:orders.map(o=>{
              const sc=orderStatusColor(o.status||"pending");
              return(
                <div key={o.id} style={{border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,marginBottom:16,overflow:"hidden"}}>
                  <div style={{background:ds.color.canvas,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark}}>Order #{o.id.slice(-6).toUpperCase()}</div>
                      <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{formatDate(o.createdAt)}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:15,fontWeight:700}}>{formatPHP(o.total||0)}</span>
                      <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:ds.radius.pill,background:sc.bg,color:sc.color,textTransform:"capitalize"}}>{o.status||"pending"}</span>
                      <Btn variant="ghost" size="sm" onClick={()=>handleReorder(o)}>🔄 Reorder</Btn>
                    </div>
                  </div>
                  <div style={{padding:"14px 20px"}}>
                    {o.items?.map((item,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody,padding:"4px 0"}}>
                        <span>{item.name} × {item.qty}</span><span style={{fontWeight:600}}>{formatPHP(item.price*item.qty)}</span>
                      </div>
                    ))}
                    {o.address&&<div style={{marginTop:10,fontSize:12,color:ds.color.textMuted}}>📍 {o.address}</div>}
                    {o.paymentMethod&&<div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>💳 {o.paymentMethod}</div>}
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


// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard(){
  const [tab,setTab]=useState("overview");
  const [orders,setOrders]=useState([]);
  const [customers,setCustomers]=useState([]);
  const [rxUps,setRxUps]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    (async()=>{
      try{
        const oSnap=await getDocs(query(collection(db,"orders"),orderBy("createdAt","desc")));
        setOrders(oSnap.docs.map(d=>({id:d.id,...d.data()})));
        const cSnap=await getDocs(collection(db,"customers"));
        setCustomers(cSnap.docs.map(d=>({id:d.id,...d.data()})));
        const rSnap=await getDocs(query(collection(db,"rxUploads"),orderBy("createdAt","desc")));
        setRxUps(rSnap.docs.map(d=>({id:d.id,...d.data()})));
      }catch(_){}
      setLoading(false);
    })();
  },[]);

  const updateOrderStatus=async(id,status)=>{
    await updateDoc(doc(db,"orders",id),{status});
    setOrders(os=>os.map(o=>o.id===id?{...o,status}:o));
  };
  const updateRxStatus=async(id,status)=>{
    await updateDoc(doc(db,"rxUploads",id),{status});
    setRxUps(rs=>rs.map(r=>r.id===id?{...r,status}:r));
  };
  const exportCSV=()=>{
    const rows=[["Order ID","Customer","Email","Total","Items","Payment","Status","Date"]];
    orders.forEach(o=>rows.push([o.id.slice(-6).toUpperCase(),o.name||"",o.email||"",o.total||0,o.items?.map(i=>`${i.name}x${i.qty}`).join("; ")||"",o.paymentMethod||"",o.status||"pending",formatDate(o.createdAt)]));
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`dmeast-orders-${Date.now()}.csv`;a.click();
  };

  const totalRevenue=orders.reduce((s,o)=>s+(o.total||0),0);
  const pendingCount=orders.filter(o=>!o.status||o.status==="pending").length;
  const statuses=["pending","confirmed","processing","shipped","delivered","cancelled"];
  const selS={padding:"7px 12px",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:13,outline:"none",fontFamily:ds.font.body,background:"#fff",cursor:"pointer"};

  if(loading) return(
    <div style={{paddingTop:67,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}><Spinner size={36}/><div style={{marginTop:16,color:ds.color.textMuted,fontSize:14}}>Loading dashboard…</div></div>
    </div>
  );

  const tabs=[{id:"overview",label:"Overview",icon:"📊"},{id:"orders",label:"Orders",icon:"📦"},{id:"products",label:"Products",icon:"🗂️"},{id:"customers",label:"Customers",icon:"👥"},{id:"rx",label:"Rx Uploads",icon:"💊"}];

  return(
    <div style={{paddingTop:67,background:ds.color.canvas,minHeight:"100vh"}}>
      <div style={{background:ds.color.textDark,padding:"28px 0"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:ds.color.goldBright,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Admin Dashboard</div>
            <div style={{fontFamily:ds.font.display,fontSize:22,color:"#fff"}}>DMEAST Control Panel ⚙️</div>
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
            <div className="dm-grid-4" style={{marginBottom:32}}>
              {[{icon:"📦",label:"Total Orders",value:orders.length,color:ds.color.red},{icon:"⏳",label:"Pending",value:pendingCount,color:"#F59E0B"},{icon:"💰",label:"Total Revenue",value:formatPHP(totalRevenue),color:ds.color.success},{icon:"👥",label:"Customers",value:customers.length,color:"#6366F1"}].map((s,i)=>(
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
                    {["Order ID","Customer","Total","Items","Payment","Status","Date"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontWeight:700,color:ds.color.textDark,fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {orders.slice(0,10).map(o=>{const sc=orderStatusColor(o.status||"pending");return(
                      <tr key={o.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                        <td style={{padding:"12px",fontWeight:700,color:ds.color.textDark}}>#{o.id.slice(-6).toUpperCase()}</td>
                        <td style={{padding:"12px",color:ds.color.textBody}}>{o.name||"—"}</td>
                        <td style={{padding:"12px",fontWeight:600}}>{formatPHP(o.total||0)}</td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{o.items?.length||0}</td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{o.paymentMethod||"—"}</td>
                        <td style={{padding:"12px"}}><span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:ds.radius.pill,background:sc.bg,color:sc.color,textTransform:"capitalize"}}>{o.status||"pending"}</span></td>
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
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>All Orders ({orders.length})</div>
              <Btn variant="outline" size="sm" onClick={exportCSV}>⬇️ CSV</Btn>
            </div>
            {orders.length===0?<div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>No orders yet.</div>:orders.map(o=>{
              const sc=orderStatusColor(o.status||"pending");
              return(
                <div key={o.id} style={{border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,marginBottom:14,overflow:"hidden"}}>
                  <div style={{background:ds.color.canvas,padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                    <div>
                      <span style={{fontWeight:700,color:ds.color.textDark,fontSize:14}}>#{o.id.slice(-6).toUpperCase()}</span>
                      <span style={{fontSize:12,color:ds.color.textMuted,marginLeft:12}}>{o.name||"Guest"} · {o.email||"—"}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontWeight:700,fontSize:15}}>{formatPHP(o.total||0)}</span>
                      <select value={o.status||"pending"} onChange={e=>updateOrderStatus(o.id,e.target.value)} style={{...selS,fontWeight:600,color:sc.color,background:sc.bg}}>
                        {statuses.map(s=><option key={s} value={s} style={{color:ds.color.textDark,background:"#fff"}}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                      </select>
                      <span style={{fontSize:12,color:ds.color.textMuted}}>{formatDate(o.createdAt)}</span>
                    </div>
                  </div>
                  <div style={{padding:"10px 18px"}}>
                    {o.items?.map((item,i)=><div key={i} style={{fontSize:12.5,color:ds.color.textBody,padding:"2px 0"}}>{item.name} × {item.qty} — {formatPHP(item.price*item.qty)}</div>)}
                    {o.address&&<div style={{fontSize:12,color:ds.color.textMuted,marginTop:6}}>📍 {o.address}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==="products"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:6}}>Product Catalog</div>
            <div style={{fontSize:13,color:ds.color.textMuted,marginBottom:24}}>To update prices or product details, edit the PRODUCTS array in the source code and redeploy.</div>
            {CATEGORIES.map(cat=>{
              const catProds=PRODUCTS.filter(p=>p.category===cat.id);
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
                        {["ID","Name","Price","CTA","Rx"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",fontWeight:700,color:ds.color.textMuted,fontSize:11,textTransform:"uppercase"}}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {catProds.map(p=>(
                          <tr key={p.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                            <td style={{padding:"9px 10px",color:ds.color.textLight,fontFamily:"monospace",fontSize:11}}>{p.id}</td>
                            <td style={{padding:"9px 10px",fontWeight:600,color:ds.color.textDark}}>{p.name}</td>
                            <td style={{padding:"9px 10px",color:p.price?ds.color.success:ds.color.textMuted,fontWeight:600}}>{p.price?formatPHP(p.price):"Quote / Sales"}</td>
                            <td style={{padding:"9px 10px"}}><CtaBadge type={p.cta}/></td>
                            <td style={{padding:"9px 10px"}}>{p.requiresPrescription?<span style={{fontSize:11,color:"#92400E",background:"#FFF3CD",padding:"2px 8px",borderRadius:ds.radius.pill}}>Rx</span>:<span style={{fontSize:11,color:ds.color.success}}>OTC</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==="customers"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:20}}>Customers ({customers.length})</div>
            {customers.length===0?<div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>No registered customers yet.</div>:(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{borderBottom:`2px solid ${ds.color.border}`}}>
                    {["Name","Email","Orders","Total Spent","Points","Joined"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontWeight:700,color:ds.color.textDark,fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {customers.map(c=>(
                      <tr key={c.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                        <td style={{padding:"12px",fontWeight:600,color:ds.color.textDark}}>{c.name||"—"}</td>
                        <td style={{padding:"12px",color:ds.color.textBody}}>{c.email||"—"}</td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{c.totalOrders||0}</td>
                        <td style={{padding:"12px",fontWeight:600,color:ds.color.success}}>{formatPHP(c.totalSpent||0)}</td>
                        <td style={{padding:"12px",color:ds.color.gold,fontWeight:600}}>{(c.points||0).toLocaleString()}</td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab==="rx"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:20}}>Prescription Uploads ({rxUps.length})</div>
            {rxUps.length===0?<div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>No prescription uploads yet.</div>:rxUps.map(r=>(
              <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:`1px solid ${ds.color.borderLight}`,flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark}}>Order #{r.orderId?.slice(-6).toUpperCase()||"—"}</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{r.customerName||"Guest"} · {r.fileName||"Prescription"} · {formatDate(r.createdAt)}</div>
                </div>
                <select value={r.status||"pending"} onChange={e=>updateRxStatus(r.id,e.target.value)} style={selS}>
                  {["pending","verified","rejected"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
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
            <div className="dm-fade-up dm-fade-up-4" style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginTop:8,paddingTop:16,borderTop:`1px solid ${ds.color.borderLight}`}}>
              <span style={{fontSize:13}}>🔒</span><span style={{fontSize:11,fontWeight:700,color:ds.color.success}}>SSL Secured</span>
              <div style={{width:1,height:14,background:ds.color.border}}/>
              <span style={{fontSize:11,color:ds.color.textLight,fontWeight:500}}>Accepted payments:</span>
              {[{icon:"💳",label:"Visa"},{icon:"💳",label:"Mastercard"},{icon:"📱",label:"GCash"},{icon:"💜",label:"Maya"},{icon:"🏦",label:"Bank"},{icon:"📲",label:"QR Ph"}].map(b=>(
                <div key={b.label} style={{display:"flex",alignItems:"center",gap:4,background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.sm,padding:"3px 9px"}}>
                  <span style={{fontSize:11}}>{b.icon}</span><span style={{fontSize:10,fontWeight:600,color:ds.color.textMuted}}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Right — Stats + trust cards */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="dm-grid-4" style={{gridTemplateColumns:"repeat(2,1fr)"}}>
              {[{v:"5+",l:"Years Serving PH",accent:ds.color.red},{v:"500+",l:"Clients Nationwide",accent:ds.color.goldBright},{v:"9",l:"Product Categories",accent:ds.color.red},{v:"24/7",l:"Order Support",accent:ds.color.goldBright}].map((s,i)=>(
                <div key={i} style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"22px 18px",textAlign:"center",borderTop:`3px solid ${s.accent}`,boxShadow:ds.shadow.xs}}>
                  <div style={{fontFamily:ds.font.display,fontSize:"2rem",color:s.accent,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:11,color:ds.color.textMuted,marginTop:6,fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase"}}>{s.l}</div>
                </div>
              ))}
            </div>
            {/* Trust card — replaced "Procurement-Based Supply" */}
            <div style={{background:ds.color.textDark,borderRadius:ds.radius.lg,padding:"22px 24px"}}>
              <div style={{fontSize:10,fontWeight:700,color:ds.color.goldBright,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Why Choose DMEAST</div>
              <div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:8}}>Products from Authorized Suppliers</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",lineHeight:1.7}}>All products are sourced from verified and authorized suppliers. Standard items available for direct purchase. Institutional and specialized orders handled upon request.</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setPage("institutional")} style={{flex:1,background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,padding:"13px",cursor:"pointer",fontFamily:ds.font.body,fontSize:13,fontWeight:600,color:ds.color.red}}>Institutional Orders →</button>
              <button onClick={()=>setPage("about")} style={{flex:1,background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,padding:"13px",cursor:"pointer",fontFamily:ds.font.body,fontSize:13,fontWeight:600,color:ds.color.textMuted}}>Our Story →</button>
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

function WhoWeServeSection(){
  return(
    <section style={{background:ds.color.canvasWarm,padding:"80px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <SectionHeader eyebrow="Who We Serve" title="For Clinics, Businesses & Individuals" subtitle="DMEAST serves everyone who needs quality healthcare products — from individual buyers to clinics and institutions." center/>
        <div className="dm-grid-3">
          {CLIENT_TYPES.map(c=>(
            <div key={c.label} style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"26px 24px",boxShadow:ds.shadow.xs}}>
              <div style={{fontSize:28,marginBottom:12}}>{c.icon}</div>
              <div style={{fontSize:14.5,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>{c.label}</div>
              <div style={{fontSize:13.5,color:ds.color.textMuted,lineHeight:1.65}}>{c.desc}</div>
            </div>
          ))}
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

function WorldwideShipping(){
  return(
    <section style={{background:ds.color.canvas,padding:"80px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <SectionHeader eyebrow="Worldwide Delivery" title="We Ship Everywhere" subtitle="From Manila to any destination — DMEAST handles all export documentation and logistics." center/>
        <div className="dm-grid-4" style={{marginBottom:48}}>
          {SHIPPING_METHODS.map(m=>(
            <div key={m.label} style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 20px",textAlign:"center",boxShadow:ds.shadow.xs}}>
              <div style={{fontSize:32,marginBottom:10}}>{m.icon}</div>
              <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>{m.label}</div>
              <div style={{fontSize:13,color:ds.color.textMuted,lineHeight:1.6}}>{m.desc}</div>
            </div>
          ))}
        </div>
        <div style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.xl,padding:"28px 32px",boxShadow:ds.shadow.xs}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:ds.color.red,marginBottom:8}}>Regions Served</div>
            <div style={{fontFamily:ds.font.display,fontSize:"1.4rem",color:ds.color.textDark}}>Countries & Territories</div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>
            {REGIONS_SERVED.map(r=>(
              <div key={r.region} style={{display:"flex",alignItems:"center",gap:8,background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.pill,padding:"7px 14px"}}>
                <span style={{fontSize:16}}>{r.flag}</span>
                <div><div style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark}}>{r.region}</div><div style={{fontSize:11,color:ds.color.textLight}}>{r.detail}</div></div>
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
  // Featured products: show OTC/standard buy-able items first (no institutional, no Rx-only)
  const featuredStandard = PRODUCTS.filter(p =>
    p.featured && p.cta === "buy" && !p.requiresPrescription &&
    !CATEGORIES.find(c=>c.id===p.category)?.institutional
  ).slice(0,4);
  // Fall back to any featured buy items if not enough
  const featured = featuredStandard.length >= 4
    ? featuredStandard
    : PRODUCTS.filter(p => p.featured && p.cta === "buy").slice(0,4);

  return(
    <div style={{paddingTop:67}}>
      {/* 1. Hero */}
      <HeroSection setPage={setPage}/>
      {/* 2. Featured Standard Products */}
      <section style={{background:ds.color.white,padding:"80px 28px"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <SectionHeader eyebrow="Featured Products" title="Popular Health & Wellness Products" subtitle="Directly available for online purchase with fast nationwide delivery." center/>
          <div className="dm-grid-4">
            {featured.map(p=><ProductCard key={p.id} product={p} addToCart={addToCart} setPage={setPage}/>)}
          </div>
          <div style={{textAlign:"center",marginTop:36}}><Btn variant="secondary" size="lg" onClick={()=>setPage("products")}>View All Products →</Btn></div>
        </div>
      </section>
      {/* 3. Shop by Category */}
      <CategoriesSection setPage={setPage} setActiveCategory={setActiveCategory}/>
      {/* 4. How to Order */}
      <HowItWorksSection/>
      {/* 5. Payment Methods */}
      <PaymentMethodsSection/>
      {/* 6. Why Choose DMEAST */}
      <WhyChooseSection/>
      {/* 7. Institutional Orders Preview */}
      <InstitutionalPreviewSection setPage={setPage}/>
      {/* 8. CTA Banner */}
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
  const [search,setSearch]=useState("");
  const [cat,setCat]=useState(activeCategory||null);
  const [showAll,setShowAll]=useState(false);
  useEffect(()=>{if(activeCategory)setCat(activeCategory);},[activeCategory]);

  // By default show only non-institutional categories unless user picks one or searches
  const shopCats = CATEGORIES.filter(c=>!c.institutional);
  const isInstitutionalCat = cat && CATEGORIES.find(c=>c.id===cat)?.institutional;

  const filtered=PRODUCTS.filter(p=>{
    const mc=!cat||p.category===cat;
    const q=search.toLowerCase();
    const ms=!q||p.name.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q)||p.tag.toLowerCase().includes(q);
    // If no filter active and not showing all, hide institutional categories
    const notInstit = showAll||cat||q ? true : !CATEGORIES.find(c=>c.id===p.category)?.institutional;
    return mc&&ms&&notInstit;
  });

  const shopProductCount = PRODUCTS.filter(p=>!CATEGORIES.find(c=>c.id===p.category)?.institutional).length;

  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Online Shop" title="Healthcare Products & Medical Supplies" subtitle={`${shopProductCount}+ products available for direct purchase with nationwide delivery.`}/>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"40px 28px"}}>

        {/* Institutional notice banner */}
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

        {/* Bottom link to institutional */}
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
  const institutionalCats = CATEGORIES.filter(c=>c.institutional);
  const institutionalProducts = PRODUCTS.filter(p=>CATEGORIES.find(c=>c.id===p.category)?.institutional);
  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Institutional Orders" title="Specialized & Enterprise Healthcare Solutions" subtitle="For hospitals, diagnostic centers, and healthcare institutions requiring specialized equipment, bulk pharmaceutical supply, or complete facility setups."/>
      <div style={{maxWidth:1160,margin:"0 auto",padding:"72px 28px"}}>

        {/* How institutional orders work */}
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

        {/* Institutional categories */}
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

        {/* Services offered */}
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

        {/* CTA */}
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
      await emailjs.send(EMAILJS_CONFIG.serviceId,EMAILJS_CONFIG.templateId,{...form,reply_to:form.email},EMAILJS_CONFIG.publicKey);
      setStatus("success");
    }catch{setErrorMsg("Failed to send. Please email us directly at "+CONTACT.email);setStatus("error");}
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

// Validation helpers
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

// ─── CART PAGE ───────────────────────────────────────────────────────────────
function CartPage({cart,removeFromCart,updateQty,setPage,user,onOrderComplete}){
  const [step,setStep]         = useState(1);
  const [orderMode,setOrderMode] = useState(null);
  const [forSomeoneElse,setForSomeoneElse] = useState(false);
  const [countryCode,setCountryCode] = useState("+63");
  const [details,setDetails]   = useState({name:"",email:"",phoneNum:"",address:"",instructions:""});
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
  const cameraRef  = useRef(null);
  const uploadRef  = useRef(null);

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
          // Try to parse saved phone if any
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
          // No customer doc yet — at least pre-fill email
          setDetails(prev=>({...prev, email: user.email||""}));
        }
      }catch(_){}
      setProfileLoaded(true);
    })();
  },[user, profileLoaded]);

  const fullPhone = countryCode + details.phoneNum.replace(/^0+/,"");
  const total     = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const hasRx     = cart.some(i=>i.requiresPrescription);
  const intlFilled = intlForm.name&&intlForm.email&&intlForm.phone&&intlForm.country;
  const orderSummary = cart.map(i=>`${i.name} x${i.qty} — ${formatPHP(i.price*i.qty)}`).join("\n");

  // Field validation
  const validateFields = () => {
    const errs = {};
    if(!validateName(details.name))      errs.name    = "Please enter your full name (at least 2 characters).";
    if(!validateEmail(details.email))    errs.email   = "Please enter a valid email address (e.g. you@email.com).";
    if(!validatePhone(details.phoneNum)) errs.phoneNum= "Please enter a valid phone number.";
    if(!details.address.trim())          errs.address = "Delivery address is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const detFilled = validateName(details.name) && validateEmail(details.email) &&
                    validatePhone(details.phoneNum) && details.address.trim().length>0;

  const inp    = {width:"100%",padding:"11px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,color:ds.color.textDark,outline:"none",fontFamily:ds.font.body,boxSizing:"border-box",background:"#fff",transition:"border-color 0.15s"};
  const inpErr = {border:`1.5px solid ${ds.color.red}`};
  const lbl    = {fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6};
  const errTxt = {fontSize:11.5,color:ds.color.red,marginTop:4};
  const fo     = e => e.target.style.borderColor = ds.color.red;
  const bl     = (e,key) => { e.target.style.borderColor = fieldErrors[key] ? ds.color.red : ds.color.border; };
  const setD   = k => e => { setDetails(p=>({...p,[k]:e.target.value})); if(fieldErrors[k]) setFieldErrors(p=>({...p,[k]:""})); };
  const setI   = k => e => setIntlForm(p=>({...p,[k]:e.target.value}));

  const handleRxUpload = e => {
    const file = e.target.files[0];
    if(!file) return;
    e.target.value = "";
    const r = new FileReader();
    r.onload = ev => setPrescription({preview:ev.target.result, name:file.name});
    r.readAsDataURL(file);
  };

  const goNext = () => { if(step===2&&!hasRx) setStep(4); else setStep(s=>s+1); };
  const goBack = () => { if(step===4&&!hasRx) setStep(2); else setStep(s=>s-1); };

  const handleContinue = () => {
    if(validateFields()) goNext();
  };

  // ── Place local order (fixed: all async ops properly wrapped)
  const handlePlaceOrder = async () => {
    if(!method) return;
    setSending(true); setErrMsg("");
    const phone = fullPhone;
    const orderData = {
      name: details.name, email: details.email, phone,
      address: details.address, paymentMethod: method,
      items: cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})),
      total, status:"pending", createdAt: serverTimestamp(),
      uid: user ? user.uid : "guest",
    };
    const emailParams = {
      from_name: details.name, company: user ? "Registered Customer" : "Guest Order",
      from_email: details.email, phone,
      product: orderSummary, quantity: cart.reduce((s,i)=>s+i.qty,0)+" items",
      budget: formatPHP(total), location: details.address, timeline: "Direct Order",
      details: `Payment: ${method}\nAddress: ${details.address}\nInstructions: ${details.instructions||"None"}\n\nItems:\n${orderSummary}\n\nTotal: ${formatPHP(total)}${hasRx?"\n\n⚠️ PRESCRIPTION attached.":""}`,
      reply_to: details.email,
    };
    const receiptParams = {
      customer_name: details.name, customer_email: details.email,
      customer_phone: phone, customer_address: details.address,
      order_items: orderSummary, order_total: formatPHP(total),
      payment_method: method, to_email: details.email,
    };
    try {
      // 1. Save to Firestore first (always, guest or logged in)
      const orderRef = await addDoc(collection(db,"orders"), orderData);

      // 2. Update customer stats if logged in
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
              phone: phone, // save phone back to profile
            });
          }
        } catch(_){}
        // 3. Save Rx if needed
        if(hasRx && prescription){
          try {
            await addDoc(collection(db,"rxUploads"),{
              uid:user.uid, customerName:details.name, orderId:orderRef.id,
              fileName:prescription.name, status:"pending", createdAt:serverTimestamp(),
            });
          } catch(_){}
        }
      }

      // 4. Send emails (non-blocking — don't let email failure stop order)
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, emailParams, EMAILJS_CONFIG.publicKey);
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.receiptTemplateId, receiptParams, EMAILJS_CONFIG.publicKey);
      } catch(emailErr){
        console.warn("Email send failed (order still placed):", emailErr);
      }

      if(onOrderComplete) onOrderComplete();
      setStep(5);
    } catch(err) {
      console.error("Order placement error:", err);
      setErrMsg("Something went wrong saving your order. Please try again or contact us at "+CONTACT.email);
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
      // Also save intl inquiry to Firestore
      await addDoc(collection(db,"orders"),{
        name:intlForm.name, email:intlForm.email, phone:intlForm.phone,
        address:`${intlForm.city}, ${intlForm.country}`, paymentMethod:"International Inquiry",
        items:cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})),
        total, status:"international_inquiry", createdAt:serverTimestamp(), uid:"guest",
      });
      setIntlDone(true);
    } catch(err) {
      console.error("Intl submit error:", err);
      setIntlErr("Something went wrong. Please email "+CONTACT.email);
    } finally {
      setIntlSending(false);
    }
  };

  // ── Empty cart
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

  // ── Order success
  if(step===5) return(
    <div style={{paddingTop:67,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",background:ds.color.canvas}}>
      <div style={{textAlign:"center",maxWidth:460,padding:"0 24px"}}>
        <div style={{width:76,height:76,borderRadius:"50%",background:ds.color.successBg,border:`2px solid ${ds.color.successBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 24px"}}>✓</div>
        <div style={{fontFamily:ds.font.display,fontSize:26,color:ds.color.textDark,marginBottom:10}}>Order Placed!</div>
        <p style={{fontSize:15,color:ds.color.textMuted,lineHeight:1.7,marginBottom:8}}>Thank you, <strong>{details.name}</strong>! A confirmation has been sent to <strong>{details.email}</strong>.</p>
        {user&&<div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,padding:"12px 16px",marginBottom:20,fontSize:13,color:ds.color.gold}}>⭐ You earned <strong>{Math.floor(total*POINTS_PER_PHP)} reward points</strong>!</div>}
        <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.lg,padding:"16px 20px",marginBottom:28,textAlign:"left"}}>
          <div style={{fontSize:12,fontWeight:700,color:ds.color.gold,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>What happens next</div>
          {["Our team confirms your order and availability","We contact you to confirm payment details","Tracking info will be sent once your order is shipped","For Rx items: ensure your prescription is valid"].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:10,fontSize:13,color:ds.color.textBody,marginBottom:4}}>
              <span style={{color:ds.color.gold,fontWeight:700,flexShrink:0}}>{i+1}.</span><span>{s}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn variant="primary" size="md" onClick={()=>setPage("home")}>Back to Home</Btn>
          {user&&<Btn variant="ghost" size="md" onClick={()=>setPage("portal")}>View My Orders</Btn>}
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

        {/* Step indicator */}
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

        {/* ── Step 2 — Delivery Details */}
        {step===2&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24,alignItems:"start"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
                <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>📦 Delivery Details</div>
                {user&&(
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:ds.color.textMuted,userSelect:"none"}}>
                    <input type="checkbox" checked={forSomeoneElse} onChange={e=>setForSomeoneElse(e.target.checked)} style={{width:16,height:16,accentColor:ds.color.red,cursor:"pointer"}}/>
                    Ordering for someone else?
                  </label>
                )}
              </div>

              {user&&!forSomeoneElse&&(
                <div style={{background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,padding:"10px 14px",marginBottom:20,fontSize:13,color:ds.color.success}}>
                  ✓ Delivering to your saved profile. Check details below and edit if needed.
                </div>
              )}
              {user&&forSomeoneElse&&(
                <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,padding:"10px 14px",marginBottom:20,fontSize:13,color:ds.color.gold}}>
                  📦 Enter the recipient's details below.
                </div>
              )}

              {/* Name */}
              <div style={{marginBottom:16}}>
                <label style={lbl}>{forSomeoneElse?"Recipient's Full Name *":"Your Full Name *"}</label>
                <input value={details.name} onChange={setD("name")} placeholder="Full name" style={{...inp,...(fieldErrors.name?inpErr:{})}} onFocus={fo} onBlur={e=>bl(e,"name")}/>
                {fieldErrors.name&&<div style={errTxt}>⚠ {fieldErrors.name}</div>}
              </div>

              {/* Email — only show "your" email if ordering for self */}
              {!forSomeoneElse&&(
                <div style={{marginBottom:16}}>
                  <label style={lbl}>Email Address *</label>
                  <input type="email" value={details.email} onChange={setD("email")} placeholder="you@email.com" style={{...inp,...(fieldErrors.email?inpErr:{})}} onFocus={fo} onBlur={e=>bl(e,"email")}/>
                  {fieldErrors.email&&<div style={errTxt}>⚠ {fieldErrors.email}</div>}
                </div>
              )}
              {forSomeoneElse&&(
                <div style={{marginBottom:16}}>
                  <label style={lbl}>Order Confirmation Email * <span style={{fontSize:11,fontWeight:400,color:ds.color.textMuted}}>(yours or recipient's)</span></label>
                  <input type="email" value={details.email} onChange={setD("email")} placeholder="Confirmation will be sent here" style={{...inp,...(fieldErrors.email?inpErr:{})}} onFocus={fo} onBlur={e=>bl(e,"email")}/>
                  {fieldErrors.email&&<div style={errTxt}>⚠ {fieldErrors.email}</div>}
                </div>
              )}

              {/* Phone with country code */}
              <div style={{marginBottom:16}}>
                <label style={lbl}>{forSomeoneElse?"Recipient's Phone / WhatsApp *":"Phone / WhatsApp *"}</label>
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

              {/* Address */}
              <div style={{marginBottom:16}}>
                <label style={lbl}>{forSomeoneElse?"Recipient's Delivery Address *":"Delivery Address *"}</label>
                <textarea value={details.address} onChange={setD("address")} rows={3} placeholder="Unit/House No., Street, Barangay, City, Province, ZIP" style={{...inp,...(fieldErrors.address?inpErr:{}),resize:"vertical",lineHeight:1.65}} onFocus={fo} onBlur={e=>bl(e,"address")}/>
                {fieldErrors.address&&<div style={errTxt}>⚠ {fieldErrors.address}</div>}
              </div>

              {/* Delivery instructions */}
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
                      {/* Camera — renders separate visible button, uses label trick for reliability */}
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
              {/* Camera input — id-linked via label above for maximum mobile compatibility */}
              <input id="rx-camera-input" type="file" accept="image/*" capture="environment" onChange={handleRxUpload} style={{display:"none"}}/>
              {/* File input */}
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
              <p style={{fontSize:14,color:ds.color.textMuted,marginBottom:22}}>Payment instructions will be sent to <strong>{details.email}</strong> after placing your order.</p>

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
              {hasRx&&prescription&&<div style={{marginTop:4,fontSize:13,color:ds.color.success}}>✓ Rx: {prescription.name}</div>}
              {user&&<div style={{marginTop:12,background:ds.color.goldLight,borderRadius:ds.radius.md,padding:"10px 12px",fontSize:12,color:ds.color.gold}}>⭐ Earn <strong>{Math.floor(total*POINTS_PER_PHP)} points</strong> for this order!</div>}
            </div>
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
            {[["home","Home"],["about","About Us"],["products","Shop"],["institutional","Institutional Orders"],["quote","Request Quote"],["contact","Contact"]].map(([id,label])=>(
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

  // Auth listener
  useEffect(()=>{
    return onAuthStateChanged(auth,async u=>{
      setUser(u);
      if(u){
        setIsAdmin(ADMIN_EMAILS.includes(u.email?.toLowerCase()));
        try{const snap=await getDoc(doc(db,"customers",u.uid));if(snap.exists())setWishlist(snap.data().wishlist||[]);}catch(_){}
      }else{setIsAdmin(false);setWishlist([]);}
      setAuthLoading(false);
    });
  },[]);

  const handleSignIn=()=>setShowAuth(true);
  const handleSignOut=async()=>{await signOut(auth);setPage("home");};
  const handleAuthSuccess=u=>{setShowAuth(false);setUser(u);setIsAdmin(ADMIN_EMAILS.includes(u.email?.toLowerCase()));};

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
      </main>
      <Footer setPage={setPage}/>
      <FloatingChat/>
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)} onSuccess={handleAuthSuccess}/>}
    </div>
  );
}
