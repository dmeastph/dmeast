import { useState } from "react";
import { ds } from "../../constants/design";
import { formatPHP, formatDate } from "../../utils/format";
import { EXPENSE_CATEGORIES } from "../../constants/expenses";
import { ORDER_SOURCES } from "../../constants/order";
import { SectionHeader } from "../ui";

export function MarginDashboardTab({ orders, expenses }){
  const [dateRange, setDateRange] = useState("month"); // month/year/all
  
  const now = new Date();
  const filterByDate = (item) => {
    if (dateRange === "all") return true;
    const d = item.createdAt?.toDate ? item.createdAt.toDate() : (item.date?.toDate ? item.date.toDate() : new Date(item.createdAt || item.date));
    if (dateRange === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateRange === "year") return d.getFullYear() === now.getFullYear();
    return true;
  };
  
  // Filter only paid/confirmed orders with revenue
  const validOrders = orders.filter(o => 
    filterByDate(o) && 
    o.status !== "cancelled" && 
    o.status !== "out_of_stock" &&
    (o.total || 0) > 0
  );
  
  const totalRevenue = validOrders.reduce((s,o) => s + (o.total||0), 0);
  
  // COGS — sum of:
  //   1. Order's supplierCost field (manual entry from NewOrderModal)
  //   2. Expenses linked to orders via linkedOrderId
  const orderCOGSMap = {};
  validOrders.forEach(o => {
    if (o.supplierCost) orderCOGSMap[o.id] = (orderCOGSMap[o.id] || 0) + Number(o.supplierCost);
  });
  expenses.filter(filterByDate).forEach(e => {
    if (e.linkedOrderId && e.category === "cogs") {
      orderCOGSMap[e.linkedOrderId] = (orderCOGSMap[e.linkedOrderId] || 0) + Number(e.amount || 0);
    }
  });
  
  const totalCOGS = Object.values(orderCOGSMap).reduce((s,v) => s + v, 0);
  
  // OpEx (operating expenses, not COGS)
  const totalOpEx = expenses.filter(e => filterByDate(e) && e.category !== "cogs")
    .reduce((s,e) => s + (Number(e.amount)||0), 0);
  
  const grossMargin = totalRevenue - totalCOGS;
  const netProfit = grossMargin - totalOpEx;
  const grossMarginPct = totalRevenue > 0 ? (grossMargin / totalRevenue * 100) : 0;
  const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;
  
  // Per-order breakdown (orders with COGS data)
  const ordersWithMargin = validOrders.map(o => {
    const cogs = orderCOGSMap[o.id] || 0;
    const margin = (o.total || 0) - cogs;
    const marginPct = (o.total||0) > 0 ? (margin / (o.total||0) * 100) : 0;
    return { ...o, cogs, margin, marginPct, hasCOGS: cogs > 0 };
  }).filter(o => o.hasCOGS).sort((a,b) => b.margin - a.margin);
  
  // Top customers by revenue
  const customerMap = {};
  validOrders.forEach(o => {
    const key = o.customerId || o.uid || o.email || o.name || "unknown";
    if (!customerMap[key]) customerMap[key] = { name: o.name||"Unknown", revenue: 0, cogs: 0, orders: 0 };
    customerMap[key].revenue += (o.total || 0);
    customerMap[key].cogs += orderCOGSMap[o.id] || 0;
    customerMap[key].orders += 1;
  });
  const topCustomers = Object.values(customerMap)
    .map(c => ({ ...c, margin: c.revenue - c.cogs, marginPct: c.revenue > 0 ? ((c.revenue - c.cogs)/c.revenue*100) : 0 }))
    .sort((a,b) => b.revenue - a.revenue)
    .slice(0, 10);
    
  // Top products by revenue
  const productMap = {};
  validOrders.forEach(o => {
    (o.items||[]).forEach(item => {
      const key = item.id || item.name;
      if (!productMap[key]) productMap[key] = { name: item.name, revenue: 0, qty: 0 };
      productMap[key].revenue += (item.price * item.qty);
      productMap[key].qty += item.qty;
    });
  });
  const topProducts = Object.values(productMap).sort((a,b) => b.revenue - a.revenue).slice(0, 10);
  
  // Source breakdown
  const sourceMap = {};
  ORDER_SOURCES.forEach(s => sourceMap[s.id] = { ...s, revenue: 0, count: 0 });
  validOrders.forEach(o => {
    const src = o.source || "website";
    if (sourceMap[src]) {
      sourceMap[src].revenue += (o.total || 0);
      sourceMap[src].count += 1;
    }
  });
  const sourceBreakdown = Object.values(sourceMap).filter(s => s.count > 0).sort((a,b) => b.revenue - a.revenue);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>📈 Margin Dashboard</div>
          <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:3}}>Profit analysis — revenue, COGS, operating expenses, and net margin</div>
        </div>
        <select value={dateRange} onChange={e=>setDateRange(e.target.value)} style={{padding:"8px 14px",borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,fontSize:13,fontFamily:ds.font.body,outline:"none",cursor:"pointer",background:"#fff"}}>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>
      
      {/* Big numbers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderTop:`3px solid ${ds.color.red}`,borderRadius:ds.radius.lg,padding:"18px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Revenue</div>
          <div style={{fontSize:22,fontWeight:700,color:ds.color.red,marginTop:6,fontFamily:ds.font.display}}>{formatPHP(totalRevenue)}</div>
          <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>{validOrders.length} orders</div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderTop:`3px solid #EF4444`,borderRadius:ds.radius.lg,padding:"18px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Cost of Goods</div>
          <div style={{fontSize:22,fontWeight:700,color:"#EF4444",marginTop:6,fontFamily:ds.font.display}}>{formatPHP(totalCOGS)}</div>
          <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>Direct product costs</div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderTop:`3px solid ${grossMargin>=0?ds.color.success:ds.color.red}`,borderRadius:ds.radius.lg,padding:"18px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Gross Margin</div>
          <div style={{fontSize:22,fontWeight:700,color:grossMargin>=0?ds.color.success:ds.color.red,marginTop:6,fontFamily:ds.font.display}}>{formatPHP(grossMargin)}</div>
          <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>{grossMarginPct.toFixed(1)}% of revenue</div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderTop:`3px solid ${netProfit>=0?ds.color.success:ds.color.red}`,borderRadius:ds.radius.lg,padding:"18px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Net Profit</div>
          <div style={{fontSize:22,fontWeight:700,color:netProfit>=0?ds.color.success:ds.color.red,marginTop:6,fontFamily:ds.font.display}}>{formatPHP(netProfit)}</div>
          <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>After OpEx ({formatPHP(totalOpEx)})</div>
        </div>
      </div>
      
      {/* P&L summary */}
      <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs,marginBottom:20}}>
        <div style={{fontFamily:ds.font.display,fontSize:16,color:ds.color.textDark,marginBottom:16}}>Profit & Loss Summary</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px 16px"}}>
          <div style={{fontSize:13,color:ds.color.textBody}}>Revenue</div>
          <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark,textAlign:"right"}}>{formatPHP(totalRevenue)}</div>
          <div style={{fontSize:13,color:ds.color.textMuted,paddingLeft:16}}>Less: Cost of Goods Sold</div>
          <div style={{fontSize:13,color:"#EF4444",textAlign:"right"}}>({formatPHP(totalCOGS)})</div>
          <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark,paddingTop:8,borderTop:`1px solid ${ds.color.border}`}}>Gross Margin</div>
          <div style={{fontSize:13,fontWeight:700,color:grossMargin>=0?ds.color.success:ds.color.red,textAlign:"right",paddingTop:8,borderTop:`1px solid ${ds.color.border}`}}>{formatPHP(grossMargin)} ({grossMarginPct.toFixed(1)}%)</div>
          <div style={{fontSize:13,color:ds.color.textMuted,paddingLeft:16}}>Less: Operating Expenses</div>
          <div style={{fontSize:13,color:"#EF4444",textAlign:"right"}}>({formatPHP(totalOpEx)})</div>
          <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark,paddingTop:8,borderTop:`2px solid ${ds.color.textDark}`}}>Net Profit</div>
          <div style={{fontSize:15,fontWeight:700,color:netProfit>=0?ds.color.success:ds.color.red,textAlign:"right",paddingTop:8,borderTop:`2px solid ${ds.color.textDark}`}}>{formatPHP(netProfit)} ({netMarginPct.toFixed(1)}%)</div>
        </div>
        {totalCOGS === 0 && validOrders.length > 0 && (
          <div style={{marginTop:14,padding:"10px 14px",background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,fontSize:12,color:ds.color.gold}}>
            💡 No COGS data yet. Add supplier costs when creating orders, or link expenses to specific orders to see your true profit margins.
          </div>
        )}
      </div>
      
      {/* Two-column: Top Customers + Top Products */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:20}}>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontFamily:ds.font.display,fontSize:15,color:ds.color.textDark,marginBottom:14}}>👑 Top Customers</div>
          {topCustomers.length===0?(
            <div style={{textAlign:"center",padding:"20px 0",color:ds.color.textLight,fontSize:13}}>No data for this period</div>
          ):topCustomers.map((c,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<topCustomers.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i+1}. {c.name}</div>
                <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>{c.orders} order{c.orders!==1?"s":""}{c.cogs>0?` · ${c.marginPct.toFixed(0)}% margin`:""}</div>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:ds.color.red}}>{formatPHP(c.revenue)}</div>
            </div>
          ))}
        </div>
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontFamily:ds.font.display,fontSize:15,color:ds.color.textDark,marginBottom:14}}>🥇 Top Products</div>
          {topProducts.length===0?(
            <div style={{textAlign:"center",padding:"20px 0",color:ds.color.textLight,fontSize:13}}>No data for this period</div>
          ):topProducts.map((p,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<topProducts.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:ds.color.textDark,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i+1}. {p.name}</div>
                <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>{p.qty} unit{p.qty!==1?"s":""}</div>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:ds.color.red}}>{formatPHP(p.revenue)}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Source breakdown */}
      <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs,marginBottom:20}}>
        <div style={{fontFamily:ds.font.display,fontSize:15,color:ds.color.textDark,marginBottom:14}}>🌐 Revenue by Source Channel</div>
        {sourceBreakdown.length===0?(
          <div style={{textAlign:"center",padding:"20px 0",color:ds.color.textLight,fontSize:13}}>No data for this period</div>
        ):sourceBreakdown.map(s=>{
          const pct = totalRevenue > 0 ? (s.revenue / totalRevenue * 100) : 0;
          return(
            <div key={s.id} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:ds.color.textBody,fontWeight:600}}>{s.icon} {s.label} <span style={{color:ds.color.textMuted,fontWeight:400,marginLeft:4}}>({s.count} order{s.count!==1?"s":""})</span></span>
                <span style={{color:ds.color.textDark,fontWeight:700}}>{formatPHP(s.revenue)} · {pct.toFixed(1)}%</span>
              </div>
              <div style={{height:6,background:ds.color.borderLight,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:pct+"%",background:s.color,borderRadius:3,transition:"width 0.3s"}}/>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Per-order margins (orders with COGS) */}
      {ordersWithMargin.length > 0 && (
        <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs}}>
          <div style={{fontFamily:ds.font.display,fontSize:15,color:ds.color.textDark,marginBottom:14}}>💼 Top Margin Orders ({ordersWithMargin.length} orders with COGS data)</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
              <thead><tr style={{borderBottom:`2px solid ${ds.color.border}`}}>
                {["Order","Customer","Revenue","COGS","Margin","Margin %"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",fontWeight:700,fontSize:10.5,color:ds.color.textDark,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {ordersWithMargin.slice(0,15).map(o=>(
                  <tr key={o.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                    <td style={{padding:"8px 10px",fontWeight:600,color:ds.color.red}}>#{o.id.slice(-6).toUpperCase()}</td>
                    <td style={{padding:"8px 10px",color:ds.color.textBody}}>{o.name}</td>
                    <td style={{padding:"8px 10px",color:ds.color.textDark,fontWeight:600}}>{formatPHP(o.total||0)}</td>
                    <td style={{padding:"8px 10px",color:"#EF4444"}}>{formatPHP(o.cogs)}</td>
                    <td style={{padding:"8px 10px",color:o.margin>=0?ds.color.success:ds.color.red,fontWeight:700}}>{formatPHP(o.margin)}</td>
                    <td style={{padding:"8px 10px"}}>
                      <span style={{fontSize:11,padding:"2px 7px",borderRadius:ds.radius.pill,background:o.marginPct>=20?ds.color.successBg:o.marginPct>=10?"#FEF3C7":"#FEE2E2",color:o.marginPct>=20?ds.color.success:o.marginPct>=10?"#92400E":ds.color.red,fontWeight:700}}>{o.marginPct.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

