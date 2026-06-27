import { useState, useEffect, useRef } from "react";
import { ds } from "../constants/design";
import { CATEGORIES, PUBLIC_CATEGORIES, filterPharmaPublic } from "../constants/categories";
import { CLIENT_TYPES, COMPANY_MILESTONES, HOW_IT_WORKS, INSTITUTIONAL_SERVICES, SHIPPING_METHODS, REGIONS_SERVED, PAYMENT_METHODS } from "../constants/content";
import { formatPHP } from "../utils/format";
import { useProducts } from "../context/ProductsContext";
import { Btn, CtaBadge, Tag, SectionHeader, BrandLogo, Spinner, PageHero, Divider } from "../components/ui";
import { ProductCard } from "../components/ProductCard";
import { usePublishedPosts } from "../lib/blog";
import { CONTACT } from "../constants/contact";

export function TopAnnouncementBar(){
  const [show, setShow] = useState(true);
  if (!show) return null;
  return (
    <div style={{
      background: `linear-gradient(90deg, ${ds.color.red} 0%, #B91C2A 50%, ${ds.color.red} 100%)`,
      color: "#fff",
      padding: "8px 28px",
      fontSize: 12.5,
      fontWeight: 600,
      textAlign: "center",
      letterSpacing: "0.02em",
      position: "relative",
      zIndex: 50,
    }}>
      <span style={{marginRight:6}}>🚚</span>
      Free delivery within Metro Manila on orders ₱5,000+
      <span style={{margin:"0 12px",opacity:0.6}}>·</span>
      <span>📞 +63 951 040 1708</span>
      <button onClick={()=>setShow(false)} aria-label="Close announcement" style={{
        position:"absolute",
        right:14,
        top:"50%",
        transform:"translateY(-50%)",
        background:"none",
        border:"none",
        color:"#fff",
        cursor:"pointer",
        fontSize:14,
        opacity:0.8,
        padding:4,
      }}>✕</button>
    </div>
  );
}

