import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ds } from "../constants/design";
import { formatPHP } from "../utils/format";
import { orderStatusColor, paymentStatusColor, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../constants/status";
import { Btn, Spinner, PageHero, Tag } from "../components/ui";
import { CONTACT } from "../constants/contact";
import { PaymentProofUpload } from "../components/PaymentProofUpload";

export function TrackOrderPage(){
  const [refInput, setRefInput] = useState("");
  const [order,    setOrder]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const ref = refInput.trim().toUpperCase().replace("#","");
    if (ref.length < 4) { setError("Please enter a valid order reference number."); return; }
    setLoading(true); setError(""); setOrder(null); setSearched(true);
    try {
      const snap = await getDocs(collection(db,"orders"));
      const match = snap.docs.find(d => d.id.slice(-6).toUpperCase() === ref.slice(-6).toUpperCase());
      if (match) {
        setOrder({ id: match.id, ...match.data() });
      } else {
        setError("No order found with reference \""+ref+"\". Please check and try again.");
      }
    } catch(e) {
      setError("Could not search orders. Please try again or contact us.");
    }
    setLoading(false);
  };

  const statusSteps = ["pending","confirmed","processing","shipped","delivered"];
  const inp = {width:"100%",padding:"14px 18px",border:"2px solid "+ds.color.border,borderRadius:ds.radius.lg,fontSize:16,outline:"none",fontFamily:ds.font.body,color:ds.color.textDark,boxSizing:"border-box",background:"#fff",textAlign:"center",letterSpacing:"0.1em",fontWeight:700,textTransform:"uppercase"};

  return(
    <div style={{paddingTop:103}}>
      <PageHero eyebrow="Order Tracking" title="Track Your Order" subtitle="Enter your order reference number to check the current status of your order."/>
      <div style={{maxWidth:600,margin:"0 auto",padding:"48px 24px"}}>
        <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.md,border:"1px solid "+ds.color.borderLight,marginBottom:32}}>
          <div style={{fontSize:13,color:ds.color.textMuted,marginBottom:16,textAlign:"center"}}>Your order reference was shown on the confirmation screen and included in your confirmation email.</div>
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <input value={refInput} onChange={e=>setRefInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()} placeholder="e.g. A3F9C2" style={inp}/>
            <Btn variant="primary" size="lg" onClick={handleSearch} disabled={loading}>{loading?"Searching…":"Track"}</Btn>
          </div>
          {error&&<div style={{background:ds.color.redLight,border:"1px solid "+ds.color.redBorder,borderRadius:ds.radius.md,padding:"10px 14px",fontSize:13,color:ds.color.red,textAlign:"center"}}>{error}</div>}
        </div>

        {order&&(
          <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"28px 32px",boxShadow:ds.shadow.sm,border:"1px solid "+ds.color.borderLight}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,paddingBottom:18,borderBottom:"2px solid "+ds.color.border}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Order Reference</div>
                <div style={{fontFamily:ds.font.display,fontSize:24,color:ds.color.red}}>#{order.id.slice(-6).toUpperCase()}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:ds.radius.pill,background:orderStatusColor(order.status||"pending").bg,color:orderStatusColor(order.status||"pending").color}}>{ORDER_STATUS_LABELS[order.status]||"Pending"}</span>
              </div>
            </div>

            {/* V11: Payment status banner */}
            <div style={{marginBottom:20,padding:"10px 14px",borderRadius:ds.radius.md,background:paymentStatusColor(order.paymentStatus||"awaiting").bg,color:paymentStatusColor(order.paymentStatus||"awaiting").color,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
              💳 Payment: {PAYMENT_STATUS_LABELS[order.paymentStatus||"awaiting"]}
            </div>

            {order.paymentRejectReason&&(
              <div style={{background:ds.color.redLight,border:"1px solid "+ds.color.redBorder,borderRadius:ds.radius.md,padding:"10px 14px",marginBottom:16,fontSize:13,color:ds.color.red}}>
                ❌ Payment rejected: {order.paymentRejectReason}. Please re-upload a clearer payment proof below.
              </div>
            )}

            {order.status!=="cancelled"&&order.status!=="out_of_stock"&&(
              <div style={{marginBottom:24}}>
                <div style={{display:"flex",alignItems:"center",gap:0}}>
                  {statusSteps.map((s,i)=>{
                    const curIdx = statusSteps.indexOf(order.status||"pending");
                    const done   = i<=curIdx;
                    const active = i===curIdx;
                    return(
                      <div key={s} style={{display:"flex",alignItems:"center",flex:i<4?1:0}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{width:32,height:32,borderRadius:"50%",background:done?ds.color.success:ds.color.borderLight,border:"2px solid "+(done?ds.color.success:ds.color.border),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:done?"#fff":ds.color.textMuted,margin:"0 auto 6px",fontWeight:700}}>{done&&!active?"✓":i+1}</div>
                          <div style={{fontSize:10,color:active?ds.color.success:ds.color.textMuted,fontWeight:active?700:400,whiteSpace:"nowrap",textTransform:"capitalize"}}>{ORDER_STATUS_LABELS[s]||s}</div>
                        </div>
                        {i<4&&<div style={{flex:1,height:2,background:i<curIdx?ds.color.success:ds.color.borderLight,margin:"0 4px 20px"}}/>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {order.status==="out_of_stock"&&(
              <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:ds.radius.md,padding:"12px 16px",marginBottom:20,fontSize:13,color:"#C2410C"}}>
                ⚠️ <strong>Item(s) unavailable.</strong> Our team has been notified and will contact you to discuss alternatives or arrange a refund. Call us: <strong>{CONTACT.phone1}</strong>
              </div>
            )}
            {order.status==="cancelled"&&(
              <div style={{background:ds.color.redLight,border:"1px solid "+ds.color.redBorder,borderRadius:ds.radius.md,padding:"12px 16px",marginBottom:20,fontSize:13,color:ds.color.red}}>
                ❌ This order has been cancelled. If you have questions, contact us at <strong>{CONTACT.email}</strong>.
              </div>
            )}

            <div style={{background:ds.color.canvas,borderRadius:ds.radius.md,padding:"14px 18px",marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Items Ordered</div>
              {order.items?.map((item,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody,padding:"6px 0",borderBottom:i<(order.items.length-1)?"1px solid "+ds.color.borderLight:"none"}}>
                  <span>{item.name} x {item.qty}</span>
                  <span style={{fontWeight:600}}>{formatPHP(item.price*item.qty)}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,fontWeight:700,fontSize:15,borderTop:"1px solid "+ds.color.border}}>
                <span>Total</span><span style={{color:ds.color.red}}>{formatPHP(order.total||0)}</span>
              </div>
            </div>

            {order.recipientName&&<div style={{fontSize:13,color:ds.color.gold,background:ds.color.goldLight,padding:"8px 12px",borderRadius:ds.radius.sm,marginBottom:8,display:"inline-block"}}>📦 For: {order.recipientName} ({order.recipientPhone})</div>}
            {order.address&&<div style={{fontSize:13,color:ds.color.textMuted,marginBottom:6}}>📍 {order.address}</div>}
            {order.paymentMethod&&<div style={{fontSize:13,color:ds.color.textMuted,marginBottom:16}}>💳 {order.paymentMethod}</div>}

            {/* V11: Show upload only when needed */}
            {(order.paymentStatus==="awaiting"||order.paymentStatus==="rejected"||(!order.paymentStatus&&order.status!=="delivered"&&order.status!=="cancelled"))&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:ds.color.textDark,marginBottom:8}}>Payment Proof</div>
                <PaymentProofUpload orderId={order.id} existingUrl={null} onUploaded={url=>setOrder(prev=>({...prev,paymentProofUrl:url,paymentStatus:"submitted"}))}/>
              </div>
            )}
            {order.paymentStatus==="submitted"&&(
              <div style={{marginBottom:16,padding:"12px 14px",background:"#DBEAFE",borderRadius:ds.radius.md,fontSize:13,color:"#1E40AF"}}>
                ⏳ Your payment proof is being reviewed. We'll notify you within 24 hours.
                {order.paymentProofUrl&&<> · <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{color:"#1E40AF",textDecoration:"underline"}}>View proof</a></>}
              </div>
            )}

            <div style={{background:ds.color.canvas,borderRadius:ds.radius.md,padding:"14px 18px",display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{fontSize:12,color:ds.color.textMuted,fontWeight:600}}>Need help with this order?</div>
              <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,background:"#25D366",color:"#fff",padding:"6px 14px",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,textDecoration:"none"}}>💬 WhatsApp</a>
              <a href={"tel:"+CONTACT.phone1Raw} style={{display:"inline-flex",alignItems:"center",gap:6,background:ds.color.redLight,color:ds.color.red,padding:"6px 14px",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,textDecoration:"none"}}>📞 Call Us</a>
            </div>
          </div>
        )}

        {searched&&!order&&!loading&&!error&&(
          <div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>
            <div style={{fontSize:32,marginBottom:12}}>🔍</div>
            <div style={{fontSize:14}}>No order found. Please double-check your reference number.</div>
          </div>
   