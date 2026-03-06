# Increment 1 — Core + BCB Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the SDK core infrastructure (errors, types, config, HTTP client, base class) and the first source module (BCB — Banco Central) with full test coverage using TDD.

**Architecture:** Thin wrapper over native `fetch` with retry/timeout. Abstract `Source` base class extended by each data source. BCB module wraps SGS and OLINDA APIs, normalizing dates and parsing string values to numbers. All tests use MSW to intercept fetch.

**Tech Stack:** TypeScript 5.5+, vitest, msw 2.x, tsup, biome

---

### Task 1: Install dependencies and configure tooling

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `biome.json`

**Step 1: Install all dependencies**

Run:
```bash
cd /home/nferdica/Projects/brazil-visible-sdk
npm install
```

**Step 2: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./tests/helpers/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/sources/index.ts"],
    },
  },
});
```

**Step 3: Create biome config**

Create `biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always"
    }
  }
}
```

**Step 4: Create empty test setup file**

Create `tests/helpers/setup.ts`:
```typescript
// MSW server setup — populated in Task 2
export {};
```

**Step 5: Verify tooling works**

Run:
```bash
npm run typecheck && npm run lint
```
Expected: PASS (no source files with errors yet)

**Step 6: Commit**

```bash
git add vitest.config.ts biome.json tests/helpers/setup.ts package-lock.json
git commit -m "chore: configure vitest, biome, and install dependencies"
```

---

### Task 2: Error hierarchy (`src/errors.ts`)

**Files:**
- Create: `src/errors.ts`
- Create: `tests/errors.test.ts`

**Step 1: Write the failing tests**

Create `tests/errors.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import {
  BVError,
  BVHttpError,
  BVTimeoutError,
  BVValidationError,
} from "../src/errors";

describe("BVError", () => {
  it("is an instance of Error", () => {
    const err = new BVError("test error", "bcb");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("test error");
    expect(err.source).toBe("bcb");
    expect(err.name).toBe("BVError");
  });
});

describe("BVHttpError", () => {
  it("carries status code and response body", () => {
    const err = new BVHttpError(404, "Not Found", "bcb");
    expect(err).toBeInstanceOf(BVError);
    expect(err.statusCode).toBe(404);
    expect(err.responseBody).toBe("Not Found");
    expect(err.source).toBe("bcb");
    expect(err.name).toBe("BVHttpError");
  });
});

describe("BVTimeoutError", () => {
  it("includes timeout duration", () => {
    const err = new BVTimeoutError(30000, "bcb");
    expect(err).toBeInstanceOf(BVError);
    expect(err.timeoutMs).toBe(30000);
    expect(err.message).toContain("30000");
    expect(err.name).toBe("BVTimeoutError");
  });
});

