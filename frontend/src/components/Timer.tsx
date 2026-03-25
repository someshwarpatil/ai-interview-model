'use client';

import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  maxSeconds: number;
  isRunning: boolean;
  onComplete?: () => void;
}

export default function Timer({ maxSeconds, isRunning, onComplete }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(maxSeconds);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft(maxSeconds);
      return;
    }

    setSecondsLeft(maxSeconds);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, maxSeconds]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = ((maxSeconds - secondsLeft) / maxSeconds) * 100;

  const isLow = secondsLeft <= 10;
  const isWarning = secondsLeft <= 30 && secondsLeft > 10;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Circular timer display */}
      <div className="relative w-20 h-20">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isLow ? '#ef4444' : isWarning ? '#f59e0b' : '#0ea5e9'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        {/* Time text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-lg font-bold ${
              isLow ? 'text-red-500 animate-pulse' : isWarning ? 'text-amber-500' : 'text-gray-700'
            }`}
          >
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Status text */}
      {isRunning && (
        <span className="text-xs text-gray-500">
          {isLow ? 'Almost done!' : isWarning ? 'Wrapping up...' : 'Recording'}
        </span>
      )}
    </div>
  );
}
