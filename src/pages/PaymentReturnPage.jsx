import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useSearchParams } from "react-router-dom";
import { ds } from "../constants/design";
import { formatPHP } from "../utils/format";
import { verifyMayaPayment } from "../lib/maya";
import { Btn, Spinner } from "../components/ui";

export function PaymentReturnPage({ setPage }){
  const [searchParams] = useSearchParams();
  const status = searchParams.get("payment");
  const orderId = searchParams.get("orderId");
  const [verifying, setVerifying] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState("");
  
  useEffect(() => {
    if (!orderId) return;
    setVerifying(true);
    (async () => {
      try {
        // Wait briefly for webhook to potentially fire first
        await new Promise(r => setTimeout(r, 1500));
        const snap = await getDoc(doc(db, "orders", orderId));
        if (snap.exists()) {
          setOrderData({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        setError("Couldn't fetch order details: " + e.message);
      }
      setVerifying(false);
    })();
  }, [orderId]);
  
  const isSuccess = status === "success";
  const isFailure = status === "failure";
  const isCancel  = status === "cancel";
  
  const iconBg = isSuccess ? ds.color.success : isFailure ? ds.color.red : ds.color.gold;
  const icon = isSuccess ? "✓" : isFailure ? "✕" : "⊘";
  const title = isSuccess ? "Payment Successful!" : isFailure ? "Payment Failed" : "Payment Cancelled";
  const subtitle = isSuccess 
    ? "Your order has been confirmed and will be processed shortly."
    : isFailure
      ? "We weren't able to process your payment. You can try again or use a different method."
      : "You cancelled the payment. Your order is still pending — you can complete payment anytime.";
  
  return (
    <div style={{paddingTop:103,minHeight:"calc(100vh - 67px)",background:ds.color.canvas}}>
      <div style={{maxWidth:580,margin:"0 auto",padding:"60px 28px"}}>
        <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"48px 36px",boxShadow:ds.shadow.md,textAlign:"center",border:`1px solid ${ds.color.borderLight}`}}>
          <div style={{
            width:80,height:80,borderRadius:"50%",
            background:iconBg,color:"#fff",
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            fontSize:42,fontWeight:700,marginBottom:24,
          }}>{icon}</div>
          
          <h1 style={{fontFamily:ds.font.display,fontSize:28,color:ds.color.textDark,marginBottom:12}}>{title}</h1>
          <p style={{fontSize:15,color:ds.color.textMuted,lineHeight:1.6,marginBottom:28}}>{subtitle}</p>
          
          {orderId && (
            <div style={{background:ds.color.canvas,borderRadius:ds.radius.md,padding:"14px 18px",marginBottom:24,border:`1px solid ${ds.color.borderLight}`}}>
              <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Reference</div>
              <div style={{fontSize:15,fontWeight:700,color:ds.color.textDark,fontFamily:"ui-monospace,monospace"}}>{orderId}</div>
              {verifying && <div style={{fontSize:12,color:ds.color.textMuted,marginTop:8}}>⏳ Verifying with bank…</div>}
              {orderData && orderData.status === "paid" && <div style={{fontSize:12,color:ds.color.success,marginTop:8,fontWeight:600}}>✓ Payment confirmed</div>}
              {orderData && orderData.status === "pending" && isSuccess && <div style={{fontSize:12,color:ds.color.gold,marginTop:8,fontWeight:600}}>⏳ Awaiting bank confirmation (may take a few minutes)</div>}
            </div>
          )}
          
          {error && <div style={{padding:"12px 16px",background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,color:ds.color.red,fontSize:13,marginBottom:18}}>{error}</div>}
          
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            {isSuccess && (
              <>
                <Btn variant="primary" size="md" onClick={()=>setPage("track")}>Track Order</Btn>
                <Btn variant="outline" size="md" onClick={()=>setPage("home")}>Continue Shopping</Btn>
              </>
            )}
            {isFailure && (
              <>
                <Btn variant="primary" size="md" onClick={()=>setPage("cart")}>Try Again</Btn>
                <Btn variant="outline" size="md" onClick={()=>setPage("home")}>Back to Home</Btn>
              </>
            )}
            {isCancel && (
              <>
                <Btn variant="primary" size="md" onClick={()=>setPage("track")}>View Order Status</Btn>
                <Btn variant="outline" size="md" onClick={()=>setPage("home")}>Back to Home</Btn>
              </>
            )}
          </div>
          
          {isSuccess && (
            <p style={{fontSize:12,color:ds.color.textLight,marginTop:24,lineHeight:1.6}}>
              📧 A confirmation email has been sent to your inbox.<br/>
              You'll be notified once your order ships.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentReturnPage;
