import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileCache } from "../src/cache";

const TEST_CACHE_DIR = join(tmpdir(), "bv-cache-test");

let cache: FileCache;

beforeEach(async () => {
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  cache = new FileCache({ cacheDir: TEST_CACHE_DIR, ttlMs: 60000 });
});

afterEach(async () => {
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
});

describe("FileCache", () => {
  it("returns null for missing key", async () => {
    expect(await cache.get("nonexistent")).toBeNull();
  });

  it("stores and retrieves a file", async () => {
    const srcDir = join(TEST_CACHE_DIR, "_src");
    await mkdir(srcDir, { recursive: true });
    const srcFile = join(srcDir, "test.csv");
    await writeFile(srcFile, "a;b;c\n1;2;3\n", "utf-8");

    const stored = await cache.put("test-key", srcFile);
    expect(existsSync(stored)).toBe(true);

    const retrieved = await cache.get("test-key");
    expect(retrieved).toBe(stored);
  });

  it("has() returns true for cached key", async () => {
    const srcDir = join(TEST_CACHE_DIR, "_src");
    await mkdir(srcDir, { recursive: true });
    const srcFile = join(srcDir, "test.csv");
    await writeFile(srcFile, "data", "utf-8");

    await cache.put("has-key", srcFile);
    expect(await cache.has("has-key")).toBe(true);
    expect(await cache.has("missing")).toBe(false);
  });

  it("delete() removes cached entry", async () => {
    const srcDir = join(TEST_CACHE_DIR, "_src");
    await mkdir(srcDir, { recursive: true });
    const srcFile = join(srcDir, "test.csv");
    await writeFile(srcFile, "data", "utf-8");

    await cache.put("del-key", srcFile);
    expect(await cache.has("del-key")).toBe(true);

    await cache.delete("del-key");
    expect(await cache.has("del-key")).toBe(false);
  });

  it("clear() removes entire cache directory", async () => {
    const srcDir = join(TEST_CACHE_DIR, "_src");
    await mkdir(srcDir, { recursive: true });
    const srcFile = join(srcDir, "test.csv");
    await writeFile(srcFile, "data", "utf-8");

    await cache.put("key1", srcFile);
    await cache.put("key2", srcFile);

    await cache.clear();
    expect(existsSync(TEST_CACHE_DIR)).toBe(false);
  });

  it("returns null for expired entries", async () => {
    const expiredCache = new FileCache({ cacheDir: TEST_CACHE_DIR, ttlMs: 1 });

    const srcDir = join(TEST_CACHE_DIR, "_src");
    await mkdir(srcDir, { recursive: true });
    const srcFile = join(srcDir, "test.csv");
    await writeFile(srcFile, "data", "utf-8");

    await expiredCache.put("expired-key", srcFile);

    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 10));

    expect(await expiredCache.get("expired-key")).toBeNull();
  });

  it("getCacheDir() returns configured directory", () => {
    expect(cache.getCacheDir()).toBe(TEST_CACHE_DIR);
  });
});
