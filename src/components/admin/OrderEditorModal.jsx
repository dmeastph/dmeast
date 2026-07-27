import { useState, useEffect } from "react";
import { doc, updateDoc, deleteDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { formatPHP, formatDate } from "../../utils/format";
import { ORDER_SOURCES, PAYMENT_TERMS_OPTIONS, VAT_TREATMENT_OPTIONS, findVATTreatment, findTerms, findSource, CUSTOMER_TAGS, calculateDueDate } from "../../constants/order";
import { orderStatusColor, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, paymentStatusColor } from "../../constants/status";
import { computeVATBreakdown } from "../../lib/pdf";
import { sendCustomerStatusEmail } from "../../lib/email-helpers";
import { Btn, Spinner, Tag } from "../ui";
import MayaPaymentPanel from "../MayaPaymentPanel";
import { LeafletAddressMap } from "../LeafletAddressMap";
import { CONTACT } from "../../constants/contact";

export function OrderEditorModal({ order, products: existingProducts, onClose, onSaved, onDeleted, onGeneratePDF, showMarginFields = true, canDelete = true, canEdit = true }){
  const [tab, setTab] = useState("info"); // info | items | details
  
  // Customer info
  const [name, setName]               = useState(order.name || "");
  const [email, setEmail]             = useState(order.email || "");
  const [phone, setPhone]             = useState(order.phone || "");
  const [address, setAddress]         = useState(order.address || "");
  const [instructions, setInstructions] = useState(order.instructions || "");
  
  // Recipient (if for someone else)
  const [hasRecipient, setHasRecipient] = useState(!!order.recipientName);
  const [recipientName, setRecipientName]   = useState(order.recipientName || "");
  const [recipientPhone, setRecipientPhone] = useState(order.recipientPhone || "");
  
  // Items + charges
  const [items, setItems] = useState(
    (order.items || []).map(i => ({
      productId: i.id, name: i.name,
      qty: i.qty || 1, unitPrice: i.price || 0,
      requiresPrescription: !!i.requiresPrescription,
    }))
  );
  const [otherCharges, setOtherCharges] = useState(order.otherCharges || []);
  const [productSearch, setProductSearch] = useState("");
  
  // Order details
  const [source, setSource]               = useState(order.source || "website");
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod || "");
  const [paymentTerms, setPaymentTerms]   = useState(order.paymentTerms || "");
  const [paymentTermsNotes, setTermsNotes]= useState(order.paymentTermsNotes || "");
  const [internalNotes, setInternalNotes] = useState(order.internalNotes || "");
  const [supplierCost, setSupplierCost]   = useState(order.supplierCost || "");
  const [supplierName, setSupplierName]   = useState(order.supplierName || "");
  const [orderStatus, setOrderStatus]     = useState(order.status || "pending");
  const [paymentStatusValue, setPaymentStatusValue] = useState(order.paymentStatus || "awaiting");
  // v15.4: VAT treatment (defaults to vat_inclusive for legacy orders)
  const [vatTreatment, setVatTreatment]   = useState(order.vatTreatment || "vat_inclusive");
  
  // Editable dates
  const toDateStr = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const [editCreatedAt,   setEditCreatedAt]   = useState(toDateStr(order.createdAt));
  const [editShippedAt,   setEditShippedAt]   = useState(toDateStr(order.shippedAt));
  const [editDeliveredAt, setEditDeliveredAt] = useState(toDateStr(order.deliveredAt));

  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  
  // Recalculate totals
  const itemsTotal = items.reduce((s,i) => s + (i.qty * i.unitPrice), 0);
  const chargesTotal = otherCharges.reduce((s,c) => s + (Number(c.amount)||0), 0);
  const total = itemsTotal + chargesTotal;
  const margin = supplierCost ? total - Number(supplierCost) : null;
  
  const filteredProducts = productSearch.trim()
    ? existingProducts.filter(p => {
        const q = productSearch.toLowerCase();
        return (p.name||"").toLowerCase().includes(q) ||
               (p.tag||"").toLowerCase().includes(q);
      }).slice(0, 6)
    : [];
  
  const addProduct = (p) => {
    const existing = items.find(i => i.productId === p.id);
    if (existing) {
      setItems(items.map(i => i.productId === p.id ? {...i, qty: i.qty + 1} : i));
    } else {
      setItems([...items, {
        productId: p.id, name: p.name,
        qty: 1, unitPrice: p.price || 0,
        requiresPrescription: !!p.requiresPrescription,
      }]);
    }
    setProductSearch("");
  };
  
  const updateItem = (idx, field, value) => {
    const arr = [...items];
    if (field === "qty") arr[idx].qty = Math.max(1, Number(value) || 1);
    else if (field === "unitPrice") arr[idx].unitPrice = Math.max(0, Number(value) || 0);
    else arr[idx][field] = value;
    setItems(arr);
  };
  
  const removeItem = (idx) => setItems(items.filter((_,i) => i !== idx));
  
  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) { setErrMsg("Name and phone are required."); return; }
    if (items.length === 0) { setErrMsg("Order must have at least one item."); return; }
    
    setSaving(true); setErrMsg("");
    try {
      // Build update payload — only include fields we want to update
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim(),
        address: address.trim() || null,
        instructions: instructions.trim() || null,
        recipientName: hasRecipient ? (recipientName.trim() || null) : null,
        recipientPhone: hasRecipient ? (recipientPhone.trim() || null) : null,
        items: items.map(i => ({
          id: i.productId, name: i.name,
          price: i.unitPrice, qty: i.qty,
          requiresPrescription: !!i.requiresPrescription,
        })),
        otherCharges: otherCharges.filter(c => c.description && c.amount),
        // v15.4: VAT treatment
        vatTreatment: vatTreatment,
        total,
        source: source,
        paymentMethod: paymentMethod || null,
        paymentTerms: paymentTerms || null,
        paymentTermsNotes: paymentTermsNotes || null,
        internalNotes: internalNotes || null,
        supplierCost: supplierCost ? Number(supplierCost) : null,
        supplierName: supplierName || null,
        margin: margin,
        status: orderStatus,
        paymentStatus: paymentStatusValue,
        // Editable dates
        ...(editCreatedAt   && { createdAt:   new Date(editCreatedAt   + "T00:00:00") }),
        shippedAt:   editShippedAt   ? new Date(editShippedAt   + "T00:00:00") : null,
        deliveredAt: editDeliveredAt ? new Date(editDeliveredAt + "T00:00:00") : null,
        // Audit trail: track edit
        lastEditedAt: serverTimestamp(),
        lastEditedBy: "admin",
      };
      
      await updateDoc(doc(db, "orders", order.id), payload);
      
      // v13.0d: Send email if status changed
      const statusChanged = order.status !== orderStatus;
      const paymentChanged = order.paymentStatus !== paymentStatusValue;
      if ((statusChanged || paymentChanged) && payload.email) {
        const orderRef = order.id.slice(-6).toUpperCase();
        const updatedOrder = { ...order, ...payload };
        let subject = `ORDER #${orderRef} — Updated`;
        let body = `Dear ${updatedOrder.name||"Customer"},\n\nYour order #${orderRef} has been updated.\n\n`;
        if (statusChanged) {
          subject = `ORDER #${orderRef} — Status: ${ORDER_STATUS_LABELS[orderStatus]||orderStatus}`;
          body += `Order Status: ${ORDER_STATUS_LABELS[orderStatus]||orderStatus}\n`;
        }
        if (paymentChanged) {
          body += `Payment Status: ${PAYMENT_STATUS_LABELS[paymentStatusValue]||paymentStatusValue}\n`;
        }
        body += `\nOrder Items:\n${(payload.items||[]).map(i=>`${i.name} x${i.qty} — ${formatPHP(i.price*i.qty)}`).join("\n")}\n\nTotal: ${formatPHP(payload.total||0)}\n\nIf you have any questions, contact us:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nThank you for choosing DM EAST!`;
        sendCustomerStatusEmail({ order: updatedOrder, subject, bodyText: body });
      }
      
      onSaved && onSaved({ id: order.id, ...order, ...payload });
      onClose();
    } catch(e) {
      console.error("Failed to save order:", e);
      setErrMsg("Failed to save: " + e.message);
    }
    setSaving(false);
  };
  
  const handleDelete = async () => {
    const confirmText = prompt(
      `⚠️ DELETE ORDER #${order.id.slice(-6).toUpperCase()}?\n\nThis cannot be undone. The order will be permanently removed.\n\nType DELETE to confirm:`
    );
    if (confirmText !== "DELETE") {
      if (confirmText !== null) alert("Order NOT deleted. You must type DELETE exactly.");
      return;
    }
    try {
      await deleteDoc(doc(db, "orders", order.id));
      onDeleted && onDeleted(order.id);
      onClose();
    } catch(e) {
      setErrMsg("Delete failed: " + e.message);
    }
  };
  
  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,fontFamily:ds.font.body,outline:"none",boxSizing:"border-box"};
  const lbl = {fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5};
  const tabBtn = (active) => ({padding:"10px 16px",border:"none",background:active?"#fff":"transparent",cursor:"pointer",fontSize:13,fontWeight:active?700:500,color:active?ds.color.red:ds.color.textBody,fontFamily:ds.font.body,borderBottom:active?`2px solid ${ds.color.red}`:"2px solid transparent",borderRadius:0});
  
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:920,width:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        
        {/* Header */}
        <div style={{padding:"18px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>Edit Order #{order.id.slice(-6).toUpperCase()}</div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginTop:4}}>
              {[
                {label:"📦 Placed",   val:editCreatedAt,   set:setEditCreatedAt},
                {label:"🚚 Shipped",  val:editShippedAt,   set:setEditShippedAt},
                {label:"✅ Delivered",val:editDeliveredAt, set:setEditDeliveredAt},
              ].map(({label,val,set})=>(
                <label key={label} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:ds.color.textMuted,fontFamily:ds.font.body}}>
                  <span style={{fontWeight:600,whiteSpace:"nowrap"}}>{label}:</span>
                  <input type="date" value={val} onChange={e=>set(e.target.value)}
                    style={{fontSize:11,border:`1px solid ${ds.color.border}`,borderRadius:6,padding:"2px 6px",fontFamily:ds.font.body,color:ds.color.textDark,background:"#fafafa"}}/>
                </label>
              ))}
              {order.lastEditedAt && <span style={{fontSize:11,color:ds.color.textLight}}>· Last edited: {formatDate(order.lastEditedAt)}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:24,color:ds.color.textMuted,padding:4}}>✕</button>
        </div>
        
        {/* Tabs */}
        <div style={{padding:"0 28px",background:ds.color.canvas,borderBottom:`1px solid ${ds.color.border}`,display:"flex",gap:0}}>
          <button onClick={()=>setTab("info")}    style={tabBtn(tab==="info")}>👤 Customer Info</button>
          <button onClick={()=>setTab("items")}   style={tabBtn(tab==="items")}>📦 Items & Charges</button>
          <button onClick={()=>setTab("details")} style={tabBtn(tab==="details")}>⚙️ Order Details</button>
        </div>
        
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"22px 28px"}}>
          
          {/* TAB: Customer Info */}
          {tab==="info" && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px 18px"}}>
                <div><label style={lbl}>Customer Name *</label><input value={name} onChange={e=>setName(e.target.value)} style={inp}/></div>
                <div><label style={lbl}>Phone *</label><input value={phone} onChange={e=>setPhone(e.target.value)} style={inp}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={lbl}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={lbl}>Delivery Address</label><textarea value={address} onChange={e=>setAddress(e.target.value)} rows={2} style={{...inp,resize:"vertical"}}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={lbl}>Delivery Instructions</label><input value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Gate code, landmark, etc." style={inp}/></div>
              </div>
              
              {/* Recipient toggle */}
              <div style={{marginTop:18,padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`}}>
                <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13.5,fontWeight:600,color:ds.color.textDark,marginBottom:hasRecipient?12:0}}>
                  <input type="checkbox" checked={hasRecipient} onChange={e=>setHasRecipient(e.target.checked)} style={{accentColor:ds.color.red}}/>
                  📦 Order is for someone else (different recipient)
                </label>
                {hasRecipient && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px"}}>
                    <div><label style={lbl}>Recipient Name</label><input value={recipientName} onChange={e=>setRecipientName(e.target.value)} placeholder="Person receiving the order" style={inp}/></div>
                    <div><label style={lbl}>Recipient Phone</label><input value={recipientPhone} onChange={e=>setRecipientPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" style={inp}/></div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* TAB: Items & Charges */}
          {tab==="items" && (
            <div>
              <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="🔍 Search products to add…" style={{...inp,marginBottom:12}}/>
              {filteredProducts.length>0 && (
                <div style={{border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,marginBottom:14,maxHeight:180,overflowY:"auto"}}>
                  {filteredProducts.map(p=>(
                    <button key={p.id} onClick={()=>addProduct(p)} style={{display:"block",width:"100%",padding:"10px 14px",border:"none",borderBottom:`1px solid ${ds.color.borderLight}`,background:"#fff",cursor:"pointer",textAlign:"left",fontFamily:ds.font.body}}>
                      <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark}}>{p.name} {p.requiresPrescription&&<span style={{color:"#92400E",fontSize:11}}>💊</span>}</div>
                      <div style={{fontSize:11,color:ds.color.textMuted}}>{formatPHP(p.price||0)} · {p.tag}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Items table */}
              {items.length===0 ? (
                <div style={{padding:"40px",textAlign:"center",border:`2px dashed ${ds.color.border}`,borderRadius:ds.radius.lg,color:ds.color.textMuted,fontSize:13}}>
                  No items in this order. Add at least one product above.
                </div>
              ) : (
                <div style={{border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 110px 40px",gap:8,padding:"10px 14px",background:ds.color.canvas,fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                    <div>Product</div><div>Qty</div><div>Unit Price</div><div style={{textAlign:"right"}}>Total</div><div></div>
                  </div>
                  {items.map((item,idx)=>(
                    <div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 110px 40px",gap:8,padding:"10px 14px",borderTop:`1px solid ${ds.color.borderLight}`,alignItems:"center"}}>
                      <div style={{fontSize:13,color:ds.color.textDark}}>{item.name} {item.requiresPrescription&&<span style={{color:"#92400E",fontSize:10}}>💊</span>}</div>
                      <input type="number" min="1" value={item.qty} onChange={e=>updateItem(idx,"qty",e.target.value)} style={{...inp,padding:"6px 8px",fontSize:13}}/>
                      <input type="number" min="0" value={item.unitPrice} onChange={e=>updateItem(idx,"unitPrice",e.target.value)} style={{...inp,padding:"6px 8px",fontSize:13}}/>
                      <div style={{textAlign:"right",fontSize:13,fontWeight:700}}>{formatPHP(item.qty*item.unitPrice)}</div>
                      <button onClick={()=>removeItem(idx)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textLight}}>✕</button>
                    </div>
                  ))}
                  <div style={{padding:"10px 14px",background:ds.color.canvas,borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",fontSize:13}}>
                    <span>Items Subtotal</span>
                    <span style={{fontWeight:700}}>{formatPHP(itemsTotal)}</span>
                  </div>
                </div>
              )}
              
              {/* Other Charges */}
              <div style={{marginTop:14,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,padding:"12px 14px",background:ds.color.canvas}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:otherCharges.length>0?10:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:ds.color.textDark}}>💸 Other Charges <span style={{color:ds.color.textMuted,fontWeight:400,fontSize:11}}>(delivery, service fees, etc.)</span></div>
                  <button onClick={()=>setOtherCharges([...otherCharges,{description:"",amount:""}])} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.red}`,background:ds.color.redLight,cursor:"pointer",fontSize:11.5,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body}}>+ Add Charge</button>
                </div>
                {otherCharges.map((c,idx)=>(
                  <div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 120px 32px",gap:8,marginBottom:6,alignItems:"center"}}>
                    <input value={c.description} onChange={e=>{const arr=[...otherCharges];arr[idx].description=e.target.value;setOtherCharges(arr);}} placeholder="e.g. Delivery to Cavite" style={{...inp,padding:"7px 10px",fontSize:12.5}}/>
                    <input type="number" min="0" value={c.amount} onChange={e=>{const arr=[...otherCharges];arr[idx].amount=e.target.value;setOtherCharges(arr);}} placeholder="Amount" style={{...inp,padding:"7px 10px",fontSize:12.5}}/>
                    <button onClick={()=>setOtherCharges(otherCharges.filter((_,i)=>i!==idx))} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textLight}}>✕</button>
                  </div>
                ))}
                {otherCharges.length>0 && (
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:ds.color.textMuted,paddingTop:8,borderTop:`1px dashed ${ds.color.border}`,marginTop:6}}>
                    <span>Charges Subtotal</span>
                    <span style={{fontWeight:700}}>{formatPHP(chargesTotal)}</span>
                  </div>
                )}
              </div>
              
              {/* Grand Total */}
              <div style={{marginTop:14,padding:"14px 16px",background:ds.color.redLight,border:`2px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:14,fontWeight:700,color:ds.color.red}}>GRAND TOTAL</span>
                <span style={{fontSize:18,fontWeight:700,color:ds.color.red,fontFamily:ds.font.display}}>{formatPHP(total)}</span>
              </div>
            </div>
          )}
          
          {/* TAB: Order Details */}
          {tab==="details" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px 18px"}}>
              {/* v15.4: VAT Treatment Selector */}
              <div style={{gridColumn:"1/-1",padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`}}>
                <label style={{...lbl,marginBottom:8}}>💰 VAT Treatment</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {VAT_TREATMENT_OPTIONS.map(opt=>(
                    <button key={opt.id} type="button" onClick={()=>setVatTreatment(opt.id)} style={{
                      padding:"10px 14px",
                      borderRadius:ds.radius.md,
                      border:`2px solid ${vatTreatment===opt.id?opt.badgeColor:ds.color.border}`,
                      background:vatTreatment===opt.id?opt.badgeColor+"22":"#fff",
                      cursor:"pointer", flex:"1 1 200px", minWidth:0,
                      textAlign:"left", fontFamily:ds.font.body
                    }}>
                      <div style={{fontSize:12.5,fontWeight:700,color:vatTreatment===opt.id?opt.badgeColor:ds.color.textDark,marginBottom:3}}>
                        {opt.label}
                      </div>
                      <div style={{fontSize:10.5,color:ds.color.textMuted,lineHeight:1.35}}>
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
                {vatTreatment !== "vat_inclusive" && (
                  <div style={{marginTop:10,padding:"8px 12px",background:"#FEF3C7",borderRadius:ds.radius.sm,fontSize:11,color:"#92400E",lineHeight:1.4}}>
                    ⚠️ <strong>Reminder:</strong> {findVATTreatment(vatTreatment).label} status must be substantiated by proper documentation for BIR compliance.
                  </div>
                )}
              </div>
              
              <div>
                <label style={lbl}>Order Status</label>
                <select value={orderStatus} onChange={e=>setOrderStatus(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Payment Status</label>
                <select value={paymentStatusValue} onChange={e=>setPaymentStatusValue(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  <option value="awaiting">Awaiting Payment</option>
                  <option value="link_sent">💳 Maya Link Sent</option>
                  <option value="paid">✅ Paid via Maya</option>
                  <option value="submitted">Proof Submitted</option>
                  <option value="confirmed">Confirmed (Paid)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div>
                <label style={lbl}>Order Source</label>
                <select value={source} onChange={e=>setSource(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  {ORDER_SOURCES.map(s=><option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Payment Terms</label>
                <select value={paymentTerms} onChange={e=>setPaymentTerms(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  <option value="">— None set —</option>
                  {PAYMENT_TERMS_OPTIONS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              
              <div style={{gridColumn:"1/-1"}}>
                <label style={lbl}>Payment Method</label>
                <input value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} placeholder="GCash / Bank Transfer / Cash / etc." style={inp}/>
              </div>
              
              {paymentTerms === "custom" && (
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Custom Terms Description</label>
                  <input value={paymentTermsNotes} onChange={e=>setTermsNotes(e.target.value)} placeholder="e.g. 50% deposit, balance on delivery" style={inp}/>
                </div>
              )}
              
              <div style={{gridColumn:"1/-1"}}>
                <label style={lbl}>Internal Notes (admin only)</label>
                <textarea value={internalNotes} onChange={e=>setInternalNotes(e.target.value)} rows={2} placeholder="Notes about this specific order…" style={{...inp,resize:"vertical"}}/>
              </div>
              
              {showMarginFields && (<>
              <div style={{gridColumn:"1/-1",borderTop:`1px dashed ${ds.color.border}`,paddingTop:14,marginTop:4}}>
                <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Margin Tracking (Optional)</div>
              </div>
              <div>
                <label style={lbl}>Supplier Cost</label>
                <input type="number" min="0" value={supplierCost} onChange={e=>setSupplierCost(e.target.value)} placeholder="e.g. 35000" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Supplier Name</label>
                <input value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="e.g. MedSupply Inc" style={inp}/>
              </div>
              {margin !== null && supplierCost && (
                <div style={{gridColumn:"1/-1",background:margin>=0?ds.color.successBg:ds.color.redLight,border:`1px solid ${margin>=0?ds.color.successBorder:ds.color.redBorder}`,padding:"10px 14px",borderRadius:ds.radius.md,fontSize:12.5,color:margin>=0?ds.color.success:ds.color.red}}>
                  💰 Margin: <strong>{formatPHP(margin)}</strong> ({total>0?((margin/total)*100).toFixed(1):0}% of revenue)
                </div>
              )}
              </>)}
              
              {/* ── v16.16: MAYA PAYMENT LINK ─────────────────────────────── */}
              <MayaPaymentPanel order={{...order, email, name, total}} onPaymentLinkSent={(invoiceUrl)=>{
                setPaymentStatusValue("link_sent");
              }}/>
              
            </div>
          )}
          
          {errMsg && <div style={{marginTop:14,padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
        </div>
        
        {/* Footer */}
        <div style={{padding:"14px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {canDelete && <button onClick={handleDelete} style={{padding:"7px 14px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.red}`,background:"#fff",color:ds.color.red,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:ds.font.body}}>🗑️ Delete Order</button>}
            {onGeneratePDF && <button onClick={()=>onGeneratePDF({id:order.id,...order,name,email,phone,address,instructions,items:items.map(i=>({id:i.productId,name:i.name,price:i.unitPrice,qty:i.qty,requiresPrescription:!!i.requiresPrescription})),otherCharges:otherCharges.filter(c=>c.description&&c.amount),total,paymentMethod,paymentTerms,source})} style={{padding:"7px 14px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.red}`,background:ds.color.redLight,color:ds.color.red,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:ds.font.body}}>📄 Generate Document</button>}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:13,color:ds.color.textMuted,marginRight:8}}>
              Total: <strong style={{color:ds.color.red,fontSize:14}}>{formatPHP(total)}</strong>
            </span>
            <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
            {canEdit ? (
              <Btn variant="primary" size="md" disabled={saving} onClick={handleSave}>{saving?"Saving…":"💾 Save Changes"}</Btn>
            ) : (
              <Btn variant="outline" size="md" disabled={true}>🔒 Read-Only</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

