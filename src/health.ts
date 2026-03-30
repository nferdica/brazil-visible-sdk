import type { BVClient } from "./client";
import { getDefaultClient } from "./client";
import { BVValidationError } from "./errors";

export type HealthStatus = "online" | "offline" | "ftp" | (string & {});

export interface HealthResult {
  status: HealthStatus;
  code: number;
  slugs: string[];
  checkedAt: string;
}

export interface SourceHealth extends HealthResult {
  endpoint: string;
  error?: string;
}

export interface HealthData {
  updatedAt: string;
  results: Record<string, HealthResult>;
}

export interface HealthOptions {
  source?: string;
  client?: BVClient;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateHealthResult(endpoint: string, value: unknown): HealthResult {
  if (!isRecord(value)) {
    throw new BVValidationError(`results.${endpoint}`, "must be an object", "health");
  }

  const { status, code, slugs, checkedAt } = value;

  if (typeof status !== "string") {
    throw new BVValidationError(`results.${endpoint}.status`, "must be a string", "health");
  }

  if (typeof code !== "number") {
    throw new BVValidationError(`results.${endpoint}.code`, "must be a number", "health");
  }

  if (!Array.isArray(slugs) || slugs.some((slug) => typeof slug !== "string")) {
    throw new BVValidationError(
      `results.${endpoint}.slugs`,
      "must be an array of strings",
      "health",
    );
  }

  if (typeof checkedAt !== "string") {
    throw new BVValidationError(`results.${endpoint}.checkedAt`, "must be a string", "health");
  }

  return { status, code, slugs, checkedAt };
}

function validateHealthData(value: unknown): HealthData {
  if (!isRecord(value)) {
    throw new BVValidationError("health.json", "must be an object", "health");
  }

  const { updatedAt, results } = value;

  if (typeof updatedAt !== "string") {
    throw new BVValidationError("updatedAt", "must be a string", "health");
  }

  if (!isRecord(results)) {
    throw new BVValidationError("results", "must be an object keyed by endpoint", "health");
  }

  return {
    updatedAt,
    results: Object.fromEntries(
      Object.entries(results).map(([endpoint, result]) => [
        endpoint,
        validateHealthResult(endpoint, result),
      ]),
    ),
  };
}

function getSourceHealth(data: HealthData, source: string): SourceHealth {
  const exactMatch = data.results[source];
  if (exactMatch) {
    return { endpoint: source, ...exactMatch };
  }

  for (const [endpoint, result] of Object.entries(data.results)) {
    if (result.slugs.includes(source)) {
      return { endpoint, ...result };
    }
  }

  return {
    endpoint: source,
    status: "unknown",
    code: -1,
    slugs: [],
    checkedAt: data.updatedAt,
    error: `Source '${source}' not found in health check`,
  };
}

export async function getHealthStatus(options?: HealthOptions): Promise<HealthData | SourceHealth> {
  const client = options?.client ?? getDefaultClient();
  const response = await client.get<unknown>("https://brazilvisible.org/health.json");
  const data = validateHealthData(response);

  if (options?.source) {
    return getSourceHealth(data, options.source);
  }

  return data;
}

export const health = {
  status: getHealthStatus,
};
