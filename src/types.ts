export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | undefined>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface BVClientConfig {
  baseHeaders?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
}
