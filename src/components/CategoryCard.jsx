import { ds } from "../constants/design";
import { filterPharmaPublic } from "../constants/categories";
import { useProducts } from "../context/ProductsContext";

export function CategoryCard({cat,onClick}){
  const { products: PRODUCTS } = useProducts();
  return(
    <button onClick={onClick} className="dm-card-hover" style={{background:ds.color.white,border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,overflow:"hidden",textAlign:"left",boxShadow:ds.shadow.xs,padding:0,width:"100%"}}>
      <div style={{height:5,background:`linear-gradient(90deg,${cat.color},${cat.accent})`}}/>
      <div style={{padding:"20px 22px 22px"}}>
        <div style={{fontSize:22,marginBottom:8}}>{cat.icon}</div>
        <div style={{fontSize:13.5,fontWeight:600,color:ds.color.textDark,marginBottom:5}}>{cat.label}</div>
        <div style={{fontSize:12,color:ds.color.textMuted}}>{filterPharmaPublic(PRODUCTS).filter(p=>p.category===cat.id).length} products available</div>
        <div style={{marginTop:12,fontSize:12,fontWeight:700,color:cat.accent}}>Explore →</div>
      </div>
    </button>
  );
}

