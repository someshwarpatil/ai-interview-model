'use client';

import { useRef, useEffect } from 'react';
import { useVideoRecorder } from '@/hooks/useVideoRecorder';
import Timer from './Timer';

interface VideoRecorderProps {
  maxDuration: number;
  onRecordingComplete: (blob: Blob) => void;
}

export default function VideoRecorder({ maxDuration, onRecordingComplete }: VideoRecorderProps) {
  const { isRecording, recordedBlob, stream, startRecording, stopRecording, resetRecording, error } =
    useVideoRecorder(maxDuration);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  // Show live camera feed during recording
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Show recorded video preview
  useEffect(() => {
    if (previewRef.current && recordedBlob) {
      previewRef.current.src = URL.createObjectURL(recordedBlob);
    }
  }, [recordedBlob]);

  // Notify parent when recording is complete
  useEffect(() => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob);
    }
  }, [recordedBlob, onRecordingComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Error display */}
      {error && (
        <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Video display area */}
      <div className="relative w-full max-w-lg aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-lg">
        {/* Live camera feed */}
        {stream && !recordedBlob && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Recorded preview */}
        {recordedBlob && (
          <video
            ref={previewRef}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Placeholder when no camera */}
        {!stream && !recordedBlob && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">Click &quot;Start Recording&quot; to begin</span>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            REC
          </div>
        )}

        {/* Timer overlay */}
        {isRecording && (
          <div className="absolute top-3 right-3">
            <Timer maxSeconds={maxDuration} isRunning={isRecording} onComplete={stopRecording} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!isRecording && !recordedBlob && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            <span className="w-3 h-3 bg-white rounded-full" />
            Start Recording
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors shadow-md"
          >
            <span className="w-3 h-3 bg-red-500 rounded-sm" />
            Stop Recording
          </button>
        )}

        {recordedBlob && (
          <button
            onClick={resetRecording}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Re-record
          </button>
        )}
      </div>
    </div>
  );
}
