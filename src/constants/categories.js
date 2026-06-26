// src/constants/categories.js
// Phase 1 extraction — product categories and PayRex pharma flag

export const CATEGORIES = [
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

// v16.19: PayRex compliance — temporary public-side hide of pharmaceuticals.
// Public visitors won't see pharma category, products, or copy mentioning them.
// Admin dashboard, supplier catalog, RFQ system, and Firestore data remain 100% intact.
// FLIP TO false WHEN PAYREX APPROVES THE MERCHANT ACCOUNT.
export const HIDE_PHARMA_PUBLIC = true;
export const PUBLIC_CATEGORIES = HIDE_PHARMA_PUBLIC ? CATEGORIES.filter(c=>c.id!=="pharma") : CATEGORIES;
export const filterPharmaPublic = (arr) => HIDE_PHARMA_PUBLIC ? arr.filter(p=>p.category!=="pharma") : arr;
