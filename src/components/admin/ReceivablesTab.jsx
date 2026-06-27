import { useState } from "react";
import { ds } from "../../constants/design";
import { formatPHP, formatDate } from "../../utils/format";
import { daysOverdue, getAgingBucket, AGING_BUCKETS, findTerms } from "../../constants/order";
import { Btn } from "../ui";

export function ReceivablesTab({ orders, onMarkPaid }){
  const [filter, setFilter] = useState("all"); // all/current/overdue
  const [searchQ, setSearchQ] = useState("");
  
  // Filter to credit-term orders that aren't fully paid
  const receivables = orders.filter(o => {
    const isCreditOrder = o.paymentTerms && o.paymentTerms.startsWith("credit_");
    const isCustomTerms = o.paymentTerms === "custom";
    const isUnpaid      = o.paymentStatus !== "confirmed" && o.status !== "cancelled";
    return (isCreditOrder || isCustomTerms) && isUnpaid;
  });
  
  // Add aging info
  const enriched = receivables.map(o => {
    const days = daysOverdue(o.dueDate);
    return { ...o, days, bucket: getAgingBucket(days) };
  });
  
  // Apply filters
  const filtered = enriched.filter(o => {
    if (filter === "current"  && o.days >  0) return false;
    if (filter === "overdue"  && o.days <= 0) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      return (o.name||"").toLowerCase().includes(q) ||
             (o.id||"").toLowerCase().includes(q);
    }
    return true;
  });
  
  // Sort: most overdue first
  filtered.sort((a,b) => b.days - a.days);
  
  const totalOutstanding = filtered.reduce((s,o) => s + (o.total||0), 0);
  const overdueCount     = enriched.filter(o => o.days > 0).length;
  const currentCount     = enriched.filter(o => o.days <= 0).length;
  
  // Aging buckets summary
  const agingSummary = AGING_BUCKETS.map(b => {
    const ordersInBucket = enriched.filter(o => o.days >= b.min && o.days <= b.max);
    const total = ordersInBucket.reduce((s,o) => s + (o.total||0), 0);
    return { ...b, count: ordersInBucket.length, total };
  });

  const exportReceivablesCSV = () => {
    const headers = ["Order #","Customer","Phone","Email","Amount","Due Date","Days Overdue","Status","Payment Terms"];
    const rows = filtered.map(o => [
      "#"+o.id.slice(-6).toUpperCase(),
      (o.name||"").replace(/,/g," "),
      o.phone||"",
      o.email||"",
      o.total||0,
      o.dueDate ? formatDate(o.dueDate) : "—",
      o.days,
      o.bucket.label,
      findTerms(o.paymentTerms)?.label || o.paymentTerms || "—",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "receivables-"+new Date().toISOString().slice(0,10)+".csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>💰 Receivables ({filtered.length})</div>
          <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:3}}>Outstanding balances from credit-term orders</div>
        </div>
        <Btn variant="outline" size="sm" onClick={exportReceivablesCSV}>⬇️ Export CSV</Btn>
      </div>
      
      {/* Aging summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:20}}>
        {agingSummary.map(b=>(
          <div key={b.label} style={{padding:"12px 14px",background:b.bg,border:`1px solid ${b.color}40`,borderRadius:ds.radius.md,textAlign:"center"}}>
            <div style={{fontSize:10,fontWeight:700,color:b.color,textTransform:"uppercase",letterSpacing:"0.06em"}}>{b.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:b.color,marginTop:4}}>{b.count}</div>
            <div style={{fontSize:11,color:b.color,marginTop:2}}>{formatPHP(b.total)}</div>
          </div>
        ))}
      </div>
      
      {/* Total + Filters */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:"12px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,marginBottom:16}}>
        <div>
          <span style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Total Outstanding</span>
          <span style={{fontSize:18,fontWeight:700,color:ds.color.red,marginLeft:10}}>{formatPHP(totalOutstanding)}</span>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {id:"all",     label:`All (${enriched.length})`},
            {id:"current", label:`Current (${currentCount})`},
            {id:"overdue", label:`Overdue (${overdueCount})`},
          ].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{padding:"5px 12px",borderRadius:ds.radius.pill,border:`1px solid ${filter===f.id?ds.color.red:ds.color.border}`,background:filter===f.id?ds.color.redLight:"#fff",color:filter===f.id?ds.color.red:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{f.label}</button>
          ))}
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Search…" style={{padding:"5px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",width:140}}/>
        </div>
      </div>
      
      {/* Receivables list */}
      {filtered.length===0?(
        <div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted,fontSize:14}}>
          {enriched.length===0?"🎉 No outstanding receivables. All credit orders are paid!":"No receivables match the current filter."}
        </div>
      ):filtered.map(o=>(
        <div key={o.id} style={{border:`1px solid ${o.bucket.color}40`,borderLeft:`4px solid ${o.bucket.color}`,borderRadius:ds.radius.md,padding:"14px 18px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,background:"#fff"}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13.5,fontWeight:700,color:ds.color.textDark}}>#{o.id.slice(-6).toUpperCase()}</span>
              <span style={{fontSize:13,color:ds.color.textBody}}>{o.name||"Unknown"}</span>
              <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:ds.radius.pill,background:o.bucket.bg,color:o.bucket.color,textTransform:"uppercase",letterSpacing:"0.04em"}}>
                {o.days<=0?o.bucket.label:`${o.days} days overdue`}
              </span>
            </div>
            <div style={{fontSize:11.5,color:ds.color.textMuted,marginTop:4}}>
              {o.phone||"—"} · {o.email||"—"} · Due: {o.dueDate?formatDate(o.dueDate):"—"} · Terms: {findTerms(o.paymentTerms)?.label||"—"}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:16,fontWeight:700,color:o.bucket.color}}>{formatPHP(o.total||0)}</div>
            <button onClick={()=>{
              if(!confirm("Mark this order as paid?")) return;
              onMarkPaid(o.id);
            }} style={{marginTop:6,padding:"5px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.success}`,background:ds.color.successBg,color:ds.color.success,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:ds.font.body}}>✓ Mark Paid</button>
          </div>
        </div>
      ))}
    </div>
  );
}

