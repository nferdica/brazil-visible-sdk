import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CacheOptions {
  cacheDir?: string;
  ttlMs?: number;
}

export interface CacheEntry {
  path: string;
  createdAt: number;
  sizeBytes: number;
}

const DEFAULT_CACHE_DIR = join(homedir(), ".brazil-visible", "cache");
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class FileCache {
  private readonly cacheDir: string;
  private readonly ttlMs: number;

  constructor(options?: CacheOptions) {
    this.cacheDir = options?.cacheDir ?? DEFAULT_CACHE_DIR;
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  }

  /** Retrieve a cached file path by key, or null if expired/missing. */
  async get(key: string): Promise<string | null> {
    const metaPath = this.metaPath(key);

    if (!existsSync(metaPath)) {
      return null;
    }

    try {
      const meta = JSON.parse(await readFile(metaPath, "utf-8")) as CacheEntry;

      if (Date.now() - meta.createdAt > this.ttlMs) {
        await this.delete(key);
        return null;
      }

      if (!existsSync(meta.path)) {
        await this.delete(key);
        return null;
      }

      return meta.path;
    } catch {
      return null;
    }
  }

  /** Store a file or directory in the cache under the given key. */
  async put(key: string, filePath: string): Promise<string> {
    const entryPath = this.entryPath(key);
    const metaPath = this.metaPath(key);

    await mkdir(this.keyDir(key), { recursive: true });

    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      // For directories, store metadata pointing to the original path
      const meta: CacheEntry = {
        path: filePath,
        createdAt: Date.now(),
        sizeBytes: 0,
      };
      await writeFile(metaPath, JSON.stringify(meta), "utf-8");
      return filePath;
    }

    const { copyFile } = await import("node:fs/promises");

    if (filePath !== entryPath) {
      await copyFile(filePath, entryPath);
    }

    const meta: CacheEntry = {
      path: entryPath,
      createdAt: Date.now(),
      sizeBytes: fileStat.size,
    };

    await writeFile(metaPath, JSON.stringify(meta), "utf-8");

    return entryPath;
  }

  /** Check whether a valid (non-expired) cache entry exists for the given key. */
  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  /** Delete a specific cache entry by key. */
  async delete(key: string): Promise<void> {
    const dir = this.keyDir(key);
    if (existsSync(dir)) {
      await rm(dir, { recursive: true });
    }
  }

  /** Clear all cached entries by removing the entire cache directory. */
  async clear(): Promise<void> {
    if (existsSync(this.cacheDir)) {
      await rm(this.cacheDir, { recursive: true });
    }
  }

  /** Return the absolute path to the cache directory. */
  getCacheDir(): string {
    return this.cacheDir;
  }

  private keyDir(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
    return join(this.cacheDir, safeKey);
  }

  private entryPath(key: string): string {
    return join(this.keyDir(key), "data");
  }

  private metaPath(key: string): string {
    return join(this.keyDir(key), "meta.json");
  }
}

let defaultCache: FileCache | undefined;

export function getDefaultCache(): FileCache {
  if (!defaultCache) {
    defaultCache = new FileCache();
  }
  return defaultCache;
}

export function resetDefaultCache(): void {
  defaultCache = undefined;
}
