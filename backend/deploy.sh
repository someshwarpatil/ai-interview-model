#!/bin/bash
# Deploy backend to Google Cloud Run
#
# Prerequisites:
#   1. gcloud CLI installed and authenticated: gcloud auth login
#   2. Project set: gcloud config set project YOUR_PROJECT_ID
#   3. Enable APIs: gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
#
# Usage:
#   ./backend/deploy.sh                    # Uses defaults
#   ./backend/deploy.sh my-project-id      # Override project ID

set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
REGION="asia-south1"
SERVICE_NAME="ai-interview-backend"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: No project ID. Set it with: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

echo "==> Deploying to Cloud Run"
echo "    Project:  ${PROJECT_ID}"
echo "    Region:   ${REGION}"
echo "    Service:  ${SERVICE_NAME}"
echo ""

# Resolve repo root (deploy.sh lives in backend/)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Build and push container image using Cloud Build
echo "==> Building container image..."
gcloud builds submit \
  --config="${REPO_ROOT}/cloudbuild.yaml" \
  --substitutions="_IMAGE=${IMAGE}" \
  --project "${PROJECT_ID}" \
  "${REPO_ROOT}"

# Deploy to Cloud Run
echo "==> Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --concurrency 80 \
  --min-instances 0 \
  --max-instances 5 \
  --no-cpu-throttling \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "FIREBASE_PROJECT_ID=${PROJECT_ID}" \
  --set-env-vars "FIREBASE_STORAGE_BUCKET=${PROJECT_ID}.appspot.com" \
  --update-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --update-secrets "AI_PROVIDER=AI_PROVIDER:latest"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format "value(status.url)")

echo ""
echo "==> Deployed successfully!"
echo "    URL: ${SERVICE_URL}"
echo ""
echo "    Set this as NEXT_PUBLIC_API_URL in your Vercel frontend env vars."
echo ""
echo "    To set additional secrets:"
echo "      gcloud secrets create CLAUDE_API_KEY --data-file=-"
echo "      gcloud secrets create OPENAI_API_KEY --data-file=-"
echo "      Then redeploy with --update-secrets flags."
