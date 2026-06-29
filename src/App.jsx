import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { isAdminUser } from "./constants/admin";
import * as Sentry from "@sentry/react";
import { trackPageView } from "./lib/analytics";
import { ds } from "./constants/design";
import { useSEO } from "./hooks/useSEO";
import { GLOBAL_CSS } from "./styles/global";
import { ProductsProvider } from "./context/ProductsContext";
import { Btn, Spinner } from "./components/ui";
import { AuthModal } from "./components/AuthModal";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { FloatingChat } from "./components/FloatingChat";
import { SandboxBanner } from "./components/SandboxBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ─── Lazy-loaded pages & heavy components ────────────────────────────────────
const CustomerPortal   = lazy(() => import("./components/CustomerPortal"));
const AdminDashboard   = lazy(() => import("./components/admin/AdminDashboard"));
const HomePage         = lazy(() => import("./pages/HomePage"));
const AboutPage        = lazy(() => import("./pages/AboutPage"));
const ProductsPage     = lazy(() => import("./pages/ProductsPage"));
const InstitutionalOrdersPage = lazy(() => import("./pages/InstitutionalOrdersPage"));
const QuotePage        = lazy(() => import("./pages/QuotePage"));
const ContactPage      = lazy(() => import("./pages/ContactPage"));
const PaymentReturnPage = lazy(() => import("./pages/PaymentReturnPage"));
const CartPage         = lazy(() => import("./pages/CartPage"));
const TrackOrderPage   = lazy(() => import("./pages/TrackOrderPage"));
const PrivacyPage      = lazy(() => import("./pages/PrivacyPage"));
const TermsPage        = lazy(() => import("./pages/TermsPage"));
const RefundPage       = lazy(() => import("./pages/RefundPage"));
const ShippingPage     = lazy(() => import("./pages/ShippingPage"));
const BlogPage         = lazy(() => import("./pages/BlogPage"));
const BlogPostPage     = lazy(() => import("./pages/BlogPostPage"));
const CancellationPage = lazy(() => import("./pages/CancellationPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const B2BQuotePage = lazy(() => import("./pages/B2BQuotePage"));

// Page-load spinner
function PageSpinner() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}>
      <Spinner size={36}/>
    </div>
  );
}

// Map old page-id strings → URL paths (kept for setPage compat shim)
const PAGE_PATHS = {
  home: "/", about: "/about", products: "/products",
  institutional: "/institutional", quote: "/quote", contact: "/contact",
  cart: "/cart", portal: "/portal", admin: "/admin",
  privacy: "/privacy", terms: "/terms", refunds: "/refunds",
  shipping: "/shipping", cancellation: "/cancellation",
  blog: "/blog", blogPost: "/blog", track: "/track",
  paymentReturn: "/payment-return",
  b2bQuote: "/b2b-quote",
};

// Map URL pathname → page-id for Navbar active-state highlight
const PATH_TO_PAGE = {
  "/": "home", "/about": "about", "/products": "products",
  "/institutional": "institutional", "/quote": "quote", "/contact": "contact",
  "/cart": "cart", "/portal": "portal", "/admin": "admin",
  "/privacy": "privacy", "/terms": "terms", "/refunds": "refunds",
  "/shipping": "shipping", "/cancellation": "cancellation",
  "/blog": "blog", "/track": "track", "/payment-return": "paymentReturn",
};

