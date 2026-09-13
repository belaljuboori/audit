import { ApiError } from './api-client';

const API_BASE = '/api/v1';

async function parseJsonSafely(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/** Bearer-token-authenticated JSON request helper for everything past login. */
export async function authorizedRequest<T>(
  accessToken: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = await parseJsonSafely(res);
  if (!res.ok) {
    throw new ApiError(res.status, body.message ?? `Request failed with status ${res.status}`);
  }
  return body as T;
}
