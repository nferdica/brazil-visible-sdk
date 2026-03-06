import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileCache } from "../../src/cache";
import { BVValidationError } from "../../src/errors";
import { MercadoSource } from "../../src/sources/mercado";

// Mock download and extractZip to avoid real network calls
vi.mock("../../src/download", () => ({
  download: vi.fn(),
  extractZip: vi.fn(),
}));

const TEST_CACHE_DIR = join(tmpdir(), "bv-mercado-test");

let mercado: MercadoSource;
let cache: FileCache;

beforeEach(async () => {
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  cache = new FileCache({ cacheDir: TEST_CACHE_DIR, ttlMs: 60000 });
  mercado = new MercadoSource({ cache });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
});

describe("MercadoSource", () => {
  it("has correct name and baseUrl", () => {
    expect(mercado.name).toBe("CVM");
    expect(mercado.baseUrl).toBe("https://dados.cvm.gov.br");
  });

  describe("dfp", () => {
    it("downloads, extracts, and parses CSV", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "cvm-dfp-2023", "extracted");
      await mkdir(extractDir, { recursive: true });

      // CVM uses semicolon delimiter and UTF-8
      const csvContent = [
        "CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;GRUPO_DFP;MOEDA;ESCALA_MOEDA;ORDEM_EXERC;DT_INI_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA;ST_CONTA_FIXA",
        "00.000.000/0001-91;2023-12-31;1;PETROBRAS SA;9512;DF Consolidado - Balanco Patrimonial Ativo;REAL;MIL;ULTIMO;2023-01-01;2023-12-31;1;Ativo Total;980832000;S",
      ].join("\n");

      await writeFile(join(extractDir, "dfp_cia_aberta_BPA_con_2023.csv"), csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "cvm-dfp-2023", "fake.zip"));
      vi.mocked(extractZip).mockResolvedValue([
        join(extractDir, "dfp_cia_aberta_BPA_con_2023.csv"),
      ]);

      const result = await mercado.dfp({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.CNPJ_CIA).toBe("00.000.000/0001-91");
      expect(result[0]?.DENOM_CIA).toBe("PETROBRAS SA");
      expect(result[0]?.CD_CONTA).toBe("1");
      expect(result[0]?.DS_CONTA).toBe("Ativo Total");
      expect(result[0]?.VL_CONTA).toBe("980832000");

      expect(download).toHaveBeenCalledWith(
        "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_2023.zip",
        expect.objectContaining({ destDir: expect.stringContaining("cvm-dfp-2023") }),
      );
    });

    it("uses cached data when available", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "cvm-dfp-2023", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent =
        "CNPJ_CIA;DT_REFER;DENOM_CIA;VL_CONTA\n00.000.000/0001-91;2023-12-31;PETROBRAS SA;100\n";
      await writeFile(join(extractDir, "dfp_cia_aberta_BPA_con_2023.csv"), csvContent, "utf-8");

      // Pre-populate cache
      await cache.put("cvm-dfp-2023", extractDir);

      const result = await mercado.dfp({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.DENOM_CIA).toBe("PETROBRAS SA");

      // Should not have called download since cache was hit
      expect(download).not.toHaveBeenCalled();
      expect(extractZip).not.toHaveBeenCalled();
    });
  });

  describe("ciasAbertas", () => {
    it("downloads single CSV and parses it", async () => {
      const { download } = await import("../../src/download");

      const destDir = join(TEST_CACHE_DIR, "cvm-cias-abertas", "extracted");
      await mkdir(destDir, { recursive: true });

      const csvPath = join(destDir, "cad_cia_aberta.csv");
      const csvContent = [
        "CNPJ_CIA;DENOM_SOCIAL;DENOM_COMERC;DT_REG;DT_CONST;DT_CANCEL;MOTIVO_CANCEL;SIT;DT_INI_SIT;CD_CVM;SETOR_ATIV;TP_MERC;CATEG_REG;DT_INI_CATEG;SIT_EMISSOR;DT_INI_SIT_EMISSOR;CONTROLE_ACIONARIO;TP_ENDER;LOGRADOURO;COMPL;BAIRRO;MUN;UF;PAIS;CEP;DDD_TEL;TEL;DDD_FAX;FAX;EMAIL;TP_RESP;RESP;DT_INI_RESP;LOGRADOURO_RESP;COMPL_RESP;BAIRRO_RESP;MUN_RESP;UF_RESP;PAIS_RESP;CEP_RESP;DDD_TEL_RESP;TEL_RESP;DDD_FAX_RESP;FAX_RESP;EMAIL_RESP",
        "33.000.167/0001-01;PETROLEO BRASILEIRO S.A. PETROBRAS;PETROBRAS;1977-09-27;1953-10-02;;;ATIVA;2002-01-02;9512;Petroleo e Gas;BOLSA;CAT A;2009-12-14;FASE OPERACIONAL;2002-01-02;ESTATAL;SEDE;AV REPUBLICA DO CHILE 65;23 ANDAR;CENTRO;RIO DE JANEIRO;RJ;BRASIL;20031912;21;32242164;21;32242040;acionistas@petrobras.com.br;ESCRITURADOR;BANCO BRADESCO S.A.;2002-01-02;CIDADE DE DEUS;;VILA YARA;OSASCO;SP;BRASIL;06029900;11;36847539;;;escrituracao@bradesco.com.br",
      ].join("\n");

      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await mercado.ciasAbertas();
      expect(result).toHaveLength(1);
      expect(result[0]?.CNPJ_CIA).toBe("33.000.167/0001-01");
      expect(result[0]?.DENOM_SOCIAL).toBe("PETROLEO BRASILEIRO S.A. PETROBRAS");
      expect(result[0]?.SIT).toBe("ATIVA");
      expect(result[0]?.UF).toBe("RJ");

      expect(download).toHaveBeenCalledWith(
        "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv",
        expect.objectContaining({
          destDir: expect.stringContaining("cvm-cias-abertas"),
          filename: "cad_cia_aberta.csv",
        }),
      );
    });

    it("uses cached data when available", async () => {
      const { download } = await import("../../src/download");

      const destDir = join(TEST_CACHE_DIR, "cvm-cias-abertas", "extracted");
      await mkdir(destDir, { recursive: true });

      const csvContent = "CNPJ_CIA;DENOM_SOCIAL;SIT\n33.000.167/0001-01;PETROBRAS;ATIVA\n";
      await writeFile(join(destDir, "cad_cia_aberta.csv"), csvContent, "utf-8");

      await cache.put("cvm-cias-abertas", destDir);

      const result = await mercado.ciasAbertas();
      expect(result).toHaveLength(1);
      expect(result[0]?.DENOM_SOCIAL).toBe("PETROBRAS");

      expect(download).not.toHaveBeenCalled();
    });
  });

  describe("fundos", () => {
    it("downloads single CSV and parses it", async () => {
      const { download } = await import("../../src/download");

      const destDir = join(TEST_CACHE_DIR, "cvm-fundos", "extracted");
      await mkdir(destDir, { recursive: true });

      const csvPath = join(destDir, "cad_fi.csv");
      const csvContent = [
        "CNPJ_FUNDO;DENOM_SOCIAL;DT_REG;DT_CONST;DT_CANCEL;SIT;DT_INI_SIT;DT_INI_ATIV;DT_INI_EXERC;DT_FIM_EXERC;CLASSE;DT_INI_CLASSE;RENTAB_FUNDO;CONDOM;FUNDO_COTAS;FUNDO_EXCLUSIVO;TRIB_LPRAZO;INVEST_QUALIF;TAXA_PERFM;INF_TAXA_PERFM;TAXA_ADM;INF_TAXA_ADM;VL_PATRIM_LIQ;DT_PATRIM_LIQ;DIRETOR;CNPJ_ADMIN;ADMIN;PF_PJ_GESTOR;CPF_CNPJ_GESTOR;GESTOR;CNPJ_AUDITOR;AUDITOR",
        "00.017.024/0001-53;FDO INV REND FIXA BNB;1995-03-08;1994-07-14;;EM FUNCIONAMENTO NORMAL;2014-08-29;1994-07-14;2024-01-01;2024-12-31;Fundo de Renda Fixa;2019-10-01;Renda Fixa;Aberto;N;N;S;N;0.00;;0.50;Taxa de 0.50% a.a.;193584214.59;2024-12-30;FRANCISCO RAMOS;07.237.373/0001-20;BNB DTVM;PJ;07.237.373/0001-20;BNB DTVM;01.634.831/0001-21;KPMG",
      ].join("\n");

      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await mercado.fundos();
      expect(result).toHaveLength(1);
      expect(result[0]?.CNPJ_FUNDO).toBe("00.017.024/0001-53");
      expect(result[0]?.DENOM_SOCIAL).toBe("FDO INV REND FIXA BNB");
      expect(result[0]?.CLASSE).toBe("Fundo de Renda Fixa");
      expect(result[0]?.SIT).toBe("EM FUNCIONAMENTO NORMAL");

      expect(download).toHaveBeenCalledWith(
        "https://dados.cvm.gov.br/dados/FI/CAD/DADOS/cad_fi.csv",
        expect.objectContaining({
          destDir: expect.stringContaining("cvm-fundos"),
          filename: "cad_fi.csv",
        }),
      );
    });
  });

  describe("cvmAdministradores", () => {
    it("downloads single CSV and parses it", async () => {
      const { download } = await import("../../src/download");

      const destDir = join(TEST_CACHE_DIR, "cvm-administradores", "extracted");
      await mkdir(destDir, { recursive: true });

      const csvPath = join(destDir, "inf_cadastral_cia_aberta.csv");
      const csvContent = [
        "CNPJ_CIA;DENOM_SOCIAL;DENOM_COMERC;SIT;DT_REG;DT_CANCEL;MOTIVO_CANCEL;TP_MERC;CATEG_REG",
        "33.000.167/0001-01;PETROLEO BRASILEIRO S.A. PETROBRAS;PETROBRAS;ATIVA;1977-09-27;;;BOLSA;CAT A",
      ].join("\n");

      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await mercado.cvmAdministradores();
      expect(result).toHaveLength(1);
      expect(result[0]?.CNPJ_CIA).toBe("33.000.167/0001-01");
      expect(result[0]?.DENOM_SOCIAL).toBe("PETROLEO BRASILEIRO S.A. PETROBRAS");
      expect(result[0]?.SIT).toBe("ATIVA");
      expect(result[0]?.TP_MERC).toBe("BOLSA");

      expect(download).toHaveBeenCalledWith(
        "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/inf_cadastral_cia_aberta.csv",
        expect.objectContaining({
          destDir: expect.stringContaining("cvm-administradores"),
          filename: "inf_cadastral_cia_aberta.csv",
        }),
      );
    });

    it("uses cached data when available", async () => {
      const { download } = await import("../../src/download");

      const destDir = join(TEST_CACHE_DIR, "cvm-administradores", "extracted");
      await mkdir(destDir, { recursive: true });

      const csvContent = "CNPJ_CIA;DENOM_SOCIAL;SIT\n33.000.167/0001-01;PETROBRAS;ATIVA\n";
      await writeFile(join(destDir, "inf_cadastral_cia_aberta.csv"), csvContent, "utf-8");

      await cache.put("cvm-administradores", destDir);

      const result = await mercado.cvmAdministradores();
      expect(result).toHaveLength(1);
      expect(result[0]?.DENOM_SOCIAL).toBe("PETROBRAS");

      expect(download).not.toHaveBeenCalled();
    });
  });

  describe("cvmFatosRelevantes", () => {
    it("downloads year-specific CSV and parses it", async () => {
      const { download } = await import("../../src/download");

      const destDir = join(TEST_CACHE_DIR, "cvm-fatos-2023", "extracted");
      await mkdir(destDir, { recursive: true });

      const csvPath = join(destDir, "ipe_cia_aberta_2023.csv");
      const csvContent = [
        "CNPJ_CIA;DENOM_CIA;DT_REFER;LINK_DOC;TP_DOC;ASSUNTO",
        "33.000.167/0001-01;PETROBRAS;2023-06-15;https://example.com/doc;Fato Relevante;Descoberta de novo poco",
      ].join("\n");

      await writeFile(csvPath, csvContent, "utf-8");

      vi.mocked(download).mockResolvedValue(csvPath);

      const result = await mercado.cvmFatosRelevantes({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.CNPJ_CIA).toBe("33.000.167/0001-01");
      expect(result[0]?.DENOM_CIA).toBe("PETROBRAS");
      expect(result[0]?.TP_DOC).toBe("Fato Relevante");
      expect(result[0]?.ASSUNTO).toBe("Descoberta de novo poco");

      expect(download).toHaveBeenCalledWith(
        "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/IPE/DADOS/ipe_cia_aberta_2023.csv",
        expect.objectContaining({
          destDir: expect.stringContaining("cvm-fatos-2023"),
          filename: "ipe_cia_aberta_2023.csv",
        }),
      );
    });

    it("uses cached data when available", async () => {
      const { download } = await import("../../src/download");

      const destDir = join(TEST_CACHE_DIR, "cvm-fatos-2023", "extracted");
      await mkdir(destDir, { recursive: true });

      const csvContent = "CNPJ_CIA;DENOM_CIA;TP_DOC\n33.000.167/0001-01;PETROBRAS;Fato Relevante\n";
      await writeFile(join(destDir, "ipe_cia_aberta_2023.csv"), csvContent, "utf-8");

      await cache.put("cvm-fatos-2023", destDir);

      const result = await mercado.cvmFatosRelevantes({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.DENOM_CIA).toBe("PETROBRAS");

      expect(download).not.toHaveBeenCalled();
    });

    it("validates ano parameter", async () => {
      await expect(mercado.cvmFatosRelevantes({ ano: 2009 })).rejects.toThrow(BVValidationError);
    });
  });

  describe("b3Cotacoes", () => {
    it("downloads ZIP, extracts, and parses CSV with latin1 encoding", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "b3-cotacoes-2023", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent = [
        "DATA;CODBDI;CODNEG;TPMERC;NOMRES;PREABE;PREMAX;PREMIN;PREULT;TOTNEG;QUATOT;VOLTOT",
        "20230102;02;PETR4;010;PETROBRAS PN;25.50;26.10;25.30;25.90;45231;1500000;38500000",
      ].join("\n");

      await writeFile(join(extractDir, "COTAHIST_A2023.csv"), csvContent, "latin1");

      vi.mocked(download).mockResolvedValue(join(TEST_CACHE_DIR, "b3-cotacoes-2023", "fake.zip"));
      vi.mocked(extractZip).mockResolvedValue([join(extractDir, "COTAHIST_A2023.csv")]);

      const result = await mercado.b3Cotacoes({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.DATA).toBe("20230102");
      expect(result[0]?.CODNEG).toBe("PETR4");
      expect(result[0]?.NOMRES).toBe("PETROBRAS PN");
      expect(result[0]?.PREABE).toBe("25.50");
      expect(result[0]?.PREULT).toBe("25.90");
      expect(result[0]?.TOTNEG).toBe("45231");

      expect(download).toHaveBeenCalledWith(
        "https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_A2023.ZIP",
        expect.objectContaining({
          destDir: expect.stringContaining("b3-cotacoes-2023"),
        }),
      );
    });

    it("uses cached data when available", async () => {
      const { download, extractZip } = await import("../../src/download");

      const extractDir = join(TEST_CACHE_DIR, "b3-cotacoes-2023", "extracted");
      await mkdir(extractDir, { recursive: true });

      const csvContent = "DATA;CODNEG;PREULT\n20230102;PETR4;25.90\n";
      await writeFile(join(extractDir, "COTAHIST_A2023.csv"), csvContent, "latin1");

      await cache.put("b3-cotacoes-2023", extractDir);

      const result = await mercado.b3Cotacoes({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.CODNEG).toBe("PETR4");

      expect(download).not.toHaveBeenCalled();
      expect(extractZip).not.toHaveBeenCalled();
    });

    it("validates ano parameter", async () => {
      await expect(mercado.b3Cotacoes({ ano: 2009 })).rejects.toThrow(BVValidationError);
    });
  });

  describe("validation", () => {
    it("rejects ano before 2010", async () => {
      await expect(mercado.dfp({ ano: 2009 })).rejects.toThrow(BVValidationError);
    });

    it("rejects non-integer ano", async () => {
      await expect(mercado.dfp({ ano: 2022.5 })).rejects.toThrow(BVValidationError);
    });

    it("rejects future ano", async () => {
      await expect(mercado.dfp({ ano: 2099 })).rejects.toThrow(BVValidationError);
    });

    it("rejects ano before 2010 for itr", async () => {
      await expect(mercado.itr({ ano: 2005 })).rejects.toThrow(BVValidationError);
    });
  });
});
