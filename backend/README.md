# AI Interview Model - Backend

Express + TypeScript backend for AI-powered interview evaluation. Supports multi-provider AI (Gemini, Claude, OpenAI), Firebase for storage/auth/database.

## Tech Stack

- **Runtime:** Node.js + TypeScript (ES2022)
- **Framework:** Express 4.18
- **Database:** Firestore (Firebase Admin SDK)
- **Storage:** Firebase Cloud Storage
- **Auth:** Firebase Authentication (ID token verification)
- **AI Providers:** Google Gemini (default), OpenAI, Anthropic Claude
- **Audio Processing:** FFmpeg via fluent-ffmpeg
- **Logging:** Winston

## Getting Started

### Prerequisites

- Node.js 18+
- FFmpeg installed (`brew install ffmpeg` on macOS)
- Firebase project with Firestore, Storage, and Authentication enabled
- At least one AI provider API key (Gemini recommended)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy and configure environment variables:

   ```bash
   cp .env.example .env
   ```

3. Place your Firebase service account key as `serviceAccountKey.json` in the backend root (download from Firebase Console > Project Settings > Service Accounts).

4. Set your AI provider and API key in `.env`:

   ```env
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your-key-here
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

### Scripts

| Script  | Command                 | Description                        |
| ------- | ----------------------- | ---------------------------------- |
| `dev`   | `ts-node-dev --respawn` | Development server with hot reload |
| `build` | `tsc && tsc-alias`      | Compile TypeScript for production  |
| `start` | `node dist/server.js`   | Run compiled production build      |

## Environment Variables

| Variable                       | Default                    | Description                                    |
| ------------------------------ | -------------------------- | ---------------------------------------------- |
| `NODE_ENV`                     | `development`              | Environment mode                               |
| `PORT`                         | `5000`                     | Server port                                    |
| `FIREBASE_PROJECT_ID`          | -                          | Firebase project ID                            |
| `FIREBASE_STORAGE_BUCKET`      | -                          | Storage bucket (e.g. `project-id.appspot.com`) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `./serviceAccountKey.json` | Path to service account key file               |
| `AI_PROVIDER`                  | `gemini`                   | AI provider: `gemini`, `claude`, or `openai`   |
| `GEMINI_API_KEY`               | -                          | Google Gemini API key                          |
| `CLAUDE_API_KEY`               | -                          | Anthropic Claude API key                       |
| `OPENAI_API_KEY`               | -                          | OpenAI API key                                 |
| `MAX_VIDEO_SIZE_MB`            | `50`                       | Max video upload size in MB                    |
| `FRONTEND_URL`                 | `http://localhost:3000`    | Allowed CORS origin                            |
| `MOCK_MODE`                    | `false`                    | Skip AI calls, return mock data for testing    |

## API Endpoints

All routes require a Firebase ID token in the `Authorization: Bearer <token>` header unless noted.

### `POST /api/interview`

Create a new interview session with video upload. In mock mode, accepts JSON without video.

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `video` | File | Video recording (mp4, webm, ogg, mov) |
| `role` | string | Job role (e.g. "Software Engineer") |
| `interviewType` | string | Type: Technical, Behavioral, Case Study |

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
  "question": "Tell me about a challenging project...",
  "transcript": "In my previous role...",
  "contentScore": 76,
  "speechScore": 72,
  "bodyLanguageScore": 50,
  "finalScore": 71,
  "evaluation": {
    "relevance": 80,
    "structure": 75,
    "clarity": 78,
    "depth": 72,
    "confidence": 70
  },
  "improvedAnswer": "A stronger answer would...",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}
```

### `POST /api/analyze`

Synchronous endpoint — accepts a video URL or uploaded file, processes the full pipeline, and returns the complete report in a single JSON response. Useful for API integrations and testing.

**Request (JSON with video URL):**
```json
{
  "videoUrl": "https://example.com/video.webm",
  "role": "Software Engineer",
  "interviewType": "Technical",
  "question": "Design a URL shortening service."
}
```

**Request (multipart with video file):** Same as `POST /api/interview`.

**Response:** `200` — Full report with transcript, scores, evaluation, improved answer, and tips.

**cURL example:**
```bash
curl -X POST https://YOUR_BACKEND_URL/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"videoUrl":"https://example.com/video.webm","role":"Software Engineer","interviewType":"Technical"}'
```

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

## Architecture

```
Request Flow:

Client (video + metadata)
  |
  v
Auth Middleware (Firebase ID token verification)
  |
  v
Upload Middleware (multer, memory storage, file validation)
  |
  v
