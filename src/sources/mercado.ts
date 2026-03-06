import { join } from "node:path";
import { type FileCache, getDefaultCache } from "../cache";
import { download, extractZip } from "../download";
import { BVValidationError } from "../errors";
import { parseCsvFile } from "../parsers";
import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface CvmYearParams {
  ano: number;
}

export interface DfpItem {
  CNPJ_CIA: string;
  DT_REFER: string;
  VERSAO: string;
  DENOM_CIA: string;
  CD_CVM: string;
  GRUPO_DFP: string;
  MOEDA: string;
  ESCALA_MOEDA: string;
  ORDEM_EXERC: string;
  DT_INI_EXERC: string;
  DT_FIM_EXERC: string;
  CD_CONTA: string;
  DS_CONTA: string;
  VL_CONTA: string;
  ST_CONTA_FIXA: string;
  [key: string]: string;
}

export interface ItrItem {
  CNPJ_CIA: string;
  DT_REFER: string;
  VERSAO: string;
  DENOM_CIA: string;
  CD_CVM: string;
  GRUPO_DFP: string;
  MOEDA: string;
  ESCALA_MOEDA: string;
  ORDEM_EXERC: string;
  DT_INI_EXERC: string;
  DT_FIM_EXERC: string;
  CD_CONTA: string;
  DS_CONTA: string;
  VL_CONTA: string;
  ST_CONTA_FIXA: string;
  [key: string]: string;
}

export interface CiaAberta {
  CNPJ_CIA: string;
  DENOM_SOCIAL: string;
  DENOM_COMERC: string;
  DT_REG: string;
  DT_CONST: string;
  DT_CANCEL: string;
  MOTIVO_CANCEL: string;
  SIT: string;
  DT_INI_SIT: string;
  CD_CVM: string;
  SETOR_ATIV: string;
  TP_MERC: string;
  CATEG_REG: string;
  DT_INI_CATEG: string;
  SIT_EMISSOR: string;
  DT_INI_SIT_EMISSOR: string;
  CONTROLE_ACIONARIO: string;
  TP_ENDER: string;
  LOGRADOURO: string;
  COMPL: string;
  BAIRRO: string;
  MUN: string;
  UF: string;
  PAIS: string;
  CEP: string;
  DDD_TEL: string;
  TEL: string;
  DDD_FAX: string;
  FAX: string;
  EMAIL: string;
  TP_RESP: string;
  RESP: string;
  DT_INI_RESP: string;
  LOGRADOURO_RESP: string;
  COMPL_RESP: string;
  BAIRRO_RESP: string;
  MUN_RESP: string;
  UF_RESP: string;
  PAIS_RESP: string;
  CEP_RESP: string;
  DDD_TEL_RESP: string;
  TEL_RESP: string;
  DDD_FAX_RESP: string;
  FAX_RESP: string;
  EMAIL_RESP: string;
  [key: string]: string;
}

export interface FundoInvestimento {
  CNPJ_FUNDO: string;
  DENOM_SOCIAL: string;
  DT_REG: string;
  DT_CONST: string;
  DT_CANCEL: string;
  SIT: string;
  DT_INI_SIT: string;
  DT_INI_ATIV: string;
  DT_INI_EXERC: string;
  DT_FIM_EXERC: string;
  CLASSE: string;
  DT_INI_CLASSE: string;
  RENTAB_FUNDO: string;
  CONDOM: string;
  FUNDO_COTAS: string;
  FUNDO_EXCLUSIVO: string;
  TRIB_LPRAZO: string;
  INVEST_QUALIF: string;
  TAXA_PERFM: string;
  INF_TAXA_PERFM: string;
  TAXA_ADM: string;
  INF_TAXA_ADM: string;
  VL_PATRIM_LIQ: string;
  DT_PATRIM_LIQ: string;
  DIRETOR: string;
  CNPJ_ADMIN: string;
  ADMIN: string;
  PF_PJ_GESTOR: string;
  CPF_CNPJ_GESTOR: string;
  GESTOR: string;
  CNPJ_AUDITOR: string;
  AUDITOR: string;
  [key: string]: string;
}

export interface CvmAdministrador {
  CNPJ_CIA: string;
  DENOM_SOCIAL: string;
  DENOM_COMERC: string;
  SIT: string;
  DT_REG: string;
  DT_CANCEL: string;
  MOTIVO_CANCEL: string;
  TP_MERC: string;
  CATEG_REG: string;
  [key: string]: string;
}

export interface CvmFatoRelevante {
  CNPJ_CIA: string;
  DENOM_CIA: string;
  DT_REFER: string;
  LINK_DOC: string;
  TP_DOC: string;
  ASSUNTO: string;
  [key: string]: string;
}

export interface B3Cotacao {
  DATA: string;
  CODBDI: string;
  CODNEG: string;
  TPMERC: string;
  NOMRES: string;
  PREABE: string;
  PREMAX: string;
  PREMIN: string;
  PREULT: string;
  TOTNEG: string;
  QUATOT: string;
  VOLTOT: string;
  [key: string]: string;
}

// ── URL Builders ──────────────────────────────────────────────────

const CVM_BASE = "https://dados.cvm.gov.br/dados";

function cvmDfpUrl(ano: number): string {
  return `${CVM_BASE}/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_${ano}.zip`;
}

function cvmItrUrl(ano: number): string {
  return `${CVM_BASE}/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_${ano}.zip`;
}

function cvmCiaAbertaUrl(): string {
  return `${CVM_BASE}/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv`;
}

function cvmFundosUrl(): string {
  return `${CVM_BASE}/FI/CAD/DADOS/cad_fi.csv`;
}

