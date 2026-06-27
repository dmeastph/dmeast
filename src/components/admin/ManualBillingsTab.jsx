import { useState } from "react";
import { ds } from "../../constants/design";
import { formatPHP, formatDate } from "../../utils/format";
import { MANUAL_BILLING_STATUS } from "../../constants/billing";
import { Btn, Tag } from "../ui";

export function ManualBillingsTab({ billings, onEdit, onNew }){
  const [filter, setFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  
  const filtered = billings.filter(b => {
    if (filter !== "all" && b.status !== filter) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      return (b.billTo||"").toLowerCase().includes(q) ||
             (b.description||"").toLowerCase().includes(q);
    }
    return true;
  }).sort((a,b)=>{
    const aD = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
    const bD = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
    return bD - aD;
  });

  const totalBilled = filtered.reduce((s,b) => s + (Number(b.amount)||0), 0);
  const totalPaid = filtered.filter(b=>b.status==="paid").reduce((s,b) => s + (Number(b.amount)||0), 0);
  const totalOutstanding = filtered.filter(b=>b.status==="sent" || b.status==="draft").reduce((s,b) => s + (Number(b.amount)||0), 0);

  const exportCSV = () => {
    const headers = ["Date","Bill To","Description","Amount","Status","Contact","Notes"];
    const rows = filtered.map(b => [
      formatDate(b.date),
      (b.billTo||"").replace(/,/g," "),
      (b.description||"").replace(/,/g," "),
      b.amount||0,
      b.status||"",
      (b.contactInfo||"").replace(/,/g," "),
      (b.notes||"").replace(/,/g," "),
    ]);
    const csv = [headers, ...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "manual-billings-"+new Date().toISOString().slice(0,10)+".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>📝 Manual Billings ({filtered.length})</div>
          <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:3}}>Off-system invoices for special clients (verbal agreements, services, etc)</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="primary" size="sm" onClick={onNew}>+ New Billing</Btn>
          <Btn variant="outline" size="sm" onClick={exportCSV}>⬇️ CSV</Btn>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid ${ds.color.red}`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Total Billed</div>
          <div style={{fontSize:18,fontWeight:700,color:ds.color.red,marginTop:4}}>{formatPHP(totalBilled)}</div>
        </div>
        <div style={{padding:"14px 16px",background:ds.color.successBg,borderRadius:ds.radius.md,borderTop:`3px solid ${ds.color.success}`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Paid</div>
          <div style={{fontSize:18,fontWeight:700,color:ds.color.success,marginTop:4}}>{formatPHP(totalPaid)}</div>
        </div>
        <div style={{padding:"14px 16px",background:totalOutstanding>0?"#FEF3C7":ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid #F59E0B`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Outstanding</div>
          <div style={{fontSize:18,fontWeight:700,color:"#F59E0B",marginTop:4}}>{formatPHP(totalOutstanding)}</div>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Search billings…" style={{padding:"6px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",width:200}}/>
        <button onClick={()=>setFilter("all")} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${filter==="all"?ds.color.red:ds.color.border}`,background:filter==="all"?ds.color.redLight:"#fff",color:filter==="all"?ds.color.red:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>All</button>
        {MANUAL_BILLING_STATUS.map(s=>(
          <button key={s.id} onClick={()=>setFilter(s.id)} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${filter===s.id?s.color:ds.color.border}`,background:filter===s.id?s.bg:"#fff",color:filter===s.id?s.color:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{s.label}</button>
        ))}
      </div>

      {filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted,fontSize:14}}>
          {billings.length===0?"No manual billings yet. Click \"+ New Billing\" to add one.":"No billings match the current filter."}
        </div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:`2px solid ${ds.color.border}`}}>
              {["Date","Bill To","Description","Amount","Status","Contact",""].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontWeight:700,color:ds.color.textDark,fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(b=>{
                const status = MANUAL_BILLING_STATUS.find(s=>s.id===b.status) || MANUAL_BILLING_STATUS[0];
                return(
                  <tr key={b.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                    <td style={{padding:"10px 12px",color:ds.color.textBody,fontSize:12}}>{formatDate(b.date)}</td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:ds.color.textDark}}>{b.billTo||"—"}</td>
                    <td style={{padding:"10px 12px",color:ds.color.textMuted,fontSize:12,maxWidth:240}}>{b.description||"—"}</td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:ds.color.textDark}}>{formatPHP(b.amount||0)}</td>
                    <td style={{padding:"10px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:ds.radius.pill,background:status.bg,color:status.color,fontWeight:700,textTransform:"uppercase"}}>{status.label}</span></td>
                    <td style={{padding:"10px 12px",fontSize:12,color:ds.color.textMuted}}>{b.contactInfo||"—"}</td>
                    <td style={{padding:"10px 12px"}}><button onClick={()=>onEdit(b)} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.textBody,fontFamily:ds.font.body}}>✏️ Edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

