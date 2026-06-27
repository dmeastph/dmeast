// RFQ calculation helpers
export const DEFAULT_MARGINS={medicine:15,supply:27.5,equipment:null};

// v16.18: Pack size helpers for RFQ unit conversion
// Catalog stores packSize as a string like "100's", "30's", "60mL", "1's".
// Only count-based packs (with 's suffix or just a plain integer) can be split into per-piece pricing.
export function parsePackCount(packStr) {
  if (!packStr) return null;
  const s = String(packStr).trim().toLowerCase();
  // Volume/weight units mean the price IS already per unit-of-sale (bottle, vial, IV bag)
  if (/m?l$|gm?$|kg$|mcg$/i.test(s)) return null;
  // Match "100's", "30 s", "100s", or just "100"
  const m = s.match(/^(\d+)\s*'?s?$/);
  return m ? Number(m[1]) : null;
}

// Detects whether the RFQ's requested unit is a piece-unit (tablet, pc, capsule, etc.)
// vs a pack-unit (box, pack, bottle). Only piece-units trigger per-piece price math.
export function isPieceUnit(unit) {
  if (!unit) return false;
  const u = String(unit).toLowerCase().trim();
  return /tablet|tab\b|capsule|cap\b|piece|^pc$|pcs|dose|sachet|amp|ampule|^each$|unit/.test(u);
}

