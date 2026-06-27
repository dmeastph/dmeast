import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { DEFAULT_PAYMENT_METHODS } from "../../constants/banking";
import { DMEAST_MAYA_LINK } from "../../lib/maya";
import { Btn, Spinner } from "../ui";

export function PaymentMethodSettings(){
  const [methods, setMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    getDoc(doc(db, "settings", "paymentMethods")).then(snap => {
      if (snap.exists()) setMethods({ ...DEFAULT_PAYMENT_METHODS, ...snap.data() });
      setLoading(false);
    }).catch(e => { setErrMsg("Failed to load settings: " + e.message); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setErrMsg("");
    try {
      await setDoc(doc(db, "settings", "paymentMethods"), methods);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch(e) {
      setErrMsg("Failed to save: " + e.message);
    }
    setSaving(false);
  };

  const toggle = (key) => setMethods(prev => ({ ...prev, [key]: !prev[key] }));

  const METHODS = [
    {
      key:   "wireTransfer",
      label: "Bank Wire Transfer (T/T)",
      desc:  "SWIFT wire to China Bank account 150600002424. Recommended for orders over $1,000.",
      icon:  "🏦",
      color: "#92400E",
      bg:    "#FEF3C7",
    },
    {
      key:   "fiuuQR",
      label: "Fiuu QR Code — Credit/Debit Card",
      desc:  "Visa & Mastercard via Fiuu in-store QR. Card charged in PHP.",
      icon:  "💳",
      color: "#075985",
      bg:    "#E0F2FE",
    },
    {
      key:   "paypal",
      label: "PayPal",
      desc:  "Send to info@dmeastph.com. ⚠️ PayPal holds transactions over $500 USD for 21 days.",
      icon:  "💸",
      color: "#581C87",
      bg:    "#F5F3FF",
    },
    {
      key:   "mayaLink",
      label: "Maya Payment Link",
      desc:  "Static Maya link — customer enters their own amount. Accepts Maya, GCash, Visa, Mastercard, QR Ph.",
      icon:  "📱",
      color: "#055F8A",
      bg:    "#DBE4FE",
    },
  ];

  if (loading) return (
    <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"40px",textAlign:"center",color:ds.color.textMuted}}>
      <Spinner size={28}/> <span style={{marginLeft:10}}>Loading settings…</span>
    </div>
  );

  return (
    <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs,maxWidth:720}}>
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>⚙️ Payment Method Settings</div>
        <div style={{fontSize:13,color:ds.color.textMuted,marginTop:4}}>
          Control which payment methods appear on Proforma Invoices (PI). Changes take effect on the next generated PI.
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
        {METHODS.map(m => (
          <div key={m.key} style={{
            display:"flex",
            alignItems:"center",
            gap:16,
            padding:"16px 18px",
            background: methods[m.key] ? m.bg : ds.color.canvas,
            border:`1.5px solid ${methods[m.key] ? m.color + "60" : ds.color.border}`,
            borderRadius:ds.radius.md,
            transition:"all 0.15s",
            cursor:"pointer",
          }} onClick={() => toggle(m.key)}>
            {/* Toggle switch */}
            <div style={{
              width:44, height:24, borderRadius:12, flexShrink:0,
              background: methods[m.key] ? m.color : "#CBD5E1",
              position:"relative", transition:"background 0.2s",
            }}>
              <div style={{
                position:"absolute",
                top:3, left: methods[m.key] ? 23 : 3,
                width:18, height:18, borderRadius:"50%",
                background:"#fff",
                boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
                transition:"left 0.2s",
              }}/>
            </div>
            {/* Icon + text */}
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{m.icon}</span>
                <span style={{fontSize:14,fontWeight:700,color: methods[m.key] ? m.color : ds.color.textMuted}}>
                  {m.label}
                </span>
                <span style={{
                  fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:ds.radius.pill,
                  background: methods[m.key] ? m.color : "#94A3B8",
                  color:"#fff",
                }}>
                  {methods[m.key] ? "ON" : "OFF"}
                </span>
              </div>
              <div style={{fontSize:12,color:ds.color.textMuted,marginTop:4,lineHeight:1.5}}>
                {m.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Maya link display */}
      <div style={{padding:"12px 14px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,marginBottom:20,fontSize:12}}>
        <span style={{fontWeight:700,color:ds.color.textDark}}>📱 Maya Link URL: </span>
        <span style={{color:ds.color.textMuted,wordBreak:"break-all"}}>{DMEAST_MAYA_LINK}</span>
        <div style={{marginTop:4,fontSize:11,color:ds.color.textMuted}}>
          This is a static link — customers enter their own payment amount. To change this link, update <code>DMEAST_MAYA_LINK</code> in the source code.
        </div>
      </div>

      {/* Active count warning */}
      {Object.values(methods).filter(Boolean).length === 0 && (
        <div style={{padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red,marginBottom:16}}>
          ⚠️ At least one payment method must be active. PIs with no payment methods will not show a payment section.
        </div>
      )}

      {errMsg && (
        <div style={{padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red,marginBottom:16}}>
          ⚠️ {errMsg}
        </div>
      )}

      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <Btn variant="primary" size="md" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "💾 Save Settings"}
        </Btn>
        {saved && (
          <span style={{fontSize:13,color:ds.color.success,fontWeight:600}}>✅ Saved! Next PI will use these settings.</span>
        )}
      </div>
    </div>
  );
}