// v16.0: Modern hero with photo slot, trust badges, dual CTA
export function HeroSectionV16({setPage}){
  return (
    <section className="dm-hero-section" style={{
      background: `linear-gradient(150deg, ${ds.color.canvasWarm} 0%, ${ds.color.white} 60%, ${ds.color.canvasGold} 100%)`,
      padding: "72px 0 80px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div className="dm-dot-bg" style={{position:"absolute",right:0,top:0,width:"55%",height:"100%",opacity:0.55,pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"-100px",right:"-80px",width:480,height:480,borderRadius:"50%",border:`2px solid ${ds.color.goldBright}25`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-160px",left:"-100px",width:380,height:380,borderRadius:"50%",background:`radial-gradient(circle, ${ds.color.redLight} 0%, transparent 70%)`,opacity:0.6,pointerEvents:"none"}}/>
      
      <div style={{maxWidth:1280,margin:"0 auto",padding:"0 28px",position:"relative",zIndex:1}}>
        <div className="dm-hero-grid">
          
          {/* LEFT: Text content */}
          <div>
            {/* Trust badges row */}
            <div className="dm-fade-up" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:6,background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.pill,padding:"5px 12px",fontSize:11.5,color:ds.color.red,fontWeight:700,letterSpacing:"0.02em"}}>
                <span style={{fontSize:11}}>📋</span> BIR-Registered
              </span>
              <span style={{display:"inline-flex",alignItems:"center",gap:6,background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.pill,padding:"5px 12px",fontSize:11.5,color:ds.color.gold,fontWeight:700,letterSpacing:"0.02em"}}>
                <span style={{fontSize:11}}>🏥</span> 50+ Healthcare Institutions
              </span>
              <span style={{display:"inline-flex",alignItems:"center",gap:6,background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.pill,padding:"5px 12px",fontSize:11.5,color:ds.color.textBody,fontWeight:600,letterSpacing:"0.02em"}}>
                <span style={{fontSize:11}}>✓</span> FDA-Licensed Suppliers
              </span>
            </div>
            
            <h1 className="dm-fade-up dm-fade-up-1" style={{fontFamily:ds.font.display,fontSize:"clamp(2.2rem,4.5vw,3.6rem)",fontWeight:400,color:ds.color.textDark,lineHeight:1.1,marginBottom:8}}>
              Your Trusted Source for
            </h1>
            <h1 className="dm-fade-up dm-fade-up-2" style={{fontFamily:ds.font.display,fontSize:"clamp(2.2rem,4.5vw,3.6rem)",fontWeight:400,lineHeight:1.1,marginBottom:24}}>
              <span style={{color:ds.color.red}}>Quality Medical</span><br/>
              <span style={{color:ds.color.textDark}}>Solutions</span>
              <span style={{color:ds.color.gold}}>.</span>
            </h1>
            
            <p className="dm-fade-up dm-fade-up-3" style={{fontSize:16,color:ds.color.textMuted,lineHeight:1.75,maxWidth:520,marginBottom:32}}>
              Pharmaceuticals, medical equipment, and healthcare essentials —
              delivered nationwide. Trusted by hospitals, clinics, LGUs, and 
              individuals across the Philippines.
            </p>
            
            {/* Search bar */}
            <div className="dm-fade-up dm-fade-up-3" style={{maxWidth:520,marginBottom:24}}>
              <button onClick={()=>setPage("products")} style={{
                width:"100%",
                background:"#fff",
                border:`2px solid ${ds.color.border}`,
                borderRadius:ds.radius.lg,
                padding:"14px 18px 14px 50px",
                fontSize:14,
                color:ds.color.textMuted,
                cursor:"pointer",
                position:"relative",
                fontFamily:ds.font.body,
                textAlign:"left",
                transition:"border-color 0.15s, box-shadow 0.15s",
                boxShadow:ds.shadow.xs,
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=ds.color.red;e.currentTarget.style.boxShadow=ds.shadow.sm;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=ds.color.border;e.currentTarget.style.boxShadow=ds.shadow.xs;}}
              >
                <span style={{position:"absolute",left:18,top:"50%",transform:"translateY(-50%)",fontSize:18}}>🔍</span>
                Search products, equipment, or browse our catalog…
                <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:ds.color.red,color:"#fff",borderRadius:ds.radius.md,padding:"6px 14px",fontSize:12,fontWeight:700}}>Browse →</span>
              </button>
            </div>
            
            {/* Dual CTA */}
            <div className="dm-fade-up dm-fade-up-4" style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:28}}>
              <Btn variant="primary" size="lg" onClick={()=>setPage("products")}>Shop Products</Btn>
              <Btn variant="outline" size="lg" onClick={()=>setPage("quote")}>Request Bulk Quote</Btn>
            </div>
            
            {/* Trust line */}
            <div className="dm-fade-up dm-fade-up-4" style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",fontSize:12,color:ds.color.textMuted}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{display:"inline-flex"}}>{"★★★★★".split("").map((s,i)=><span key={i} style={{color:ds.color.gold}}>★</span>)}</span>
                <span style={{fontWeight:700,color:ds.color.textDark}}>5.0</span>
                <span>from healthcare partners</span>
              </div>
              <span style={{opacity:0.4}}>·</span>
              <span>🚚 Nationwide delivery</span>
              <span style={{opacity:0.4}}>·</span>
              <span>🔒 Secure checkout</span>
            </div>
          </div>
          
          {/* RIGHT: v15-style stat tiles + dark info panel — hidden on mobile via dm-hero-right */}
          <div className="dm-hero-right" style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="dm-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
              {[
                {v:"5+",l:"Years Serving PH",accent:ds.color.red},
                {v:"500+",l:"Clients Nationwide",accent:ds.color.goldBright},
                {v:"9",l:"Product Categories",accent:ds.color.red},
                {v:"24/7",l:"Order Support",accent:ds.color.goldBright}
              ].map((s,i)=>(
                <div key={i} style={{
                  background:ds.color.white,
                  border:`1px solid ${ds.color.border}`,
                  borderRadius:ds.radius.lg,
                  padding:"22px 18px",
                  textAlign:"center",
                  borderTop:`3px solid ${s.accent}`,
                  boxShadow:ds.shadow.xs
                }}>
                  <div style={{fontFamily:ds.font.display,fontSize:"2rem",color:s.accent,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:11,color:ds.color.textMuted,marginTop:6,fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase"}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{
              background:ds.color.textDark,
              borderRadius:ds.radius.lg,
              padding:"22px 24px"
            }}>
              <div style={{fontSize:10,fontWeight:700,color:ds.color.goldBright,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Why Choose DMEAST</div>
              <div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:8}}>Products from Authorized Suppliers</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",lineHeight:1.7}}>
                All products are sourced from verified and authorized suppliers. Standard items available for direct purchase. Institutional and specialized orders handled upon request.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


// v16.0: Stats trust band
export function StatsTrustBand(){
  const stats = [
    { icon:"🏆", value:"5+", label:"Years of Excellence", color:ds.color.red },
    { icon:"💊", value:"500+", label:"Quality Products", color:ds.color.goldBright },
    { icon:"🏥", value:"50+", label:"Healthcare Institutions", color:ds.color.red },
    { icon:"⭐", value:"100%", label:"Quality-First Promise", color:ds.color.goldBright },
  ];
  return (
    <section style={{background:ds.color.white,padding:"40px 28px",borderTop:`1px solid ${ds.color.borderLight}`,borderBottom:`1px solid ${ds.color.borderLight}`}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:20}}>
          {stats.map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"4px"}}>
              <div style={{width:50,height:50,borderRadius:ds.radius.md,background:s.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {s.icon}
              </div>
              <div>
                <div style={{fontFamily:ds.font.display,fontSize:24,color:s.color,lineHeight:1,fontWeight:400}}>{s.value}</div>
                <div style={{fontSize:12,color:ds.color.textMuted,marginTop:4,fontWeight:500}}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// v16.0: Category grid (icon-based, mobile-friendly)
export function CategoryGridV16({setPage,setActiveCategory}){
  const allCats = PUBLIC_CATEGORIES.filter(c => !c.institutional);
  return (
    <section style={{background:ds.color.canvas,padding:"64px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.gold,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Browse by Category</div>
          <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400,marginBottom:8}}>What are you looking for today?</h2>
          <p style={{fontSize:14,color:ds.color.textMuted,maxWidth:560,margin:"0 auto"}}>Find medical equipment, devices, and healthcare essentials — all in one place.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:14}}>
          {allCats.map((cat,i)=>{
            const colors = [ds.color.red, ds.color.gold, ds.color.red, ds.color.gold];
            const accent = colors[i % colors.length];
            return (
              <button key={cat.id} onClick={()=>{setActiveCategory(cat.id);setPage("products");}} style={{
                background:"#fff",
                border:`1px solid ${ds.color.border}`,
                borderRadius:ds.radius.lg,
                padding:"24px 16px",
                cursor:"pointer",
                fontFamily:ds.font.body,
                transition:"transform 0.15s, border-color 0.15s, box-shadow 0.15s",
                boxShadow:ds.shadow.xs,
                textAlign:"center",
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=accent;e.currentTarget.style.boxShadow=ds.shadow.md;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor=ds.color.border;e.currentTarget.style.boxShadow=ds.shadow.xs;}}
              >
                <div style={{
                  width:54,
                  height:54,
                  borderRadius:"50%",
                  background:`linear-gradient(135deg, ${accent}22 0%, ${accent}11 100%)`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  margin:"0 auto 12px",
                  fontSize:24,
                  border:`2px solid ${accent}33`,
                }}>
                  {cat.icon || "💊"}
                </div>
                <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark,marginBottom:4}}>{cat.label}</div>
                <div style={{fontSize:11,color:ds.color.textMuted}}>Browse →</div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// v16.0: Trending products section (horizontal scroll on mobile)
export function TrendingProductsV16({setPage, addToCart}){
  const { products: PRODUCTS } = useProducts();
  const trending = filterPharmaPublic(PRODUCTS).filter(p =>
    p.featured && p.cta === "buy" && !p.requiresPrescription &&
    !CATEGORIES.find(c=>c.id===p.category)?.institutional
  ).slice(0,8);
  const fallback = trending.length >= 4 ? trending : filterPharmaPublic(PRODUCTS).filter(p => p.cta === "buy").slice(0,8);
  const display = fallback.length >= 4 ? fallback : trending;

  return (
    <section style={{background:ds.color.white,padding:"64px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32,flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:ds.color.red,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>🔥 Trending</div>
            <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400,marginBottom:6}}>Most Popular Products</h2>
            <p style={{fontSize:14,color:ds.color.textMuted,maxWidth:520}}>Top-selling healthcare essentials, ready to ship.</p>
          </div>
          <button onClick={()=>setPage("products")} style={{background:"none",border:"none",color:ds.color.red,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:ds.font.body,padding:"6px 0"}}>
            See All Products →
          </button>
        </div>
        
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
          {display.slice(0,4).map(p=><ProductCard key={p.id} product={p} addToCart={addToCart} setPage={setPage}/>)}
        </div>
      </div>
    </section>
  );
}

// v16.0: Promo deal cards (color-blocked feature products)
export function PromoCardsV16({setPage}){
  const { products: PRODUCTS } = useProducts();
  const promos = filterPharmaPublic(PRODUCTS).filter(p => p.featured && p.cta === "buy" && !p.requiresPrescription).slice(0,3);
  
  if (promos.length < 2) return null;
  
  const styles = [
    { bg:`linear-gradient(135deg, ${ds.color.redLight} 0%, ${ds.color.canvasWarm} 100%)`, accent:ds.color.red, badge:"BEST SELLER" },
    { bg:`linear-gradient(135deg, ${ds.color.goldLight} 0%, ${ds.color.canvasGold} 100%)`, accent:ds.color.gold, badge:"NEW" },
    { bg:`linear-gradient(135deg, #FCE7F3 0%, ${ds.color.canvas} 100%)`, accent:"#EC4899", badge:"POPULAR" },
  ];
  
  return (
    <section style={{background:ds.color.canvas,padding:"40px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
          {promos.map((p,i)=>{
            const s = styles[i % styles.length];
            return (
              <button key={p.id} onClick={()=>setPage("products")} style={{
                background:s.bg,
                border:`1px solid ${s.accent}33`,
                borderRadius:ds.radius.xl,
                padding:"24px 24px",
                cursor:"pointer",
                fontFamily:ds.font.body,
                textAlign:"left",
                position:"relative",
                overflow:"hidden",
                transition:"transform 0.15s, box-shadow 0.15s",
                boxShadow:ds.shadow.xs,
                minHeight:160,
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=ds.shadow.md;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=ds.shadow.xs;}}
              >
                <div style={{position:"absolute",top:14,right:14,fontSize:9.5,fontWeight:700,color:s.accent,letterSpacing:"0.08em",background:"#fff",padding:"3px 9px",borderRadius:ds.radius.pill,border:`1px solid ${s.accent}44`}}>{s.badge}</div>
                <div style={{fontSize:48,marginBottom:8,opacity:0.7}}>💊</div>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:4,lineHeight:1.2,maxWidth:200}}>{p.name}</div>
                {p.price && <div style={{fontSize:14,color:s.accent,fontWeight:700,marginBottom:10}}>{formatPHP(p.price)}</div>}
                <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,color:s.accent}}>
                  Shop Now →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// v16.0: Why DMEAST (4 USPs)
export function WhyDMEASTV16(){
  const reasons = [
    { icon:"🏥", title:"Authorized Distributor", desc:"All products sourced from FDA-licensed and verified suppliers across the Philippines." },
    { icon:"📋", title:"BIR-Compliant Documentation", desc:"Proper Sales Invoices and Official Receipts for every transaction. Tax-ready paperwork." },
    { icon:"🚚", title:"Nationwide Delivery", desc:"From Metro Manila to Mindanao — fast, reliable shipping with tracking." },
    { icon:"💼", title:"Bulk Pricing for Institutions", desc:"Special rates for hospitals, LGUs, clinics, and corporate buyers. Request a quote." },
  ];
  return (
    <section style={{background:ds.color.white,padding:"72px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.red,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Why DMEAST</div>
          <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400}}>Healthcare you can trust.</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:20}}>
          {reasons.map((r,i)=>(
            <div key={i} style={{
              background:ds.color.white,
              border:`1px solid ${ds.color.border}`,
              borderRadius:ds.radius.lg,
              padding:"28px 22px",
              textAlign:"left",
              transition:"transform 0.15s, box-shadow 0.15s, border-color 0.15s",
              borderTop:`3px solid ${i%2===0?ds.color.red:ds.color.goldBright}`,
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=ds.shadow.md;}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}
            >
              <div style={{
                width:52,height:52,borderRadius:ds.radius.md,
                background:`linear-gradient(135deg, ${i%2===0?ds.color.redLight:ds.color.goldLight} 0%, ${i%2===0?ds.color.canvasWarm:ds.color.canvasGold} 100%)`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:18,
                border:`1px solid ${i%2===0?ds.color.redBorder:ds.color.goldBorder}`,
              }}>{r.icon}</div>
              <div style={{fontSize:16,fontWeight:700,color:ds.color.textDark,marginBottom:8}}>{r.title}</div>
              <div style={{fontSize:13.5,color:ds.color.textMuted,lineHeight:1.65}}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// v16.0: Institutional CTA banner
export function InstitutionalCTABannerV16({setPage}){
  return (
    <section style={{background:ds.color.canvas,padding:"56px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{
          background:`linear-gradient(135deg, ${ds.color.textDark} 0%, #2a2018 100%)`,
          borderRadius:ds.radius.xl,
          padding:"48px 40px",
          position:"relative",
          overflow:"hidden",
        }}>
          {/* Decorative golden circle */}
          <div style={{
            position:"absolute",top:-80,right:-80,width:280,height:280,borderRadius:"50%",
            background:`radial-gradient(circle, ${ds.color.gold}33 0%, transparent 70%)`,
            pointerEvents:"none",
          }}/>
          <div style={{
            position:"absolute",bottom:-60,left:-60,width:200,height:200,borderRadius:"50%",
            border:`2px solid ${ds.color.gold}33`,
            pointerEvents:"none",
          }}/>
          
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:32,alignItems:"center",position:"relative",zIndex:1}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.goldBright,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:14}}>For Institutions</div>
              <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,2.6vw,2rem)",color:"#fff",fontWeight:400,marginBottom:14,lineHeight:1.2}}>
                Buying for a hospital, LGU, or clinic?
              </h2>
              <p style={{fontSize:14.5,color:"rgba(255,255,255,0.75)",lineHeight:1.7,marginBottom:0,maxWidth:560}}>
                Get bulk pricing, dedicated account support, and BIR-compliant documentation 
                for institutional purchases. Equipment, devices, and supplies — sourced and delivered.
              </p>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{display:"inline-flex",flexDirection:"column",gap:10,alignItems:"stretch"}}>
                <Btn variant="gold" size="lg" onClick={()=>setPage("quote")}>Request Bulk Quote</Btn>
                <Btn variant="outline" size="md" onClick={()=>setPage("institutional")}>Browse Institutional Products</Btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// v16.0: Testimonials (with disclaimer note as you requested)
export function TestimonialsV16(){
  // Sample testimonials with disclaimer — replace with real ones when available
  const testimonials = [
    { 
      name:"Dr. Maria Santos", 
      role:"Hospital Pharmacy Director, QC", 
      quote:"DMEAST consistently delivers on time with proper documentation. Their BIR-compliant invoicing makes audit season easy.",
      rating: 5,
      avatar: "👩‍⚕️"
    },
    { 
      name:"Engr. Robert Cruz", 
      role:"LGU Procurement Officer", 
      quote:"Reliable supplier for our health center supplies. Bulk pricing helps stretch our budget for the community.",
      rating: 5,
      avatar: "👨‍💼"
    },
    { 
      name:"Nurse Jenny Reyes", 
      role:"Clinic Manager, Cavite", 
      quote:"Fast nationwide delivery. The team is responsive on Messenger and answers questions about products knowledgeably.",
      rating: 5,
      avatar: "👩‍⚕️"
    },
    { 
      name:"Dr. Paolo Tan", 
      role:"Medical Director", 
      quote:"From diagnostic devices to lab equipment — DMEAST is our go-to for institutional needs. Quality is consistent.",
      rating: 5,
      avatar: "👨‍⚕️"
    },
  ];
  
  return (
    <section style={{background:ds.color.white,padding:"72px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.gold,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>What Our Partners Say</div>
          <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400,marginBottom:8}}>Trusted by healthcare professionals.</h2>
          <p style={{fontSize:13,color:ds.color.textLight,fontStyle:"italic"}}>Sample testimonials shown · Real customer reviews coming soon</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18}}>
          {testimonials.map((t,i)=>(
            <div key={i} style={{
              background:ds.color.canvas,
              border:`1px solid ${ds.color.border}`,
              borderRadius:ds.radius.lg,
              padding:"24px 22px",
              position:"relative",
            }}>
              <div style={{display:"flex",gap:2,marginBottom:12}}>
                {Array.from({length:t.rating}).map((_,j)=><span key={j} style={{color:ds.color.gold,fontSize:14}}>★</span>)}
              </div>
              <p style={{fontSize:13.5,color:ds.color.textBody,lineHeight:1.65,marginBottom:18,fontStyle:"italic"}}>"{t.quote}"</p>
              <div style={{display:"flex",alignItems:"center",gap:10,paddingTop:14,borderTop:`1px solid ${ds.color.borderLight}`}}>
                <div style={{
                  width:40,height:40,borderRadius:"50%",
                  background:`linear-gradient(135deg, ${ds.color.redLight} 0%, ${ds.color.goldLight} 100%)`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
                  border:`1px solid ${ds.color.border}`,
                }}>{t.avatar}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark}}>{t.name}</div>
                  <div style={{fontSize:11,color:ds.color.textMuted}}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// v16.0: FAQ accordion (great for SEO and customer trust)
export function FAQAccordionV16(){
  const faqs = [
    { q:"How long does delivery take?", a:"Metro Manila orders ship within 1-2 business days. Provincial orders typically arrive within 3-7 business days, depending on location. Bulk institutional orders may take longer based on item availability." },
    { q:"Do you accept LGU Purchase Orders (POs)?", a:"Yes! We process orders for LGUs, hospitals, government health centers, and other institutional buyers. Contact us with your PO requirements and we'll prepare a formal quotation." },
    { q:"Are your products FDA-registered?", a:"Yes. All medical equipment and devices are sourced from FDA-licensed distributors and manufacturers, meeting BFAD/FDA standards. Documentation available upon request." },
    { q:"Do you provide official BIR receipts?", a:"Absolutely. DMEAST is a BIR-registered VAT entity (TIN: 417-877-476-00000). We issue proper Sales Invoices and Official Receipts for all transactions, tax-ready for your records." },
    { q:"What payment methods do you accept?", a:"GCash, Maya, bank transfer (BDO, BPI, Metrobank), and credit terms for verified institutional clients (Net 15/30/60). We're working on integrating online card payments." },
    { q:"Can I return or exchange products?", a:"Returns are accepted for damaged or incorrect items within 7 days of delivery, in original sealed packaging. Contact us within 24 hours of receipt to start a return." },
  ];
  
  const [openIdx, setOpenIdx] = useState(0);
  
  return (
    <section style={{background:ds.color.canvas,padding:"72px 28px"}}>
      <div style={{maxWidth:880,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.red,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Common Questions</div>
          <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400}}>Frequently Asked Questions</h2>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {faqs.map((f,i)=>(
            <div key={i} style={{
              background:"#fff",
              border:`1px solid ${openIdx===i?ds.color.red:ds.color.border}`,
              borderRadius:ds.radius.lg,
              overflow:"hidden",
              transition:"border-color 0.15s",
            }}>
              <button onClick={()=>setOpenIdx(openIdx===i?-1:i)} style={{
                width:"100%",
                padding:"16px 20px",
                background:"none",
                border:"none",
                cursor:"pointer",
                fontFamily:ds.font.body,
                textAlign:"left",
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:16,
                fontSize:14.5,
                fontWeight:600,
                color:ds.color.textDark,
              }}>
                <span>{f.q}</span>
                <span style={{
                  fontSize:18,
                  color:openIdx===i?ds.color.red:ds.color.textMuted,
                  transform:openIdx===i?"rotate(45deg)":"rotate(0deg)",
                  transition:"transform 0.2s, color 0.15s",
                  flexShrink:0,
                  fontWeight:300,
                }}>+</span>
              </button>
              {openIdx===i && (
                <div style={{padding:"0 20px 18px",fontSize:13.5,color:ds.color.textMuted,lineHeight:1.7}}>
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:32,fontSize:13,color:ds.color.textMuted}}>
          Have a different question? <a href="mailto:info@dmeastph.com" style={{color:ds.color.red,fontWeight:700,textDecoration:"none"}}>Email us at info@dmeastph.com</a>
        </div>
      </div>
    </section>
  );
}


// ─── LEGACY (v15) HERO — kept for fallback, no longer rendered ──────────────
export function HeroSection({setPage}){
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
            <p className="dm-fade-up dm-fade-up-3" style={{fontSize:16,color:ds.color.textMuted,lineHeight:1.8,maxWidth:500,marginBottom:36}}>Shop healthcare products, diagnostic devices, and beauty & wellness essentials — trusted by clinics, businesses, and individuals across the Philippines.</p>
            <div className="dm-fade-up dm-fade-up-4" style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:44}}>
              <Btn variant="primary" size="lg" onClick={()=>setPage("products")}>Shop Now</Btn>
              <Btn variant="secondary" size="lg" onClick={()=>setPage("institutional")}>Institutional Orders</Btn>
            </div>
            <div className="dm-fade-up dm-fade-up-4" style={{display:"flex",gap:24,flexWrap:"wrap"}}>
              {[["🚚","Fast Nationwide Delivery"],["🔒","Secure Checkout"],["✅","Authorized Suppliers"],["💬","Dedicated Support"]].map(([icon,label])=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>{icon}</span><span style={{fontSize:12,color:ds.color.textMuted,fontWeight:500}}>{label}</span></div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="dm-grid-4" style={{gridTemplateColumns:"repeat(2,1fr)"}}>
              {[{v:"5+",l:"Years Serving PH",accent:ds.color.red},{v:"500+",l:"Clients Nationwide",accent:ds.color.goldBright},{v:"9",l:"Product Categories",accent:ds.color.red},{v:"24/7",l:"Order Support",accent:ds.color.goldBright}].map((s,i)=>(
                <div key={i} style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"22px 18px",textAlign:"center",borderTop:`3px solid ${s.accent}`,boxShadow:ds.shadow.xs}}>
                  <div style={{fontFamily:ds.font.display,fontSize:"2rem",color:s.accent,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:11,color:ds.color.textMuted,marginTop:6,fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase"}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:ds.color.textDark,borderRadius:ds.radius.lg,padding:"22px 24px"}}>
              <div style={{fontSize:10,fontWeight:700,color:ds.color.goldBright,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Why Choose DMEAST</div>
              <div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:8}}>Products from Authorized Suppliers</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",lineHeight:1.7}}>All products are sourced from verified and authorized suppliers. Standard items available for direct purchase. Institutional and specialized orders handled upon request.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CategoriesSection({setPage,setActiveCategory}){
  const shopCats = PUBLIC_CATEGORIES.filter(c => !c.institutional);
  return(
    <section style={{background:ds.color.canvas,padding:"80px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <SectionHeader eyebrow="Shop by Category" title="Find What You Need" subtitle="Browse healthcare products, diagnostic devices, and beauty & wellness essentials — all available for direct online purchase." center/>
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

export function HowItWorksSection(){
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

export function InstitutionalPreviewSection({setPage}){
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

export function CtaBanner({setPage}){
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

export function PaymentMethodsSection(){
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

export function WhyChooseSection(){
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

export function HomePage({setPage,setActiveCategory,addToCart,setActivePost}){
  return(
    <div style={{paddingTop:67}}>
      <TopAnnouncementBar/>
      <HeroSectionV16 setPage={setPage}/>
      <CategoryGridV16 setPage={setPage} setActiveCategory={setActiveCategory}/>
      <TrendingProductsV16 setPage={setPage} addToCart={addToCart}/>
      <PromoCardsV16 setPage={setPage}/>
      <WhyDMEASTV16/>
      <InstitutionalCTABannerV16 setPage={setPage}/>
      <TestimonialsV16/>
      <FAQAccordionV16/>
      <LatestArticlesSection setPage={setPage}/>
      <CtaBanner setPage={setPage}/>
    </div>
  );
}

export default HomePage;
