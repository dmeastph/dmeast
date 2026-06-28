import { useState, useEffect, useRef } from "react";
import { ds } from "../constants/design";
import { BrandLogo } from "./ui";

export function Navbar({ activePage, setPage, cartCount, user, isAdmin, onSignIn, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = e => { if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const links = [
    { id: "home", label: "Home" },
    { id: "about", label: "About" },
    { id: "products", label: "Shop" },
    { id: "institutional", label: "Institutional" },
    { id: "blog", label: "Blog" },
    { id: "quote", label: "Quote" },
    { id: "track", label: "Track" },
    { id: "contact", label: "Contact" },
  ];

  const nav = id => { setPage(id); setMenuOpen(false); };

  const iconBtn = {
    background: "none",
    border: "none",
    cursor: "pointer",
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    color: ds.color.textDark,
    transition: "background 0.15s",
    padding: 0,
    flexShrink: 0,
  };

  return (
    <nav style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 1000,
      background: scrolled ? "rgba(245,245,247,0.85)" : "rgba(245,245,247,0.70)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: `0.5px solid ${scrolled ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.06)"}`,
      boxShadow: scrolled ? "0 1px 0 rgba(0,0,0,0.04)" : "none",
      transition: "all 0.25s ease",
    }}>
      {/* Brand accent stripe */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${ds.color.red}, ${ds.color.goldBright})` }} />

      <div style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 56,
        gap: 16,
      }}>
        {/* LEFT: Logo */}
        <button
          onClick={() => nav("home")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <BrandLogo height={44} />
        </button>

        {/* CENTER: Nav links */}
        <div className="dm-desktop-nav" style={{ alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}>
          {links.map(l => (
            <button
              key={l.id}
              onClick={() => nav(l.id)}
              className={`dm-nav-link ${activePage === l.id ? "active" : ""}`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* RIGHT: Icon widgets — Search, Cart, User */}
        <div className="dm-desktop-nav" style={{ alignItems: "center", gap: 4, flexShrink: 0 }}>

          {/* Search */}
          <button
            onClick={() => nav("products")}
            title="Search products"
            style={iconBtn}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>

          {/* Cart with badge */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => nav("cart")}
              title="Cart"
              style={iconBtn}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </button>
            {cartCount > 0 && (
              <span style={{
                position: "absolute",
                top: 1, right: 1,
                background: ds.color.red,
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                borderRadius: "50%",
                width: 16, height: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1.5px solid #F5F5F7",
                lineHeight: 1,
              }}>
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </div>

          {/* User / Account */}
          <div ref={acctRef} style={{ position: "relative" }}>
            {user ? (
              <>
                <button
                  onClick={() => setAcctOpen(o => !o)}
                  title="My account"
                  style={{
                    ...iconBtn,
                    background: acctOpen ? "rgba(0,0,0,0.08)" : "none",
                  }}
                  onMouseEnter={e => { if (!acctOpen) e.currentTarget.style.background = "rgba(0,0,0,0.06)"; }}
                  onMouseLeave={e => { if (!acctOpen) e.currentTarget.style.background = "none"; }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </button>

                {acctOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "0.5px solid rgba(0,0,0,0.12)",
                    borderRadius: 12,
                    padding: "6px",
                    minWidth: 180,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
                    zIndex: 200,
                  }}>
                    <div style={{ padding: "8px 12px 10px", borderBottom: "0.5px solid rgba(0,0,0,0.07)", marginBottom: 4 }}>
                      <div style={{ fontSize: 12, color: ds.color.textMuted, fontWeight: 400 }}>Signed in as</div>
                      <div style={{ fontSize: 13, color: ds.color.textDark, fontWeight: 500, marginTop: 2 }}>{user.email || "Account"}</div>
                    </div>
                    {[
                      { id: "portal", icon: "📋", label: "My Portal" },
                      ...(isAdmin ? [{ id: "admin", icon: "⚙️", label: "Admin Dashboard" }] : []),
                    ].map(item => (
                      <button key={item.id} onClick={() => { nav(item.id); setAcctOpen(false); }} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", textAlign: "left",
                        background: "none", border: "none",
                        padding: "9px 12px", fontSize: 13, fontWeight: 400,
                        color: ds.color.textDark, cursor: "pointer",
                        borderRadius: 8, transition: "background 0.1s",
                        fontFamily: ds.font.body,
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        <span>{item.icon}</span>{item.label}
                      </button>
                    ))}
                    <div style={{ height: "0.5px", background: "rgba(0,0,0,0.07)", margin: "4px 6px" }} />
                    <button onClick={() => { onSignOut(); setAcctOpen(false); }} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      width: "100%", textAlign: "left",
                      background: "none", border: "none",
                      padding: "9px 12px", fontSize: 13, fontWeight: 400,
                      color: ds.color.red, cursor: "pointer",
                      borderRadius: 8, transition: "background 0.1s",
                      fontFamily: ds.font.body,
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = ds.color.redLight}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                      <span>↩</span> Sign out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={onSignIn}
                title="Sign in"
                style={{
                  ...iconBtn,
                  background: "rgba(204,47,60,0.08)",
                  color: ds.color.red,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(204,47,60,0.14)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(204,47,60,0.08)"}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
            )}
          </div>

          {/* Get a Quote CTA */}
          <button
            onClick={() => nav("quote")}
            style={{
              background: ds.color.red,
              color: "#fff",
              border: "none",
              borderRadius: ds.radius.pill,
              padding: "8px 16px",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: ds.font.body,
              letterSpacing: "-0.01em",
              marginLeft: 4,
              transition: "opacity 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Get a quote
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="dm-mobile-btn"
          onClick={() => setMenuOpen(o => !o)}
          style={{ background: "none", border: "none", fontSize: 20, color: ds.color.textDark, width: 40, height: 40, alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          background: "rgba(245,245,247,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "0.5px solid rgba(0,0,0,0.08)",
          padding: "12px 20px 20px",
        }}>
          {links.map(l => (
            <button key={l.id} onClick={() => nav(l.id)} style={{
              display: "block", width: "100%", textAlign: "left",
              background: activePage === l.id ? ds.color.redLight : "none",
              border: "none", cursor: "pointer",
              color: activePage === l.id ? ds.color.red : ds.color.textDark,
              fontSize: 15, fontWeight: 400,
              padding: "12px 14px", borderRadius: 10,
              marginBottom: 2, fontFamily: ds.font.body,
            }}>
              {l.label}
            </button>
          ))}
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => nav("cart")} style={{ flex: 1, background: ds.color.redLight, color: ds.color.red, border: "none", borderRadius: ds.radius.pill, padding: "10px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              🛒 Cart {cartCount > 0 ? `(${cartCount})` : ""}
            </button>
            {user ? (
              <>
                <button onClick={() => nav("portal")} style={{ flex: 1, background: "rgba(0,0,0,0.05)", color: ds.color.textDark, border: "none", borderRadius: ds.radius.pill, padding: "10px 16px", fontSize: 13, cursor: "pointer" }}>Portal</button>
                {isAdmin && <button onClick={() => nav("admin")} style={{ flex: 1, background: ds.color.goldLight, color: ds.color.gold, border: "none", borderRadius: ds.radius.pill, padding: "10px 16px", fontSize: 13, cursor: "pointer" }}>Admin</button>}
                <button onClick={onSignOut} style={{ flex: 1, background: "none", color: ds.color.red, border: `1px solid ${ds.color.redBorder}`, borderRadius: ds.radius.pill, padding: "10px 16px", fontSize: 13, cursor: "pointer" }}>Sign out</button>
              </>
            ) : (
              <button onClick={onSignIn} style={{ flex: 1, background: "none", color: ds.color.red, border: `1px solid ${ds.color.redBorder}`, borderRadius: ds.radius.pill, padding: "10px 16px", fontSize: 13, cursor: "pointer" }}>Sign in</button>
            )}
            <button onClick={() => nav("quote")} style={{ width: "100%", background: ds.color.red, color: "#fff", border: "none", borderRadius: ds.radius.pill, padding: "12px", fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 4 }}>Get a quote</button>
          </div>
        </div>
      )}
    </nav>
  );
}
