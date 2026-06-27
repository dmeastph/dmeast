import { useState, useEffect, useRef } from "react";
import { ds } from "../constants/design";
import { CATEGORIES } from "../constants/categories";
import { BrandLogo, Btn } from "./ui";

export function Navbar({activePage,setPage,cartCount,user,isAdmin,onSignIn,onSignOut}){
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

  const links=[{id:"home",label:"Home"},{id:"about",label:"About Us"},{id:"products",label:"Shop"},{id:"institutional",label:"Institutional"},{id:"blog",label:"Blog"},{id:"quote",label:"Request Quote"},{id:"track",label:"Track Order"},{id:"contact",label:"Contact"}];
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

