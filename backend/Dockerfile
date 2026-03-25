# ---- Build stage ----
FROM node:20-slim AS builder

# Build tools needed for native npm dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Install all workspace deps
RUN npm install --workspace=backend --workspace=shared

# Copy source
COPY shared/ ./shared/
COPY backend/ ./backend/

# Compile TypeScript + rewrite path aliases
RUN npm run build --workspace=backend

# ---- Runtime stage ----
FROM node:20-slim

# FFmpeg for audio extraction
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled output and dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY backend/start.sh ./start.sh

RUN chmod +x ./start.sh

# Create temp uploads dir
RUN mkdir -p /tmp/uploads

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["./start.sh"]
