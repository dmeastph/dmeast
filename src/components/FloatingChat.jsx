import { useState, useEffect } from "react";
import { CONTACT } from "../constants/contact";
import { ds } from "../constants/design";

export function FloatingChat({ hidden }){
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

