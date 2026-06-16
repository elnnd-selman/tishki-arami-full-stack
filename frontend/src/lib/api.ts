import axios, { AxiosError, type AxiosInstance } from 'axios';

const ACCESS_TOKEN_KEY = 'ta_access_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}
export function setAccessToken(token: string | null) {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // send the httpOnly refresh cookie
});

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401 caused by an expired token, transparently refresh once and retry.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
    const token = res.data?.data?.accessToken ?? null;
    setAccessToken(token);
    return token;
  } catch {
    setAccessToken(null);
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthRoute &&
      (code === 'TOKEN_EXPIRED' || code === 'NO_TOKEN' || code === 'TOKEN_INVALID')
    ) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        return api(original);
      }
      // Refresh failed - bounce to login.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Normalizes an axios error into a readable message.
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message ?? err.message;
  }
  return err instanceof Error ? err.message : 'Unexpected error';
}