describe("BVValidationError", () => {
  it("includes field and constraint info", () => {
    const err = new BVValidationError("serie", "must be a positive integer", "bcb");
    expect(err).toBeInstanceOf(BVError);
    expect(err.field).toBe("serie");
    expect(err.constraint).toBe("must be a positive integer");
    expect(err.name).toBe("BVValidationError");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/errors.test.ts`
Expected: FAIL — cannot find module `../src/errors`

**Step 3: Write minimal implementation**

Create `src/errors.ts`:
```typescript
export class BVError extends Error {
  readonly source: string;

  constructor(message: string, source: string) {
    super(message);
    this.name = "BVError";
    this.source = source;
  }
}

export class BVHttpError extends BVError {
  readonly statusCode: number;
  readonly responseBody: string;

  constructor(statusCode: number, responseBody: string, source: string) {
    super(`HTTP ${statusCode}: ${responseBody}`, source);
    this.name = "BVHttpError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class BVTimeoutError extends BVError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, source: string) {
    super(`Request timed out after ${timeoutMs}ms`, source);
    this.name = "BVTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class BVValidationError extends BVError {
  readonly field: string;
  readonly constraint: string;

  constructor(field: string, constraint: string, source: string) {
    super(`Validation failed for "${field}": ${constraint}`, source);
    this.name = "BVValidationError";
    this.field = field;
    this.constraint = constraint;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/errors.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/errors.ts tests/errors.test.ts
git commit -m "feat: add error hierarchy (BVError, BVHttpError, BVTimeoutError, BVValidationError)"
```

---

### Task 3: Shared types (`src/types.ts`)

**Files:**
- Create: `src/types.ts`

**Step 1: Create types file**

Create `src/types.ts`:
```typescript
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
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared types (RequestOptions, BVClientConfig)"
```

---

### Task 4: Configuration module (`src/config.ts`)

**Files:**
- Create: `src/config.ts`
- Create: `tests/config.test.ts`

**Step 1: Write the failing tests**

Create `tests/config.test.ts`:
```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { configure, getConfig, resetConfig } from "../src/config";

describe("config", () => {
  afterEach(() => {
    resetConfig();
    vi.unstubAllEnvs();
  });

  it("returns defaults when not configured", () => {
    const config = getConfig();
    expect(config.timeout).toBe(30000);
    expect(config.maxRetries).toBe(3);
    expect(config.apiKeys).toEqual({});
  });

  it("merges user config with defaults", () => {
    configure({ timeout: 10000, apiKeys: { cgu: "abc123" } });
    const config = getConfig();
    expect(config.timeout).toBe(10000);
    expect(config.maxRetries).toBe(3);
    expect(config.apiKeys.cgu).toBe("abc123");
  });

  it("reads API keys from environment variables", () => {
    vi.stubEnv("BV_CGU_API_KEY", "env-key");
    const config = getConfig();
    expect(config.apiKeys.cgu).toBe("env-key");
  });

  it("prefers explicit config over env vars", () => {
    vi.stubEnv("BV_CGU_API_KEY", "env-key");
    configure({ apiKeys: { cgu: "explicit-key" } });
    const config = getConfig();
    expect(config.apiKeys.cgu).toBe("explicit-key");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL — cannot find module `../src/config`

**Step 3: Write minimal implementation**

Create `src/config.ts`:
```typescript
export interface BVConfig {
  timeout?: number;
  maxRetries?: number;
  apiKeys?: Record<string, string>;
}

export interface ResolvedConfig {
  timeout: number;
  maxRetries: number;
  apiKeys: Record<string, string>;
}

const ENV_KEY_MAP: Record<string, string> = {
  BV_CGU_API_KEY: "cgu",
  BV_GOV_BR_TOKEN: "govbr",
};

const DEFAULTS: ResolvedConfig = {
  timeout: 30000,
  maxRetries: 3,
  apiKeys: {},
};

let userConfig: BVConfig = {};

export function configure(config: BVConfig): void {
  userConfig = { ...userConfig, ...config };
}

export function getConfig(): ResolvedConfig {
  const envKeys: Record<string, string> = {};
  for (const [envVar, sourceName] of Object.entries(ENV_KEY_MAP)) {
    const value = process.env[envVar];
    if (value) {
      envKeys[sourceName] = value;
    }
  }

  return {
    timeout: userConfig.timeout ?? DEFAULTS.timeout,
    maxRetries: userConfig.maxRetries ?? DEFAULTS.maxRetries,
    apiKeys: { ...envKeys, ...userConfig.apiKeys },
  };
}

export function resetConfig(): void {
  userConfig = {};
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/config.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat: add configuration module with env var support"
```

---

### Task 5: HTTP client (`src/client.ts`)

**Files:**
- Create: `src/client.ts`
- Create: `tests/client.test.ts`
- Modify: `tests/helpers/setup.ts`

**Step 1: Set up MSW test server**

Update `tests/helpers/setup.ts`:
```typescript
import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";

export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Step 2: Write the failing tests**

Create `tests/client.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./helpers/setup";
import { BVClient } from "../src/client";
import { BVHttpError, BVTimeoutError } from "../src/errors";

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
      expect(result.userAgent).toContain("bracc-sdk");
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
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/client.test.ts`
Expected: FAIL — cannot find module `../src/client`

**Step 4: Write minimal implementation**

Create `src/client.ts`:
```typescript
import { BVHttpError, BVTimeoutError } from "./errors";
import type { RequestOptions } from "./types";

export interface BVClientOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  baseHeaders?: Record<string, string>;
}

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent": "bracc-sdk/0.1 (https://bracc.co)",
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

        if (error instanceof DOMException && error.name === "AbortError") {
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
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/client.test.ts`
Expected: PASS (7 tests)

**Step 6: Commit**

```bash
git add src/client.ts tests/client.test.ts tests/helpers/setup.ts
git commit -m "feat: add HTTP client with retry, timeout, and default headers"
```

---

### Task 6: Source base class (`src/sources/base.ts`)

**Files:**
- Create: `src/sources/base.ts`

**Step 1: Create base class**

Create `src/sources/base.ts`:
```typescript
import { type BVClient, getDefaultClient } from "../client";

export interface SourceConfig {
  client?: BVClient;
}

export abstract class Source {
  protected readonly client: BVClient;

  constructor(config?: SourceConfig) {
    this.client = config?.client ?? getDefaultClient();
  }

  abstract readonly name: string;
  abstract readonly baseUrl: string;
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/sources/base.ts
git commit -m "feat: add abstract Source base class"
```

---

### Task 7: BCB source module (`src/sources/bcb.ts`)

**Files:**
- Create: `src/sources/bcb.ts`
- Create: `tests/sources/bcb.test.ts`

**Step 1: Write the failing tests**

Create `tests/sources/bcb.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../helpers/setup";
import { BcbSource } from "../../src/sources/bcb";
import { BVClient } from "../../src/client";
import { BVValidationError } from "../../src/errors";

const client = new BVClient({ maxRetries: 0 });
const bcb = new BcbSource({ client });

describe("BcbSource", () => {
  it("has correct name and baseUrl", () => {
    expect(bcb.name).toBe("Banco Central do Brasil");
    expect(bcb.baseUrl).toBe("https://api.bcb.gov.br");
  });

  describe("sgs", () => {
    it("fetches a series and normalizes the response", async () => {
      server.use(
        http.get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("formato")).toBe("json");
          expect(url.searchParams.get("dataInicial")).toBe("01/01/2024");
          expect(url.searchParams.get("dataFinal")).toBe("31/01/2024");
          return HttpResponse.json([
            { data: "02/01/2024", valor: "0.043739" },
            { data: "03/01/2024", valor: "0.043739" },
          ]);
        }),
      );

      const result = await bcb.sgs({
        serie: 11,
        dataInicial: "2024-01-01",
        dataFinal: "2024-01-31",
      });

      expect(result).toEqual([
        { data: "2024-01-02", valor: 0.043739 },
        { data: "2024-01-03", valor: 0.043739 },
      ]);
    });

    it("fetches a series without date range", async () => {
      server.use(
        http.get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("formato")).toBe("json");
          expect(url.searchParams.has("dataInicial")).toBe(false);
          return HttpResponse.json([{ data: "01/01/2024", valor: "0.56" }]);
        }),
      );

      const result = await bcb.sgs({ serie: 433 });
      expect(result).toEqual([{ data: "2024-01-01", valor: 0.56 }]);
    });

    it("throws BVValidationError for invalid serie", async () => {
      await expect(bcb.sgs({ serie: -1 })).rejects.toThrow(BVValidationError);
      await expect(bcb.sgs({ serie: 0 })).rejects.toThrow(BVValidationError);
    });

    it("handles null valor gracefully", async () => {
      server.use(
        http.get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados", () => {
          return HttpResponse.json([{ data: "02/01/2024", valor: null }]);
        }),
      );

      const result = await bcb.sgs({ serie: 11 });
      expect(result).toEqual([{ data: "2024-01-02", valor: null }]);
    });
  });

  describe("expectativas", () => {
    it("fetches OLINDA market expectations", async () => {
      server.use(
        http.get(
          "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativaMercadoMensais",
          ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get("$format")).toBe("json");
            expect(url.searchParams.get("$top")).toBe("5");
            expect(url.searchParams.get("$filter")).toContain("IPCA");
            return HttpResponse.json({
              "@odata.context": "...",
              value: [
                {
                  Indicador: "IPCA",
                  Data: "2024-01-15",
                  DataReferencia: "01/2024",
                  Media: 0.49,
                  Mediana: 0.5,
                  DesvioPadrao: 0.08,
                  Minimo: 0.3,
                  Maximo: 0.68,
                  numeroRespondentes: 30,
                  baseCalculo: 1,
                },
              ],
            });
          },
        ),
      );

      const result = await bcb.expectativas({ indicador: "IPCA", top: 5 });
      expect(result).toHaveLength(1);
      expect(result[0]?.Indicador).toBe("IPCA");
      expect(result[0]?.Media).toBe(0.49);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/sources/bcb.test.ts`
Expected: FAIL — cannot find module `../../src/sources/bcb`

**Step 3: Write minimal implementation**

Create `src/sources/bcb.ts`:
```typescript
import { BVValidationError } from "../errors";
import { Source, type SourceConfig } from "./base";

export interface SgsParams {
  serie: number;
  dataInicial?: string;
  dataFinal?: string;
}

export interface SgsSerie {
  data: string;
  valor: number | null;
}

export interface ExpectativasParams {
  indicador: string;
  top?: number;
  skip?: number;
  filter?: string;
  orderBy?: string;
}

export interface ExpectativaMercado {
  Indicador: string;
  Data: string;
  DataReferencia: string;
  Media: number;
  Mediana: number;
  DesvioPadrao: number;
  Minimo: number;
  Maximo: number;
  numeroRespondentes: number;
  baseCalculo: number;
}

interface SgsRawEntry {
  data: string;
  valor: string | null;
}

interface OlindaResponse<T> {
  "@odata.context": string;
  value: T[];
}

function isoToBr(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function brToIso(br: string): string {
  const [day, month, year] = br.split("/");
  return `${year}-${month}-${day}`;
}

export class BcbSource extends Source {
  readonly name = "Banco Central do Brasil";
  readonly baseUrl = "https://api.bcb.gov.br";

  constructor(config?: SourceConfig) {
    super(config);
  }

  async sgs(params: SgsParams): Promise<SgsSerie[]> {
    if (!Number.isInteger(params.serie) || params.serie <= 0) {
      throw new BVValidationError("serie", "must be a positive integer", "bcb");
    }

    const queryParams: Record<string, string> = { formato: "json" };

    if (params.dataInicial) {
      queryParams.dataInicial = isoToBr(params.dataInicial);
    }
    if (params.dataFinal) {
      queryParams.dataFinal = isoToBr(params.dataFinal);
    }

    const raw = await this.client.get<SgsRawEntry[]>(
      `${this.baseUrl}/dados/serie/bcdata.sgs.${params.serie}/dados`,
      { params: queryParams },
    );

    return raw.map((entry) => ({
      data: brToIso(entry.data),
      valor: entry.valor !== null ? Number(entry.valor) : null,
    }));
  }

  async expectativas(params: ExpectativasParams): Promise<ExpectativaMercado[]> {
    const queryParams: Record<string, string> = { $format: "json" };

    if (params.top !== undefined) {
      queryParams.$top = String(params.top);
    }
    if (params.skip !== undefined) {
      queryParams.$skip = String(params.skip);
    }
    if (params.filter) {
      queryParams.$filter = params.filter;
    } else {
      queryParams.$filter = `Indicador eq '${params.indicador}'`;
    }
    if (params.orderBy) {
      queryParams.$orderby = params.orderBy;
    }

    const response = await this.client.get<OlindaResponse<ExpectativaMercado>>(
      "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativaMercadoMensais",
      { params: queryParams },
    );

    return response.value;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/sources/bcb.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/sources/bcb.ts tests/sources/bcb.test.ts
git commit -m "feat: add BCB source module (SGS series + OLINDA expectations)"
```

---

### Task 8: Public API surface (`src/index.ts`, `src/sources/index.ts`)

**Files:**
- Modify: `src/index.ts`
- Create: `src/sources/index.ts`

**Step 1: Create sources barrel export**

Create `src/sources/index.ts`:
```typescript
export { BcbSource } from "./bcb";
export type { SgsParams, SgsSerie, ExpectativasParams, ExpectativaMercado } from "./bcb";
```

**Step 2: Update main index.ts**

Replace `src/index.ts` with:
```typescript
export { configure, getConfig } from "./config";
export type { BVConfig } from "./config";
export { BVClient } from "./client";
export type { BVClientOptions } from "./client";
export { BVError, BVHttpError, BVTimeoutError, BVValidationError } from "./errors";
export { BcbSource } from "./sources/bcb";
export type { SgsParams, SgsSerie, ExpectativasParams, ExpectativaMercado } from "./sources/bcb";

import { BcbSource } from "./sources/bcb";

/** Pre-instantiated BCB source for convenience. */
export const bcb = new BcbSource();
```

**Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx biome check src/`
Expected: PASS

**Step 4: Commit**

```bash
git add src/index.ts src/sources/index.ts
git commit -m "feat: wire up public API surface with bcb convenience export"
```

---

### Task 9: Build and verify end-to-end

**Files:**
- No new files

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: PASS — all tests (errors, config, client, bcb)

**Step 2: Run lint and typecheck**

Run: `npx biome check src/ tests/ && npx tsc --noEmit`
Expected: PASS

**Step 3: Build the package**

Run: `npm run build`
Expected: `dist/` contains `index.js`, `index.cjs`, `index.d.ts`

**Step 4: Verify the build output**

Run: `node -e "const { bcb, configure } = require('./dist/index.cjs'); console.log(bcb.name);"`
Expected: prints `Banco Central do Brasil`

**Step 5: Commit**

```bash
git commit --allow-empty -m "chore: verify build and full test suite pass"
```

---

### Task 10: Final commit and PR

**Step 1: Run all checks one final time**

Run:
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
Expected: All PASS

**Step 2: Commit any remaining changes**

Stage and commit any auto-formatted or adjusted files.

**Step 3: Push and create PR**

```bash
git push origin develop
gh pr create --base main --head develop \
  --title "feat: core infrastructure + BCB source module" \
  --body "## Summary
- Error hierarchy (BVError, BVHttpError, BVTimeoutError, BVValidationError)
- HTTP client with retry, timeout, and default headers
- Configuration module with env var support
- Abstract Source base class
- BCB source (SGS series + OLINDA market expectations)
- Full test suite with MSW mocked fetch
- Build pipeline (tsup ESM + CJS + .d.ts)

## Test plan
- [x] All unit tests pass (vitest)
- [x] Type check passes (tsc --noEmit)
- [x] Lint passes (biome)
- [x] Build produces ESM + CJS outputs"
```
