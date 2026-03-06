export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | undefined>;
  timeout?: number;
  signal?: AbortSignal;
}
