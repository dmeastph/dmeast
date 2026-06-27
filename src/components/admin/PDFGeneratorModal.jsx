import { useState, useEffect} from "react";
import { ds } from "../../constants/design";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { CONTACT } from "../../constants/contact";
import { Btn, Spinner } from "../ui";
import { generateDocumentPDF, sendPDFviaEmail, DOC_TITLES, INCOTERMS, computeVATBreakdown, FX_RATES_PHP_PER_UNIT, getNextDocumentNumber } from "../../lib/pdf";
import { findVATTreatment, VAT_TREATMENT_OPTIONS } from "../../constants/order";
import { DEFAULT_PAYMENT_METHODS } from "../../constants/banking";
import { formatPHP } from "../../utils/format";

export function PDFGeneratorModal({ order, onClose }){
  const [docType, setDocType] = useState("quotation");
  const [validityDays, setValidityDays] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const [docNumber, setDocNumber] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  // v15.4: VAT treatment for this PDF (defaults to order's saved treatment, but admin can override per-PDF)
  const [pdfVatTreatment, setPdfVatTreatment] = useState(order.vatTreatment || "vat_inclusive");
  // v16.13: International PI options — currency + incoterm
  const [piCurrency, setPiCurrency] = useState(order.intlCurrency || "USD");
  const [piIncoterm, setPiIncoterm] = useState(() => {
    if (order.intlDeliveryMode === "door") return "DDP";
    return "FOB";
  });
  // v16.17: Load payment method toggles from Firestore
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  useEffect(() => {
    getDoc(doc(db, "settings", "paymentMethods")).then(snap => {
      if (snap.exists()) setPaymentMethods({ ...DEFAULT_PAYMENT_METHODS, ...snap.data() });
    }).catch(() => {});
  }, []);
  
  // v16.13: Auto-switch to PI doc type if international order
  useEffect(() => {
    const isIntl = order.paymentMethod === "International Inquiry" 
      || order.status === "international_inquiry"
      || !!order.intlCountryISO;
    if (isIntl && docType === "quotation") {
      setDocType("proformaInvoice");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleGenerate = async () => {
    setGenerating(true); setErrMsg("");
    try {
      const num = await getNextDocumentNumber(docType);
      setDocNumber(num);
      // v15.4: Pass VAT treatment from order (or override if user changed it in this modal)
      const pdf = await generateDocumentPDF({ 
        order, docType, docNumber: num, validityDays,
        vatTreatment: pdfVatTreatment,
        intlOptions: { currency: piCurrency, incoterm: piIncoterm, paymentMethods },  // v16.13/v16.17
      });
      setGeneratedPdf(pdf);
      // Preview as data URL
      const dataUrl = pdf.output("datauristring");
      setPreviewUrl(dataUrl);
    } catch(e) {
      console.error("PDF generation failed:", e);
      setErrMsg("Failed to generate PDF: " + e.message);
    }
    setGenerating(false);
  };
  
  const handleDownload = () => {
    if (!generatedPdf) return;
    generatedPdf.save(`${docNumber}.pdf`);
  };
  
  // v15.3: Auto-send PDF as email attachment (no manual drag-drop required)
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState(""); // "" | "success" | "error"
  const [emailError, setEmailError] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  const handleEmail = async () => {
    if (!generatedPdf || !order.email) {
      alert("No email on file for this customer. Please add an email to the order first, or download the PDF to send manually.");
      return;
    }
    setEmailSending(true);
    setEmailStatus("");
    setEmailError("");
    
    const result = await sendPDFviaEmail({
      order,
      pdf: generatedPdf,
      docType,
      docNumber,
      customMessage: customMsg.trim() || null,
    });
    
    if (result.ok) {
      setEmailStatus("success");
      setShowEmailForm(false);
    } else {
      setEmailStatus("error");
      setEmailError(result.reason || "Unknown error");
    }
    setEmailSending(false);
  };
  
  // Fallback: original mailto-based email (if EmailJS template not yet configured)
  const handleEmailManual = () => {
    if (!generatedPdf || !order.email) {
      alert("No email on file for this customer.");
      return;
    }
    const subject = encodeURIComponent(`${DOC_TITLES[docType]} ${docNumber} from DMEAST`);
    const body = encodeURIComponent(
      `Dear ${order.name || "Customer"},\n\n` +
      `Please find attached the ${DOC_TITLES[docType].toLowerCase()} (${docNumber}) ` +
      `for your reference.\n\n` +
      `Order Reference: #${order.id.slice(-6).toUpperCase()}\n` +
      `Total Amount: ${formatPHP(order.total||0)}\n\n` +
      `Please don't hesitate to contact us for any questions or clarifications.\n\n` +
      `Best regards,\nDMEAST Team\n${CONTACT.email}\n${CONTACT.phone1}\n\n` +
      `--\n📎 Please attach the downloaded ${docNumber}.pdf to this email before sending.`
    );
    window.location.href = `mailto:${order.email}?subject=${subject}&body=${body}`;
    handleDownload();
  };
  
  const handlePrint = () => {
    if (!generatedPdf) return;
    generatedPdf.autoPrint();
    window.open(generatedPdf.output("bloburl"), "_blank");
  };
  
  // v16.13: Detect if this is an international order
  const isIntlOrder = order.paymentMethod === "International Inquiry" 
    || order.status === "international_inquiry"
    || !!order.intlCountryISO;
  
  const docTypes = [
    { id: "quotation",          label: "Quotation",          icon: "📋", desc: "Formal quote for prospective orders, with validity period" },
    // v16.13: Proforma Invoice — only shown for international orders
    ...(isIntlOrder ? [{ id: "proformaInvoice", label: "Proforma Invoice", icon: "🌍", desc: "International order: foreign currency, incoterms, wire transfer instructions" }] : []),
    { id: "salesOrder",         label: "Sales Order",        icon: "📑", desc: "Internal record of confirmed order" },
    { id: "deliveryReceipt",    label: "Delivery Receipt",   icon: "🚚", desc: "Document for courier/customer to sign upon delivery" },
    { id: "provisionalReceipt", label: "Provisional Receipt",icon: "🧾", desc: "Acknowledges payment received (before BIR Official Receipt)" },
  ];
  
  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,fontFamily:ds.font.body,outline:"none",boxSizing:"border-box"};
  
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:900,width:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.xl}}>
        
        {/* Header */}
        <div style={{padding:"18px 28px",borderBottom:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>📄 Generate Document{isIntlOrder && <span style={{fontSize:13,color:"#92400e",background:"#fef3c7",padding:"2px 8px",borderRadius:8,marginLeft:10,fontWeight:600}}>🌍 International</span>}</div>
            <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>Order #{order.id.slice(-6).toUpperCase()} · {order.name} · {formatPHP(order.total||0)}{isIntlOrder && order.intlCountry && ` · ${order.intlCountry}`}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:24,color:ds.color.textMuted,padding:4}}>✕</button>
        </div>
        
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"22px 28px"}}>
          {!generatedPdf ? (
            <>
              {/* Document type selection */}
              <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.06em"}}>Select Document Type</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
                {docTypes.map(d=>(
                  <button key={d.id} onClick={()=>setDocType(d.id)} style={{
                    padding:"14px 16px",
                    borderRadius:ds.radius.md,
                    border:`2px solid ${docType===d.id?ds.color.red:ds.color.border}`,
                    background:docType===d.id?ds.color.redLight:"#fff",
                    cursor:"pointer", textAlign:"left", fontFamily:ds.font.body,
                    transition:"all 0.15s"
                  }}>
                    <div style={{fontSize:15,fontWeight:700,color:docType===d.id?ds.color.red:ds.color.textDark,marginBottom:4}}>{d.icon} {d.label}</div>
                    <div style={{fontSize:11.5,color:ds.color.textMuted,lineHeight:1.4}}>{d.desc}</div>
                  </button>
                ))}
              </div>
              
              {/* Quotation: validity */}
              {docType === "quotation" && (
                <div style={{marginBottom:20}}>
                  <label style={{fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5}}>{docType==="proformaInvoice"?"PI Validity Period (days)":"Validity Period (days)"}</label>
                  <select value={validityDays} onChange={e=>setValidityDays(Number(e.target.value))} style={{...inp,cursor:"pointer"}}>
                    <option value={7}>7 days</option>
                    <option value={15}>15 days</option>
                    <option value={30}>30 days (recommended)</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              )}
              
              {/* v16.13: International PI options — currency + incoterm (only shown for PI doc type) */}
              {docType === "proformaInvoice" && (
                <div style={{padding:"14px 16px",background:"#fef3c7",border:`1px solid #fbbf24`,borderRadius:ds.radius.md,marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#92400e",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>🌍 International Proforma Invoice Options</div>
                  
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5}}>Quoted Currency</label>
                      <select value={piCurrency} onChange={e=>setPiCurrency(e.target.value)} style={{...inp,cursor:"pointer"}}>
                        <option value="USD">USD ($) — US Dollar</option>
                        <option value="EUR">EUR (€) — Euro</option>
                        <option value="GBP">GBP (£) — British Pound</option>
                        <option value="JPY">JPY (¥) — Japanese Yen</option>
                        <option value="AUD">AUD (A$) — Australian Dollar</option>
                        <option value="SGD">SGD (S$) — Singapore Dollar</option>
                        <option value="AED">AED — UAE Dirham</option>
                        <option value="HKD">HKD (HK$) — Hong Kong Dollar</option>
                        <option value="CNY">CNY (¥) — Chinese Yuan</option>
                        <option value="PHP">PHP (₱) — Philippine Peso</option>
                      </select>
                      <div style={{fontSize:11,color:ds.color.textMuted,marginTop:4}}>Indicative FX: 1 {piCurrency} ≈ ₱{(FX_RATES_PHP_PER_UNIT[piCurrency]||57).toFixed(2)} (+ 1% buffer)</div>
                    </div>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:5}}>Incoterms</label>
                      <select value={piIncoterm} onChange={e=>setPiIncoterm(e.target.value)} style={{...inp,cursor:"pointer"}}>
                        {INCOTERMS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                      </select>
                      <div style={{fontSize:11,color:ds.color.textMuted,marginTop:4,lineHeight:1.4}}>{INCOTERMS.find(i=>i.code===piIncoterm)?.desc || ""}</div>
                    </div>
                  </div>
                  
                  <div style={{fontSize:11,color:"#78350f",lineHeight:1.5,padding:"8px 10px",background:"rgba(255,255,255,0.5)",borderRadius:ds.radius.sm}}>
                    💡 <strong>Tip:</strong> Wire transfer instructions and your China Bank SWIFT details will be auto-included on the PI. {(order.intlDeliveryMode==="door"||piIncoterm==="DDP") ? "DDP means you absorb all shipping + duties — make sure to pad the quoted price." : "Customer is responsible for destination duties under " + piIncoterm + " terms."}
                  </div>
                </div>
              )}
              
              {/* v15.4: VAT Treatment selector */}
              <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:8}}>💰 VAT Treatment for this PDF</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {VAT_TREATMENT_OPTIONS.map(opt=>(
                    <button key={opt.id} type="button" onClick={()=>setPdfVatTreatment(opt.id)} style={{
                      padding:"8px 12px",
                      borderRadius:ds.radius.sm,
                      border:`1.5px solid ${pdfVatTreatment===opt.id?opt.badgeColor:ds.color.border}`,
                      background:pdfVatTreatment===opt.id?opt.badgeColor+"22":"#fff",
                      cursor:"pointer", fontSize:11.5, fontWeight:600,
                      color:pdfVatTreatment===opt.id?opt.badgeColor:ds.color.textBody,
                      fontFamily:ds.font.body
                    }}>
                      {opt.short}
                    </button>
                  ))}
                </div>
                {order.vatTreatment && order.vatTreatment !== pdfVatTreatment && (
                  <div style={{marginTop:8,fontSize:11,color:ds.color.textMuted,fontStyle:"italic"}}>
                    Order's saved treatment: {findVATTreatment(order.vatTreatment).short}
                  </div>
                )}
              </div>
              
              {/* Preview info */}
              <div style={{padding:"14px 16px",background:ds.color.canvas,borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:ds.color.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Document Preview</div>
                <div style={{fontSize:12,color:ds.color.textBody,lineHeight:1.6}}>
                  📌 <strong>Customer:</strong> {order.name || "—"}<br/>
                  📌 <strong>Items:</strong> {(order.items||[]).length} item{(order.items||[]).length!==1?"s":""} {(order.otherCharges||[]).length>0&&` + ${(order.otherCharges||[]).length} charge${(order.otherCharges||[]).length!==1?"s":""}`}<br/>
                  📌 <strong>VAT Treatment:</strong> <span style={{color:findVATTreatment(pdfVatTreatment).badgeColor,fontWeight:700}}>{findVATTreatment(pdfVatTreatment).label}</span><br/>
                  📌 <strong>Total Amount:</strong> {formatPHP(order.total||0)}
                  {findVATTreatment(pdfVatTreatment).applies && <><br/>📌 <strong>VAT (12%):</strong> {formatPHP(computeVATBreakdown(order.total||0,pdfVatTreatment).vat)}</>}
                </div>
              </div>
              
              <div style={{padding:"10px 14px",background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,fontSize:11.5,color:ds.color.gold}}>
                ℹ️ <strong>Reminder:</strong> This document is for business reference only. It is NOT a BIR Official Receipt. Please continue issuing official BIR Sales Invoices/Receipts from your booklets per BIR regulations.
              </div>
              
              {errMsg && <div style={{marginTop:12,padding:"10px 14px",background:ds.color.redLight,borderRadius:ds.radius.md,fontSize:13,color:ds.color.red}}>⚠ {errMsg}</div>}
            </>
          ) : (
            <>
              {/* Generated — show preview */}
              <div style={{padding:"12px 16px",background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>✓</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:ds.color.success}}>Document generated: {docNumber}</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>Preview below — choose to download, print, or email.</div>
                </div>
              </div>
              {/* v15.3: Email status feedback */}
              {emailStatus === "success" && (
                <div style={{padding:"12px 16px",background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>✉️</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:ds.color.success}}>Email sent to {order.email}!</div>
                    <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>The PDF was attached automatically. The customer will receive it shortly.</div>
                  </div>
                </div>
              )}
              {emailStatus === "error" && (
                <div style={{padding:"12px 16px",background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:ds.color.red}}>⚠ Email failed to send</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:4}}>{emailError}</div>
                  <div style={{fontSize:11.5,color:ds.color.textMuted,marginTop:6}}>
                    💡 Make sure your EmailJS dashboard has the PDF template configured. See setup guide. As a workaround, click <button onClick={handleEmailManual} style={{background:"none",border:"none",color:ds.color.red,cursor:"pointer",fontWeight:700,padding:0,textDecoration:"underline",fontFamily:ds.font.body,fontSize:11.5}}>here</button> to email manually (download PDF + open mail draft).
                  </div>
                </div>
              )}
              
              {/* v15.3: Email composition form */}
              {showEmailForm && emailStatus !== "success" && (
                <div style={{padding:"16px",background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:ds.color.textDark,marginBottom:10}}>✉️ Email PDF to {order.email}</div>
                  <div style={{fontSize:11.5,color:ds.color.textMuted,marginBottom:8}}>Add a personal message (optional). The PDF will be attached automatically.</div>
                  <textarea
                    value={customMsg}
                    onChange={e=>setCustomMsg(e.target.value)}
                    placeholder="Hi! Please find attached the quotation as discussed..."
                    rows={3}
                    style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.sm,fontSize:13,fontFamily:ds.font.body,outline:"none",resize:"vertical",boxSizing:"border-box",marginBottom:10}}
                  />
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                    <Btn variant="outline" size="sm" onClick={()=>setShowEmailForm(false)}>Cancel</Btn>
                    <Btn variant="primary" size="sm" disabled={emailSending} onClick={handleEmail}>{emailSending ? "Sending…" : "📤 Send Email with PDF"}</Btn>
                  </div>
                </div>
              )}
              
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  style={{width:"100%",height:380,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md}}
                />
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div style={{padding:"14px 28px",borderTop:`1px solid ${ds.color.border}`,display:"flex",justifyContent:"flex-end",gap:8,flexWrap:"wrap"}}>
          {!generatedPdf ? (
            <>
              <Btn variant="outline" size="md" onClick={onClose}>Cancel</Btn>
              <Btn variant="primary" size="md" disabled={generating} onClick={handleGenerate}>
                {generating ? "Generating…" : "📄 Generate PDF"}
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="outline" size="md" onClick={()=>{setGeneratedPdf(null);setPreviewUrl(null);setEmailStatus("");setShowEmailForm(false);}}>← Generate Another</Btn>
              <Btn variant="outline" size="md" onClick={handlePrint}>🖨️ Print</Btn>
              {order.email && (
                <Btn variant="outline" size="md" onClick={()=>setShowEmailForm(true)} disabled={emailSending}>
                  {emailSending ? "Sending…" : "✉️ Email to Customer"}
                </Btn>
              )}
              <Btn variant="primary" size="md" onClick={handleDownload}>📥 Download PDF</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

