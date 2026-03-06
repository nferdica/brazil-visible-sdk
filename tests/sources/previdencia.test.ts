import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileCache } from "../../src/cache";
import { BVValidationError } from "../../src/errors";
import { PrevidenciaSource } from "../../src/sources/previdencia";

vi.mock("../../src/download", () => ({
  download: vi.fn(),
  extractZip: vi.fn(),
}));

const TEST_CACHE_DIR = join(tmpdir(), "bv-prev-test");

let prev: PrevidenciaSource;
let cache: FileCache;

beforeEach(async () => {
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  cache = new FileCache({ cacheDir: TEST_CACHE_DIR, ttlMs: 60000 });
  prev = new PrevidenciaSource({ cache });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
});

describe("PrevidenciaSource", () => {
  it("has correct name and baseUrl", () => {
    expect(prev.name).toBe("Previdência");
    expect(prev.baseUrl).toBe("https://dadosabertos.dataprev.gov.br");
  });

  describe("beneficios", () => {
    it("downloads and parses benefits CSV", async () => {
      const { download } = await import("../../src/download");

      const downloadDir = join(TEST_CACHE_DIR, "prev-beneficios-2023");
      await mkdir(downloadDir, { recursive: true });

      const csvContent =
        '"competencia";"uf";"municipio";"especie";"qtd_beneficios";"valor_total"\n"202301";"SP";"SAO PAULO";"41";"1500";"3500000.00"\n';
      const csvPath = join(downloadDir, "beneficios_2023.csv");
      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await prev.beneficios({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.uf).toBe("SP");
      expect(result[0]?.valor_total).toBe("3500000.00");
    });
  });

  describe("fundosPensao", () => {
    it("downloads and parses pension funds CSV", async () => {
      const { download } = await import("../../src/download");

      const downloadDir = join(TEST_CACHE_DIR, "prev-fundos-pensao");
      await mkdir(downloadDir, { recursive: true });

      const csvContent =
        '"cnpb";"nome_plano";"sigla_efpc";"nome_efpc";"cnpj_efpc";"uf";"situacao";"tipo_plano";"modalidade";"qtd_participantes"\n"001";"Plano A";"PREVI";"Caixa de Prev";"00000000000100";"RJ";"Ativo";"BD";"Fechado";"50000"\n';
      const csvPath = join(downloadDir, "fundos_pensao.csv");
      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await prev.fundosPensao();
      expect(result).toHaveLength(1);
      expect(result[0]?.sigla_efpc).toBe("PREVI");
      expect(result[0]?.qtd_participantes).toBe("50000");
    });
  });

  describe("validation", () => {
    it("rejects ano before 2010", async () => {
      await expect(prev.beneficios({ ano: 2009 })).rejects.toThrow(BVValidationError);
    });

    it("rejects future ano", async () => {
      await expect(prev.beneficios({ ano: 2099 })).rejects.toThrow(BVValidationError);
    });
  });
});
