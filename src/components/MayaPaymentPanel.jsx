// src/components/MayaPaymentPanel.jsx
// v16: Maya payment link panel — extracted from App.jsx Phase 1 refactor.
// Creates a Maya invoice via /api/maya-invoice (Vercel serverless), saves link
// to Firestore, and emails the link to the customer via EmailJS.

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ds } from "../constants/design";
import { formatPHP } from "../utils/format";
import { emailjs, EMAILJS_CONFIG } from "../lib/emailjs";
import { CONTACT } from "../constants/contact";

export default function MayaPaymentPanel({ order, onPaymentLinkSent }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState(order?.mayaInvoiceUrl || null);
  const [payStatus, setPayStatus] = useState(order?.paymentStatus || "awaiting");
  const [errMsg, setErrMsg] = useState("");

  // Sync from order prop when modal re-opens
  useEffect(() => {
    setInvoiceUrl(order?.mayaInvoiceUrl || null);
    setPayStatus(order?.paymentStatus || "awaiting");
  }, [order?.id]);

  // Only show for local (non-international) orders that haven't been paid yet
  const isIntl = !!order?.intlCountryISO || order?.paymentMethod === "International Inquiry";
  const isPaid = payStatus === "paid";

  const handleSend = async () => {
    if (!order?.email && !confirm("No email on file for this customer. The link will be saved to the order but cannot be emailed. Continue?")) return;
    setSending(true); setErrMsg("");

    try {
      // Step 1 — Create Maya invoice via serverless function
      const resp = await fetch("/api/maya-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId:       order.orderNumber || order.id,
          orderRef:      order.orderNumber || order.id,
          amountPHP:     order.total || 0,
          customerEmail: order.email || "",
          customerName:  order.name  || "",
          description:   `DMEAST Order ${order.orderNumber || order.id}`,
        }),
      });

      const data = await resp.json();

      if (!data.success || !data.invoiceUrl) {
        throw new Error(data.error || "Maya did not return a payment link. Check Vercel logs.");
      }

      const link = data.invoiceUrl;

      // Step 2 — Save link + status to Firestore
      await updateDoc(doc(db, "orders", order.id), {
        mayaInvoiceUrl:    link,
        mayaInvoiceId:     data.invoiceId   || null,
        mayaInvoiceRef:    data.requestReferenceNumber || null,
        paymentStatus:     "link_sent",
        paymentLinkSentAt: new Date().toISOString(),
        updatedAt:         new Date().toISOString(),
      });

      // Step 3 — Email link to customer (if email available)
      if (order.email) {
        try {
          await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            {
              from_name: "DM EAST Team",
              company: "DM EAST",
              from_email: CONTACT.email,
              phone: CONTACT.phone1,
              product: `Payment Link — Order #${(order.orderNumber || order.id || "").slice(-6).toUpperCase()}`,
              quantity: "—",
              budget: formatPHP(order.total || 0),
              timeline: "Immediate",
              location: order.address || "—",
              details: `Your payment link is ready:\n\n${link}\n\nAmount: ${formatPHP(order.total || 0)}\nReference: ${order.orderNumber || order.id}\n\nThis link is valid for 24 hours. You can pay via GCash, Maya, Visa, Mastercard, or QR Ph.\n\nIf you have questions, reply to this email or contact us at ${CONTACT.phone1}.`,
              reply_to: CONTACT.email,
              to_email: order.email,
            },
            EMAILJS_CONFIG.publicKey
          );
        } catch(emailErr) {
          console.warn("Email send failed (link still saved):", emailErr);
        }
      }

      setInvoiceUrl(link);
      setPayStatus("link_sent");
      setSent(true);
      onPaymentLinkSent && onPaymentLinkSent(link);

    } catch(err) {
      console.error("Maya payment link error:", err);
      setErrMsg(err.message || "Failed to create payment link.");
    }

    setSending(false);
  };

  // Don't render for international orders
  if (isIntl) return null;

  return (
    <div style={{
      gridColumn:"1/-1",
      marginTop:4,
      borderTop:`1px dashed ${ds.color.border}`,
      paddingTop:16,
    }}>
      <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>
        💳 Maya Payment Link
      </div>

      {/* Already paid */}
      {isPaid && (
        <div style={{padding:"12px 16px",background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>✅</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:ds.color.success}}>Paid via Maya</div>
            {order?.paidAt && <div style={{fontSize:11,color:ds.color.textMuted,marginTop:2}}>Paid on: {new Date(order.paidAt).toLocaleString("en-PH")}</div>}
          </div>
        </div>
      )}

      {/* Link sent, awaiting payment */}
      {!isPaid && payStatus === "link_sent" && invoiceUrl && !sent && (
        <div style={{padding:"12px 16px",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:ds.radius.md}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1D4ED8",marginBottom:6}}>💳 Payment link sent — awaiting customer payment</div>
          <div style={{fontSize:11.5,color:ds.color.textMuted,marginBottom:8,wordBreak:"break-all"}}>{invoiceUrl}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <a href={invoiceUrl} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:ds.radius.sm,background:"#1D4ED8",color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none"}}>🔗 Open Link</a>
            <button onClick={()=>{navigator.clipboard.writeText(invoiceUrl);}} style={{padding:"6px 12px",borderRadius:ds.radius.sm,border:"1px solid #1D4ED8",background:"#fff",color:"#1D4ED8",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body}}>📋 Copy</button>
            <button onClick={handleSend} disabled={sending} style={{padding:"6px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",color:ds.color.textBody,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ds.font.body}}>🔄 Resend</button>
          </div>
        </div>
      )}

      {/* Success — just sent */}
      {sent && invoiceUrl && (
        <div style={{padding:"12px 16px",background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md}}>
          <div style={{fontSize:13,fontWeight:700,color:ds.color.success,marginBottom:6}}>✅ Payment link sent{order?.email ? ` to ${order.email}` : ""}!</div>
          <div style={{fontSize:11.5,color:ds.color.textMuted,marginBottom:8,wordBreak:"break-all"}}>{invoiceUrl}</div>
          <div style={{display:"flex",gap:8}}>
            <a href={invoiceUrl} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:ds.radius.sm,background:ds.color.success,color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none"}}>🔗 Open Link</a>
            <button onClick={()=>{navigator.clipboard.writeText(invoiceUrl);}} style={{padding:"6px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.success}`,background:"#fff",color:ds.color.success,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body}}>📋 Copy</button>
          </div>
        </div>
      )}

      {/* Ready to send */}
      {!isPaid && payStatus !== "link_sent" && !sent && (
        <div style={{padding:"14px 16px",background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md}}>
          <div style={{fontSize:12.5,color:ds.color.textBody,marginBottom:10,lineHeight:1.5}}>
            Generate a Maya payment link for <strong>{order?.name || "this customer"}</strong> — amount: <strong style={{color:ds.color.red}}>{formatPHP(order?.total || 0)}</strong>.<br/>
            <span style={{fontSize:11.5,color:ds.color.textMuted}}>Accepts GCash, Maya, Visa, Mastercard, QR Ph. Link emailed to customer automatically.</span>
          </div>
          {!order?.email && (
            <div style={{padding:"8px 10px",background:"#FEF3C7",borderRadius:ds.radius.sm,fontSize:11.5,color:"#92400E",marginBottom:10}}>
              ⚠️ No customer email on file — link will be saved but not emailed. Add an email in the Customer Info tab first.
            </div>
          )}
          <button
            onClick={handleSend}
            disabled={sending || (order?.total || 0) <= 0}
            style={{
              padding:"10px 20px",
              borderRadius:ds.radius.md,
              border:"none",
              background:sending?"#94A3B8":"#1A56DB",
              color:"#fff",
              fontSize:13,
              fontWeight:700,
              cursor:sending?"not-allowed":"pointer",
              fontFamily:ds.font.body,
              display:"flex",
              alignItems:"center",
              gap:8,
              opacity:(order?.total || 0) <= 0 ? 0.5 : 1,
            }}
          >
            {sending ? "⏳ Creating link…" : "💳 Send Maya Payment Link"}
          </button>
          {(order?.total || 0) <= 0 && (
            <div style={{marginTop:8,fontSize:11.5,color:ds.color.textMuted}}>⚠️ Order total must be greater than ₱0 before sending a payment link.</div>
          )}
        </div>
      )}

      {errMsg && (
        <div style={{marginTop:10,padding:"10px 14px",background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,fontSize:12.5,color:ds.color.red}}>
          ⚠️ {errMsg}
          <div style={{fontSize:11,marginTop:4,color:ds.color.textMuted}}>Check that MAYA_SECRET_KEY is set in Vercel and the /api/maya-invoice function is deployed.</div>
        </div>
      )}
    </div>
  );
}
