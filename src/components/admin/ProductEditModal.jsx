import { useState, useRef } from "react";
import { doc, updateDoc, addDoc, collection, deleteDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { CATEGORIES } from "../../constants/categories";
import { Btn, Spinner, ProductImg } from "../ui";

export function ProductEditModal({ product, onSave, onClose }){
  const [form, setForm] = useState({
    id: product.id||"", name: product.name||"", desc: product.desc||"",
    price: product.price ?? "", cta: product.cta||"buy",
    category: product.category||"pharma", imageSrc: product.imageSrc||"",
    featured: !!product.featured, requiresPrescription: !!product.requiresPrescription,
    rxCategory: product.rxCategory||"", tag: product.tag||"",
    visible: product.visible!==false,
    available: product.available||"available",
    stock_qty: product.stock_qty ?? "",
    _docId: product._docId,
  });
  const [imageMode, setImageMode] = useState("url");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const isNew = product._new;

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true); setUploadErr("");
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `products/${form.id||"new-"+Date.now()}-${Date.now()}.${ext}`;
      const ref = storageRef(storage, filename);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      set("imageSrc")(url);
    } catch (e) {
      setUploadErr("Upload failed: " + e.message);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert("Name is required."); return; }
    if (!form.id.trim() && isNew) { alert("Product ID is required (e.g. 'pm-07' or 'custom-001')."); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inp = { width:"100%", padding:"10px 12px", border:`1.5px solid ${ds.color.border}`, borderRadius:ds.radius.md, fontSize:14, outline:"none", fontFamily:ds.font.body, color:ds.color.textDark, boxSizing:"border-box", background:"#fff" };
  const lbl = { fontSize:12, fontWeight:600, color:ds.color.textDark, display:"block", marginBottom:5 };

  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(26,20,16,0.55)",padding:20,overflowY:"auto"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"32px 36px",maxWidth:640,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:ds.shadow.lg,animation:"modalIn .25s ease"}} onClick={e=>e.stopPropagation()}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark}}>{isNew?"Add New Product":"Edit Product"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:ds.color.textMuted,cursor:"pointer",lineHeight:1}}>✕</button>
        </div>

        <div style={{marginBottom:14}}>
          <label style={lbl}>Product ID *</label>
          <input value={form.id} onChange={e=>set("id")(e.target.value)} disabled={!isNew} placeholder="e.g. pm-07, custom-001" style={{...inp,...(isNew?{}:{background:ds.color.canvas,color:ds.color.textMuted})}}/>
          <div style={{fontSize:11,color:ds.color.textLight,marginTop:3}}>Lowercase, no spaces. {isNew?"Cannot be changed after creation.":"Cannot be edited."}</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
          <div>
            <label style={lbl}>Product Name *</label>
            <input value={form.name} onChange={e=>set("name")(e.target.value)} placeholder="e.g. Paracetamol 500mg" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Category *</label>
            <select value={form.category} onChange={e=>set("category")(e.target.value)} style={{...inp,cursor:"pointer"}}>
              {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={lbl}>Description</label>
          <textarea value={form.desc} onChange={e=>set("desc")(e.target.value)} rows={3} placeholder="Short product description shown on the card" style={{...inp,resize:"vertical",lineHeight:1.55}}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div>
            <label style={lbl}>Price (PHP)</label>
            <input type="number" value={form.price} onChange={e=>set("price")(e.target.value)} placeholder="Leave blank for Quote/Sales" style={inp}/>
            <div style={{fontSize:11,color:ds.color.textLight,marginTop:3}}>Leave empty for non-priced items.</div>
          </div>
          <div>
            <label style={lbl}>CTA Button *</label>
            <select value={form.cta} onChange={e=>set("cta")(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="buy">Buy Now (add to cart)</option>
              <option value="quote">Request Quote</option>
              <option value="sales">Talk to Sales</option>
            </select>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={lbl}>Product Image</label>
          <div style={{display:"flex",gap:0,marginBottom:10,background:ds.color.canvas,borderRadius:ds.radius.md,padding:3,border:`1px solid ${ds.color.border}`}}>
            <button type="button" onClick={()=>setImageMode("url")} style={{flex:1,padding:"7px",background:imageMode==="url"?"#fff":"transparent",border:"none",borderRadius:ds.radius.sm,fontSize:12.5,fontWeight:600,color:imageMode==="url"?ds.color.red:ds.color.textMuted,cursor:"pointer",fontFamily:ds.font.body}}>🔗 Paste URL</button>
            <button type="button" onClick={()=>setImageMode("upload")} style={{flex:1,padding:"7px",background:imageMode==="upload"?"#fff":"transparent",border:"none",borderRadius:ds.radius.sm,fontSize:12.5,fontWeight:600,color:imageMode==="upload"?ds.color.red:ds.color.textMuted,cursor:"pointer",fontFamily:ds.font.body}}>📤 Upload File</button>
          </div>
          {imageMode==="url" && (
            <input value={form.imageSrc||""} onChange={e=>set("imageSrc")(e.target.value)} placeholder="https://example.com/image.png or /images/myproduct.png" style={inp}/>
          )}
          {imageMode==="upload" && (
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={e=>handleFileUpload(e.target.files[0])} style={{display:"none"}}/>
              <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={uploading} style={{width:"100%",padding:"24px",border:`2px dashed ${ds.color.border}`,borderRadius:ds.radius.lg,background:ds.color.canvas,cursor:uploading?"wait":"pointer",fontFamily:ds.font.body}}>
                <div style={{fontSize:24,marginBottom:6}}>{uploading?"⏳":"📤"}</div>
                <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark}}>{uploading?"Uploading…":"Click to choose image"}</div>
                <div style={{fontSize:11,color:ds.color.textLight,marginTop:4}}>JPG, PNG, WebP · Max ~5MB</div>
              </button>
              {uploadErr && <div style={{marginTop:8,padding:"8px 12px",background:ds.color.redLight,borderRadius:ds.radius.sm,fontSize:12,color:ds.color.red}}>{uploadErr}</div>}
            </div>
          )}
          {form.imageSrc && (
            <div style={{marginTop:10,padding:"10px 12px",background:ds.color.canvas,borderRadius:ds.radius.md,display:"flex",alignItems:"center",gap:10}}>
              <img src={form.imageSrc} alt="" style={{width:48,height:48,objectFit:"contain",borderRadius:4,background:"#fff",flexShrink:0}}/>
              <div style={{flex:1,minWidth:0,fontSize:11,color:ds.color.textMuted,wordBreak:"break-all"}}>{form.imageSrc}</div>
              <button type="button" onClick={()=>set("imageSrc")("")} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:ds.color.textMuted}}>✕</button>
            </div>
          )}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div>
            <label style={lbl}>Availability</label>
            <select value={form.available} onChange={e=>set("available")(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="available">✓ Available</option>
              <option value="on_request">⚠ On Request</option>
              <option value="out_of_stock">✗ Out of Stock</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6}}>Stock Qty (optional)</label>
            <input type="number" min="0" value={form.stock_qty} onChange={e=>set("stock_qty")(e.target.value)} placeholder="Leave blank = unlimited" style={{...inp,width:"50%"}}/>
            <div style={{fontSize:11,color:ds.color.textLight,marginTop:3}}>Shows low-stock badge in admin when ≤ 5.</div>
          </div>
          <div>
            <label style={lbl}>Visibility on Site</label>
            <select value={form.visible?"true":"false"} onChange={e=>set("visible")(e.target.value==="true")} style={{...inp,cursor:"pointer"}}>
              <option value="true">👁️ Visible</option>
              <option value="false">🙈 Hidden</option>
            </select>
          </div>
        </div>

        <div style={{background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,padding:"12px 16px",marginBottom:18,display:"flex",gap:24,flexWrap:"wrap"}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:ds.color.textBody}}>
            <input type="checkbox" checked={form.featured} onChange={e=>set("featured")(e.target.checked)} style={{width:16,height:16,accentColor:ds.color.red,cursor:"pointer"}}/>
            ⭐ Featured (show on homepage)
          </label>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:ds.color.textBody}}>
            <input type="checkbox" checked={form.requiresPrescription} onChange={e=>set("requiresPrescription")(e.target.checked)} style={{width:16,height:16,accentColor:ds.color.red,cursor:"pointer"}}/>
            💊 Requires Prescription (Rx)
          </label>
        </div>

        {form.requiresPrescription && (
          <div style={{marginBottom:18}}>
            <label style={lbl}>Rx Category (optional)</label>
            <input value={form.rxCategory||""} onChange={e=>set("rxCategory")(e.target.value)} placeholder="e.g. Antibiotic, Antihypertensive" style={inp}/>
          </div>
        )}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:16,borderTop:`1px solid ${ds.color.borderLight}`}}>
          <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" size="md" onClick={handleSave} disabled={saving||uploading}>
            {saving?"Saving…":(isNew?"Add Product":"Save Changes")}
          </Btn>
        </div>
      </div>
    </div>
  );
}

