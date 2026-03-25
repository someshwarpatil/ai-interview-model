# AI Mock Interview Platform

An AI-powered mock interview platform that evaluates video responses using multi-provider AI (Gemini, Claude, OpenAI), providing structured feedback with scores, transcripts, and improvement tips.

## Architecture

```
ai-interview-model/
├── frontend/          # Next.js 14 (App Router) + TypeScript + Tailwind CSS
├── backend/           # Express + TypeScript + Firebase (Firestore, Storage, Auth)
├── shared/            # Shared TypeScript types and constants
├── vercel.json        # Vercel frontend deployment config
├── cloudbuild.yaml    # Cloud Build config for backend Docker image
└── docker-compose.yml # (empty — Firebase replaces MongoDB/Redis)
```

### Deployment

| Service  | Platform    | URL |
|----------|-------------|-----|
| Frontend | Vercel      | `https://ai-interview-model-*.vercel.app` |
| Backend  | Cloud Run   | `https://ai-interview-backend-*.asia-south1.run.app` |
| Database | Firestore   | Firebase Console |
| Storage  | Firebase Storage | Firebase Console |
| Auth     | Firebase Auth | Firebase Console |

### How It Works

1. **User** signs in with email/password (Firebase Auth)
2. **Frontend** displays a question based on selected role and interview type
3. **User** records a video answer (max 90 seconds) — or uses **Mock Mode** to skip video
4. **Backend** uploads video to Firebase Storage, creates a session in Firestore, and processes asynchronously:
   - Extracts audio using FFmpeg
   - Transcribes using Gemini / OpenAI Whisper / Claude (configurable)
   - Calculates speech metrics (WPM, filler words, pauses)
   - Evaluates content using AI (relevance, structure, clarity, depth, confidence)
   - Generates an improved answer and actionable tips
5. **Frontend** polls for results and displays a comprehensive report

## Prerequisites

- **Node.js** 20+
- **FFmpeg** installed locally (`brew install ffmpeg` on macOS)
- **Firebase** project with Firestore, Storage, and Authentication enabled
- **AI API key** — at least one of: Gemini (default), OpenAI, or Claude

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/someshwarpatil/ai-interview-model.git
cd ai-interview-model
npm install
```

### 2. Configure environment

**Backend:**
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
PORT=5001
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key
FRONTEND_URL=http://localhost:3000
MOCK_MODE=false
```

Place your Firebase service account key as `backend/serviceAccountKey.json` (download from Firebase Console > Project Settings > Service Accounts).

**Frontend:**
```bash
cp frontend/.env.local.example frontend/.env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Start development

```bash
npm run dev
```

This starts both backend (port 5001) and frontend (port 3000) concurrently.

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

All endpoints require `Authorization: Bearer <firebase-id-token>` unless noted.

### `POST /api/interview`

Create a new interview session with video upload.

**Request:** `multipart/form-data`
- `video` (file) — Video recording (webm/mp4/ogg/mov)
- `role` (string) — Job role (e.g. "Software Engineer")
- `interviewType` (string) — Type: Technical, Behavioral, Case Study

**Response:** `201`
```json
{
  "sessionId": "abc123",
  "status": "processing"
}
```

### `GET /api/interview/:id`

Get interview session status and results.

**Response:** `200`
```json
{
  "id": "abc123",
  "status": "completed",
  "question": "...",
  "transcript": "...",
  "contentScore": 76,
  "speechScore": 72,
  "bodyLanguageScore": 50,
  "finalScore": 71,
  "evaluation": { "relevance": 80, "structure": 75, "clarity": 78, "depth": 72, "confidence": 70 },
  "improvedAnswer": "...",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}
```

### `POST /api/analyze`

Synchronous endpoint — accepts a video URL or file, processes the full pipeline, and returns the report in a single JSON response.

**Request (JSON):**
```json
{
  "videoUrl": "https://example.com/video.webm",
  "role": "Software Engineer",
  "interviewType": "Technical",
  "question": "Design a URL shortening service."
}
```

**Response:** Full report JSON (same fields as GET interview, plus `transcript` and `audioDuration`).

### `GET /api/config`

Public endpoint (no auth). Returns app configuration.

```json
{ "mockMode": false }
```

### `GET /health`

Health check (no auth).

```json
{ "status": "ok", "timestamp": "2026-03-25T..." }
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Express 4.18, TypeScript |
| Database | Firestore (Firebase Admin SDK) |
| Storage | Firebase Cloud Storage |
| Auth | Firebase Authentication |
| AI | Gemini 2.5 Flash (default), OpenAI GPT-4 Turbo, Anthropic Claude Sonnet 4.5 |
| Transcription | Gemini (multimodal), OpenAI Whisper |
| Audio | FFmpeg via fluent-ffmpeg |
| Frontend Hosting | Vercel |
| Backend Hosting | Google Cloud Run (asia-south1) |

## Scoring System

| Score | Weight | Source |
|-------|--------|--------|
| Content Score | 50% | AI evaluation (relevance, structure, clarity, depth, confidence) |
| Speech Score | 30% | Speech metrics (WPM, filler words, pauses) |
| Body Language Score | 20% | Placeholder (50) for MVP |
| **Final Score** | — | Weighted average of above |

## Mock Mode

Set `MOCK_MODE=true` in the backend `.env` to bypass video recording and AI API calls. The frontend shows a "Mock Mode" banner, skips the video recorder, and the backend generates realistic sample answers with full evaluation. Useful for demos and development.

## Deployment

See [DEPLOY.md](DEPLOY.md) for full deployment instructions (Vercel + Cloud Run).

**Quick deploy:**
```bash
# Backend → Cloud Run
./backend/deploy.sh

# Frontend → Vercel
vercel --prod
```

## License

MIT