Controller
  |-- Saves video to Firebase Storage
  |-- Creates session in Firestore (status: processing)
  |-- Fires background processing (fire-and-forget)
  |
  v
Interview Worker (background)
  |-- Downloads video from Firebase Storage to temp file
  |-- Extracts audio via FFmpeg
  |-- Transcribes audio (Gemini/OpenAI/Claude fallback)
  |-- Calculates speech metrics (WPM, filler words, pauses)
  |-- Evaluates content with LLM (scores + feedback)
  |-- Updates Firestore session with results
  |-- Cleans up temp files
  |
  v
Client polls GET /api/interview/:id for results
```

## Project Structure

```
backend/
  deploy.sh              # One-command deploy to Cloud Run
  start.sh               # Container entrypoint
  Dockerfile             # Multi-stage Docker build with FFmpeg
  src/
    config/
      index.ts           # Central configuration from env vars
      database.ts        # Firebase Admin SDK initialization
      ai.ts              # Lazy-initialized AI provider clients (Gemini/OpenAI/Claude)
    controllers/
      interview.controller.ts  # Interview CRUD + mock mode support
      analyze.controller.ts    # Synchronous video analysis endpoint
    middleware/
      auth.middleware.ts     # Firebase token verification
      error.middleware.ts    # Global error handler + AppError class
      upload.middleware.ts   # Multer memory storage + file validation
    models/
      InterviewSession.model.ts  # Firestore CRUD helper
      Question.model.ts          # Firestore query helper
      User.model.ts              # Firestore find-or-create helper
    prompts/
      evaluation-prompts.v1.ts   # LLM prompt templates + scoring functions
    routes/
      interview.routes.ts    # Interview routes (conditional multer for mock mode)
      analyze.routes.ts      # Synchronous analysis route
    services/
      audio.service.ts           # FFmpeg audio extraction
      evaluation.service.ts      # Multi-provider LLM evaluation
      interview.service.ts       # Session management + question selection
      storage.service.ts         # Firebase Storage operations
      transcription.service.ts   # Multi-provider speech-to-text
    utils/
      logger.ts          # Winston logger
      metrics.ts         # Speech metrics calculator (WPM, fillers, pauses)
    workers/
      interview.worker.ts  # Background processing + mock interview pipeline
    app.ts               # Express app setup (CORS, middleware, routes)
    server.ts            # Entry point (Firebase init + server start)
```

## AI Provider Details

| Feature       | Gemini                        | OpenAI      | Claude                         |
| ------------- | ----------------------------- | ----------- | ------------------------------ |
| Transcription | Gemini 2.5 Flash (multimodal) | Whisper     | Falls back to Gemini or OpenAI |
| Evaluation    | Gemini 2.5 Flash              | GPT-4 Turbo | Claude Sonnet 4.5              |
| Default       | Yes                           | No          | No                             |

> Claude does not support audio transcription natively. When `AI_PROVIDER=claude`, transcription falls back to Gemini (if `GEMINI_API_KEY` is set) or OpenAI (if `OPENAI_API_KEY` is set).

## Scoring System

**Content Score** (0-100): Average of 5 evaluation dimensions

- Relevance, Structure, Clarity, Depth, Confidence

**Speech Score** (0-100): Weighted combination

- 50% Words Per Minute (optimal: 120-150 WPM)
- 30% Filler word frequency (fewer = better)
- 20% Pause pattern (natural: 5-10 pauses/min)

**Final Score** (0-100): Weighted composite

- 50% Content + 30% Speech + 20% Body Language

## Mock Mode

Set `MOCK_MODE=true` to bypass all AI API calls. Useful for development and demos. Returns realistic mock data with slight randomization for transcription, evaluation scores, and tips.

## Deployment (Cloud Run)

The backend is deployed to Google Cloud Run (asia-south1) using the included `deploy.sh`:

```bash
./deploy.sh
```

This builds the Docker image via Cloud Build, deploys to Cloud Run with appropriate env vars and secrets, and outputs the service URL.

See [DEPLOY.md](../DEPLOY.md) for full setup including GCP secrets, IAM permissions, and CORS configuration.

## Firestore Collections

| Collection   | Key Fields                                      | Description                                |
| ------------ | ----------------------------------------------- | ------------------------------------------ |
| `interviews` | status, role, interviewType, scores, evaluation | Interview session records                  |
| `questions`  | role, interviewType, text, difficulty           | Question bank                              |
| `users`      | uid, email, name, createdAt                     | User profiles (keyed by Firebase Auth UID) |
