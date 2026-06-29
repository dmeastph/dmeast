import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ds } from "../constants/design";
import { Btn, Tag } from "../components/ui";
import { usePublishedPosts, formatBlogDate, estimateReadTime } from "../lib/blog";

const BASE_URL = "https://dmeastph.com";

function injectJsonLd(post) {
  // Remove any existing JSON-LD injected by this function
  document.querySelectorAll('script[data-dmeast-jsonld]').forEach(el => el.remove());

  const publishDate = post.publishedAt?.toDate
    ? post.publishedAt.toDate().toISOString()
    : new Date(post.publishedAt || Date.now()).toISOString();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.metaDescription || post.excerpt || post.title,
    "image": post.featuredImage ? [post.featuredImage] : undefined,
    "datePublished": publishDate,
    "dateModified": publishDate,
    "author": {
      "@type": "Organization",
      "name": post.author || "DMEAST Medical Supplies",
      "url": BASE_URL,
    },
    "publisher": {
      "@type": "Organization",
      "name": "DMEAST Medical Supplies",
      "url": BASE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/dmeast-logo.png`,
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${post.slug}`,
    },
    "keywords": (post.tags || []).join(", ") || undefined,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",  "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Blog",  "item": `${BASE_URL}/blog` },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": `${BASE_URL}/blog/${post.slug}` },
    ],
  };

  [articleSchema, breadcrumbSchema].forEach(schema => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-dmeast-jsonld", "1");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  });
}

function removeJsonLd() {
  document.querySelectorAll('script[data-dmeast-jsonld]').forEach(el => el.remove());
}

