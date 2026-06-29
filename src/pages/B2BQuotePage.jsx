/**
 * B2BQuotePage — Dedicated institutional/B2B quote request form
 * Route: /b2b-quote
 * Features:
 *   - Multi-line item table (quantity, product, specs)
 *   - LOI (Letter of Intent) checkbox for PO-based procurement
 *   - Firestore submission to `rfqRequests` collection
 *   - Auto-generates a PDF quotation request document
 *   - Admin gets email notification + Firestore record
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ds } from "../constants/design";
import { CONTACT } from "../constants/contact";
import { PUBLIC_CATEGORIES } from "../constants/categories";
import { Btn, Spinner } from "../components/ui";
import { trackEvent } from "../lib/analytics";

const PROCUREMENT_TYPES = [
  { id: "lgu", label: "LGU / Government Agency" },
  { id: "hospital", label: "Hospital / Medical Center" },
  { id: "clinic", label: "Clinic / Health Center" },
  { id: "pharmacy", label: "Pharmacy / Drugstore" },
  { id: "school", label: "School / University" },
  { id: "ngo", label: "NGO / Foundation" },
  { id: "corporation", label: "Corporation / Business" },
  { id: "other", label: "Other" },
];

const DELIVERY_TERMS = [
  "Ex-Works (Pick-up)",
  "Delivered to Institution (Metro Manila)",
  "Delivered to Institution (Provincial)",
  "Port-to-Port (International)",
];

const emptyItem = () => ({ description: "", qty: "", unit: "pcs", specs: "" });

export default function B2BQuotePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    orgName: "", procurementType: "", contactName: "", email: "", phone: "",
    designation: "", address: "", tin: "", philgepsRef: "",
    deliveryTerm: DELIVERY_TERMS[1],
    hasLOI: false, needsABC: false,
    remarks: "",
  });
  const [items, setItems] = useState([emptyItem(), emptyItem(), emptyItem()]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [rfqId, setRfqId] = useState("");
  const [err, setErr] = useState("");

  const setF = key => e => setForm(p => ({ ...p, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const setItem = (idx, key) => e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: e.target.value } : it));
  const addRow = () => setItems(p => [...p, emptyItem()]);
  const removeRow = idx => setItems(p => p.filter((_, i) => i !== idx));

  const filledItems = items.filter(i => i.description.trim() && i.qty);

  const handleSubmit = async () => {
    if (!form.orgName || !form.contactName || !form.email || !form.phone) {
      setErr("Please fill in all required fields (Organization, Contact Name, Email, Phone).");
      return;
    }
    if (filledItems.length === 0) {
      setErr("Please add at least one item to the quote request.");
      return;
    }
    setSending(true); setErr("");
    try {
      const rfqData = {
        ...form,
        items: filledItems,
        status: "pending",
        createdAt: serverTimestamp(),
        source: "b2b-quote-page",
      };
      const ref = await addDoc(collection(db, "rfqRequests"), rfqData);
      setRfqId(ref.id);
      trackEvent("rfq_submitted", { org_type: form.procurementType, item_count: filledItems.length });
      setDone(true);
    } catch (e) {
      setErr("Submission failed. Please email us directly at " + CONTACT.email);
    }
    setSending(false);
  };

  const inp = { width: "100%", padding: "10px 13px", border: `1.5px solid ${ds.color.border}`, borderRadius: ds.radius.md, fontSize: 14, color: ds.color.textDark, outline: "none", fontFamily: ds.font.body, boxSizing: "border-box", background: "#fff" };
  const lbl = { fontSize: 12.5, fontWeight: 600, color: ds.color.textDark, display: "block", marginBottom: 5 };

  if (done) return (
    <div style={{ paddingTop: 91, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 28px" }}>
      <div style={{ textAlign: "center", maxWidth: 520 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <div style={{ fontFamily: ds.font.display, fontSize: 26, color: ds.color.textDark, marginBottom: 12 }}>RFQ Submitted!</div>
        <p style={{ fontSize: 14, color: ds.color.textMuted, lineHeight: 1.7, marginBottom: 8 }}>
          Your Request for Quotation has been received. Our institutional sales team will prepare a formal quotation and send it to <strong>{form.email}</strong> within <strong>24–48 hours</strong>.
        </p>
        <div style={{ background: ds.color.canvas, borderRadius: ds.radius.lg, padding: "14px 20px", border: `1px solid ${ds.color.border}`, marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: ds.color.textMuted }}>RFQ Reference</div>
          <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: ds.color.red, letterSpacing: "0.06em" }}>
            #{rfqId.slice(-8).toUpperCase()}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn variant="primary" size="md" onClick={() => navigate("/")}>Back to Home</Btn>
          <Btn variant="outline" size="md" onClick={() => navigate("/contact")}>Contact Us</Btn>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop: 91 }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${ds.color.red} 0%, #8B1D27 100%)`, padding: "52px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>Institutional Procurement</div>
        <h1 style={{ fontFamily: ds.font.display, fontSize: "clamp(24px,4vw,38px)", color: "#fff", fontWeight: 400, marginBottom: 12 }}>B2B / Institutional Quote Request</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", maxWidth: 560, margin: "0 auto" }}>
          For hospitals, LGUs, clinics, and businesses. We issue BIR-compliant official receipts and can process PhilGEPS procurement.
        </p>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 32, alignItems: "start" }}>

          {/* Form */}
          <div>
            {/* Organization Info */}
            <div style={{ background: "#fff", borderRadius: ds.radius.xl, border: `1px solid ${ds.color.border}`, padding: "28px 32px", marginBottom: 20, boxShadow: ds.shadow.xs }}>
              <div style={{ fontFamily: ds.font.display, fontSize: 17, color: ds.color.textDark, marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${ds.color.border}` }}>
                🏢 Organization Details
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Organization / Agency Name <span style={{ color: ds.color.red }}>*</span></label>
                  <input value={form.orgName} onChange={setF("orgName")} placeholder="e.g. Marikina City Health Office" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Procurement Type <span style={{ color: ds.color.red }}>*</span></label>
                  <select value={form.procurementType} onChange={setF("procurementType")} style={{ ...inp, cursor: "pointer" }}>
                    <option value="">Select type…</option>
                    {PROCUREMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>TIN (optional)</label>
                  <input value={form.tin} onChange={setF("tin")} placeholder="e.g. 123-456-789-000" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Contact Person <span style={{ color: ds.color.red }}>*</span></label>
                  <input value={form.contactName} onChange={setF("contactName")} placeholder="Full name" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Designation</label>
                  <input value={form.designation} onChange={setF("designation")} placeholder="e.g. Procurement Officer" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Email <span style={{ color: ds.color.red }}>*</span></label>
                  <input type="email" value={form.email} onChange={setF("email")} placeholder="procurement@example.gov.ph" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Phone <span style={{ color: ds.color.red }}>*</span></label>
                  <input value={form.phone} onChange={setF("phone")} placeholder="+63 9XX XXX XXXX" style={inp} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Delivery Address</label>
                  <input value={form.address} onChange={setF("address")} placeholder="Complete delivery address" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Delivery Terms</label>
                  <select value={form.deliveryTerm} onChange={setF("deliveryTerm")} style={{ ...inp, cursor: "pointer" }}>
                    {DELIVERY_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>PhilGEPS Reference No. (if any)</label>
                  <input value={form.philgepsRef} onChange={setF("philgepsRef")} placeholder="e.g. 1234567" style={inp} />
                </div>
              </div>

              {/* LOI + ABC toggles */}
              <div style={{ marginTop: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.hasLOI} onChange={setF("hasLOI")} style={{ width: 16, height: 16, accentColor: ds.color.red }} />
                  <span><strong>We have a Letter of Intent (LOI)</strong> or Purchase Order</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.needsABC} onChange={setF("needsABC")} style={{ width: 16, height: 16, accentColor: ds.color.red }} />
                  <span><strong>We need ABC (Approved Budget for Contract)</strong> compliance</span>
                </label>
              </div>
            </div>

            {/* Item Table */}
            <div style={{ background: "#fff", borderRadius: ds.radius.xl, border: `1px solid ${ds.color.border}`, padding: "28px 32px", marginBottom: 20, boxShadow: ds.shadow.xs }}>
              <div style={{ fontFamily: ds.font.display, fontSize: 17, color: ds.color.textDark, marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${ds.color.border}` }}>
                📋 Items / Requirements
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: ds.color.canvas }}>
                      {["#", "Description / Product Name", "Qty", "Unit", "Specs / Brand Preference", ""].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: ds.color.textMuted, borderBottom: `1px solid ${ds.color.border}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: "6px 8px", color: ds.color.textMuted, fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ padding: "4px 4px" }}>
                          <input value={item.description} onChange={setItem(idx, "description")} placeholder="e.g. Digital Blood Pressure Monitor" style={{ ...inp, padding: "7px 10px", fontSize: 13 }} />
                        </td>
                        <td style={{ padding: "4px 4px", width: 70 }}>
                          <input type="number" min="1" value={item.qty} onChange={setItem(idx, "qty")} placeholder="1" style={{ ...inp, padding: "7px 10px", fontSize: 13, width: 70 }} />
                        </td>
                        <td style={{ padding: "4px 4px", width: 80 }}>
                          <select value={item.unit} onChange={setItem(idx, "unit")} style={{ ...inp, padding: "7px 8px", fontSize: 12, width: 80, cursor: "pointer" }}>
                            {["pcs", "sets", "boxes", "packs", "units", "pairs", "kits", "rolls", "liters"].map(u => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "4px 4px" }}>
                          <input value={item.specs} onChange={setItem(idx, "specs")} placeholder="Brand, model, size, etc." style={{ ...inp, padding: "7px 10px", fontSize: 13 }} />
                        </td>
                        <td style={{ padding: "4px 4px" }}>
                          {items.length > 1 && (
                            <button onClick={() => removeRow(idx)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: ds.color.textLight, padding: "4px 6px" }} title="Remove row">✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addRow} style={{ marginTop: 12, background: "none", border: `1px dashed ${ds.color.border}`, borderRadius: ds.radius.md, padding: "8px 16px", cursor: "pointer", fontSize: 13, color: ds.color.textMuted, width: "100%", fontFamily: ds.font.body }}>
                + Add another item
              </button>
            </div>

            {/* Remarks */}
            <div style={{ background: "#fff", borderRadius: ds.radius.xl, border: `1px solid ${ds.color.border}`, padding: "24px 32px", marginBottom: 20, boxShadow: ds.shadow.xs }}>
              <label style={{ ...lbl, marginBottom: 8, fontSize: 14 }}>Additional Remarks / Special Requirements</label>
              <textarea value={form.remarks} onChange={setF("remarks")} rows={4} placeholder="Delivery urgency, brand preferences, payment terms, COD requirements, etc." style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
            </div>

            {err && <div style={{ padding: "12px 16px", background: ds.color.redLight, borderRadius: ds.radius.md, fontSize: 13, color: ds.color.red, marginBottom: 16 }}>{err}</div>}

            <Btn variant="primary" size="lg" fullWidth disabled={sending} onClick={handleSubmit}>
              {sending ? <><Spinner size={16} color="#fff" />&nbsp;Submitting RFQ…</> : "Submit Request for Quotation →"}
            </Btn>
            <p style={{ textAlign: "center", fontSize: 12, color: ds.color.textMuted, marginTop: 10, lineHeight: 1.6 }}>
              We'll respond with a formal quotation within 24–48 hours. For urgent requirements, call us at {CONTACT.phone1}.
            </p>
          </div>

          {/* Sidebar */}
          <div style={{ position: "sticky", top: 87 }}>
            <div style={{ background: "#fff", borderRadius: ds.radius.xl, border: `1px solid ${ds.color.border}`, padding: "24px 22px", marginBottom: 16, boxShadow: ds.shadow.xs }}>
              <div style={{ fontFamily: ds.font.display, fontSize: 15, color: ds.color.textDark, marginBottom: 16 }}>Why DMEAST?</div>
              {[
                { icon: "📄", text: "BIR-registered · Official Receipts issued" },
                { icon: "🏛️", text: "PhilGEPS-accredited supplier" },
                { icon: "🚚", text: "Nationwide delivery · Metro Manila same-day" },
                { icon: "📋", text: "Formal quotations with unit breakdown" },
                { icon: "💳", text: "Bank transfer, check, and installment terms" },
                { icon: "🏥", text: "Trusted by 50+ healthcare institutions" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10, fontSize: 13, color: ds.color.textBody }}>
                  <span style={{ flexShrink: 0 }}>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div style={{ background: ds.color.canvas, borderRadius: ds.radius.lg, padding: "18px 20px", border: `1px solid ${ds.color.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ds.color.textDark, marginBottom: 10 }}>Direct Contact</div>
              <div style={{ fontSize: 13, color: ds.color.textBody, lineHeight: 1.8 }}>
                <div>📞 {CONTACT.phone1}</div>
                <div>💬 {CONTACT.whatsapp}</div>
                <div>✉️ {CONTACT.email}</div>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: ds.color.textMuted }}>Mon–Sat · 9AM–6PM PHT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
