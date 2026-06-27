import { useEffect } from "react";
import { SEO_META } from "../constants/seo";

// Map URL pathnames → SEO meta keys
const PATH_TO_KEY = {
  "/": "home", "/about": "about", "/products": "products",
  "/institutional": "institutional", "/quote": "quote", "/contact": "contact",
  "/cart": "cart", "/portal": "portal", "/admin": "admin",
  "/privacy": "privacy", "/terms": "terms", "/refunds": "refunds",
  "/shipping": "shipping", "/cancellation": "cancellation",
  "/blog": "blog", "/track": "track", "/payment-return": "paymentReturn",
};

export function useSEO(pathname) {
  useEffect(() => {
    const key = PATH_TO_KEY[pathname] || (pathname.startsWith("/blog/") ? "blog" : "home");
    let meta = SEO_META[key] || SEO_META.home;
    const baseUrl = "https://dmeastph.com";
    const canonical = pathname === "/" ? baseUrl : `${baseUrl}${pathname}`;
    const ogImage = `${baseUrl}/logo.png`;

    document.title = meta.title;

    const setMeta = (name, content, attr = "name") => {
      if (!content) return;
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attr, name); document.head.appendChild(tag); }
      tag.setAttribute("content", content);
    };

    setMeta("description", meta.description);
    if (meta.keywords) setMeta("keywords", meta.keywords);
    setMeta("robots", "index, follow");
    setMeta("author", "DM EAST");
    setMeta("og:title", meta.title, "property");
    setMeta("og:description", meta.description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", canonical, "property");
    setMeta("og:image", ogImage, "property");
    setMeta("og:site_name", "DM EAST", "property");
    setMeta("og:locale", "en_PH", "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", meta.title);
    setMeta("twitter:description", meta.description);
    setMeta("twitter:image", ogImage);

    let link = document.querySelector("link[rel='canonical']");
    if (!link) { link = document.createElement("link"); link.setAttribute("rel", "canonical"); document.head.appendChild(link); }
    link.setAttribute("href", canonical);
  }, [pathname]);
}
