/**
 * Helper para adaptar chamadas de API do Vite/React para Next.js
 */

// Substituir import.meta.env por process.env
export function getEnvVar(key: string): string {
  if (typeof window !== 'undefined') {
    // Client-side
    return (window as any).__ENV__?.[key] || '';
  }
  // Server-side
  return process.env[key] || '';
}

// Helper para fazer chamadas de API que antes iam para Edge Functions
export async function callApi<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    token?: string;
  } = {}
): Promise<T> {
  const { method = 'GET', body, token } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// Helper para substituir supabase.functions.invoke
export async function invokeFunction<T = any>(
  functionName: string,
  body?: any,
  token?: string
): Promise<T> {
  return callApi<T>(`/${functionName}`, {
    method: 'POST',
    body,
    token,
  });
}

