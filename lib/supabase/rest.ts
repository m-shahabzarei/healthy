import type { SupabaseConfig } from "./types";

export class SupabaseAdapterError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status = 500, code?: string, details?: unknown) {
    super(message);
    this.name = "SupabaseAdapterError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  accessToken?: string;
  json?: boolean;
};

function cleanBase(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) ||
    (typeof FormData !== "undefined" && value instanceof FormData) ||
    (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams)
  );
}

/** Small fetch-based client; keeping it dependency-free makes the adapter opt-in. */
export class SupabaseRestClient {
  readonly url: string;
  readonly anonKey: string;
  private readonly doFetch: typeof fetch;

  constructor(config: SupabaseConfig) {
    if (!config.url?.trim()) throw new SupabaseAdapterError("Supabase URL is required.", 400, "CONFIG_MISSING");
    if (!config.anonKey?.trim()) throw new SupabaseAdapterError("Supabase anon key is required.", 400, "CONFIG_MISSING");
    this.url = cleanBase(config.url);
    this.anonKey = config.anonKey.trim();
    this.doFetch = config.fetch || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : (() => {
      throw new SupabaseAdapterError("This runtime does not provide fetch.", 500, "FETCH_UNAVAILABLE");
    }) as typeof fetch);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const headers = new Headers(options.headers);
    headers.set("apikey", this.anonKey);
    // Supabase's newer `sb_publishable_...` keys belong only in `apikey`.
    // Sending them as Bearer tokens makes the gateway parse them as JWTs and
    // reject the request. Legacy anon keys are JWTs and remain valid Bearer
    // fallbacks until the project migrates to publishable keys.
    if (options.accessToken) {
      headers.set("Authorization", `Bearer ${options.accessToken}`);
    } else if (this.anonKey.startsWith("eyJ")) {
      headers.set("Authorization", `Bearer ${this.anonKey}`);
    } else {
      headers.delete("Authorization");
    }
    headers.set("Accept", "application/json");

    let body: BodyInit | undefined;
    if (options.body !== undefined && options.body !== null) {
      if (isFormData(options.body) || isBodyInit(options.body)) {
        body = options.body as BodyInit;
      } else {
        body = JSON.stringify(options.body);
        headers.set("Content-Type", "application/json");
      }
    }
    if (options.json !== false && body && typeof body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await this.doFetch(`${this.url}${normalizedPath}`, {
      ...options,
      headers,
      body,
    });
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    if (!response.ok) {
      const record = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
      const message = String(record.message || record.error_description || record.error || text || response.statusText || "Supabase request failed");
      throw new SupabaseAdapterError(message, response.status, typeof record.code === "string" ? record.code : undefined, payload);
    }
    return payload as T;
  }

  auth<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(`/auth/v1${path.startsWith("/") ? path : `/${path}`}`, options);
  }

  data<T = unknown>(tableOrPath: string, options: RequestOptions = {}): Promise<T> {
    const path = tableOrPath.startsWith("/") ? tableOrPath : `/rest/v1/${tableOrPath}`;
    return this.request<T>(path, options);
  }

  rpc<T = unknown>(name: string, body: Record<string, unknown>, options: RequestOptions = {}): Promise<T> {
    return this.data<T>(`/rest/v1/rpc/${encodeURIComponent(name)}`, { ...options, method: "POST", body });
  }

  storage<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(`/storage/v1${path.startsWith("/") ? path : `/${path}`}`, options);
  }
}