function cvmAdministradoresUrl(): string {
  return `${CVM_BASE}/CIA_ABERTA/CAD/DADOS/inf_cadastral_cia_aberta.csv`;
}

function cvmFatosRelevantesUrl(ano: number): string {
  return `${CVM_BASE}/CIA_ABERTA/DOC/IPE/DADOS/ipe_cia_aberta_${ano}.csv`;
}

function b3CotacoesUrl(ano: number): string {
  return `https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_A${ano}.ZIP`;
}

// ── Source ──────────────────────────────────────────────────────────

export class MercadoSource extends Source {
  readonly name = "CVM";
  readonly baseUrl = "https://dados.cvm.gov.br";
  private readonly cache: FileCache;

  constructor(config?: {
    client?: InstanceType<typeof import("../client").BVClient>;
    cache?: FileCache;
  }) {
    super(config);
    this.cache = config?.cache ?? getDefaultCache();
  }

  /** Download and parse annual financial statements (DFP) from CVM. */
  async dfp(params: CvmYearParams): Promise<DfpItem[]> {
    this.validateAno(params.ano);
    const url = cvmDfpUrl(params.ano);
    const cacheKey = `cvm-dfp-${params.ano}`;
    return this.downloadZipAndParse<DfpItem>(url, cacheKey);
  }

  /** Download and parse quarterly financial statements (ITR) from CVM. */
  async itr(params: CvmYearParams): Promise<ItrItem[]> {
    this.validateAno(params.ano);
    const url = cvmItrUrl(params.ano);
    const cacheKey = `cvm-itr-${params.ano}`;
    return this.downloadZipAndParse<ItrItem>(url, cacheKey);
  }

  /** Download and parse the CVM registry of publicly traded companies. */
  async ciasAbertas(): Promise<CiaAberta[]> {
    const cacheKey = "cvm-cias-abertas";
    return this.downloadCsvAndParse<CiaAberta>(cvmCiaAbertaUrl(), cacheKey, "cad_cia_aberta.csv");
  }

  /** Download and parse the CVM registry of investment funds. */
  async fundos(): Promise<FundoInvestimento[]> {
    const cacheKey = "cvm-fundos";
    return this.downloadCsvAndParse<FundoInvestimento>(cvmFundosUrl(), cacheKey, "cad_fi.csv");
  }

  /** Download and parse CVM company administrators registry data. */
  async cvmAdministradores(): Promise<CvmAdministrador[]> {
    const cacheKey = "cvm-administradores";
    return this.downloadCsvAndParse<CvmAdministrador>(
      cvmAdministradoresUrl(),
      cacheKey,
      "inf_cadastral_cia_aberta.csv",
    );
  }

  /** Download and parse material fact disclosures from CVM for a given year. */
  async cvmFatosRelevantes(params: CvmYearParams): Promise<CvmFatoRelevante[]> {
    this.validateAno(params.ano);
    const cacheKey = `cvm-fatos-${params.ano}`;
    return this.downloadCsvAndParse<CvmFatoRelevante>(
      cvmFatosRelevantesUrl(params.ano),
      cacheKey,
      `ipe_cia_aberta_${params.ano}.csv`,
    );
  }

  /** Download and parse B3 stock exchange historical quotes for a given year. */
  async b3Cotacoes(params: CvmYearParams): Promise<B3Cotacao[]> {
    this.validateAno(params.ano);
    const url = b3CotacoesUrl(params.ano);
    const cacheKey = `b3-cotacoes-${params.ano}`;
    return this.downloadZipAndParse<B3Cotacao>(url, cacheKey, "latin1");
  }

  // ── Private Helpers ──────────────────────────────────────────

  private async downloadZipAndParse<T extends Record<string, string>>(
    url: string,
    cacheKey: string,
    encoding: BufferEncoding = "utf-8",
  ): Promise<T[]> {
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<T>(cached, encoding);
    }

    const zipPath = await download(url, {
      destDir: join(this.cache.getCacheDir(), cacheKey),
      filename: `${cacheKey}.zip`,
    });

    const extractDir = join(this.cache.getCacheDir(), cacheKey, "extracted");
    await extractZip(zipPath, extractDir);
    await this.cache.put(cacheKey, extractDir);

    return this.parseCsvDir<T>(extractDir, encoding);
  }

  private async downloadCsvAndParse<T extends Record<string, string>>(
    url: string,
    cacheKey: string,
    filename: string,
  ): Promise<T[]> {
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<T>(cached, "utf-8");
    }

    const destDir = join(this.cache.getCacheDir(), cacheKey, "extracted");
    const csvPath = await download(url, {
      destDir,
      filename,
    });

    await this.cache.put(cacheKey, destDir);

    return parseCsvFile<T>(csvPath, {
      delimiter: ";",
      encoding: "utf-8",
    });
  }

  private async parseCsvDir<T extends Record<string, string>>(
    dir: string,
    encoding: BufferEncoding = "utf-8",
  ): Promise<T[]> {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(dir);

    const csvFiles = entries.filter((f) => f.endsWith(".csv"));

    const allRecords: T[] = [];

    for (const csvFile of csvFiles) {
      const records = await parseCsvFile<T>(join(dir, csvFile), {
        delimiter: ";",
        encoding,
      });
      allRecords.push(...records);
    }

    return allRecords;
  }

  private validateAno(ano: number): void {
    if (!Number.isInteger(ano) || ano < 2010 || ano > new Date().getFullYear()) {
      throw new BVValidationError(
        "ano",
        `must be an integer between 2010 and ${new Date().getFullYear()}`,
        "cvm",
      );
    }
  }
}
