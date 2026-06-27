import { useState } from "react";
import { doc, addDoc, collection, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db, storage } from "../../lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { ds } from "../../constants/design";
import { formatPHP } from "../../utils/format";
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_STATUS, findExpenseCategory } from "../../constants/expenses";
import { Btn, Spinner } from "../ui";

export function ExpenseEditorModal({ expense, orders, onClose, onSaved }){
  const [data, setData] = useState({
    date: expense?.date ? (expense.date.toDate ? expense.date.toDate().toISOString().slice(0,10) : new Date(expense.date).toISOString().slice(0,10)) : new Date().toISOString().slice(0,10),
    vendor: expense?.vendor || "",
    category: expense?.category || "cogs",
    amount: expense?.amount || "",
    description: expense?.description || "",
    linkedOrderId: expense?.linkedOrderId || "",
    paymentStatus: expense?.paymentStatus || "paid",
    paymentMethod: expense?.paymentMethod || "",
    notes: expense?.notes || "",
    receiptUrl: expense?.receiptUrl || null,
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(expense?.receiptUrl || null);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  
  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); return; }
    e.target.value = "";
    setReceiptFile(file);
    const r = new FileReader();
    r.onload = ev => setReceiptPreview(ev.target.result);
    r.readAsDataURL(file);
  };
  
  const filteredOrders = orderSearch.trim()
    ? orders.filter(o => {
        const q = orderSearch.toLowerCase();
        return o.id.toLowerCase().includes(q) || (o.name||"").toLowerCase().includes(q);
      }).slice(0, 5)
    : [];

  const linkedOrder = data.linkedOrderId ? orders.find(o => o.id === data.linkedOrderId) : null;

  const handleSave = async () => {
    if (!data.vendor || !data.amount || !data.category) { setErrMsg("Vendor, amount, and category are required."); return; }
    setSaving(true); setErrMsg("");
    try {
      let receiptUrl = data.receiptUrl;
      // Upload receipt file if new one selected
      if (receiptFile) {
        try {
          const ext = receiptFile.name.split(".").pop() || "jpg";
          const path = "expenses/" + Date.now() + "-" + Math.random().toString(36).slice(2,8) + "." + ext;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, receiptFile);
          receiptUrl = await getDownloadURL(fileRef);
        } catch(uploadErr) {
          console.warn("Receipt upload failed:", uploadErr);
          setErrMsg("Receipt upload failed but expense will be saved. " + uploadErr.message);
        }
      }

      const payload = {
        date: new Date(data.date),
        vendor: data.vendor,
        category: data.category,
        amount: Number(data.amount),
        description: data.description || null,
        linkedOrderId: data.linkedOrderId || null,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
        receiptUrl: receiptUrl,
        updatedAt: serverTimestamp(),
      };

      if (expense?.id) {
        await updateDoc(doc(db, "expenses", expense.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "expenses"), payload);
      }
      onSaved && onSaved();
      onClose();
    } catch(e) {
      setErrMsg("Failed to save: " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!expense?.id) return;
    if (!confirm("Delete this expense entry? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "expenses", expense.id));
      onSaved && onSaved();
      onClose();
    } catch(e) {
      setErrMsg("Delete failed: " + e.message);
    }
  };

  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,fontFamily:ds.font.body,outline:"none",boxSizing:"border-box"};
  const lbl = {fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:720,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        <div style={{padding:"20px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>{expense?.id?"Edit Expense":"+ New Expense"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:ds.color.textMuted}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px 18px"}}>
            <div><label style={lbl}>Date *</label><input type="date" value={data.date} onChange={e=>setData({...data,date:e.target.value})} style={inp}/></div>
            <div><label style={lbl}>Vendor / Supplier *</label><input value={data.vendor} onChange={e=>setData({...data,vendor:e.target.value})} placeholder="e.g. MedSupply Inc" style={inp}/></div>
            <div><label style={lbl}>Category *</label>
              <select value={data.category} onChange={e=>setData({...data,category:e.target.value})} style={{...inp,cursor:"pointer"}}>
                {EXPENSE_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Amount *</label><input type="number" min="0" step="0.01" value={data.amount} onChange={e=>setData({...data,amount:e.target.value})} placeholder="e.g. 35000" style={inp}/></div>
            <div style={{gridColumn:"1/-1"}}><label style={lbl}>Description</label><input value={data.description} onChange={e=>setData({...data,description:e.target.value})} placeholder="What was this expense for?" style={inp}/></div>
            <div><label style={lbl}>Payment Status</label>
              <select value={data.paymentStatus} onChange={e=>setData({...data,paymentStatus:e.target.value})} style={{...inp,cursor:"pointer"}}>
                {EXPENSE_PAYMENT_STATUS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Payment Method</label>
              <input value={data.paymentMethod} onChange={e=>setData({...data,paymentMethod:e.target.value})} placeholder="Cash / Bank / GCash / Check" style={inp}/>
            </div>
            
            {/* Link to order (for COGS) */}
            {data.category === "cogs" && (
              <div style={{gridColumn:"1/-1",background:ds.color.canvas,padding:"12px 14px",borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`}}>
                <label style={lbl}>🔗 Link to Order (for COGS / margin tracking)</label>
                {linkedOrder ? (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#fff",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`}}>
                    <div>
                      <span style={{fontSize:13,fontWeight:700}}>#{linkedOrder.id.slice(-6).toUpperCase()}</span>
                      <span style={{fontSize:12,color:ds.color.textMuted,marginLeft:10}}>{linkedOrder.name} · {formatPHP(linkedOrder.total||0)}</span>
                    </div>
                    <button onClick={()=>setData({...data,linkedOrderId:""})} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.red}}>✕ Unlink</button>
                  </div>
                ) : (
                  <>
                    <input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="🔍 Search order # or customer name…" style={{...inp,padding:"8px 12px",fontSize:13}}/>
                    {filteredOrders.length>0 && (
                      <div style={{marginTop:6,maxHeight:140,overflowY:"auto",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.sm,background:"#fff"}}>
                        {filteredOrders.map(o=>(
                          <button key={o.id} onClick={()=>{setData({...data,linkedOrderId:o.id});setOrderSearch("");}} style={{display:"block",width:"100%",padding:"8px 12px",border:"none",borderBottom:`1px solid ${ds.color.borderLight}`,background:"#fff",cursor:"pointer",textAlign:"left",fontFamily:ds.font.body}}>
                            <div style={{fontSize:12.5,fontWeight:600}}>#{o.id.slice(-6).toUpperCase()} · {o.name}</div>
                            <div style={{fontSize:11,color:ds.color.textMuted}}>{formatPHP(o.total||0)}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            {/* Receipt upload */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>📎 Receipt / Invoice Photo</label>
              <div style={{border:`2px dashed ${receiptPreview?ds.color.success:ds.color.border}`,borderRadius:ds.radius.md,padding:16,background:receiptPreview?ds.color.successBg:ds.color.canvas,textAlign:"center"}}>
                {receiptPreview ? (
                  <div>
                    {receiptPreview.startsWith("data:application/pdf")||receiptPreview.toLowerCase().endsWith(".pdf") ? (
                      <div style={{fontSize:32,marginBottom:8}}>📄</div>
                    ) : (
                      <img src={receiptPreview} alt="Receipt" style={{maxWidth:200,maxHeight:160,objectFit:"contain",borderRadius:ds.radius.sm,margin:"0 auto",display:"block"}}/>
                    )}
                    <div style={{fontSize:12,color:ds.color.success,marginTop:8,fontWeight:600}}>✓ Receipt attached</div>
                    <button onClick={()=>{setReceiptFile(null);setReceiptPreview(null);setData({...data,receiptUrl:null});}} style={{marginTop:6,background:"none",border:"none",color:ds.color.red,cursor:"pointer",fontSize:12,fontFamily:ds.font.body}}>Remove</button>
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:24,marginBottom:6}}>📎</div>
                    <label htmlFor="exp-receipt-input" style={{display:"inline-block",padding:"8px 16px",borderRadius:ds.radius.sm,border:`1.5px solid ${ds.color.red}`,background:ds.color.redLight,cursor:"pointer",fontSize:12,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body}}>📷 Upload Receipt</label>
                    <input id="exp-receipt-input" type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} style={{display:"none"}}/>
                    <div style={{fontSize:11,color:ds.color.textLight,marginTop:8}}>JPG, PNG, PDF · Max 10MB</div>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Notes</label>
              <textarea value={data.notes} onChange={e=>setData({...data,notes:e.target.value})} rows={2} placeholder="Optional notes…" style={{...inp,resize:"vertical"}}/>
            </div>
            
            {errMsg && <div style={{gridColumn:"1/-1",padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
          </div>
        </div>
        <div style={{padding:"16px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            {expense?.id && <button onClick={handleDelete} style={{background:"none",border:`1px solid ${ds.color.red}`,color:ds.color.red,padding:"6px 12px",borderRadius:ds.radius.sm,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:ds.font.body}}>🗑️ Delete</button>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" size="md" disabled={saving} onClick={handleSave}>{saving?"Saving…":"💾 Save Expense"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

