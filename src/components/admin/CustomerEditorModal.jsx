import { useState } from "react";
import { doc, setDoc, addDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { CUSTOMER_TAGS, PAYMENT_TERMS_OPTIONS, findTag, findTerms } from "../../constants/order";
import { Btn, Spinner } from "../ui";

export function CustomerEditorModal({ customer, onClose, onSaved }){
  const [data, setData] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    savedAddress: customer?.savedAddress || "",
    customerType: customer?.customerType || "individual",
    tags: customer?.tags || [],
    internalNotes: customer?.internalNotes || "",
  });
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  
  const handleSave = async () => {
    if (!data.name || !data.phone) { setErrMsg("Name and phone are required."); return; }
    setSaving(true); setErrMsg("");
    try {
      if (customer?.id) {
        await updateDoc(doc(db,"customers",customer.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db,"customers"), {
          ...data,
          source: "manual",
          totalOrders: 0, totalSpent: 0, points: 0,
          createdAt: serverTimestamp(),
        });
      }
      onSaved && onSaved();
      onClose();
    } catch(e) {
      setErrMsg("Failed to save: "+e.message);
    }
    setSaving(false);
  };
  
  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,fontFamily:ds.font.body,outline:"none",boxSizing:"border-box"};
  const lbl = {fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5};
  
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:600,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        <div style={{padding:"20px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>{customer?.id?"Edit Customer":"+ New Customer"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:ds.color.textMuted}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px 18px"}}>
          <div><label style={lbl}>Name *</label><input value={data.name} onChange={e=>setData({...data,name:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>Phone *</label><input value={data.phone} onChange={e=>setData({...data,phone:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>Email</label><input value={data.email} onChange={e=>setData({...data,email:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>Customer Type</label>
            <select value={data.customerType} onChange={e=>setData({...data,customerType:e.target.value})} style={{...inp,cursor:"pointer"}}>
              <option value="individual">Individual</option>
              <option value="institution">Institution</option>
              <option value="walkin">Walk-in</option>
            </select>
          </div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Address</label><textarea value={data.savedAddress} onChange={e=>setData({...data,savedAddress:e.target.value})} rows={2} style={{...inp,resize:"vertical"}}/></div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Tags</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {CUSTOMER_TAGS.map(tag=>{
                const active = data.tags.includes(tag.id);
                return(
                  <button key={tag.id} type="button" onClick={()=>{
                    const newTags = active ? data.tags.filter(t=>t!==tag.id) : [...data.tags, tag.id];
                    setData({...data,tags:newTags});
                  }} style={{padding:"4px 10px",borderRadius:ds.radius.pill,border:`1px solid ${active?tag.color:ds.color.border}`,background:active?tag.color:"#fff",color:active?"#fff":ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{tag.label}</button>
                );
              })}
            </div>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Internal Notes (admin only)</label>
            <textarea value={data.internalNotes} onChange={e=>setData({...data,internalNotes:e.target.value})} rows={3} placeholder="Special instructions, preferences, history…" style={{...inp,resize:"vertical"}}/>
          </div>
          {errMsg&&<div style={{gridColumn:"1/-1",padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>{errMsg}</div>}
        </div>
        <div style={{padding:"16px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"flex-end",gap:8}}>
          <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" size="md" disabled={saving} onClick={handleSave}>{saving?"Saving…":"💾 Save"}</Btn>
        </div>
      </div>
    </div>
  );
}

