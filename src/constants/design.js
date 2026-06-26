// src/constants/design.js
// Phase 1 extraction — design system tokens

export const ds = {
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
