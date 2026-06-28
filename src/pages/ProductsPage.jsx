import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ds } from "../constants/design";
import { PUBLIC_CATEGORIES, filterPharmaPublic } from "../constants/categories";
import { useProducts } from "../context/ProductsContext";
import { Btn, Spinner, PageHero } from "../components/ui";
import { ProductCard } from "../components/ProductCard";
import { CategoryCard } from "../components/CategoryCard";

export function ProductsPage({setPage,addToCart,wishlist,toggleWishlist}){
  const { products: PRODUCTS } = useProducts();
  const [searchParams,setSearchParams]=useSearchParams();
  const [search,setSearch]=useState(()=>searchParams.get("q")||"");
  const [cat,setCat]=useState(searchParams.get("cat")||null);
  const [showAll,setShowAll]=useState(false);
  const [sortBy,setSortBy]=useState("default"); // default | price-asc | price-desc | name

  const shopCats = PUBLIC_CATEGORIES.filter(c=>!c.institutional);
  const institutionalCats = PUBLIC_CATEGORIES.filter(c=>c.institutional);
  const isInstitutionalCat = cat && PUBLIC_CATEGORIES.find(c=>c.id===cat)?.institutional;

  let filtered=filterPharmaPublic(PRODUCTS).filter(p=>{
    const mc=!cat||p.category===cat;
    const q=search.toLowerCase();
    const ms=!q||p.name.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q)||p.tag.toLowerCase().includes(q);
    const notInstit = showAll||cat||q ? true : !PUBLIC_CATEGORIES.find(c=>c.id===p.category)?.institutional;
    return mc&&ms&&notInstit;
  });

  // Sort
  if(sortBy==="price-asc")  filtered = [...filtered].sort((a,b)=>(a.price||0)-(b.price||0));
  if(sortBy==="price-desc") filtered = [...filtered].sort((a,b)=>(b.price||0)-(a.price||0));
  if(sortBy==="name")       filtered = [...filtered].sort((a,b)=>a.name.localeCompare(b.name));

  const shopProductCount = filterPharmaPublic(PRODUCTS).filter(p=>!PUBLIC_CATEGORIES.find(c=>c.id===p.category)?.institutional).length;
  const clearFilters = ()=>{setSearch("");setCat(null);setSortBy("default");setShowAll(false);setSearchParams({});};
  const hasActiveFilters = !!cat || !!search || sortBy!=="default";

  return(
    <div style={{paddingTop:67}}>
      <PageHero eyebrow="Online Shop" title="Healthcare Products & Medical Supplies" subtitle={`${shopProductCount}+ products available for direct purchase with nationwide delivery.`}/>
      
      <div style={{maxWidth:1280,margin:"0 auto",padding:"32px 28px"}}>
        
        {/* Search bar - prominent at top */}
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
        }}>
          <span style={{fontSize:18,color:ds.color.textMuted}}>🔍</span>
          <input 
            value={search} 
            onChange={e=>{setSearch(e.target.value);const v=e.target.value;const next=new URLSearchParams(searchParams);if(v){next.set("q",v);}else{next.delete("q");}setSearchParams(next,{replace:true});}} 
            placeholder="Search by product name, description, or category…"
            style={{
              flex:1,
              border:"none",
              fontSize:14,
              outline:"none",
              fontFamily:ds.font.body,
              color:ds.color.textDark,
              background:"transparent",
              padding:"8px 0",
            }}
          />
          {search && (
            <button onClick={()=>{setSearch("");const next=new URLSearchParams(searchParams);next.delete("q");setSearchParams(next,{replace:true});}} style={{background:"none",border:"none",fontSize:18,color:ds.color.textMuted,cursor:"pointer",padding:"0 8px"}}>✕</button>
          )}
        </div>

        {/* Category pill nav - horizontal scroll on mobile */}
        <div style={{
          display:"flex",
          gap:8,
          marginBottom:18,
          flexWrap:"nowrap",
          overflowX:"auto",
          paddingBottom:6,
          WebkitOverflowScrolling:"touch",
        }} className="dm-cat-pills">
          <button onClick={()=>{setCat(null);setCat(null);setSearchParams({});}} style={{
            padding:"8px 16px",
            borderRadius:ds.radius.pill,
            border:`1.5px solid ${!cat?ds.color.red:ds.color.border}`,
            background:!cat?ds.color.red:"#fff",
            color:!cat?"#fff":ds.color.textBody,
            cursor:"pointer",
            fontSize:13,
            fontWeight:600,
            fontFamily:ds.font.body,
            whiteSpace:"nowrap",
            flexShrink:0,
            transition:"all 0.15s",
          }}>All Products</button>
          {shopCats.map(c=>(
            <button key={c.id} onClick={()=>{setCat(c.id);setSearchParams({cat:c.id});}} style={{
              padding:"8px 14px",
              borderRadius:ds.radius.pill,
              border:`1.5px solid ${cat===c.id?c.accent:ds.color.border}`,
              background:cat===c.id?c.accent:"#fff",
              color:cat===c.id?"#fff":ds.color.textBody,
              cursor:"pointer",
              fontSize:13,
              fontWeight:600,
              fontFamily:ds.font.body,
              whiteSpace:"nowrap",
              flexShrink:0,
              display:"flex",
              alignItems:"center",
              gap:6,
              transition:"all 0.15s",
            }}>
              <span style={{fontSize:14}}>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
          {showAll && institutionalCats.map(c=>(
            <button key={c.id} onClick={()=>{setCat(c.id);setSearchParams({cat:c.id});}} style={{
              padding:"8px 14px",
              borderRadius:ds.radius.pill,
              border:`1.5px solid ${cat===c.id?ds.color.gold:ds.color.goldBorder}`,
              background:cat===c.id?ds.color.gold:ds.color.goldLight,
              color:cat===c.id?"#fff":ds.color.gold,
              cursor:"pointer",
              fontSize:13,
              fontWeight:600,
              fontFamily:ds.font.body,
              whiteSpace:"nowrap",
              flexShrink:0,
              display:"flex",
              alignItems:"center",
              gap:6,
            }}>
              <span style={{fontSize:14}}>{c.icon}</span>
              <span>{c.label}</span>
              <span style={{fontSize:9,padding:"2px 6px",background:cat===c.id?"rgba(255,255,255,0.25)":ds.color.gold+"33",borderRadius:ds.radius.pill,fontWeight:700,letterSpacing:"0.04em"}}>BIZ</span>
            </button>
          ))}
        </div>

        {/* Institutional category banner */}
        {isInstitutionalCat && (
          <div style={{background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.lg,padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
            <div style={{fontSize:13.5,color:ds.color.gold}}>
              <strong>ℹ️ Institutional Category:</strong> Items are available through formal quotation. <button onClick={()=>setPage("institutional")} style={{background:"none",border:"none",color:ds.color.gold,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body,fontSize:13.5,textDecoration:"underline"}}>Learn more →</button>
            </div>
            <Btn variant="gold" size="sm" onClick={()=>setPage("quote")}>Request a Quote</Btn>
          </div>
        )}

        {/* Result count + sort row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:13,color:ds.color.textMuted}}>
            <strong style={{color:ds.color.textDark}}>{filtered.length}</strong> product{filtered.length!==1?"s":""} 
            {cat && <> in <strong style={{color:ds.color.textDark}}>{PUBLIC_CATEGORIES.find(c=>c.id===cat)?.label}</strong></>}
            {search && <> matching "<strong style={{color:ds.color.textDark}}>{search}</strong>"</>}
            {hasActiveFilters && (
              <button onClick={clearFilters} style={{marginLeft:10,background:"none",border:"none",color:ds.color.red,fontWeight:600,cursor:"pointer",fontSize:12,fontFamily:ds.font.body,textDecoration:"underline"}}>Clear filters</button>
            )}
          </div>
          
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:12.5,color:ds.color.textMuted,fontWeight:500}}>Sort:</span>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{
              padding:"7px 12px",
              border:`1.5px solid ${ds.color.border}`,
              borderRadius:ds.radius.sm,
              fontSize:13,
              outline:"none",
              fontFamily:ds.font.body,
              background:"#fff",
              cursor:"pointer",
              color:ds.color.textBody,
            }}>
              <option value="default">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Show institutional toggle */}
        {!showAll&&!cat&&!search&&(
          <div style={{textAlign:"center",marginBottom:20}}>
            <button onClick={()=>setShowAll(true)} style={{background:ds.color.canvas,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.pill,padding:"6px 16px",cursor:"pointer",fontSize:12,color:ds.color.textBody,fontFamily:ds.font.body,fontWeight:600}}>+ Show institutional categories</button>
          </div>
        )}

        {/* Product grid */}
        <div className="dm-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16}}>
          {filtered.map(p=><ProductCard key={p.id} product={p} addToCart={addToCart} setPage={setPage} wishlist={wishlist} toggleWishlist={toggleWishlist}/>)}
        </div>

        {/* Empty state */}
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"60px 28px",background:ds.color.canvas,borderRadius:ds.radius.lg,border:`1px solid ${ds.color.border}`}}>
            <div style={{fontSize:48,marginBottom:14,opacity:0.6}}>🔍</div>
            <div style={{fontSize:16,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>No products found</div>
            <div style={{fontSize:13.5,color:ds.color.textMuted,marginBottom:20,maxWidth:380,margin:"0 auto 20px"}}>
              {search ? `We couldn't find anything matching "${search}". Try different keywords or browse by category.` : "Try selecting a different category or clearing your filters."}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <Btn variant="primary" size="sm" onClick={clearFilters}>Clear Filters</Btn>
              <Btn variant="outline" size="sm" onClick={()=>setPage("quote")}>Request a Quote Instead</Btn>
            </div>
          </div>
        )}

        {/* Bottom institutional CTA */}
        {!isInstitutionalCat&&filtered.length>0&&(
          <div style={{marginTop:48,padding:"28px 32px",background:`linear-gradient(135deg, ${ds.color.canvasWarm} 0%, ${ds.color.canvasGold} 100%)`,borderRadius:ds.radius.xl,border:`1px solid ${ds.color.goldBorder}`,textAlign:"center"}}>
            <div style={{fontSize:15,fontWeight:700,color:ds.color.textDark,marginBottom:6}}>Need hospital equipment, imaging systems, or specialized devices?</div>
            <div style={{fontSize:13.5,color:ds.color.textMuted,marginBottom:16}}>Institutional and bulk orders are handled separately with formal BIR-compliant quotation.</div>
            <Btn variant="gold" size="md" onClick={()=>setPage("quote")}>Request Bulk Quote →</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductsPage;
