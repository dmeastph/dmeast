// TEMPORARY — delete after use
// Adds icu-04 and lab-07 to Firestore products collection using Admin SDK
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

export default async function handler(req, res) {
  // Basic token guard
  if (req.headers['x-admin-token'] !== 'dmeast-add-products-2026') {
    return res.status(403).json({ error: 'forbidden' });
  }

  const db = getDb();

  const doc1 = {
    id: 'icu-04',
    category: 'icu',
    name: 'Suction Machine Heavy Duty-Medium (YUWELL)',
    desc: 'Heavy-duty medical suction machine, medium capacity. YUWELL brand. For ICU, OR, and emergency department use.',
    price: 43640,
    cta: 'buy',
    imageSrc: 'https://philmedicalsupplies.com/wp-content/uploads/2025/01/Suction-Machine-Heavy-Duty-Large-YUWELL-7A-23B-5.0-2.png',
    featured: true,
    tag: 'ICU & Emergency',
    visible: true,
    requiresPrescription: false,
  };

  const doc2 = {
    id: 'lab-07',
    category: 'laboratory',
    name: 'Microscope Binocular XSP-06',
    desc: 'Binocular compound microscope, XSP-06 model. Suitable for clinical labs, medical schools, and research use.',
    price: 12200,
    cta: 'buy',
    imageSrc: 'https://philmedicalsupplies.com/wp-content/uploads/2025/03/Microscope-Binocular-XSP-06.png',
    featured: true,
    tag: 'Laboratory Equipment',
    visible: true,
    requiresPrescription: false,
  };

  try {
    await Promise.all([
      db.collection('products').doc('icu-04').set(doc1),
      db.collection('products').doc('lab-07').set(doc2),
    ]);
    return res.status(200).json({ ok: true, written: ['icu-04', 'lab-07'] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
