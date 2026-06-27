import { ds } from "../constants/design";
import { CONTACT } from "../constants/contact";
import { PageHero } from "../components/ui";

export function CancellationPage(){
  const sections=[
    {title:"Customer-Initiated Order Cancellation",body:"You may cancel your order BEFORE it has been processed for shipment. To request cancellation, contact us immediately at "+CONTACT.email+" or "+CONTACT.phone1+" with your order reference number. Cancellations submitted before payment processing are eligible for a full refund. Once items have been packed, dispatched, or sourced from suppliers, cancellation is no longer available."},
    {title:"Cancellation Request Window",body:"Standard online orders: cancellation must be requested within 2 hours of payment to qualify for full refund without penalty. Procurement-based orders (specialized equipment, bulk supplies, institutional orders): cancellation must be requested within 24 hours of order confirmation. After these windows, cancellation is subject to supplier policies and any costs already incurred (e.g., supplier deposits, processing fees) will be deducted from the refund."},
    {title:"Cancellation Fees",body:"Orders cancelled within the request window: NO fee, full refund. Orders cancelled after sourcing has begun: actual costs incurred (typically 15-30% of order value) will be deducted from refund. Orders cancelled after dispatch: not eligible for cancellation; refer to our Return & Refund Policy."},
    {title:"DMEAST-Initiated Order Cancellation",body:"DM EAST reserves the right to cancel any order at our discretion in cases including: pricing or product information errors, items becoming unavailable from suppliers, suspected fraudulent activity, payment verification failures, breach of these terms, force majeure events (natural disasters, government restrictions, etc.). When DM EAST cancels an order, you will receive a full 100% refund of all amounts paid, processed within 7-14 business days."},
    {title:"Refund Method for Cancellations",body:"Approved cancellation refunds are processed in the following order of preference: (1) Original payment method — for credit/debit card and online payment cancellations, refund posts to the original card or e-wallet within 7-14 business days. (2) Store credit — alternative option, available immediately. (3) Bank transfer — for bank transfer payments, refund issued back to your originating bank account within 5-10 business days. Processing times depend on your bank or payment provider; DMEAST cannot guarantee timing once the refund has been initiated."},
    {title:"Account Termination",body:"You may close your DMEAST customer account at any time by emailing "+CONTACT.email+" with the request. Account closure removes your saved profile, addresses, and rewards points (which are forfeited upon closure). Order history may be retained for legal, accounting, and BIR compliance purposes for the period required by Philippine law (minimum 10 years for sales records). DMEAST reserves the right to terminate or suspend accounts that violate our Terms & Conditions, attempt fraudulent transactions, or engage in abuse of services or staff."},
    {title:"Service Termination by DMEAST",body:"DMEAST may suspend or discontinue any service, product line, or feature on this website at any time without prior notice. Active orders at the time of service termination will be honored or refunded in full. Subscription services or recurring orders (if applicable) will receive 30 days advance notice before termination, with prorated refunds for unused periods."},
    {title:"How to Request Cancellation",body:"Email "+CONTACT.email+" with subject line \"CANCELLATION REQUEST – Order #[your order ref]\". Include: full name, order reference number, payment method used, reason for cancellation. Or call "+CONTACT.phone1+" during business hours (Mon-Sat, 9 AM - 6 PM PHT). We respond to cancellation requests within 1 business day."},
    {title:"Disputes",body:"If you disagree with a cancellation decision or refund amount, contact "+CONTACT.email+" within 14 days. We will review the case and respond within 5 business days. Unresolved disputes may be escalated through Philippine consumer protection channels (DTI, BSP for payment-related issues)."},
    {title:"Updates to This Policy",body:"DM EAST may update this Cancellation Policy from time to time. The latest version will always be posted on this page with the \"Last updated\" date. Continued use of our services constitutes acceptance of any updates."},
  ];
  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Legal" title="Cancellation & Termination Policy" subtitle={`Last updated: ${new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}`}/>
      <div style={{maxWidth:820,margin:"0 auto",padding:"60px 28px"}}>
        <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.lg,padding:"18px 22px",marginBottom:40,fontSize:14,color:ds.color.gold,lineHeight:1.7}}>
          This policy explains how to cancel orders, account termination, and service termination. For information about returning products you've already received, please see our <button onClick={()=>{const ev=new CustomEvent("dmeast-nav",{detail:"refunds"});window.dispatchEvent(ev);}} style={{background:"none",border:"none",color:ds.color.gold,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body,fontSize:14,textDecoration:"underline",padding:0}}>Return & Refund Policy</button>.
        </div>
        {sections.map((s,i)=>(
          <div key={i} style={{marginBottom:36,paddingBottom:36,borderBottom:i<sections.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
            <h3 style={{fontSize:17,fontWeight:600,color:ds.color.textDark,marginBottom:10,fontFamily:ds.font.display}}>{i+1}. {s.title}</h3>
            <p style={{fontSize:15,color:ds.color.textBody,lineHeight:1.8,whiteSpace:"pre-line"}}>{s.body}</p>
          </div>
        ))}
        
        {/* Quick contact box */}
        <div style={{background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",marginTop:40,textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark,marginBottom:10}}>Need to cancel an order?</div>
          <div style={{fontSize:13.5,color:ds.color.textMuted,marginBottom:18,lineHeight:1.7}}>
            Contact us within the cancellation window for fastest processing.
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",fontSize:13.5}}>
            <a href={`mailto:${CONTACT.email}?subject=Cancellation Request`} style={{color:ds.color.red,fontWeight:700,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:5}}>
              ✉️ {CONTACT.email}
            </a>
            <span style={{color:ds.color.textLight}}>·</span>
            <a href={`tel:${CONTACT.phone1.replace(/\s/g,"")}`} style={{color:ds.color.red,fontWeight:700,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:5}}>
              📞 {CONTACT.phone1}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CancellationPage;
