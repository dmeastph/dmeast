import { useState, useRef} from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "../lib/firebase";
import { ds } from "../constants/design";
import { Btn, Spinner } from "./ui";

export function PaymentProofUpload({ orderId, existingUrl, onUploaded }){
  const [uploading, setUploading] = useState(false);
  const [err,       setErr]       = useState("");
  const [url,       setUrl]       = useState(existingUrl||"");
  const fileRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.size > 10*1024*1024) { setErr("File too large. Max 10MB."); return; }
    setUploading(true); setErr("");
    try {
      const ext = file.name.split(".").pop()||"jpg";
      const path = "payment-proofs/"+orderId+"/proof-"+Date.now()+"."+ext;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      const downloadUrl = await getDownloadURL(ref);
      // V11: Save URL + update paymentStatus to "submitted" so admin sees it for review
      await updateDoc(doc(db,"orders",orderId), {
        paymentProofUrl: downloadUrl,
        paymentProofAt: serverTimestamp(),
        paymentStatus: "submitted",
      });
      setUrl(downloadUrl);
      if (onUploaded) onUploaded(downloadUrl);
    } catch(e){
      setErr("Upload failed: "+e.message);
    }
    setUploading(false);
  };

  if (url) return(
    <div style={{background:ds.color.successBg,border:"1px solid "+ds.color.successBorder,borderRadius:ds.radius.md,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <span style={{fontSize:16}}>✅</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:ds.color.success}}>Payment proof uploaded</div>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:ds.color.success,textDecoration:"underline"}}>View uploaded file →</a>
      </div>
      <button onClick={()=>{setUrl("");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:ds.color.textMuted}}>Upload new</button>
    </div>
  );

  return(
    <div style={{border:"2px dashed "+ds.color.border,borderRadius:ds.radius.lg,padding:"20px",textAlign:"center",background:ds.color.canvas}}>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={e=>handleUpload(e.target.files[0])} style={{display:"none"}}/>
      <div style={{fontSize:28,marginBottom:8}}>📎</div>
      <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark,marginBottom:4}}>Upload Payment Proof</div>
      <div style={{fontSize:12,color:ds.color.textMuted,marginBottom:12}}>GCash screenshot, bank transfer receipt, or payment confirmation</div>
      <button onClick={()=>fileRef.current?.click()} disabled={uploading}
        style={{padding:"10px 24px",borderRadius:ds.radius.md,border:"2px solid "+ds.color.red,background:ds.color.redLight,cursor:uploading?"wait":"pointer",fontSize:13,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body}}>
        {uploading?"⏳ Uploading…":"📤 Choose File"}
      </button>
      <div style={{fontSize:11,color:ds.color.textLight,marginTop:8}}>JPG, PNG, PDF · Max 10MB</div>
      {err&&<div style={{marginTop:8,fontSize:12,color:ds.color.red}}>{err}</div>}
    </div>
  );
}