export default function App(){
  const navigate = useNavigate();
  const location = useLocation();
  // GA4 page view tracking on every navigation
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
  useSEO(location.pathname);

  const [cart,setCart]=useState([]);
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [isAdmin,setIsAdmin]=useState(false);
  const [showAuth,setShowAuth]=useState(false);
  const [wishlist,setWishlist]=useState([]);

  // ── Compat shim: components that still call setPage("id") navigate correctly
  const setPage=useCallback(id=>{
    navigate(PAGE_PATHS[id]||"/");
    window.scrollTo({top:0,behavior:"instant"});
  },[navigate]);

  // Compat shim: setActiveCategory → /products?cat=id
  const setActiveCategory=useCallback(id=>{
    navigate(id ? `/products?cat=${id}` : "/products");
    window.scrollTo({top:0,behavior:"instant"});
  },[navigate]);

  // Compat shim: setActivePost → /blog/:slug
  const setActivePost=useCallback(post=>{
    if(post?.slug){navigate(`/blog/${post.slug}`);window.scrollTo({top:0,behavior:"instant"});}
  },[navigate]);

  useEffect(()=>{
    return onAuthStateChanged(auth,async u=>{
      setUser(u);
      if(u){
        setIsAdmin(isAdminUser(u.email));
        Sentry.setUser({ id: u.uid, email: u.email });
        try{const snap=await getDoc(doc(db,"customers",u.uid));if(snap.exists())setWishlist(snap.data().wishlist||[]);}catch(_){ /* ignore */ }
      }else{setIsAdmin(false);setWishlist([]);Sentry.setUser(null);}
      setAuthLoading(false);
    });
  },[]);

  const handleSignIn=()=>setShowAuth(true);
  const handleSignOut=async()=>{await signOut(auth);navigate("/");};
  const handleAuthSuccess=u=>{setShowAuth(false);setUser(u);setIsAdmin(isAdminUser(u.email));};

  const addToCart=useCallback(product=>{
    setCart(c=>{const e=c.find(i=>i.id===product.id);return e?c.map(i=>i.id===product.id?{...i,qty:i.qty+1}:i):[...c,{...product,qty:1}];});
  },[]);
  const removeFromCart=useCallback(id=>setCart(c=>c.filter(i=>i.id!==id)),[]);
  const updateQty=useCallback((id,qty)=>{if(qty<1){removeFromCart(id);return;}setCart(c=>c.map(i=>i.id===id?{...i,qty}:i));},[removeFromCart]);

  const toggleWishlist=useCallback(async productId=>{
    if(!user){setShowAuth(true);return;}
    const next=wishlist.includes(productId)?wishlist.filter(x=>x!==productId):[...wishlist,productId];
    setWishlist(next);
    try{await updateDoc(doc(db,"customers",user.uid),{wishlist:next});}catch(_){ /* ignore */ }
  },[user,wishlist]);

  const handleOrderComplete=useCallback(()=>setCart([]),[]);

  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const activePage=PATH_TO_PAGE[location.pathname]||(location.pathname.startsWith("/blog/")?"blog":"home");

  if(authLoading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#fff",fontFamily:ds.font.body}}>
      <div style={{textAlign:"center"}}>
        <Spinner size={40}/>
        <div style={{marginTop:16,fontSize:14,color:ds.color.textMuted}}>Loading DMEAST…</div>
      </div>
    </div>
  );

  return(
    <ProductsProvider>
    <div style={{fontFamily:ds.font.body,minHeight:"100vh",background:ds.color.surface,color:ds.color.textBody}}>
      <style>{GLOBAL_CSS}</style>
      <Navbar activePage={activePage} setPage={setPage} cartCount={cartCount} user={user} isAdmin={isAdmin} onSignIn={handleSignIn} onSignOut={handleSignOut}/>
      <main>
      <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<PageSpinner/>}>
        <Routes>
          <Route path="/" element={<HomePage setPage={setPage} addToCart={addToCart} setActiveCategory={setActiveCategory} setActivePost={setActivePost} wishlist={wishlist} toggleWishlist={toggleWishlist}/>}/>
          <Route path="/about" element={<AboutPage/>}/>
          <Route path="/products" element={<ProductsPage setPage={setPage} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist}/>}/>
          <Route path="/products/:productId" element={<ProductDetailPage addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} setPage={setPage} user={user}/>}/>
          <Route path="/b2b-quote" element={<B2BQuotePage/>}/>
          <Route path="/institutional" element={<InstitutionalOrdersPage setPage={setPage}/>}/>
          <Route path="/quote" element={<QuotePage/>}/>
          <Route path="/contact" element={<ContactPage/>}/>
          <Route path="/cart" element={<CartPage cart={cart} removeFromCart={removeFromCart} updateQty={updateQty} setPage={setPage} user={user} onOrderComplete={handleOrderComplete}/>}/>
          <Route path="/portal" element={user?<CustomerPortal user={user} setPage={setPage} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist}/>:<div style={{paddingTop:83,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{fontSize:32,marginBottom:12}}>🔒</div><div style={{fontFamily:ds.font.display,fontSize:20,color:ds.color.textDark,marginBottom:12}}>Sign in to access your portal</div><Btn variant="primary" size="md" onClick={handleSignIn}>Sign In</Btn></div></div>}/>
          <Route path="/admin" element={isAdmin?<AdminDashboard user={user}/>:<div style={{paddingTop:83,minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center",color:ds.color.textMuted}}>⛔ Admin access only.</div></div>}/>
          <Route path="/privacy" element={<PrivacyPage/>}/>
          <Route path="/terms" element={<TermsPage/>}/>
          <Route path="/refunds" element={<RefundPage/>}/>
          <Route path="/shipping" element={<ShippingPage/>}/>
          <Route path="/cancellation" element={<CancellationPage/>}/>
          <Route path="/blog" element={<BlogPage setPage={setPage} setActivePost={setActivePost}/>}/>
          <Route path="/blog/:slug" element={<BlogPostPage setPage={setPage}/>}/>
          <Route path="/track" element={<TrackOrderPage/>}/>
          <Route path="/payment-return" element={<PaymentReturnPage setPage={setPage}/>}/>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </Suspense>
      </ErrorBoundary>
      </main>
      <Footer setPage={setPage}/>
      <FloatingChat hidden={location.pathname==="/admin"}/>
      <SandboxBanner/>
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)} onSuccess={handleAuthSuccess}/>}
    </div>
    <