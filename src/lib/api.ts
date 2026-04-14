export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getApiBase() {
  // For local Vite dev you can point to a deployed Pages URL, e.g.
  // VITE_API_BASE=https://<your-project>.pages.dev
  // If not set, relative paths hit the same origin (works on Pages, or via `wrangler pages dev`).
  return (import.meta as any).env?.VITE_API_BASE?.replace(/\/$/, "") || "";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${getApiBase()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";
  if (text && (contentType.includes("text/html") || text.trimStart().startsWith("<!doctype") || text.trimStart().startsWith("<html"))) {
    throw new ApiError(
      "API is not reachable. If running locally, set VITE_API_BASE to your deployed Pages URL or run the app via Cloudflare Pages dev (Wrangler).",
      res.status || 0
    );
  }

  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }

  return data as T;
}

