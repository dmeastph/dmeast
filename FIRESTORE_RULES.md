# Firestore Security Rules — Deployment Guide

## Deploy rules

```bash
npx firebase-tools deploy --only firestore:rules
```

## Grant admin access to a user

Run this once from Node.js using Firebase Admin SDK (or paste into a temporary Cloud Function):

```js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// uid = the user's Firebase Auth UID (find in Firebase Console → Authentication)
await db.collection('admins').doc(uid).set({
  email: 'info@dmeastph.com',
  role: 'super_admin',
  grantedAt: new Date().toISOString(),
});
```

## Admin roles
Roles live in `/admins/{uid}`. The `role` field is for reference only — the rules
only check whether the document exists. Role-level permissions are enforced
client-side via `ROLE_PERMISSIONS` in `src/constants/admin.js`.

## ⚠️ Security notes
- The `/admins` collection can only be written via the Firebase Admin SDK (server-side).
  Client code cannot grant itself admin access.
- Guest checkout orders are allowed without auth (required for guest cart flow).
- Pharma category filtering is client-side only (`HIDE_PHARMA_PUBLIC`). Authenticated
  API users can still query pharma products directly. This is intentional — admin
  and B2B users need full catalog access.
