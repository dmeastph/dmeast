import { useState, useEffect } from "react";
import { doc, addDoc, collection, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { slugify, estimateReadTime } from "../../lib/blog";
import { Btn, Spinner } from "../ui";

export function PostEditorModal({ post, onClose, onSaved }) {
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [category, setCategory] = useState(post?.category || "Industry Insights");
  const [tags, setTags] = useState((post?.tags || []).join(", "));
  const [author, setAuthor] = useState(post?.author || "DMEAST Team");
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage || "");
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription || "");
  const [status, setStatus] = useState(post?.status || "draft");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [autoSlug, setAutoSlug] = useState(!post?.slug);
  
  // Auto-generate slug from title (until user manually edits slug)
  useEffect(() => {
    if (autoSlug) setSlug(slugify(title));
  }, [title, autoSlug]);
  
  const PRESET_CATEGORIES = ["Industry Insights", "Procurement Guide", "Healthcare Tips", "Company News", "Regulatory Updates", "Product Spotlight"];
  
  const handleSave = async (publishNow) => {
    setErrMsg("");
    if (!title.trim()) { setErrMsg("Title is required"); return; }
    if (!content.trim()) { setErrMsg("Content cannot be empty"); return; }
    if (!slug.trim()) { setErrMsg("Slug is required (auto-generated from title)"); return; }
    
    setSaving(true);
    try {
      const finalSlug = slugify(slug);
      const finalStatus = publishNow ? "published" : status;
      const tagArr = tags.split(",").map(t=>t.trim()).filter(Boolean);
      
      const data = {
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt.trim() || title.trim(),
        content: content,
        category: category,
        tags: tagArr,
        author: author.trim() || "DMEAST Team",
        featuredImage: featuredImage.trim(),
        metaDescription: metaDescription.trim() || excerpt.trim() || title.trim(),
        readTime: estimateReadTime(content),
        status: finalStatus,
        updatedAt: serverTimestamp(),
      };
      
      // Set publishedAt if publishing for first time
      if (finalStatus === "published" && (!post || post.status !== "published")) {
        data.publishedAt = serverTimestamp();
      } else if (post?.publishedAt) {
        data.publishedAt = post.publishedAt;
      }
      
      if (post?.id) {
        await updateDoc(doc(db, "posts", post.id), data);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "posts"), data);
      }
      
      onSaved();
    } catch(e) {
      console.error("Save failed:", e);
      setErrMsg("Failed to save: " + e.message);
    }
    setSaving(false);
  };
  
  const inp = {width:"100%",padding:"10px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.sm,fontSize:13.5,outline:"none",fontFamily:ds.font.body,boxSizing:"border-box"};
  const lbl = {display:"block",fontSize:11.5,fontWeight:600,color:ds.color.textBody,marginBottom:6,letterSpacing:"0.02em"};
  
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,maxWidth:920,width:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:ds.shadow.lg}}>
        {/* Header */}
        <div style={{padding:"22px 28px",borderBottom:`1px solid ${ds.color.borderLight}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div>
            <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark}}>{post ? "✏️ Edit Article" : "📝 New Article"}</div>
            <div style={{fontSize:12,color:ds.color.textMuted,marginTop:3}}>{post ? `Editing: ${post.title}` : "Create a new blog post"}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:ds.color.textMuted,padding:6}}>✕</button>
        </div>
        
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
          {errMsg && <div style={{padding:"10px 14px",background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.sm,color:ds.color.red,fontSize:13,marginBottom:18}}>{errMsg}</div>}
          
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px"}}>
            {/* Title */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Article Title *</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g., 10 Essential Medical Supplies Every Philippine LGU Should Stock" style={inp}/>
            </div>
            
            {/* Slug */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>URL Slug * <span style={{color:ds.color.textMuted,fontWeight:400}}>(auto-generated from title)</span></label>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:13,color:ds.color.textMuted,padding:"10px 0"}}>dmeastph.com/blog/</span>
                <input value={slug} onChange={e=>{setSlug(e.target.value);setAutoSlug(false);}} placeholder="article-url-slug" style={{...inp,flex:1}}/>
                <button onClick={()=>{setAutoSlug(true);setSlug(slugify(title));}} style={{padding:"8px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.textMuted,fontFamily:ds.font.body,whiteSpace:"nowrap"}}>↻ Auto</button>
              </div>
            </div>
            
            {/* Excerpt */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Excerpt / Summary <span style={{color:ds.color.textMuted,fontWeight:400}}>(shown in article cards, ~150 chars)</span></label>
              <textarea value={excerpt} onChange={e=>setExcerpt(e.target.value)} rows={2} placeholder="Brief summary of the article — appears on the blog listing page and in social previews." style={{...inp,resize:"vertical",fontFamily:ds.font.body}}/>
              <div style={{fontSize:11,color:ds.color.textLight,marginTop:4,textAlign:"right"}}>{excerpt.length} / 200 characters</div>
            </div>
            
            {/* Category */}
            <div>
              <label style={lbl}>Category</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} style={{...inp,cursor:"pointer"}}>
                {PRESET_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            {/* Author */}
            <div>
              <label style={lbl}>Author</label>
              <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="DMEAST Team" style={inp}/>
            </div>
            
            {/* Tags */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Tags <span style={{color:ds.color.textMuted,fontWeight:400}}>(comma-separated, e.g.: BIR, procurement, LGU)</span></label>
              <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="medical supplies, Philippines, LGU, BIR" style={inp}/>
            </div>
            
            {/* Featured image URL */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Featured Image URL <span style={{color:ds.color.textMuted,fontWeight:400}}>(optional, paste an image URL)</span></label>
              <input value={featuredImage} onChange={e=>setFeaturedImage(e.target.value)} placeholder="https://..." style={inp}/>
              {featuredImage && (
                <div style={{marginTop:8,padding:8,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.sm,background:ds.color.canvas}}>
                  <div style={{width:"100%",aspectRatio:"16/9",background:`url(${featuredImage}) center/cover no-repeat`,borderRadius:ds.radius.sm}}/>
                </div>
              )}
            </div>
            
            {/* Content */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Article Content (HTML supported) *</label>
              <textarea value={content} onChange={e=>setContent(e.target.value)} rows={14} placeholder={`Write your article here. You can use HTML tags:\n\n<h2>Section Heading</h2>\n<p>A paragraph of text.</p>\n<p><strong>Bold</strong> or <em>italic</em>.</p>\n<ul>\n  <li>Bullet point</li>\n  <li>Another point</li>\n</ul>\n<a href="https://...">Link</a>\n<img src="https://..." alt="..."/>`} style={{...inp,fontFamily:"ui-monospace, monospace",fontSize:12.5,resize:"vertical"}}/>
              <div style={{fontSize:11,color:ds.color.textLight,marginTop:6,lineHeight:1.5}}>
                💡 <strong>Tip:</strong> Use HTML tags for formatting. Common: <code style={{background:ds.color.canvas,padding:"1px 4px",borderRadius:3}}>&lt;h2&gt;</code>, <code style={{background:ds.color.canvas,padding:"1px 4px",borderRadius:3}}>&lt;p&gt;</code>, <code style={{background:ds.color.canvas,padding:"1px 4px",borderRadius:3}}>&lt;strong&gt;</code>, <code style={{background:ds.color.canvas,padding:"1px 4px",borderRadius:3}}>&lt;ul&gt;&lt;li&gt;</code>, <code style={{background:ds.color.canvas,padding:"1px 4px",borderRadius:3}}>&lt;a href=""&gt;</code>
              </div>
              <div style={{fontSize:11,color:ds.color.textLight,marginTop:4,textAlign:"right"}}>
                {content.replace(/<[^>]+>/g," ").trim().split(/\s+/).filter(Boolean).length} words · {estimateReadTime(content)}
              </div>
            </div>
            
            {/* SEO Meta description */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl}>Meta Description (SEO) <span style={{color:ds.color.textMuted,fontWeight:400}}>(150-160 chars optimal)</span></label>
              <textarea value={metaDescription} onChange={e=>setMetaDescription(e.target.value)} rows={2} placeholder="Description shown in Google search results and social media previews. If left blank, the excerpt will be used." style={{...inp,resize:"vertical",fontFamily:ds.font.body}}/>
              <div style={{fontSize:11,color:metaDescription.length>160?ds.color.red:ds.color.textLight,marginTop:4,textAlign:"right"}}>{metaDescription.length} / 160 characters {metaDescription.length>160 && "⚠️ too long"}</div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div style={{padding:"18px 28px",borderTop:`1px solid ${ds.color.borderLight}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{fontSize:12,color:ds.color.textMuted}}>
            Status: <strong style={{color: status === "published" ? ds.color.success : ds.color.textBody}}>{status === "published" ? "Published" : "Draft"}</strong>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="outline" size="md" disabled={saving} onClick={onClose}>Cancel</Btn>
            <Btn variant="secondary" size="md" disabled={saving} onClick={()=>handleSave(false)}>{saving?"Saving…":"💾 Save as Draft"}</Btn>
            <Btn variant="primary" size="md" disabled={saving} onClick={()=>handleSave(true)}>{saving?"Saving…":"🚀 Publish"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

