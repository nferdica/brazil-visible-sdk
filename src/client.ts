import { BVHttpError, BVTimeoutError } from "./errors";
import type { RequestOptions } from "./types";

export interface BVClientOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  baseHeaders?: Record<string, string>;
}

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent": "BrazilVisible/0.1 (https://brazilvisible.org)",
  Accept: "application/json, text/csv, */*",
};

function isRetryable(status: number): boolean {
  return status >= 500;
}

export class BVClient {
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly headers: Record<string, string>;

  constructor(options?: BVClientOptions) {
    this.timeout = options?.timeout ?? 30000;
    this.maxRetries = options?.maxRetries ?? 3;
    this.retryDelay = options?.retryDelay ?? 1000;
    this.headers = { ...DEFAULT_HEADERS, ...options?.baseHeaders };
  }

  /** Perform an HTTP GET request with automatic retry and timeout handling. */
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    const fullUrl = this.buildUrl(url, options?.params);
    const headers = { ...this.headers, ...options?.headers };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.retryDelay * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(fullUrl, {
          method: "GET",
          headers,
          signal: options?.signal ?? controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const body = await response.text();
          const error = new BVHttpError(response.status, body, "client");

          if (isRetryable(response.status) && attempt < this.maxRetries) {
            lastError = error;
            continue;
          }

          throw error;
        }

        return (await response.json()) as T;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof BVHttpError) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw new BVTimeoutError(this.timeout, "client");
        }

        if (attempt < this.maxRetries) {
          lastError = error as Error;
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new Error("Unexpected retry exhaustion");
  }

  private buildUrl(base: string, params?: Record<string, string | number | undefined>): string {
    if (!params) return base;

    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }
}

let defaultClient: BVClient | undefined;

export function getDefaultClient(): BVClient {
  if (!defaultClient) {
    defaultClient = new BVClient();
  }
  return defaultClient;
}

export function resetDefaultClient(): void {
  defaultClient = undefined;
}
