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
