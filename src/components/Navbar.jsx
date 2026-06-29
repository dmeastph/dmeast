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
        height: 80,
        gap: 16,
      }}>
        {/* LEFT: Logo */}
        <button
          onClick={() => nav("home")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <BrandLogo height={76} />
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
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="