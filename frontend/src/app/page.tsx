'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, INTERVIEW_TYPES } from '../../../shared/src/constants';
import { useAuth } from '@/components/AuthProvider';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [role, setRole] = useState('');
  const [interviewType, setInterviewType] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!user) return null;

  const handleStart = () => {
    if (!role || !interviewType) return;
    router.push(`/interview?role=${encodeURIComponent(role)}&type=${encodeURIComponent(interviewType)}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
        {/* Sign Out */}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => signOut()}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 rounded-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">AI Mock Interview</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Practice your interview skills and get AI-powered feedback
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Role Select */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Select Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            >
              <option value="">Choose a role...</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Interview Type Select */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Interview Type
            </label>
            <select
              id="type"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            >
              <option value="">Choose interview type...</option>
              {INTERVIEW_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!role || !interviewType}
            className="w-full py-3 mt-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            Start Interview
          </button>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-gray-400 mt-6">
          You&apos;ll be asked a question and can record up to 90 seconds of video
        </p>
      </div>
    </main>
  );
}
