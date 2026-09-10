const API_BASE = '/api/v1';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )soc_csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function parseJsonSafely(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export const apiClient = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    const body = await parseJsonSafely(res);
    if (!res.ok) {
      throw new ApiError(res.status, body.message ?? 'Login failed');
    }
    return body;
  },

  async me(accessToken: string): Promise<AuthenticatedUser> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });
    const body = await parseJsonSafely(res);
    if (!res.ok) {
      throw new ApiError(res.status, body.message ?? 'Failed to load profile');
    }
    return body;
  },

  async refresh(): Promise<LoginResponse> {
    const csrfToken = getCsrfToken();
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
    });
    const body = await parseJsonSafely(res);
    if (!res.ok) {
      throw new ApiError(res.status, body.message ?? 'Session refresh failed');
    }
    return body;
  },

  async logout(): Promise<void> {
    const csrfToken = getCsrfToken();
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
    });
  },
};

export { ApiError };
