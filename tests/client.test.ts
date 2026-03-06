import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../src/client";
import { BVHttpError, BVTimeoutError } from "../src/errors";
import { server } from "./helpers/setup";

const TEST_URL = "https://api.test.gov.br";

describe("BVClient", () => {
  describe("get", () => {
    it("fetches JSON and returns parsed data", async () => {
      server.use(
        http.get(`${TEST_URL}/data`, () => {
          return HttpResponse.json([{ id: 1, nome: "test" }]);
        }),
      );

      const client = new BVClient();
      const result = await client.get<{ id: number; nome: string }[]>(`${TEST_URL}/data`);
      expect(result).toEqual([{ id: 1, nome: "test" }]);
    });

    it("appends query params to URL", async () => {
      server.use(
        http.get(`${TEST_URL}/data`, ({ request }) => {
          const url = new URL(request.url);
          return HttpResponse.json({ formato: url.searchParams.get("formato") });
        }),
      );

      const client = new BVClient();
      const result = await client.get<{ formato: string }>(`${TEST_URL}/data`, {
        params: { formato: "json" },
      });
      expect(result).toEqual({ formato: "json" });
    });

    it("sends default headers", async () => {
      server.use(
        http.get(`${TEST_URL}/data`, ({ request }) => {
          return HttpResponse.json({
            userAgent: request.headers.get("User-Agent"),
            accept: request.headers.get("Accept"),
          });
        }),
      );

      const client = new BVClient();
      const result = await client.get<{ userAgent: string; accept: string }>(`${TEST_URL}/data`);
      expect(result.userAgent).toContain("BrazilVisibleSDK");
      expect(result.accept).toContain("application/json");
    });

    it("throws BVHttpError on 4xx/5xx", async () => {
      server.use(
        http.get(`${TEST_URL}/data`, () => {
          return new HttpResponse("Not Found", { status: 404 });
        }),
      );

      const client = new BVClient();
      await expect(client.get(`${TEST_URL}/data`)).rejects.toThrow(BVHttpError);
      await expect(client.get(`${TEST_URL}/data`)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws BVTimeoutError when request exceeds timeout", async () => {
      server.use(
        http.get(`${TEST_URL}/data`, async () => {
          await new Promise((r) => setTimeout(r, 5000));
          return HttpResponse.json({});
        }),
      );

      const client = new BVClient({ timeout: 50, maxRetries: 0 });
      await expect(client.get(`${TEST_URL}/data`)).rejects.toThrow(BVTimeoutError);
    });

    it("retries on 5xx errors", async () => {
      let attempt = 0;
      server.use(
        http.get(`${TEST_URL}/data`, () => {
          attempt++;
          if (attempt < 3) {
            return new HttpResponse("Server Error", { status: 500 });
          }
          return HttpResponse.json({ ok: true });
        }),
      );

      const client = new BVClient({ maxRetries: 3, retryDelay: 10 });
      const result = await client.get<{ ok: boolean }>(`${TEST_URL}/data`);
      expect(result).toEqual({ ok: true });
      expect(attempt).toBe(3);
    });

    it("does not retry on 4xx errors", async () => {
      let attempt = 0;
      server.use(
        http.get(`${TEST_URL}/data`, () => {
          attempt++;
          return new HttpResponse("Bad Request", { status: 400 });
        }),
      );

      const client = new BVClient({ maxRetries: 3, retryDelay: 10 });
      await expect(client.get(`${TEST_URL}/data`)).rejects.toThrow(BVHttpError);
      expect(attempt).toBe(1);
    });
  });
});