export default function BlogPostPage({ setPage }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { posts: allPosts } = usePublishedPosts();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch post by slug from Firestore
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const q = query(collection(db, "blogPosts"), where("slug", "==", slug), where("status", "==", "published"));
    getDocs(q).then(snap => {
      if (!snap.empty) {
        setPost({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setPost(null);
      }
      setLoading(false);
    }).catch(() => { setPost(null); setLoading(false); });
  }, [slug]);

  // Per-post SEO + JSON-LD
  useEffect(() => {
    if (!post) return;
    document.title = `${post.title} | DMEAST Blog`;
    const setMeta = (name, content, attr = "name") => {
      if (!content) return;
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attr, name); document.head.appendChild(tag); }
      tag.setAttribute("content", content);
    };
    const desc = post.metaDescription || post.excerpt || post.title;
    setMeta("description", desc);
    if (post.tags?.length) setMeta("keywords", post.tags.join(", "));
    setMeta("og:title", `${post.title} | DMEAST Blog`, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:url", `${BASE_URL}/blog/${post.slug}`, "property");
    if (post.featuredImage) setMeta("og:image", post.featuredImage, "property");
    let link = document.querySelector("link[rel='canonical']");
    if (!link) { link = document.createElement("link"); link.setAttribute("rel", "canonical"); document.head.appendChild(link); }
    link.setAttribute("href", `${BASE_URL}/blog/${post.slug}`);

    injectJsonLd(post);
    return () => removeJsonLd();
  }, [post]);

  if (loading) {
    return (
      <div style={{paddingTop:91,textAlign:"center",padding:"100px 28px"}}>
        <div style={{fontSize:14,color:ds.color.textMuted}}>Loading article…</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{paddingTop:91,textAlign:"center",padding:"100px 28px"}}>
        <div style={{fontSize:48,marginBottom:16,opacity:0.6}}>📰</div>
        <div style={{fontFamily:ds.font.display,fontSize:24,color:ds.color.textDark,marginBottom:12}}>Article not found</div>
        <p style={{fontSize:14,color:ds.color.textMuted,marginBottom:24}}>The article you're looking for might have been moved or removed.</p>
        <Btn variant="primary" size="md" onClick={()=>navigate("/blog")}>← Back to Blog</Btn>
      </div>
    );
  }

  const related = allPosts.filter(p => p.id !== post.id && p.category === post.category).slice(0, 3);

  return (
    <div style={{paddingTop:91}}>
      {/* Hero */}
      <div style={{
        background: post.featuredImage
          ? `linear-gradient(rgba(26,20,16,0.55),rgba(26,20,16,0.55)) center/cover, url(${post.featuredImage}) center/cover no-repeat`
          : `linear-gradient(135deg,${ds.color.redLight},${ds.color.goldLight})`,
        minHeight:320,display:"flex",alignItems:"flex-end",padding:"0 28px 40px",
      }}>
        <div style={{maxWidth:820,margin:"0 auto",width:"100%"}}>
          <button onClick={()=>navigate("/blog")} style={{
            background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.3)",
            borderRadius:ds.radius.pill,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,
            color:"#fff",fontFamily:ds.font.body,marginBottom:16,display:"inline-flex",alignItems:"center",gap:6,
          }}>← Back to Blog</button>
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            {post.category&&<Tag color={ds.color.gold}>{post.category}</Tag>}
            {(post.tags||[]).map(t=><Tag key={t}>{t}</Tag>)}
          </div>
          <h1 style={{fontFamily:ds.font.display,fontSize:"clamp(22px,4vw,38px)",color:post.featuredImage?"#fff":ds.color.textDark,lineHeight:1.2,fontWeight:400,marginBottom:12}}>{post.title}</h1>
          <div style={{fontSize:12,color:post.featuredImage?"rgba(255,255,255,0.7)":ds.color.textMuted,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <span>📅 {formatBlogDate(post.publishedAt)}</span>
            <span>📖 {post.readTime||estimateReadTime(post.content)} read</span>
            {post.author&&<span>✍️ {post.author}</span>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:820,margin:"0 auto",padding:"48px 28px"}}>
        {post.excerpt&&<p style={{fontSize:17,color:ds.color.textMuted,lineHeight:1.7,marginBottom:36,fontStyle:"italic",borderLeft:`3px solid ${ds.color.gold}`,paddingLeft:20}}>{post.excerpt}</p>}
        <div
          style={{fontSize:15.5,lineHeight:1.85,color:ds.color.textBody}}
          dangerouslySetInnerHTML={{__html:post.content||""}}
        />
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <section style={{background:ds.color.canvas,padding:"60px 28px",marginTop:60}}>
          <div style={{maxWidth:1280,margin:"0 auto"}}>
            <h2 style={{fontFamily:ds.font.display,fontSize:24,color:ds.color.textDark,marginBottom:24,textAlign:"center",fontWeight:400}}>Related Articles</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:18,maxWidth:920,margin:"0 auto"}}>
              {related.map(p=>(
                <button key={p.id} onClick={()=>{navigate(`/blog/${p.slug}`);window.scrollTo({top:0,behavior:"instant"});}} style={{
                  background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,
                  padding:"18px 22px",cursor:"pointer",textAlign:"left",fontFamily:ds.font.body,
                  transition:"box-shadow 0.2s, border-color 0.2s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow=ds.shadow.md;e.currentTarget.style.borderColor=ds.color.redBorder;}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=ds.color.border;}}
                >
                  <div style={{fontSize:10,fontWeight:700,color:ds.color.gold,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{p.category}</div>
                  <div style={{fontFamily:ds.font.display,fontSize:15,color:ds.color.textDark,lineHeight:1.35,marginBottom:8}}>{p.title}</div>
                  <div style={{fontSize:11.5,color:ds.color.textMuted}}>{formatBlogDate(p.publishedAt)} · {p.readTime||estimateReadTime(p.content)}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <div style={{padding:"60px 28px",textAlign:"center"}}>
        <div style={{maxWidth:520,margin:"0 auto"}}>
          <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark,marginBottom:10}}>Need medical supplies or equipment?</div>
          <div style={{fontSize:14,color:ds.color.textMuted,marginBottom:20}}>Get formal quotations with BIR-compliant documentation in 24-48 hours.</div>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn variant="primary" size="md" onClick={()=>navigate("/products")}>Shop Products</Btn>
            <Btn variant="outline" size="md" onClick={()=>navigate("/quote")}>Request Quote</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
