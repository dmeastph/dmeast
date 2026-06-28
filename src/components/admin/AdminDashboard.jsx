import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, where, serverTimestamp, deleteDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ds } from "../../constants/design";
import { formatPHP, formatDate } from "../../utils/format";
import { getUserRole, getPermissions, ADMIN_ROLES, ROLE_PERMISSIONS } from "../../constants/admin";
import { orderStatusColor, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, paymentStatusColor } from "../../constants/status";
import { CUSTOMER_TAGS, AGING_BUCKETS, daysOverdue, getAgingBucket, findTag, findSource, findVATTreatment, ORDER_SOURCES } from "../../constants/order";
import { CATEGORIES } from "../../constants/categories";
import { DEFAULT_PRODUCTS } from "../../constants/products";
import { CATALOG_SEED_PRODUCTS, bulkImportCatalog } from "../../constants/catalog";
import { Btn, Spinner, Tag, SectionHeader, Divider } from "../ui";
import { ProductEditModal } from "./ProductEditModal";
const PDFGeneratorModal = lazy(() => import("./PDFGeneratorModal").then(m => ({ default: m.PDFGeneratorModal })));
import { NewOrderModal } from "./NewOrderModal";
import { ReceivablesTab } from "./ReceivablesTab";
import { CustomerEditorModal } from "./CustomerEditorModal";
import { BackupReminder } from "./BackupReminder";
import { ExpenseEditorModal } from "./ExpenseEditorModal";
import { ExpensesTab } from "./ExpensesTab";
import { ManualBillingEditorModal } from "./ManualBillingEditorModal";
import { ManualBillingsTab } from "./ManualBillingsTab";
const MarginDashboardTab = lazy(() => import("./MarginDashboardTab").then(m => ({ default: m.MarginDashboardTab })));
const OrderEditorModal = lazy(() => import("./OrderEditorModal").then(m => ({ default: m.OrderEditorModal })));
import { PaymentMethodSettings } from "./PaymentMethodSettings";
const SupplierCatalogTab = lazy(() => import("./SupplierCatalogTab").then(m => ({ default: m.SupplierCatalogTab })));
const RFQTab = lazy(() => import("./RFQTab").then(m => ({ default: m.RFQTab })));
import { PostsTab } from "./PostsTab";
import { sendCustomerStatusEmail } from "../../lib/email-helpers";
import { emailjs, EMAILJS_CONFIG } from "../../lib/emailjs";
import { CONTACT } from "../../constants/contact";
import { performFullBackup } from "./BackupReminder";
import { sendSMS, orderStatusSMS } from "../../lib/sms";
import { useProducts } from "../../context/ProductsContext";

