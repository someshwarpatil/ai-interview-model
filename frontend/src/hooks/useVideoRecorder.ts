import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVideoRecorderReturn {
  isRecording: boolean;
  recordedBlob: Blob | null;
  stream: MediaStream | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  error: string | null;
}

export function useVideoRecorder(maxDuration: number = 90): UseVideoRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request camera and microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      setStream(mediaStream);

      // Determine supported MIME type
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setIsRecording(false);

        // Stop all tracks
        mediaStream.getTracks().forEach((track) => track.stop());
        setStream(null);
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        stopRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after max duration
      autoStopTimeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          stopRecording();
        }
      }, maxDuration * 1000);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera/microphone access denied. Please allow permissions and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found. Please connect a device and try again.');
      } else {
        setError('Failed to start recording. Please check your camera and microphone.');
      }
    }
  }, [maxDuration]);

  const stopRecording = useCallback(() => {
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resetRecording = useCallback(() => {
    setRecordedBlob(null);
    setError(null);
    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
    };
  }, [stream]);

  return {
    isRecording,
    recordedBlob,
    stream,
    startRecording,
    stopRecording,
    resetRecording,
    error,
  };
}
