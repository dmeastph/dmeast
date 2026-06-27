// api/sitemap.js — Dynamic sitemap with static routes + live Firestore blog posts
// Served at /sitemap.xml via vercel.json rewrite

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BASE_URL = 'https://dmeastph.com';

const STATIC_URLS = [
  { loc: '/',             changefreq: 'weekly',  priority: '1.0' },
  { loc: '/products',     changefreq: 'weekly',  priority: '0.9' },
  { loc: '/about',        changefreq: 'monthly', priority: '0.7' },
  { loc: '/institutional',changefreq: 'monthly', priority: '0.8' },
  { loc: '/quote',        changefreq: 'monthly', priority: '0.8' },
  { loc: '/contact',      changefreq: 'monthly', priority: '0.7' },
  { loc: '/blog',         changefreq: 'weekly',  priority: '0.8' },
  { loc: '/track',        changefreq: 'monthly', priority: '0.5' },
  { loc: '/privacy',      changefreq: 'yearly',  priority: '0.4' },
  { loc: '/terms',        changefreq: 'yearly',  priority: '0.4' },
  { loc: '/refunds',      changefreq: 'yearly',  priority: '0.4' },
  { loc: '/shipping',     changefreq: 'yearly',  priority: '0.4' },
  { loc: '/cancellation', changefreq: 'yearly',  priority: '0.4' },
];

function getDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${BASE_URL}${loc}</loc>`,
    lastmod  ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
}

export default async function handler(req, res) {
  // Serve fresh sitemap — cache for 1 hour at CDN
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  const staticEntries = STATIC_URLS.map(urlEntry);
  const blogEntries = [];
  const productEntries = [];

  try {
    const db = getDb();

    // Blog posts
    const blogSnap = await db.collection('blogPosts')
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .get();
    for (const doc of blogSnap.docs) {
      const { slug, publishedAt } = doc.data();
      if (!slug) continue;
      const lastmod = publishedAt?.toDate
        ? publishedAt.toDate().toISOString().split('T')[0]
        : undefined;
      blogEntries.push(urlEntry({
        loc: `/blog/${slug}`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.7',
      }));
    }

    // Product detail pages (skip pharma-public for HIDE_PHARMA_PUBLIC compliance)
    const prodSnap = await db.collection('products')
      .where('available', '==', 'available')
      .get();
    for (const doc of prodSnap.docs) {
      const data = doc.data();
      const pid = data.id || doc.id;
      if (!pid) continue;
      if (data.category === 'pharma' || data.category === 'otc') continue;
      productEntries.push(urlEntry({
        loc: `/products/${pid}`,
        changefreq: 'weekly',
        priority: '0.8',
      }));
    }
  } catch (_) {
    // Firestore unavailable — degrade gracefully to static-only sitemap
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...blogEntries,
    ...productEntries,
    '</urlset>',
  ].join('\n');

  res.status(200).send(xml);
}
