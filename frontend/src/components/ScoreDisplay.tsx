'use client';

interface ScoreDisplayProps {
  label: string;
  score: number;
  maxScore?: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function getProgressColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function ScoreDisplay({
  label,
  score,
  maxScore = 100,
  size = 'md',
}: ScoreDisplayProps) {
  const percentage = Math.round((score / maxScore) * 100);
  const sizeClasses = {
    sm: { card: 'p-3', score: 'text-2xl', label: 'text-xs' },
    md: { card: 'p-4', score: 'text-3xl', label: 'text-sm' },
    lg: { card: 'p-6', score: 'text-5xl', label: 'text-base' },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${classes.card} flex flex-col items-center gap-2`}>
      <span className={`${classes.label} text-gray-500 font-medium uppercase tracking-wide`}>
        {label}
      </span>
      <span className={`${classes.score} font-bold ${getScoreColor(score)}`}>
        {score}
      </span>
      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(score)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
