import { useState, useRef, useEffect} from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { formatPHP } from "../../utils/format";
import { DEFAULT_MARGINS, parsePackCount, isPieceUnit } from "../../constants/rfq";
import { CATEGORIES } from "../../constants/categories";
import { callClaudeRFQ } from "../../lib/claude";
import { generateDocumentPDF } from "../../lib/pdf";
import { Btn, Spinner, Tag } from "../ui";

export function RFQTab(){
  const [step,setStep]=useState("upload"); // upload | review | export
  const [rfqFile,setRfqFile]=useState(null);
  const [rfqName,setRfqName]=useState("");
  const [rfqImages,setRfqImages]=useState([]);
  const [compressing,setCompressing]=useState(false);
  const MAX_IMAGES=10;
  const [clientName,setClientName]=useState("");
  const [parsing,setParsing]=useState(false);
  const [parsedItems,setParsedItems]=useState([]); // [{lineNum,rawText,qty,unit,parsedName,matchedProduct,confidence,supplierId,acqPrice,sellingPrice,margin,profit,status}]
  const [suppliers,setSuppliers]=useState([]);
  const [products,setProducts]=useState([]);
  const [loadingCatalog,setLoadingCatalog]=useState(true);
  const [exporting,setExporting]=useState(false);
  const [exportMsg,setExportMsg]=useState("");
  const [errMsg,setErrMsg]=useState("");
  const [quoteNotes,setQuoteNotes]=useState("");
  const [validityDays,setValidityDays]=useState(30);
  // v16.18: Sticky header toggle for long RFQ tables
  const [stickyHeader,setStickyHeader]=useState(false);

  // Load supplier catalog
  useEffect(()=>{
    Promise.all([
      getDocs(collection(db,"suppliers")),
      getDocs(collection(db,"supplier_products")),
    ]).then(([ss,ps])=>{
      setSuppliers(ss.docs.map(d=>({id:d.id,...d.data()})));
      setProducts(ps.docs.map(d=>({id:d.id,...d.data()})));
      setLoadingCatalog(false);
    }).catch(()=>setLoadingCatalog(false));
  },[]);

  // ── File upload & AI parse ─────────────────────────────────────────────────
  const compressImage=(file,maxDim=1500,quality=0.85)=>new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("Could not read "+file.name));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error("Could not load "+file.name));
      img.onload=()=>{
        let {width:w,height:h}=img;
        if(w>maxDim||h>maxDim){
          const scale=maxDim/Math.max(w,h);
          w=Math.round(w*scale); h=Math.round(h*scale);
        }
        const canvas=document.createElement("canvas");
        canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext("2d");
        ctx.fillStyle="#fff"; ctx.fillRect(0,0,w,h);
        ctx.drawImage(img,0,0,w,h);
        const dataUrl=canvas.toDataURL("image/jpeg",quality);
        const base64=dataUrl.split(",")[1];
        const sizeKb=Math.round((base64.length*3/4)/1024);
        resolve({name:file.name,dataUrl,base64,mediaType:"image/jpeg",sizeKb});
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });

  const handleFileChange=async(e)=>{
    const files=Array.from(e.target.files||[]);
    e.target.value="";
    if(!files.length) return;
    const IMG_EXTS=["png","jpg","jpeg","webp"];
    const isImageFile=(f)=>IMG_EXTS.includes((f.name.split(".").pop()||"").toLowerCase());
    const allImages=files.every(isImageFile);
    const anyImage=files.some(isImageFile);
    if(anyImage && !allImages){
      setErrMsg("Please upload either a single document (PDF/Excel/Word) OR image files — not mixed.");
      return;
    }
    if(allImages){
      const room=MAX_IMAGES-rfqImages.length;
      if(files.length>room){
        setErrMsg(`You can upload up to ${MAX_IMAGES} images per RFQ. Removed extras.`);
      }
      const toProcess=files.slice(0,room);
      if(!toProcess.length) return;
      setCompressing(true); setErrMsg("");
      try{
        const compressed=[];
        for(const f of toProcess){ compressed.push(await compressImage(f)); }
        setRfqImages(prev=>[...prev,...compressed]);
        setRfqFile(null); setRfqName("");
      }catch(err){
        setErrMsg("Image processing failed: "+err.message);
      }
      setCompressing(false);
      return;
    }
    if(files.length>1){
      setErrMsg("Only one document file at a time. For multi-page, combine into a PDF or upload as images.");
      return;
    }
    const f=files[0];
    setRfqFile(f); setRfqName(f.name);
    setRfqImages([]);
  };

  const removeImage=(idx)=>setRfqImages(prev=>prev.filter((_,i)=>i!==idx));
  const clearAllImages=()=>setRfqImages([]);

  const handleParse=async()=>{
    if(!rfqFile&&rfqImages.length===0){setErrMsg("Please upload an RFQ file or images first.");return;}
    setParsing(true);setErrMsg("");

    try{
      const hasImages=rfqImages && rfqImages.length>0;
      const ext=rfqFile?rfqFile.name.split(".").pop().toLowerCase():"";

      const catalogSummary=products.slice(0,200).map(p=>`${p.id}|${p.genericName}|${p.brandName||""}|${p.category}|pack:${p.packSize||"1"}|${p.acqPrice||""}|${p.supplierId}`).join("\n");
      const systemPrompt=`You are an RFQ parser for DMEAST, a Philippine medical distributor. Match each RFQ line item to the catalog.\n\nCATALOG (id|generic|brand|category|pack:size|acqPrice|supplierId):\n${catalogSummary}\n\nMARGINS: medicine 15%, supply 27.5%, equipment manual.\n\nIMPORTANT: Return the RFQ-requested unit as written (e.g. "tablet", "pc", "vial", "box"). Do NOT convert units — the system handles pack-size math.\n\nOUTPUT RULE: Respond with ONLY a raw JSON array. NO markdown fences, NO text before/after. Start with [ end with ]. If file has no readable RFQ line items, respond with []. Each element:\n{"lineNum":n,"parsedName":"name","qty":n,"unit":"u","matchedProductId":"PRDxxx|null","confidence":"high|medium|low|none","acqPrice":n|null,"category":"medicine|supply|equipment","supplierId":"SUPxxx|null","notes":"reason if review/none"}\n\nFor confidence=review or none, put a short reason in notes (e.g. "qty unit mismatch", "no exact strength match", "not in catalog"). Match by generic name, strength, form.`;

      const toB64=async(file)=>{
        const buf=await file.arrayBuffer();
        const bytes=new Uint8Array(buf);
        let bin=""; const chunk=8192;
        for(let i=0;i<bytes.byteLength;i+=chunk){ bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk)); }
        return btoa(bin);
      };

      let requestBody;
      if(hasImages){
        requestBody={
          maxTokens:16000, system:systemPrompt, isImages:true,
          images:rfqImages.map(im=>({base64:im.base64,mediaType:im.mediaType})),
          userMessage:`These are ${rfqImages.length} page(s) of one RFQ, in order. Parse every visible line item into a single combined JSON array. Respond ONLY with the raw JSON array.`,
        };
      } else if(ext==="pdf"){
        requestBody={maxTokens:16000,system:systemPrompt,isPdf:true,pdfBase64:await toB64(rfqFile),userMessage:"Parse this RFQ PDF. Match every line to the catalog. Respond ONLY with the raw JSON array."};
      } else {
        let fc="";
        if(["xlsx","xls"].includes(ext)){
          const buf=await rfqFile.arrayBuffer();
          const {read,utils}=await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
          const wb=read(buf,{type:"array"}); const ws=wb.Sheets[wb.SheetNames[0]];
          fc=utils.sheet_to_json(ws,{header:1,defval:""}).map(r=>r.join("\t")).join("\n");
        } else { fc=await rfqFile.text(); }
        requestBody={maxTokens:16000,system:systemPrompt,isPdf:false,userMessage:`Parse this RFQ. Respond ONLY with the raw JSON array:\n\n${fc.slice(0,12000)}`};
      }

      const data = await callClaudeRFQ(requestBody);

      let parsed=[];
      if(data.parsedItems&&Array.isArray(data.parsedItems)){
        parsed=data.parsedItems;
      } else {
        const text=data.rawText||data.content?.map(c=>c.text||"").join("")||"";
        try{
          let clean=text.replace(/```json/gi,"").replace(/```/g,"").trim();
          const fb=clean.indexOf("["), lb=clean.lastIndexOf("]");
          if(fb>=0&&lb>fb) clean=clean.slice(fb,lb+1); else if(fb>=0) clean=clean.slice(fb);
          try{ parsed=JSON.parse(clean); }
          catch(_){ const lo=clean.lastIndexOf("}"); if(lo>0&&fb>=0) parsed=JSON.parse(clean.slice(0,lo+1)+"]"); else throw new Error("x"); }
        }catch(e){
          throw new Error("Could not read this file. Please ensure it's a clear image, PDF, or Excel/Word document with visible RFQ line items.");
        }
      }

      if(!parsed.length){
        throw new Error("No RFQ line items found. Please check that the document contains a list of medicines/supplies with quantities.");
      }

      if(hasImages && !rfqName){ setRfqName(rfqImages.length>1?`${rfqImages.length} images`:rfqImages[0].name); }

      // Enrich with selling price, profit, AND pack-size conversion
      const enriched=parsed.map(item=>{
        const prod=products.find(p=>p.id===item.matchedProductId);
        const margin=prod?.marginOverride||DEFAULT_MARGINS[item.category]||27.5;
        const packAcq=item.acqPrice||prod?.acqPrice||null; // Acq price PER PACK from catalog
        const packCount=prod?parsePackCount(prod.packSize):null;
        const reqUnit=item.unit||"";
        const requestsPieces=isPieceUnit(reqUnit);

        // Determine per-unit acquisition price:
        // - If catalog pack has multiple pieces (packCount > 1) AND RFQ asks per piece → divide
        // - Otherwise the catalog price IS the per-unit price (per box, per bottle, per vial)
        let perUnitAcq=packAcq;
        let conversionNote="";
        if(packAcq && packCount && packCount>1 && requestsPieces){
          perUnitAcq=Math.round((packAcq/packCount)*10000)/10000; // keep 4 decimals for accuracy
          conversionNote=`Pack of ${packCount} @ PHP ${packAcq} → PHP ${perUnitAcq.toFixed(2)} per ${reqUnit||"pc"}`;
        }

        const sell=perUnitAcq?Math.round(perUnitAcq*(1+margin/100)*100)/100:null;
        const profit=perUnitAcq&&sell?Math.round((sell-perUnitAcq)*100)/100:null;
        const supplier=suppliers.find(s=>s.id===(item.supplierId||prod?.supplierId));

        // Build AI-supplied + conversion notes
        const notes=[item.notes,conversionNote].filter(Boolean).join(" • ");

        return{
          ...item,
          packAcqPrice:packAcq,    // original per-pack price (for reference)
          packCount:packCount,      // number of pieces per pack from catalog
          packSize:prod?.packSize||null,
          acqPrice:perUnitAcq,      // per-unit acq used for math
          sellingPrice:sell,
          margin:margin,
          profit:profit,
          supplierName:supplier?.name||"",
          supplierAddress:supplier?.address||"",
          notes:notes,
          status:item.confidence==="high"?"confirmed":item.confidence==="none"?"not_found":"review",
        };
      });

      setParsedItems(enriched);
      setStep("review");
    }catch(e){
      setErrMsg("Parse failed: "+e.message);
    }
    setParsing(false);
  };

  // ── Update a line item manually ────────────────────────────────────────────
  const updateItem=(idx,field,value)=>{
    setParsedItems(prev=>{
      const arr=[...prev];
      const item={...arr[idx],[field]:value};
      // Recalculate selling price if acqPrice or margin changed
      if(field==="acqPrice"||field==="margin"){
        const acq=Number(field==="acqPrice"?value:item.acqPrice)||null;
        const margin=Number(field==="margin"?value:item.margin)||27.5;
        item.sellingPrice=acq?Math.round(acq*(1+margin/100)*100)/100:null;
        item.profit=acq&&item.sellingPrice?Math.round((item.sellingPrice-acq)*100)/100:null;
      }
      if(field==="status"&&value==="confirmed"){
        item.confidence="high";
      }
      arr[idx]=item;
      return arr;
    });
  };

  // ── Summary stats ──────────────────────────────────────────────────────────
  const confirmed=parsedItems.filter(i=>i.status==="confirmed").length;
  const needsReview=parsedItems.filter(i=>i.status==="review").length;
  const notFound=parsedItems.filter(i=>i.status==="not_found").length;
  const totalAcq=parsedItems.reduce((s,i)=>s+(i.acqPrice||0)*(i.qty||1),0);
  const totalSell=parsedItems.reduce((s,i)=>s+(i.sellingPrice||0)*(i.qty||1),0);
  const totalProfit=totalSell-totalAcq;

  // ── Export Excel (internal cost sheet) ────────────────────────────────────
  const exportExcel=async()=>{
    setExporting(true);
    try{
      const {utils,writeFile}=await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
      const rows=[
        ["#","Raw Item","Parsed Name","Qty","Unit","Catalog Pack","Pack Acq Price","Per-Unit Acq","Supplier","Supplier Address","Acquisition Price","Selling Price","Margin %","Profit","Category","Status","Confidence","Notes"],
        ...parsedItems.map((item,i)=>[
          i+1,
          item.rawText||"",
          item.parsedName||"",
          item.qty||1,
          item.unit||"",
          item.packSize||"",
          item.packAcqPrice||"",
          item.packCount&&item.packAcqPrice?(item.packAcqPrice/item.packCount).toFixed(4):"",
          item.supplierName||"",
          item.supplierAddress||"",
          item.acqPrice||"",
          item.sellingPrice||"",
          item.margin?(item.margin+"%"):"",
          item.profit||"",
          item.category||"",
          item.status||"",
          item.confidence||"",
          item.notes||"",
        ]),
        [],
        ["","","TOTALS","","","","",totalAcq,totalSell,"",totalProfit,"","","",""],
      ];
      const ws=utils.aoa_to_sheet(rows);
      ws["!cols"]=[8,30,30,6,8,30,35,14,14,10,12,12,12,12,20].map(w=>({wch:w}));
      const wb=utils.book_new();
      utils.book_append_sheet(wb,ws,"Cost Sheet");
      writeFile(wb,`DMEAST_RFQ_CostSheet_${clientName.replace(/\s/g,"_")||"Client"}_${new Date().toISOString().slice(0,10)}.xlsx`);
      setExportMsg("✅ Excel downloaded!");
    }catch(e){setExportMsg("❌ "+e.message);}
    setExporting(false);
  };

  // ── Export PDF (client quote) — reuses the branded generateDocumentPDF ──────
  const exportPDF=async()=>{
    setExporting(true);
    try{
      const quoteItems=parsedItems
        .filter(i=>i.status==="confirmed"||i.status==="review")
        .map(i=>({
          name:(i.parsedName||i.rawText||"Item")+(i.status==="review"?" (to confirm)":""),
          qty:i.qty||1,
          unit:i.unit||"pc",
          price:i.sellingPrice||0,
        }));

      const quoteTotal=quoteItems.reduce((s,it)=>s+(it.price||0)*(it.qty||0),0);
      const qNum="QT-"+new Date().getFullYear()+"-"+Date.now().toString().slice(-4);

      const orderObj={
        id:null, docRef:qNum,
        name:clientName||"Valued Client",
        address:"—", phone:"—",
        items:quoteItems, total:quoteTotal,
        paymentMethod:"As agreed",
        vatTreatment:"vat_exempt",
      };

      const pdf=await generateDocumentPDF({
        order:orderObj,
        docType:"quotation",
        docNumber:qNum,
        validityDays:Number(validityDays)||30,
        vatTreatment:"vat_exempt",
        rfqExtraTerms:[
          // Base terms already include: validity, VAT-exclusive notice, payment terms,
          // prices/stock subject to change, delivery timeline, PO acceptance.
          // Only add user-supplied notes here so we don't duplicate.
          quoteNotes?("Note: "+quoteNotes):null,
        ].filter(Boolean),
      });

      pdf.save(`DMEAST_Quote_${(clientName||"Client").replace(/\s/g,"_")}_${qNum}.pdf`);
      setExportMsg("PDF downloaded!");
    }catch(e){setExportMsg("PDF error: "+e.message);}
    setExporting(false);
  };

  const inp2={padding:"9px 12px",borderRadius:ds.radius.md,border:`1px solid ${ds.color.border}`,fontSize:13,fontFamily:ds.font.body,outline:"none",background:"#fff"};

  // ── Step: Upload ───────────────────────────────────────────────────────────
  if(step==="upload") return(
    <div style={{maxWidth:680}}>
      <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"28px 32px",marginBottom:16}}>
        <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark,marginBottom:4}}>📋 Auto-RFQ System</div>
        <div style={{fontSize:13,color:ds.color.textMuted,marginBottom:24}}>
          Upload a client RFQ file. AI will parse all line items, match them to your supplier catalog, and apply your margins automatically.
        </div>

        {loadingCatalog?(
          <div style={{textAlign:"center",padding:20,color:ds.color.textMuted}}><Spinner size={20}/> Loading catalog…</div>
        ):products.length===0?(
          <div style={{padding:"14px 16px",background:ds.color.goldLight,border:`1px solid ${ds.color.goldBorder}`,borderRadius:ds.radius.md,fontSize:13,color:ds.color.gold,marginBottom:20}}>
            ⚠️ Your supplier catalog is empty. Go to the <strong>Suppliers</strong> tab and import the masterlist Excel first — the AI needs it to match RFQ items.
          </div>
        ):(
          <div style={{padding:"10px 14px",background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,fontSize:13,color:ds.color.success,marginBottom:20}}>
            ✅ Catalog loaded: {suppliers.length} suppliers · {products.length} products ready for matching
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:700,color:ds.color.textDark,display:"block",marginBottom:6}}>Client Name</label>
          <input style={{...inp2,width:"100%"}} value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="e.g. Imus City Health Office"/>
        </div>

        <div style={{marginBottom:20}}>
          <label style={{fontSize:12,fontWeight:700,color:ds.color.textDark,display:"block",marginBottom:6}}>Upload RFQ File</label>
          <label style={{display:"flex",alignItems:"center",gap:12,padding:"20px",borderRadius:ds.radius.lg,border:`2px dashed ${(rfqFile||rfqImages.length)?ds.color.success:ds.color.border}`,background:(rfqFile||rfqImages.length)?ds.color.successBg:"#FAFAFA",cursor:compressing?"wait":"pointer"}}>
            <span style={{fontSize:28}}>{rfqFile?"📄":(rfqImages.length?"🖼️":"📂")}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:(rfqFile||rfqImages.length)?ds.color.success:ds.color.textDark}}>
                {compressing?"Compressing images…":
                 rfqFile?rfqFile.name:
                 rfqImages.length?`${rfqImages.length} image(s) ready — click to add more`:
                 "Click to upload RFQ file"}
              </div>
              <div style={{fontSize:12,color:ds.color.textMuted}}>Accepts: Excel, CSV, PDF, Word, or up to {MAX_IMAGES} images (PNG/JPG). Images auto-compress.</div>
            </div>
            <input type="file" multiple style={{display:"none"}} accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.png,.jpg,.jpeg,.webp" onChange={handleFileChange} disabled={compressing}/>
          </label>
          {rfqImages.length>0 && (
            <div style={{marginTop:10,padding:"10px 12px",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,background:"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:600,color:ds.color.textDark}}>Pages ({rfqImages.length}/{MAX_IMAGES}) — order matters</div>
                <button type="button" onClick={clearAllImages} style={{background:"none",border:"none",color:ds.color.textMuted,fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Clear all</button>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {rfqImages.map((im,i)=>(
                  <div key={i} style={{position:"relative",width:72,border:`1px solid ${ds.color.border}`,borderRadius:6,overflow:"hidden",background:"#f5f5f5"}}>
                    <img src={im.dataUrl} alt={`page ${i+1}`} style={{width:"100%",height:72,objectFit:"cover",display:"block"}}/>
                    <div style={{position:"absolute",top:2,left:2,background:"rgba(0,0,0,0.7)",color:"#fff",fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:3}}>{i+1}</div>
                    <button type="button" onClick={()=>removeImage(i)} aria-label="remove" style={{position:"absolute",top:2,right:2,background:"rgba(192,57,43,0.9)",color:"#fff",border:"none",width:18,height:18,borderRadius:"50%",cursor:"pointer",fontSize:11,lineHeight:"16px",padding:0}}>×</button>
                    <div style={{fontSize:10,color:ds.color.textMuted,padding:"3px 4px",textAlign:"center"}}>{im.sizeKb} KB</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {errMsg&&<div style={{padding:"8px 12px",background:ds.color.redLight,borderRadius:ds.radius.md,color:ds.color.red,fontSize:13,marginBottom:12}}>⚠️ {errMsg}</div>}

        <Btn variant="primary" size="lg" onClick={handleParse} disabled={parsing||compressing||(!rfqFile&&rfqImages.length===0)||products.length===0}>
          {parsing?<><Spinner size={16}/> AI Parsing…</>:"🤖 Parse RFQ with AI"}
        </Btn>
        <div style={{fontSize:12,color:ds.color.textMuted,marginTop:8}}>
          Powered by Claude AI — typically takes 10–30 seconds for 200+ items.
        </div>
      </div>
    </div>
  );

  // ── Step: Review ───────────────────────────────────────────────────────────
  return(
    <div>
      {/* Summary bar */}
      <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>📋 Review Matched Items — {rfqName}</div>
          {clientName&&<div style={{fontSize:13,color:ds.color.textMuted}}>Client: {clientName}</div>}
        </div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:ds.color.success}}>{confirmed}</div><div style={{fontSize:11,color:ds.color.textMuted}}>Confirmed</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:"#E67E22"}}>{needsReview}</div><div style={{fontSize:11,color:ds.color.textMuted}}>Review</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:ds.color.red}}>{notFound}</div><div style={{fontSize:11,color:ds.color.textMuted}}>Not Found</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:ds.color.textDark}}>{formatPHP(totalSell)}</div><div style={{fontSize:11,color:ds.color.textMuted}}>Total Quote</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:ds.color.success}}>{formatPHP(totalProfit)}</div><div style={{fontSize:11,color:ds.color.textMuted}}>Est. Profit</div></div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="outline" size="sm" onClick={()=>{setStep("upload");setParsedItems([]);}}>← Re-upload</Btn>
          <button onClick={exportExcel} disabled={exporting} style={{padding:"8px 14px",borderRadius:ds.radius.md,border:"none",background:"#1E8449",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:ds.font.body}}>
            {exporting?"⏳":"📊"} Export Excel
          </button>
          <button onClick={exportPDF} disabled={exporting} style={{padding:"8px 14px",borderRadius:ds.radius.md,border:"none",background:ds.color.red,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:ds.font.body}}>
            {exporting?"⏳":"📄"} Export Quote PDF
          </button>
        </div>
      </div>

      {exportMsg&&<div style={{padding:"10px 14px",borderRadius:ds.radius.md,background:exportMsg.startsWith("✅")?ds.color.successBg:ds.color.redLight,border:`1px solid ${exportMsg.startsWith("✅")?ds.color.successBorder:ds.color.redBorder}`,color:exportMsg.startsWith("✅")?ds.color.success:ds.color.red,fontSize:13,marginBottom:12}}>{exportMsg}</div>}

      {/* Quote settings */}
      <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"14px 20px",marginBottom:16,display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{fontSize:12,fontWeight:700,color:ds.color.textDark}}>Validity (days):</label>
          <input type="number" value={validityDays} onChange={e=>setValidityDays(Number(e.target.value))} style={{...inp2,width:70}}/>
        </div>
        <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",userSelect:"none"}}>
          <input type="checkbox" checked={stickyHeader} onChange={e=>setStickyHeader(e.target.checked)} style={{cursor:"pointer"}}/>
          <span style={{fontSize:12,fontWeight:600,color:ds.color.textDark}}>📌 Freeze header</span>
        </label>
        <div style={{flex:1}}>
          <input value={quoteNotes} onChange={e=>setQuoteNotes(e.target.value)} placeholder="Optional notes to include on the PDF quote…" style={{...inp2,width:"100%"}}/>
        </div>
      </div>

      {/* Items table — sticky header toggle and per-piece pack math */}
      <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,overflow:stickyHeader?"visible":"auto",position:"relative"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1200}}>
          <thead>
            <tr style={{background:ds.color.red}}>
              {["#","Status","Raw RFQ Item","Parsed Name","Qty","Unit","Matched Product","Pack","Supplier","Acq. Price","Margin %","Selling Price","Profit","Confidence","Notes"].map(h=>(
                <th key={h} style={{padding:"9px 10px",textAlign:"left",fontWeight:700,color:"#fff",fontSize:11,whiteSpace:"nowrap",background:ds.color.red,boxShadow:stickyHeader?"0 2px 4px rgba(0,0,0,0.1)":"none",...(stickyHeader?{position:"sticky",top:67,zIndex:50}:{})}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsedItems.map((item,i)=>{
              const statusColor=item.status==="confirmed"?ds.color.success:item.status==="not_found"?ds.color.red:"#E67E22";
              const bg=item.status==="not_found"?"#FFF5F5":item.status==="review"?"#FFFBF0":i%2===0?"#fff":ds.color.canvas;
              return(
                <tr key={i} style={{background:bg,borderBottom:`1px solid ${ds.color.borderLight}`}}>
                  <td style={{padding:"8px 10px",color:ds.color.textMuted}}>{i+1}</td>
                  <td style={{padding:"8px 10px"}}>
                    <select value={item.status} onChange={e=>updateItem(i,"status",e.target.value)} style={{padding:"3px 6px",borderRadius:ds.radius.sm,border:`1px solid ${statusColor}`,background:bg,color:statusColor,fontSize:11,cursor:"pointer",fontFamily:ds.font.body}}>
                      <option value="confirmed">✅ Confirmed</option>
                      <option value="review">⚠️ Review</option>
                      <option value="not_found">❌ Not Found</option>
                    </select>
                  </td>
                  <td style={{padding:"8px 10px",color:ds.color.textMuted,maxWidth:160,fontSize:11}}>{item.rawText||"—"}</td>
                  <td style={{padding:"8px 10px",fontWeight:600,maxWidth:160}}>{item.parsedName||"—"}</td>
                  <td style={{padding:"8px 10px",textAlign:"center"}}>
                    <input type="number" value={item.qty||1} onChange={e=>updateItem(i,"qty",Number(e.target.value))} style={{width:50,padding:"3px 6px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,textAlign:"center",fontSize:12,fontFamily:ds.font.body}}/>
                  </td>
                  <td style={{padding:"8px 10px",color:ds.color.textMuted}}>{item.unit||"—"}</td>
                  <td style={{padding:"8px 10px",fontSize:11,color:item.matchedProductId?ds.color.textDark:ds.color.textMuted}}>{item.matchedGenericName||item.matchedProductId||"—"}</td>
                  <td style={{padding:"8px 10px",fontSize:11,color:ds.color.textMuted,whiteSpace:"nowrap"}}>{item.packSize||"—"}</td>
                  <td style={{padding:"8px 10px",fontSize:11,color:ds.color.textMuted,maxWidth:140}}>{item.supplierName||"—"}</td>
                  <td style={{padding:"8px 10px"}}>
                    <input type="number" value={item.acqPrice||""} onChange={e=>updateItem(i,"acqPrice",e.target.value?Number(e.target.value):null)} placeholder="—" style={{width:80,padding:"3px 6px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body}}/>
                  </td>
                  <td style={{padding:"8px 10px"}}>
                    <input type="number" value={item.margin||""} onChange={e=>updateItem(i,"margin",e.target.value?Number(e.target.value):null)} placeholder="—" style={{width:55,padding:"3px 6px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body}}/>
                  </td>
                  <td style={{padding:"8px 10px",fontWeight:700,color:item.sellingPrice?ds.color.textDark:ds.color.textMuted,whiteSpace:"nowrap"}}>{item.sellingPrice?formatPHP(item.sellingPrice):"—"}</td>
                  <td style={{padding:"8px 10px",fontWeight:700,color:item.profit>0?ds.color.success:ds.color.textMuted,whiteSpace:"nowrap"}}>{item.profit?formatPHP(item.profit):"—"}</td>
                  <td style={{padding:"8px 10px"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:ds.radius.pill,background:item.confidence==="high"?ds.color.successBg:item.confidence==="medium"?ds.color.goldLight:item.confidence==="low"?"#FDE8E8":ds.color.canvas,color:item.confidence==="high"?ds.color.success:item.confidence==="medium"?ds.color.gold:item.confidence==="low"?ds.color.red:ds.color.textMuted}}>
                      {item.confidence||"—"}
                    </span>
                  </td>
                  <td style={{padding:"8px 10px",fontSize:11,color:ds.color.textMuted,minWidth:180}}>
                    <input type="text" value={item.notes||""} onChange={e=>updateItem(i,"notes",e.target.value)} placeholder="—" style={{width:"100%",padding:"3px 6px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:11,fontFamily:ds.font.body}}/>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

