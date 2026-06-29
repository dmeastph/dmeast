import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ds } from "../constants/design";
import { CATEGORIES, filterPharmaPublic } from "../constants/categories";
import { useProducts } from "../context/ProductsContext";
import { formatPHP } from "../utils/format";
import { Btn, Tag, Spinner, ProductImg } from "../components/ui";
import { trackEvent } from "../lib/analytics";
import { ProductReviews } from "../components/ProductReviews";

const BASE_URL = "https://dmeastph.com";

function injectProductJsonLd(product, category) {
  document.querySelectorAll('script[data-dmeast-product-jsonld]').forEach(el => el.remove());

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.desc,
    "image": product.imageSrc ? [`${BASE_URL}${product.imageSrc}`] : undefined,
    "sku": product.id,
    "brand": { "@type": "Brand", "name": "DMEAST" },
    "category": category?.label || product.tag,
    "url": `${BASE_URL}/products/${product.id}`,
    ...(product.price ? {
      "offers": {
        "@type": "Offer",
        "priceCurrency": "PHP",
        "price": product.price,
        "availability": product.available === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        "seller": { "@type": "Organization", "name": "DMEAST" },
      },
    } : {
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "seller": { "@type": "Organization", "name": "DMEAST" },
        "description": "Price upon request — contact us for a formal quotation.",
      },
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",     "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Products", "item": `${BASE_URL}/products` },
      { "@type": "ListItem", "position": 3, "name": category?.label || product.tag, "item": `${BASE_URL}/products?cat=${product.category}` },
      { "@type": "ListItem", "position": 4, "name": product.name, "item": `${BASE_URL}/products/${product.id}` },
    ],
  };

  [productSchema, breadcrumbSchema].forEach(schema => {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute("data-dmeast-product-jsonld", "1");
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  });
}

