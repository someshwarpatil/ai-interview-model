'use client';

import type { InterviewSession } from '../../../shared/src/types/interview.types';
import ScoreDisplay from './ScoreDisplay';

interface ReportCardProps {
  session: InterviewSession;
}

export default function ReportCard({ session }: ReportCardProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Interview Report</h2>
        <p className="text-gray-500 mt-1">
          {session.role} - {session.interviewType} Interview
        </p>
      </div>

      {/* Final Score - Large */}
      <div className="flex justify-center">
        <ScoreDisplay
          label="Final Score"
          score={session.finalScore || 0}
          size="lg"
        />
      </div>

      {/* Score Grid */}
      <div className="grid grid-cols-3 gap-4">
        <ScoreDisplay label="Content" score={session.contentScore || 0} />
        <ScoreDisplay label="Speech" score={session.speechScore || 0} />
        <ScoreDisplay label="Body Language" score={session.bodyLanguageScore || 0} />
      </div>

      {/* Speech Metrics */}
      {session.speechMetrics && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Speech Metrics</h3>
          <div className="grid grid-cols-3 gap-4">
            <MetricItem
              label="Words Per Minute"
              value={session.speechMetrics.wordsPerMinute.toString()}
              ideal="120-150"
            />
            <MetricItem
              label="Filler Words"
              value={session.speechMetrics.fillerWordsCount.toString()}
              ideal="< 3"
            />
            <MetricItem
              label="Duration"
              value={`${session.speechMetrics.duration}s`}
              ideal="60-90s"
            />
          </div>
        </div>
      )}

      {/* Evaluation Breakdown */}
      {session.evaluation && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Content Evaluation</h3>
          <div className="space-y-3">
            <EvalBar label="Relevance" score={session.evaluation.relevance} />
            <EvalBar label="Structure" score={session.evaluation.structure} />
            <EvalBar label="Clarity" score={session.evaluation.clarity} />
            <EvalBar label="Depth" score={session.evaluation.depth} />
            <EvalBar label="Confidence" score={session.evaluation.confidence} />
          </div>
        </div>
      )}

      {/* Transcript */}
      {session.transcript && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Transcript</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
            {session.transcript}
          </div>
        </div>
      )}

      {/* Improved Answer */}
      {session.improvedAnswer && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Improved Answer</h3>
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-gray-700 text-sm leading-relaxed">
            {session.improvedAnswer}
          </div>
        </div>
      )}

      {/* Tips */}
      {session.tips && session.tips.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Improvement Tips</h3>
          <ul className="space-y-2">
            {session.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question reminder */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Interview Question</h3>
        <p className="text-gray-800">{session.question}</p>
      </div>
    </div>
  );
}

function MetricItem({ label, value, ideal }: { label: string; value: string; ideal: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
      <div className="text-xs text-gray-400">Ideal: {ideal}</div>
    </div>
  );
}

function EvalBar({ label, score }: { label: string; score: number }) {
  const getBarColor = (s: number) => {
    if (s >= 80) return 'bg-green-500';
    if (s >= 60) return 'bg-blue-500';
    if (s >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-24">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${getBarColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-700 w-8 text-right">{score}</span>
    </div>
  );
}
