// src/constants/design.js
// Design system tokens — macOS aesthetic with brand color palette

export const ds = {
  color: {
    // Brand palette (unchanged)
    white:"#FFFFFF", canvas:"#F5F5F7", canvasWarm:"#FFF8F6", canvasGold:"#FFFBF0",
    red:"#CC2F3C", redDark:"#A8252F", redLight:"#FDECEA", redBorder:"#F5C4C7",
    gold:"#D4900F", goldBright:"#F0A81C", goldLight:"#FEF6E0", goldBorder:"#F5D98A",
    pink:"#E8837A", pinkLight:"#FDF0EE",
    textDark:"#1D1D1F", textBody:"#3D3530", textMuted:"#6E6E73", textLight:"#A89E98",
    border:"rgba(0,0,0,0.08)", borderLight:"rgba(0,0,0,0.05)",
    success:"#1A7F5B", successBg:"#E6F5EF", successBorder:"#A3D9C3",
    // macOS surfaces
    surface:"#F5F5F7", surfaceCard:"#FFFFFF", surfaceGlass:"rgba(245,245,247,0.80)",
    surfaceDark:"#1D1D1F", surfaceDarkCard:"rgba(255,255,255,0.06)",
  },
  // SF Pro font stack — falls back to system UI
  font: {
    display:"-apple-system,'SF Pro Display','Helvetica Neue',sans-serif",
    body:"-apple-system,'SF Pro Text','Helvetica Neue',sans-serif",
    serif:"'DM Serif Display','Georgia',serif",
  },
  radius: { sm:6, md:8, lg:12, xl:18, pill:980 },
  shadow: {
    xs:"0 1px 3px rgba(0,0,0,0.06)", sm:"0 2px 8px rgba(0,0,0,0.08)",
    md:"0 4px 16px rgba(0,0,0,0.10)", lg:"0 8px 32px rgba(0,0,0,0.12)",
    red:"0 4px 18px rgba(204,47,60,0.22)",
  },
};
