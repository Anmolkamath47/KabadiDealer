# 🚀 Deployment & Vercel Guide: Scrapwala Dealer Partner (Render & Vercel)

This repository contains the complete **Scrapwala Dealer Partner Application** consisting of:
- **Backend**: Express + TypeScript + Socket.IO server (`/backend`)
- **Frontend**: Vite + React + Tailwind CSS partner dashboard (`/frontend`)

---

## 1. Deploy Frontend to Vercel

### Setting up or Renaming your Project on Vercel:
1. Log into [Vercel](https://vercel.com).
2. If importing fresh:
   - Click **Add New...** → **Project**.
   - Import your GitHub repository: `Anmolkamath47/KabadiDealer`.
   - **Project Name**: `scrapwala-dealer-partner` (or `scrapwala-dealer`)
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. If renaming an existing project:
   - Click your dealer partner project in the Vercel dashboard.
   - Go to **Settings** → **General**.
   - Under **Project Name**, update to: `scrapwala-dealer-partner` and click **Save**.
   - Vercel will update your default domain to `scrapwala-dealer-partner.vercel.app` (or similar available variant).
4. **Environment Variables**:
   Under **Settings** → **Environment Variables**, ensure you have:
   | Variable | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://<your-render-backend-url>.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://<your-render-backend-url>.onrender.com` |
   | `VITE_CONSUMER_APP_URL` | `https://scrapwala.vercel.app` |
5. Click **Deploy** / **Redeploy** to trigger a build with the new branding.

---

## 2. Deploy Backend to Render

### Option A: Automatic via Render Blueprint (`render.yaml`)
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Select your GitHub repository: `Anmolkamath47/KabadiDealer`.
4. Render will detect `render.yaml` automatically and configure the service.

### Option B: Manual Web Service Setup
1. On [Render](https://dashboard.render.com), click **New +** → **Web Service**.
2. Connect your GitHub repository `Anmolkamath47/KabadiDealer`.
3. Fill in the following settings:
   - **Name**: `kabadidealer-backend`
   - **Region**: Choose closest to your users (e.g., Singapore, Frankfurt, Oregon)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free (or Starter for persistent connections)
4. Under **Advanced** / **Environment Variables**, add:
   | Key | Value / Description |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` (or Render's automatic port) |
   | `CLIENT_APP_URL` | Your frontend Vercel URL (e.g., `https://scrapwala-dealer-partner.vercel.app`) |
   | `KABADIWALA_API_URL` | Render URL of the consumer backend (e.g., `https://kabadiwala-backend.onrender.com/api`) |
   | `DEALER_SERVICE_API_KEY` | Shared secret key matching consumer backend (e.g. `kbad_shared_internal_secret_key_9988`) |
   | `JWT_SECRET` | Strong random 32+ character string |
   | `JWT_REFRESH_SECRET` | Strong random 32+ character string |
   | `MONGODB_URI` | MongoDB Atlas URI: `mongodb+srv://<user>:<password>@cluster.mongodb.net/kabadidealer` |
   | `USE_MEMORY_DB` | `false` |
   | `OTP_DEMO_CODE` | `1234` |
   | `PICKUP_REQUEST_TIMEOUT_SECONDS` | `60` |
5. Click **Create Web Service**.
6. Once deployed, note down your backend URL: `https://<service-name>.onrender.com`.
7. Update `CLIENT_APP_URL` on Render whenever you adjust your frontend Vercel domain.

---

## 3. Production Verification Checklist

- [ ] `/api/health` on Render backend returns `{"status":"healthy"}`.
- [ ] `/api/health/connectivity` returns `{"crossAppConnectivity": {"connected": true}}` confirming mutual connection with Scrapwala consumer backend.
- [ ] Vercel frontend loads without CORS errors at `https://scrapwala-dealer-partner.vercel.app`.
- [ ] Browser tab displays **"Scrapwala Dealer Partner - Partner Portal & Scrap Pickup Manager"**.
- [ ] Direct page refresh on any subroute (e.g., `/duty`, `/map`, `/history`, `/profile`) works seamlessly thanks to `vercel.json` rewrites.
- [ ] Socket.IO establishes connection for real-time dispatch alerts and live map navigation.
