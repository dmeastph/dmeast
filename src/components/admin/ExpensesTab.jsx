import { useState } from "react";
import { ds } from "../../constants/design";
import { formatPHP, formatDate } from "../../utils/format";
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_STATUS, findExpenseCategory } from "../../constants/expenses";
import { Btn, Tag } from "../ui";

export function ExpensesTab({ expenses, orders, onEdit, onNew, onRefresh }){
  const [filter, setFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [dateRange, setDateRange] = useState("month"); // month/year/all
  
  // Apply date filter
  const now = new Date();
  const filterByDate = (exp) => {
    if (dateRange === "all") return true;
    const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
    if (dateRange === "month") {
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    }
    if (dateRange === "year") {
      return expDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filtered = expenses.filter(e => {
    if (!filterByDate(e)) return false;
    if (filter !== "all" && e.category !== filter) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      return (e.vendor||"").toLowerCase().includes(q) ||
             (e.description||"").toLowerCase().includes(q);
    }
    return true;
  });
  
  // Sort: most recent first
  filtered.sort((a,b) => {
    const aD = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
    const bD = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
    return bD - aD;
  });

  const totalAmount = filtered.reduce((s,e) => s + (Number(e.amount)||0), 0);
  const cogsTotal = filtered.filter(e => e.category === "cogs").reduce((s,e) => s + (Number(e.amount)||0), 0);
  const opexTotal = filtered.filter(e => e.category !== "cogs").reduce((s,e) => s + (Number(e.amount)||0), 0);
  const unpaidTotal = filtered.filter(e => e.paymentStatus === "unpaid").reduce((s,e) => s + (Number(e.amount)||0), 0);

  // Category breakdown
  const byCategory = EXPENSE_CATEGORIES.map(cat => {
    const items = filtered.filter(e => e.category === cat.id);
    return { ...cat, count: items.length, total: items.reduce((s,e)=>s+(Number(e.amount)||0),0) };
  }).filter(c => c.count > 0).sort((a,b) => b.total - a.total);

  const exportCSV = () => {
    const headers = ["Date","Vendor","Category","Amount","Description","Linked Order","Status","Method","Notes"];
    const rows = filtered.map(e => {
      const cat = findExpenseCategory(e.category);
      const linkedOrder = e.linkedOrderId ? orders.find(o=>o.id===e.linkedOrderId) : null;
      return [
        formatDate(e.date),
        (e.vendor||"").replace(/,/g," "),
        cat.label,
        e.amount||0,
        (e.description||"").replace(/,/g," "),
        linkedOrder ? "#"+linkedOrder.id.slice(-6).toUpperCase() : "",
        e.paymentStatus||"",
        (e.paymentMethod||"").replace(/,/g," "),
        (e.notes||"").replace(/,/g," "),
      ];
    });
    const csv = [headers, ...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "expenses-"+new Date().toISOString().slice(0,10)+".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>🏢 Expenses ({filtered.length})</div>
          <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:3}}>Track DMEAST's costs — supplier bills, office, transport, utilities</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="primary" size="sm" onClick={onNew}>+ New Expense</Btn>
          <Btn variant="outline" size="sm" onClick={exportCSV}>⬇️ CSV</Btn>
        </div>
      </div>
      
      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid ${ds.color.red}`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Total Spent</div>
          <div style={{fontSize:18,fontWeight:700,color:ds.color.red,marginTop:4}}>{formatPHP(totalAmount)}</div>
        </div>
        <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid #EF4444`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>COGS</div>
          <div style={{fontSize:18,fontWeight:700,color:"#EF4444",marginTop:4}}>{formatPHP(cogsTotal)}</div>
        </div>
        <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid #3B82F6`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>OpEx</div>
          <div style={{fontSize:18,fontWeight:700,color:"#3B82F6",marginTop:4}}>{formatPHP(opexTotal)}</div>
        </div>
        <div style={{padding:"14px 16px",background:unpaidTotal>0?"#FEE2E2":ds.color.canvas,borderRadius:ds.radius.md,borderTop:`3px solid ${unpaidTotal>0?ds.color.red:"#10B981"}`}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Unpaid Bills</div>
          <div style={{fontSize:18,fontWeight:700,color:unpaidTotal>0?ds.color.red:"#10B981",marginTop:4}}>{formatPHP(unpaidTotal)}</div>
        </div>
      </div>
      
      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Search vendor/description…" style={{padding:"6px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",width:200}}/>
        <select value={dateRange} onChange={e=>setDateRange(e.target.value)} style={{padding:"6px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",cursor:"pointer"}}>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
        <button onClick={()=>setFilter("all")} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${filter==="all"?ds.color.red:ds.color.border}`,background:filter==="all"?ds.color.redLight:"#fff",color:filter==="all"?ds.color.red:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>All Categories</button>
        {EXPENSE_CATEGORIES.map(c=>(
          <button key={c.id} onClick={()=>setFilter(c.id)} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${filter===c.id?c.color:ds.color.border}`,background:filter===c.id?c.color+"22":"#fff",color:filter===c.id?c.color:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{c.icon} {c.label}</button>
        ))}
      </div>
      
      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div style={{padding:"12px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Breakdown by Category</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {byCategory.map(c=>(
              <div key={c.id} style={{padding:"4px 10px",background:c.color+"22",borderRadius:ds.radius.pill,fontSize:11.5,color:c.color,fontWeight:600}}>
                {c.icon} {c.label}: {formatPHP(c.total)} ({c.count})
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* List */}
      {filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted,fontSize:14}}>
          {expenses.length===0 ? "No expenses yet. Click \"+ New Expense\" to add one." : "No expenses match the current filter."}
        </div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:`2px solid ${ds.color.border}`}}>
              {["Date","Vendor","Category","Description","Linked","Amount","Status","",""].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontWeight:700,color:ds.color.textDark,fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(e=>{
                const cat = findExpenseCategory(e.category);
                const status = EXPENSE_PAYMENT_STATUS.find(s=>s.id===e.paymentStatus) || EXPENSE_PAYMENT_STATUS[0];
                const linkedOrder = e.linkedOrderId ? orders.find(o=>o.id===e.linkedOrderId) : null;
                return(
                  <tr key={e.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                    <td style={{padding:"10px 12px",color:ds.color.textBody,fontSize:12}}>{formatDate(e.date)}</td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:ds.color.textDark}}>{e.vendor||"—"}</td>
                    <td style={{padding:"10px 12px"}}><span style={{fontSize:11,padding:"3px 8px",borderRadius:ds.radius.pill,background:cat.color+"22",color:cat.color,fontWeight:600}}>{cat.icon} {cat.label}</span></td>
                    <td style={{padding:"10px 12px",color:ds.color.textMuted,fontSize:12,maxWidth:200}}>{e.description||"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:11.5}}>{linkedOrder ? <span style={{color:ds.color.red,fontWeight:600}}>#{linkedOrder.id.slice(-6).toUpperCase()}</span> : <span style={{color:ds.color.textLight}}>—</span>}</td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:ds.color.textDark}}>{formatPHP(e.amount||0)}</td>
                    <td style={{padding:"10px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:ds.radius.pill,background:status.bg,color:status.color,fontWeight:700,textTransform:"uppercase"}}>{status.label}</span></td>
                    <td style={{padding:"10px 12px"}}>{e.receiptUrl?<a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:ds.color.red,fontWeight:600,textDecoration:"underline"}}>📎 View</a>:<span style={{color:ds.color.textLight,fontSize:11}}>—</span>}</td>
                    <td style={{padding:"10px 12px"}}><button onClick={()=>onEdit(e)} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.textBody,fontFamily:ds.font.body}}>✏️ Edit</button></td>
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

