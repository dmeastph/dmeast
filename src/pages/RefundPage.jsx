import { ds } from "../constants/design";
import { CONTACT } from "../constants/contact";
import { PageHero } from "../components/ui";

export function RefundPage(){
  const sections=[
    {title:"7-Day Replacement Guarantee",body:"If an item arrives damaged, defective, or different from what was ordered, contact us within 7 calendar days of delivery. We will arrange replacement or refund upon verification."},
    {title:"Eligibility for Returns",body:"Items must be unused and in original packaging, returned within 7 days with proof of purchase. Consumables and sterile-packaged items are non-returnable unless damaged upon arrival."},
    {title:"Refund Process",body:"Approved refunds are issued as Store Credit within 5–7 business days. Direct payment refunds may take 7–14 business days depending on your bank or payment provider."},
    {title:"Out-of-Stock Substitutions",body:"If an ordered item becomes unavailable, we'll offer a full refund as Store Credit, or an alternative product of equal or lesser value with your explicit approval."},
    {title:"Non-Refundable Items",body:"Medical consumables (opened or damaged), custom or special-order equipment, and shipping fees are non-refundable."},
    {title:"How to Request",body:"Email "+CONTACT.email+" or call "+CONTACT.phone1+" with your order number and photos. Our team will respond within 2 business days."},
  ];
  return(
    <div style={{paddingTop:74}}>
      <PageHero eyebrow="Legal" title="Return & Refund Policy" subtitle={`Last updated: ${new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}`}/>
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

export default RefundPage;
