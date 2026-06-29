import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ds } from "../constants/design";
import { formatPHP, formatUSD } from "../utils/format";
import { storage } from "../lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { emailjs, EMAILJS_CONFIG } from "../lib/emailjs";
import { POINTS_PER_PHP, POINT_VALUE } from "../constants/business";
import { CATEGORIES } from "../constants/categories";
import { CONTACT } from "../constants/contact";
import { DMEAST_BANK_INFO } from "../constants/banking";
import { COUNTRY_CODES, validateEmail, validateName, validatePhone, PAYMENT_METHODS_DATA, COUNTRIES, ZIP_HINTS, getZipHint } from "../constants/cart";
import { createMayaCheckout, isMayaMethod } from "../lib/maya";
import { sendCustomerReceiptEmail, sendAdminNewOrderNotification } from "../lib/email-helpers";
import { sendSMS, orderConfirmationSMS } from "../lib/sms";
import { computeVATBreakdown } from "../lib/pdf";
import { Btn, Spinner, Tag } from "../components/ui";
import { LeafletAddressMap } from "../components/LeafletAddressMap";
import { PaymentProofUpload } from "../components/PaymentProofUpload";

export function CartPage({cart,removeFromCart,updateQty,setPage,user,onOrderComplete}){
  const [step,setStep]         = useState(1);
  const [orderMode,setOrderMode] = useState(null);
  const [forSomeoneElse,setForSomeoneElse] = useState(false);
  const [countryCode,setCountryCode] = useState("+63");
  const [details,setDetails]   = useState({name:"",email:"",phoneNum:"",address:"",instructions:""});
  // V11 NEW: recipient details when ordering for someone else
  const [recipient,setRecipient] = useState({name:"",phoneCode:"+63",phoneNum:""});
  const [fieldErrors,setFieldErrors] = useState({});
  const [method,setMethod]     = useState("");
  const [sending,setSending]   = useState(false);
  const [errMsg,setErrMsg]     = useState("");
  const [prescription,setPrescription] = useState(null);
  const [intlForm,setIntlForm] = useState({name:"",company:"",email:"",phone:"",countryCode:"+1",country:"",countryISO:"",city:"",zip:"",streetAddress:"",shippingMethod:"",currency:"USD",details:""});
  // v16.11: For international — same as account holder or different contact person?
  const [intlForSomeoneElse,setIntlForSomeoneElse] = useState(false);
  // v16.12: Delivery mode — port-to-port (wholesale) or door-to-door (retail)
  const [intlDeliveryMode,setIntlDeliveryMode] = useState("port"); // "port" or "door"
  const [intlSending,setIntlSending] = useState(false);
  const [intlErr,setIntlErr]   = useState("");
  const [intlDone,setIntlDone] = useState(false);
  const [profileLoaded,setProfileLoaded] = useState(false);
  const [confirmedOrderId,setConfirmedOrderId] = useState("");
  // V11 FIX: Snapshot of cart at order time for success screen (cart will be cleared)
  const [successOrder,setSuccessOrder] = useState(null);
  // Loyalty points
  const [pointBalance,setPointBalance] = useState(0);
  const [usePoints,setUsePoints] = useState(false);
  // V11 NEW: Map coordinates
  const [deliveryCoords,setDeliveryCoords] = useState(null);
  const [showMap,setShowMap] = useState(false);

  // Auto-populate from logged-in user profile
  useEffect(()=>{
    if(!user||profileLoaded) return;
    (async()=>{
      try{
        const snap = await getDoc(doc(db,"customers",user.uid));
        if(snap.exists()){
          const d = snap.data();
          setDetails(prev=>({
            ...prev,
            name:    d.name    || prev.name,
            email:   d.email   || user.email || prev.email,
            address: d.savedAddress || prev.address,
          }));
          if(d.phone){
            const saved = d.phone;
            const matchedCode = COUNTRY_CODES.find(c=>saved.startsWith(c.code));
            if(matchedCode){
              setCountryCode(matchedCode.code);
              setDetails(prev=>({...prev, phoneNum: saved.slice(matchedCode.code.length).trim()}));
            } else {
              setDetails(prev=>({...prev, phoneNum: saved}));
            }
          }
        } else {
          setDetails(prev=>({...prev, email: user.email||""}));
        }
        // Load loyalty points balance
        const cSnap2 = await getDoc(doc(db,"customers",user.uid));
        setPointBalance(cSnap2.exists() ? (cSnap2.data().points || 0) : 0);
      }catch(_){ /* ignore */ }
      setProfileLoaded(true);
    })();
  },[user, profileLoaded]);

  // v16.11: Auto-populate international form from user profile (when same as account holder)
  useEffect(()=>{
    if(!user||intlForSomeoneElse) return;
    if(!profileLoaded) return;  // Wait until profile loaded
    (async()=>{
      try{
        const snap = await getDoc(doc(db,"customers",user.uid));
        if(snap.exists()){
          const d = snap.data();
          setIntlForm(prev=>({
            ...prev,
            name:  d.name  || prev.name,
            email: d.email || user.email || prev.email,
            phone: d.phone || prev.phone,
          }));
        } else {
          setIntlForm(prev=>({...prev, email: user.email||""}));
        }
      }catch(_){ /* ignore */ }
    })();
  },[user, intlForSomeoneElse, profileLoaded]);
  
  // v16.11: When toggling "for someone else", clear the prefilled fields
  useEffect(()=>{
    if(intlForSomeoneElse){
      setIntlForm(prev=>({...prev, name:"", email:"", phone:""}));
    }
  },[intlForSomeoneElse]);

  const fullPhone = countryCode + details.phoneNum.replace(/^0+/,"");
  const fullRecipientPhone = recipient.phoneCode + recipient.phoneNum.replace(/^0+/,"");
  const total     = cart.reduce((s,i)=>s+i.price*i.qty,0);
  // Cap redemption at 10% of order value; min 50 points needed
  const maxPointsUsable = Math.min(pointBalance, Math.floor(total * 0.10 / POINT_VALUE));
  const pointsDiscount  = (usePoints && pointBalance >= 50) ? maxPointsUsable * POINT_VALUE : 0;
  const finalTotal      = total - pointsDiscount;
  const hasRx     = cart.some(i=>i.requiresPrescription);
  const intlFilled = intlForm.name&&intlForm.email&&intlForm.phone&&intlForm.countryISO && (intlDeliveryMode==="port" || (intlDeliveryMode==="door" && intlForm.streetAddress.trim().length>0));
  const orderSummary = cart.map(i=>`${i.name} x${i.qty} — ${formatPHP(i.price*i.qty)}`).join("\n");

  const validateFields = () => {
    const errs = {};
    if(!validateName(details.name))      errs.name    = "Please enter your full name (at least 2 characters).";
    if(!validateEmail(details.email))    errs.email   = "Please enter a valid email address (e.g. you@email.com).";
    if(!validatePhone(details.phoneNum)) errs.phoneNum= "Please enter a valid phone number.";
    if(!details.address.trim())          errs.address = "Delivery address is required.";
    // V11: Validate recipient fields if ordering for someone else
    if(forSomeoneElse){
      if(!validateName(recipient.name))      errs.recipientName    = "Recipient's name is required (at least 2 characters).";
      if(!validatePhone(recipient.phoneNum)) errs.recipientPhoneNum= "Recipient's phone number is required.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const detFilled = validateName(details.name) && validateEmail(details.email) &&
                    validatePhone(details.phoneNum) && details.address.trim().length>0 &&
                    (!forSomeoneElse || (validateName(recipient.name) && validatePhone(recipient.phoneNum)));

  const inp    = {width:"100%",padding:"11px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,color:ds.color.textDark,outline:"none",fontFamily:ds.font.body,boxSizing:"border-box",background:"#fff",transition:"border-color 0.15s"};
  const inpErr = {border:`1.5px solid ${ds.color.red}`};
  const lbl    = {fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6};
  const errTxt = {fontSize:11.5,color:ds.color.red,marginTop:4};
  const fo     = e => e.target.style.borderColor = ds.color.red;
  const bl     = (e,key) => { e.target.style.borderColor = fieldErrors[key] ? ds.color.red : ds.color.border; };
  const setD   = k => e => { setDetails(p=>({...p,[k]:e.target.value})); if(fieldErrors[k]) setFieldErrors(p=>({...p,[k]:""})); };
  const setR   = k => e => { setRecipient(p=>({...p,[k]:e.target.value})); const errKey="recipient"+k.charAt(0).toUpperCase()+k.slice(1); if(fieldErrors[errKey]) setFieldErrors(p=>({...p,[errKey]:""})); };
  const setI   = k => e => setIntlForm(p=>({...p,[k]:e.target.value}));

  const handleRxUpload = e => {
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 10*1024*1024){ alert("File too large. Max 10MB."); return; }
    e.target.value = "";
    const r = new FileReader();
    r.onload = ev => setPrescription({preview:ev.target.result, name:file.name, file: file});
    r.readAsDataURL(file);
  };

  const goNext = () => { if(step===2&&!hasRx) setStep(4); else setStep(s=>s+1); };
  const goBack = () => { if(step===4&&!hasRx) setStep(2); else setStep(s=>s-1); };

  const handleContinue = () => {
    if(validateFields()) goNext();
  };

  const handlePlaceOrder = async () => {
    if(!method) return;
    setSending(true); setErrMsg("");
    const phone = fullPhone;
    // V11 FIX: ensure uid is properly stored for registered customers
    const orderData = {
      name: details.name, email: details.email, phone,
      address: details.address,
      instructions: details.instructions || null,
      paymentMethod: method,
      paymentStatus: "awaiting", // V11: separate payment tracking
      items: cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty,requiresPrescription:!!i.requiresPrescription})),
      total: finalTotal, pointsUsed: usePoints ? maxPointsUsable : 0, status:"pending", createdAt: serverTimestamp(),
      uid: user ? user.uid : "guest",
      // V11: Recipient info if ordering for someone else
      recipientName:  forSomeoneElse ? recipient.name : null,
      recipientPhone: forSomeoneElse ? fullRecipientPhone : null,
      // V11: Map coordinates if dropped
      deliveryCoords: deliveryCoords,
    };

    const orderNotifParams = {
      customer_name:    details.name,
      customer_email:   details.email,
      customer_phone:   phone,
      customer_address: details.address,
      order_items:      orderSummary,
      order_total:      formatPHP(finalTotal),
      payment_method:   method,
    };
    const receiptParams = {
      customer_name:    details.name,
      customer_email:   details.email,
      customer_phone:   phone,
      customer_address: details.address,
      order_items:      orderSummary,
      order_total:      formatPHP(finalTotal),
      payment_method:   method,
      to_email:         details.email,
    };
    const withTimeout = (promise, ms=10000) =>
      Promise.race([promise, new Promise((_,reject)=>setTimeout(()=>reject(new Error("Request timed out. Check your connection and try again.")),ms))]);

    try {
      const orderRef = await withTimeout(addDoc(collection(db,"orders"), orderData));
      
      // v16.10: If Maya-supported method, redirect to Maya Checkout instead of regular flow
      if (isMayaMethod(method)) {
        try {
          // Split name into first + last for Maya buyer info
          const nameParts = (details.name || "").trim().split(/\s+/);
          const firstName = nameParts[0] || "Customer";
          const lastName = nameParts.slice(1).join(" ") || "";
          
          // Use Firestore doc ID as orderId reference
          const mayaResult = await createMayaCheckout({
            orderId: orderRef.id,
            totalAmount: finalTotal,
            items: cart,
            buyer: {
              email: details.email,
              firstName,
              lastName,
              phone,
            },
          });
          
          // Update order with Maya checkout ID before redirect
          try {
            await updateDoc(doc(db, "orders", orderRef.id), {
              mayaCheckoutId: mayaResult.checkoutId,
              paymentStatus: "redirecting_to_maya",
            });
          } catch(_){}
          
          // Redirect customer to Maya hosted checkout
          window.location.href = mayaResult.redirectUrl;
          return;  // Stop here — customer is leaving the site
        } catch (mayaErr) {
          console.error("Maya checkout failed:", mayaErr);
          setErrMsg("Couldn't connect to " + method + " payment gateway: " + mayaErr.message + ". Please try a different payment method or contact us.");
          setSending(false);
          // Note: order is still created in Firestore with paymentStatus "awaiting"
          // Customer can retry with a different method
          return;
        }
      }
      
      // Non-Maya flow continues here (Bank Transfer, etc.)
      if(user){
        const earnedPts = Math.floor(finalTotal * POINTS_PER_PHP);
        try {
          const cSnap = await getDoc(doc(db,"customers",user.uid));
          if(cSnap.exists()){
            const d = cSnap.data();
            await updateDoc(doc(db,"customers",user.uid),{
              totalOrders:(d.totalOrders||0)+1,
              totalSpent:(d.totalSpent||0)+total,
              points: Math.max(0, (d.points||0) - (usePoints ? maxPointsUsable : 0) + earnedPts),
              phone: phone,
            });
          }
        } catch(_){}
        if(hasRx && prescription){
          try {
            // V11.2 FIX: Upload the actual Rx file to Storage so admin can view it
            let rxFileUrl = null;
            if(prescription.file){
              try {
                const ext = prescription.name.split(".").pop()||"jpg";
                const path = "rx-uploads/"+orderRef.id+"/rx-"+Date.now()+"."+ext; // eslint-disable-line react-hooks/purity
                const fileRef = storageRef(storage, path);
                await uploadBytes(fileRef, prescription.file);
                rxFileUrl = await getDownloadURL(fileRef);
              } catch(uploadErr){
                console.warn("Rx file upload failed:", uploadErr);
              }
            }
            await addDoc(collection(db,"rxUploads"),{
              uid:user.uid, customerName:details.name, orderId:orderRef.id,
              fileName:prescription.name,
              fileUrl: rxFileUrl,
              status:"pending", createdAt:serverTimestamp(),
            });
          } catch(_){}
        }
      }

      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.orderTemplateId, orderNotifParams, EMAILJS_CONFIG.publicKey);
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.receiptTemplateId, receiptParams, EMAILJS_CONFIG.publicKey);
      } catch(emailErr){
        console.warn("Email send failed (order still placed):", emailErr);
      }

      // SMS confirmation (non-blocking — fire & forget)
      sendSMS(phone, orderConfirmationSMS({ id: orderRef.id, total: finalTotal, paymentMethod: method }));

      // V11 FIX: snapshot cart + details BEFORE clearing cart so success screen has data
      setSuccessOrder({
        id: orderRef.id,
        items: [...cart],
        total: finalTotal,
        pointsDiscount,
        details: {...details},
        fullPhone: phone,
        method,
        forSomeoneElse,
        recipient: forSomeoneElse ? {name:recipient.name, phone:fullRecipientPhone} : null,
      });
      setConfirmedOrderId(orderRef.id);
      setStep(5);
      // Clear cart AFTER snapshot is saved
      if(onOrderComplete) onOrderComplete();
    } catch(err) {
      console.error("Order placement error:", err);
      const msg = err.message?.includes("timed out")
        ? "Connection timed out. Please check your internet and try again."
        : err.message?.includes("permission")
        ? "Order could not be saved. Please contact us at "+CONTACT.email+" or try again."
        : "Something went wrong. Please try again or contact us at "+CONTACT.email;
      setErrMsg(msg);
    } finally {
      setSending(false);
    }
  };

  const handleIntlSubmit = async () => {
    if(!intlFilled) return;
    if(cart.length===0){ setIntlErr("Cart is empty. Please add products before submitting."); return; }
    setIntlSending(true); setIntlErr("");
    try {
      // v16.11: Build full phone with country code
      const fullIntlPhone = (intlForm.countryCode || "+1") + " " + intlForm.phone.replace(/^0+/, "").trim();
      // v16.11: Build address line with ZIP if provided
      const addressLine = intlForm.zip 
        ? `${intlForm.city||"—"}, ${intlForm.country} ${intlForm.zip}`
        : `${intlForm.city||"—"}, ${intlForm.country}`;
      
      // v16.12: Notify customer (with to_email — this was the bug!)
      // Customer gets a confirmation email with their submitted details
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
        to_email: intlForm.email,
        to_name:  intlForm.name,
        from_name:intlForm.name, 
        company:intlForm.company||"N/A",
        from_email:intlForm.email, 
        phone:fullIntlPhone,
        product:orderSummary, 
        quantity:cart.reduce((s,i)=>s+i.qty,0)+" items",
        budget:`${formatPHP(total)} — INTERNATIONAL ORDER`,
        location:addressLine, 
        timeline:"International Inquiry",
        details:`🌍 INTERNATIONAL ORDER INQUIRY\n\nDelivery Mode: ${intlDeliveryMode==="door"?"Door-to-Door (Retail)":"Port-to-Port (Wholesale)"}\nCountry: ${intlForm.country} (${intlForm.countryISO||"—"})\nCity/Port: ${intlForm.city||"—"}\n${intlDeliveryMode==="door"?`Street Address: ${intlForm.streetAddress||"—"}\n`:""}ZIP/Postal: ${intlForm.zip||"—"}\nShipping: ${intlForm.shippingMethod||"Let DMEAST advise"}\nCurrency: ${intlForm.currency}\n\nItems:\n${orderSummary}\n\nValue: ${formatPHP(total)} (${formatUSD(total)} indicative)\n\nNotes:\n${intlForm.details||"None"}`,
        reply_to:intlForm.email,
      }, EMAILJS_CONFIG.publicKey);
      
      // v16.12: Also send admin notification (so DMEAST team gets the inquiry)
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          to_email: "info@dmeastph.com",
          to_name:  "DMEAST Team",
          from_name:intlForm.name, 
          company:intlForm.company||"N/A",
          from_email:intlForm.email, 
          phone:fullIntlPhone,
          product:orderSummary, 
          quantity:cart.reduce((s,i)=>s+i.qty,0)+" items",
          budget:`${formatPHP(total)} — INTERNATIONAL ORDER`,
          location:addressLine, 
          timeline:"International Inquiry — NEEDS PROFORMA INVOICE",
          details:`🌍 NEW INTERNATIONAL INQUIRY — Please prepare proforma invoice\n\nCustomer: ${intlForm.name} <${intlForm.email}>\nPhone: ${fullIntlPhone}\nCompany: ${intlForm.company||"—"}\n\nDelivery Mode: ${intlDeliveryMode==="door"?"Door-to-Door (Retail)":"Port-to-Port (Wholesale)"}\nCountry: ${intlForm.country} (${intlForm.countryISO||"—"})\nCity/Port: ${intlForm.city||"—"}\n${intlDeliveryMode==="door"?`Street Address: ${intlForm.streetAddress||"—"}\n`:""}ZIP/Postal: ${intlForm.zip||"—"}\nShipping: ${intlForm.shippingMethod||"Let DMEAST advise"}\nCurrency: ${intlForm.currency}\n\nItems:\n${orderSummary}\n\nIndicative Value: ${formatPHP(total)} (${formatUSD(total)})\n\nCustomer Notes:\n${intlForm.details||"None"}`,
          reply_to:intlForm.email,
        }, EMAILJS_CONFIG.publicKey);
      } catch(adminErr) {
        // Admin email failure shouldn't block the inquiry — log but continue
        console.warn("Admin notification failed:", adminErr);
      }
      await addDoc(collection(db,"orders"),{
        name:intlForm.name, email:intlForm.email, phone:fullIntlPhone,
        company: intlForm.company || "",
        address: intlDeliveryMode==="door" && intlForm.streetAddress 
          ? `${intlForm.streetAddress}, ${addressLine}` 
          : addressLine,
        // v16.11/16.12: Granular international fields for reporting / shipping integration
        intlDeliveryMode,  // v16.12: "port" or "door"
        intlStreetAddress: intlForm.streetAddress || "",  // v16.12: only relevant for door mode
        intlCountry: intlForm.country,
        intlCountryISO: intlForm.countryISO,
        intlCity: intlForm.city,
        intlZip: intlForm.zip,
        intlShipping: intlForm.shippingMethod || "advise",
        intlCurrency: intlForm.currency,
        intlNotes: intlForm.details || "",
        paymentMethod:"International Inquiry",
        items:cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})),
        total, status:"international_inquiry",
        paymentStatus:"awaiting",
        createdAt:serverTimestamp(),
        uid: user ? user.uid : "guest",
      });
      setIntlDone(true);
      if(onOrderComplete) onOrderComplete();
    } catch(err) {
      console.error("Intl submit error:", err);
      setIntlErr("Something went wrong. Please email "+CONTACT.email);
    } finally {
      setIntlSending(false);
    }
  };

  // V11 FIX: Show success screen FIRST (before empty cart check) so it persists after cart clears
  if(step===5 && successOrder) return(
    <div style={{paddingTop:91,background:ds.color.canvas,minHeight:"100vh"}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"48px 24px"}}>

        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:ds.color.successBg,border:`3px solid ${ds.color.successBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 20px"}}>✓</div>
          <div style={{fontFamily:ds.font.display,fontSize:30,color:ds.color.textDark,marginBottom:8}}>Order Confirmed!</div>
          <p style={{fontSize:15,color:ds.color.textMuted,lineHeight:1.7}}>
            Thank you, <strong>{successOrder.details.name}</strong>! Your order has been received.<br/>
            A confirmation email has been sent to <strong>{successOrder.details.email}</strong>.
          </p>
          <div style={{fontSize:13,color:ds.color.textBody,marginTop:8,fontWeight:600}}>
            Order Reference: <span style={{color:ds.color.red,fontFamily:"monospace"}}>#{successOrder.id.slice(-6).toUpperCase()}</span>
          </div>
        </div>

        {/* v15.2: PROMINENT Payment Proof Upload Section — directly after order confirmation */}
        {successOrder.method !== "International Inquiry" && (
          <div style={{background:"#fff",border:`2px solid ${ds.color.red}`,borderRadius:ds.radius.xl,padding:"24px 28px",boxShadow:ds.shadow.md,marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:ds.color.redLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📸</div>
              <div>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>Upload Your Payment Proof</div>
                <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:2}}>Snap a screenshot of your GCash/Maya/bank transfer receipt and upload it here.</div>
              </div>
            </div>
            <PaymentProofUpload orderId={successOrder.id} onUploaded={()=>{}}/>
            <div style={{fontSize:11.5,color:ds.color.textMuted,marginTop:12,textAlign:"center",lineHeight:1.5}}>
              💡 <strong>Tip:</strong> Upload now to speed up order processing. Our team reviews payment proofs within 24 hours.
            </div>
          </div>
        )}

        <div id="dmeast-order-receipt" style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.md,marginBottom:24}}>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,paddingBottom:20,borderBottom:`2px solid ${ds.color.border}`}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Order Reference</div>
              <div style={{fontFamily:ds.font.display,fontSize:26,color:ds.color.red,letterSpacing:"0.04em"}}>#{successOrder.id.slice(-6).toUpperCase()}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <span style={{fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:ds.radius.pill,background:"#FEF9C3",color:"#A16207"}}>⏳ Awaiting Payment</span>
              <div style={{fontSize:11,color:ds.color.textMuted,marginTop:6}}>{new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}</div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 24px",marginBottom:24}}>
            {[
              {label:"Customer Name",  value:successOrder.details.name},
              {label:"Email",          value:successOrder.details.email},
              {label:"Phone",          value:successOrder.fullPhone},
              {label:"Payment Method", value:successOrder.method},
            ].map(f=>(
              <div key={f.label}>
                <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{f.label}</div>
                <div style={{fontSize:14,color:ds.color.textDark,fontWeight:500}}>{f.value||"—"}</div>
              </div>
            ))}
            {successOrder.forSomeoneElse&&successOrder.recipient&&(
              <div style={{gridColumn:"1/-1",background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,padding:"10px 14px"}}>
                <div style={{fontSize:10,fontWeight:700,color:ds.color.gold,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>📦 Recipient (Order is for someone else)</div>
                <div style={{fontSize:13,color:ds.color.textDark,fontWeight:600}}>{successOrder.recipient.name} · {successOrder.recipient.phone}</div>
              </div>
            )}
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Delivery Address</div>
              <div style={{fontSize:14,color:ds.color.textDark,fontWeight:500}}>{successOrder.details.address}</div>
              {successOrder.details.instructions&&<div style={{fontSize:12,color:ds.color.textMuted,marginTop:3}}>📝 {successOrder.details.instructions}</div>}
            </div>
          </div>

          <div style={{background:ds.color.canvas,borderRadius:ds.radius.lg,padding:"18px 20px",marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Order Items</div>
            {successOrder.items.map(item=>(
              <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${ds.color.borderLight}`}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark}}>{item.name}</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>
                    {formatPHP(item.price)} × {item.qty}
                    {item.requiresPrescription&&<span style={{marginLeft:8,color:"#92400E",fontWeight:600}}>💊 Rx</span>}
                  </div>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:ds.color.textDark}}>{formatPHP(item.price*item.qty)}</div>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:14,marginTop:4,fontSize:17,fontWeight:700,color:ds.color.textDark}}>
              <span>Total Amount</span>
              <span style={{color:ds.color.red}}>{formatPHP(successOrder.total)}</span>
            </div>
          </div>

          {user&&(
            <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:22}}>⭐</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:ds.color.gold}}>You earned {Math.floor(successOrder.total*POINTS_PER_PHP)} reward points!</div>
                <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>Worth {formatPHP(Math.floor(successOrder.total*POINTS_PER_PHP)*POINT_VALUE)} in store credit. View in your portal.</div>
              </div>
            </div>
          )}

          <div style={{borderTop:`1px solid ${ds.color.borderLight}`,paddingTop:20}}>
            <div style={{fontSize:12,fontWeight:700,color:ds.color.textDark,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>What Happens Next</div>
            {[
              {step:"1",icon:"💳",title:"Send your payment",desc:"Use your selected payment method ("+successOrder.method+") to send the total amount."},
              {step:"2",icon:"📎",title:"Upload payment proof",desc:"Upload your payment screenshot below or in your customer portal/track-order page."},
              {step:"3",icon:"✅",title:"We confirm your payment",desc:"Our team reviews your proof within 24 hours and confirms your payment via email."},
              {step:"4",icon:"🚚",title:"Order shipped & delivered",desc:"Once confirmed, your order is prepared and shipped to your address."},
            ].map(s=>(
              <div key={s.step} style={{display:"flex",gap:14,marginBottom:14}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{s.icon}</div>
                <div>
                  <div style={{fontSize:13.5,fontWeight:700,color:ds.color.textDark,marginBottom:2}}>Step {s.step}: {s.title}</div>
                  <div style={{fontSize:12.5,color:ds.color.textMuted,lineHeight:1.6}}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{borderTop:"1px solid "+ds.color.borderLight,paddingTop:20,marginTop:4}}>
            <div style={{fontSize:12,fontWeight:700,color:ds.color.textDark,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Or Track Your Order Later</div>
            <div style={{fontSize:13,color:ds.color.textMuted,marginBottom:0}}>You can also track your order and upload payment proof later.</div>
          </div>

          <div style={{background:ds.color.canvas,borderRadius:ds.radius.md,padding:"14px 18px",marginTop:16,textAlign:"center"}}>
            <div style={{fontSize:13,color:ds.color.textMuted}}>Track your order anytime: <button onClick={()=>setPage("track")} style={{background:"none",border:"none",color:ds.color.red,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:ds.font.body}}>Track Order →</button></div>
          </div>

          <div style={{background:ds.color.canvas,borderRadius:ds.radius.md,padding:"14px 18px",marginTop:8,display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{fontSize:12,color:ds.color.textMuted,fontWeight:600}}>Need help? Contact us:</div>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:6,background:"#25D366",color:"#fff",padding:"6px 14px",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,textDecoration:"none"}}>
              💬 WhatsApp
            </a>
            <a href={"tel:"+CONTACT.phone1Raw}
              style={{display:"inline-flex",alignItems:"center",gap:6,background:ds.color.redLight,color:ds.color.red,padding:"6px 14px",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,textDecoration:"none"}}>
              📞 {CONTACT.phone1}
            </a>
          </div>
        </div>

        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}>
          <button onClick={()=>window.print()} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"11px 22px",borderRadius:ds.radius.md,border:`1.5px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontFamily:ds.font.body,fontSize:14,fontWeight:600,color:ds.color.textBody}}>
            🖨️ Print / Save as PDF
          </button>
          {user&&<Btn variant="ghost" size="md" onClick={()=>setPage("portal")}>📋 View My Orders</Btn>}
          <Btn variant="primary" size="md" onClick={()=>setPage("home")}>Back to Home</Btn>
        </div>
        <p style={{textAlign:"center",fontSize:12,color:ds.color.textLight}}>Screenshot or print this page for your records. Your order reference is <strong>#{successOrder.id.slice(-6).toUpperCase()}</strong>.</p>
      </div>
    </div>
  );

  // v16.2: Better empty cart state with trust signals
  if(cart.length===0) return(
    <div style={{paddingTop:91,minHeight:"80vh",background:`linear-gradient(180deg, ${ds.color.canvas} 0%, ${ds.color.canvasWarm} 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",maxWidth:480,padding:"40px 24px"}}>
        <div style={{
          width:120,height:120,borderRadius:"50%",
          background:`radial-gradient(circle, ${ds.color.redLight} 0%, transparent 70%)`,
          margin:"0 auto 24px",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:56,
        }}>🛒</div>
        <div style={{fontFamily:ds.font.display,fontSize:26,color:ds.color.textDark,marginBottom:10}}>Your cart is empty</div>
        <p style={{fontSize:14.5,color:ds.color.textMuted,lineHeight:1.7,marginBottom:28}}>Browse our catalog of medical equipment, devices, and healthcare essentials. We deliver nationwide.</p>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:32}}>
          <Btn variant="primary" size="lg" onClick={()=>setPage("products")}>Browse Products</Btn>
          <Btn variant="outline" size="lg" onClick={()=>setPage("quote")}>Request Quote</Btn>
        </div>
        {/* Trust signals */}
        <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap",fontSize:11.5,color:ds.color.textMuted}}>
          <span>📋 BIR-Registered</span>
          <span style={{opacity:0.4}}>·</span>
          <span>🚚 Nationwide Delivery</span>
          <span style={{opacity:0.4}}>·</span>
          <span>🔒 Secure Checkout</span>
        </div>
      </div>
    </div>
  );

  // ── Step 0 — Choose Local or International
  if(orderMode===null) return(
    <div style={{paddingTop:91,minHeight:"80vh",background:ds.color.canvas,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:620,width:"100%",padding:"0 24px"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontFamily:ds.font.display,fontSize:26,color:ds.color.textDark,marginBottom:10}}>Where are you ordering from?</div>
          <p style={{fontSize:14,color:ds.color.textMuted,lineHeight:1.7}}>This helps us give you the right checkout process and accurate shipping options.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          {[{flag:"🇵🇭",title:"Philippines",desc:"Local delivery nationwide. Standard checkout with payment selection.",features:["✓ Direct checkout","✓ GCash / Maya / Bank","✓ 1–7 day delivery"],mode:"local",accent:ds.color.red},
            {flag:"🌍",title:"International",desc:"Outside the Philippines. We'll prepare a proforma invoice.",features:["✓ Proforma invoice","✓ FedEx / Air / Sea Cargo","✓ Full export docs"],mode:"intl",accent:ds.color.gold}
          ].map(o=>(
            <button key={o.mode} onClick={()=>setOrderMode(o.mode)} style={{background:ds.color.white,border:`2px solid ${ds.color.border}`,borderRadius:ds.radius.xl,padding:"32px 24px",cursor:"pointer",textAlign:"center",transition:"all 0.2s",fontFamily:ds.font.body}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=o.accent;e.currentTarget.style.boxShadow=ds.shadow.md;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=ds.color.border;e.currentTarget.style.boxShadow="none";}}>
              <div style={{fontSize:48,marginBottom:14}}>{o.flag}</div>
              <div style={{fontSize:17,fontWeight:700,color:ds.color.textDark,marginBottom:8}}>{o.title}</div>
              <div style={{fontSize:13,color:ds.color.textMuted,lineHeight:1.6,marginBottom:16}}>{o.desc}</div>
              {o.features.map(f=><div key={f} style={{fontSize:12,color:o.mode==="local"?ds.color.success:ds.color.gold,fontWeight:500,marginBottom:3}}>{f}</div>)}
            </button>
          ))}
        </div>
        <div style={{marginTop:20,textAlign:"center"}}><button onClick={()=>setPage("products")} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:ds.color.textMuted,fontFamily:ds.font.body}}>← Continue browsing</button></div>
      </div>
    </div>
  );

  // ── International
  if(orderMode==="intl"){
    if(intlDone) return(
      <div style={{paddingTop:91,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",background:ds.color.canvas}}>
        <div style={{textAlign:"center",maxWidth:460,padding:"0 24px"}}>
          <div style={{width:76,height:76,borderRadius:"50%",background:"#FEF6E0",border:`2px solid ${ds.color.goldBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 24px"}}>🌍</div>
          <div style={{fontFamily:ds.font.display,fontSize:26,color:ds.color.textDark,marginBottom:10}}>International Inquiry Received!</div>
          <p style={{fontSize:15,color:ds.color.textMuted,lineHeight:1.7,marginBottom:24}}>Thank you, <strong>{intlForm.name}</strong>! Our team will respond to <strong>{intlForm.email}</strong> with a Proforma Invoice within 24–48 hours.</p>
          <Btn variant="primary" size="md" onClick={()=>{setOrderMode(null);setIntlDone(false);setPage("home");}}>Back to Home</Btn>
        </div>
      </div>
    );
    return(
      <div style={{paddingTop:91,background:ds.color.canvas,minHeight:"80vh"}}>
        <div style={{maxWidth:860,margin:"0 auto",padding:"44px 28px"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
            <button onClick={()=>setOrderMode(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:ds.color.textMuted}}>←</button>
            <div>
              <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark}}>🌍 International Order Inquiry</div>
              <div style={{fontSize:13,color:ds.color.textMuted,marginTop:2}}>We'll prepare a Proforma Invoice with full landed cost.</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:24,alignItems:"start"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              
              {/* v16.11: Auto-populate radio toggle (only shown if user is signed in) */}
              {user&&(
                <div style={{marginBottom:24,padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.borderLight}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Contact for this inquiry</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${!intlForSomeoneElse?ds.color.gold:ds.color.border}`,background:!intlForSomeoneElse?"#fff8e6":"#fff",fontSize:13,fontWeight:600,color:!intlForSomeoneElse?"#8B6914":ds.color.textBody}}>
                      <input type="radio" name="intlOrderFor" checked={!intlForSomeoneElse} onChange={()=>setIntlForSomeoneElse(false)} style={{accentColor:ds.color.gold}}/>
                      👤 Same as my account
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${intlForSomeoneElse?ds.color.red:ds.color.border}`,background:intlForSomeoneElse?ds.color.redLight:"#fff",fontSize:13,fontWeight:600,color:intlForSomeoneElse?ds.color.red:ds.color.textBody}}>
                      <input type="radio" name="intlOrderFor" checked={intlForSomeoneElse} onChange={()=>setIntlForSomeoneElse(true)} style={{accentColor:ds.color.red}}/>
                      🏢 Different contact person
                    </label>
                  </div>
                  {!intlForSomeoneElse && (
                    <div style={{fontSize:12,color:ds.color.textMuted,marginTop:10,lineHeight:1.5}}>
                      ✓ Your account details will auto-fill below. Edit any field if needed.
                    </div>
                  )}
                </div>
              )}
              
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Contact Information</div>
              
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px",marginBottom:16}}>
                {[["Full Name *","name","text","Your full name"],["Company / Organization","company","text","Hospital, clinic…"],["Email Address *","email","email","you@email.com"]].map(([l,k,t,ph])=>(
                  <div key={k}><label style={lbl}>{l}</label><input type={t} value={intlForm[k]} onChange={setI(k)} placeholder={ph} style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/></div>
                ))}
                <div>
                  <label style={lbl}>Phone / WhatsApp *</label>
                  <div style={{display:"flex",gap:8}}>
                    <select value={intlForm.countryCode||"+1"} onChange={e=>setIntlForm(p=>({...p,countryCode:e.target.value}))} style={{...inp,width:"auto",minWidth:90,flexShrink:0,padding:"11px 10px",cursor:"pointer"}}>
                      {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                    <input value={intlForm.phone} onChange={setI("phone")} placeholder="Phone number" style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
                  </div>
                </div>
              </div>
              
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12,marginTop:24}}>Delivery Destination</div>
              
              {/* v16.12: Delivery mode toggle — Port-to-Port vs Door-to-Door */}
              <div style={{marginBottom:20,padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.borderLight}`}}>
                <div style={{fontSize:12,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>How will you receive this order?</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <label style={{flex:"1 1 200px",display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"12px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${intlDeliveryMode==="port"?ds.color.gold:ds.color.border}`,background:intlDeliveryMode==="port"?"#fff8e6":"#fff"}}>
                    <input type="radio" name="intlDeliveryMode" checked={intlDeliveryMode==="port"} onChange={()=>setIntlDeliveryMode("port")} style={{accentColor:ds.color.gold,marginTop:3}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:intlDeliveryMode==="port"?"#8B6914":ds.color.textBody,marginBottom:2}}>🚢 Port-to-Port</div>
                      <div style={{fontSize:11.5,color:ds.color.textMuted,lineHeight:1.4}}>Wholesale/bulk. We deliver to your seaport or airport — you handle local clearance.</div>
                    </div>
                  </label>
                  <label style={{flex:"1 1 200px",display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"12px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${intlDeliveryMode==="door"?ds.color.red:ds.color.border}`,background:intlDeliveryMode==="door"?ds.color.redLight:"#fff"}}>
                    <input type="radio" name="intlDeliveryMode" checked={intlDeliveryMode==="door"} onChange={()=>setIntlDeliveryMode("door")} style={{accentColor:ds.color.red,marginTop:3}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:intlDeliveryMode==="door"?ds.color.red:ds.color.textBody,marginBottom:2}}>🚪 Door-to-Door</div>
                      <div style={{fontSize:11.5,color:ds.color.textMuted,lineHeight:1.4}}>Direct to your address. We handle shipping + duties (DDP). Smaller orders, personal use.</div>
                    </div>
                  </label>
                </div>
              </div>
              
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px",marginBottom:16}}>
                {/* v16.11: Country dropdown with flags */}
                <div>
                  <label style={lbl}>Country *</label>
                  <select 
                    value={intlForm.countryISO} 
                    onChange={e=>{
                      const iso=e.target.value;
                      const country=COUNTRIES.find(c=>c.c===iso);
                      setIntlForm(p=>({...p,countryISO:iso,country:country?country.n:""}));
                    }} 
                    style={{...inp,cursor:"pointer"}}
                  >
                    <option value="">Select country…</option>
                    {COUNTRIES.map(c=><option key={c.c} value={c.c}>{c.f} {c.n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>{intlDeliveryMode==="port"?"Port of Entry":"City"} {intlDeliveryMode==="door"?"*":""}</label>
                  <input value={intlForm.city} onChange={setI("city")} placeholder={intlDeliveryMode==="port"?"e.g. Jebel Ali, Singapore Port, JFK…":"e.g. Dubai, Singapore, New York…"} style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
                </div>
                
                {/* v16.12: Conditional street address — only shown for door-to-door */}
                {intlDeliveryMode==="door" && (
                  <div style={{gridColumn:"1 / -1"}}>
                    <label style={lbl}>Street Address *</label>
                    <textarea 
                      value={intlForm.streetAddress} 
                      onChange={setI("streetAddress")} 
                      rows={2}
                      placeholder="Building/House No., Street, District/Suburb"
                      style={{...inp,resize:"vertical",lineHeight:1.5}}
                      onFocus={fo} 
                      onBlur={e=>e.target.style.borderColor=ds.color.border}
                    />
                    <div style={{fontSize:11,color:ds.color.textLight,marginTop:4}}>Full delivery address (we'll calculate door-to-door shipping + duties on the proforma invoice).</div>
                  </div>
                )}
                {/* v16.11: ZIP / postal code field — always optional */}
                <div>
                  <label style={lbl}>ZIP / Postal Code <span style={{fontWeight:400,color:ds.color.textLight}}>(optional)</span></label>
                  <input value={intlForm.zip} onChange={setI("zip")} placeholder={getZipHint(intlForm.countryISO)} style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
                </div>
                <div>
                  <label style={lbl}>Preferred Shipping</label>
                  <select value={intlForm.shippingMethod} onChange={setI("shippingMethod")} style={{...inp,cursor:"pointer"}}>
                    <option value="">Let DMEAST advise</option>
                    <option>Air Cargo (5–10 days)</option>
                    <option>Sea Cargo (15–45 days)</option>
                    <option>FedEx / DHL Express (3–7 days)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Preferred Currency</label>
                  <select value={intlForm.currency} onChange={setI("currency")} style={{...inp,cursor:"pointer"}}>
                    <option value="USD">USD ($)</option>
                    <option value="PHP">PHP (₱)</option>
                    <option value="SGD">SGD (S$)</option>
                    <option value="AED">AED</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>
              </div>
              
              <div style={{marginBottom:20}}>
                <label style={lbl}>Additional Notes</label>
                <textarea value={intlForm.details} onChange={setI("details")} rows={3} placeholder="Delivery port, special requirements, expected use…" style={{...inp,resize:"vertical",lineHeight:1.65}} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
              </div>
              
              {intlErr&&<div style={{marginBottom:14,padding:"12px 16px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{intlErr}</div>}
              
              <Btn variant={(intlFilled&&cart.length>0)?"gold":"outline"} size="lg" fullWidth disabled={!intlFilled||intlSending||cart.length===0} onClick={handleIntlSubmit}>{intlSending?"Sending…":cart.length===0?"Cart is empty":"Submit International Inquiry →"}</Btn>
            </div>
            
            {/* v16.11: Editable cart summary (qty +/- and remove) */}
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"24px",border:`1px solid ${ds.color.border}`,position:"sticky",top:90}}>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Order Summary</div>
              
              {cart.length===0 ? (
                <div style={{padding:"20px 0",textAlign:"center",color:ds.color.textMuted,fontSize:13}}>
                  Your cart is empty.<br/>
                  <button onClick={()=>{setOrderMode(null);setPage("products");}} style={{marginTop:10,background:"none",border:"none",color:ds.color.gold,fontSize:13,fontWeight:600,cursor:"pointer",textDecoration:"underline"}}>Browse products →</button>
                </div>
              ) : (
                <>
                  {cart.map(item=>(
                    <div key={item.id} style={{marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${ds.color.borderLight}`}}>
                      <div style={{fontSize:12.5,color:ds.color.textBody,marginBottom:8,fontWeight:500,lineHeight:1.4}}>{item.name}</div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                        {/* Qty controls */}
                        <div style={{display:"flex",alignItems:"center",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.sm,overflow:"hidden"}}>
                          <button onClick={()=>updateQty(item.id,Math.max(1,item.qty-1))} disabled={item.qty<=1} style={{width:26,height:26,border:"none",background:item.qty<=1?ds.color.canvas:"#fff",cursor:item.qty<=1?"not-allowed":"pointer",fontSize:14,fontWeight:600,color:item.qty<=1?ds.color.textLight:ds.color.textDark}}>−</button>
                          <span style={{padding:"0 10px",fontSize:13,fontWeight:600,minWidth:26,textAlign:"center"}}>{item.qty}</span>
                          <button onClick={()=>updateQty(item.id,item.qty+1)} style={{width:26,height:26,border:"none",background:"#fff",cursor:"pointer",fontSize:14,fontWeight:600,color:ds.color.textDark}}>+</button>
                        </div>
                        <span style={{fontWeight:600,fontSize:13,color:ds.color.textDark}}>{formatPHP(item.price*item.qty)}</span>
                        {/* Remove button */}
                        <button onClick={()=>{if(confirm(`Remove "${item.name}" from your inquiry?`))removeFromCart(item.id);}} title="Remove from inquiry" style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textLight,padding:4,borderRadius:ds.radius.sm}} onMouseEnter={e=>{e.currentTarget.style.color=ds.color.red;e.currentTarget.style.background=ds.color.redLight;}} onMouseLeave={e=>{e.currentTarget.style.color=ds.color.textLight;e.currentTarget.style.background="none";}}>🗑️</button>
                      </div>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:14,marginTop:6}}>
                    <span>Subtotal</span>
                    <span>{formatPHP(total)}</span>
                  </div>
                  <div style={{fontSize:11,color:ds.color.textLight,marginTop:4}}>{formatUSD(total)} · indicative</div>
                  <div style={{fontSize:11,color:ds.color.textMuted,marginTop:10,padding:"8px 10px",background:ds.color.canvas,borderRadius:ds.radius.sm,lineHeight:1.5}}>
                    💡 {intlDeliveryMode==="door" 
                      ? "Door-to-door shipping + duties will be added on the proforma invoice (DDP terms)." 
                      : "Port shipping costs will be added. You'll handle local customs clearance."}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Local checkout
  const stepLabels=[["1","Review"],["2","Details"],["3","Rx"],["4","Payment"]];

  return(
    <div style={{paddingTop:91,background:ds.color.canvas,minHeight:"80vh"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:"40px 28px"}}>

        <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:32,maxWidth:500}}>
          {stepLabels.map(([n,label],i)=>{
            const s=parseInt(n); const active=step===s; const done=step>s;
            return(
              <div key={n} style={{display:"flex",alignItems:"center",flex:i<3?1:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:done?ds.color.success:active?ds.color.red:ds.color.border,color:done||active?"#fff":ds.color.textMuted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{done?"✓":n}</div>
                  <span style={{fontSize:12,fontWeight:500,color:active?ds.color.textDark:ds.color.textMuted,whiteSpace:"nowrap"}}>{label}</span>
                </div>
                {i<3&&<div style={{flex:1,height:2,background:done?ds.color.success:ds.color.borderLight,margin:"0 12px"}}/>}
              </div>
            );
          })}
        </div>

        {/* v16.2: Trust signals bar above cart */}
        {step===1 && cart.length > 0 && (
          <div style={{
            display:"flex",
            gap:14,
            justifyContent:"center",
            flexWrap:"wrap",
            padding:"14px 20px",
            background:"#fff",
            borderRadius:ds.radius.lg,
            border:`1px solid ${ds.color.borderLight}`,
            marginBottom:18,
            fontSize:12,
            color:ds.color.textBody,
          }}>
            <span style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{color:ds.color.success}}>✓</span> Secure Checkout
            </span>
            <span style={{opacity:0.4}}>·</span>
            <span style={{display:"flex",alignItems:"center",gap:5}}>
              <span>🚚</span> Nationwide Delivery
            </span>
            <span style={{opacity:0.4}}>·</span>
            <span style={{display:"flex",alignItems:"center",gap:5}}>
              <span>📋</span> BIR-Compliant Receipts
            </span>
            <span style={{opacity:0.4}}>·</span>
            <span style={{display:"flex",alignItems:"center",gap:5}}>
              <span>💬</span> Support 24/7
            </span>
          </div>
        )}

        {/* ── Step 1 — Cart Review */}
        {step===1&&(
          <div className="dm-cart-grid" style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:24,alignItems:"start"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"28px 32px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:20}}>🛒 Your Cart ({cart.length} item{cart.length!==1?"s":""})</div>
              {cart.map(item=>(
                <div key={item.id} style={{
                  display:"grid",
                  gridTemplateColumns:"1fr auto auto auto",
                  alignItems:"center",
                  gap:14,
                  padding:"16px 0",
                  borderBottom:`1px solid ${ds.color.borderLight}`,
                }} className="dm-cart-item">
                  {/* Item info */}
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark,marginBottom:3}}>{item.name}</div>
                    <div style={{fontSize:11.5,color:ds.color.textMuted}}>
                      {formatPHP(item.price)} <span style={{opacity:0.6}}>per unit</span>
                    </div>
                    {item.requiresPrescription&&<div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:5,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:ds.radius.pill,background:"#FFF3CD",border:"1px solid #FBBF24",color:"#92400E"}}>💊 RX REQUIRED</div>}
                  </div>
                  
                  {/* Qty stepper */}
                  <div style={{display:"flex",alignItems:"center",gap:0,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,overflow:"hidden",background:"#fff"}}>
                    <button onClick={()=>updateQty(item.id,Math.max(1,item.qty-1))} disabled={item.qty<=1} style={{width:30,height:32,border:"none",background:item.qty<=1?ds.color.canvas:"#fff",cursor:item.qty<=1?"not-allowed":"pointer",fontSize:16,fontWeight:600,color:item.qty<=1?ds.color.textLight:ds.color.textDark,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                    <span style={{fontSize:13,fontWeight:700,minWidth:32,textAlign:"center",color:ds.color.textDark,padding:"0 6px",borderLeft:`1px solid ${ds.color.borderLight}`,borderRight:`1px solid ${ds.color.borderLight}`,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>{item.qty}</span>
                    <button onClick={()=>updateQty(item.id,item.qty+1)} style={{width:30,height:32,border:"none",background:"#fff",cursor:"pointer",fontSize:16,fontWeight:600,color:ds.color.textDark,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                  </div>
                  
                  {/* Line total */}
                  <div style={{fontSize:14,fontWeight:700,minWidth:88,textAlign:"right",color:ds.color.textDark}}>{formatPHP(item.price*item.qty)}</div>
                  
                  {/* Remove button */}
                  <button onClick={()=>removeFromCart(item.id)} title="Remove from cart" style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textLight,padding:6,borderRadius:ds.radius.sm,transition:"color 0.15s, background 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.color=ds.color.red;e.currentTarget.style.background=ds.color.redLight;}}
                    onMouseLeave={e=>{e.currentTarget.style.color=ds.color.textLight;e.currentTarget.style.background="none";}}
                  >✕</button>
                </div>
              ))}
              
              {/* Continue shopping link */}
              <div style={{textAlign:"center",paddingTop:18}}>
                <button onClick={()=>setPage("products")} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:ds.color.red,fontFamily:ds.font.body,fontWeight:600}}>
                  ← Continue Shopping
                </button>
              </div>
            </div>
            <div className="dm-cart-summary" style={{background:"#fff",borderRadius:ds.radius.xl,padding:"24px",border:`1px solid ${ds.color.border}`,boxShadow:ds.shadow.sm,position:"sticky",top:90}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:16}}>Order Summary</div>
              
              {/* v16.2: Show VAT breakdown */}
              {(()=>{ 
                const vat = computeVATBreakdown(total, "vat_inclusive");
                return (
                  <div style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody,marginBottom:6}}>
                      <span>Subtotal ({cart.length} item{cart.length!==1?"s":""})</span>
                      <span>{formatPHP(vat.netOfVAT)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody,marginBottom:6}}>
                      <span>VAT (12%)</span>
                      <span>{formatPHP(vat.vat)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textMuted,marginBottom:14}}>
                      <span>Shipping</span>
                      <span style={{color:ds.color.success,fontWeight:600}}>Calculated next →</span>
                    </div>
                    <div style={{borderTop:`1px solid ${ds.color.borderLight}`,paddingTop:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:700,color:ds.color.textDark}}>
                        <span>Total</span>
                        <span>{formatPHP(total)}</span>
                      </div>
                      <div style={{fontSize:11,color:ds.color.textLight,marginTop:4,textAlign:"right"}}>VAT included · {formatUSD(total)} approx.</div>
                    </div>
                  </div>
                );
              })()}
              
              {hasRx&&<div style={{background:"#FFF3CD",border:"1px solid #FBBF24",borderRadius:ds.radius.md,padding:"10px 14px",fontSize:12,color:"#92400E",marginBottom:14,lineHeight:1.5}}>💊 <strong>Prescription items in cart.</strong> You'll be asked to upload a valid Rx during checkout.</div>}
              {user&&pointBalance>=50&&(
                <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,padding:"12px 14px",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:ds.color.gold}}>⭐ {pointBalance} Reward Points = {formatPHP(pointBalance*POINT_VALUE)} credit</div>
                      <div style={{fontSize:11,color:ds.color.gold,marginTop:2,opacity:0.85}}>You can use up to {maxPointsUsable} pts (saves {formatPHP(pointsDiscount)}) on this order</div>
                    </div>
                    <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",flexShrink:0}}>
                      <input type="checkbox" checked={usePoints} onChange={e=>setUsePoints(e.target.checked)} style={{width:16,height:16,accentColor:ds.color.gold,cursor:"pointer"}}/>
                      <span style={{fontSize:12,fontWeight:700,color:ds.color.gold}}>Use points</span>
                    </label>
                  </div>
                  {usePoints&&<div style={{marginTop:8,fontSize:11.5,color:ds.color.gold,fontWeight:600}}>✓ -{formatPHP(pointsDiscount)} discount applied → New total: {formatPHP(finalTotal)}</div>}
                </div>
              )}
              {user&&!usePoints&&<div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,padding:"10px 12px",fontSize:12,color:ds.color.gold,marginBottom:14}}>⭐ You'll earn <strong>{Math.floor(finalTotal*POINTS_PER_PHP)} points</strong> with this order!</div>}
              
              <Btn variant="primary" size="lg" fullWidth onClick={()=>setStep(2)}>Proceed to Checkout →</Btn>
              
              {/* Trust signals below button */}
              <div style={{marginTop:14,padding:"10px 0",borderTop:`1px solid ${ds.color.borderLight}`,fontSize:11,color:ds.color.textMuted,textAlign:"center",lineHeight:1.6}}>
                <div>🔒 Your data is securely encrypted</div>
                <div style={{marginTop:4}}>📞 Need help? <a href="mailto:info@dmeastph.com" style={{color:ds.color.red,fontWeight:600,textDecoration:"none"}}>info@dmeastph.com</a></div>
              </div>
              
              <button onClick={()=>setOrderMode(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11.5,color:ds.color.textLight,fontFamily:ds.font.body,marginTop:10,display:"block",width:"100%",textAlign:"center"}}>← Change shipping region</button>
            </div>
          </div>
        )}

        {/* ── Step 2 — Delivery Details (V11: redesigned) */}
        {step===2&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24,alignItems:"start"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:8}}>📦 Delivery Details</div>

              {/* V11: Radio question — Who is this order for? */}
              {user&&(
                <div style={{background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"14px 16px",marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark,marginBottom:10}}>Who is this order for?</div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${!forSomeoneElse?ds.color.red:ds.color.border}`,background:!forSomeoneElse?ds.color.redLight:"#fff",fontSize:13,fontWeight:600,color:!forSomeoneElse?ds.color.red:ds.color.textBody}}>
                      <input type="radio" name="orderFor" checked={!forSomeoneElse} onChange={()=>setForSomeoneElse(false)} style={{accentColor:ds.color.red}}/>
                      🙋 For myself
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 14px",borderRadius:ds.radius.md,border:`1.5px solid ${forSomeoneElse?ds.color.red:ds.color.border}`,background:forSomeoneElse?ds.color.redLight:"#fff",fontSize:13,fontWeight:600,color:forSomeoneElse?ds.color.red:ds.color.textBody}}>
                      <input type="radio" name="orderFor" checked={forSomeoneElse} onChange={()=>setForSomeoneElse(true)} style={{accentColor:ds.color.red}}/>
                      📦 For someone else
                    </label>
                  </div>
                </div>
              )}

              {user&&!forSomeoneElse&&(
                <div style={{background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,padding:"10px 14px",marginBottom:20,fontSize:13,color:ds.color.success}}>
                  ✓ Auto-filled from your profile. You can edit any field below.
                </div>
              )}

              {/* Account holder details */}
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>{forSomeoneElse?"Your Contact Info (Account Holder)":"Your Information"}</div>

              <div style={{marginBottom:16}}>
                <label style={lbl}>Full Name *</label>
                <input value={details.name} onChange={setD("name")} placeholder="Full name" style={{...inp,...(fieldErrors.name?inpErr:{})}} onFocus={fo} onBlur={e=>bl(e,"name")}/>
                {fieldErrors.name&&<div style={errTxt}>⚠ {fieldErrors.name}</div>}
              </div>

              <div style={{marginBottom:16}}>
                <label style={lbl}>Email Address *</label>
                <input type="email" value={details.email} onChange={setD("email")} placeholder="you@email.com" style={{...inp,...(fieldErrors.email?inpErr:{})}} onFocus={fo} onBlur={e=>bl(e,"email")}/>
                {fieldErrors.email&&<div style={errTxt}>⚠ {fieldErrors.email}</div>}
              </div>

              <div style={{marginBottom:20}}>
                <label style={lbl}>Phone / WhatsApp *</label>
                <div style={{display:"flex",gap:8}}>
                  <select value={countryCode} onChange={e=>setCountryCode(e.target.value)} style={{...inp,width:"auto",minWidth:100,flexShrink:0,padding:"11px 10px",cursor:"pointer"}}>
                    {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                  <div style={{flex:1}}>
                    <input value={details.phoneNum} onChange={setD("phoneNum")} placeholder={countryCode==="+63"?"9XX XXX XXXX":"Phone number"} style={{...inp,...(fieldErrors.phoneNum?inpErr:{})}} onFocus={fo} onBlur={e=>bl(e,"phoneNum")}/>
                    {fieldErrors.phoneNum&&<div style={errTxt}>⚠ {fieldErrors.phoneNum}</div>}
                  </div>
                </div>
                <div style={{fontSize:11,color:ds.color.textLight,marginTop:4}}>Full number: {fullPhone||"—"}</div>
              </div>

              {/* V11: Recipient info section */}
              {forSomeoneElse&&(
                <>
                  <div style={{fontSize:11,fontWeight:700,color:ds.color.gold,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12,marginTop:8,paddingTop:18,borderTop:`1px dashed ${ds.color.border}`}}>📦 Recipient's Info (Person Receiving the Order)</div>

                  <div style={{marginBottom:16}}>
                    <label style={lbl}>Recipient's Full Name *</label>
                    <input value={recipient.name} onChange={setR("name")} placeholder="Person who will receive the order" style={{...inp,...(fieldErrors.recipientName?inpErr:{})}} onFocus={fo} onBlur={e=>e.target.style.borderColor=fieldErrors.recipientName?ds.color.red:ds.color.border}/>
                    {fieldErrors.recipientName&&<div style={errTxt}>⚠ {fieldErrors.recipientName}</div>}
                  </div>

                  <div style={{marginBottom:20}}>
                    <label style={lbl}>Recipient's Phone *</label>
                    <div style={{display:"flex",gap:8}}>
                      <select value={recipient.phoneCode} onChange={e=>setRecipient(p=>({...p,phoneCode:e.target.value}))} style={{...inp,width:"auto",minWidth:100,flexShrink:0,padding:"11px 10px",cursor:"pointer"}}>
                        {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                      </select>
                      <div style={{flex:1}}>
                        <input value={recipient.phoneNum} onChange={setR("phoneNum")} placeholder={recipient.phoneCode==="+63"?"9XX XXX XXXX":"Phone number"} style={{...inp,...(fieldErrors.recipientPhoneNum?inpErr:{})}} onFocus={fo} onBlur={e=>e.target.style.borderColor=fieldErrors.recipientPhoneNum?ds.color.red:ds.color.border}/>
                        {fieldErrors.recipientPhoneNum&&<div style={errTxt}>⚠ {fieldErrors.recipientPhoneNum}</div>}
                      </div>
                    </div>
                    <div style={{fontSize:11,color:ds.color.textLight,marginTop:4}}>Recipient phone: {fullRecipientPhone||"—"}</div>
                  </div>
                </>
              )}

              {/* Address with map */}
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12,marginTop:4,paddingTop:18,borderTop:`1px dashed ${ds.color.border}`}}>🗺️ Delivery Location</div>

              <div style={{marginBottom:12}}>
                <label style={lbl}>Delivery Address *</label>
                <textarea value={details.address} onChange={setD("address")} rows={3} placeholder="Unit/House No., Street, Barangay, City, Province, ZIP" style={{...inp,...(fieldErrors.address?inpErr:{}),resize:"vertical",lineHeight:1.65}} onFocus={fo} onBlur={e=>bl(e,"address")}/>
                {fieldErrors.address&&<div style={errTxt}>⚠ {fieldErrors.address}</div>}
              </div>

              {/* V11: Toggle map */}
              <div style={{marginBottom:16}}>
                {!showMap?(
                  <button type="button" onClick={()=>setShowMap(true)} style={{padding:"10px 16px",borderRadius:ds.radius.md,border:`1.5px solid ${ds.color.red}`,background:ds.color.redLight,cursor:"pointer",fontSize:13,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body,display:"inline-flex",alignItems:"center",gap:8}}>
                    🗺️ Pin Exact Location on Map
                  </button>
                ):(
                  <>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <div style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark}}>🗺️ Pin Your Exact Delivery Location</div>
                      <button type="button" onClick={()=>setShowMap(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:ds.color.textMuted,fontFamily:ds.font.body}}>Hide map ✕</button>
                    </div>
                    <LeafletAddressMap
                      onAddressChange={(addr)=>{ setDetails(p=>({...p,address:addr})); if(fieldErrors.address) setFieldErrors(p=>({...p,address:""})); }}
                      onCoordsChange={(c)=>setDeliveryCoords(c)}
                    />
                    {deliveryCoords&&<div style={{fontSize:11,color:ds.color.success,marginTop:6}}>✓ Location pinned: {deliveryCoords.lat.toFixed(5)}, {deliveryCoords.lng.toFixed(5)}</div>}
                  </>
                )}
              </div>

              <div style={{marginBottom:24}}>
                <label style={lbl}>Delivery Instructions <span style={{fontSize:11,fontWeight:400,color:ds.color.textMuted}}>(optional)</span></label>
                <input value={details.instructions} onChange={setD("instructions")} placeholder="Gate code, landmark, leave at door…" style={inp} onFocus={fo} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
              </div>

              <div style={{display:"flex",gap:12}}>
                <Btn variant="outline" size="lg" onClick={()=>setStep(1)}>← Back</Btn>
                <div style={{flex:1}}><Btn variant={detFilled?"primary":"outline"} size="lg" fullWidth disabled={!detFilled} onClick={handleContinue}>Continue →</Btn></div>
              </div>
              {Object.keys(fieldErrors).length>0&&(
                <div style={{marginTop:12,padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>
                  ⚠ Please correct the highlighted fields above to continue.
                </div>
              )}
            </div>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"24px",border:`1px solid ${ds.color.border}`}}>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Order Summary</div>
              {cart.map(item=><div key={item.id} style={{display:"flex",justifyContent:"space-between",fontSize:12.5,color:ds.color.textBody,marginBottom:6}}><span>{item.name} × {item.qty}</span><span style={{fontWeight:600}}>{formatPHP(item.price*item.qty)}</span></div>)}
              <div style={{borderTop:`1px solid ${ds.color.border}`,marginTop:10,paddingTop:10,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:14}}><span>Total</span><span>{formatPHP(total)}</span></div>
            </div>
          </div>
        )}

        {/* ── Step 3 — Prescription */}
        {step===3&&hasRx&&(
          <div style={{maxWidth:600,margin:"0 auto"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"36px 40px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:8}}>💊 Prescription Upload</div>
              <p style={{fontSize:14,color:ds.color.textMuted,lineHeight:1.7,marginBottom:24}}>Your cart contains prescription-only items. A valid doctor's prescription is required to process your order.</p>
              <div style={{border:`2px dashed ${prescription?ds.color.success:ds.color.border}`,borderRadius:ds.radius.lg,padding:28,textAlign:"center",background:prescription?ds.color.successBg:ds.color.canvas,marginBottom:20,transition:"all 0.2s"}}>
                {prescription?(
                  <>
                    <div style={{fontSize:32,marginBottom:8}}>✅</div>
                    <div style={{fontSize:14,fontWeight:700,color:ds.color.success,marginBottom:4}}>Prescription Uploaded</div>
                    <div style={{fontSize:12,color:ds.color.textMuted,marginBottom:12}}>{prescription.name}</div>
                    {prescription.preview&&prescription.preview.startsWith("data:image")&&<img src={prescription.preview} alt="Rx" style={{maxWidth:200,maxHeight:150,objectFit:"contain",borderRadius:ds.radius.md,margin:"0 auto 12px",display:"block"}}/>}
                    <button onClick={()=>setPrescription(null)} style={{background:"none",border:"none",color:ds.color.red,cursor:"pointer",fontSize:13,fontFamily:ds.font.body}}>Remove and re-upload</button>
                  </>
                ):(
                  <>
                    <div style={{fontSize:40,marginBottom:10}}>📋</div>
                    <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark,marginBottom:16}}>Upload your doctor's prescription</div>
                    <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:12}}>
                      <label htmlFor="rx-camera-input" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 20px",borderRadius:ds.radius.lg,border:`2px solid ${ds.color.red}`,background:ds.color.redLight,cursor:"pointer",fontSize:14,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body}}>
                        📷 Take a Photo
                      </label>
                      <label htmlFor="rx-file-input" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 20px",borderRadius:ds.radius.lg,border:`2px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,color:ds.color.textBody,fontFamily:ds.font.body}}>
                        📁 Upload from Device
                      </label>
                    </div>
                    <div style={{fontSize:12,color:ds.color.textLight}}>Accepted: JPG, PNG, PDF · Max 10MB</div>
                  </>
                )}
              </div>
              <input id="rx-camera-input" type="file" accept="image/*" capture="environment" onChange={handleRxUpload} style={{display:"none"}}/>
              <input id="rx-file-input" type="file" accept="image/*,application/pdf" onChange={handleRxUpload} style={{display:"none"}}/>
              <div style={{fontSize:12,color:ds.color.textMuted,lineHeight:1.7,marginBottom:24,padding:"12px 14px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.borderLight}`}}>
                <strong style={{color:ds.color.textDark}}>Valid prescription must show:</strong><br/>
                ✓ Doctor's name and PRC license · ✓ Patient name and date<br/>
                ✓ Medicine name, dosage, quantity · ✓ Doctor's signature · ✓ Not more than 1 year old
              </div>
              <div style={{display:"flex",gap:12}}>
                <Btn variant="outline" size="lg" onClick={goBack}>← Back</Btn>
                <div style={{flex:1}}><Btn variant={prescription?"primary":"outline"} size="lg" fullWidth disabled={!prescription} onClick={goNext}>{prescription?"Continue to Payment →":"Upload prescription to continue"}</Btn></div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4 — Payment */}
        {step===4&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24,alignItems:"start"}}>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",boxShadow:ds.shadow.sm,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:6}}>Select Payment Method</div>
              <p style={{fontSize:14,color:ds.color.textMuted,marginBottom:22}}>Payment instructions will be sent to <strong>{details.email}</strong> after placing your order. You can upload your payment proof immediately on the next screen.</p>

              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:24,padding:"12px 14px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.borderLight}`,alignItems:"center"}}>
                <span style={{fontSize:13}}>🔒</span><span style={{fontSize:11,fontWeight:700,color:ds.color.success}}>Secure Checkout</span>
                <div style={{width:1,height:16,background:ds.color.border}}/>
                <span style={{fontSize:11,color:ds.color.textMuted}}>All payments processed securely</span>
              </div>

              {finalTotal>=3000&&(
                <div style={{background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)",borderRadius:ds.radius.lg,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:14,cursor:"pointer",border:"2px solid transparent"}}
                  onClick={async()=>{
                    try{
                      const nameParts=(details.name||"").trim().split(/\s+/);
                      const r=await fetch("/api/billease",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
                        orderId:"DMPRE-"+Date.now(),amount:finalTotal,
                        customer:{firstName:nameParts[0],lastName:nameParts.slice(1).join(" "),email:details.email,phone:fullPhone},
                        items:cart,
                      })});
                      const d=await r.json();
                      if(d.checkoutUrl) window.location.href=d.checkoutUrl;
                      else alert("BillEase unavailable right now. Please use another payment method.");
                    }catch(e){alert("BillEase unavailable: "+e.message);}
                  }}
                >
                  <div style={{fontSize:24}}>🏦</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>Pay in Installments with BillEase</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2}}>0% interest · Up to 12 months · Instant approval</div>
                  </div>
                  <div style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:"#F59E0B",whiteSpace:"nowrap"}}>BNPL →</div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
                {PAYMENT_METHODS_DATA.map(m=>(
                  <button key={m.id} onClick={()=>setMethod(m.label)} style={{
                    padding:"18px 12px",borderRadius:ds.radius.lg,
                    border:`2px solid ${method===m.label?m.color:ds.color.border}`,
                    background:method===m.label?m.bg:ds.color.canvas,
                    cursor:"pointer",fontFamily:ds.font.body,
                    display:"flex",flexDirection:"column",alignItems:"center",gap:10,
                    transition:"all 0.15s",boxShadow:method===m.label?`0 0 0 3px ${m.color}22`:"none",
                  }}>
                    <div style={{height:26,display:"flex",alignItems:"center",justifyContent:"center"}}>{m.logo}</div>
                    <span style={{fontSize:11.5,fontWeight:600,color:method===m.label?m.color:ds.color.textBody}}>{m.label}</span>
                  </button>
                ))}
              </div>

              {errMsg&&<div style={{marginBottom:14,padding:"12px 16px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
              <div style={{display:"flex",gap:12}}>
                <Btn variant="outline" size="lg" onClick={goBack}>← Back</Btn>
                <div style={{flex:1}}><Btn variant={method?"primary":"outline"} size="lg" fullWidth disabled={!method||sending} onClick={handlePlaceOrder}>
                  {sending?<><Spinner size={16} color="#fff"/>&nbsp;Placing Order…</>:method?`Place Order — ${formatPHP(total)} →`:"Select a payment method"}
                </Btn></div>
              </div>
              <p style={{textAlign:"center",fontSize:12,color:ds.color.textMuted,marginTop:12,lineHeight:1.6}}>By placing your order you agree to be contacted for payment and delivery confirmation.</p>
            </div>
            <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"24px",border:`1px solid ${ds.color.border}`}}>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Order Summary</div>
              {cart.map(item=><div key={item.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody,marginBottom:6}}><span>{item.name} × {item.qty}{item.requiresPrescription?" 💊":""}</span><span style={{fontWeight:600}}>{formatPHP(item.price*item.qty)}</span></div>)}
              {pointsDiscount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:ds.color.gold,marginBottom:4}}><span>⭐ Points discount</span><span>-{formatPHP(pointsDiscount)}</span></div>}
              <div style={{borderTop:`1px solid ${ds.color.border}`,marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:15}}><span>Total</span><span>{formatPHP(finalTotal)}</span></div>
              <div style={{marginTop:8,fontSize:13,color:ds.color.textMuted}}>📍 {details.address}</div>
              {forSomeoneElse&&<div style={{marginTop:4,fontSize:12,color:ds.color.gold}}>📦 For: {recipient.name} ({fullRecipientPhone})</div>}
              {hasRx&&prescription&&<div style={{marginTop:4,fontSize:13,color:ds.color.success}}>✓ Rx: {prescription.name}</div>}
              {user&&<div style={{marginTop:12,background:ds.color.goldLight,borderRadius:ds.radius.md,padding:"10px 12px",fontSize:12,color:ds.color.gold}}>⭐ Earn <strong>{Math.floor(finalTotal*POINTS_PER_PHP)} poi