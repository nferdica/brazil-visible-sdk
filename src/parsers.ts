import { createReadStream } from "node:fs";
import { parse } from "csv-parse";

export interface CsvParseOptions {
  delimiter?: string;
  encoding?: BufferEncoding;
  columns?: boolean | string[];
  skipLines?: number;
  quote?: string;
  skipEmptyLines?: boolean;
  ltrim?: boolean;
  rtrim?: boolean;
}

const DEFAULT_CSV_OPTIONS: CsvParseOptions = {
  delimiter: ";",
  encoding: "latin1",
  columns: true,
  skipEmptyLines: true,
  ltrim: true,
  rtrim: true,
};

export async function parseCsvFile<T extends Record<string, string>>(
  filePath: string,
  options?: CsvParseOptions,
): Promise<T[]> {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };

  const records: T[] = [];

  const parser = createReadStream(filePath, { encoding: opts.encoding ?? "latin1" }).pipe(
    parse({
      delimiter: opts.delimiter,
      columns: opts.columns,
      from_line: opts.skipLines ? opts.skipLines + 1 : undefined,
      quote: opts.quote ?? '"',
      skip_empty_lines: opts.skipEmptyLines,
      ltrim: opts.ltrim,
      rtrim: opts.rtrim,
      relax_column_count: true,
    }),
  );

  for await (const record of parser) {
    records.push(record as T);
  }

  return records;
}

export async function parseCsvString<T extends Record<string, string>>(
  content: string,
  options?: CsvParseOptions,
): Promise<T[]> {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };

  const { parse: parseSync } = await import("csv-parse/sync");

  return parseSync(content, {
    delimiter: opts.delimiter,
    columns: opts.columns,
    from_line: opts.skipLines ? opts.skipLines + 1 : undefined,
    quote: opts.quote ?? '"',
    skip_empty_lines: opts.skipEmptyLines,
    ltrim: opts.ltrim,
    rtrim: opts.rtrim,
    relax_column_count: true,
  }) as unknown as T[];
}
