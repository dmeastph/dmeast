import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ds } from "../constants/design";
import { formatPHP, formatDate } from "../utils/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, orderStatusColor, paymentStatusColor } from "../constants/status";
import { daysOverdue, getAgingBucket, AGING_BUCKETS } from "../constants/order";
import { Btn, Spinner, Tag, SectionHeader, PageHero, Divider } from "./ui";
import { filterPharmaPublic } from "../constants/categories";
import { useProducts } from "../context/ProductsContext";
import { ProductCard } from "./ProductCard";
import { PaymentProofUpload } from "./PaymentProofUpload";
import { POINT_VALUE, POINTS_PER_PHP } from "../constants/business";
import { CONTACT } from "../constants/contact";

export function CustomerPortal({user,setPage,addToCart,wishlist,toggleWishlist}){
  const { products: PRODUCTS } = useProducts();
  const [tab,setTab]=useState("overview");
  const [profile,setProfile]=useState(null);
  const [orders,setOrders]=useState([]);
  const [rxUps,setRxUps]=useState([]);
  const [loading,setLoading]=useState(true);
  const [address,setAddress]=useState("");
  const [addrSaved,setAddrSaved]=useState(false);

  useEffect(()=>{
    if(!user)return;
    (async()=>{
      try{
        const snap=await getDoc(doc(db,"customers",user.uid));
        if(snap.exists()){setProfile(snap.data());setAddress(snap.data().savedAddress||"");}
        // V11 FIX: Query orders by uid (was already this way but ensuring it's prioritized)
        const oSnap=await getDocs(query(collection(db,"orders"),where("uid","==",user.uid),orderBy("createdAt","desc")));
        setOrders(oSnap.docs.map(d=>({id:d.id,...d.data()})));
        const rSnap=await getDocs(query(collection(db,"rxUploads"),where("uid","==",user.uid),orderBy("createdAt","desc")));
        setRxUps(rSnap.docs.map(d=>({id:d.id,...d.data()})));
      }catch(_){ /* ignore */ }
      setLoading(false);
    })();
  },[user]);

  const saveAddress=async()=>{
    await updateDoc(doc(db,"customers",user.uid),{savedAddress:address});
    setAddrSaved(true);setTimeout(()=>setAddrSaved(false),2500);
  };
  const handleReorder=order=>{
    order.items?.forEach(item=>{const p=PRODUCTS.find(x=>x.id===item.id);if(p)addToCart(p);});
    setPage("cart");
  };

  const points=profile?.points||0;
  const totalSpent=profile?.totalSpent||0;
  const totalOrders=profile?.totalOrders||0;
  const inp={width:"100%",padding:"11px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,outline:"none",fontFamily:ds.font.body,color:ds.color.textDark,boxSizing:"border-box",background:"#fff",transition:"border-color 0.15s"};

  if(loading) return(
    <div style={{paddingTop:67,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}><Spinner size={36}/><div style={{marginTop:16,color:ds.color.textMuted,fontSize:14}}>Loading your portal…</div></div>
    </div>
  );


  // v13.0c: After order is saved (edited)
  const handleOrderSaved = (updatedOrder) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? {...o, ...updatedOrder} : o));
  };
  
  // v13.0c: After order is deleted
  const handleOrderDeleted = (orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // v13.0a: Mark a credit order as paid
  const markOrderPaid = async (orderId) => {
    try {
      await updateDoc(doc(db,"orders",orderId), {
        paymentStatus: "confirmed",
        paidAt: serverTimestamp(),
        status: "confirmed",
      });
      // Refresh
      setOrders(prev => prev.map(o => o.id===orderId ? {...o, paymentStatus:"confirmed", status:"confirmed"} : o));
    } catch(e) { alert("Failed: "+e.message); }
  };

  // v13.0a: Refresh data (after creating new order/customer)
  const tabs=[{id:"overview",label:"Overview",icon:"📊"},{id:"orders",label:"Orders",icon:"📦"},{id:"wishlist",label:"Wishlist",icon:"❤️"},{id:"address",label:"My Address",icon:"📍"},{id:"rx",label:"Rx History",icon:"💊"},{id:"rewards",label:"Rewards",icon:"⭐"}];

  return(
    <div style={{paddingTop:67,background:ds.color.canvas,minHeight:"100vh"}}>
      <div style={{background:ds.color.textDark,padding:"28px 0"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:ds.color.goldBright,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Customer Portal</div>
            <div style={{fontFamily:ds.font.display,fontSize:22,color:"#fff"}}>Hello, {profile?.name||user.email}! 👋</div>
          </div>
          <div style={{display:"flex",gap:12}}>
            {[{v:totalOrders,l:"Orders"},{v:`${points.toLocaleString()} pts`,l:"Points"},{v:formatPHP(totalSpent),l:"Total Spent"}].map((s,i)=>(
              <div key={i} style={{textAlign:"center",background:"rgba(255,255,255,0.07)",borderRadius:ds.radius.lg,padding:"12px 20px"}}>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.goldBright}}>{s.v}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"28px 28px"}}>
        <div style={{display:"flex",gap:4,marginBottom:28,background:"#fff",padding:6,borderRadius:ds.radius.lg,border:`1px solid ${ds.color.border}`,boxShadow:ds.shadow.xs,overflowX:"auto"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:"0 0 auto",padding:"10px 18px",borderRadius:ds.radius.md,border:"none",cursor:"pointer",fontFamily:ds.font.body,fontSize:13.5,fontWeight:600,background:tab===t.id?ds.color.red:"transparent",color:tab===t.id?"#fff":ds.color.textMuted,transition:"all 0.15s",whiteSpace:"nowrap"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab==="overview"&&(
          <div>
            <div className="dm-grid-4" style={{marginBottom:32}}>
              {[{icon:"📦",label:"Total Orders",value:totalOrders,color:ds.color.red},{icon:"⭐",label:"Reward Points",value:`${points.toLocaleString()} pts`,color:ds.color.gold},{icon:"💰",label:"Total Spent",value:formatPHP(totalSpent),color:ds.color.success},{icon:"💎",label:"Points Value",value:formatPHP(points*POINT_VALUE),color:"#7C3AED"}].map((s,i)=>(
                <div key={i} style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs,borderTop:`3px solid ${s.color}`}}>
                  <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontSize:20,fontWeight:700,color:ds.color.textDark,fontFamily:ds.font.display}}>{s.value}</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:18}}>Recent Orders</div>
              {orders.length===0?(
                <div style={{textAlign:"center",padding:"32px 0",color:ds.color.textMuted,fontSize:14}}>No orders yet. <button onClick={()=>setPage("products")} style={{background:"none",border:"none",color:ds.color.red,cursor:"pointer",fontWeight:600,fontFamily:ds.font.body,fontSize:14}}>Browse products →</button></div>
              ):orders.slice(0,5).map(o=>{
                const sc=orderStatusColor(o.status||"pending");
                return(
                  <div key={o.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:`1px solid ${ds.color.borderLight}`,flexWrap:"wrap",gap:10}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark}}>Order #{o.id.slice(-6).toUpperCase()}</div>
                      <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{formatDate(o.createdAt)} · {o.items?.length||0} item(s)</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:15,fontWeight:700}}>{formatPHP(o.total||0)}</span>
                      <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:ds.radius.pill,background:sc.bg,color:sc.color}}>{ORDER_STATUS_LABELS[o.status]||"Pending"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="orders"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:20}}>Order History</div>
            {orders.length===0?(
              <div style={{textAlign:"center",padding:"48px 0",color:ds.color.textMuted}}>
                <div style={{fontSize:36,marginBottom:12}}>📦</div>
                <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>No orders yet</div>
                <div style={{fontSize:13,marginBottom:20}}>Your orders will appear here after you place them.</div>
                <Btn variant="primary" size="md" onClick={()=>setPage("products")}>Shop Now</Btn>
              </div>
            ):orders.map(o=>{
              const sc=orderStatusColor(o.status||"pending");
              const isOOS = o.status==="out_of_stock";
              const statusLabel = ORDER_STATUS_LABELS[o.status]||o.status||"Pending";
              const payStatus = o.paymentStatus||"awaiting";
              const psc = paymentStatusColor(payStatus);
              return(
                <div key={o.id} style={{border:`1px solid ${isOOS?"#C2410C":ds.color.border}`,borderRadius:ds.radius.lg,marginBottom:16,overflow:"hidden"}}>
                  <div style={{background:isOOS?"#FFF7ED":ds.color.canvas,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark}}>Order #{o.id.slice(-6).toUpperCase()}</div>
                      <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{formatDate(o.createdAt)} · {o.items?.length||0} item(s)</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:16,fontWeight:700,color:ds.color.textDark}}>{formatPHP(o.total||0)}</span>
                      <span style={{fontSize:11,fontWeight:700,padding:"5px 12px",borderRadius:ds.radius.pill,background:sc.bg,color:sc.color}}>{statusLabel}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:"5px 10px",borderRadius:ds.radius.pill,background:psc.bg,color:psc.color}}>💳 {PAYMENT_STATUS_LABELS[payStatus]}</span>
                      <Btn variant="ghost" size="sm" onClick={()=>handleReorder(o)}>🔄 Reorder</Btn>
                    </div>
                  </div>
                  {isOOS&&(
                    <div style={{background:"#FEF2F2",padding:"10px 20px",fontSize:13,color:"#C2410C",borderBottom:`1px solid #FED7AA`}}>
                      ⚠️ <strong>Item(s) in this order are currently unavailable.</strong> Our team will contact you to discuss alternatives or arrange a refund. Check your email or call us at <strong>{CONTACT.phone1}</strong>.
                    </div>
                  )}
                  {payStatus==="rejected"&&(
                    <div style={{background:ds.color.redLight,padding:"10px 20px",fontSize:13,color:ds.color.red,borderBottom:`1px solid ${ds.color.redBorder}`}}>
                      ❌ <strong>Payment was rejected.</strong> Please re-upload a clearer payment proof. {o.paymentRejectReason&&<><br/>Reason: {o.paymentRejectReason}</>}
                    </div>
                  )}
                  {payStatus==="confirmed"&&(
                    <div style={{background:ds.color.successBg,padding:"10px 20px",fontSize:13,color:ds.color.success,borderBottom:`1px solid ${ds.color.successBorder}`}}>
                      ✅ <strong>Payment confirmed!</strong> Your order is now being processed.
                    </div>
                  )}
                  {!isOOS&&o.status!=="cancelled"&&(
                    <div style={{padding:"14px 20px",borderBottom:`1px solid ${ds.color.borderLight}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:0}}>
                        {["pending","confirmed","processing","shipped","delivered"].map((s,i)=>{
                          const statOrder=["pending","confirmed","processing","shipped","delivered"];
                          const curIdx=statOrder.indexOf(o.status||"pending");
                          const done=i<=curIdx; const active=i===curIdx;
                          return(
                            <div key={s} style={{display:"flex",alignItems:"center",flex:i<4?1:0}}>
                              <div style={{textAlign:"center"}}>
                                <div style={{width:24,height:24,borderRadius:"50%",background:done?ds.color.success:ds.color.borderLight,border:`2px solid ${done?ds.color.success:ds.color.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:done?"#fff":ds.color.textMuted,margin:"0 auto 4px",fontWeight:700}}>{done&&!active?"✓":i+1}</div>
                                <div style={{fontSize:9,color:active?ds.color.success:ds.color.textMuted,fontWeight:active?700:400,whiteSpace:"nowrap",textTransform:"capitalize"}}>{s}</div>
                              </div>
                              {i<4&&<div style={{flex:1,height:2,background:i<curIdx?ds.color.success:ds.color.borderLight,margin:"0 4px 14px"}}/>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div style={{padding:"14px 20px"}}>
                    {o.items?.map((item,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody,padding:"4px 0",borderBottom:i<(o.items.length-1)?`1px solid ${ds.color.borderLight}`:"none"}}>
                        <span>{item.name} × {item.qty}</span>
                        <span style={{fontWeight:600}}>{formatPHP(item.price*item.qty)}</span>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:8,borderTop:`1px solid ${ds.color.border}`,fontWeight:700,fontSize:14}}>
                      <span>Total</span><span>{formatPHP(o.total||0)}</span>
                    </div>
                    {o.recipientName&&<div style={{marginTop:8,fontSize:12,color:ds.color.gold,background:ds.color.goldLight,padding:"6px 10px",borderRadius:ds.radius.sm,display:"inline-block"}}>📦 For: {o.recipientName} ({o.recipientPhone})</div>}
                    {o.address&&<div style={{marginTop:8,fontSize:12,color:ds.color.textMuted}}>📍 {o.address}</div>}
                    {o.paymentMethod&&<div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>💳 {o.paymentMethod}</div>}
                    {/* Show payment proof upload only when needed */}
                    {(payStatus==="awaiting"||payStatus==="rejected")&&o.status!=="delivered"&&o.status!=="cancelled"&&(
                      <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid "+ds.color.borderLight}}>
                        <PaymentProofUpload orderId={o.id} existingUrl={null}/>
                      </div>
                    )}
                    {payStatus==="submitted"&&(
                      <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid "+ds.color.borderLight,fontSize:13,color:"#1E40AF"}}>
                        ⏳ Your payment proof has been submitted. We'll review it within 24 hours.
                        {o.paymentProofUrl&&<> · <a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{color:"#1E40AF",textDecoration:"underline"}}>View proof</a></>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==="wishlist"&&(
          <div>
            <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:20}}>My Wishlist</div>
            {(!wishlist||wishlist.length===0)?(
              <div style={{textAlign:"center",padding:"60px 0",color:ds.color.textMuted}}>
                <div style={{fontSize:32,marginBottom:12}}>🤍</div>
                <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>Your wishlist is empty</div>
                <div style={{fontSize:13,marginBottom:20}}>Tap the heart icon on any product to save it here.</div>
                <Btn variant="primary" size="md" onClick={()=>setPage("products")}>Browse Products</Btn>
              </div>
            ):(
              <div className="dm-grid-4">
                {filterPharmaPublic(PRODUCTS).filter(p=>wishlist.includes(p.id)).map(p=>(
                  <ProductCard key={p.id} product={p} addToCart={addToCart} setPage={setPage} wishlist={wishlist} toggleWishlist={toggleWishlist}/>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==="address"&&(
          <div style={{maxWidth:560}}>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"28px 32px",boxShadow:ds.shadow.xs}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:6}}>Saved Delivery Address</div>
              <div style={{fontSize:13,color:ds.color.textMuted,marginBottom:22}}>This address will pre-fill your checkout form.</div>
              <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:8}}>Full Delivery Address</label>
              <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={4} placeholder="Unit/House No., Street, Barangay, City, Province, ZIP" style={{...inp,resize:"vertical",lineHeight:1.65}} onFocus={e=>e.target.style.borderColor=ds.color.red} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
              <div style={{marginTop:16}}>
                <Btn variant={addrSaved?"success":"primary"} size="md" onClick={saveAddress}>{addrSaved?"✓ Address Saved!":"Save Address"}</Btn>
              </div>
            </div>
          </div>
        )}

        {tab==="rx"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:20}}>Prescription Upload History</div>
            {rxUps.length===0?<div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted,fontSize:14}}>No prescription uploads yet.</div>:rxUps.map(r=>(
              <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:`1px solid ${ds.color.borderLight}`,flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark}}>Order #{r.orderId?.slice(-6).toUpperCase()||"—"}</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{formatDate(r.createdAt)} · {r.fileName||"Prescription"}</div>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:ds.radius.pill,background:r.status==="verified"?ds.color.successBg:r.status==="rejected"?ds.color.redLight:"#FEF9C3",color:r.status==="verified"?ds.color.success:r.status==="rejected"?ds.color.red:"#A16207",textTransform:"capitalize"}}>{r.status||"pending"}</span>
              </div>
            ))}
          </div>
        )}

        {tab==="rewards"&&(
          <div>
            <div className="dm-grid-2" style={{marginBottom:24}}>
              <div style={{background:`linear-gradient(135deg,${ds.color.textDark},#3D3530)`,borderRadius:ds.radius.xl,padding:"28px 32px",color:"#fff"}}>
                <div style={{fontSize:11,fontWeight:700,color:ds.color.goldBright,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>Your Points Balance</div>
                <div style={{fontFamily:ds.font.display,fontSize:48,color:ds.color.goldBright,lineHeight:1}}>{points.toLocaleString()}</div>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:6}}>DMEAST Reward Points</div>
                <div style={{marginTop:20,background:"rgba(255,255,255,0.08)",borderRadius:ds.radius.md,padding:"14px 18px"}}>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.7)"}}>Cash equivalent</div>
                  <div style={{fontSize:20,fontWeight:700,color:"#fff",marginTop:4}}>{formatPHP(points*POINT_VALUE)}</div>
                </div>
              </div>
              <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.xl,padding:"28px 32px",boxShadow:ds.shadow.xs}}>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:18}}>How to Earn</div>
                {[{icon:"🛒",label:"Place an order",desc:`Earn 1 point for every ₱200 spent`},{icon:"💊",label:"Rx products",desc:"Points earned on all purchases including Rx items"},{icon:"💰",label:"Redeem points",desc:`₱${POINT_VALUE} value per point — ask us at checkout`}].map((e,i)=>(
                  <div key={i} style={{display:"flex",gap:14,marginBottom:16}}>
                    <div style={{width:36,height:36,borderRadius:ds.radius.md,background:ds.color.goldLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{e.icon}</div>
                    <div><div style={{fontSize:13.5,fontWeight:600,color:ds.color.textDark}}>{e.label}</div><div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:2}}>{e.desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:18}}>Points History</div>
              {orders.length===0?<div style={{textAlign:"center",padding:"24px 0",color:ds.color.textMuted,fontSize:14}}>No points earned yet. Place your first order!</div>:orders.map(o=>(
                <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${ds.color.borderLight}`}}>
                  <div>
                    <div style={{fontSize:13.5,fontWeight:600,color:ds.color.textDark}}>Order #{o.id.slice(-6).toUpperCase()}</div>
                    <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{formatDate(o.createdAt)} · {formatPHP(o.total||0)}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:15,fontWeight:700,color:ds.color.gold}}>+{Math.floor((o.total||0)*POINTS_PER_PHP)} pts</div>
                    <div style={{fontSize:11,color:ds.color.textLight,marginTop:2}}>earned</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerPortal;
