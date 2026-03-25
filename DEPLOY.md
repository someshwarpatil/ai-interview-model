# Deployment Guide — Firebase + Google Cloud Run

## Architecture

```
Browser
  ├── Pages / static assets  →  Firebase Hosting  (Next.js)
  └── API calls              →  Google Cloud Run   (Express + BullMQ Worker)
                                    ├── MongoDB Atlas  (free M0)
                                    └── Upstash Redis  (free tier)
```

---

## Step 0 — One-time account setup

You need accounts on all four services (all have free tiers):

| Service | Signup | What you get |
|---------|--------|--------------|
| [Firebase](https://console.firebase.google.com) | Google account | Hosting + project |
| [Google Cloud](https://console.cloud.google.com) | Google account (same) | Cloud Run |
| [MongoDB Atlas](https://cloud.mongodb.com) | Email | Free M0 cluster (512 MB) |
| [Upstash](https://console.upstash.com) | Email / GitHub | Free Redis (10k req/day) |

Install tools:
```bash
# Firebase CLI
npm install -g firebase-tools
firebase login

# Google Cloud SDK
brew install google-cloud-sdk
gcloud auth login
gcloud auth configure-docker   # enables pushing to gcr.io
```

---

## Step 1 — MongoDB Atlas

1. Create a free **M0** cluster (any region)
2. In **Database Access** → add a user with password
3. In **Network Access** → add `0.0.0.0/0` (allow all IPs for Cloud Run)
4. Click **Connect → Drivers** → copy the connection string:
   ```
   mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/ai_interview
   ```

---

## Step 2 — Upstash Redis

1. Create a new database (any region, free tier)
2. Copy the **Redis URL** from the database page — it looks like:
   ```
   rediss://default:AxxxxxxxxxxxxxxA@fancy-name.upstash.io:6379
   ```

---

## Step 3 — Firebase project

```bash
# Create a new project (or use an existing one)
firebase projects:create your-project-id

# Set as default for this repo
firebase use your-project-id

# Enable the Web Frameworks experiment (needed for Next.js hosting)
firebase experiments:enable webframeworks
```

Update `.firebaserc` with your project ID:
```json
{ "projects": { "default": "your-project-id" } }
```

---

## Step 4 — Deploy backend to Cloud Run

```bash
# Set your GCP project
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Build the Docker image (run from the repo root)
docker build -f backend/Dockerfile \
  -t gcr.io/$PROJECT_ID/ai-interview-backend .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/ai-interview-backend

# Deploy to Cloud Run
gcloud run deploy ai-interview-backend \
  --image gcr.io/$PROJECT_ID/ai-interview-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --set-env-vars "\
NODE_ENV=production,\
MONGODB_URI=<your-atlas-uri>,\
REDIS_URL=<your-upstash-url>,\
UPLOAD_DIR=/tmp/uploads,\
MAX_VIDEO_SIZE_MB=50,\
MOCK_MODE=true,\
FRONTEND_URL=https://$PROJECT_ID.web.app"
```

After deploy, note the **Service URL** shown at the end (e.g. `https://ai-interview-backend-xxxxxx-uc.a.run.app`).

Verify it works:
```bash
curl https://ai-interview-backend-xxxxxx-uc.a.run.app/health
# → {"status":"ok","timestamp":"..."}
```

---

## Step 5 — Configure frontend with backend URL

```bash
echo "NEXT_PUBLIC_API_URL=https://ai-interview-backend-xxxxxx-uc.a.run.app" \
  > frontend/.env.production
```

---

## Step 6 — Deploy frontend to Firebase Hosting

```bash
firebase deploy --only hosting
```

Firebase CLI will detect Next.js, build the app, and deploy.

Your app is live at:
- `https://your-project-id.web.app`
- `https://your-project-id.firebaseapp.com`

---

## Updating after code changes

**Backend changes:**
```bash
docker build -f backend/Dockerfile -t gcr.io/$PROJECT_ID/ai-interview-backend . \
  && docker push gcr.io/$PROJECT_ID/ai-interview-backend \
  && gcloud run deploy ai-interview-backend \
       --image gcr.io/$PROJECT_ID/ai-interview-backend \
       --region us-central1
```

**Frontend changes:**
```bash
firebase deploy --only hosting
```

---

## Switching off mock mode (when OpenAI quota is restored)

```bash
gcloud run services update ai-interview-backend \
  --region us-central1 \
  --update-env-vars "MOCK_MODE=false,OPENAI_API_KEY=sk-..."
```

---

## Viewing logs

```bash
# Backend (Cloud Run) logs
gcloud run services logs read ai-interview-backend --region us-central1 --limit 50

# Or in real-time
gcloud beta run services logs tail ai-interview-backend --region us-central1
```

---

## Environment variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | `8080` (Cloud Run default) |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `REDIS_URL` | Yes | Upstash Redis URL (`rediss://...`) |
| `UPLOAD_DIR` | Yes | `/tmp/uploads` for Cloud Run |
| `FRONTEND_URL` | Yes | Firebase Hosting URL (for CORS) |
| `MOCK_MODE` | Yes | `true` for demo, `false` for real AI |
| `OPENAI_API_KEY` | If `MOCK_MODE=false` | Your OpenAI API key |
| `MAX_VIDEO_SIZE_MB` | No | Default: `50` |