export function AdminDashboard({ user }){
  const { products: PRODUCTS, refresh: refreshProducts } = useProducts();
  const [tab,setTab]=useState("overview");
  const [orders,setOrders]=useState([]);
  const [customers,setCustomers]=useState([]);
  const [rxUps,setRxUps]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editingProduct,setEditingProduct]=useState(null);
  const [seeding,setSeeding]=useState(false);
  const [seedingMessage,setSeedingMessage]=useState("");
  // v13.0a state
  const [showNewOrderModal,setShowNewOrderModal]=useState(false);
  const [showCustomerEditor,setShowCustomerEditor]=useState(null);
  const [orderSourceFilter,setOrderSourceFilter]=useState("all");
  const [orderSearch,setOrderSearch]=useState("");
  const [customerSearch,setCustomerSearch]=useState("");
  const [customerTagFilter,setCustomerTagFilter]=useState("all");
  // v13.0b state
  const [expenses,setExpenses]=useState([]);
  const [showExpenseEditor,setShowExpenseEditor]=useState(null);
  const [manualBillings,setManualBillings]=useState([]);
  const [showBillingEditor,setShowBillingEditor]=useState(null);
  // v16.5: Blog posts
  const [posts,setPosts]=useState([]);
  // v13.0c: Order editor state
  const [showOrderEditor,setShowOrderEditor]=useState(null);
  // v15: PDF modal + role
  const [showPDFModal,setShowPDFModal]=useState(null); // null or order obj
  const userRole = user ? getUserRole(user.email) : null;
  const userPerms = userRole ? ROLE_PERMISSIONS[userRole] : null;
  
  // v15: If current tab not accessible by role, switch to first available
  useEffect(()=>{
    if(userPerms && !userPerms.tabs.includes(tab) && userPerms.tabs.length>0){
      setTab(userPerms.tabs[0]);
    }
  },[userPerms, tab]);

  useEffect(()=>{
    (async()=>{
      try {
        const snap = await getDocs(collection(db,"products"));
        if (snap.size === 0) {
          setSeedingMessage("⏳ Seeding default products…");
          const batch = writeBatch(db);
          DEFAULT_PRODUCTS.forEach(p => {
            const ref = doc(db, "products", p.id);
            batch.set(ref, { ...p, visible: true, available: "available", createdAt: serverTimestamp() });
          });
          await batch.commit();
          setSeedingMessage("✓ "+DEFAULT_PRODUCTS.length+" products seeded successfully");
          await refreshProducts();
          setTimeout(()=>setSeedingMessage(""), 3500);
        }
      } catch (e) { console.warn("Auto-seed failed:", e); }
    })();
  }, [refreshProducts]);

  const seedProductsFromDefaults = async () => {
    if (!confirm("This will add the 63 default products to your Firestore. Continue?")) return;
    setSeeding(true); setSeedingMessage("⏳ Seeding…");
    try {
      const batch = writeBatch(db);
      DEFAULT_PRODUCTS.forEach(p => {
        const ref = doc(db, "products", p.id);
        batch.set(ref, { ...p, visible: true, available: "available", createdAt: serverTimestamp() });
      });
      await batch.commit();
      setSeedingMessage("✓ "+DEFAULT_PRODUCTS.length+" products seeded");
      await refreshProducts();
    } catch (e) { setSeedingMessage("⚠ "+e.message); }
    setSeeding(false);
    setTimeout(()=>setSeedingMessage(""), 3500);
  };
  
  // v16.7: Bulk import the 130-product catalog (medicines + equipment) from PDFs
  const seedFullCatalog = async () => {
    if (!confirm("This will import "+CATALOG_SEED_PRODUCTS.length+" products (medicines + equipment) into your catalog. Existing products with matching IDs will be updated. Continue?")) return;
    setSeeding(true); setSeedingMessage("⏳ Importing 0/"+CATALOG_SEED_PRODUCTS.length+"…");
    try {
      const result = await bulkImportCatalog((current, total, success, failed) => {
        setSeedingMessage("⏳ Importing "+current+"/"+total+" ("+success+" ok"+(failed?", "+failed+" failed":"")+")");
      });
      if (result.failed === 0) {
        setSeedingMessage("✓ Imported "+result.success+" products successfully");
      } else {
        setSeedingMessage("⚠ "+result.success+" imported, "+result.failed+" failed");
        console.warn("Bulk import errors:", result.errors);
      }
      await refreshProducts();
    } catch (e) { setSeedingMessage("⚠ "+e.message); }
    setSeeding(false);
    setTimeout(()=>setSeedingMessage(""), 6000);
  };
  
  // v16.8: Bulk hide all Rx products (for Fiuu payment gateway approval)
  const bulkHideRxProducts = async () => {
    const rxProducts = PRODUCTS.filter(p => p.requiresPrescription === true && p.visible !== false);
    if (rxProducts.length === 0) {
      setSeedingMessage("ℹ No visible Rx products to hide");
      setTimeout(()=>setSeedingMessage(""), 3500);
      return;
    }
    if (!confirm("This will HIDE "+rxProducts.length+" prescription medicines from the public shop. They remain in admin and can be re-shown anytime. Continue?")) return;
    setSeeding(true); setSeedingMessage("⏳ Hiding "+rxProducts.length+" Rx products…");
    try {
      const batch = writeBatch(db);
      rxProducts.forEach(p => {
        const docId = p._docId || p.id;
        const ref = doc(db, "products", docId);
        batch.update(ref, { visible: false, hiddenReason: "rx_pending_approval", hiddenAt: serverTimestamp() });
      });
      await batch.commit();
      setSeedingMessage("✓ Hidden "+rxProducts.length+" Rx products from public shop");
      await refreshProducts();
    } catch (e) { setSeedingMessage("⚠ "+e.message); }
    setSeeding(false);
    setTimeout(()=>setSeedingMessage(""), 5000);
  };
  
  // v16.8: Re-show previously hidden Rx products
  const bulkShowRxProducts = async () => {
    const hiddenRx = PRODUCTS.filter(p => p.requiresPrescription === true && p.visible === false);
    if (hiddenRx.length === 0) {
      setSeedingMessage("ℹ No hidden Rx products to restore");
      setTimeout(()=>setSeedingMessage(""), 3500);
      return;
    }
    if (!confirm("This will RESTORE visibility for "+hiddenRx.length+" prescription medicines on the public shop. Continue?")) return;
    setSeeding(true); setSeedingMessage("⏳ Restoring "+hiddenRx.length+" Rx products…");
    try {
      const batch = writeBatch(db);
      hiddenRx.forEach(p => {
        const docId = p._docId || p.id;
        const ref = doc(db, "products", docId);
        batch.update(ref, { visible: true, hiddenReason: null });
      });
      await batch.commit();
      setSeedingMessage("✓ Restored "+hiddenRx.length+" Rx products to public shop");
      await refreshProducts();
    } catch (e) { setSeedingMessage("⚠ "+e.message); }
    setSeeding(false);
    setTimeout(()=>setSeedingMessage(""), 5000);
  };

  const saveProduct = async (productData) => {
    try {
      const id = productData.id?.trim() || ("custom-"+Date.now());
      const dataToSave = {
        id, name: productData.name||"", desc: productData.desc||"",
        price: productData.price ? Number(productData.price) : null,
        cta: productData.cta||"buy", category: productData.category||"pharma",
        imageSrc: productData.imageSrc||null,
        featured: !!productData.featured,
        requiresPrescription: !!productData.requiresPrescription,
        rxCategory: productData.rxCategory||null,
        tag: productData.tag||CATEGORIES.find(c=>c.id===productData.category)?.label||"",
        visible: productData.visible!==false,
        available: productData.available||"available",
        stock_qty: productData.stock_qty !== "" && productData.stock_qty != null ? Number(productData.stock_qty) : null,
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, "products", id), dataToSave, { merge: true });
      setEditingProduct(null);
      await refreshProducts();
    } catch (e) { alert("Save failed: "+e.message); }
  };

  const deleteProduct = async (p) => {
    if (!confirm("Delete \""+p.name+"\"? This cannot be undone.")) return;
    try {
      const docId = p._docId || p.id;
      await deleteDoc(doc(db, "products", docId));
      await refreshProducts();
    } catch (e) { alert("Delete failed: "+e.message); }
  };

  const toggleProductVisibility = async (p) => {
    try {
      const docId = p._docId || p.id;
      await updateDoc(doc(db, "products", docId), { visible: p.visible===false ? true : false });
      await refreshProducts();
    } catch (e) { alert("Toggle failed: "+e.message); }
  };

  useEffect(()=>{
    (async()=>{
      // v15.2: Load each collection independently so one permission error doesn't kill all data
      try {
        const oSnap=await getDocs(query(collection(db,"orders"),orderBy("createdAt","desc")));
        setOrders(oSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Orders load failed:", e.message); }
      try {
        const cSnap=await getDocs(collection(db,"customers"));
        setCustomers(cSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Customers load failed:", e.message); }
      try {
        const rSnap=await getDocs(query(collection(db,"rxUploads"),orderBy("createdAt","desc")));
        setRxUps(rSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Rx uploads load failed:", e.message); }
      try {
        const eSnap=await getDocs(query(collection(db,"expenses"),orderBy("date","desc")));
        setExpenses(eSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Expenses load failed:", e.message); }
      try {
        const bSnap=await getDocs(query(collection(db,"manualBillings"),orderBy("date","desc")));
        setManualBillings(bSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Manual billings load failed:", e.message); }
      // v16.5: Blog posts
      try {
        const pSnap=await getDocs(query(collection(db,"posts"),orderBy("createdAt","desc")));
        setPosts(pSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.warn("Blog posts load failed:", e.message); }
      setLoading(false);
    })();
  },[]);

  const updateOrderStatus=async(id,status)=>{
    await updateDoc(doc(db,"orders",id),{status, statusUpdatedAt: serverTimestamp()});
    setOrders(os=>os.map(o=>o.id===id?{...o,status}:o));
    const order = orders.find(o=>o.id===id);
    if(!order) return;
    const customerEmail = order.email;
    const customerName  = order.name || "Customer";
    const orderRef      = id.slice(-6).toUpperCase();
    // SMS notification on status change (non-blocking)
    if(order.phone) {
      sendSMS(order.phone, orderStatusSMS({ id: id }, status));
    }
    if(status==="out_of_stock"){
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `ORDER #${orderRef} — Out of Stock Notice`,
          quantity: "N/A", budget: "N/A", timeline: "Immediate",
          location: order.address||"",
          details: `Dear ${customerName},\n\nWe regret to inform you that one or more items in your order #${orderRef} are currently unavailable.\n\nOrder Items:\n${order.items?.map(i=>i.name+" x"+i.qty).join("\n")||""}\n\nOur team will contact you shortly to discuss alternatives or arrange a full refund.\n\nYou can reach us at:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nWe apologize for the inconvenience.`,
          reply_to: CONTACT.email,
          to_email: customerEmail,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e){ console.warn("Out-of-stock email failed:", e); }
    }
    if(status==="confirmed"){
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `ORDER #${orderRef} — Confirmed`,
          quantity: "N/A", budget: order.total ? formatPHP(order.total) : "N/A",
          timeline: "In Progress", location: order.address||"",
          details: `Dear ${customerName},\n\nGreat news! Your order #${orderRef} has been confirmed and is now being processed.\n\nOrder Items:\n${order.items?.map(i=>i.name+" x"+i.qty).join("\n")||""}\n\nTotal: ${order.total ? formatPHP(order.total) : "N/A"}\nPayment Method: ${order.paymentMethod||""}\n\nOur team will be in touch with payment instructions and delivery details.\n\nThank you for choosing DM EAST!`,
          reply_to: CONTACT.email,
          to_email: customerEmail,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e){ console.warn("Confirmed email failed:", e); }
    }
    if(status==="shipped"){
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `ORDER #${orderRef} — Shipped`,
          quantity: "N/A", budget: "N/A", timeline: "In Transit",
          location: order.address||"",
          details: `Dear ${customerName},\n\nYour order #${orderRef} has been shipped!\n\nDelivery Address: ${order.address||""}\n\nFor delivery updates or questions, contact us:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n\nThank you for choosing DM EAST!`,
          reply_to: CONTACT.email,
          to_email: customerEmail,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e){ console.warn("Shipped email failed:", e); }
    }
    // v13.0d: Email for "processing" status
    if(status==="processing"){
      sendCustomerStatusEmail({
        order, 
        subject: `ORDER #${orderRef} — Now Processing`,
        bodyText: `Dear ${customerName},\n\nYour order #${orderRef} is now being processed and prepared for shipment.\n\nWe'll send another update once it's been shipped.\n\nIf you have any questions, contact us:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n\nThank you for choosing DM EAST!`
      });
    }
    // v13.0d: Email for "delivered" status
    if(status==="delivered"){
      sendCustomerStatusEmail({
        order,
        subject: `ORDER #${orderRef} — Delivered ✓`,
        bodyText: `Dear ${customerName},\n\n🎉 Your order #${orderRef} has been delivered!\n\nWe hope you're satisfied with your purchase. If you have any concerns, please don't hesitate to contact us within 7 days.\n\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nThank you for choosing DM EAST!`
      });
    }
    // v13.0d: Email for "cancelled" status
    if(status==="cancelled"){
      sendCustomerStatusEmail({
        order,
        subject: `ORDER #${orderRef} — Cancelled`,
        bodyText: `Dear ${customerName},\n\nYour order #${orderRef} has been cancelled.\n\nIf you didn't request this cancellation or have questions, please contact us immediately:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nIf any payment was made, our team will arrange a refund.\n\nThank you for your understanding.`
      });
    }
  };

  // V11 NEW: Confirm payment manually
  const confirmPayment = async (orderId) => {
    if (!confirm("Confirm payment for this order? An email will be sent to the customer.")) return;
    try {
      await updateDoc(doc(db,"orders",orderId), {
        paymentStatus: "confirmed",
        paymentConfirmedAt: serverTimestamp(),
      });
      setOrders(os => os.map(o => o.id===orderId ? {...o, paymentStatus:"confirmed"} : o));
      const order = orders.find(o=>o.id===orderId);
      if (!order) return;
      const orderRef = orderId.slice(-6).toUpperCase();
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `ORDER #${orderRef} — Payment Confirmed ✓`,
          quantity: "N/A", budget: order.total ? formatPHP(order.total) : "N/A",
          timeline: "Processing", location: order.address||"",
          details: `Dear ${order.name||"Customer"},\n\n✅ Great news! Your payment for order #${orderRef} has been confirmed.\n\nOrder Total: ${order.total ? formatPHP(order.total) : "N/A"}\nPayment Method: ${order.paymentMethod||""}\n\nYour order is now being processed and will be prepared for shipment shortly. We'll send another update when your order is dispatched.\n\nIf you have any questions, contact us at:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n✉️ ${CONTACT.email}\n\nThank you for choosing DM EAST!`,
          reply_to: CONTACT.email,
          to_email: order.email,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e) { console.warn("Payment confirmation email failed:", e); }
    } catch(e) {
      alert("Failed to confirm payment: " + e.message);
    }
  };

  // V11 NEW: Reject payment
  const rejectPayment = async (orderId) => {
    const reason = prompt("Reason for rejecting this payment? (e.g. 'Receipt is unclear', 'Amount does not match'). The customer will see this.");
    if (!reason) return;
    try {
      await updateDoc(doc(db,"orders",orderId), {
        paymentStatus: "rejected",
        paymentRejectReason: reason,
        paymentProofUrl: null, // Clear so customer can re-upload
      });
      setOrders(os => os.map(o => o.id===orderId ? {...o, paymentStatus:"rejected", paymentRejectReason:reason, paymentProofUrl:null} : o));
      const order = orders.find(o=>o.id===orderId);
      if (!order) return;
      const orderRef = orderId.slice(-6).toUpperCase();
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          from_name: "DM EAST Team", company: "DM EAST",
          from_email: CONTACT.email, phone: CONTACT.phone1,
          product: `ORDER #${orderRef} — Payment Re-upload Needed`,
          quantity: "N/A", budget: order.total ? formatPHP(order.total) : "N/A",
          timeline: "Action Required", location: order.address||"",
          details: `Dear ${order.name||"Customer"},\n\nWe were unable to verify your payment proof for order #${orderRef}.\n\nReason: ${reason}\n\nPlease re-upload a clearer payment proof through your customer portal or the track-order page.\n\nIf you need assistance, contact us at:\n📱 ${CONTACT.phone1}\n💬 WhatsApp: ${CONTACT.whatsapp}\n\nThank you for your patience.`,
          reply_to: CONTACT.email,
          to_email: order.email,
        }, EMAILJS_CONFIG.publicKey);
      } catch(e) { console.warn("Payment rejection email failed:", e); }
    } catch(e) {
      alert("Failed to reject payment: " + e.message);
    }
  };

  const updateRxStatus=async(id,status)=>{
    await updateDoc(doc(db,"rxUploads",id),{status});
    setRxUps(rs=>rs.map(r=>r.id===id?{...r,status}:r));
  };

  const exportCSV=()=>{
    const rows=[["Order ID","Customer","Email","Total","Items","Payment","PaymentStatus","OrderStatus","Date"]];
    orders.forEach(o=>rows.push([o.id.slice(-6).toUpperCase(),o.name||"",o.email||"",o.total||0,o.items?.map(i=>`${i.name}x${i.qty}`).join("; ")||"",o.paymentMethod||"",o.paymentStatus||"awaiting",o.status||"pending",formatDate(o.createdAt)]));
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`dmeast-orders-${Date.now()}.csv`;a.click();
  };

  const totalRevenue=orders.reduce((s,o)=>s+(o.total||0),0);
  const pendingCount=orders.filter(o=>!o.status||o.status==="pending").length;
  const pendingPaymentCount=orders.filter(o=>o.paymentStatus==="submitted").length;
  const statuses=["pending","confirmed","processing","shipped","delivered","cancelled","out_of_stock"];
  const selS={padding:"7px 12px",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:13,outline:"none",fontFamily:ds.font.body,background:"#fff",cursor:"pointer"};

  if(loading) return(
    <div style={{paddingTop:74,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}><Spinner size={36}/><div style={{marginTop:16,color:ds.color.textMuted,fontSize:14}}>Loading dashboard…</div></div>
    </div>
  );


  // v13.0c: After order is saved (edited)
  const handleOrderSaved = (updatedOrder) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? {...o, ...updatedOrder} : o));
  };
  
  // v13.0c: After order is deleted
  const handleOrderDeleted = (orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // v13.0a: Mark a credit order as paid
  const markOrderPaid = async (orderId) => {
    try {
      await updateDoc(doc(db,"orders",orderId), {
        paymentStatus: "confirmed",
        paidAt: serverTimestamp(),
        status: "confirmed",
      });
      // Refresh
      setOrders(prev => prev.map(o => o.id===orderId ? {...o, paymentStatus:"confirmed", status:"confirmed"} : o));
    } catch(e) { alert("Failed: "+e.message); }
  };

  // v13.0a: Refresh data (after creating new order/customer)
  const refreshData = async () => {
    // v15.2: Each collection in its own try/catch — partial failures don't kill the whole refresh
    try {
      const oSnap=await getDocs(query(collection(db,"orders"),orderBy("createdAt","desc")));
      setOrders(oSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh orders failed:", e.message); }
    try {
      const cSnap=await getDocs(collection(db,"customers"));
      setCustomers(cSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh customers failed:", e.message); }
    try {
      const eSnap=await getDocs(query(collection(db,"expenses"),orderBy("date","desc")));
      setExpenses(eSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh expenses failed:", e.message); }
    try {
      const bSnap=await getDocs(query(collection(db,"manualBillings"),orderBy("date","desc")));
      setManualBillings(bSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh billings failed:", e.message); }
  };
  
  // v16.5: Refresh just blog posts
  const refreshPosts = async () => {
    try {
      const pSnap=await getDocs(query(collection(db,"posts"),orderBy("createdAt","desc")));
      setPosts(pSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.warn("Refresh posts failed:", e.message); }
  };
  const allTabs=[{id:"overview",label:"Overview",icon:"📊"},{id:"orders",label:`Orders${pendingPaymentCount>0?" 🔔":""}`,icon:"📦"},{id:"receivables",label:"Receivables",icon:"💰"},{id:"expenses",label:"Expenses",icon:"🏢"},{id:"billings",label:"Billings",icon:"📝"},{id:"margin",label:"Margin",icon:"📈"},{id:"products",label:"Products",icon:"🗂️"},{id:"customers",label:"Customers",icon:"👥"},{id:"rx",label:"Rx Uploads",icon:"💊"},{id:"blog",label:"Blog",icon:"📝"},{id:"suppliers",label:"Suppliers",icon:"🏭"},{id:"rfq",label:"RFQ",icon:"📋"},{id:"settings",label:"Settings",icon:"⚙️"}];
  // v15: Filter tabs based on user role
  const tabs = userPerms ? allTabs.filter(t=>userPerms.tabs.includes(t.id)) : allTabs;

  return(
    <div style={{paddingTop:74,background:ds.color.canvas,minHeight:"100vh"}}>
      <div style={{background:ds.color.textDark,padding:"28px 0"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:ds.color.goldBright,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Admin Dashboard</div>
            <div style={{fontFamily:ds.font.display,fontSize:22,color:"#fff"}}>DMEAST Control Panel ⚙️</div>
            {userPerms && (
              <div style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:8,padding:"4px 12px",borderRadius:ds.radius.pill,background:userPerms.color+"33",border:`1px solid ${userPerms.color}66`}}>
                <span style={{fontSize:13}}>{userPerms.icon}</span>
                <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>{userPerms.label}</span>
                {user&&<span style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>· {user.email}</span>}
              </div>
            )}
          </div>
          <Btn variant="gold" size="md" onClick={exportCSV}>⬇️ Export Orders CSV</Btn>
        </div>
      </div>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"28px 28px"}}>
        <div style={{display:"flex",gap:4,marginBottom:28,background:"#fff",padding:6,borderRadius:ds.radius.lg,border:`1px solid ${ds.color.border}`,boxShadow:ds.shadow.xs,overflowX:"auto"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:"0 0 auto",padding:"10px 18px",borderRadius:ds.radius.md,border:"none",cursor:"pointer",fontFamily:ds.font.body,fontSize:13.5,fontWeight:600,background:tab===t.id?ds.color.textDark:"transparent",color:tab===t.id?"#fff":ds.color.textMuted,transition:"all 0.15s",whiteSpace:"nowrap"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab==="overview"&&(
          <div>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
                <button onClick={async()=>{
                  if(!confirm("Download a full backup of orders, customers, products, and Rx uploads as JSON?")) return;
                  const r=await performFullBackup();
                  alert(r.ok?("✓ Backup downloaded! "+Object.entries(r.counts).map(([k,v])=>k+": "+v).join(" · ")):("⚠ "+r.error));
                }} style={{padding:"8px 14px",borderRadius:ds.radius.md,border:`1px solid ${ds.color.gold}`,background:ds.color.goldLight,cursor:"pointer",fontSize:12,fontWeight:700,color:ds.color.gold,fontFamily:ds.font.body}}>📥 Download Backup</button>
              </div>
            <div className="dm-grid-4" style={{marginBottom:32}}>
              {[{icon:"📦",label:"Total Orders",value:orders.length,color:ds.color.red},{icon:"🔔",label:"Payments to Review",value:pendingPaymentCount,color:"#1E40AF"},{icon:"💰",label:"Total Revenue",value:formatPHP(totalRevenue),color:ds.color.success},{icon:"👥",label:"Customers",value:customers.length,color:"#6366F1"}].map((s,i)=>(
                <div key={i} style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 22px",boxShadow:ds.shadow.xs,borderTop:`3px solid ${s.color}`}}>
                  <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontSize:22,fontWeight:700,color:ds.color.textDark,fontFamily:ds.font.display}}>{s.value}</div>
                  <div style={{fontSize:12,color:ds.color.textMuted,marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>Recent Orders</div>
                <Btn variant="outline" size="sm" onClick={exportCSV}>Export CSV</Btn>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{borderBottom:`2px solid ${ds.color.border}`}}>
                    {["Order ID","Customer","Total","Items","Payment","Pay Status","Status","Date"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontWeight:700,color:ds.color.textDark,fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {orders.slice(0,10).map(o=>{const sc=orderStatusColor(o.status||"pending");const psc=paymentStatusColor(o.paymentStatus||"awaiting");return(
                      <tr key={o.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                        <td style={{padding:"12px",fontWeight:700,color:ds.color.textDark}}>#{o.id.slice(-6).toUpperCase()}</td>
                        <td style={{padding:"12px",color:ds.color.textBody}}>{o.name||"—"}</td>
                        <td style={{padding:"12px",fontWeight:600}}>{formatPHP(o.total||0)}</td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{o.items?.length||0}</td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{o.paymentMethod||"—"}</td>
                        <td style={{padding:"12px"}}><span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:ds.radius.pill,background:psc.bg,color:psc.color}}>{PAYMENT_STATUS_LABELS[o.paymentStatus||"awaiting"]}</span></td>
                        <td style={{padding:"12px"}}><span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:ds.radius.pill,background:sc.bg,color:sc.color}}>{ORDER_STATUS_LABELS[o.status]||"Pending"}</span></td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{formatDate(o.createdAt)}</td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab==="orders"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>All Orders ({orders.length})</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {userPerms?.canEditOrders !== false && <Btn variant="primary" size="sm" onClick={()=>setShowNewOrderModal(true)}>+ New Order</Btn>}
                <Btn variant="outline" size="sm" onClick={exportCSV}>⬇️ CSV</Btn>
              </div>
            </div>
            {/* v13.0a: Source filter and search */}
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
              <input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="🔍 Search orders…" style={{padding:"6px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",width:160}}/>
              <button onClick={()=>setOrderSourceFilter("all")} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${orderSourceFilter==="all"?ds.color.red:ds.color.border}`,background:orderSourceFilter==="all"?ds.color.redLight:"#fff",color:orderSourceFilter==="all"?ds.color.red:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>All Sources</button>
              {ORDER_SOURCES.map(s=>(
                <button key={s.id} onClick={()=>setOrderSourceFilter(s.id)} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${orderSourceFilter===s.id?s.color:ds.color.border}`,background:orderSourceFilter===s.id?s.color+"22":"#fff",color:orderSourceFilter===s.id?s.color:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{s.icon} {s.label}</button>
              ))}
            </div>
            {pendingPaymentCount>0&&(
              <div style={{background:"#DBEAFE",border:"1px solid #93C5FD",borderRadius:ds.radius.md,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#1E40AF"}}>
                🔔 <strong>{pendingPaymentCount} payment proof{pendingPaymentCount!==1?"s":""} awaiting your review.</strong> Click "Confirm Payment" or "Reject Payment" on each order below.
              </div>
            )}
            {(()=>{
              const filteredOrders = orders.filter(o=>{
                if(orderSourceFilter!=="all" && (o.source||"website")!==orderSourceFilter) return false;
                if(orderSearch.trim()){
                  const q = orderSearch.toLowerCase();
                  return (o.name||"").toLowerCase().includes(q) ||
                         (o.email||"").toLowerCase().includes(q) ||
                         (o.phone||"").toLowerCase().includes(q) ||
                         (o.id||"").toLowerCase().includes(q);
                }
                return true;
              });
              return filteredOrders.length===0?<div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>{orders.length===0?"No orders yet.":"No orders match the current filter."}</div>:filteredOrders.map(o=>{
              const sc=orderStatusColor(o.status||"pending");
              const psc=paymentStatusColor(o.paymentStatus||"awaiting");
              const isOOS = o.status==="out_of_stock";
              const needsReview = o.paymentStatus==="submitted";
              return(
                <div key={o.id} style={{border:`2px solid ${needsReview?"#1E40AF":isOOS?"#C2410C":ds.color.border}`,borderRadius:ds.radius.lg,marginBottom:14,overflow:"hidden"}}>
                  <div style={{background:needsReview?"#DBEAFE":isOOS?"#FFF7ED":ds.color.canvas,padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                    <div>
                      <span style={{fontWeight:700,color:ds.color.textDark,fontSize:14}}>#{o.id.slice(-6).toUpperCase()}</span>
                      {(()=>{const src=findSource(o.source||"website");return <span style={{fontSize:10,marginLeft:8,padding:"2px 7px",background:src.color+"22",color:src.color,borderRadius:ds.radius.pill,fontWeight:700}}>{src.icon} {src.label}</span>;})()}
                      {o.vatTreatment && o.vatTreatment !== "vat_inclusive" && (()=>{const v=findVATTreatment(o.vatTreatment);return <span style={{fontSize:9,marginLeft:5,padding:"2px 7px",background:v.badgeColor+"22",color:v.badgeColor,borderRadius:ds.radius.pill,fontWeight:700,letterSpacing:"0.04em"}}>{v.badge}</span>;})()}
                      {o.createdByAdmin&&<span style={{fontSize:10,marginLeft:5,padding:"2px 7px",background:ds.color.goldLight,color:ds.color.gold,borderRadius:ds.radius.pill,fontWeight:700}}>👤 Admin</span>}
                      <span style={{fontSize:12,color:ds.color.textMuted,marginLeft:12}}>{o.name||"Guest"}</span>
                      <span style={{fontSize:12,color:ds.color.textMuted,marginLeft:8}}>· {o.email||"—"}</span>
                      {o.uid&&o.uid!=="guest"&&<span style={{fontSize:10,marginLeft:8,padding:"2px 6px",background:ds.color.successBg,color:ds.color.success,borderRadius:ds.radius.pill,fontWeight:700}}>✓ Registered</span>}
                      {o.phone&&<span style={{fontSize:12,marginLeft:8}}>·
                        <a href={`https://wa.me/${o.phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                          style={{color:"#25D366",fontWeight:700,marginLeft:4}}>💬 {o.phone}</a>
                      </span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:15}}>{formatPHP(o.total||0)}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:ds.radius.pill,background:psc.bg,color:psc.color}}>💳 {PAYMENT_STATUS_LABELS[o.paymentStatus||"awaiting"]}</span>
                      <select value={o.status||"pending"} onChange={e=>updateOrderStatus(o.id,e.target.value)}
                        style={{...selS,fontWeight:600,color:sc.color,background:sc.bg,minWidth:140}}>
                        {statuses.map(s=><option key={s} value={s} style={{color:ds.color.textDark,background:"#fff"}}>
                          {ORDER_STATUS_LABELS[s]||s}
                        </option>)}
                      </select>
                      <button onClick={()=>setShowOrderEditor(o)} style={{padding:"5px 12px",borderRadius:ds.radius.pill,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:11.5,fontWeight:600,color:ds.color.textBody,fontFamily:ds.font.body}}>✏️ Edit</button>
                      <span style={{fontSize:12,color:ds.color.textMuted}}>{formatDate(o.createdAt)}</span>
                    </div>
                  </div>
                  {needsReview&&(
                    <div style={{background:"#DBEAFE",borderBottom:"1px solid #93C5FD",padding:"12px 18px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                      <span style={{fontSize:13,color:"#1E40AF",fontWeight:600}}>🔔 Payment proof submitted — please review:</span>
                      {o.paymentProofUrl&&<a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{padding:"6px 14px",background:"#fff",border:"1px solid #93C5FD",borderRadius:ds.radius.pill,color:"#1E40AF",fontSize:12,fontWeight:700,textDecoration:"none"}}>📎 View Proof →</a>}
                      <button onClick={()=>confirmPayment(o.id)} style={{padding:"6px 14px",background:ds.color.success,color:"#fff",border:"none",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body}}>✅ Confirm Payment</button>
                      <button onClick={()=>rejectPayment(o.id)} style={{padding:"6px 14px",background:ds.color.red,color:"#fff",border:"none",borderRadius:ds.radius.pill,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:ds.font.body}}>❌ Reject</button>
                    </div>
                  )}
                  {isOOS&&(
                    <div style={{background:"#FFF7ED",borderBottom:`1px solid #FED7AA`,padding:"8px 18px",fontSize:12.5,color:"#C2410C",display:"flex",alignItems:"center",gap:8}}>
                      ⚠️ <strong>Out of Stock</strong> — Customer auto-notified by email. Contact them directly:
                      {o.phone&&<a href={`https://wa.me/${o.phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                        style={{background:"#25D366",color:"#fff",padding:"3px 10px",borderRadius:ds.radius.pill,fontWeight:700,fontSize:12,marginLeft:4}}>
                        💬 WhatsApp {o.phone}
                      </a>}
                    </div>
                  )}
                  <div style={{padding:"10px 18px"}}>
                    {o.recipientName&&<div style={{fontSize:12.5,color:ds.color.gold,background:ds.color.goldLight,padding:"4px 10px",borderRadius:ds.radius.sm,display:"inline-block",marginBottom:6}}>📦 Ship to: {o.recipientName} ({o.recipientPhone})</div>}
                    {o.items?.map((item,i)=><div key={i} style={{fontSize:12.5,color:ds.color.textBody,padding:"2px 0"}}>{item.name} × {item.qty} — {formatPHP(item.price*item.qty)}</div>)}
                    {o.address&&<div style={{fontSize:12,color:ds.color.textMuted,marginTop:6}}>📍 {o.address}</div>}
                    {o.deliveryCoords&&<div style={{fontSize:11,color:ds.color.textLight,marginTop:2}}>🗺️ Coords: {o.deliveryCoords.lat?.toFixed(5)}, {o.deliveryCoords.lng?.toFixed(5)} · <a href={`https://www.openstreetmap.org/?mlat=${o.deliveryCoords.lat}&mlon=${o.deliveryCoords.lng}#map=17/${o.deliveryCoords.lat}/${o.deliveryCoords.lng}`} target="_blank" rel="noopener noreferrer" style={{color:ds.color.red,textDecoration:"underline"}}>View map</a></div>}
                    {o.instructions&&<div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>📝 {o.instructions}</div>}
                    {o.paymentProofUrl&&!needsReview?(
                      <div style={{marginTop:6,display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:ds.radius.pill,background:ds.color.successBg,color:ds.color.success}}>📎 Payment Proof</span>
                        <a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:ds.color.success,textDecoration:"underline"}}>View →</a>
                      </div>
                    ):!needsReview&&!o.paymentProofUrl?(
                      <div style={{marginTop:6,fontSize:11,color:ds.color.textLight}}>📎 No payment proof yet</div>
                    ):null}
                    {o.paymentRejectReason&&<div style={{marginTop:6,fontSize:12,color:ds.color.red}}>❌ Rejected: {o.paymentRejectReason}</div>}
                  </div>
                </div>
              );
            });
            })()}
          </div>
        )}

        {tab==="receivables"&&(
          <ReceivablesTab orders={orders} onMarkPaid={markOrderPaid}/>
        )}

        {tab==="expenses"&&(
          <ExpensesTab
            expenses={expenses}
            orders={orders}
            onEdit={(e)=>setShowExpenseEditor(e)}
            onNew={()=>setShowExpenseEditor({})}
            onRefresh={refreshData}
          />
        )}

        {tab==="billings"&&(
          <ManualBillingsTab
            billings={manualBillings}
            onEdit={(b)=>setShowBillingEditor(b)}
            onNew={()=>setShowBillingEditor({})}
          />
        )}

        {tab==="margin"&&(
          <Suspense fallback={<Spinner/>}><MarginDashboardTab orders={orders} expenses={expenses}/></Suspense>
        )}


        {tab==="products"&&(
          <div>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"20px 28px",boxShadow:ds.shadow.xs,marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>Product Catalog</div>
                <div style={{fontSize:13,color:ds.color.textMuted,marginTop:2}}>{PRODUCTS.length} products live · Changes appear on the site instantly.</div>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                {seedingMessage&&<span style={{fontSize:12,color:seedingMessage.startsWith("✓")?ds.color.success:ds.color.textMuted}}>{seedingMessage}</span>}
                {PRODUCTS.length===0&&<Btn variant="gold" size="sm" onClick={seedProductsFromDefaults} disabled={seeding}>{seeding?"Seeding…":"🌱 Seed 63 Default Products"}</Btn>}
                {!PRODUCTS.some(p=>p.seedImport===true) && (
                  <Btn variant="secondary" size="sm" onClick={seedFullCatalog} disabled={seeding} title="Import 130 products (23 medicines + 107 equipment) from the catalog seed">{seeding?"Importing…":"📦 Import Full Catalog (130)"}</Btn>
                )}
                {/* v16.8: Bulk hide/show Rx products (Fiuu approval workaround) */}
                {(()=>{
                  const visibleRx = PRODUCTS.filter(p => p.requiresPrescription === true && p.visible !== false).length;
                  const hiddenRx = PRODUCTS.filter(p => p.requiresPrescription === true && p.visible === false).length;
                  if (visibleRx > 0) {
                    return <Btn variant="outline" size="sm" onClick={bulkHideRxProducts} disabled={seeding} title="Hide all Rx products from the public shop (for Fiuu / payment gateway approval)">{seeding?"Hiding…":`🙈 Hide ${visibleRx} Rx Product${visibleRx!==1?"s":""}`}</Btn>;
                  }
                  if (hiddenRx > 0) {
                    return <Btn variant="gold" size="sm" onClick={bulkShowRxProducts} disabled={seeding} title="Re-show all hidden Rx products">{seeding?"Restoring…":`👁️ Show ${hiddenRx} Hidden Rx Product${hiddenRx!==1?"s":""}`}</Btn>;
                  }
                  return null;
                })()}
                <Btn variant="primary" size="sm" onClick={()=>setEditingProduct({_new:true,id:"",name:"",desc:"",price:null,cta:"buy",imageSrc:"",category:"pharma",featured:false,requiresPrescription:false,rxCategory:null,tag:"",visible:true,available:"available"})}>+ Add New Product</Btn>
              </div>
            </div>
            <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
              {CATEGORIES.map(cat=>{
                const catProds=PRODUCTS.filter(p=>p.category===cat.id);
                if(catProds.length===0) return null;
                return(
                  <div key={cat.id} style={{marginBottom:32}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:10,borderBottom:`2px solid ${cat.color}30`}}>
                      <span style={{fontSize:18}}>{cat.icon}</span>
                      <span style={{fontWeight:700,fontSize:15,color:ds.color.textDark}}>{cat.label}</span>
                      <span style={{fontSize:12,color:ds.color.textMuted}}>({catProds.length} products)</span>
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                        <thead><tr style={{borderBottom:`1px solid ${ds.color.border}`}}>
                          {["Image","Name","Price","CTA","Stock","Rx","Visible","Actions"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",fontWeight:700,color:ds.color.textMuted,fontSize:11,textTransform:"uppercase"}}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {catProds.map(p=>(
                            <tr key={p.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`,opacity:p.visible===false?0.5:1}}>
                              <td style={{padding:"9px 10px"}}>
                                {p.imageSrc?<img src={p.imageSrc} alt="" style={{width:36,height:36,objectFit:"contain",borderRadius:4,background:"#F8F7F5"}}/>:<div style={{width:36,height:36,borderRadius:4,background:ds.color.canvas,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:ds.color.textLight}}>📦</div>}
                              </td>
                              <td style={{padding:"9px 10px",fontWeight:600,color:ds.color.textDark}}>{p.name}<div style={{fontSize:10,color:ds.color.textLight,fontFamily:"monospace",marginTop:2}}>{p.id}</div></td>
                              <td style={{padding:"9px 10px",color:p.price?ds.color.success:ds.color.textMuted,fontWeight:600}}>{p.price?formatPHP(p.price):"Quote"}</td>
                              <td style={{padding:"9px 10px"}}><CtaBadge type={p.cta}/></td>
                              <td style={{padding:"9px 10px"}}>
                                <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:ds.radius.pill,background:p.available==="out_of_stock"?"#FEE2E2":p.available==="on_request"?"#FEF9C3":ds.color.successBg,color:p.available==="out_of_stock"?ds.color.red:p.available==="on_request"?"#A16207":ds.color.success}}>
                                  {p.available==="out_of_stock"?"Out":p.available==="on_request"?"On Req":"OK"}
                                </span>
                                {p.stock_qty!=null&&p.stock_qty<=5&&p.available!=="out_of_stock"&&(
                                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:ds.radius.pill,background:"#FEF9C3",color:"#A16207",border:"1px solid #FDE68A"}}>
                                    ⚠️ Low ({p.stock_qty})
                                  </span>
                                )}
                                {p.stock_qty!=null&&p.stock_qty>5&&(
                                  <span style={{fontSize:10,color:ds.color.textLight}}>📦 {p.stock_qty} left</span>
                                )}
                              </td>
                              <td style={{padding:"9px 10px"}}>{p.requiresPrescription?<span style={{fontSize:10,color:"#92400E",background:"#FFF3CD",padding:"2px 6px",borderRadius:ds.radius.pill}}>Rx</span>:<span style={{fontSize:10,color:ds.color.success}}>OTC</span>}</td>
                              <td style={{padding:"9px 10px"}}>
                                <button onClick={()=>toggleProductVisibility(p)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14}}>{p.visible===false?"🙈":"👁️"}</button>
                              </td>
                              <td style={{padding:"9px 10px"}}>
                                <div style={{display:"flex",gap:6}}>
                                  <button onClick={()=>setEditingProduct({...p})} style={{padding:"4px 10px",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.sm,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.textBody}}>Edit</button>
                                  <button onClick={()=>deleteProduct(p)} style={{padding:"4px 10px",border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.sm,background:ds.color.redLight,cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.red}}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              {PRODUCTS.length===0&&(
                <div style={{textAlign:"center",padding:"60px 20px",color:ds.color.textMuted}}>
                  <div style={{fontSize:36,marginBottom:12}}>📦</div>
                  <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>No products yet</div>
                  <div style={{fontSize:13,marginBottom:20}}>Click "Seed 63 Default Products" above to populate, or add your own.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab==="customers"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark}}>Customers ({customers.length})</div>
              {userPerms?.canEditOrders !== false && <Btn variant="primary" size="sm" onClick={()=>setShowCustomerEditor({})}>+ New Customer</Btn>}
            </div>
            {/* v13.0a: Customer search + tag filter */}
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
              <input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="🔍 Search by name, email, phone…" style={{padding:"6px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,fontSize:12,fontFamily:ds.font.body,outline:"none",width:200}}/>
              <button onClick={()=>setCustomerTagFilter("all")} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${customerTagFilter==="all"?ds.color.red:ds.color.border}`,background:customerTagFilter==="all"?ds.color.redLight:"#fff",color:customerTagFilter==="all"?ds.color.red:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>All</button>
              {CUSTOMER_TAGS.map(t=>(
                <button key={t.id} onClick={()=>setCustomerTagFilter(t.id)} style={{padding:"5px 10px",borderRadius:ds.radius.pill,border:`1px solid ${customerTagFilter===t.id?t.color:ds.color.border}`,background:customerTagFilter===t.id?t.color+"22":"#fff",color:customerTagFilter===t.id?t.color:ds.color.textBody,cursor:"pointer",fontSize:11.5,fontWeight:600,fontFamily:ds.font.body}}>{t.label}</button>
              ))}
            </div>
            {(()=>{
              const filteredCustomers = customers.filter(c=>{
                if(customerTagFilter!=="all"){
                  if(!c.tags||!c.tags.includes(customerTagFilter)) return false;
                }
                if(customerSearch.trim()){
                  const q = customerSearch.toLowerCase();
                  return (c.name||"").toLowerCase().includes(q) ||
                         (c.email||"").toLowerCase().includes(q) ||
                         (c.phone||"").toLowerCase().includes(q);
                }
                return true;
              });
              return filteredCustomers.length===0?(
                <div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>{customers.length===0?"No customers yet. Click \"+ New Customer\" to add one.":"No customers match the current filter."}</div>
              ):(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{borderBottom:`2px solid ${ds.color.border}`}}>
                    {["Name","Contact","Tags","Orders","Spent","Points","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontWeight:700,color:ds.color.textDark,fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredCustomers.map(c=>(
                      <tr key={c.id} style={{borderBottom:`1px solid ${ds.color.borderLight}`}}>
                        <td style={{padding:"12px",fontWeight:600,color:ds.color.textDark}}>
                          {c.name||"—"}
                          {c.source==="manual"&&<span style={{fontSize:9,marginLeft:6,padding:"2px 6px",background:ds.color.canvas,borderRadius:ds.radius.pill,color:ds.color.textMuted}}>OFFLINE</span>}
                        </td>
                        <td style={{padding:"12px",color:ds.color.textBody,fontSize:12}}>
                          {c.email||"—"}<br/>
                          <span style={{color:ds.color.textMuted}}>{c.phone||"—"}</span>
                        </td>
                        <td style={{padding:"12px"}}>
                          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                            {(c.tags||[]).map(t=>{
                              const tag = findTag(t);
                              return tag?<span key={t} style={{fontSize:10,padding:"2px 7px",borderRadius:ds.radius.pill,background:tag.color+"22",color:tag.color,fontWeight:600}}>{tag.label}</span>:null;
                            })}
                            {(!c.tags||c.tags.length===0)&&<span style={{fontSize:11,color:ds.color.textLight}}>—</span>}
                          </div>
                        </td>
                        <td style={{padding:"12px",color:ds.color.textMuted}}>{c.totalOrders||0}</td>
                        <td style={{padding:"12px",fontWeight:600,color:ds.color.success,fontSize:12}}>{formatPHP(c.totalSpent||0)}</td>
                        <td style={{padding:"12px",color:ds.color.gold,fontWeight:600,fontSize:12}}>{(c.points||0).toLocaleString()}</td>
                        <td style={{padding:"12px"}}>
                          {userPerms?.canEditOrders !== false ? (<button onClick={()=>setShowCustomerEditor(c)} style={{padding:"4px 10px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:ds.color.textBody,fontFamily:ds.font.body}}>✏️ Edit</button>) : (<span style={{fontSize:11,color:ds.color.textLight}}>🔒</span>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })()}
          </div>
        )}

        {tab==="rx"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <div style={{fontFamily:ds.font.display,fontSize:18,color:ds.color.textDark,marginBottom:20}}>Prescription Uploads ({rxUps.length})</div>
            {rxUps.length===0?<div style={{textAlign:"center",padding:"40px 0",color:ds.color.textMuted}}>No prescription uploads yet.</div>:rxUps.map(r=>(
              <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:`1px solid ${ds.color.borderLight}`,flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:14,flex:1,minWidth:0}}>
                  {/* V11.2: Show thumbnail/preview of uploaded Rx */}
                  {r.fileUrl?(
                    <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,width:60,height:60,borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,overflow:"hidden",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                      {r.fileName?.toLowerCase().endsWith('.pdf')?(
                        <span style={{fontSize:24}}>📄</span>
                      ):(
                        <img src={r.fileUrl} alt="Rx" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      )}
                    </a>
                  ):(
                    <div style={{flexShrink:0,width:60,height:60,borderRadius:ds.radius.sm,border:`1px dashed ${ds.color.border}`,background:ds.color.canvas,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:ds.color.textLight}}>📋</div>
                  )}
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:ds.color.textDark}}>Order #{r.orderId?.slice(-6).toUpperCase()||"—"}</div>
                    <div style={{fontSize:12,color:ds.color.textMuted,marginTop:2}}>{r.customerName||"Guest"} · {r.fileName||"Prescription"} · {formatDate(r.createdAt)}</div>
                    {r.fileUrl?(
                      <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:ds.color.red,fontWeight:700,textDecoration:"underline",marginTop:4,display:"inline-block"}}>
                        🔍 View Full Prescription →
                      </a>
                    ):(
                      <div style={{fontSize:11,color:ds.color.textLight,marginTop:4,fontStyle:"italic"}}>⚠ No file attached (uploaded before v11.2 fix)</div>
                    )}
                  </div>
                </div>
                <select value={r.status||"pending"} onChange={e=>updateRxStatus(r.id,e.target.value)} style={selS}>
                  {["pending","verified","rejected"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
        
        {/* v16.5: Blog/Posts tab */}
        {tab==="blog"&&(
          <div style={{background:"#fff",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.lg,padding:"24px 28px",boxShadow:ds.shadow.xs}}>
            <PostsTab posts={posts} refreshPosts={refreshPosts} userRole={userRole}/>
          </div>
        )}

        {/* v16.18: Supplier Catalog Tab */}
        {tab==="suppliers"&&(
          <Suspense fallback={<Spinner/>}><SupplierCatalogTab/></Suspense>
        )}

        {/* v16.18: Auto-RFQ Tab */}
        {tab==="rfq"&&(
          <Suspense fallback={<Spinner/>}><RFQTab/></Suspense>
        )}
        
        {/* v16.17: Settings Tab — Payment Method Toggles (Super Admin only) */}
        {tab==="settings"&&(
          <PaymentMethodSettings/>
        )}
      </div>
      {editingProduct && <ProductEditModal product={editingProduct} onSave={saveProduct} onClose={()=>setEditingProduct(null)}/>}
      
      {/* v13.0a Modals */}
      {showNewOrderModal && (
        <NewOrderModal
          onClose={()=>setShowNewOrderModal(false)}
          onSaved={refreshData}
          customers={customers}
          products={PRODUCTS}
        />
      )}
      {showCustomerEditor !== null && (
        <CustomerEditorModal
          customer={showCustomerEditor}
          onClose={()=>setShowCustomerEditor(null)}
          onSaved={refreshData}
        />
      )}
      {showExpenseEditor !== null && (
        <ExpenseEditorModal
          expense={showExpenseEditor}
          orders={orders}
          onClose={()=>setShowExpenseEditor(null)}
          onSaved={refreshData}
        />
      )}
      {showBillingEditor !== null && (
        <ManualBillingEditorModal
          billing={showBillingEditor}
          onClose={()=>setShowBillingEditor(null)}
          onSaved={refreshData}
        />
      )}
      {showOrderEditor !== null && (
        <Suspense fallback={<Spinner/>}><OrderEditorModal
          order={showOrderEditor}
          products={PRODUCTS}
          onClose={()=>setShowOrderEditor(null)}
          onSaved={handleOrderSaved}
          onDeleted={handleOrderDeleted}
          onGeneratePDF={(o)=>{setShowOrderEditor(null); setShowPDFModal(o);}}
          showMarginFields={userPerms?.canSeeMargins !== false}
          canDelete={userPerms?.canDeleteOrders === true}
          canEdit={userPerms?.canEditOrders === true}
        /></Suspense>
      )}
      {showPDFModal !== null && (
        <Suspense fallback={<Spinner/>}><PDFGeneratorModal
          order={showPDFModal}
          onClose={()=>setShowPDFModal(null)}
        /></Suspense>
      )}
      <BackupReminder/>
    </div>
  );
}

export default AdminDashboard;
