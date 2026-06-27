/**
 * api/catalog.js — Facebook/Instagram Product Catalog Feed
 * GET /api/catalog → XML or JSON feed for Meta Commerce Manager
 *
 * Meta supports two formats:
 *   ?format=xml  → RSS 2.0 / Google Shopping XML (default)
 *   ?format=json → JSON feed
 *
 * Register this URL in Meta Business Manager:
 *   Business Settings → Catalog → Data Sources → Scheduled Feed
 *   URL: https://dmeastph.com/api/catalog
 *   Schedule: Daily
 *
 * Required fields per Meta: id, title, description, availability,
 *   condition, price, link, image_link, brand
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const BASE_URL = "https://dmeastph.com";

function getDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

function escapeXml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// HIDE_PHARMA_PUBLIC compliance — mirror of src/constants/categories.ts
const PHARMA_HIDDEN_CATEGORIES = ["pharma", "otc"];

export default async function handler(req, res) {
  const format = req.query.format || "xml";

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  let products = [];
  try {
    const db = getDb();
    const snap = await db.collection("products")
      .where("available", "==", "available")
      .get();

    for (const d of snap.docs) {
      const p = { ...d.data(), _docId: d.id };
      // HIDE_PHARMA_PUBLIC: exclude pharma categories from public feeds
      if (PHARMA_HIDDEN_CATEGORIES.includes(p.category)) continue;
      if (!p.name) continue;
      products.push(p);
    }
  } catch (err) {
    return res.status(503).send("Feed temporarily unavailable");
  }

  if (format === "json") {
    // Meta JSON feed format
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const feed = products.map(p => ({
      id:           p.id || p._docId,
      title:        p.name,
      description:  p.desc || p.name,
      availability: "in stock",
      condition:    "new",
      price:        p.price ? `${Number(p.price).toFixed(2)} PHP` : "0.00 PHP",
      link:         `${BASE_URL}/products/${p.id || p._docId}`,
      image_link:   p.imageSrc ? `${BASE_URL}${p.imageSrc}` : `${BASE_URL}/logo.png`,
      brand:        "DMEAST",
      google_product_category: "Health & Beauty > Health Care > Medical Equipment & Supplies",
    }));
    return res.status(200).json(feed);
  }

  // XML feed (Google Shopping / Meta default)
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  const items = products.map(p => `
  <item>
    <g:id>${escapeXml(p.id || p._docId)}</g:id>
    <title>${escapeXml(p.name)}</title>
    <description>${escapeXml(p.desc || p.name)}</description>
    <g:availability>in stock</g:availability>
    <g:condition>new</g:condition>
    <g:price>${p.price ? `${Number(p.price).toFixed(2)} PHP` : "0.00 PHP"}</g:price>
    <link>${BASE_URL}/products/${escapeXml(p.id || p._docId)}</link>
    <g:image_link>${p.imageSrc ? `${BASE_URL}${escapeXml(p.imageSrc)}` : `${BASE_URL}/logo.png`}</g:image_link>
    <g:brand>DMEAST</g:brand>
    <g:google_product_category>Health &amp; Beauty &gt; Health Care &gt; Medical Equipment &amp; Supplies</g:google_product_category>
  </item>`).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>DMEAST Medical Supplies</title>
    <link>${BASE_URL}</link>
    <description>Philippine medical equipment and healthcare product catalog</description>
${items}
  </channel>
</rss>`;

  res.status(200).send(xml);
}
