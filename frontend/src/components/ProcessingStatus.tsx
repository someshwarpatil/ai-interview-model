'use client';

interface ProcessingStatusProps {
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  onRetry?: () => void;
}

export default function ProcessingStatus({ status, error, onRetry }: ProcessingStatusProps) {
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Processing Failed</h3>
        {error && <p className="text-sm text-gray-600 text-center max-w-md">{error}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      {/* Spinner */}
      <div className="relative">
        <div className="w-20 h-20 border-4 border-gray-200 rounded-full" />
        <div className="absolute inset-0 w-20 h-20 border-4 border-primary-500 rounded-full border-t-transparent animate-spin" />
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800">Processing Your Interview</h3>
        <p className="text-sm text-gray-500 mt-1">
          This usually takes 30-60 seconds...
        </p>
      </div>

      {/* Animated steps */}
      <div className="flex flex-col gap-2 text-sm text-gray-600">
        <StepItem label="Extracting audio from video" delay={0} />
        <StepItem label="Transcribing your response" delay={5} />
        <StepItem label="Analyzing speech patterns" delay={15} />
        <StepItem label="Evaluating content quality" delay={25} />
        <StepItem label="Generating your report" delay={40} />
      </div>
    </div>
  );
}

function StepItem({ label, delay }: { label: string; delay: number }) {
  return (
    <div
      className="flex items-center gap-2 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}s`, animationFillMode: 'forwards' }}
    >
      <div className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
      <span>{label}</span>
    </div>
  );
}
