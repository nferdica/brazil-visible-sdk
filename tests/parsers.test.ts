import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseCsvFile, parseCsvString } from "../src/parsers";

const TEST_DIR = join(tmpdir(), "bv-parsers-test");

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("parseCsvFile", () => {
  it("parses semicolon-delimited CSV with headers", async () => {
    const filePath = join(TEST_DIR, "test.csv");
    await writeFile(
      filePath,
      '"NM_CANDIDATO";"NR_CANDIDATO";"SG_UF"\n"LULA";"13";"BR"\n"BOLSONARO";"22";"BR"\n',
      "utf-8",
    );

    const result = await parseCsvFile(filePath);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      NM_CANDIDATO: "LULA",
      NR_CANDIDATO: "13",
      SG_UF: "BR",
    });
    expect(result[1]).toEqual({
      NM_CANDIDATO: "BOLSONARO",
      NR_CANDIDATO: "22",
      SG_UF: "BR",
    });
  });

  it("parses comma-delimited CSV", async () => {
    const filePath = join(TEST_DIR, "comma.csv");
    await writeFile(filePath, "name,age\nAlice,30\nBob,25\n", "utf-8");

    const result = await parseCsvFile(filePath, { delimiter: "," });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "Alice", age: "30" });
  });

  it("handles latin1 encoding", async () => {
    const filePath = join(TEST_DIR, "latin1.csv");
    const buf = Buffer.from('"NOME"\n"S\xE3o Paulo"\n"Cear\xE1"\n', "latin1");
    await writeFile(filePath, buf);

    const result = await parseCsvFile(filePath, { encoding: "latin1" });
    expect(result).toHaveLength(2);
    expect(result[0]?.NOME).toBe("São Paulo");
    expect(result[1]?.NOME).toBe("Ceará");
  });

  it("skips empty lines", async () => {
    const filePath = join(TEST_DIR, "empty.csv");
    await writeFile(filePath, "a;b\n1;2\n\n3;4\n", "utf-8");

    const result = await parseCsvFile(filePath);
    expect(result).toHaveLength(2);
  });

  it("trims whitespace", async () => {
    const filePath = join(TEST_DIR, "trim.csv");
    await writeFile(filePath, "name ; age\n Alice ; 30 \n", "utf-8");

    const result = await parseCsvFile(filePath);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "Alice", age: "30" });
  });
});

describe("parseCsvString", () => {
  it("parses CSV from string content", async () => {
    const csv = '"NOME";"VALOR"\n"PIB";"1000"\n"IDH";"0.765"\n';

    const result = await parseCsvString(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ NOME: "PIB", VALOR: "1000" });
    expect(result[1]).toEqual({ NOME: "IDH", VALOR: "0.765" });
  });

  it("respects custom delimiter", async () => {
    const csv = "name,value\ntest,123\n";

    const result = await parseCsvString(csv, { delimiter: "," });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "test", value: "123" });
  });
});
