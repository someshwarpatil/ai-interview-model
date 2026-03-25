# Deployment Guide — Vercel + Cloud Run + Firebase

## Architecture

```
Browser
  ├── Pages / static assets  →  Vercel          (Next.js frontend)
  └── API calls              →  Google Cloud Run (Express backend, asia-south1)
                                    ├── Firestore      (database)
                                    ├── Firebase Storage (video files)
                                    └── Firebase Auth   (user authentication)
```

---

## Prerequisites

| Tool | Install |
|------|---------|
| Node.js 20+ | [nodejs.org](https://nodejs.org) |
| gcloud CLI | `brew install google-cloud-sdk` |
| Vercel CLI | `npm i -g vercel` |
| Firebase project | [console.firebase.google.com](https://console.firebase.google.com) |

```bash
# Authenticate
gcloud auth login
vercel login
```

---

## Step 1 — Firebase Setup

1. Create a Firebase project (or use an existing one)
2. Enable **Firestore**, **Storage**, and **Authentication** (Email/Password) in the Firebase Console
3. Note your project ID (e.g. `spfinance-66f81`)

---

## Step 2 — Create GCP Secrets

Store API keys securely in Secret Manager:

```bash
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com

# Create secrets
echo -n "your-gemini-api-key" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "gemini" | gcloud secrets create AI_PROVIDER --data-file=-

# Grant Cloud Run access to secrets
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant Storage + token signing access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

---

## Step 3 — Deploy Backend to Cloud Run

From the repo root:

```bash
./backend/deploy.sh
```

This script:
- Builds the Docker image via Cloud Build (no local Docker needed)
- Deploys to Cloud Run (asia-south1) with 1 vCPU, 1GB RAM, 5 min timeout
- Configures env vars and secrets automatically
- Outputs the service URL

**Service URL example:** `https://ai-interview-backend-903366950647.asia-south1.run.app`

Verify:
```bash
curl https://YOUR_CLOUD_RUN_URL/health
# → {"status":"ok","timestamp":"..."}
```

### Update CORS after deploy

```bash
gcloud run services update ai-interview-backend \
  --region=asia-south1 \
  --update-env-vars="FRONTEND_URL=https://your-app.vercel.app"
```

> Note: The backend also allows all `*.vercel.app` origins automatically.

---

## Step 4 — Deploy Frontend to Vercel

### First time setup

1. Go to [vercel.com](https://vercel.com) → Import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variables in Vercel Dashboard (Settings > Environment Variables):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR_CLOUD_RUN_URL` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From Firebase Console |

### Deploy

```bash
vercel --prod
```

Or push to `main` — Vercel auto-deploys from GitHub.

---

## Updating After Code Changes

**Backend:**
```bash
./backend/deploy.sh
```

**Frontend:**
```bash
vercel --prod
# Or just push to main (auto-deploy)
```

**Both:**
```bash
./backend/deploy.sh && vercel --prod
```

---

## Switching AI Provider

```bash
# Update the secret
echo -n "claude" | gcloud secrets versions add AI_PROVIDER --data-file=-
echo -n "your-claude-key" | gcloud secrets create CLAUDE_API_KEY --data-file=-

# Redeploy with the new secret
gcloud run services update ai-interview-backend \
  --region=asia-south1 \
  --update-secrets="CLAUDE_API_KEY=CLAUDE_API_KEY:latest"
```

---

## Toggling Mock Mode

```bash
gcloud run services update ai-interview-backend \
  --region=asia-south1 \
  --update-env-vars="MOCK_MODE=true"
```

Set to `false` to use real AI evaluation.

---

## Viewing Logs

```bash
# Cloud Run logs
gcloud run services logs read ai-interview-backend --region=asia-south1 --limit=50

# Real-time tail
gcloud beta run services logs tail ai-interview-backend --region=asia-south1
```

---

## Environment Variable Reference

### Backend (Cloud Run)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Auto | `8080` (set by Cloud Run) |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | Yes | `project-id.appspot.com` |
| `AI_PROVIDER` | Yes | `gemini`, `claude`, or `openai` (via Secret Manager) |
| `GEMINI_API_KEY` | If gemini | Gemini API key (via Secret Manager) |
| `CLAUDE_API_KEY` | If claude | Claude API key (via Secret Manager) |
| `OPENAI_API_KEY` | If openai | OpenAI API key (via Secret Manager) |
| `FRONTEND_URL` | Yes | Vercel frontend URL (for CORS) |
| `MOCK_MODE` | No | `true` to bypass AI calls |
| `MAX_VIDEO_SIZE_MB` | No | Default: `50` |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Cloud Run backend URL |
| `NEXT_PUBLIC_MAX_RECORDING_SECONDS` | No | Default: `90` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase client API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID |
