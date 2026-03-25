# AI Mock Interview Platform

An AI-powered mock interview SaaS platform that evaluates video responses using OpenAI Whisper (transcription) and GPT-4 (content evaluation), providing structured feedback with scores, transcript, and improvement tips.

## Architecture

```
ai-interview-model/
├── frontend/          # Next.js (App Router) + TypeScript + Tailwind CSS
├── backend/           # Express + TypeScript + MongoDB + Redis/BullMQ
├── shared/            # Shared TypeScript types and constants
├── docker-compose.yml # MongoDB + Redis for local development
└── README.md
```

### How It Works

1. **Student** selects a role and interview type
2. **Frontend** displays a question and records video (max 90 seconds)
3. **Backend** accepts the video upload, creates a session, and queues a processing job
4. **Worker** processes the video asynchronously:
   - Extracts audio using FFmpeg
   - Transcribes using OpenAI Whisper
   - Calculates speech metrics (WPM, filler words, pauses)
   - Evaluates content using GPT-4 (relevance, structure, clarity, depth, confidence)
   - Computes final scores and generates improvement tips
5. **Frontend** polls for results and displays a comprehensive report

## Prerequisites

- **Node.js** 20+
- **Docker** & **Docker Compose** (for MongoDB and Redis)
- **FFmpeg** installed on your system
- **OpenAI API Key**

### Install FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows (with Chocolatey)
choco install ffmpeg
```

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ai-interview-model
```

### 2. Start Docker services (MongoDB + Redis)

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker ps
# Should show ai-interview-mongodb and ai-interview-redis
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

**Backend:**
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your OpenAI API key:
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

**Frontend:**
```bash
cp frontend/.env.local.example frontend/.env.local
```

### 5. Start all services

```bash
# Start backend, frontend, and worker concurrently
npm run dev
```

Or start individually in separate terminals:

```bash
# Terminal 1: Backend server (port 5000)
npm run dev:backend

# Terminal 2: Worker process
npm run dev:worker

# Terminal 3: Frontend (port 3000)
npm run dev:frontend
```

### 6. Open the app

Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

### POST /api/interview

Create a new interview session with video upload.

**Request:** `multipart/form-data`
- `video` (file) - Video recording (webm/mp4)
- `role` (string) - Selected role (e.g., "Software Engineer")
- `interviewType` (string) - Interview type (e.g., "Technical")
- `question` (string, optional) - Custom question

**Response:**
```json
{
  "sessionId": "65a1b2c3d4e5f6789...",
  "status": "processing",
  "message": "Interview session created and queued for processing"
}
```

### GET /api/interview/:id

Get interview session status and results.

**Response (processing):**
```json
{
  "_id": "65a1b2c3d4e5f6789...",
  "status": "processing",
  "role": "Software Engineer",
  "interviewType": "Technical",
  "question": "..."
}
```

**Response (completed):**
```json
{
  "_id": "65a1b2c3d4e5f6789...",
  "status": "completed",
  "role": "Software Engineer",
  "interviewType": "Technical",
  "question": "...",
  "transcript": "...",
  "speechMetrics": {
    "wordsPerMinute": 135,
    "fillerWordsCount": 3,
    "pauseCount": 8,
    "duration": 45
  },
  "contentScore": 78,
  "speechScore": 82,
  "bodyLanguageScore": 50,
  "finalScore": 72,
  "evaluation": {
    "relevance": 85,
    "structure": 75,
    "clarity": 80,
    "depth": 70,
    "confidence": 80
  },
  "improvedAnswer": "...",
  "tips": ["tip 1", "tip 2", "tip 3"]
}
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Express, TypeScript, MongoDB, Redis |
| Queue | BullMQ |
| AI | OpenAI Whisper (transcription), GPT-4 (evaluation) |
| Audio | FFmpeg |
| Storage | Local filesystem (MVP) |

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/ai_interview` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `OPENAI_API_KEY` | OpenAI API key | (required) |
| `UPLOAD_DIR` | Video upload directory | `./uploads` |
| `MAX_VIDEO_SIZE_MB` | Max upload size | `50` |
| `FRONTEND_URL` | CORS origin | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:5000` |
| `NEXT_PUBLIC_MAX_RECORDING_SECONDS` | Max recording duration | `90` |

## Project Structure

### Backend

```
backend/src/
├── config/           # Database, Redis, OpenAI client setup
├── controllers/      # HTTP request handlers
├── services/         # Business logic layer
│   ├── interview     # Session management
│   ├── storage       # File storage abstraction
│   ├── audio         # FFmpeg audio extraction
│   ├── transcription # Whisper API integration
│   └── evaluation    # GPT-4 content evaluation
├── workers/          # BullMQ async job processors
├── models/           # MongoDB schemas (User, InterviewSession, Question)
├── middleware/       # Error handling, file upload (multer)
├── prompts/          # Versioned AI prompt templates
├── routes/           # Express route definitions
└── utils/            # Speech metrics, logging
```

### Frontend

```
frontend/src/
├── app/              # Next.js App Router pages
│   ├── page.tsx      # Role & type selection
│   ├── interview/    # Video recording page
│   └── results/[id]/ # Results display with polling
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks (video recorder, polling)
├── lib/              # API client, utilities
└── styles/           # Global Tailwind styles
```

## Scoring System

| Score | Weight | Source |
|-------|--------|--------|
| Content Score | 50% | GPT-4 evaluation (relevance, structure, clarity, depth, confidence) |
| Speech Score | 30% | Speech metrics (WPM, filler words, pauses) |
| Body Language Score | 20% | Placeholder (50) for MVP |
| **Final Score** | - | Weighted average of above |

## License

MIT
