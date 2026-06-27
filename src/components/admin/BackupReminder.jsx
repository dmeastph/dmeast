import { useState, useEffect} from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { Btn, Spinner } from "../ui";

export async function performFullBackup(){
  try {
    const collections = ["orders","customers","products","rxUploads","expenses","manualBillings"];
    const backup = { exportedAt: new Date().toISOString(), exportedBy: "DMEAST Admin" };
    for (const col of collections) {
      const snap = await getDocs(collection(db, col));
      backup[col] = snap.docs.map(d => {
        const data = d.data();
        // Convert Firestore timestamps to ISO strings
        Object.keys(data).forEach(k => {
          if (data[k]?.toDate) data[k] = data[k].toDate().toISOString();
        });
        return { id: d.id, ...data };
      });
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dmeast-backup-"+new Date().toISOString().slice(0,10)+".json";
    a.click();
    URL.revokeObjectURL(url);
    // Mark backup completed
    localStorage.setItem("dmeast-last-backup", new Date().toISOString());
    return { ok: true, counts: collections.reduce((acc,c) => ({...acc,[c]:backup[c].length}), {}) };
  } catch(e) {
    console.error("Backup failed:", e);
    return { ok: false, error: e.message };
  }
}

export function BackupReminder(){
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState("");
  
  useEffect(()=>{
    const last = localStorage.getItem("dmeast-last-backup");
    if (!last) { setShow(true); return; }
    const days = (Date.now() - new Date(last).getTime()) / (1000*60*60*24);
    if (days >= 7) setShow(true);
  },[]);
  
  if (!show) return null;
  
  const last = localStorage.getItem("dmeast-last-backup");
  const lastStr = last ? new Date(last).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"}) : "Never";
  
  const handleBackup = async () => {
    setBusy(true); setMsg("");
    const r = await performFullBackup();
    setBusy(false);
    if (r.ok) {
      setMsg("✓ Backup downloaded! "+Object.entries(r.counts).map(([k,v])=>`${k}: ${v}`).join(" · "));
      setTimeout(()=>setShow(false), 3000);
    } else {
      setMsg("⚠ Backup failed: "+r.error);
    }
  };
  
  return (
    <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.lg,padding:"14px 18px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:ds.color.gold}}>📥 Time for your weekly backup</div>
        <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>Last backup: {lastStr}. Download a full data backup as JSON.</div>
        {msg&&<div style={{fontSize:12,color:msg.startsWith("⚠")?ds.color.red:ds.color.success,marginTop:4,fontWeight:600}}>{msg}</div>}
      </div>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>setShow(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:ds.color.textMuted,fontFamily:ds.font.body,padding:"6px 10px"}}>Dismiss</button>
        <Btn variant="gold" size="sm" disabled={busy} onClick={handleBackup}>{busy?"Backing up…":"📥 Download Backup"}</Btn>
      </div>
    </div>
  );
}

