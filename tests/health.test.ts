import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resetDefaultClient } from "../src/client";
import { BVValidationError } from "../src/errors";
import { health } from "../src/health";

const mockHealthData = {
  updatedAt: "2024-03-01T12:00:00Z",
  results: {
    "https://servicodados.ibge.gov.br/api/v3/agregados": {
      status: "online",
      code: 200,
      slugs: ["ibge-agregados", "pnad-continua"],
      checkedAt: "2024-03-01T11:55:00Z",
    },
    "https://api.portaldatransparencia.gov.br/swagger-ui/index.html": {
      status: "offline",
      code: 503,
      slugs: ["portal-transparencia", "ceis"],
      checkedAt: "2024-03-01T11:56:00Z",
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
    expect(data).toHaveProperty("updatedAt");
    if ("results" in data) {
      expect(data.results["https://servicodados.ibge.gov.br/api/v3/agregados"].status).toBe(
        "online",
      );
    } else {
      expect.fail("Expected full HealthData");
    }
  });

  it("should return a specific source's health data when requested by slug", async () => {
    const data = await health.status({ source: "ceis" });
    expect(data).toMatchObject({
      endpoint: "https://api.portaldatransparencia.gov.br/swagger-ui/index.html",
      status: "offline",
      code: 503,
      checkedAt: "2024-03-01T11:56:00Z",
    });
  });

  it("should return a specific source's health data when requested by endpoint", async () => {
    const data = await health.status({
      source: "https://servicodados.ibge.gov.br/api/v3/agregados",
    });

    if ("endpoint" in data) {
      expect(data.endpoint).toBe("https://servicodados.ibge.gov.br/api/v3/agregados");
      expect(data.slugs).toContain("ibge-agregados");
    } else {
      expect.fail("Expected SourceHealth");
    }
  });

  it("should return unknown status for a non-existent source", async () => {
    const data = await health.status({ source: "fake-source" });
    expect(data).toMatchObject({
      endpoint: "fake-source",
      status: "unknown",
      code: -1,
      checkedAt: "2024-03-01T12:00:00Z",
    });
  });

  it("throws BVValidationError when the endpoint payload is incompatible", async () => {
    server.use(
      http.get("https://brazilvisible.org/health.json", () => {
        return HttpResponse.json({
          last_updated: "2024-03-01T12:00:00Z",
          sources: {},
        });
      }),
    );

    await expect(health.status()).rejects.toThrow(BVValidationError);
  });
});
