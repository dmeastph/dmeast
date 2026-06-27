import { ds } from "../constants/design";
import { CONTACT } from "../constants/contact";
import { PageHero } from "../components/ui";

export function TermsPage(){
  const sections=[
    {title:"Acceptance of Terms",body:"By accessing dmeastph.com and placing orders, you agree to these Terms and Conditions."},
    {title:"Company Information",body:"DM EAST (Decon Medical Equipment and Supplies Trading). Address: 1146 M. Natividad Cor. Mayhaligue Sts., Sta. Cruz, Manila. Contact: info@dmeastph.com | +63 951 040 1708."},
    {title:"Products and Pricing",body:"Prices are in Philippine Peso (PHP). Direct-purchase prices are fixed at checkout. Quote/sales items are confirmed via formal quotation. International orders exclude shipping, duties, and taxes."},
    {title:"Minimum Order",body:"Minimum order value for direct purchase is ₱500.00. No minimum for quote-based orders."},
    {title:"Payment Terms",body:"Full payment required before order processing. Accepted: credit card, debit card, GCash, Maya, bank transfer, QR Ph."},
    {title:"Rewards Program",body:"Registered customers earn 1 reward point for every ₱200 spent. Each point is worth ₱0.50 and can be redeemed as purchase credits. Points are non-transferable, non-encashable, and subject to DMEAST's rewards terms. DMEAST reserves the right to modify or cancel the rewards program at any time."},
    {title:"Order Processing",body:"All orders subject to availability. DM EAST sources on confirmed orders. We reserve the right to cancel orders due to pricing errors, unavailability, or force majeure."},
    {title:"Out of Stock Items",body:"If an item becomes unavailable after payment, we will offer a full refund as store credit or an alternative product with your approval."},
    {title:"Delivery and Shipping",body:"Nationwide delivery across the Philippines. International shipping via FedEx, air cargo, and sea freight. International shipping fees and import duties are the buyer's responsibility."},
    {title:"Warranty",body:"Medical equipment carries standard manufacturer warranty (generally 1 year). 7-day replacement for items damaged upon delivery. Pharmaceuticals and consumables follow manufacturer expiry."},
    {title:"Prescription Medicines",body:"Prescription items require a valid Philippine FDA-compliant doctor's prescription. Orders without valid Rx may be cancelled and refunded."},
    {title:"Limitation of Liability",body:"DMEAST's maximum liability shall not exceed the total amount paid for the relevant order. We are not responsible for delays due to force majeure events."},
  ];
  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Legal" title="Terms & Conditions" subtitle={`Last updated: ${new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}`}/>
      <div style={{maxWidth:820,margin:"0 auto",padding:"60px 28px"}}>
        {sections.map((s,i)=>(
          <div key={i} style={{marginBottom:36,paddingBottom:36,borderBottom:i<sections.length-1?`1px solid ${ds.color.borderLight}`:"none"}}>
            <h3 style={{fontSize:17,fontWeight:600,color:ds.color.textDark,marginBottom:10,fontFamily:ds.font.display}}>{i+1}. {s.title}</h3>
            <p style={{fontSize:15,color:ds.color.textBody,lineHeight:1.8}}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TermsPage;
