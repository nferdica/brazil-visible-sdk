import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resetDefaultClient } from "../src/client";
import { health } from "../src/health";

const mockHealthData = {
  last_updated: "2024-03-01T12:00:00Z",
  sources: {
    "ibge-agregados": {
      status: "up",
      last_check: "2024-03-01T11:55:00Z",
      response_time_ms: 150,
    },
    "cgu-ceis": {
      status: "down",
      last_check: "2024-03-01T11:55:00Z",
      error: "Timeout",
    },
  },
};

const server = setupServer(
  http.get("https://brazilvisible.org/health.json", () => {
    return HttpResponse.json(mockHealthData);
  }),
);

describe("Health Check Integration", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    server.resetHandlers();
    resetDefaultClient();
  });

  it("should return the full health data when no source is specified", async () => {
    const data = await health.status();
    expect(data).toHaveProperty("last_updated");
    if ("sources" in data) {
      expect(data.sources["ibge-agregados"].status).toBe("up");
    } else {
      expect.fail("Expected full HealthData");
    }
  });

  it("should return a specific source's health data when requested", async () => {
    const data = await health.status({ source: "cgu-ceis" });
    expect(data).toHaveProperty("status", "down");
    if ("error" in data) {
      expect(data.error).toBe("Timeout");
    } else {
      expect.fail("Expected SourceHealth with error");
    }
  });

  it("should return unknown status for a non-existent source", async () => {
    const data = await health.status({ source: "fake-source" });
    expect(data).toHaveProperty("status", "unknown");
  });
});
