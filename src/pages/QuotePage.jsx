import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ds } from "../constants/design";
import { CONTACT } from "../constants/contact";
import { Btn, Spinner, PageHero } from "../components/ui";
import { emailjs, EMAILJS_CONFIG } from "../lib/emailjs";

export function QuotePage(){
  const [form,setForm]=useState({name:"",company:"",email:"",phone:"",product:"",quantity:"",budget:"",location:"",timeline:"",details:""});
  const [status,setStatus]=useState("idle");
  const [errorMsg,setErrorMsg]=useState("");
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const filled=form.name&&form.email&&form.phone&&form.product;
  const inp={width:"100%",padding:"11px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,color:ds.color.textDark,outline:"none",fontFamily:ds.font.body,boxSizing:"border-box",background:"#fff",transition:"border-color 0.15s"};
  const lbl={fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6};
  const fo=e=>e.target.style.borderColor=ds.color.red;
  const bl=e=>e.target.style.borderColor=ds.color.border;

  const handleSubmit=async()=>{
    if(!filled)return;
    setStatus("sending");setErrorMsg("");
    try{
      // v15.2 FIX: include to_email so EmailJS template can route it (template_5r24wue uses {{to_email}})
      // Send admin notification + customer confirmation
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.orderTemplateId, {
        customer_name:    form.name,
        customer_email:   form.email,
        customer_phone:   form.phone,
        customer_address: form.location || "Not specified",
        order_items:      `QUOTE REQUEST: ${form.product}` + (form.quantity?` (Qty: ${form.quantity})`:""),
        order_total:      form.budget ? `Target: ${form.budget}` : "TBD",
        payment_method:   "Quote Request - Pending",
      }, EMAILJS_CONFIG.publicKey);
      // Send confirmation to customer
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `Quote Request Received: ${form.product}`,
          quantity: form.quantity || "TBD",
          budget: form.budget || "TBD",
          timeline: form.timeline || "TBD",
          location: form.location || "TBD",
          details: `Dear ${form.name},\n\nThank you for your quotation request. We have received your inquiry for: ${form.product}.\n\nOur team will review your requirements and respond within 24-48 hours with a formal quotation.\n\nDetails submitted:\n- Product: ${form.product}\n- Quantity: ${form.quantity||"TBD"}\n- Budget: ${form.budget||"TBD"}\n- Location: ${form.location||"TBD"}\n- Timeline: ${form.timeline||"TBD"}\n${form.details?'- Details: '+form.details:''}\n\nIf urgent, please contact us:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nThank you for choosing DM EAST!`,
          reply_to: CONTACT.email,
          to_email: form.email,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e) { console.warn("Customer confirmation email failed:", e); }
      // Save to Firestore for admin tracking
      try {
        await addDoc(collection(db, "quotes"), {
          ...form,
          status: "new",
          createdAt: serverTimestamp(),
        });
      } catch(e) { console.warn("Quote save to Firestore failed:", e); }
      setStatus("success");
    }catch(e){console.error("Quote submission error:",e);setErrorMsg("Failed to send. Please email us directly at "+CONTACT.email+" or message us on WhatsApp. Error: "+e.message);setStatus("error");}
  };

  if(status==="success") return(
    <div style={{paddingTop:103,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",background:ds.color.canvas}}>
      <div style={{textAlign:"center",maxWidth:460,padding:"0 24px"}}>
        <div style={{width:76,height:76,borderRadius:"50%",background:ds.color.successBg,border:`2px solid ${ds.color.successBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 24px"}}>✓</div>
        <div style={{fontFamily:ds.font.display,fontSize:26,color:ds.color.textDark,marginBottom:10}}>Quote Request Sent!</div>
        <p style={{fontSize:15,color:ds.color.textMuted,lineHeight:1.7,marginBottom:24}}>Thank you, <strong>{form.name}</strong>! Our team will respond to <strong>{form.email}</strong> within 24–48 hours.</p>
        <Btn variant="primary" size="md" onClick={()=>setStatus("idle")}>Submit Another</Btn>
      </div>
    </div>
  );

  return(
    <div style={{paddingTop:103}}>
      <PageHero eyebrow="Quote Request" title="Request a Quotation" subtitle="Fill in the form and we'll prepare a formal quotation for your requirements."/>
      <div style={{maxWidth:860,margin:"0 auto",padding:"60px 28px"}}>
        <div style={{background:ds.color.white,borderRadius:ds.radius.xl,padding:"40px 48px",boxShadow:ds.shadow.md,border:`1px solid ${ds.color.borderLight}`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"18px 24px",marginBottom:18}}>
            {[["Full Name *","name","text","Your full name"],["Company / Organization","company","text","Hospital, LGU, clinic…"],["Email Address *","email","email","you@email.com"],["Phone / WhatsApp *","phone","text","+63 9XX XXX XXXX"]].map(([l,k,t,ph])=>(
              <div key={k}><label style={lbl}>{l}</label><input type={t} value={form[k]} onChange={set(k)} placeholder={ph} style={inp} onFocus={fo} onBlur={bl}/></div>
            ))}
          </div>
          <div style={{marginBottom:18}}><label style={lbl}>Products / Equipment Required *</label><input value={form.product} onChange={set("product")} placeholder="List the products or equipment you need" style={inp} onFocus={fo} onBlur={bl}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"18px 24px",marginBottom:18}}>
            {[["Quantity / Volume","quantity","text","e.g. 5 units, 100 boxes"],["Target Budget (optional)","budget","text","e.g. ₱500,000"],["Delivery Location","location","text","City, Province, Country"],["Required Timeline","timeline","text","e.g. Within 30 days"]].map(([l,k,t,ph])=>(
              <div key={k}><label style={lbl}>{l}</label><input type={t} value={form[k]} onChange={set(k)} placeholder={ph} style={inp} onFocus={fo} onBlur={bl}/></div>
            ))}
          </div>
          <div style={{marginBottom:24}}><label style={lbl}>Project Details / Special Requirements</label><textarea value={form.details} onChange={set("details")} rows={5} placeholder="Describe your project, specifications, regulatory requirements…" style={{...inp,resize:"vertical",lineHeight:1.65}} onFocus={fo} onBlur={bl}/></div>
          {status==="error"&&<div style={{marginBottom:18,padding:"12px 16px",background:ds.color.redLight,borderRadius:ds.radius.md,border:`1px solid ${ds.color.redBorder}`,fontSize:13,color:ds.color.red}}>{errorMsg}</div>}
          <Btn variant={filled?"primary":"outline"} size="lg" fullWidth disabled={!filled||status==="sending"} onClick={handleSubmit}>{status==="sending"?"Sending…":"Submit Quote Request →"}</Btn>
          <p style={{textAlign:"center",fontSize:13,color:ds.color.textMuted,marginTop:16,lineHeight:1.6}}>We respond within <strong style={{color:ds.color.textDark}}>24–48 hours</strong>. Urgent? Call us:<br/><strong>{CONTACT.phone1}</strong> · <strong>{CONTACT.phone2}</strong></p>
        </div>
      </div>
    </div>
  );
}

export default QuotePage;
