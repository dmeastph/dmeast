import { useState } from "react";
import { doc, addDoc, collection, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { formatPHP } from "../../utils/format";
import { MANUAL_BILLING_STATUS } from "../../constants/billing";
import { Btn, Spinner } from "../ui";

export function ManualBillingEditorModal({ billing, onClose, onSaved }){
  const [data, setData] = useState({
    date: billing?.date ? (billing.date.toDate ? billing.date.toDate().toISOString().slice(0,10) : new Date(billing.date).toISOString().slice(0,10)) : new Date().toISOString().slice(0,10),
    billTo: billing?.billTo || "",
    contactInfo: billing?.contactInfo || "",
    description: billing?.description || "",
    amount: billing?.amount || "",
    status: billing?.status || "draft",
    notes: billing?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleSave = async () => {
    if (!data.billTo || !data.amount || !data.description) {
      setErrMsg("Bill To, description, and amount are required.");
      return;
    }
    setSaving(true); setErrMsg("");
    try {
      const payload = {
        date: new Date(data.date),
        billTo: data.billTo,
        contactInfo: data.contactInfo || null,
        description: data.description,
        amount: Number(data.amount),
        status: data.status,
        notes: data.notes || null,
        paidAt: data.status === "paid" ? serverTimestamp() : (billing?.paidAt || null),
        updatedAt: serverTimestamp(),
      };

      if (billing?.id) {
        await updateDoc(doc(db, "manualBillings", billing.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "manualBillings"), payload);
      }
      onSaved && onSaved();
      onClose();
    } catch(e) {
      setErrMsg("Failed to save: " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!billing?.id) return;
    if (!confirm("Delete this manual billing? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "manualBillings", billing.id));
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
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:600,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        <div style={{padding:"20px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>{billing?.id?"Edit Manual Billing":"+ New Manual Billing"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:ds.color.textMuted}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px 18px"}}>
          <div><label style={lbl}>Date *</label><input type="date" value={data.date} onChange={e=>setData({...data,date:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>Status</label>
            <select value={data.status} onChange={e=>setData({...data,status:e.target.value})} style={{...inp,cursor:"pointer"}}>
              {MANUAL_BILLING_STATUS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Bill To *</label><input value={data.billTo} onChange={e=>setData({...data,billTo:e.target.value})} placeholder="Customer/client name" style={inp}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Contact Info</label><input value={data.contactInfo} onChange={e=>setData({...data,contactInfo:e.target.value})} placeholder="Phone or email" style={inp}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Description *</label><textarea value={data.description} onChange={e=>setData({...data,description:e.target.value})} rows={2} placeholder="What is being billed?" style={{...inp,resize:"vertical"}}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Amount *</label><input type="number" min="0" step="0.01" value={data.amount} onChange={e=>setData({...data,amount:e.target.value})} placeholder="e.g. 5000" style={inp}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Notes</label><textarea value={data.notes} onChange={e=>setData({...data,notes:e.target.value})} rows={2} placeholder="Optional notes…" style={{...inp,resize:"vertical"}}/></div>
          {errMsg && <div style={{gridColumn:"1/-1",padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
        </div>
        <div style={{padding:"16px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            {billing?.id && <button onClick={handleDelete} style={{background:"none",border:`1px solid ${ds.color.red}`,color:ds.color.red,padding:"6px 12px",borderRadius:ds.radius.sm,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:ds.font.body}}>🗑️ Delete</button>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" size="md" disabled={saving} onClick={handleSave}>{saving?"Saving…":"💾 Save"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

