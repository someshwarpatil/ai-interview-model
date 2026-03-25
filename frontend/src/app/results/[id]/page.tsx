'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePolling } from '@/hooks/usePolling';
import { useAuth } from '@/components/AuthProvider';
import ProcessingStatus from '@/components/ProcessingStatus';
import ReportCard from '@/components/ReportCard';

interface ResultsPageProps {
  params: { id: string };
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const { id } = params;
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const { data, loading, error, retry } = usePolling(id, getIdToken);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            New Interview
          </button>
        </div>

        {/* Loading / Processing state */}
        {loading && !error && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <ProcessingStatus
              status={data?.status || 'processing'}
            />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <ProcessingStatus
              status="failed"
              error={error.message}
              onRetry={retry}
            />
          </div>
        )}

        {/* Failed processing */}
        {!loading && data?.status === 'failed' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <ProcessingStatus
              status="failed"
              error={data.error || 'Processing failed. Please try again.'}
              onRetry={() => router.push('/')}
            />
          </div>
        )}

        {/* Results */}
        {!loading && data?.status === 'completed' && (
          <div className="space-y-6">
            <ReportCard session={data} />

            {/* Action buttons */}
            <div className="flex justify-center gap-4 pt-4 pb-8">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Start New Interview
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