export default function ProductDetailPage({ addToCart, wishlist, toggleWishlist, setPage, user }) {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { products } = useProducts();
  const [feedback, setFeedback] = useState(null);

  const product = filterPharmaPublic(products).find(p => p.id === productId);
  const category = product ? CATEGORIES.find(c => c.id === product.category) : null;
  const related = product
    ? filterPharmaPublic(products)
        .filter(p => p.id !== product.id && p.category === product.category)
        .slice(0, 4)
    : [];

  // SEO + JSON-LD
  useEffect(() => {
    if (!product) return;
    const title = `${product.name} | DMEAST Medical Supplies`;
    document.title = title;
    const desc = product.desc?.slice(0, 160) || `${product.name} — medical supply available at DMEAST Philippines.`;

    const setMeta = (name, content, attr = "name") => {
      if (!content) return;
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attr, name); document.head.appendChild(tag); }
      tag.setAttribute("content", content);
    };
    setMeta("description", desc);
    setMeta("og:title", title, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:url", `${BASE_URL}/products/${product.id}`, "property");
    if (product.imageSrc) setMeta("og:image", `${BASE_URL}${product.imageSrc}`, "property");
    let link = document.querySelector("link[rel='canonical']");
    if (!link) { link = document.createElement("link"); link.setAttribute("rel", "canonical"); document.head.appendChild(link); }
    link.setAttribute("href", `${BASE_URL}/products/${product.id}`);

    injectProductJsonLd(product, category);
    trackEvent("view_item", { item_id: product.id, item_name: product.name, item_category: product.category });

    return () => document.querySelectorAll('script[data-dmeast-product-jsonld]').forEach(el => el.remove());
  }, [product, category]);

  if (products.length === 0) {
    return <div style={{ paddingTop: 91, display: "flex", justifyContent: "center", padding: "100px 28px" }}><Spinner /></div>;
  }

  if (!product) {
    return (
      <div style={{ paddingTop: 91, textAlign: "center", padding: "100px 28px" }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>📦</div>
        <div style={{ fontFamily: ds.font.display, fontSize: 24, color: ds.color.textDark, marginBottom: 12 }}>Product not found</div>
        <p style={{ fontSize: 14, color: ds.color.textMuted, marginBottom: 24 }}>This product may have been removed or is unavailable publicly.</p>
        <Btn variant="primary" size="md" onClick={() => navigate("/products")}>← Back to Products</Btn>
      </div>
    );
  }

  const inWishlist = wishlist?.includes(product.id);

  const handleAddToCart = () => {
    addToCart(product);
    setFeedback("added");
    trackEvent("add_to_cart", { item_id: product.id, item_name: product.name, price: product.price });
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div style={{ paddingTop: 91 }}>
      {/* Breadcrumb */}
      <div style={{ background: ds.color.canvas, borderBottom: `1px solid ${ds.color.border}`, padding: "10px 28px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: ds.color.textMuted, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: ds.color.textMuted, fontFamily: ds.font.body, fontSize: 12.5 }}>Home</button>
          <span>›</span>
          <button onClick={() => navigate("/products")} style={{ background: "none", border: "none", cursor: "pointer", color: ds.color.textMuted, fontFamily: ds.font.body, fontSize: 12.5 }}>Products</button>
          <span>›</span>
          <button onClick={() => navigate(`/products?cat=${product.category}`)} style={{ background: "none", border: "none", cursor: "pointer", color: ds.color.textMuted, fontFamily: ds.font.body, fontSize: 12.5 }}>{category?.label || product.tag}</button>
          <span>›</span>
          <span style={{ color: ds.color.textDark, fontWeight: 600 }}>{product.name}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", gap: 48, alignItems: "start" }}>

          {/* Image */}
          <div style={{ position: "sticky", top: 87 }}>
            <div style={{
              borderRadius: ds.radius.xl, overflow: "hidden", border: `1px solid ${ds.color.border}`,
              background: ds.color.canvas, aspectRatio: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <ProductImg imageSrc={product.imageSrc} category={product.category} name={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          </div>

          {/* Info */}
          <div>
            {/* Category + tags */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              {category && (
                <button onClick={() => navigate(`/products?cat=${product.category}`)} style={{
                  background: category.accent + "18", color: category.accent, border: `1px solid ${category.accent}44`,
                  borderRadius: ds.radius.pill, padding: "4px 12px", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: ds.font.body,
                }}>
                  {category.icon} {category.label}
                </button>
              )}
              {product.requiresPrescription && (
                <span style={{ background: "#FFF3CD", border: "1px solid #FBBF24", borderRadius: ds.radius.pill, padding: "4px 10px", fontSize: 10.5, fontWeight: 700, color: "#92400E" }}>
                  💊 Rx Required
                </span>
              )}
            </div>

            <h1 style={{ fontFamily: ds.font.display, fontSize: "clamp(22px,3vw,32px)", color: ds.color.textDark, lineHeight: 1.2, fontWeight: 400, marginBottom: 16 }}>
              {product.name}
            </h1>

            {/* Price */}
            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${ds.color.border}` }}>
              {product.price ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: ds.color.textDark }}>{formatPHP(product.price)}</div>
                  <div style={{ fontSize: 12, color: ds.color.textMuted }}>VAT inclusive</div>
                </div>
              ) : (
                <div style={{ fontSize: 15, color: ds.color.textMuted, fontStyle: "italic" }}>
                  Price upon request — contact us for a formal BIR-compliant quotation.
                </div>
              )}
            </div>

            {/* Description */}
            <p style={{ fontSize: 14.5, color: ds.color.textBody, lineHeight: 1.8, marginBottom: 28 }}>
              {product.desc}
            </p>

            {/* CTA buttons */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {product.cta === "buy" && (
                <Btn variant={feedback === "added" ? "success" : "primary"} size="lg" onClick={handleAddToCart}>
                  {feedback === "added" ? "✓ Added to Cart" : "+ Add to Cart"}
                </Btn>
              )}
              {product.cta !== "buy" && (
                <Btn variant="gold" size="lg" onClick={() => navigate("/quote")}>Request a Quote</Btn>
              )}
              <Btn variant="outline" size="lg" onClick={() => navigate("/contact")}>Ask a Question</Btn>
            </div>

            {/* Wishlist */}
            {toggleWishlist && (
              <button onClick={() => toggleWishlist(product.id)} style={{
                display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                cursor: "pointer", fontSize: 13, color: ds.color.textMuted, fontFamily: ds.font.body,
                padding: "6px 0", marginBottom: 24,
              }}>
                {inWishlist ? "❤️ Saved to Wishlist" : "🤍 Add to Wishlist"}
              </button>
            )}

            {/* Trust signals */}
            <div style={{ background: ds.color.canvas, borderRadius: ds.radius.lg, padding: "16px 20px", border: `1px solid ${ds.color.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { icon: "✅", label: "BIR-Registered Supplier" },
                { icon: "🚚", label: "Nationwide Delivery" },
                { icon: "📄", label: "Official Receipt Issued" },
                { icon: "🏥", label: "Trusted by 50+ Institutions" },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: ds.color.textBody }}>
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <ProductReviews productId={product?.id} user={user} />

        {/* Related products */}
        {related.length > 0 && (
          <section style={{ marginTop: 64 }}>
            <h2 style={{ fontFamily: ds.font.display, fontSize: 22, color: ds.color.textDark, marginBottom: 24, fontWeight: 400 }}>
              More in {category?.label}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
              {related.map(p => (
                <button key={p.id} onClick={() => { navigate(`/products/${p.id}`); window.scrollTo({ top: 0, behavior: "instant" }); }} style={{
                  background: "#fff", border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.lg,
                  padding: 0, overflow: "hidden", cursor: "pointer", textAlign: "left", fontFamily: ds.font.body,
                  transition: "box-shadow 0.2s, border-color 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = ds.shadow.md; e.currentTarget.style.borderColor = category?.accent || ds.color.redBorder; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = ds.color.border; }}
                >
                  <ProductImg imageSrc={p.imageSrc} category={p.category} name={p.name} style={{ height: 140, objectFit: "contain" }} />
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: ds.color.textDark, lineHeight: 1.35, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: ds.color.textMuted }}>{p.price ? formatPHP(p.price) : "Price on request"}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
