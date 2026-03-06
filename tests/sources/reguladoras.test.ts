import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileCache } from "../../src/cache";
import { BVValidationError } from "../../src/errors";
import { ReguladorasSource } from "../../src/sources/reguladoras";

// Mock download to avoid real network calls
vi.mock("../../src/download", () => ({
  download: vi.fn(),
  extractZip: vi.fn(),
}));

const TEST_CACHE_DIR = join(tmpdir(), "bv-reguladoras-test");

let reguladoras: ReguladorasSource;
let cache: FileCache;

beforeEach(async () => {
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  cache = new FileCache({ cacheDir: TEST_CACHE_DIR, ttlMs: 60000 });
  reguladoras = new ReguladorasSource({ cache });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
});

describe("ReguladorasSource", () => {
  it("has correct name and baseUrl", () => {
    expect(reguladoras.name).toBe("Reguladoras");
    expect(reguladoras.baseUrl).toBe("https://dados.gov.br");
  });

  describe("anatelAcessos", () => {
    it("downloads and parses CSV", async () => {
      const { download } = await import("../../src/download");

      const downloadDir = join(TEST_CACHE_DIR, "reguladoras-anatel-2023");
      await mkdir(downloadDir, { recursive: true });

      const csvPath = join(downloadDir, "reguladoras-anatel-2023.csv");
      const csvContent = [
        '"ano";"mes";"uf";"municipio";"codigo_ibge";"tecnologia";"acessos"',
        '"2023";"01";"SP";"SAO PAULO";"3550308";"4G";"15000000"',
      ].join("\n");

      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await reguladoras.anatelAcessos({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.uf).toBe("SP");
      expect(result[0]?.municipio).toBe("SAO PAULO");
      expect(result[0]?.tecnologia).toBe("4G");
      expect(result[0]?.acessos).toBe("15000000");

      expect(download).toHaveBeenCalledWith(
        "https://www.anatel.gov.br/dadosabertos/paineis_de_dados/acessos/acessos_banda_larga_fixa_2023.csv",
        expect.objectContaining({
          destDir: expect.stringContaining("reguladoras-anatel-2023"),
        }),
      );
    });
  });

  describe("aneelTarifas", () => {
    it("downloads and parses CSV", async () => {
      const { download } = await import("../../src/download");

      const downloadDir = join(TEST_CACHE_DIR, "reguladoras-aneel-2023");
      await mkdir(downloadDir, { recursive: true });

      const csvPath = join(downloadDir, "reguladoras-aneel-2023.csv");
      const csvContent = [
        '"dat_inicio_vigencia";"dat_fim_vigencia";"dsc_classe";"dsc_subclasse";"nom_distribuidora";"sig_agente";"vlr_tarifa";"vlr_componente_te";"vlr_componente_tusd";"dsc_modalidade_tarifaria"',
        '"01/01/2023";"31/12/2023";"RESIDENCIAL";"NORMAL";"ENEL SP";"ENEL";"0.85";"0.45";"0.40";"CONVENCIONAL"',
      ].join("\n");

      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await reguladoras.aneelTarifas({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.nom_distribuidora).toBe("ENEL SP");
      expect(result[0]?.vlr_tarifa).toBe("0.85");
      expect(result[0]?.dsc_classe).toBe("RESIDENCIAL");

      expect(download).toHaveBeenCalledWith(
        "https://dadosabertos.aneel.gov.br/dataset/tarifas-homologadas/tarifas_2023.csv",
        expect.objectContaining({
          destDir: expect.stringContaining("reguladoras-aneel-2023"),
        }),
      );
    });
  });

  describe("anpCombustiveis", () => {
    it("downloads and parses CSV", async () => {
      const { download } = await import("../../src/download");

      const downloadDir = join(TEST_CACHE_DIR, "reguladoras-anp-2023");
      await mkdir(downloadDir, { recursive: true });

      const csvPath = join(downloadDir, "reguladoras-anp-2023.csv");
      const csvContent = [
        '"regiao";"estado";"municipio";"revenda";"cnpj";"produto";"data_coleta";"valor_venda";"valor_compra";"unidade_medida";"bandeira"',
        '"SUDESTE";"SAO PAULO";"SAO PAULO";"POSTO TESTE";"00.000.000/0001-00";"GASOLINA COMUM";"01/01/2023";"5.89";"5.10";"R$/litro";"BRANCA"',
      ].join("\n");

      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await reguladoras.anpCombustiveis({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.produto).toBe("GASOLINA COMUM");
      expect(result[0]?.valor_venda).toBe("5.89");
      expect(result[0]?.estado).toBe("SAO PAULO");
      expect(result[0]?.bandeira).toBe("BRANCA");

      expect(download).toHaveBeenCalledWith(
        "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/dsas/ca/ca-2023-01.csv",
        expect.objectContaining({
          destDir: expect.stringContaining("reguladoras-anp-2023"),
        }),
      );
    });
  });

  describe("anvisaMedicamentos", () => {
    it("downloads and parses CSV", async () => {
      const { download } = await import("../../src/download");

      const downloadDir = join(TEST_CACHE_DIR, "reguladoras-anvisa-medicamentos");
      await mkdir(downloadDir, { recursive: true });

      const csvPath = join(downloadDir, "reguladoras-anvisa-medicamentos.csv");
      const csvContent = [
        '"categoria_regulatoria";"nome_produto";"processo";"empresa";"cnpj";"principio_ativo";"data_publicacao";"situacao"',
        '"SIMILAR";"PARACETAMOL 500MG";"25351.000001/2023";"LABORATORIO TESTE";"00.000.000/0001-00";"PARACETAMOL";"01/01/2023";"ATIVO"',
      ].join("\n");

      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await reguladoras.anvisaMedicamentos();
      expect(result).toHaveLength(1);
      expect(result[0]?.nome_produto).toBe("PARACETAMOL 500MG");
      expect(result[0]?.principio_ativo).toBe("PARACETAMOL");
      expect(result[0]?.situacao).toBe("ATIVO");

      expect(download).toHaveBeenCalledWith(
        "https://dados.anvisa.gov.br/dados/MEDICAMENTOS.csv",
        expect.objectContaining({
          destDir: expect.stringContaining("reguladoras-anvisa-medicamentos"),
        }),
      );
    });
  });

  describe("cache", () => {
    it("uses cached data when available", async () => {
      const { download } = await import("../../src/download");

      const downloadDir = join(TEST_CACHE_DIR, "reguladoras-anatel-2023");
      await mkdir(downloadDir, { recursive: true });

      const csvPath = join(downloadDir, "reguladoras-anatel-2023.csv");
      const csvContent =
        '"ano";"mes";"uf";"municipio";"codigo_ibge";"tecnologia";"acessos"\n"2023";"06";"RJ";"RIO DE JANEIRO";"3304557";"5G";"5000000"\n';

      await writeFile(csvPath, csvContent, "utf-8");

      // Pre-populate cache
      await cache.put("reguladoras-anatel-2023", csvPath);

      const result = await reguladoras.anatelAcessos({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.uf).toBe("RJ");
      expect(result[0]?.tecnologia).toBe("5G");

      // Should not have called download since cache was hit
      expect(download).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("rejects ano before 2000", async () => {
      await expect(reguladoras.anatelAcessos({ ano: 1999 })).rejects.toThrow(BVValidationError);
    });

    it("rejects non-integer ano", async () => {
      await expect(reguladoras.aneelTarifas({ ano: 2023.5 })).rejects.toThrow(BVValidationError);
    });

    it("rejects future ano", async () => {
      await expect(reguladoras.anpCombustiveis({ ano: 2099 })).rejects.toThrow(BVValidationError);
    });
  });
});
