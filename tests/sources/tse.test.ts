import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileCache } from "../../src/cache";
import { BVValidationError } from "../../src/errors";
import { TseSource } from "../../src/sources/tse";

// Mock download and extractZip to avoid real network calls
vi.mock("../../src/download", () => ({
  download: vi.fn(),
  extractZip: vi.fn(),
}));

const TEST_CACHE_DIR = join(tmpdir(), "bv-tse-test");

let tse: TseSource;
let cache: FileCache;

beforeEach(async () => {
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  cache = new FileCache({ cacheDir: TEST_CACHE_DIR, ttlMs: 60000 });
  tse = new TseSource({ cache });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
});

describe("TseSource", () => {
  it("has correct name and baseUrl", () => {
    expect(tse.name).toBe("TSE");
    expect(tse.baseUrl).toBe("https://cdn.tse.jus.br");
  });

  describe("candidaturas", () => {
    it("downloads, extracts, and parses CSV", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "tse-cand-2022", "extracted");
      await mkdir(extractDir, { recursive: true });

      // Create a fake CSV with TSE format (semicolon-delimited, latin1-ish)
      const csvContent = [
        '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_TIPO_ELEICAO";"NM_TIPO_ELEICAO";"NR_TURNO";"CD_ELEICAO";"DS_ELEICAO";"SG_UF";"SG_UE";"NM_UE";"CD_CARGO";"DS_CARGO";"SQ_CANDIDATO";"NR_CANDIDATO";"NM_CANDIDATO";"NM_URNA_CANDIDATO";"NM_SOCIAL_CANDIDATO";"NR_CPF_CANDIDATO";"NM_EMAIL";"CD_SITUACAO_CANDIDATURA";"DS_SITUACAO_CANDIDATURA";"CD_DETALHE_SITUACAO_CAND";"DS_DETALHE_SITUACAO_CAND";"TP_AGREMIACAO";"NR_PARTIDO";"SG_PARTIDO";"NM_PARTIDO";"DT_NASCIMENTO";"NR_TITULO_ELEITORAL_CANDIDATO";"NR_IDADE_DATA_POSSE";"CD_GENERO";"DS_GENERO";"CD_GRAU_INSTRUCAO";"DS_GRAU_INSTRUCAO";"CD_ESTADO_CIVIL";"DS_ESTADO_CIVIL";"CD_COR_RACA";"DS_COR_RACA";"CD_OCUPACAO";"DS_OCUPACAO";"CD_MUNICIPIO_NASCIMENTO";"NM_MUNICIPIO_NASCIMENTO";"SG_UF_NASCIMENTO";"CD_SIT_TOT_TURNO";"DS_SIT_TOT_TURNO"',
        '"01/01/2022";"12:00:00";"2022";"2";"ELEICAO ORDINARIA";"1";"546";"ELEICOES GERAIS 2022";"SP";"SP";"SAO PAULO";"1";"PRESIDENTE";"1234";"13";"LUIZ INACIO LULA DA SILVA";"LULA";"#NULO#";"00000000000";"email@test.com";"12";"APTO";"12";"DEFERIDO";"PARTIDO";"13";"PT";"PARTIDO DOS TRABALHADORES";"27/10/1945";"000000000000";"77";"2";"MASCULINO";"8";"SUPERIOR COMPLETO";"5";"DIVORCIADO";"3";"PARDA";"0";"PRESIDENTE DA REPUBLICA";"000";"GARANHUNS";"PE";"1";"ELEITO"',
      ].join("\n");

      await writeFile(join(extractDir, "consulta_cand_2022_SP.csv"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "tse-cand-2022", "fake.zip"));
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "consulta_cand_2022_SP.csv")]);

      const result = await tse.candidaturas({ ano: 2022, estado: "SP" });
      expect(result).toHaveLength(1);
      expect(result[0]?.NM_CANDIDATO).toBe("LUIZ INACIO LULA DA SILVA");
      expect(result[0]?.NM_URNA_CANDIDATO).toBe("LULA");
      expect(result[0]?.SG_PARTIDO).toBe("PT");
      expect(result[0]?.ANO_ELEICAO).toBe("2022");
      expect(result[0]?.SG_UF).toBe("SP");

      expect(download).toHaveBeenCalledWith(
        "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip",
        expect.objectContaining({ destDir: expect.stringContaining("tse-cand-2022") }),
      );
    });

    it("uses cached data when available", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "tse-cand-2022", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent =
        '"DT_GERACAO";"ANO_ELEICAO";"SG_UF";"NM_CANDIDATO"\n"01/01/2022";"2022";"SP";"TEST"\n';
      await writeFile(join(extractDir, "consulta_cand_2022_SP.csv"), csvContent, "utf-8");

      // Pre-populate cache
      await cache.put("tse-cand-2022", extractDir);

      const result = await tse.candidaturas({ ano: 2022, estado: "SP" });
      expect(result).toHaveLength(1);
      expect(result[0]?.NM_CANDIDATO).toBe("TEST");

      // Should not have called download since cache was hit
      expect(download).not.toHaveBeenCalled();
      expect(extractZip).not.toHaveBeenCalled();
    });
  });

  describe("bens", () => {
    it("downloads and parses bens CSV", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "tse-bens-2022", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent = [
        '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_TIPO_ELEICAO";"NM_TIPO_ELEICAO";"SG_UF";"SG_UE";"NM_UE";"SQ_CANDIDATO";"NR_ORDEM_CANDIDATO";"CD_TIPO_BEM_CANDIDATO";"DS_TIPO_BEM_CANDIDATO";"DS_BEM_CANDIDATO";"VR_BEM_CANDIDATO"',
        '"01/01/2022";"12:00";"2022";"2";"ELEICAO ORDINARIA";"SP";"SP";"SP";"1234";"1";"01";"IMOVEL";"APARTAMENTO";"500000.00"',
      ].join("\n");

      await writeFile(join(extractDir, "bem_candidato_2022_SP.csv"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "tse-bens-2022", "fake.zip"));
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "bem_candidato_2022_SP.csv")]);

      const result = await tse.bens({ ano: 2022, estado: "SP" });
      expect(result).toHaveLength(1);
      expect(result[0]?.DS_TIPO_BEM_CANDIDATO).toBe("IMOVEL");
      expect(result[0]?.VR_BEM_CANDIDATO).toBe("500000.00");
    });
  });

  describe("validation", () => {
    it("rejects ano before 1998", async () => {
      await expect(tse.candidaturas({ ano: 1990 })).rejects.toThrow(BVValidationError);
    });

    it("rejects non-integer ano", async () => {
      await expect(tse.candidaturas({ ano: 2022.5 })).rejects.toThrow(BVValidationError);
    });

    it("rejects future ano", async () => {
      await expect(tse.candidaturas({ ano: 2099 })).rejects.toThrow(BVValidationError);
    });

    it("filiados rejects empty partido", async () => {
      await expect(tse.filiados({ partido: "", estado: "SP" })).rejects.toThrow(BVValidationError);
    });

    it("filiados rejects empty estado", async () => {
      await expect(tse.filiados({ partido: "PT", estado: "" })).rejects.toThrow(BVValidationError);
    });
  });
});
