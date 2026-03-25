import type {
  CreateInterviewResponse,
  InterviewSession,
} from '../../../shared/src/types/interview.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface CreateInterviewData {
  role: string;
  interviewType: string;
  question?: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function createInterview(
  videoBlob: Blob,
  data: CreateInterviewData,
  token?: string | null
): Promise<CreateInterviewResponse> {
  const formData = new FormData();
  formData.append('video', videoBlob, 'interview.webm');
  formData.append('role', data.role);
  formData.append('interviewType', data.interviewType);
  if (data.question) {
    formData.append('question', data.question);
  }

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/interview`, {
    method: 'POST',
    body: formData,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create interview' }));
    throw new ApiError(response.status, error.message || 'Failed to create interview');
  }

  return response.json();
}

export async function getAppConfig(): Promise<{ mockMode: boolean }> {
  const response = await fetch(`${API_URL}/api/config`);
  if (!response.ok) {
    return { mockMode: false };
  }
  return response.json();
}

export async function createMockInterview(
  data: CreateInterviewData,
  token?: string | null
): Promise<CreateInterviewResponse> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/interview`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create interview' }));
    throw new ApiError(response.status, error.message || 'Failed to create interview');
  }

  return response.json();
}

export async function getInterviewStatus(
  sessionId: string,
  token?: string | null
): Promise<InterviewSession> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/interview/${sessionId}`, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch interview' }));
    throw new ApiError(response.status, error.message || 'Failed to fetch interview');
  }

  return response.json();
}
