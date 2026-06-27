import { ds } from "../constants/design";
import { CATEGORIES } from "../constants/categories";

export function Btn({variant="primary",size="md",onClick,children,disabled,fullWidth,href,type="button"}){
  const base={display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:ds.font.body,fontWeight:600,letterSpacing:"0.01em",borderRadius:ds.radius.md,border:"2px solid transparent",transition:"all 0.18s ease",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,width:fullWidth?"100%":"auto",textDecoration:"none"};
  const sizes={sm:{fontSize:13,padding:"8px 18px"},md:{fontSize:14,padding:"11px 24px"},lg:{fontSize:15,padding:"13px 30px"},xl:{fontSize:16,padding:"15px 38px"}};
  const variants={primary:{background:ds.color.red,color:"#fff",borderColor:ds.color.red,boxShadow:ds.shadow.red},secondary:{background:"#fff",color:ds.color.red,borderColor:ds.color.red},outline:{background:"#fff",color:ds.color.textBody,borderColor:ds.color.border},gold:{background:ds.color.goldLight,color:ds.color.gold,borderColor:ds.color.goldBorder},ghost:{background:"rgba(204,47,60,0.07)",color:ds.color.red,borderColor:"transparent"},dark:{background:ds.color.textDark,color:"#fff",borderColor:"transparent"},success:{background:ds.color.successBg,color:ds.color.success,borderColor:ds.color.successBorder}};
  const style={...base,...sizes[size],...variants[variant]};
  if(href) return <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

export function CtaBadge({type}){
  const map={buy:{label:"Buy Now",bg:ds.color.successBg,color:ds.color.success,border:ds.color.successBorder},quote:{label:"Request Quote",bg:ds.color.goldLight,color:ds.color.gold,border:ds.color.goldBorder},sales:{label:"Talk to Sales",bg:ds.color.redLight,color:ds.color.red,border:ds.color.redBorder}};
  const t=map[type]||map.quote;
  return <span style={{display:"inline-block",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",padding:"3px 9px",borderRadius:ds.radius.pill,background:t.bg,color:t.color,border:`1px solid ${t.border}`,whiteSpace:"nowrap"}}>{t.label}</span>;
}

export function Tag({children,color=ds.color.redLight,textColor=ds.color.red}){
  return <span style={{display:"inline-block",fontSize:12,fontWeight:500,padding:"4px 12px",borderRadius:ds.radius.pill,background:color,color:textColor}}>{children}</span>;
}

export function SectionHeader({eyebrow,title,subtitle,center,dark}){
  return(
    <div style={{textAlign:center?"center":"left",marginBottom:48}}>
      {eyebrow&&<div style={{fontSize:11,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:dark?"rgba(255,255,255,0.6)":ds.color.red,marginBottom:10}}>{eyebrow}</div>}
      <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.75rem,3vw,2.3rem)",fontWeight:400,color:dark?"#fff":ds.color.textDark,lineHeight:1.25,marginBottom:subtitle?14:0}}>{title}</h2>
      {subtitle&&<p style={{fontSize:15,color:dark?"rgba(255,255,255,0.65)":ds.color.textMuted,lineHeight:1.75,maxWidth:center?560:"none",margin:center?"0 auto":0}}>{subtitle}</p>}
    </div>
  );
}

export function BrandLogo({height=40,darkMode=false}){
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

export function ProductImg({imageSrc,category,name,height=180}){
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

export function Spinner({size=20,color=ds.color.red}){
  return <div style={{width:size,height:size,border:`2px solid ${color}30`,borderTopColor:color,borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>;
}

export function PageHero({eyebrow,title,subtitle}){
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

export function Divider(){return <div style={{height:1,background:ds.color.borderLight}}/>;}

