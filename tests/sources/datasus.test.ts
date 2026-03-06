import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileCache } from "../../src/cache";
import { BVError, BVValidationError } from "../../src/errors";
import { DataSusSource } from "../../src/sources/datasus";

vi.mock("../../src/download", () => ({
  download: vi.fn(),
  extractZip: vi.fn(),
}));

const TEST_CACHE_DIR = join(tmpdir(), "bv-datasus-test");

let datasus: DataSusSource;
let cache: FileCache;

beforeEach(async () => {
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  cache = new FileCache({ cacheDir: TEST_CACHE_DIR, ttlMs: 60000 });
  datasus = new DataSusSource({ cache });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
});

describe("DataSusSource", () => {
  it("has correct name and baseUrl", () => {
    expect(datasus.name).toBe("DATASUS");
    expect(datasus.baseUrl).toBe("https://datasus.saude.gov.br");
  });

  describe("cnes", () => {
    it("downloads and parses CNES data", async () => {
      const { download } = await import("../../src/download");

      const downloadDir = join(TEST_CACHE_DIR, "datasus-cnes-2023-SP");
      await mkdir(downloadDir, { recursive: true });

      const csvContent =
        '"CNES";"CODUFMUN";"COD_CEP";"CPF_CNPJ";"RAZAO_SOC";"FANTASIA";"NATUREZA";"TIPO_ESTAB";"TP_GESTAO";"VINC_SUS"\n"001";"350001";"01000000";"12345678000100";"Hospital Teste";"Hosp Teste";"1";"05";"M";"1"\n';
      const csvPath = join(downloadDir, "cnes_SP_2023.csv");
      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await datasus.cnes({ ano: 2023, uf: "SP" });
      expect(result).toHaveLength(1);
      expect(result[0]?.RAZAO_SOC).toBe("Hospital Teste");
      expect(result[0]?.VINC_SUS).toBe("1");
    });
  });

  describe("sinan", () => {
    it("downloads and parses SINAN data", async () => {
      const { download } = await import("../../src/download");

      const downloadDir = join(TEST_CACHE_DIR, "datasus-sinan-2023-RJ");
      await mkdir(downloadDir, { recursive: true });

      const csvContent =
        '"DT_NOTIFIC";"SG_UF_NOT";"ID_MUNICIP";"ID_AGRAVO";"DT_SIN_PRI";"CS_SEXO";"NU_IDADE_N";"CS_RACA";"CS_ESCOL_N";"CLASSI_FIN";"EVOLUCAO"\n"20230115";"33";"330455";"A90";"20230110";"F";"4025";"1";"05";"10";"1"\n';
      const csvPath = join(downloadDir, "sinan_RJ_2023.csv");
      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await datasus.sinan({ ano: 2023, uf: "RJ" });
      expect(result).toHaveLength(1);
      expect(result[0]?.ID_AGRAVO).toBe("A90");
      expect(result[0]?.CS_SEXO).toBe("F");
    });

    it("throws BVError when download fails", async () => {
      const { download } = await import("../../src/download");
      vi.mocked(download).mockRejectedValue(new Error("network error"));

      await expect(datasus.sinan({ ano: 2023, uf: "RJ" })).rejects.toThrow(BVError);
      await expect(datasus.sinan({ ano: 2023, uf: "RJ" })).rejects.toThrow(/DATASUS SINAN/);
    });
  });

  describe("sinasc", () => {
    it("downloads and parses SINASC data", async () => {
      const { download } = await import("../../src/download");

      const downloadDir = join(TEST_CACHE_DIR, "datasus-sinasc-2022-MG");
      await mkdir(downloadDir, { recursive: true });

      const csvContent =
        '"DTNASC";"CODMUNNASC";"IDADEMAE";"ESCMAE";"CODOCUPMAE";"QTDFILVIVO";"GESTACAO";"GRAVIDEZ";"PARTO";"PESO";"SEXO";"RACACOR"\n"20220301";"310620";"28";"5";"999992";"1";"5";"1";"2";"3250";"1";"1"\n';
      const csvPath = join(downloadDir, "sinasc_MG_2022.csv");
      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await datasus.sinasc({ ano: 2022, uf: "MG" });
      expect(result).toHaveLength(1);
      expect(result[0]?.CODMUNNASC).toBe("310620");
      expect(result[0]?.PESO).toBe("3250");
      expect(result[0]?.SEXO).toBe("1");
    });

    it("throws BVError when download fails", async () => {
      const { download } = await import("../../src/download");
      vi.mocked(download).mockRejectedValue(new Error("network error"));

      await expect(datasus.sinasc({ ano: 2022, uf: "MG" })).rejects.toThrow(BVError);
      await expect(datasus.sinasc({ ano: 2022, uf: "MG" })).rejects.toThrow(/DATASUS SINASC/);
    });
  });

  describe("validation", () => {
    it("rejects ano before 1996", async () => {
      await expect(datasus.cnes({ ano: 1995 })).rejects.toThrow(BVValidationError);
    });

    it("rejects future ano", async () => {
      await expect(datasus.sim({ ano: 2099 })).rejects.toThrow(BVValidationError);
    });

    it("rejects non-integer ano", async () => {
      await expect(datasus.sih({ ano: 2022.5 })).rejects.toThrow(BVValidationError);
    });
  });
});
