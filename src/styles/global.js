export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--red:#CC2F3C;--gold:#F0A81C;--canvas:#F5F5F7;--border:rgba(0,0,0,0.08);--text:#1D1D1F;--font-display:-apple-system,'SF Pro Display','Helvetica Neue',sans-serif;--font-body:-apple-system,'SF Pro Text','Helvetica Neue',sans-serif}
  html{scroll-behavior:smooth}
  body{font-family:var(--font-body);color:var(--text);background:#F5F5F7;-webkit-font-smoothing:antialiased}
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
  .dm-nav-link{position:relative;background:none;border:none;font-family:var(--font-body);font-size:13px;font-weight:400;letter-spacing:-0.01em;padding:6px 12px;color:#3A3A3C;transition:background .15s,color .15s;cursor:pointer;border-radius:980px}
  .dm-nav-link:hover{background:rgba(0,0,0,0.05);color:#1D1D1F}
  .dm-nav-link.active{background:rgba(204,47,60,0.08);color:var(--red);font-weight:500}
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

