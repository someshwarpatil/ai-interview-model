'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VideoRecorder from '@/components/VideoRecorder';
import { createInterview, createMockInterview, getAppConfig } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { MAX_RECORDING_SECONDS } from '../../../../shared/src/constants';

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getIdToken } = useAuth();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const role = searchParams.get('role') || '';
  const interviewType = searchParams.get('type') || '';

  const [question, setQuestion] = useState('');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(false);

  // Fetch mock mode config from backend
  useEffect(() => {
    getAppConfig().then((cfg) => setMockMode(cfg.mockMode));
  }, []);

  // Get a question based on role and type
  useEffect(() => {
    if (!role || !interviewType) {
      router.push('/');
      return;
    }

    // Default questions based on role + type
    const questions: Record<string, Record<string, string[]>> = {
      'Software Engineer': {
        'Technical': [
          'Explain how you would design a URL shortening service like bit.ly.',
          'Walk me through how you would optimize a slow database query.',
          'Describe the difference between REST and GraphQL. When would you use each?',
          'How would you design a real-time notification system?',
        ],
        'Behavioral': [
          'Tell me about a time when you had to debug a complex issue in production.',
          'Describe a situation where you disagreed with a team member on a technical decision.',
          'Tell me about a project you are most proud of and why.',
        ],
        'Case Study': [
          'You notice a 10x increase in error rates after a deploy. Walk me through your debugging process.',
        ],
      },
      'Product Manager': {
        'Technical': [
          'How would you prioritize features for a new product launch?',
          'Walk me through how you would define success metrics for a new feature.',
        ],
        'Behavioral': [
          'Describe a situation where you had to make a difficult product decision with limited data.',
          'Tell me about a time you had to say no to a stakeholder request.',
        ],
        'Case Study': [
          'How would you improve the onboarding experience for a SaaS product with high churn?',
        ],
      },
      'Data Scientist': {
        'Technical': [
          'Explain how you would approach building a recommendation system.',
          'How would you handle missing data in a large dataset?',
        ],
        'Behavioral': [
          'Tell me about a time when your data analysis led to a significant business insight.',
        ],
        'Case Study': [
          'A/B test results show a 2% improvement in clicks but a 1% decrease in conversions. What do you recommend?',
        ],
      },
    };

    const roleQuestions = questions[role]?.[interviewType] || [];
    const selectedQuestion = roleQuestions.length > 0
      ? roleQuestions[Math.floor(Math.random() * roleQuestions.length)]
      : 'Tell me about your experience and what makes you a great fit for this role.';

    setQuestion(selectedQuestion);
  }, [role, interviewType, router]);

  const handleRecordingComplete = useCallback((blob: Blob) => {
    setRecordedBlob(blob);
  }, []);

  const handleSubmit = async () => {
    if (!mockMode && !recordedBlob) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const token = await getIdToken();

      let response;
      if (mockMode) {
        response = await createMockInterview({ role, interviewType, question }, token);
      } else {
        response = await createInterview(recordedBlob!, { role, interviewType, question }, token);
      }

      router.push(`/results/${response.sessionId}`);
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Failed to submit interview. Please try again.');
      setIsSubmitting(false);
    }
  };

  const maxDuration = parseInt(
    process.env.NEXT_PUBLIC_MAX_RECORDING_SECONDS || String(MAX_RECORDING_SECONDS),
    10
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded text-xs font-medium">
              {role}
            </span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
              {interviewType}
            </span>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Interview Question
          </h2>
          <p className="text-lg text-gray-800 font-medium leading-relaxed">{question}</p>
        </div>

        {/* Mock Mode Banner */}
        {mockMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-600 font-semibold text-sm">Mock Mode</span>
              <span className="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
                Video Disabled
              </span>
            </div>
            <p className="text-sm text-amber-700">
              A realistic sample answer will be generated and evaluated automatically. Click the button below to start.
            </p>
          </div>
        )}

        {/* Video Recorder (hidden in mock mode) */}
        {!mockMode && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <VideoRecorder
              maxDuration={maxDuration}
              onRecordingComplete={handleRecordingComplete}
            />
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {submitError}
          </div>
        )}

        {/* Submit Button */}
        {(mockMode || recordedBlob) && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mockMode ? 'Processing...' : 'Uploading...'}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {mockMode ? 'Start Mock Interview' : 'Submit Answer'}
              </>
            )}
          </button>
        )}
      </div>
    </main>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <InterviewContent />
    </Suspense>
  );
}
