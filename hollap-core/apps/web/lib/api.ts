import { API_BASE_URL } from "./config";
import { clearTokens, getTokens, setTokens } from "./auth-storage";

type RequestInitExtended = RequestInit & {
  auth?: boolean;
};

async function parseError(response: Response) {
  try {
    const body = await response.json();
    return body.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

async function fetchApi<T>(
  path: string,
  init: RequestInitExtended = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  const shouldAuth = init.auth ?? true;

  const tokens = getTokens();
  if (shouldAuth && tokens?.accessToken) {
    headers.set("Authorization", `Bearer ${tokens.accessToken}`);
  }

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && shouldAuth && retry && tokens?.refreshToken) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (refreshResponse.ok) {
        const newTokens = (await refreshResponse.json()) as {
          accessToken: string;
          refreshToken: string;
        };
        setTokens(newTokens);
        return fetchApi<T>(path, init, false);
      }
      clearTokens();
    } catch {
      clearTokens();
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, auth = true) =>
    fetchApi<T>(path, { method: "GET", auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    fetchApi<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      auth,
    }),
  put: <T>(path: string, body?: unknown, auth = true) =>
    fetchApi<T>(path, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      auth,
    }),
  delete: <T>(path: string, auth = true) =>
    fetchApi<T>(path, { method: "DELETE", auth }),
};
