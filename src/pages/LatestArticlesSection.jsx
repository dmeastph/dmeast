import { useNavigate } from "react-router-dom";
import { ds } from "../constants/design";
import { Btn, Tag, SectionHeader } from "../components/ui";
import { usePublishedPosts, formatBlogDate, estimateReadTime } from "../lib/blog";

export function LatestArticlesSection({ setPage }) {
  const navigate = useNavigate();
  const { posts, loading } = usePublishedPosts();
  const featured = posts.slice(0, 3);
  
  if (loading || featured.length === 0) return null;
  
  return (
    <section style={{background:ds.color.white,padding:"64px 28px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32,flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:ds.color.gold,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>📝 From Our Blog</div>
            <h2 style={{fontFamily:ds.font.display,fontSize:"clamp(1.6rem,3vw,2.2rem)",color:ds.color.textDark,fontWeight:400,marginBottom:6}}>Latest Insights</h2>
            <p style={{fontSize:14,color:ds.color.textMuted,maxWidth:520}}>Healthcare industry updates and procurement guidance.</p>
          </div>
          <button onClick={()=>setPage("blog")} style={{background:"none",border:"none",color:ds.color.red,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:ds.font.body,padding:"6px 0"}}>
            View All Articles →
          </button>
        </div>
        
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:18}}>
          {featured.map(post => (
            <article key={post.id} 
              onClick={()=>{if(post?.slug){navigate(`/blog/${post.slug}`);window.scrollTo({top:0,behavior:"instant"});}}}
              style={{
                background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,
                overflow:"hidden",cursor:"pointer",transition:"all 0.2s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=ds.shadow.md;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}
            >
              <div style={{
                width:"100%",height:160,
                background:post.featuredImage ? `url(${post.featuredImage}) center/cover no-repeat` : `linear-gradient(135deg, ${ds.color.redLight} 0%, ${ds.color.goldLight} 100%)`,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                {!post.featuredImage && <span style={{fontSize:42,opacity:0.4}}>📰</span>}
              </div>
              <div style={{padding:"18px 20px"}}>
                {post.category && <div style={{fontSize:10,fontWeight:700,color:ds.color.gold,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>{post.category}</div>}
                <h3 style={{fontFamily:ds.font.display,fontSize:16,color:ds.color.textDark,lineHeight:1.3,marginBottom:8,fontWeight:400}}>{post.title}</h3>
                <p style={{fontSize:13,color:ds.color.textMuted,lineHeight:1.55,marginBottom:12,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{post.excerpt}</p>
                <div style={{fontSize:11.5,color:ds.color.textLight,display:"flex",justifyContent:"space-between"}}>
                  <span>{formatBlogDate(post.publishedAt)}</span>
                  <span>{post.readTime || estimateReadTime(post.content)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

