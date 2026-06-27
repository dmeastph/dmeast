import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { formatPHP } from "../../utils/format";
import { ORDER_SOURCES, PAYMENT_TERMS_OPTIONS, VAT_TREATMENT_OPTIONS, findVATTreatment, findTerms, findSource, CUSTOMER_TAGS, calculateDueDate, findTag } from "../../constants/order";
import { CONTACT } from "../../constants/contact";
import { orderStatusColor, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../../constants/status";
import { computeVATBreakdown } from "../../lib/pdf";
import { sendAdminNewOrderNotification, sendCustomerReceiptEmail, sendCustomerStatusEmail } from "../../lib/email-helpers";
import { Btn, Spinner, Tag } from "../ui";

export function NewOrderModal({ onClose, onSaved, customers: existingCustomers, products: existingProducts }){
  const [step, setStep] = useState(1); // 1=customer, 2=items, 3=details
  
  // Customer selection
  const [customerMode, setCustomerMode] = useState("existing"); // "existing" or "new"
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "", email: "", phone: "", address: "",
    customerType: "individual", tags: [], internalNotes: ""
  });
  
  // Items
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState([]); // [{productId, name, qty, unitPrice, total}]
  // v13.0b: Other Charges (delivery, service fees, etc)
  const [otherCharges, setOtherCharges] = useState([]); // [{description, amount}]
  // v15.4: VAT treatment for this order
  const [vatTreatment, setVatTreatment] = useState("vat_inclusive");
  
  // Order details
  const [source, setSource]               = useState("phone");
  const [paymentTerms, setPaymentTerms]   = useState("cod");
  const [paymentTermsNotes, setTermsNotes]= useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [supplierCost, setSupplierCost]   = useState(""); // optional margin tracking
  const [supplierName, setSupplierName]   = useState("");
  
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  
  const filteredCustomers = customerSearch.trim()
    ? existingCustomers.filter(c => {
        const q = customerSearch.toLowerCase();
        return (c.name||"").toLowerCase().includes(q) ||
               (c.email||"").toLowerCase().includes(q) ||
               (c.phone||"").toLowerCase().includes(q);
      }).slice(0, 8)
    : existingCustomers.slice(0, 8);

  const filteredProducts = productSearch.trim()
    ? existingProducts.filter(p => {
        const q = productSearch.toLowerCase();
        return (p.name||"").toLowerCase().includes(q) ||
               (p.tag||"").toLowerCase().includes(q);
      }).slice(0, 6)
    : [];
  
  const itemsTotal = items.reduce((s, i) => s + (i.qty * i.unitPrice), 0);
  const chargesTotal = otherCharges.reduce((s, c) => s + (Number(c.amount)||0), 0);
  const total = itemsTotal + chargesTotal;
  const margin = supplierCost ? total - Number(supplierCost) : null;
  
  const customerValid = selectedCustomer || (newCustomer.name && newCustomer.phone);
  const itemsValid    = items.length > 0;
  const canSave       = customerValid && itemsValid && source && paymentTerms;
  
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
    const newItems = [...items];
    if (field === "qty") newItems[idx].qty = Math.max(1, Number(value) || 1);
    else if (field === "unitPrice") newItems[idx].unitPrice = Math.max(0, Number(value) || 0);
    setItems(newItems);
  };
  
  const removeItem = (idx) => setItems(items.filter((_,i) => i !== idx));
  
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true); setErrMsg("");
    try {
      // Step 1: Create or get customer
      let customerId, customerData;
      if (selectedCustomer) {
        customerId = selectedCustomer.id;
        customerData = selectedCustomer;
      } else {
        // Create new offline customer (no auth, no uid)
        const ref = await addDoc(collection(db, "customers"), {
          name: newCustomer.name,
          email: newCustomer.email || null,
          phone: newCustomer.phone,
          savedAddress: newCustomer.address || null,
          customerType: newCustomer.customerType,
          tags: newCustomer.tags,
          internalNotes: newCustomer.internalNotes || null,
          source: "manual", // admin-created (vs "registered")
          totalOrders: 0,
          totalSpent: 0,
          points: 0,
          createdAt: serverTimestamp(),
        });
        customerId = ref.id;
        customerData = { id: customerId, ...newCustomer };
      }
      
      // Step 2: Create order
      const orderDate = serverTimestamp();
      const dueDate = calculateDueDate(new Date(), paymentTerms);
      const orderData = {
        // Customer info (denormalized for fast display)
        name: customerData.name || newCustomer.name,
        email: customerData.email || newCustomer.email || null,
        phone: customerData.phone || newCustomer.phone,
        address: customerData.savedAddress || newCustomer.address || null,
        uid: customerData.uid || null,
        customerId: customerId,
        // Order
        items: items.map(i => ({
          id: i.productId, name: i.name,
          price: i.unitPrice, qty: i.qty,
          requiresPrescription: !!i.requiresPrescription,
        })),
        // v13.0b: Other charges (delivery, service fees, etc)
        otherCharges: otherCharges.filter(c => c.description && c.amount),
        // v15.4: VAT treatment
        vatTreatment: vatTreatment,
        total,
        // v13.0a fields
        source: source, // phone/messenger/whatsapp/walkin/email/website
        paymentMethod: findTerms(paymentTerms)?.label || paymentTerms,
        paymentTerms: paymentTerms,
        paymentTermsNotes: paymentTermsNotes || null,
        internalNotes: internalNotes || null,
        createdByAdmin: true,
        dueDate: dueDate,
        // Margin tracking (optional)
        supplierCost: supplierCost ? Number(supplierCost) : null,
        supplierName: supplierName || null,
        margin: margin,
        // Status
        status: "confirmed", // admin-created orders skip "pending" status
        paymentStatus: paymentTerms.startsWith("credit_") ? "awaiting" : "awaiting",
        createdAt: orderDate,
      };
      const orderRef = await addDoc(collection(db, "orders"), orderData);
      
      // Step 3: Update customer stats
      try {
        await updateDoc(doc(db, "customers", customerId), {
          totalOrders: (customerData.totalOrders || 0) + 1,
          totalSpent: (customerData.totalSpent || 0) + total,
        });
      } catch(_){}
      
      // v13.0d: Send email notifications for admin-created orders
      const fullOrder = { id: orderRef.id, ...orderData };
      // Notify admin
      sendAdminNewOrderNotification(fullOrder);
      // Notify customer if they have an email
      if (fullOrder.email) {
        const sourceLabel = findSource(fullOrder.source)?.label || "Direct";
        const termsLabel  = findTerms(fullOrder.paymentTerms)?.label || fullOrder.paymentMethod || "—";
        sendCustomerStatusEmail({
          order: fullOrder,
          subject: `ORDER #${orderRef.id.slice(-6).toUpperCase()} — Order Received`,
          bodyText: `Dear ${fullOrder.name || "Customer"},\n\nThank you! We have received your order via ${sourceLabel}.\n\nOrder Reference: #${orderRef.id.slice(-6).toUpperCase()}\n\nOrder Items:\n${(fullOrder.items||[]).map(i=>`${i.name} x${i.qty} — ${formatPHP(i.price*i.qty)}`).join("\n")}\n\nTotal: ${formatPHP(fullOrder.total||0)}\nPayment Terms: ${termsLabel}\n\nOur team will be in touch shortly with delivery details and payment instructions if applicable.\n\nIf you have any questions, contact us:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nThank you for choosing DM EAST!`
        });
        // Also send a receipt
        sendCustomerReceiptEmail(fullOrder);
      }
      
      onSaved && onSaved({ id: orderRef.id, ...orderData });
      onClose();
    } catch(e) {
      console.error("Failed to save order:", e);
      setErrMsg("Failed to save order: " + e.message);
    }
    setSaving(false);
  };
  
  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,fontFamily:ds.font.body,outline:"none",boxSizing:"border-box"};
  const lbl = {fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5};
  
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:880,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        
        {/* Header */}
        <div style={{padding:"20px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>+ New Internal Order</div>
            <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>Manually create an order for phone/Messenger/walk-in customers</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:24,color:ds.color.textMuted,padding:4}}>✕</button>
        </div>
        
        {/* Step indicator */}
        <div style={{padding:"12px 28px",background:ds.color.canvas,display:"flex",gap:0,alignItems:"center"}}>
          {[[1,"Customer"],[2,"Items"],[3,"Details"]].map(([n,label],i)=>(
            <div key={n} style={{display:"flex",alignItems:"center",flex:i<2?1:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:step>=n?ds.color.red:ds.color.border,color:step>=n?"#fff":ds.color.textMuted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{step>n?"✓":n}</div>
                <span style={{fontSize:12,fontWeight:500,color:step===n?ds.color.textDark:ds.color.textMuted}}>{label}</span>
              </div>
              {i<2&&<div style={{flex:1,height:2,background:step>n?ds.color.success:ds.color.borderLight,margin:"0 12px"}}/>}
            </div>
          ))}
        </div>
        
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
          
          {/* STEP 1: CUSTOMER */}
          {step===1&&(
            <div>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <button onClick={()=>setCustomerMode("existing")} style={{flex:1,padding:"10px",borderRadius:ds.radius.md,border:`1.5px solid ${customerMode==="existing"?ds.color.red:ds.color.border}`,background:customerMode==="existing"?ds.color.redLight:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:customerMode==="existing"?ds.color.red:ds.color.textBody,fontFamily:ds.font.body}}>
                  🔍 Existing Customer
                </button>
                <button onClick={()=>setCustomerMode("new")} style={{flex:1,padding:"10px",borderRadius:ds.radius.md,border:`1.5px solid ${customerMode==="new"?ds.color.red:ds.color.border}`,background:customerMode==="new"?ds.color.redLight:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:customerMode==="new"?ds.color.red:ds.color.textBody,fontFamily:ds.font.body}}>
                  ➕ New Customer
                </button>
              </div>
              
              {customerMode==="existing"?(
                <div>
                  <input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="🔍 Search by name, email, or phone…" style={{...inp,marginBottom:12}}/>
                  <div style={{maxHeight:320,overflowY:"auto",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md}}>
                    {filteredCustomers.length===0?(
                      <div style={{padding:"24px",textAlign:"center",fontSize:13,color:ds.color.textMuted}}>No customers found. Try a different search or create new.</div>
                    ):filteredCustomers.map(c=>{
                      const active = selectedCustomer?.id===c.id;
                      return(
                        <button key={c.id} onClick={()=>setSelectedCustomer(c)} style={{display:"block",width:"100%",padding:"12px 16px",border:"none",borderBottom:`1px solid ${ds.color.borderLight}`,background:active?ds.color.redLight:"#fff",cursor:"pointer",textAlign:"left",fontFamily:ds.font.body}}>
                          <div style={{fontSize:13.5,fontWeight:600,color:ds.color.textDark}}>{c.name||"Unnamed"} {active&&<span style={{color:ds.color.red}}>✓ Selected</span>}</div>
                          <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>
                            {c.email||"No email"} · {c.phone||"No phone"}
                            {c.tags&&c.tags.length>0&&<span> · {c.tags.map(t=>findTag(t)?.label).filter(Boolean).join(", ")}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 16px"}}>
                  <div><label style={lbl}>Name *</label><input value={newCustomer.name} onChange={e=>setNewCustomer({...newCustomer,name:e.target.value})} placeholder="Customer name" style={inp}/></div>
                  <div><label style={lbl}>Phone *</label><input value={newCustomer.phone} onChange={e=>setNewCustomer({...newCustomer,phone:e.target.value})} placeholder="+63 9XX XXX XXXX" style={inp}/></div>
                  <div><label style={lbl}>Email</label><input value={newCustomer.email} onChange={e=>setNewCustomer({...newCustomer,email:e.target.value})} placeholder="email@example.com" style={inp}/></div>
                  <div><label style={lbl}>Customer Type</label>
                    <select value={newCustomer.customerType} onChange={e=>setNewCustomer({...newCustomer,customerType:e.target.value})} style={{...inp,cursor:"pointer"}}>
                      <option value="individual">Individual</option>
                      <option value="institution">Institution</option>
                      <option value="walkin">Walk-in</option>
                    </select>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={lbl}>Address</label>
                    <textarea value={newCustomer.address} onChange={e=>setNewCustomer({...newCustomer,address:e.target.value})} rows={2} placeholder="Delivery address" style={{...inp,resize:"vertical"}}/>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={lbl}>Tags (click to toggle)</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {CUSTOMER_TAGS.map(tag=>{
                        const active = newCustomer.tags.includes(tag.id);
                        return(
                          <button key={tag.id} type="button" onClick={()=>{
                            const newTags = active ? newCustomer.tags.filter(t=>t!==tag.id) : [...newCustomer.tags, tag.id];
                            setNewCustomer({...newCustomer,tags:newTags});
                          }} style={{padding:"4px 10px",borderRadius:ds.radius.pill,border:`1px solid ${active?tag.color:ds.color.border}`,background:active?tag.color:"#fff",color:active?"#fff":ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{tag.label}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={lbl}>Internal Notes (admin only)</label>
                    <textarea value={newCustomer.internalNotes} onChange={e=>setNewCustomer({...newCustomer,internalNotes:e.target.value})} rows={2} placeholder="e.g. 'Always pays late', 'Refers other clinics'" style={{...inp,resize:"vertical"}}/>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* STEP 2: ITEMS */}
          {step===2&&(
            <div>
              <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="🔍 Search products to add…" style={{...inp,marginBottom:12}}/>
              {filteredProducts.length>0&&(
                <div style={{border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,marginBottom:16,maxHeight:200,overflowY:"auto"}}>
                  {filteredProducts.map(p=>(
                    <button key={p.id} onClick={()=>addProduct(p)} style={{display:"block",width:"100%",padding:"10px 14px",border:"none",borderBottom:`1px solid ${ds.color.borderLight}`,background:"#fff",cursor:"pointer",textAlign:"left",fontFamily:ds.font.body}}>
                      <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark}}>{p.name} {p.requiresPrescription&&<span style={{color:"#92400E",fontSize:11}}>💊</span>}</div>
                      <div style={{fontSize:11,color:ds.color.textMuted}}>{formatPHP(p.price||0)} · {p.tag}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {items.length===0?(
                <div style={{padding:"40px",textAlign:"center",border:`2px dashed ${ds.color.border}`,borderRadius:ds.radius.lg,color:ds.color.textMuted,fontSize:13}}>
                  No items added yet. Search and click a product to add.
                </div>
              ):(
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
                  <div style={{padding:"12px 14px",background:ds.color.canvas,borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",fontSize:13,color:ds.color.textBody}}>
                    <span>Items Subtotal ({items.length} item{items.length!==1?"s":""})</span>
                    <span style={{fontWeight:700}}>{formatPHP(itemsTotal)}</span>
                  </div>
                </div>
              )}
              
              {/* v13.0b: Other Charges */}
              {items.length > 0 && (
                <div style={{marginTop:14,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,padding:"12px 14px",background:ds.color.canvas}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:otherCharges.length>0?10:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:ds.color.textDark}}>💸 Other Charges <span style={{color:ds.color.textMuted,fontWeight:400,fontSize:11}}>(optional — delivery, service fees, etc.)</span></div>
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
              )}
              
              {/* Grand Total */}
              {items.length > 0 && (
                <div style={{marginTop:14,padding:"14px 16px",background:ds.color.redLight,border:`2px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:14,fontWeight:700,color:ds.color.red}}>GRAND TOTAL</span>
                  <span style={{fontSize:18,fontWeight:700,color:ds.color.red,fontFamily:ds.font.display}}>{formatPHP(total)}</span>
                </div>
              )}
            </div>
          )}
          
          {/* STEP 3: DETAILS */}
          {step===3&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px"}}>
              {/* v15.4: VAT Treatment Selector — full width */}
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
                    ⚠️ <strong>Reminder:</strong> {findVATTreatment(vatTreatment).label} status must be substantiated by proper documentation (Senior/PWD ID, PEZA cert, export docs, etc.) for BIR compliance.
                  </div>
                )}
              </div>
              
              <div>
                <label style={lbl}>Order Source *</label>
                <select value={source} onChange={e=>setSource(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  {ORDER_SOURCES.map(s=><option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Payment Terms *</label>
                <select value={paymentTerms} onChange={e=>setPaymentTerms(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  {PAYMENT_TERMS_OPTIONS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              {paymentTerms==="custom"&&(
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Custom Terms Description</label>
                  <input value={paymentTermsNotes} onChange={e=>setTermsNotes(e.target.value)} placeholder="e.g. 50% deposit, balance on delivery" style={inp}/>
                </div>
              )}
              {paymentTerms.startsWith("credit_")&&(
                <div style={{gridColumn:"1/-1",background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,padding:"10px 14px",borderRadius:ds.radius.md,fontSize:12.5,color:ds.color.gold}}>
                  💳 Due Date: <strong>{calculateDueDate(new Date(),paymentTerms)?.toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}</strong> · This will appear in Receivables.
                </div>
              )}
              <div style={{gridColumn:"1/-1"}}>
                <label style={lbl}>Internal Notes (admin only)</label>
                <textarea value={internalNotes} onChange={e=>setInternalNotes(e.target.value)} rows={2} placeholder="e.g. 'Special handling required', 'Customer requested rush'" style={{...inp,resize:"vertical"}}/>
              </div>
              <div style={{gridColumn:"1/-1",borderTop:`1px dashed ${ds.color.border}`,paddingTop:16,marginTop:4}}>
                <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Margin Tracking (Optional)</div>
              </div>
              <div>
                <label style={lbl}>Supplier Cost (optional)</label>
                <input type="number" min="0" value={supplierCost} onChange={e=>setSupplierCost(e.target.value)} placeholder="e.g. 35000" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Supplier Name (optional)</label>
                <input value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="e.g. MedSupply Inc" style={inp}/>
              </div>
              {margin!==null&&supplierCost&&(
                <div style={{gridColumn:"1/-1",background:margin>=0?ds.color.successBg:ds.color.redLight,border:`1px solid ${margin>=0?ds.color.successBorder:ds.color.redBorder}`,padding:"10px 14px",borderRadius:ds.radius.md,fontSize:12.5,color:margin>=0?ds.color.success:ds.color.red}}>
                  💰 Margin: <strong>{formatPHP(margin)}</strong> ({total>0?((margin/total)*100).toFixed(1):0}% of revenue)
                </div>
              )}
            </div>
          )}
          
          {errMsg&&<div style={{marginTop:16,padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
        </div>
        
        {/* Footer */}
        <div style={{padding:"16px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:13,color:ds.color.textMuted}}>
            {step===1&&!customerValid&&"Select or create a customer to continue"}
            {step===2&&!itemsValid&&"Add at least one item"}
            {step===3&&canSave&&<span style={{color:ds.color.success,fontWeight:600}}>✓ Ready to save</span>}
            {step===3&&items.length>0&&<span style={{marginLeft:12,fontWeight:700,color:ds.color.textDark}}>Total: {formatPHP(total)}</span>}
          </div>
          <div style={{display:"flex",gap:8}}>
            {step>1&&<Btn variant="outline" size="md" onClick={()=>setStep(s=>s-1)}>← Back</Btn>}
            {step<3?(
              <Btn variant="primary" size="md" disabled={(step===1&&!customerValid)||(step===2&&!itemsValid)} onClick={()=>setStep(s=>s+1)}>Next →</Btn>
            ):(
              <Btn variant="primary" size="md" disabled={!canSave||saving} onClick={handleSave}>{saving?"Saving…":"💾 Save Order"}</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

