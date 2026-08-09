import { API_BASE_URL } from '@/constants/config';

/** Thrown for any non-2xx response, with a human-readable message
 * already extracted from FastAPI's error format. Screens can catch
 * this and show `error.message` directly -- no parsing in the UI. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// FastAPI sends errors two different shapes depending on where they
// come from: a plain string for our own `raise HTTPException(detail=...)`
// calls, or an array of {msg, loc, type} objects for automatic Pydantic
// validation errors (e.g. password too short). This normalizes both
// into one string so callers never have to care which one they got.
function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (first && typeof first === 'object' && 'msg' in first) {
        return String((first as { msg: unknown }).msg);
      }
    }
  }
  return fallback;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

/**
 * The one function that actually talks to the backend. Builds the full
 * URL from API_BASE_URL, sets JSON headers, attaches the Authorization
 * header when a token is passed, and turns any non-2xx response into a
 * thrown ApiError with a readable message -- so every caller can just
 * `await apiRequest(...)` inside a try/catch instead of manually
 * checking response.ok every time.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch() itself throws for network-level failures (server down,
    // no connection, wrong IP) -- these never reach the response.ok
    // check below, so they need their own readable message.
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, 'Something went wrong. Please try again.'), response.status);
  }

  return data as T;
}
