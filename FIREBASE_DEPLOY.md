# Deploy Greenify on Firebase App Hosting

Greenify is a **Next.js 14 full-stack app** (API routes + MongoDB). Use **Firebase App Hosting** — not classic Hosting alone.

| What you need | Service |
|---------------|---------|
| App (Next.js) | **Firebase App Hosting** |
| Database | **MongoDB Atlas** (free tier) |
| Images | **ImageKit** |
| Google login | **Google Cloud OAuth** |

---

## Before you start

1. **GitHub repo** with this code pushed (`main` branch).
2. **MongoDB Atlas** cluster (not `localhost`).  
   - [mongodb.com/atlas](https://www.mongodb.com/atlas) → Create cluster → Connect → copy `mongodb+srv://...`  
   - Network Access → **Allow access from anywhere** (`0.0.0.0/0`) for App Hosting.
3. **Firebase Blaze plan** (pay-as-you-go). App Hosting requires it; small traffic stays within free tiers.
4. Copy values from your local `.env.local` (you will paste them into Firebase).

---

## Step 1 — Create a Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/).
2. **Add project** (e.g. `greenify-prod`).
3. Upgrade to **Blaze** if prompted: Project settings → Usage and billing.

---

## Step 2 — Create an App Hosting backend

1. In the console: **Build** → **App Hosting** (or **Hosting & Serverless** → **App Hosting**).
2. Click **Get started** / **Create backend**.
3. **Connect GitHub** — authorize Firebase, pick your `greenify` repository.
4. Settings:
   - **Root directory:** `/` (if the repo root contains `package.json`).  
     If the repo is the parent folder and the app is in a subfolder, set e.g. `greenify-main`.
   - **Live branch:** `main`
   - **Automatic rollouts:** ON
   - **Region:** pick one close to your users (e.g. `us-central1`)
   - **Backend name:** e.g. `greenify`
5. Click **Finish and deploy**.

First deploy takes about **5–10 minutes**. Your URL looks like:

`https://BACKEND_ID--PROJECT_ID.us-central1.hosted.app`

Copy this URL — you need it for env vars and Google OAuth.

---

## Step 3 — Set environment variables

1. Firebase Console → **App Hosting** → your backend → **Settings** → **Environment**.
2. Click **Add variable** (or paste from `.env` — see below).
3. Add **every** variable from `.env.example` with **production** values:

| Variable | Example / notes |
|----------|-----------------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/greenify` |
| `JWT_SECRET` | Long random string (32+ chars) |
| `JWT_REFRESH_SECRET` | Different long random string |
| `NEXTAUTH_URL` | **Your App Hosting URL** (no trailing slash) |
| `NEXTAUTH_SECRET` | Long random string (32+ chars) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `IMAGEKIT_PUBLIC_KEY` | From ImageKit dashboard |
| `IMAGEKIT_PRIVATE_KEY` | From ImageKit dashboard |
| `IMAGEKIT_URL_ENDPOINT` | e.g. `https://ik.imagekit.io/your_id` |
| `NODE_ENV` | `production` (also in `apphosting.yaml`) |

**Quick paste:** copy all lines from `.env.local` into the first “Key” field in the console (KEY=value format). Then **change** `NEXTAUTH_URL` to your live Firebase URL.

4. **Create a new rollout** (Deployments → Rollout) so variables apply.

### Optional — secrets via CLI

```powershell
cd "path\to\greenify-main"
npx firebase login
npx firebase use YOUR_PROJECT_ID
npx firebase apphosting:secrets:set MONGODB_URI
# repeat for each secret, then uncomment env blocks in apphosting.yaml
npx firebase apphosting:secrets:grantaccess MONGODB_URI --backend greenify
```

---

## Step 4 — Google OAuth (production)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your OAuth client.
2. **Authorized JavaScript origins:**  
   `https://YOUR-BACKEND-ID--PROJECT-ID.us-central1.hosted.app`
3. **Authorized redirect URIs:**  
   `https://YOUR-BACKEND-ID--PROJECT-ID.us-central1.hosted.app/api/auth/callback/google`
4. Save. Wait a few minutes for Google to propagate.

---

## Step 5 — Seed production database

From your PC (with Atlas URI in `.env.local` or a temp env):

```powershell
cd "path\to\greenify-main"
$env:MONGODB_URI="mongodb+srv://..."   # your Atlas URI
& "C:\Program Files\nodejs\npm.cmd" run seed:admin
& "C:\Program Files\nodejs\npm.cmd" run seed:rewards
node scripts/enhanceBrandRewards.js
```

Default admin (change password after first login): see `ADMIN_CREDENTIALS.md`.

---

## Step 6 — Verify the live app

1. Open your `hosted.app` URL.
2. Register / log in / submit an activity / redeem a reward.
3. Admin: `https://YOUR-URL/admin`
4. If Google login fails with **UntrustedHost**, ensure `trustHost: true` is in `authOptions.ts` (already set) and `NEXTAUTH_URL` matches the live URL exactly.

Check logs: Firebase Console → App Hosting → backend → **Logs** (or Google Cloud Logging).

---

## Custom domain (optional)

1. App Hosting → backend → **Domains** → **Add custom domain**.
2. Follow DNS instructions.
3. Update `NEXTAUTH_URL` and Google OAuth URIs to `https://yourdomain.com`.
4. Roll out again.

---

## Deploy updates

Push to `main` on GitHub → App Hosting rolls out automatically.

Local check before push:

```powershell
npm.cmd run build
```

---

## Firebase CLI (optional)

```powershell
# Install CLI (project dev dependency)
npm.cmd install

# Login and select project
npx firebase login
npx firebase use YOUR_PROJECT_ID

# List backends
npx firebase apphosting:backends:list
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails | Run `npm run build` locally; fix TypeScript errors |
| 500 on login/API | Check env vars; Atlas IP allowlist; Cloud logs |
| Google OAuth error | `NEXTAUTH_URL` + redirect URI must match live URL |
| Cookies not set | App must be `https`; `NODE_ENV=production` |
| MongoDB timeout | Atlas network access `0.0.0.0/0`; correct `MONGODB_URI` |
| “Hosting only” | Use **App Hosting**, not classic static Hosting |

---

## Why not classic Firebase Hosting?

Classic Hosting serves **static files only**. Greenify needs `/api/*`, auth cookies, MongoDB, and ImageKit — that requires **App Hosting** (Cloud Run) or another Node host (e.g. Vercel).

---

## Architecture diagram

```mermaid
flowchart LR
  User[Browser] --> CDN[Firebase CDN]
  CDN --> Run[Cloud Run - Next.js]
  Run --> Atlas[(MongoDB Atlas)]
  Run --> IK[ImageKit]
  Run --> Google[Google OAuth]
  GitHub[GitHub main] -->|auto deploy| Run
```

---

## Need the fastest path?

If Firebase setup feels heavy, **Vercel + MongoDB Atlas** deploys the same repo in minutes — see Option B in the original notes. Firebase App Hosting is the right choice when you want everything on Google Cloud.
