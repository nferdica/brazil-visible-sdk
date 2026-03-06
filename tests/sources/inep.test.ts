import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileCache } from "../../src/cache";
import { BVValidationError } from "../../src/errors";
import { InepSource } from "../../src/sources/inep";

vi.mock("../../src/download", () => ({
  download: vi.fn(),
  extractZip: vi.fn(),
}));

const TEST_CACHE_DIR = join(tmpdir(), "bv-inep-test");

let inep: InepSource;
let cache: FileCache;

beforeEach(async () => {
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  cache = new FileCache({ cacheDir: TEST_CACHE_DIR, ttlMs: 60000 });
  inep = new InepSource({ cache });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
});

describe("InepSource", () => {
  it("has correct name and baseUrl", () => {
    expect(inep.name).toBe("INEP");
    expect(inep.baseUrl).toBe("https://download.inep.gov.br");
  });

  describe("enem", () => {
    it("downloads, extracts, and parses ENEM microdados", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "inep-enem-2023", "extracted");
      const dataDir = join(extractDir, "DADOS");
      await mkdir(dataDir, { recursive: true });

      const csvContent =
        '"NU_INSCRICAO";"NU_ANO";"CO_MUNICIPIO_RESIDENCIA";"NO_MUNICIPIO_RESIDENCIA";"CO_UF_RESIDENCIA";"SG_UF_RESIDENCIA";"NU_IDADE";"TP_SEXO";"TP_ESTADO_CIVIL";"TP_COR_RACA";"TP_NACIONALIDADE";"TP_ST_CONCLUSAO";"TP_ANO_CONCLUIU";"TP_ESCOLA";"TP_ENSINO";"IN_TREINEIRO";"CO_MUNICIPIO_ESC";"NO_MUNICIPIO_ESC";"CO_UF_ESC";"SG_UF_ESC";"TP_DEPENDENCIA_ADM_ESC";"TP_LOCALIZACAO_ESC";"TP_SIT_FUNC_ESC";"CO_MUNICIPIO_PROVA";"NO_MUNICIPIO_PROVA";"CO_UF_PROVA";"SG_UF_PROVA";"TP_PRESENCA_CN";"TP_PRESENCA_CH";"TP_PRESENCA_LC";"TP_PRESENCA_MT";"NU_NOTA_CN";"NU_NOTA_CH";"NU_NOTA_LC";"NU_NOTA_MT";"TP_STATUS_REDACAO";"NU_NOTA_REDACAO"\n"230100000001";"2023";"3550308";"Sao Paulo";"35";"SP";"18";"F";"1";"3";"1";"2";"2023";"2";"1";"0";"3550308";"Sao Paulo";"35";"SP";"2";"1";"1";"3550308";"Sao Paulo";"35";"SP";"1";"1";"1";"1";"650.5";"700.2";"680.1";"720.3";"1";"800"\n';

      await writeFile(join(dataDir, "MICRODADOS_ENEM_2023.csv"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "fake.zip"));
      vi.mocked(extractZip).mockResolvedValue([join(dataDir, "MICRODADOS_ENEM_2023.csv")]);

      const result = await inep.enem({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.NU_INSCRICAO).toBe("230100000001");
      expect(result[0]?.SG_UF_RESIDENCIA).toBe("SP");
      expect(result[0]?.NU_NOTA_REDACAO).toBe("800");
    });

    it("uses cached data when available", async () => {
      const { download } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "inep-enem-2023", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent = '"NU_INSCRICAO";"NU_ANO";"SG_UF_RESIDENCIA"\n"001";"2023";"RJ"\n';
      await writeFile(join(extractDir, "MICRODADOS_ENEM_2023.csv"), csvContent, "utf-8");

      await cache.put("inep-enem-2023", extractDir);

      const result = await inep.enem({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.SG_UF_RESIDENCIA).toBe("RJ");
      expect(download).not.toHaveBeenCalled();
    });
  });

  describe("censoEscolar", () => {
    it("downloads and parses Censo Escolar data", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "inep-censo-escolar-2023", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent =
        '"NU_ANO_CENSO";"CO_ENTIDADE";"NO_ENTIDADE";"TP_DEPENDENCIA";"TP_LOCALIZACAO";"CO_MUNICIPIO";"NO_MUNICIPIO";"CO_UF";"SG_UF"\n"2023";"35000001";"ESCOLA TESTE";"2";"1";"3550308";"Sao Paulo";"35";"SP"\n';
      await writeFile(join(extractDir, "microdados_ed_basica_2023.csv"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "fake.zip"));
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "microdados_ed_basica_2023.csv")]);

      const result = await inep.censoEscolar({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.NO_ENTIDADE).toBe("ESCOLA TESTE");
      expect(result[0]?.SG_UF).toBe("SP");
    });
  });

  describe("validation", () => {
    it("rejects enem ano before 1998", async () => {
      await expect(inep.enem({ ano: 1997 })).rejects.toThrow(BVValidationError);
    });

    it("rejects censoEscolar ano before 2007", async () => {
      await expect(inep.censoEscolar({ ano: 2006 })).rejects.toThrow(BVValidationError);
    });

    it("rejects censoSuperior ano before 2009", async () => {
      await expect(inep.censoSuperior({ ano: 2008 })).rejects.toThrow(BVValidationError);
    });

    it("rejects future ano", async () => {
      await expect(inep.enem({ ano: 2099 })).rejects.toThrow(BVValidationError);
    });
  });
});
