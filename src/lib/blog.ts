import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FirestoreTimestamp { toDate(): Date }
type DateLike = FirestoreTimestamp | Date | string | null | undefined;

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft" | "archived";
  excerpt?: string;
  content?: string;
  category?: string;
  tags?: string[];
  author?: string;
  featuredImage?: string;
  metaDescription?: string;
  readTime?: string;
  publishedAt?: FirestoreTimestamp | Date | string;
  createdAt?: FirestoreTimestamp | Date | string;
  updatedAt?: FirestoreTimestamp | Date | string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function slugify(text: string): string {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

export function estimateReadTime(htmlContent: string | undefined | null): string {
  const text = (htmlContent || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = text.split(" ").filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

export function formatBlogDate(d: DateLike): string {
  if (!d) return "";
  const date = (d as FirestoreTimestamp).toDate
    ? (d as FirestoreTimestamp).toDate()
    : new Date(d as string | Date);
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePublishedPosts(): { posts: BlogPost[]; loading: boolean } {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "posts"), orderBy("publishedAt", "desc")));
        if (cancelled) return;
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));
        setPosts(all.filter(p => p.status === "published"));
      } catch (e: unknown) {
        console.warn("Blog posts load failed:", (e as Error).message);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { posts, loading };
}
