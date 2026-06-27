/**
 * ProductReviews — public reviews + ratings for a product
 * Firestore collection: `reviews/{productId}/items/{reviewId}`
 *   Fields: uid, displayName, rating (1-5), body, createdAt, verified (admin sets)
 *
 * Usage: <ProductReviews productId={product.id} user={user} />
 */
import { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ds } from "../constants/design";
import { Btn, Spinner } from "./ui";

const MAX_REVIEWS = 20;

function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{
            fontSize: readonly ? 14 : 24,
            cursor: readonly ? "default" : "pointer",
            color: star <= (hover || value) ? "#F59E0B" : "#D1D5DB",
            transition: "color 0.1s",
            lineHeight: 1,
          }}
        >★</span>
      ))}
    </div>
  );
}

function formatRelative(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-PH", { month: "short", year: "numeric" });
}

export function ProductReviews({ productId, user }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    const q = query(
      collection(db, "reviews", productId, "items"),
      orderBy("createdAt", "desc"),
      limit(MAX_REVIEWS)
    );
    getDocs(q)
      .then(snap => setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {}) // Reviews not critical — fail silently
      .finally(() => setLoading(false));
  }, [productId]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const handleSubmit = async () => {
    if (!rating) { setErr("Please select a star rating."); return; }
    if (body.trim().length < 10) { setErr("Review must be at least 10 characters."); return; }
    setSubmitting(true); setErr("");
    try {
      const review = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split("@")[0] || "Customer",
        rating,
        body: body.trim(),
        createdAt: serverTimestamp(),
        verified: false,
      };
      await addDoc(collection(db, "reviews", productId, "items"), review);
      setSubmitted(true);
      setShowForm(false);
      setRating(0); setBody("");
      // Optimistically add to list
      setReviews(prev => [{ ...review, id: Date.now().toString(), createdAt: { toDate: () => new Date() } }, ...prev]);
    } catch (e) {
      setErr("Couldn't submit review. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <section style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${ds.color.border}` }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: ds.font.display, fontSize: 20, color: ds.color.textDark, fontWeight: 400, marginBottom: 4 }}>
            Customer Reviews
          </h2>
          {avgRating && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StarRating value={Math.round(Number(avgRating))} readonly />
              <span style={{ fontSize: 15, fontWeight: 700, color: ds.color.textDark }}>{avgRating}</span>
              <span style={{ fontSize: 13, color: ds.color.textMuted }}>({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
            </div>
          )}
        </div>
        {user && !showForm && !submitted && (
          <Btn variant="outline" size="sm" onClick={() => setShowForm(true)}>Write a Review</Btn>
        )}
        {submitted && (
          <div style={{ fontSize: 13, color: ds.color.success, fontWeight: 600 }}>✓ Review submitted — thank you!</div>
        )}
        {!user && (
          <div style={{ fontSize: 12, color: ds.color.textMuted, fontStyle: "italic" }}>Sign in to leave a review</div>
        )}
      </div>

      {/* Review form */}
      {showForm && (
        <div style={{ background: ds.color.canvas, borderRadius: ds.radius.lg, padding: "20px 24px", border: `1px solid ${ds.color.border}`, marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: ds.color.textDark, marginBottom: 14 }}>Your Review</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.color.textDark, marginBottom: 8 }}>Rating <span style={{ color: ds.color.red }}>*</span></div>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.color.textDark, marginBottom: 6 }}>Review <span style={{ color: ds.color.red }}>*</span></div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Share your experience with this product…"
              style={{ width: "100%", padding: "10px 13px", border: `1.5px solid ${ds.color.border}`, borderRadius: ds.radius.md, fontSize: 14, fontFamily: ds.font.body, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box", outline: "none" }}
            />
            <div style={{ fontSize: 11, color: ds.color.textMuted, marginTop: 4 }}>{body.length}/1000</div>
          </div>
          {err && <div style={{ fontSize: 12.5, color: ds.color.red, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" size="sm" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Spinner size={14} color="#fff" /> : "Submit Review"}
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => { setShowForm(false); setErr(""); }}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}><Spinner /></div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: ds.color.textMuted, fontSize: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>⭐</div>
          No reviews yet. {user ? "Be the first to review this product!" : "Sign in to be the first!"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {reviews.map(r => (
            <div key={r.id} style={{ background: "#fff", border: `1px solid ${ds.color.border}`, borderRadius: ds.radius.lg, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${ds.color.red},#8B1D27)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {(r.displayName || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: ds.color.textDark }}>
                        {r.displayName}
                        {r.verified && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: ds.color.success, background: ds.color.successBg, padding: "1px 6px", borderRadius: ds.radius.pill }}>✓ Verified</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <StarRating value={r.rating} readonly />
                        <span style={{ fontSize: 11, color: ds.color.textMuted }}>{formatRelative(r.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 13.5, color: ds.color.textBody, lineHeight: 1.7, margin: 0 }}>{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
