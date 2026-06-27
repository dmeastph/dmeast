import { useState } from "react";
import { IS_SANDBOX } from "../lib/firebase";

export function SandboxBanner(){
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

