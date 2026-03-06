import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileCache } from "../../src/cache";
import { BVValidationError } from "../../src/errors";
import { TrabalhoSource } from "../../src/sources/trabalho";

vi.mock("../../src/download", () => ({
  download: vi.fn(),
  extractZip: vi.fn(),
}));

const TEST_CACHE_DIR = join(tmpdir(), "bv-trabalho-test");

let trabalho: TrabalhoSource;
let cache: FileCache;

beforeEach(async () => {
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  cache = new FileCache({ cacheDir: TEST_CACHE_DIR, ttlMs: 60000 });
  trabalho = new TrabalhoSource({ cache });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
});

describe("TrabalhoSource", () => {
  it("has correct name and baseUrl", () => {
    expect(trabalho.name).toBe("Trabalho");
    expect(trabalho.baseUrl).toBe("https://bi.mte.gov.br");
  });

  describe("caged", () => {
    it("downloads, extracts, and parses CSV", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "trabalho-caged-2023", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent =
        '"competencia";"regiao";"uf";"municipio";"secao";"subclasse";"saldomovimentacao";"admissoes";"desligamentos";"graudeinstrucao";"idade";"sexo";"racacor";"tipo_empregador";"tipo_estabelecimento";"tipo_movimentacao";"tipo_deficiencia";"indtrabintermitente";"indtrabparcial";"salario";"horascontratuais";"fonte"\n"202301";"1";"11";"110001";"A";"0111301";"1";"1";"0";"7";"25";"1";"2";"0";"1";"1";"0";"0";"0";"1500.00";"44";"1"\n';
      await writeFile(join(extractDir, "cagedmov202301.csv"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "fake.7z"));
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "cagedmov202301.csv")]);

      const result = await trabalho.caged({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.competencia).toBe("202301");
      expect(result[0]?.uf).toBe("11");
      expect(result[0]?.saldomovimentacao).toBe("1");
    });
  });

  describe("rais", () => {
    it("downloads, extracts, and parses CSV", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "trabalho-rais-2022", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent =
        '"Municipio";"CNAE_2_0_Classe";"Sexo_Trabalhador";"Rem_Media_Nom"\n"110001";"01113";"1";"2500.00"\n';
      await writeFile(join(extractDir, "RAIS_VINC_PUB_MG2022.txt"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "fake.7z"));
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "RAIS_VINC_PUB_MG2022.txt")]);

      const result = await trabalho.rais({ ano: 2022 });
      expect(result).toHaveLength(1);
      expect(result[0]?.Municipio).toBe("110001");
      expect(result[0]?.Rem_Media_Nom).toBe("2500.00");
    });
  });

  describe("validation", () => {
    it("rejects caged ano before 2020", async () => {
      await expect(trabalho.caged({ ano: 2019 })).rejects.toThrow(BVValidationError);
    });

    it("rejects rais ano before 2002", async () => {
      await expect(trabalho.rais({ ano: 2001 })).rejects.toThrow(BVValidationError);
    });

    it("rejects future ano", async () => {
      await expect(trabalho.caged({ ano: 2099 })).rejects.toThrow(BVValidationError);
    });
  });
});
