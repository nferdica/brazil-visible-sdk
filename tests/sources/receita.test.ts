import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileCache } from "../../src/cache";
import { BVValidationError } from "../../src/errors";
import { ReceitaSource } from "../../src/sources/receita";

// Mock download and extractZip to avoid real network calls
vi.mock("../../src/download", () => ({
  download: vi.fn(),
  extractZip: vi.fn(),
}));

const TEST_CACHE_DIR = join(tmpdir(), "bv-receita-test");

let receita: ReceitaSource;
let cache: FileCache;

beforeEach(async () => {
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  cache = new FileCache({ cacheDir: TEST_CACHE_DIR, ttlMs: 60000 });
  receita = new ReceitaSource({ cache });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
});

// Receita CSVs have NO header row — semicolon-delimited, latin1 encoding
function makeReceitaCsv(rows: string[][]): string {
  return rows.map((row) => row.map((v) => `"${v}"`).join(";")).join("\n");
}

describe("ReceitaSource", () => {
  it("has correct name and baseUrl", () => {
    expect(receita.name).toBe("Receita Federal");
    expect(receita.baseUrl).toBe("https://dadosabertos.rfb.gov.br");
  });

  describe("empresas", () => {
    it("downloads, extracts, and parses CSV with no header row", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "receita-empresas-0", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent = makeReceitaCsv([
        ["12345678", "EMPRESA TESTE LTDA", "2062", "50", "100000.00", "03", ""],
        ["87654321", "OUTRA EMPRESA SA", "2046", "16", "500000.00", "05", ""],
      ]);

      await writeFile(join(extractDir, "K3241.K03200Y0.D41211.EMPRECSV"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "receita-empresas-0", "fake.zip"));
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "K3241.K03200Y0.D41211.EMPRECSV")]);

      const result = await receita.empresas();
      expect(result).toHaveLength(2);
      expect(result[0]?.CNPJ_BASICO).toBe("12345678");
      expect(result[0]?.RAZAO_SOCIAL).toBe("EMPRESA TESTE LTDA");
      expect(result[0]?.NATUREZA_JURIDICA).toBe("2062");
      expect(result[0]?.CAPITAL_SOCIAL).toBe("100000.00");
      expect(result[0]?.PORTE_EMPRESA).toBe("03");

      expect(result[1]?.CNPJ_BASICO).toBe("87654321");
      expect(result[1]?.RAZAO_SOCIAL).toBe("OUTRA EMPRESA SA");

      expect(download).toHaveBeenCalledWith(
        "https://dadosabertos.rfb.gov.br/CNPJ/Empresas0.zip",
        expect.objectContaining({ destDir: expect.stringContaining("receita-empresas-0") }),
      );
    });

    it("uses specified chunk number", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "receita-empresas-5", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent = makeReceitaCsv([
        ["11111111", "CHUNK FIVE LTDA", "2062", "50", "200000.00", "03", ""],
      ]);

      await writeFile(join(extractDir, "EMPRECSV"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "receita-empresas-5", "fake.zip"));
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "EMPRECSV")]);

      const result = await receita.empresas({ chunk: 5 });
      expect(result).toHaveLength(1);
      expect(result[0]?.RAZAO_SOCIAL).toBe("CHUNK FIVE LTDA");

      expect(download).toHaveBeenCalledWith(
        "https://dadosabertos.rfb.gov.br/CNPJ/Empresas5.zip",
        expect.objectContaining({ destDir: expect.stringContaining("receita-empresas-5") }),
      );
    });

    it("uses cached data when available", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "receita-empresas-0", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent = makeReceitaCsv([
        ["99999999", "CACHED EMPRESA", "2062", "50", "300000.00", "03", ""],
      ]);

      await writeFile(join(extractDir, "EMPRECSV"), csvContent, "utf-8");

      // Pre-populate cache
      await cache.put("receita-empresas-0", extractDir);

      const result = await receita.empresas();
      expect(result).toHaveLength(1);
      expect(result[0]?.RAZAO_SOCIAL).toBe("CACHED EMPRESA");

      // Should not have called download since cache was hit
      expect(download).not.toHaveBeenCalled();
      expect(extractZip).not.toHaveBeenCalled();
    });
  });

  describe("estabelecimentos", () => {
    it("downloads and parses estabelecimentos CSV", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "receita-estabelecimentos-0", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent = makeReceitaCsv([
        [
          "12345678",
          "0001",
          "00",
          "1",
          "LOJA CENTRO",
          "02",
          "20200101",
          "00",
          "",
          "",
          "20100315",
          "4712100",
          "",
          "RUA",
          "DAS FLORES",
          "100",
          "SALA 1",
          "CENTRO",
          "01001000",
          "SP",
          "7107",
          "11",
          "30001234",
          "",
          "",
          "",
          "",
          "contato@empresa.com",
          "",
          "",
        ],
      ]);

      await writeFile(join(extractDir, "ESTABELE"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(
        join(TEST_CACHE_DIR, "receita-estabelecimentos-0", "fake.zip"),
      );
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "ESTABELE")]);

      const result = await receita.estabelecimentos();
      expect(result).toHaveLength(1);
      expect(result[0]?.CNPJ_BASICO).toBe("12345678");
      expect(result[0]?.CNPJ_ORDEM).toBe("0001");
      expect(result[0]?.CNPJ_DV).toBe("00");
      expect(result[0]?.NOME_FANTASIA).toBe("LOJA CENTRO");
      expect(result[0]?.LOGRADOURO).toBe("DAS FLORES");
      expect(result[0]?.UF).toBe("SP");
      expect(result[0]?.CORREIO_ELETRONICO).toBe("contato@empresa.com");

      expect(download).toHaveBeenCalledWith(
        "https://dadosabertos.rfb.gov.br/CNPJ/Estabelecimentos0.zip",
        expect.objectContaining({
          destDir: expect.stringContaining("receita-estabelecimentos-0"),
        }),
      );
    });
  });

  describe("socios", () => {
    it("downloads and parses socios CSV", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "receita-socios-0", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent = makeReceitaCsv([
        ["12345678", "2", "JOAO DA SILVA", "***123456**", "49", "20150101", "", "", "", "", "4"],
      ]);

      await writeFile(join(extractDir, "SOCIOCSV"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "receita-socios-0", "fake.zip"));
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "SOCIOCSV")]);

      const result = await receita.socios();
      expect(result).toHaveLength(1);
      expect(result[0]?.CNPJ_BASICO).toBe("12345678");
      expect(result[0]?.NOME_SOCIO_RAZAO_SOCIAL).toBe("JOAO DA SILVA");
      expect(result[0]?.QUALIFICACAO_SOCIO).toBe("49");
      expect(result[0]?.DATA_ENTRADA_SOCIEDADE).toBe("20150101");
      expect(result[0]?.FAIXA_ETARIA).toBe("4");

      expect(download).toHaveBeenCalledWith(
        "https://dadosabertos.rfb.gov.br/CNPJ/Socios0.zip",
        expect.objectContaining({ destDir: expect.stringContaining("receita-socios-0") }),
      );
    });
  });

  describe("simples", () => {
    it("downloads and parses simples CSV (single file, no chunk)", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "receita-simples", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent = makeReceitaCsv([
        ["12345678", "S", "20180101", "", "N", "", ""],
        ["87654321", "S", "20190601", "20201231", "S", "20190601", "20201231"],
      ]);

      await writeFile(join(extractDir, "SIMPLESCSV"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "receita-simples", "fake.zip"));
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "SIMPLESCSV")]);

      const result = await receita.simples();
      expect(result).toHaveLength(2);
      expect(result[0]?.CNPJ_BASICO).toBe("12345678");
      expect(result[0]?.OPCAO_SIMPLES).toBe("S");
      expect(result[0]?.DATA_OPCAO_SIMPLES).toBe("20180101");
      expect(result[0]?.OPCAO_MEI).toBe("N");

      expect(result[1]?.OPCAO_MEI).toBe("S");
      expect(result[1]?.DATA_EXCLUSAO_MEI).toBe("20201231");

      expect(download).toHaveBeenCalledWith(
        "https://dadosabertos.rfb.gov.br/CNPJ/Simples.zip",
        expect.objectContaining({ destDir: expect.stringContaining("receita-simples") }),
      );
    });
  });

  describe("validation", () => {
    it("rejects chunk below 0", async () => {
      await expect(receita.empresas({ chunk: -1 })).rejects.toThrow(BVValidationError);
    });

    it("rejects chunk above 9", async () => {
      await expect(receita.empresas({ chunk: 10 })).rejects.toThrow(BVValidationError);
    });

    it("rejects non-integer chunk", async () => {
      await expect(receita.empresas({ chunk: 2.5 })).rejects.toThrow(BVValidationError);
    });

    it("rejects negative chunk for estabelecimentos", async () => {
      await expect(receita.estabelecimentos({ chunk: -1 })).rejects.toThrow(BVValidationError);
    });

    it("rejects chunk above 9 for socios", async () => {
      await expect(receita.socios({ chunk: 10 })).rejects.toThrow(BVValidationError);
    });

    it("defaults chunk to 0 when not provided", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "receita-empresas-0", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent = makeReceitaCsv([
        ["12345678", "DEFAULT CHUNK", "2062", "50", "100000.00", "03", ""],
      ]);

      await writeFile(join(extractDir, "EMPRECSV"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "receita-empresas-0", "fake.zip"));
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "EMPRECSV")]);

      await receita.empresas();

      expect(download).toHaveBeenCalledWith(
        "https://dadosabertos.rfb.gov.br/CNPJ/Empresas0.zip",
        expect.objectContaining({ destDir: expect.stringContaining("receita-empresas-0") }),
      );
    });
  });
});
