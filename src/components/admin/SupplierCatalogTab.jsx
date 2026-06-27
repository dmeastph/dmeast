import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, addDoc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { formatPHP } from "../../utils/format";
import { CATEGORIES } from "../../constants/categories";
import { Btn, Spinner, Tag } from "../ui";

export function SupplierCatalogTab(){
  const [suppliers,setSuppliers]=useState([]);
  const [products,setProducts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState("suppliers"); // "suppliers" | "products" | "add_supplier" | "edit_supplier" | "add_product" | "edit_product"
  const [selected,setSelected]=useState(null); // selected supplier or product for editing
  const [filterSupplier,setFilterSupplier]=useState("all");
  const [importing,setImporting]=useState(false);
  const [importMsg,setImportMsg]=useState("");
  const [saving,setSaving]=useState(false);
  const [errMsg,setErrMsg]=useState("");
  const [search,setSearch]=useState("");

  // Supplier form state
  const [sf,setSf]=useState({id:"",name:"",address:"",contact:"",phone:"",email:"",category:"medicine",paymentTerms:"",leadDays:"",notes:""});
  // Product form state
  const [pf,setPf]=useState({id:"",supplierId:"",genericName:"",brandName:"",description:"",strength:"",form:"",packSize:"",uom:"box",category:"medicine",subcategory:"",acqPrice:"",currency:"PHP",stockStatus:"available",expiryDate:"",marginOverride:"",imageUrl:"",notes:""});

  const loadData=async()=>{
    setLoading(true);
    try{
      const sSnap=await getDocs(collection(db,"suppliers"));
      const pSnap=await getDocs(collection(db,"supplier_products"));
      setSuppliers(sSnap.docs.map(d=>({id:d.id,...d.data()})));
      setProducts(pSnap.docs.map(d=>({id:d.id,...d.data()})));
    }catch(e){setErrMsg("Load failed: "+e.message);}
    setLoading(false);
  };

  useEffect(()=>{loadData();},[]);

  const resetSf=()=>setSf({id:"",name:"",address:"",contact:"",phone:"",email:"",category:"medicine",paymentTerms:"",leadDays:"",notes:""});
  const resetPf=()=>setPf({id:"",supplierId:filterSupplier!=="all"?filterSupplier:"",genericName:"",brandName:"",description:"",strength:"",form:"",packSize:"",uom:"box",category:"medicine",subcategory:"",acqPrice:"",currency:"PHP",stockStatus:"available",expiryDate:"",marginOverride:"",imageUrl:"",notes:""});

  const editSupplier=(s)=>{setSf({...s});setView("edit_supplier");};
  const editProduct=(p)=>{setPf({...p});setView("edit_product");};

  const saveSupplier=async()=>{
    if(!sf.name.trim()){setErrMsg("Supplier name is required.");return;}
    setSaving(true);setErrMsg("");
    try{
      const sid=sf.id||("SUP"+Date.now().toString().slice(-6));
      await setDoc(doc(db,"suppliers",sid),{...sf,id:sid,updatedAt:new Date().toISOString()});
      await loadData();
      setView("suppliers");resetSf();
    }catch(e){setErrMsg("Save failed: "+e.message);}
    setSaving(false);
  };

  const saveProduct=async()=>{
    if(!pf.genericName.trim()){setErrMsg("Generic name is required.");return;}
    if(!pf.supplierId){setErrMsg("Supplier is required.");return;}
    setSaving(true);setErrMsg("");
    try{
      const pid=pf.id||("PRD"+Date.now().toString().slice(-6));
      await setDoc(doc(db,"supplier_products",pid),{...pf,id:pid,acqPrice:pf.acqPrice?Number(pf.acqPrice):null,marginOverride:pf.marginOverride?Number(pf.marginOverride):null,updatedAt:new Date().toISOString()});
      await loadData();
      setView("products");resetPf();
    }catch(e){setErrMsg("Save failed: "+e.message);}
    setSaving(false);
  };

  const deleteSupplier=async(sid)=>{
    if(!window.confirm("Delete this supplier? Their products will remain but lose the supplier link."))return;
    await deleteDoc(doc(db,"suppliers",sid));
    await loadData();
  };

  const deleteProduct=async(pid)=>{
    if(!window.confirm("Delete this product?"))return;
    await deleteDoc(doc(db,"supplier_products",pid));
    await loadData();
  };

  // ── Excel bulk import ────────────────────────────────────────────────────
  const handleImport=async(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setImporting(true);setImportMsg("Reading file...");
    try{
      // Use Claude API to parse the Excel content via file reading
      const reader=new FileReader();
      reader.onload=async(ev)=>{
        try{
          const {read,utils}=await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
          const wb=read(ev.target.result,{type:"array"});

          let suppCount=0,prodCount=0;
          const batch=writeBatch(db);

          // Sheet: SUPPLIERS
          if(wb.SheetNames.includes("SUPPLIERS")){
            const rows=utils.sheet_to_json(wb.Sheets["SUPPLIERS"],{defval:""});
            for(const row of rows){
              const sid=String(row["SUPPLIER ID"]||row["supplier_id"]||"").trim();
              const name=String(row["SUPPLIER NAME"]||row["supplier_name"]||"").trim();
              if(!sid||!name)continue;
              batch.set(doc(db,"suppliers",sid),{
                id:sid,name,
                address:String(row["ADDRESS"]||row["address"]||""),
                contact:String(row["CONTACT PERSON"]||row["contact_person"]||""),
                phone:String(row["PHONE / EMAIL"]||row["phone"]||""),
                email:String(row["PHONE / EMAIL"]||row["email"]||""),
                category:String(row["CATEGORY"]||row["category"]||"medicine"),
                paymentTerms:String(row["PAYMENT TERMS"]||row["payment_terms"]||""),
                leadDays:Number(row["LEAD TIME (days)"]||row["lead_time_days"]||3),
                notes:String(row["NOTES"]||row["notes"]||""),
                updatedAt:new Date().toISOString(),
              });
              suppCount++;
            }
          }

          // Sheet: PRODUCTS
          if(wb.SheetNames.includes("PRODUCTS")){
            const rows=utils.sheet_to_json(wb.Sheets["PRODUCTS"],{defval:""});
            for(const row of rows){
              const pid=String(row["PRODUCT ID"]||row["product_id"]||"").trim();
              const generic=String(row["GENERIC NAME"]||row["generic_name"]||"").trim();
              if(!pid||!generic)continue;
              const price=row["ACQ. PRICE (PHP)"]||row["acquisition_price"]||row["acq_price"]||null;
              const margin=row["MARGIN OVERRIDE%"]||row["margin_override"]||null;
              batch.set(doc(db,"supplier_products",pid),{
                id:pid,
                supplierId:String(row["SUPPLIER ID"]||row["supplier_id"]||""),
                genericName:generic,
                brandName:String(row["BRAND NAME"]||row["brand_name"]||""),
                description:String(row["DESCRIPTION"]||row["description"]||""),
                strength:String(row["STRENGTH/SIZE"]||row["strength_size"]||""),
                form:String(row["FORM/DOSAGE"]||row["form"]||""),
                packSize:String(row["PACK SIZE"]||row["pack_size"]||""),
                uom:String(row["UNIT OF MEASURE"]||row["unit_of_measure"]||"box"),
                category:String(row["CATEGORY"]||row["category"]||"medicine"),
                subcategory:String(row["SUBCATEGORY"]||row["subcategory"]||""),
                acqPrice:price?Number(String(price).replace(/[^0-9.]/g,"")):null,
                currency:String(row["CURRENCY"]||row["currency"]||"PHP"),
                stockStatus:String(row["STOCK STATUS"]||row["stock_status"]||"available"),
                expiryDate:String(row["EXPIRY DATE"]||row["expiry_date"]||""),
                marginOverride:margin?Number(String(margin).replace(/[^0-9.]/g,"")):null,
                imageUrl:String(row["IMAGE URL"]||row["image_url"]||""),
                notes:String(row["NOTES"]||row["notes"]||""),
                updatedAt:new Date().toISOString(),
              });
              prodCount++;
            }
          }

          await batch.commit();
          await loadData();
          setImportMsg(`✅ Imported ${suppCount} suppliers and ${prodCount} products successfully!`);
        }catch(err){setImportMsg("❌ Import failed: "+err.message);}
        setImporting(false);
      };
      reader.readAsArrayBuffer(file);
    }catch(e){setImportMsg("❌ "+e.message);setImporting(false);}
    e.target.value="";
  };

  // ── Filtered products ────────────────────────────────────────────────────
  const filteredProducts=products.filter(p=>{
    const matchSupplier=filterSupplier==="all"||p.supplierId===filterSupplier;
    const q=search.toLowerCase();
    const matchSearch=!q||p.genericName?.toLowerCase().includes(q)||p.brandName?.toLowerCase().includes(q)||p.description?.toLowerCase().includes(q)||p.subcategory?.toLowerCase().includes(q);
    return matchSupplier&&matchSearch;
  });

  const getSupplierName=(sid)=>suppliers.find(s=>s.id===sid)?.name||sid||"—";

  const inp={width:"100%",padding:"9px 12px",borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,fontSize:13,fontFamily:ds.font.body,outline:"none",background:"#fff"};
  const lbl={fontSize:12,fontWeight:700,color:ds.color.textDark,display:"block",marginBottom:4};
  const fRow={display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:12};

  // ── Supplier form ─────────────────────────────────────────────────────────
  if(view==="add_supplier"||view==="edit_supplier"){
    return(
      <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"28px 32px",maxWidth:700}}>
        <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:20}}>
          {view==="add_supplier"?"➕ Add New Supplier":"✏️ Edit Supplier"}
        </div>
        <div style={fRow}>
          <div><label style={lbl}>Supplier ID *</label><input style={inp} value={sf.id} onChange={e=>setSf(p=>({...p,id:e.target.value}))} placeholder="e.g. SUP004" disabled={view==="edit_supplier"}/></div>
          <div><label style={lbl}>Supplier Name *</label><input style={inp} value={sf.name} onChange={e=>setSf(p=>({...p,name:e.target.value}))} placeholder="Full legal name"/></div>
        </div>
        <div style={{marginBottom:12}}><label style={lbl}>Address</label><input style={inp} value={sf.address} onChange={e=>setSf(p=>({...p,address:e.target.value}))} placeholder="Full address"/></div>
        <div style={fRow}>
          <div><label style={lbl}>Contact Person</label><input style={inp} value={sf.contact} onChange={e=>setSf(p=>({...p,contact:e.target.value}))} placeholder="Name"/></div>
          <div><label style={lbl}>Phone / Email</label><input style={inp} value={sf.phone} onChange={e=>setSf(p=>({...p,phone:e.target.value}))} placeholder="+63 2 8888 0000"/></div>
        </div>
        <div style={fRow}>
          <div><label style={lbl}>Category</label>
            <select style={{...inp,cursor:"pointer"}} value={sf.category} onChange={e=>setSf(p=>({...p,category:e.target.value}))}>
              <option value="medicine">Medicine</option>
              <option value="supply">Supply</option>
              <option value="equipment">Equipment</option>
              <option value="medicine / supply">Medicine / Supply</option>
              <option value="supply / beauty & aesthetics">Supply / Beauty & Aesthetics</option>
            </select>
          </div>
          <div><label style={lbl}>Lead Time (days)</label><input style={inp} type="number" value={sf.leadDays} onChange={e=>setSf(p=>({...p,leadDays:e.target.value}))} placeholder="3"/></div>
        </div>
        <div style={fRow}>
          <div><label style={lbl}>Payment Terms</label><input style={inp} value={sf.paymentTerms} onChange={e=>setSf(p=>({...p,paymentTerms:e.target.value}))} placeholder="e.g. 30 days / COD"/></div>
          <div><label style={lbl}>Email</label><input style={inp} value={sf.email} onChange={e=>setSf(p=>({...p,email:e.target.value}))} placeholder="orders@supplier.com"/></div>
        </div>
        <div style={{marginBottom:20}}><label style={lbl}>Notes</label><textarea style={{...inp,height:60,resize:"vertical"}} value={sf.notes} onChange={e=>setSf(p=>({...p,notes:e.target.value}))} placeholder="Any remarks (e.g. Authorized distributor)"/></div>
        {errMsg&&<div style={{padding:"8px 12px",background:ds.color.redLight,borderRadius:ds.radius.md,color:ds.color.red,fontSize:13,marginBottom:12}}>⚠️ {errMsg}</div>}
        <div style={{display:"flex",gap:10}}>
          <Btn variant="primary" size="md" onClick={saveSupplier} disabled={saving}>{saving?"Saving…":"💾 Save Supplier"}</Btn>
          <Btn variant="outline" size="md" onClick={()=>{setView("suppliers");resetSf();setErrMsg("");}}>Cancel</Btn>
        </div>
      </div>
    );
  }

  // ── Product form ──────────────────────────────────────────────────────────
  if(view==="add_product"||view==="edit_product"){
    return(
      <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"28px 32px",maxWidth:800}}>
        <div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:20}}>
          {view==="add_product"?"➕ Add New Product":"✏️ Edit Product"}
        </div>
        <div style={fRow}>
          <div><label style={lbl}>Product ID *</label><input style={inp} value={pf.id} onChange={e=>setPf(p=>({...p,id:e.target.value}))} placeholder="e.g. PRD283" disabled={view==="edit_product"}/></div>
          <div><label style={lbl}>Supplier *</label>
            <select style={{...inp,cursor:"pointer"}} value={pf.supplierId} onChange={e=>setPf(p=>({...p,supplierId:e.target.value}))}>
              <option value="">— Select Supplier —</option>
              {suppliers.map(s=><option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:12}}><label style={lbl}>Generic Name *</label><input style={inp} value={pf.genericName} onChange={e=>setPf(p=>({...p,genericName:e.target.value}))} placeholder="e.g. Amoxicillin 500mg Capsule"/></div>
        <div style={fRow}>
          <div><label style={lbl}>Brand Name</label><input style={inp} value={pf.brandName} onChange={e=>setPf(p=>({...p,brandName:e.target.value}))} placeholder="e.g. Nuevamoxil"/></div>
          <div><label style={lbl}>Description</label><input style={inp} value={pf.description} onChange={e=>setPf(p=>({...p,description:e.target.value}))} placeholder="Full description"/></div>
        </div>
        <div style={fRow}>
          <div><label style={lbl}>Strength / Size</label><input style={inp} value={pf.strength} onChange={e=>setPf(p=>({...p,strength:e.target.value}))} placeholder="e.g. 500mg"/></div>
          <div><label style={lbl}>Form / Dosage</label><input style={inp} value={pf.form} onChange={e=>setPf(p=>({...p,form:e.target.value}))} placeholder="e.g. Capsule, Tablet, Vial"/></div>
        </div>
        <div style={fRow}>
          <div><label style={lbl}>Pack Size</label><input style={inp} value={pf.packSize} onChange={e=>setPf(p=>({...p,packSize:e.target.value}))} placeholder="e.g. 100's"/></div>
          <div><label style={lbl}>Unit of Measure</label>
            <select style={{...inp,cursor:"pointer"}} value={pf.uom} onChange={e=>setPf(p=>({...p,uom:e.target.value}))}>
              {["box","bottle","vial","ampoule","tube","jar","piece","pack","syringe","canister","gallon","unit","set"].map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div style={fRow}>
          <div><label style={lbl}>Category</label>
            <select style={{...inp,cursor:"pointer"}} value={pf.category} onChange={e=>setPf(p=>({...p,category:e.target.value}))}>
              <option value="medicine">medicine</option>
              <option value="supply">supply</option>
              <option value="equipment">equipment</option>
            </select>
          </div>
          <div><label style={lbl}>Subcategory</label><input style={inp} value={pf.subcategory} onChange={e=>setPf(p=>({...p,subcategory:e.target.value}))} placeholder="e.g. antibiotics, IV fluids"/></div>
        </div>
        <div style={fRow}>
          <div><label style={lbl}>Acquisition Price (PHP)</label><input style={inp} type="number" value={pf.acqPrice} onChange={e=>setPf(p=>({...p,acqPrice:e.target.value}))} placeholder="Your cost from supplier"/></div>
          <div><label style={lbl}>Margin Override % (blank = use default)</label><input style={inp} type="number" value={pf.marginOverride} onChange={e=>setPf(p=>({...p,marginOverride:e.target.value}))} placeholder="e.g. 20 for 20%"/></div>
        </div>
        <div style={fRow}>
          <div><label style={lbl}>Stock Status</label>
            <select style={{...inp,cursor:"pointer"}} value={pf.stockStatus} onChange={e=>setPf(p=>({...p,stockStatus:e.target.value}))}>
              <option value="available">available</option>
              <option value="limited">limited</option>
              <option value="out of stock">out of stock</option>
              <option value="on-order">on-order</option>
            </select>
          </div>
          <div><label style={lbl}>Expiry Date</label><input style={inp} value={pf.expiryDate} onChange={e=>setPf(p=>({...p,expiryDate:e.target.value}))} placeholder="e.g. May-2028"/></div>
        </div>
        <div style={{marginBottom:12}}><label style={lbl}>Image URL (optional)</label><input style={inp} value={pf.imageUrl} onChange={e=>setPf(p=>({...p,imageUrl:e.target.value}))} placeholder="https://..."/></div>
        <div style={{marginBottom:20}}><label style={lbl}>Notes</label><textarea style={{...inp,height:50,resize:"vertical"}} value={pf.notes} onChange={e=>setPf(p=>({...p,notes:e.target.value}))} placeholder="Any remarks"/></div>
        {errMsg&&<div style={{padding:"8px 12px",background:ds.color.redLight,borderRadius:ds.radius.md,color:ds.color.red,fontSize:13,marginBottom:12}}>⚠️ {errMsg}</div>}
        <div style={{display:"flex",gap:10}}>
          <Btn variant="primary" size="md" onClick={saveProduct} disabled={saving}>{saving?"Saving…":"💾 Save Product"}</Btn>
          <Btn variant="outline" size="md" onClick={()=>{setView("products");resetPf();setErrMsg("");}}>Cancel</Btn>
        </div>
      </div>
    );
  }

  // ── Main catalog view ─────────────────────────────────────────────────────
  return(
    <div>
      {/* Header */}
      <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 24px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark}}>🏭 Supplier Catalog</div>
          <div style={{fontSize:13,color:ds.color.textMuted,marginTop:2}}>{suppliers.length} suppliers · {products.length} products</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {/* Bulk import */}
          <label style={{padding:"8px 14px",borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",color:ds.color.textBody,fontFamily:ds.font.body}}>
            {importing?"⏳ Importing…":"📤 Import Excel"}
            <input type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleImport} disabled={importing}/>
          </label>
          <Btn variant="outline" size="sm" onClick={()=>{setView("add_supplier");resetSf();setErrMsg("");}}>➕ Add Supplier</Btn>
          <Btn variant="primary" size="sm" onClick={()=>{setView("add_product");resetPf();setErrMsg("");}}>➕ Add Product</Btn>
        </div>
      </div>

      {importMsg&&(
        <div style={{padding:"10px 14px",borderRadius:ds.radius.md,background:importMsg.startsWith("✅")?ds.color.successBg:ds.color.redLight,border:`1px solid ${importMsg.startsWith("✅")?ds.color.successBorder:ds.color.redBorder}`,color:importMsg.startsWith("✅")?ds.color.success:ds.color.red,fontSize:13,marginBottom:12}}>
          {importMsg}
        </div>
      )}

      {/* View toggle */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["suppliers","🏭 Suppliers"],["products","📦 Products"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{padding:"8px 18px",borderRadius:ds.radius.md,border:`1.5px solid ${view===v?ds.color.red:ds.color.border}`,background:view===v?ds.color.redLight:"#fff",color:view===v?ds.color.red:ds.color.textBody,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:ds.font.body}}>{l}</button>
        ))}
        {view==="products"&&(
          <>
            <select value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)} style={{padding:"8px 12px",borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,fontSize:13,fontFamily:ds.font.body,cursor:"pointer"}}>
              <option value="all">All Suppliers</option>
              {suppliers.map(s=><option key={s.id} value={s.id}>{s.id} — {s.name.slice(0,30)}</option>)}
            </select>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search products…" style={{padding:"8px 12px",borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,fontSize:13,fontFamily:ds.font.body,minWidth:200}}/>
          </>
        )}
      </div>

      {loading?<div style={{textAlign:"center",padding:40,color:ds.color.textMuted}}><Spinner size={28}/></div>:(

        view==="suppliers"?(
          // ── Suppliers table ──────────────────────────────────────────────
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:ds.color.red}}>
                  {["ID","Name","Address","Category","Lead Days","Payment Terms","Actions"].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:700,color:"#fff",fontSize:12}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.length===0?(
                  <tr><td colSpan={7} style={{padding:32,textAlign:"center",color:ds.color.textMuted}}>
                    No suppliers yet. Click "Import Excel" to upload the masterlist, or "Add Supplier" to add manually.
                  </td></tr>
                ):suppliers.map((s,i)=>(
                  <tr key={s.id} style={{background:i%2===0?"#fff":ds.color.canvas,borderBottom:`1px solid ${ds.color.borderLight}`}}>
                    <td style={{padding:"10px 14px",fontWeight:700,color:ds.color.red}}>{s.id}</td>
                    <td style={{padding:"10px 14px",fontWeight:600}}>{s.name}</td>
                    <td style={{padding:"10px 14px",color:ds.color.textMuted,maxWidth:180,fontSize:12}}>{s.address||"—"}</td>
                    <td style={{padding:"10px 14px"}}><span style={{background:ds.color.goldLight,color:ds.color.gold,borderRadius:ds.radius.pill,padding:"2px 8px",fontSize:11,fontWeight:700}}>{s.category||"—"}</span></td>
                    <td style={{padding:"10px 14px",textAlign:"center"}}>{s.leadDays||"—"}</td>
                    <td style={{padding:"10px 14px",color:ds.color.textMuted,fontSize:12}}>{s.paymentTerms||"—"}</td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>editSupplier(s)} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",fontSize:12,cursor:"pointer",fontFamily:ds.font.body}}>✏️ Edit</button>
                        <button onClick={()=>deleteSupplier(s.id)} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.redBorder}`,background:ds.color.redLight,color:ds.color.red,fontSize:12,cursor:"pointer",fontFamily:ds.font.body}}>🗑️</button>
                        <button onClick={()=>{setFilterSupplier(s.id);setView("products");}} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",fontSize:12,cursor:"pointer",fontFamily:ds.font.body}}>📦 Products</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ):(
          // ── Products table ───────────────────────────────────────────────
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
              <thead>
                <tr style={{background:ds.color.red}}>
                  {["ID","Supplier","Generic Name","Brand","Form","Pack","Acq. Price","Category","Subcategory","Stock","Margin","Actions"].map(h=>(
                    <th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#fff",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length===0?(
                  <tr><td colSpan={12} style={{padding:32,textAlign:"center",color:ds.color.textMuted}}>
                    {products.length===0?"No products yet. Import the masterlist Excel to seed all 282 products instantly.":"No products match your search."}
                  </td></tr>
                ):filteredProducts.map((p,i)=>(
                  <tr key={p.id} style={{background:i%2===0?"#fff":ds.color.canvas,borderBottom:`1px solid ${ds.color.borderLight}`}}>
                    <td style={{padding:"8px 12px",fontWeight:700,color:ds.color.red,whiteSpace:"nowrap"}}>{p.id}</td>
                    <td style={{padding:"8px 12px",fontSize:11,color:ds.color.textMuted,whiteSpace:"nowrap"}}>{p.supplierId}</td>
                    <td style={{padding:"8px 12px",fontWeight:600,maxWidth:220}}>{p.genericName}</td>
                    <td style={{padding:"8px 12px",color:ds.color.textMuted}}>{p.brandName||"—"}</td>
                    <td style={{padding:"8px 12px",color:ds.color.textMuted}}>{p.form||"—"}</td>
                    <td style={{padding:"8px 12px",color:ds.color.textMuted,whiteSpace:"nowrap"}}>{p.packSize||"—"}</td>
                    <td style={{padding:"8px 12px",fontWeight:700,color:p.acqPrice?"#1E8449":ds.color.textMuted,whiteSpace:"nowrap"}}>{p.acqPrice?formatPHP(p.acqPrice):"—"}</td>
                    <td style={{padding:"8px 12px"}}><span style={{background:p.category==="medicine"?ds.color.redLight:p.category==="equipment"?ds.color.goldLight:ds.color.canvas,color:p.category==="medicine"?ds.color.red:p.category==="equipment"?ds.color.gold:ds.color.textBody,borderRadius:ds.radius.pill,padding:"2px 7px",fontSize:10,fontWeight:700}}>{p.category}</span></td>
                    <td style={{padding:"8px 12px",color:ds.color.textMuted,fontSize:11}}>{p.subcategory||"—"}</td>
                    <td style={{padding:"8px 12px"}}><span style={{color:p.stockStatus==="available"?ds.color.success:p.stockStatus==="limited"?"#E67E22":ds.color.red,fontSize:11,fontWeight:600}}>{p.stockStatus||"—"}</span></td>
                    <td style={{padding:"8px 12px",color:p.marginOverride?"#E67E22":ds.color.textMuted,fontWeight:p.marginOverride?700:400}}>{p.marginOverride?`${p.marginOverride}%`:"default"}</td>
                    <td style={{padding:"8px 12px"}}>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>editProduct(p)} style={{padding:"3px 8px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",fontSize:11,cursor:"pointer",fontFamily:ds.font.body}}>✏️</button>
                        <button onClick={()=>deleteProduct(p.id)} style={{padding:"3px 8px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.redBorder}`,background:ds.color.redLight,color:ds.color.red,fontSize:11,cursor:"pointer",fontFamily:ds.font.body}}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length>0&&(
              <div style={{padding:"10px 16px",borderTop:`1px solid ${ds.color.borderLight}`,fontSize:12,color:ds.color.textMuted}}>
                Showing {filteredProducts.length} of {products.length} products
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

