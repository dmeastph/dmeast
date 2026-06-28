import { ds } from "../constants/design";
import { CATEGORIES } from "../constants/categories";

export function Btn({ variant = "primary", size = "md", onClick, children, disabled, fullWidth, href, type = "button" }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: ds.font.body, fontWeight: 500, letterSpacing: "-0.01em",
    borderRadius: ds.radius.pill, border: "none",
    transition: "all 0.15s ease",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? "100%" : "auto",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
  const sizes = {
    sm:  { fontSize: 12.5, padding: "7px 16px" },
    md:  { fontSize: 13.5, padding: "10px 22px" },
    lg:  { fontSize: 14.5, padding: "12px 28px" },
    xl:  { fontSize: 15.5, padding: "14px 36px" },
  };
  const variants = {
    primary: {
      background: ds.color.red, color: "#fff",
      boxShadow: ds.shadow.red,
    },
    secondary: {
      background: "#fff", color: ds.color.red,
      border: `0.5px solid ${ds.color.redBorder}`,
    },
    outline: {
      background: "rgba(0,0,0,0.04)", color: ds.color.textDark,
      border: "0.5px solid rgba(0,0,0,0.12)",
    },
    gold: {
      background: ds.color.goldLight, color: ds.color.gold,
      border: `0.5px solid ${ds.color.goldBorder}`,
    },
    ghost: {
      background: "rgba(204,47,60,0.07)", color: ds.color.red,
    },
    dark: {
      background: ds.color.textDark, color: "#fff",
    },
    success: {
      background: ds.color.successBg, color: ds.color.success,
      border: `0.5px solid ${ds.color.successBorder}`,
    },
  };
  const style = { ...base, ...sizes[size], ...variants[variant] };
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

export function CtaBadge({ type }) {
  const map = {
    buy:   { label: "Buy Now",       bg: ds.color.successBg,  color: ds.color.success, border: ds.color.successBorder },
    quote: { label: "Request Quote", bg: ds.color.goldLight,  color: ds.color.gold,    border: ds.color.goldBorder },
    sales: { label: "Talk to Sales", bg: ds.color.redLight,   color: ds.color.red,     border: ds.color.redBorder },
  };
  const t = map[type] || map.quote;
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 600,
      letterSpacing: "0.06em", textTransform: "uppercase",
      padding: "3px 9px", borderRadius: ds.radius.pill,
      background: t.bg, color: t.color,
      border: `0.5px solid ${t.border}`,
      whiteSpace: "nowrap",
    }}>
      {t.label}
    </span>
  );
}

export function Tag({ children, color = ds.color.redLight, textColor = ds.color.red }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 500,
      padding: "4px 10px", borderRadius: ds.radius.pill,
      background: color, color: textColor,
      border: "0.5px solid rgba(0,0,0,0.06)",
    }}>
      {children}
    </span>
  );
}

export function SectionHeader({ eyebrow, title, subtitle, center, dark }) {
  return (
    <div style={{ textAlign: center ? "center" : "left", marginBottom: 40 }}>
      {eyebrow && (
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: dark ? "rgba(255,255,255,0.55)" : ds.color.red,
          marginBottom: 10,
        }}>
          {eyebrow}
        </div>
      )}
      <h2 style={{
        fontFamily: ds.font.display,
        fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
        fontWeight: 600,
        color: dark ? "#fff" : ds.color.textDark,
        lineHeight: 1.2,
        letterSpacing: "-0.03em",
        marginBottom: subtitle ? 12 : 0,
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{
          fontSize: 15, color: dark ? "rgba(255,255,255,0.60)" : ds.color.textMuted,
          lineHeight: 1.7, maxWidth: center ? 560 : "none",
          margin: center ? "0 auto" : 0, fontWeight: 400,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function BrandLogo({ height = 40, darkMode = false }) {
  return (
    <div style={{ position: "relative" }}>
      <img
        src="/logo.png"
        alt="DM EAST"
        style={{
          height, width: "auto", objectFit: "contain",
          filter: darkMode ? "brightness(0) invert(1)" : "none",
          mixBlendMode: darkMode ? "normal" : "multiply",
        }}
        onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
      />
      <div style={{ display: "none", alignItems: "center", gap: 2 }}>
        <span style={{ fontFamily: ds.font.body, fontWeight: 800, fontSize: height * 0.55, fontStyle: "italic", color: darkMode ? "#fff" : ds.color.textDark, textTransform: "uppercase", lineHeight: 1 }}>DM</span>
        <span style={{ fontFamily: ds.font.body, fontWeight: 800, fontSize: height * 0.55, fontStyle: "italic", color: "#F0A81C", textTransform: "uppercase", lineHeight: 1, marginLeft: 4 }}>EAST</span>
      </div>
    </div>
  );
}

export function ProductImg({ imageSrc, category, name, height = 180 }) {
  const cat = CATEGORIES.find(c => c.id === category) || { color: "#8B2635", accent: "#CC2F3C" };
  if (imageSrc) return (
    <div style={{ height, overflow: "hidden", borderRadius: "12px 12px 0 0", background: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box" }}>
      <img src={imageSrc} alt={name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
    </div>
  );
  return (
    <div style={{ height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `${cat.color}08`, borderRadius: "12px 12px 0 0", border: `0.5px solid ${cat.color}15`, borderBottom: "none", position: "relative", overflow: "hidden" }}>
      <div className="dm-dot-bg" style={{ position: "absolute", inset: 0, opacity: 0.3 }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: `${cat.accent}15`, border: `1px solid ${cat.accent}25`, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: `${cat.accent}35`, transform: "rotate(12deg)" }} />
        </div>
        <div style={{ fontSize: 10, color: cat.color, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6 }}>Image soon</div>
      </div>
    </div>
  );
}

export function Spinner({ size = 20, color = ds.color.red }) {
  return <div style={{ width: size, height: size, border: `2px solid ${color}25`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />;
}

export function PageHero({ eyebrow, title, subtitle }) {
  return (
    <div style={{
      background: "#fff",
      padding: "80px 24px 64px",
      borderBottom: "0.5px solid rgba(0,0,0,0.08)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* top accent stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${ds.color.red}, ${ds.color.goldBright})` }} />
      <div className="dm-dot-bg" style={{ position: "absolute", right: 0, top: 0, width: "40%", height: "100%", opacity: 0.35 }} />
      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative" }}>
        {eyebrow && (
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: ds.color.red, marginBottom: 12 }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{ fontFamily: ds.font.display, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 600, color: ds.color.textDark, lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 16 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 16, color: ds.color.textMuted, lineHeight: 1.7, maxWidth: 580, margin: "0 auto", fontWeight: 400 }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export function Divider() {
  return <div style={{ height: "0.5px", background: "rgba(0,0,0,0.07)" }} />;
}
