import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ds } from "../constants/design";
import { Btn, Spinner, PageHero, Tag } from "../components/ui";
import { usePublishedPosts, formatBlogDate, estimateReadTime } from "../lib/blog";

export function BlogPage({ setPage }) {
  const navigate = useNavigate();
  const { posts, loading } = usePublishedPosts();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  
  // Get unique categories
  const allCategories = [...new Set(posts.map(p => p.category).filter(Boolean))].sort();
  
  const filtered = posts.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      p.title?.toLowerCase().includes(q) || 
      p.excerpt?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q));
    const matchesCategory = !activeCategory || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
  
  const handleArticleClick = (post) => {
    if (post?.slug) { navigate(`/blog/${post.slug}`); window.scrollTo({top:0,behavior:"instant"}); }
  };
  
  return (
    <div style={{paddingTop:67}}>
      <PageHero 
        eyebrow="Insights & News" 
        title="DMEAST Blog" 
        subtitle="Healthcare insights, industry updates, and procurement guidance for medical professionals and institutional buyers." 
      />
      
      <div style={{maxWidth:1280,margin:"0 auto",padding:"40px 28px"}}>
        
        {/* Search bar */}
        <div style={{
          background:"#fff",
          border:`1px solid ${ds.color.border}`,
          borderRadius:ds.radius.lg,
          padding:"6px 6px 6px 16px",
          display:"flex",
          alignItems:"center",
          gap:10,
          boxShadow:ds.shadow.xs,
          marginBottom:20,
          maxWidth:600,
        }}>
          <span style={{fontSize:18,color:ds.color.textMuted}}>🔍</span>
          <input 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
            placeholder="Search articles…"
            style={{
              flex:1,border:"none",fontSize:14,outline:"none",
              fontFamily:ds.font.body,color:ds.color.textDark,
              background:"transparent",padding:"8px 0",
            }}
          />
          {search && (
            <button onClick={()=>setSearch("")} style={{background:"none",border:"none",fontSize:18,color:ds.color.textMuted,cursor:"pointer",padding:"0 8px"}}>✕</button>
          )}
        </div>
        
        {/* Category pills */}
        {allCategories.length > 0 && (
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>
            <button onClick={()=>setActiveCategory(null)} style={{
              padding:"7px 14px",borderRadius:ds.radius.pill,
              border:`1.5px solid ${!activeCategory?ds.color.red:ds.color.border}`,
              background:!activeCategory?ds.color.red:"#fff",
              color:!activeCategory?"#fff":ds.color.textBody,
              cursor:"pointer",fontSize:12.5,fontWeight:600,fontFamily:ds.font.body,
            }}>All Articles</button>
            {allCategories.map(c => (
              <button key={c} onClick={()=>setActiveCategory(c)} style={{
                padding:"7px 14px",borderRadius:ds.radius.pill,
                border:`1.5px solid ${activeCategory===c?ds.color.gold:ds.color.border}`,
                background:activeCategory===c?ds.color.gold:"#fff",
                color:activeCategory===c?"#fff":ds.color.textBody,
                cursor:"pointer",fontSize:12.5,fontWeight:600,fontFamily:ds.font.body,
              }}>{c}</button>
            ))}
          </div>
        )}
        
        {/* Loading state */}
        {loading && (
          <div style={{textAlign:"center",padding:"60px 0",color:ds.color.textMuted}}>
            Loading articles…
          </div>
        )}
        
        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{textAlign:"center",padding:"60px 28px",background:ds.color.canvas,borderRadius:ds.radius.lg,border:`1px solid ${ds.color.border}`}}>
            <div style={{fontSize:48,marginBottom:14,opacity:0.6}}>📝</div>
            <div style={{fontSize:16,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>
              {posts.length === 0 ? "No articles yet" : "No matching articles"}
            </div>
            <div style={{fontSize:13.5,color:ds.color.textMuted,marginBottom:20,maxWidth:380,margin:"0 auto 20px"}}>
              {posts.length === 0 ? "Check back soon — we're working on insightful content for medical professionals." : "Try different keywords or browse all articles."}
            </div>
            {posts.length > 0 && (
              <Btn variant="primary" size="sm" onClick={()=>{setSearch("");setActiveCategory(null);}}>Show All Articles</Btn>
            )}
          </div>
        )}
        
        {/* Article grid */}
        {!loading && filtered.length > 0 && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:24}}>
            {filtered.map(post => (
              <article key={post.id} 
                onClick={()=>handleArticleClick(post)}
                style={{
                  background:"#fff",
                  border:`1px solid ${ds.color.border}`,
                  borderRadius:ds.radius.lg,
                  overflow:"hidden",
                  cursor:"pointer",
                  transition:"transform 0.2s, box-shadow 0.2s, border-color 0.2s",
                  display:"flex",
                  flexDirection:"column",
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=ds.shadow.md;e.currentTarget.style.borderColor=ds.color.redBorder;}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=ds.color.border;}}
              >
                {/* Featured image */}
                <div style={{
                  width:"100%",
                  height:180,
                  background:post.featuredImage ? `url(${post.featuredImage}) center/cover no-repeat` : `linear-gradient(135deg, ${ds.color.redLight} 0%, ${ds.color.goldLight} 100%)`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}>
                  {!post.featuredImage && <span style={{fontSize:56,opacity:0.4}}>📰</span>}
                </div>
                
                {/* Content */}
                <div style={{padding:"20px 22px",flex:1,display:"flex",flexDirection:"column"}}>
                  {/* Category + date */}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,fontSize:11,color:ds.color.textMuted}}>
                    {post.category && (
                      <span style={{color:ds.color.gold,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>
                        {post.category}
                      </span>
                    )}
                    {post.category && <span style={{opacity:0.4}}>·</span>}
                    <span>{formatBlogDate(post.publishedAt)}</span>
                  </div>
                  
                  {/* Title */}
                  <h3 style={{
                    fontFamily:ds.font.display,
                    fontSize:18,
                    color:ds.color.textDark,
                    lineHeight:1.3,
                    marginBottom:10,
                    fontWeight:400,
                  }}>{post.title}</h3>
                  
                  {/* Excerpt */}
                  <p style={{
                    fontSize:13.5,
                    color:ds.color.textMuted,
                    lineHeight:1.6,
                    marginBottom:16,
                    flex:1,
                    display:"-webkit-box",
                    WebkitLineClamp:3,
                    WebkitBoxOrient:"vertical",
                    overflow:"hidden",
                  }}>{post.excerpt}</p>
                  
                  {/* Read more */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,color:ds.color.textLight,paddingTop:14,borderTop:`1px solid ${ds.color.borderLight}`}}>
                    <span>📖 {post.readTime || estimateReadTime(post.content)}</span>
                    <span style={{color:ds.color.red,fontWeight:700}}>Read article →</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        
        {/* Bottom CTA */}
        {!loading && filtered.length > 0 && (
          <div style={{marginTop:60,padding:"32px",background:`linear-gradient(135deg, ${ds.color.canvasWarm} 0%, ${ds.color.canvasGold} 100%)`,borderRadius:ds.radius.xl,border:`1px solid ${ds.color.goldBorder}`,textAlign:"center"}}>
            <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark,marginBottom:10}}>Have questions about medical procurement?</div>
            <div style={{fontSize:14,color:ds.color.textMuted,marginBottom:18,maxWidth:520,margin:"0 auto 18px"}}>Our team responds to inquiries within 24-48 hours with formal quotations and BIR-compliant documentation.</div>
            <Btn variant="gold" size="md" onClick={()=>setPage("quote")}>Request a Quote →</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

export default BlogPage;
