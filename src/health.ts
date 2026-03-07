import type { BVClient } from "./client";
import { getDefaultClient } from "./client";

export interface SourceHealth {
  status: "up" | "down" | "degraded" | "unknown";
  last_check: string;
  response_time_ms?: number;
  error?: string;
}

export interface HealthData {
  last_updated: string;
  sources: Record<string, SourceHealth>;
}

export interface HealthOptions {
  source?: string;
  client?: BVClient;
}

export async function getHealthStatus(options?: HealthOptions): Promise<HealthData | SourceHealth> {
  const client = options?.client ?? getDefaultClient();
  const data = await client.get<HealthData>("https://brazilvisible.org/health.json");

  if (options?.source) {
    return (
      data.sources[options.source] ?? {
        status: "unknown",
        last_check: data.last_updated,
        error: `Source '${options.source}' not found in health check`,
      }
    );
  }

  return data;
}

export const health = {
  status: getHealthStatus,
};
