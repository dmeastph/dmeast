// ── DMEAST: One-time order date fix ──────────────────────────────────
// Paste this entire script into your browser console while logged in
// as admin on dmeastph.com. Press Enter. Done.
// ─────────────────────────────────────────────────────────────────────
(async () => {
  // 1. Get your current Firebase auth token from IndexedDB
  const token = await new Promise((resolve, reject) => {
    const req = indexedDB.open('firebaseLocalStorageDb');
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction('firebaseLocalStorage', 'readonly');
      const store = tx.objectStore('firebaseLocalStorage');
      const all = store.getAll();
      all.onsuccess = () => {
        const auth = all.result.find(i => i.value && i.value.stsTokenManager);
        if (auth) resolve(auth.value.stsTokenManager.accessToken);
        else reject('❌ Not logged in — make sure you are on dmeastph.com as admin');
      };
    };
    req.onerror = () => reject('❌ IndexedDB error');
  });
  console.log('✅ Got auth token');

  const PROJECT = 'dmeast-516cc';
  const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

  // 2. Load all orders (87 total, fits in one page)
  const listRes = await fetch(`${BASE}/orders?pageSize=200`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const listData = await listRes.json();
  const orders = listData.documents || [];
  console.log(`✅ Loaded ${orders.length} orders`);

  // 3. Find #KDFAFY and #ZRXZDZ by their last-6 suffix
  const targets = {
    KDFAFY: { createdAt: '2026-07-09T00:00:00+08:00', shippedAt: '2026-07-10T00:00:00+08:00' },
    ZRXZDZ: { createdAt: '2026-07-01T00:00:00+08:00', shippedAt: '2026-07-02T00:00:00+08:00' },
  };

  for (const doc of orders) {
    const id = doc.name.split('/').pop();
    const suffix = id.slice(-6).toUpperCase();
    if (!targets[suffix]) continue;

    const { createdAt, shippedAt } = targets[suffix];
    console.log(`Updating ${id} (${suffix})...`);

    const body = {
      fields: {
        createdAt: { timestampValue: createdAt },
        shippedAt:  { timestampValue: shippedAt  },
      }
    };

    const res = await fetch(
      `${BASE}/orders/${id}?updateMask.fieldPaths=createdAt&updateMask.fieldPaths=shippedAt`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ ${suffix} updated — Placed: Jul 9 / Shipped: Jul 10`
        .replace('Jul 9 / Shipped: Jul 10', suffix === 'KDFAFY' ? 'Jul 9 / Shipped: Jul 10' : 'Jul 1 / Shipped: Jul 2'));
    } else {
      console.error(`❌ Failed to update ${suffix}:`, data.error?.message);
    }
  }

  console.log('🎉 Done! Refresh the admin dashboard to see updated dates.');
})();
