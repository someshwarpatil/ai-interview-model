#!/bin/sh
# Start the Express API server.
# Interview processing runs inline (fire-and-forget) — no separate worker needed.

echo "Starting AI Interview backend..."
exec node backend/dist/server.js
