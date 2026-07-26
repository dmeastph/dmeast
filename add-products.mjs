// ─── Add YUWELL Suction Machine + XSP-06 Microscope to Firestore ─────────────
//
// Usage (from the dmeast folder):
//   node add-products.mjs deconbiz@gmail.com YOUR_PASSWORD
//
// What it does:
//   1. Signs into Firebase with your admin credentials
//   2. Checks whether each product already exists (by id field) — skips if so
//   3. Adds any missing products to the "products" Firestore collection
//   4. Done — refresh the site and they'll appear immediately
//
// Safe to run more than once — the duplicate check prevents double-adds.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp }                      from "firebase/app";
import { getAuth, signInWithEmailAndPassword, setPersistence, inMemoryPersistence } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

// ── Firebase production config (same as src/lib/firebase.js) ─────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAV30NWtnxAnj8jIjN4f5Pa6je43oM4rrw",
  authDomain:        "dmeast-516cc.firebaseapp.com",
  projectId:         "dmeast-516cc",
  storageBucket:     "dmeast-516cc.firebasestorage.app",
  messagingSenderId: "805825630764",
  appId:             "1:805825630764:web:9aa00bf55ece3b3f37b789",
};

// ── Products to add ───────────────────────────────────────────────────────────
const NEW_PRODUCTS = [
  {
    id:                  "icu-04",
    category:            "icu",
    name:                "Suction Machine Heavy Duty-Medium (YUWELL)",
    desc:                "Heavy-duty medical suction machine, medium capacity. YUWELL brand. For ICU, OR, and emergency department use.",
    price:               43640,
    cta:                 "buy",
    imageSrc:            "https://philmedicalsupplies.com/wp-content/uploads/2025/01/Suction-Machine-Heavy-Duty-Large-YUWELL-7A-23B-5.0-2.png",
    featured:            true,
    tag:                 "ICU & Emergency",
    visible:             true,
    requiresPrescription: false,
  },
  {
    id:                  "lab-07",
    category:            "laboratory",
    name:                "Microscope Binocular XSP-06",
    desc:                "Binocular compound microscope, XSP-06 model. Suitable for clinical labs, medical schools, and research use.",
    price:               12200,
    cta:                 "buy",
    imageSrc:            "https://philmedicalsupplies.com/wp-content/uploads/2025/03/Microscope-Binocular-XSP-06.png",
    featured:            true,
    tag:                 "Laboratory Equipment",
    visible:             true,
    requiresPrescription: false,
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
const [,, email, password] = process.argv;

if (!email || !password) {
  console.error("\nUsage: node add-products.mjs <email> <password>\n");
  console.error("Example: node add-products.mjs deconbiz@gmail.com mypassword\n");
  process.exit(1);
}

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

async function run() {
  // Use in-memory persistence so it works cleanly in Node.js
  await setPersistence(auth, inMemoryPersistence);

  console.log(`\nSigning in as ${email}...`);
  await signInWithEmailAndPassword(auth, email, password);
  console.log("✓ Signed in.\n");

  for (const product of NEW_PRODUCTS) {
    // Check if a product with this id already exists
    const q    = query(collection(db, "products"), where("id", "==", product.id));
    const snap = await getDocs(q);

    if (snap.size > 0) {
      console.log(`⚠️  "${product.name}" already exists — skipping.`);
    } else {
      await setDoc(doc(db, "products", product.id), product);
      console.log(`✅  Added: ${product.name} (₱${product.price.toLocaleString()})`);
    }
  }

  console.log("\nAll done! Hard-refresh the site (Ctrl+Shift+R) to see the products.\n");
  process.exit(0);
}

run().catch(err => {
  console.error("\nFailed:", err.message);
  if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
    console.error("→ Check your email/password and try again.\n");
  }
  process.exit(1);
});
