import { useState } from "react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { formatBlogDate, estimateReadTime } from "../../lib/blog";
import { Btn, Tag } from "../ui";
import { PostEditorModal } from "./PostEditorModal";

export function PostsTab({ posts, refreshPosts, userRole }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | published | draft
  const [editingPost, setEditingPost] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  
  const filtered = posts.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      p.title?.toLowerCase().includes(q) ||
      p.excerpt?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  const handleDelete = async (postId, postTitle) => {
    if (!confirm(`Delete article "${postTitle}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      await refreshPosts();
    } catch(e) {
      alert("Failed to delete: " + e.message);
    }
  };
  
  const handleNewPost = () => {
    setEditingPost(null);
    setShowEditor(true);
  };
  
  const handleEdit = (post) => {
    setEditingPost(post);
    setShowEditor(true);
  };
  
  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingPost(null);
  };
  
  const handleEditorSaved = async () => {
    setShowEditor(false);
    setEditingPost(null);
    await refreshPosts();
  };
  
  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark}}>📝 Blog Articles ({posts.length})</div>
          <div style={{fontSize:12.5,color:ds.color.textMuted,marginTop:4}}>
            {posts.filter(p=>p.status==="published").length} published · {posts.filter(p=>p.status==="draft").length} drafts
          </div>
        </div>
        <Btn variant="primary" size="sm" onClick={handleNewPost}>+ New Article</Btn>
      </div>
      
      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search articles…" style={{flex:1,minWidth:200,padding:"9px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.sm,fontSize:13,outline:"none",fontFamily:ds.font.body}}/>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:"9px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.sm,fontSize:13,outline:"none",fontFamily:ds.font.body,background:"#fff",cursor:"pointer"}}>
          <option value="all">All ({posts.length})</option>
          <option value="published">Published ({posts.filter(p=>p.status==="published").length})</option>
          <option value="draft">Drafts ({posts.filter(p=>p.status==="draft").length})</option>
        </select>
      </div>
      
      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{textAlign:"center",padding:"50px 28px",background:ds.color.canvas,borderRadius:ds.radius.lg,border:`1px solid ${ds.color.border}`}}>
          <div style={{fontSize:42,marginBottom:12,opacity:0.5}}>📝</div>
          <div style={{fontSize:15,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>
            {posts.length === 0 ? "No articles yet" : "No matching articles"}
          </div>
          <div style={{fontSize:13,color:ds.color.textMuted,marginBottom:18}}>
            {posts.length === 0 ? "Click '+ New Article' to publish your first blog post." : "Try a different search or filter."}
          </div>
          {posts.length === 0 && <Btn variant="primary" size="sm" onClick={handleNewPost}>+ Create First Article</Btn>}
        </div>
      )}
      
      {/* Article list */}
      {filtered.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(post => (
            <div key={post.id} style={{
              background:"#fff",
              border:`1px solid ${ds.color.border}`,
              borderRadius:ds.radius.md,
              padding:"16px 20px",
              display:"grid",
              gridTemplateColumns:"1fr auto",
              gap:14,
              alignItems:"center",
            }}>
              <div style={{minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                  <span style={{
                    fontSize:9.5,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",
                    padding:"3px 8px",borderRadius:ds.radius.pill,
                    background: post.status==="published" ? ds.color.successBg : ds.color.canvas,
                    color: post.status==="published" ? ds.color.success : ds.color.textMuted,
                    border: `1px solid ${post.status==="published" ? ds.color.successBorder : ds.color.border}`,
                  }}>{post.status === "published" ? "✓ PUBLISHED" : "DRAFT"}</span>
                  {post.category && <span style={{fontSize:10,color:ds.color.gold,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>{post.category}</span>}
                  {post.publishedAt && <span style={{fontSize:11,color:ds.color.textMuted}}>{formatBlogDate(post.publishedAt)}</span>}
                </div>
                <div style={{fontSize:14,fontWeight:700,color:ds.color.textDark,marginBottom:3}}>{post.title}</div>
                <div style={{fontSize:12,color:ds.color.textMuted,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:1,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{post.excerpt}</div>
                <div style={{fontSize:10.5,color:ds.color.textLight,marginTop:5}}>
                  /blog/{post.slug || "no-slug"} · {post.readTime || estimateReadTime(post.content)} · by {post.author || "—"}
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>handleEdit(post)} style={{padding:"6px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,color:ds.color.textBody,fontFamily:ds.font.body}}>✏️ Edit</button>
                <button onClick={()=>handleDelete(post.id, post.title)} style={{padding:"6px 12px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.redBorder}`,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,color:ds.color.red,fontFamily:ds.font.body}}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Editor modal */}
      {showEditor && (
        <PostEditorModal post={editingPost} onClose={handleEditorClose} onSaved={handleEditorSaved}/>
      )}
    </div>
  );
}

