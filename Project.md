You are a senior full-stack SaaS architect.

Build a basic but production-structured MVP for an AI Mock Interview SaaS platform.

GOAL:
Phase 1:

- Text-based interviewer
- Student records video answer
- Backend processes video asynchronously
- Generates transcript, speech metrics, and AI evaluation
- Returns structured JSON report

TECH STACK:

Frontend:

- Next.js (App Router)
- Typescript
- Tailwind CSS
- MediaRecorder API for video recording

Backend:

- Node.js
- Express
- Typescript
- MongoDB
- Redis + BullMQ (job queue)
- FFmpeg (audio extraction)
- OpenAI API (Whisper + GPT)
- Cloud storage abstraction (local file storage for MVP)

ARCHITECTURE REQUIREMENTS:

1. Clean folder structure
2. Separate:
   - Controllers
   - Services
   - Workers
   - Utils
   - Models
3. All AI prompts stored in separate versioned file
4. Async video processing using job queue
5. Structured JSON scoring
6. Error handling middleware
7. Environment-based config
8. Docker-ready structure

---

## FUNCTIONAL REQUIREMENTS

FRONTEND:

Page 1:

- Select role
- Select interview type
- Start interview button

Page 2:

- Display text question
- Record video (max 90 sec)
- Show timer
- Submit button

After submit:

- Show “Processing...”
- Poll /api/interview/:id until status = completed
- Show structured report UI

Report UI should display:

- Content Score
- Speech Score
- Body Language Score
- Final Score
- Filler Words Count
- Words Per Minute
- Transcript
- Improved Answer
- Improvement Tips

---

BACKEND:

1. POST /api/interview
   - Accept video file
   - Save video
   - Create interviewSession record with status="processing"
   - Push job to queue
   - Return sessionId

2. GET /api/interview/:id
   - Return session status
   - If completed return full report JSON

---

PROCESSING WORKER FLOW:

When job starts:

1. Extract audio from video using FFmpeg
2. Send audio to OpenAI Whisper
3. Receive transcript
4. Calculate:
   - Words per minute
   - Filler words count
   - Pause count
5. Send structured prompt to GPT:
   - Evaluate relevance
   - Structure
   - Clarity
   - Depth
   - Confidence
   - Return JSON only
6. Generate:
   contentScore
   speechScore
   bodyLanguageScore (basic placeholder logic for now)
7. Compute finalScore
8. Save structured report JSON
9. Update interviewSession status="completed"

---

DATABASE SCHEMA:

User
InterviewSession
Question

InterviewSession:

- userId
- role
- interviewType
- question
- videoUrl
- transcript
- speechMetrics
- contentMetrics
- finalScore
- improvedAnswer
- tips[]
- status
- createdAt
- completedAt

---

IMPORTANT:

- Do NOT overcomplicate.
- No authentication needed for MVP.
- No cloud infra yet.
- Use local storage.
- Keep code clean and modular.
- Add README with setup instructions.
- Add example .env file.
- Provide working scripts.

---

DELIVERABLE FORMAT:

Provide:

1. Folder structure
2. Full backend code
3. Worker code
4. Frontend pages
5. Environment setup
6. How to run locally
7. Sample prompt template for GPT evaluation
