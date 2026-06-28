import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ds } from "../constants/design";
import { CATEGORIES } from "../constants/categories";
import { formatPHP } from "../utils/format";
import { Btn, CtaBadge, Tag } from "./ui";
import { ProductImg } from "./ui";

export function ProductCard({ product, addToCart, setPage, wishlist, toggleWishlist }) {
  const [feedback, setFeedback] = useState(null);
  const [hover, setHover] = useState(false);
  const navigate = useNavigate();
  const inWishlist = wishlist && wishlist.includes(product.id);
  const handleBuy = useCallback(() => {
    addToCart(product);
    setFeedback("added");
    setTimeout(() => setFeedback(null), 2000);
  }, [product, addToCart]);

  const goToDetail = useCallback(() => {
    navigate(`/products/${product.id}`);
  }, [navigate, product.id]);

  const cat = CATEGORIES.find(c => c.id === product.category);
  const accentColor = cat?.accent || ds.color.red;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#FFFFFF",
        border: `0.5px solid ${hover ? accentColor + "40" : "rgba(0,0,0,0.08)"}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: hover ? "0 4px 20px rgba(0,0,0,0.10)" : "0 1px 4px rgba(0,0,0,0.05)",
        position: "relative",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.18s ease",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Top right badges */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {toggleWishlist && (
          <button
            onClick={e => { e.stopPropagation(); toggleWishlist(product.id); }}
            title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            style={{ background: "rgba(255,255,255,0.90)", border: "0.5px solid rgba(0,0,0,0.10)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer", backdropFilter: "blur(8px)" }}
          >
            {inWishlist ? "❤️" : "🤍"}
          </button>
        )}
      </div>

      {/* Top-left CTA badge */}
      {product.cta && product.cta !== "buy" && (
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2 }}>
          {product.cta === "quote" && <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.05em", padding: "3px 9px", borderRadius: 980, background: ds.color.goldLight, color: ds.color.gold, border: `0.5px solid ${ds.color.goldBorder}`, textTransform: "uppercase" }}>By Quote</span>}
          {product.cta === "sales" && <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.05em", padding: "3px 9px", borderRadius: 980, background: "rgba(0,0,0,0.05)", color: ds.color.textMuted, border: "0.5px solid rgba(0,0,0,0.10)", textTransform: "uppercase" }}>Contact Sales</span>}
        </div>
      )}

      {/* Image — clickable to detail page */}
      <div onClick={goToDetail} style={{ cursor: "pointer" }}>
        <ProductImg imageSrc={product.imageSrc} category={product.category} name={product.name} />
      </div>

      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
        {cat && (
          <div style={{ fontSize: 10, fontWeight: 600, color: accentColor, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5 }}>
            {cat.label}
          </div>
        )}

        {/* Product name — clickable to detail page */}
        <h3
          onClick={goToDetail}
          style={{ fontSize: 13.5, fontWeight: 500, color: ds.color.textDark, lineHeight: 1.35, marginBottom: 6, minHeight: 36, cursor: "pointer", textDecoration: "none", letterSpacing: "-0.01em" }}
          onMouseEnter={e => { e.currentTarget.style.color = accentColor; }}
          onMouseLeave={e => { e.currentTarget.style.color = ds.color.textDark; }}
        >
          {product.name}
        </h3>

        {product.requiresPrescription && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#FFF3CD", border: "0.5px solid #FBBF24", borderRadius: 980, padding: "2px 8px", marginBottom: 8, alignSelf: "flex-start" }}>
            <span style={{ fontSize: 10 }}>💊</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: "#92400E", letterSpacing: "0.05em", textTransform: "uppercase" }}>Rx Required</span>
          </div>
        )}

        <p style={{ fontSize: 12, color: ds.color.textMuted, lineHeight: 1.55, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
          {product.desc}
        </p>

        {product.price ? (
          <div style={{ marginBottom: 12, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: ds.color.textDark, lineHeight: 1, fontFamily: ds.font.body }}>{formatPHP(product.price)}</div>
              <div style={{ fontSize: 10.5, color: ds.color.textLight, marginTop: 2 }}>VAT incl.</div>
            </div>
            {product.stock_qty != null && product.stock_qty <= 5 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "#F59E0B", fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }}></span>
                Only {product.stock_qty} left
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "#10B981", fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }}></span>
                In Stock
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 12, fontSize: 12, color: ds.color.textMuted, fontStyle: "italic" }}>Price upon request</div>
        )}

        {/* CTA buttons */}
        {product.cta === "buy"   && <Btn variant={feedback === "added" ? "success" : "primary"} size="sm" fullWidth onClick={handleBuy}>{feedback === "added" ? "✓ Added to Cart" : "+ Add to Cart"}</Btn>}
        {product.cta === "quote" && <Btn variant="gold"      size="sm" fullWidth onClick={() => navigate("/quote")}>Request Quote</Btn>}
        {product.cta === "sales" && <Btn variant="secondary" size="sm" fullWidth onClick={() => navigate("/contact")}>Talk to Sales</Btn>}
