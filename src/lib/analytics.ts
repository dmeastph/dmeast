/**
 * Google Analytics 4 helper
 * Wraps gtag so imports don't break when GA is not loaded.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

/** Track a custom event (add_to_cart, purchase, view_item, etc.) */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  gtag("event", name, params);
}

/** Track a page view — call this on every route change */
export function trackPageView(path: string, title?: string) {
  gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/** Track purchase after order is confirmed */
export function trackPurchase(orderId: string, total: number, items: Array<{ id: string; name: string; price: number; quantity: number }>) {
  gtag("event", "purchase", {
    transaction_id: orderId,
    currency: "PHP",
    value: total,
    items: items.map(i => ({
      item_id: i.id,
      item_name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
  });
}
