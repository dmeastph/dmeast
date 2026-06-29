import { ds } from "../constants/design";
import { CONTACT } from "../constants/contact";
import { PageHero } from "../components/ui";

export function PrivacyPage(){
  const sections=[
    {title:"Information We Collect",body:"When you submit a form, create an account, or place an order, we collect your name, company, email, phone, address, and order details. Registered customers have order history and account data stored securely."},
    {title:"How We Use Your Information",body:"We use your data to respond to inquiries, prepare quotations, process orders, provide customer support, and administer your DMEAST account and rewards. We do not share your information for unrelated marketing."},
    {title:"Information Sharing",body:"DM EAST does not sell, rent, or trade your personal information. We may share with authorized suppliers solely for fulfilling your order."},
    {title:"Data Security",body:"We use Firebase (Google Cloud) to secure your account data with industry-standard encryption. No internet transmission is 100% secure."},
    {title:"Cookies",body:"This website may use basic browser cookies to improve your experience. No advertising trackers are used."},
    {title:"Rewards Program",body:"Your reward points and purchase history are stored securely in your account. Points are non-transferable and have no cash value except as DMEAST purchase credits."},
    {title:"Your Rights",body:"You may request access to, correction of, or deletion of your personal data. Contact us at "+CONTACT.email+" to exercise these rights."},
    {title:"Contact About Privacy",body:"Questions? Contact us at "+CONTACT.email+" or "+CONTACT.phone1+"."},
  ];
  return(
    <div style={{paddingTop:103}}>
      <PageHero eyebrow="Legal" title="Privacy Policy" subtitle={`Last updated: ${new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}`}/>
      <div style={{maxWidth:820,margin:"0 auto",padding:"60px 28px"}}>
        <div style={{background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.lg,padding:"18px 22px",marginBottom:40,fontSize:14,color:ds.color.red,lineHeight:1.7}}>DM EAST is committed to protecting your privacy. This policy explains what we collect, how we use it, and your rights.</div>
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

export default PrivacyPage;
