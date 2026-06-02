# Deploying Greenify (Firebase + production stack)

Greenify is a **Next.js 14 full-stack app** (React UI + API routes + MongoDB). Plan your deployment accordingly.

## Recommended architecture for production

| Layer | Service | Why |
|--------|---------|-----|
| **App hosting** | [Firebase App Hosting](https://firebase.google.com/docs/app-hosting) or **Vercel** | Runs Next.js with API routes |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier) | Already used by the app |
| **Media** | ImageKit | Photo uploads |
| **Auth** | JWT cookies + optional Google OAuth | Already implemented |

> **Note:** Firebase **Hosting alone** only serves static files. It cannot run `/api/*` routes unless you use **App Hosting**, **Cloud Functions**, or a separate backend.

---

## Option A — Firebase App Hosting (best Firebase fit)

1. Create a [Firebase project](https://console.firebase.google.com/).
2. Install CLI: `npm install -g firebase-tools`
3. Login: `firebase login`
4. Enable **App Hosting** in Firebase console and connect your GitHub repo (or deploy via CLI).
5. Set **environment variables** in Firebase console:

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<long-random-string>
NEXTAUTH_URL=https://your-domain.web.app
NEXTAUTH_SECRET=<long-random-string>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
IMAGEKIT_PUBLIC_KEY=...
IMAGEKIT_PRIVATE_KEY=...
IMAGEKIT_URL_ENDPOINT=...
```

6. Update **Google OAuth** redirect URI:
   `https://your-domain.web.app/api/auth/callback/google`

7. Deploy from project root (`greenify-main` folder).

---

## Option B — Vercel + MongoDB Atlas (fastest for Next.js)

1. Push code to GitHub.
2. Import project on [vercel.com](https://vercel.com).
3. Root directory: `greenify-main`
4. Add the same env vars as above.
5. Deploy — Vercel runs `next build` automatically.

Firebase can still be used later for **Analytics**, **Crashlytics**, or **Auth** if you migrate.

---

## Option C — Firebase Hosting (static only — not recommended)

Only if you export a static site (`output: 'export'` in `next.config.js`). **You would lose:**

- Login API, rewards redeem, wallet history, admin panel APIs, uploads

Do **not** use this for the current Greenify codebase without major refactoring.

---

## Pre-deploy checklist

- [ ] MongoDB Atlas cluster created; IP allowlist `0.0.0.0/0` (or Vercel/Firebase IPs)
- [ ] Run `npm run seed:admin` and `npm run seed:rewards` on production DB
- [ ] Run `node scripts/enhanceBrandRewards.js` for shop URLs on coupons
- [ ] ImageKit production keys configured
- [ ] Google OAuth production redirect URIs added
- [ ] Change default admin password after first login
- [ ] Set `NODE_ENV=production` (cookies use `secure: true` in production)

---

## Build locally before deploy

```bash
cd greenify-main
npm install
npm run build
npm start
```

---

## Environment variables reference

See `.env.example` for the full list. Never commit `.env.local`.

---

## Custom domain

- **Firebase App Hosting:** Firebase console → App Hosting → Custom domain
- **Vercel:** Project settings → Domains

Update `NEXTAUTH_URL` and Google OAuth URIs to match your custom domain.

---

## Need help choosing?

- Want **everything on Google/Firebase** → **Firebase App Hosting** + Atlas + ImageKit  
- Want **easiest Next.js deploy** → **Vercel** + Atlas + ImageKit  
- Both work with this codebase as-is.
