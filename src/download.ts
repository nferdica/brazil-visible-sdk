import { createWriteStream, existsSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { BVError, BVHttpError } from "./errors";

export interface DownloadOptions {
  destDir: string;
  filename?: string;
  timeout?: number;
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
  resume?: boolean;
}

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number | null;
  percent: number | null;
}

const DEFAULT_TIMEOUT = 300000; // 5 minutes for large files

/** Download a file from a URL to a local directory with progress and resume support. */
export async function download(url: string, options: DownloadOptions): Promise<string> {
  await mkdir(options.destDir, { recursive: true });

  const filename = options.filename ?? urlToFilename(url);
  const destPath = join(options.destDir, filename);

  const headers: Record<string, string> = {
    "User-Agent": "BrazilVisible/0.1 (https://brazilvisible.org)",
  };

  let startByte = 0;

  if (options.resume && existsSync(destPath)) {
    const fileStat = await stat(destPath);
    startByte = fileStat.size;
    headers.Range = `bytes=${startByte}-`;
  }

  const controller = new AbortController();
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal ?? controller.signal;

  try {
    const response = await fetch(url, { headers, signal });

    clearTimeout(timeoutId);

    if (response.status === 416) {
      // Range not satisfiable — file is already complete
      return destPath;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new BVHttpError(response.status, body, "download");
    }

    if (!response.body) {
      throw new BVError("Response has no body", "download");
    }

    const totalBytes = response.headers.get("content-length")
      ? Number(response.headers.get("content-length")) + startByte
      : null;

    let bytesDownloaded = startByte;

    const flags = startByte > 0 && response.status === 206 ? "a" : "w";
    const fileStream = createWriteStream(destPath, { flags });

    const reader = response.body.getReader();

    const nodeStream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        bytesDownloaded += value.byteLength;
        options.onProgress?.({
          bytesDownloaded,
          totalBytes,
          percent: totalBytes ? Math.round((bytesDownloaded / totalBytes) * 100) : null,
        });
        controller.enqueue(value);
      },
    });

    // @ts-expect-error -- Node 20+ supports ReadableStream in pipeline via web-to-node adaptation
    await pipeline(nodeStream, fileStream);

    return destPath;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof BVHttpError) throw error;
    if (error instanceof BVError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new BVError(`Download timed out after ${timeoutMs}ms: ${url}`, "download");
    }

    throw new BVError(
      `Download failed for ${url}: ${error instanceof Error ? error.message : String(error)}`,
      "download",
    );
  }
}

/** Extract a ZIP archive to a destination directory using the system unzip command. */
export async function extractZip(zipPath: string, destDir: string): Promise<string[]> {
  // Use system unzip command (available on Linux/macOS)
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  await mkdir(destDir, { recursive: true });

  try {
    await execFileAsync("unzip", ["-o", zipPath, "-d", destDir]);
  } catch {
    throw new BVError(
      "Failed to extract ZIP. Ensure 'unzip' is installed on your system.",
      "download",
    );
  }

  return listFilesRecursive(destDir);
}

/** Decompress a gzip file to a destination path. */
export async function extractGzip(gzPath: string, destPath: string): Promise<string> {
  const { createReadStream } = await import("node:fs");

  await mkdir(dirname(destPath), { recursive: true });

  const source = createReadStream(gzPath);
  const gunzip = createGunzip();
  const dest = createWriteStream(destPath);

  await pipeline(source, gunzip, dest);

  return destPath;
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const { readdir, stat: statAsync } = await import("node:fs/promises");
  const entries = await readdir(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const s = await statAsync(fullPath);
    if (s.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function urlToFilename(url: string): string {
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "download";
}
