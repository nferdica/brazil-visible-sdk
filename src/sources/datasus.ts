import { join } from "node:path";
import { type FileCache, getDefaultCache } from "../cache";
import { download } from "../download";
import { BVError, BVValidationError } from "../errors";
import { parseCsvFile } from "../parsers";
import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface DataSusParams {
  ano: number;
  uf?: string;
}

export interface CnesEstabelecimento {
  CNES: string;
  CODUFMUN: string;
  COD_CEP: string;
  CPF_CNPJ: string;
  RAZAO_SOC: string;
  FANTASIA: string;
  NATUREZA: string;
  TIPO_ESTAB: string;
  TP_GESTAO: string;
  VINC_SUS: string;
  [key: string]: string;
}

export interface SimObito {
  DTOBITO: string;
  DTNASC: string;
  SEXO: string;
  RACACOR: string;
  ESTCIV: string;
  ESC: string;
  OCUP: string;
  CODMUNRES: string;
  CAUSABAS: string;
  IDADE: string;
  LINHAA: string;
  LINHAB: string;
  [key: string]: string;
}

export interface SihInternacao {
  UF_ZI: string;
  ANO_CMPT: string;
  MES_CMPT: string;
  ESPEC: string;
  CGC_HOSP: string;
  MUNIC_RES: string;
  MUNIC_MOV: string;
  PROC_REA: string;
  VAL_TOT: string;
  DIAG_PRINC: string;
  IDADE: string;
  SEXO: string;
  [key: string]: string;
}

export interface SinanNotificacao {
  DT_NOTIFIC: string;
  SG_UF_NOT: string;
  ID_MUNICIP: string;
  ID_AGRAVO: string;
  DT_SIN_PRI: string;
  CS_SEXO: string;
  NU_IDADE_N: string;
  CS_RACA: string;
  CS_ESCOL_N: string;
  CLASSI_FIN: string;
  EVOLUCAO: string;
  [key: string]: string;
}

export interface SinascNascimento {
  DTNASC: string;
  CODMUNNASC: string;
  IDADEMAE: string;
  ESCMAE: string;
  CODOCUPMAE: string;
  QTDFILVIVO: string;
  GESTACAO: string;
  GRAVIDEZ: string;
  PARTO: string;
  PESO: string;
  SEXO: string;
  RACACOR: string;
  [key: string]: string;
}

// ── Source ──────────────────────────────────────────────────────────

const DATASUS_FTP = "ftp://ftp.datasus.gov.br/dissemin/publicos";
const DATASUS_CSV_BASE = "https://datasus.saude.gov.br/transferencia-de-arquivos";

export class DataSusSource extends Source {
  readonly name = "DATASUS";
  readonly baseUrl = "https://datasus.saude.gov.br";
  private readonly cache: FileCache;

  constructor(config?: {
    client?: InstanceType<typeof import("../client").BVClient>;
    cache?: FileCache;
  }) {
    super(config);
    this.cache = config?.cache ?? getDefaultCache();
  }

  /** Download and parse CNES health facility registry data. */
  async cnes(params: DataSusParams): Promise<CnesEstabelecimento[]> {
    this.validateAno(params.ano);
    const uf = params.uf?.toUpperCase() ?? "BR";
    const cacheKey = `datasus-cnes-${params.ano}-${uf}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<CnesEstabelecimento>(cached);
    }

    const url = `${DATASUS_FTP}/CNES/200508_/Dados/ST/ST${uf}${String(params.ano).slice(2)}12.csv`;

    try {
      const downloadDir = join(this.cache.getCacheDir(), cacheKey);
      const filePath = await download(url, {
        destDir: downloadDir,
        filename: `cnes_${uf}_${params.ano}.csv`,
      });

      await this.cache.put(cacheKey, downloadDir);
      return parseCsvFile<CnesEstabelecimento>(filePath, {
        delimiter: ";",
        encoding: "latin1",
      });
    } catch {
      throw new BVError(
        `DATASUS CNES: Dados FTP podem nao estar disponiveis via HTTP. Arquivos originais em formato DBC requerem conversao especial. Use o TABNET online em ${DATASUS_CSV_BASE} como alternativa.`,
        "datasus",
      );
    }
  }

  /** Download and parse SIM mortality records. */
  async sim(params: DataSusParams): Promise<SimObito[]> {
    this.validateAno(params.ano);
    const uf = params.uf?.toUpperCase() ?? "BR";
    const cacheKey = `datasus-sim-${params.ano}-${uf}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<SimObito>(cached);
    }

    const url = `${DATASUS_FTP}/SIM/CID10/DORES/DO${uf}${params.ano}.csv`;

    try {
      const downloadDir = join(this.cache.getCacheDir(), cacheKey);
      const filePath = await download(url, {
        destDir: downloadDir,
        filename: `sim_${uf}_${params.ano}.csv`,
      });

      await this.cache.put(cacheKey, downloadDir);
      return parseCsvFile<SimObito>(filePath, {
        delimiter: ";",
        encoding: "latin1",
      });
    } catch {
      throw new BVError(
        `DATASUS SIM: Dados FTP podem nao estar disponiveis via HTTP. Arquivos originais em formato DBC requerem conversao especial. Use o TABNET online em ${DATASUS_CSV_BASE} como alternativa.`,
        "datasus",
      );
    }
  }

  /** Download and parse SIH hospital admission records. */
  async sih(params: DataSusParams): Promise<SihInternacao[]> {
    this.validateAno(params.ano);
    const uf = params.uf?.toUpperCase() ?? "BR";
    const cacheKey = `datasus-sih-${params.ano}-${uf}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<SihInternacao>(cached);
    }

    const url = `${DATASUS_FTP}/SIHSUS/200801_/Dados/RD${uf}${String(params.ano).slice(2)}01.csv`;

    try {
      const downloadDir = join(this.cache.getCacheDir(), cacheKey);
      const filePath = await download(url, {
        destDir: downloadDir,
        filename: `sih_${uf}_${params.ano}.csv`,
      });

      await this.cache.put(cacheKey, downloadDir);
      return parseCsvFile<SihInternacao>(filePath, {
        delimiter: ";",
        encoding: "latin1",
      });
    } catch {
      throw new BVError(
        `DATASUS SIH: Dados FTP podem nao estar disponiveis via HTTP. Arquivos originais em formato DBC requerem conversao especial. Use o TABNET online em ${DATASUS_CSV_BASE} como alternativa.`,
        "datasus",
      );
    }
  }

  /** Download and parse SINAN notifiable disease records. */
  async sinan(params: DataSusParams): Promise<SinanNotificacao[]> {
    this.validateAno(params.ano);
    const uf = params.uf?.toUpperCase() ?? "BR";
    const cacheKey = `datasus-sinan-${params.ano}-${uf}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<SinanNotificacao>(cached);
    }

    const url = `${DATASUS_FTP}/SINAN/DADOS/FINALDENG${uf}${params.ano}.csv`;

    try {
      const downloadDir = join(this.cache.getCacheDir(), cacheKey);
      const filePath = await download(url, {
        destDir: downloadDir,
        filename: `sinan_${uf}_${params.ano}.csv`,
      });

      await this.cache.put(cacheKey, downloadDir);
      return parseCsvFile<SinanNotificacao>(filePath, {
        delimiter: ";",
        encoding: "latin1",
      });
    } catch {
      throw new BVError(
        `DATASUS SINAN: Dados FTP podem nao estar disponiveis via HTTP. Arquivos originais em formato DBC requerem conversao especial. Use o TABNET online em ${DATASUS_CSV_BASE} como alternativa.`,
        "datasus",
      );
    }
  }

  /** Download and parse SINASC live birth records. */
  async sinasc(params: DataSusParams): Promise<SinascNascimento[]> {
    this.validateAno(params.ano);
    const uf = params.uf?.toUpperCase() ?? "BR";
    const cacheKey = `datasus-sinasc-${params.ano}-${uf}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<SinascNascimento>(cached);
    }

    const url = `${DATASUS_FTP}/SINASC/NOV/DNRES/DN${uf}${params.ano}.csv`;

    try {
      const downloadDir = join(this.cache.getCacheDir(), cacheKey);
      const filePath = await download(url, {
        destDir: downloadDir,
        filename: `sinasc_${uf}_${params.ano}.csv`,
      });

      await this.cache.put(cacheKey, downloadDir);
      return parseCsvFile<SinascNascimento>(filePath, {
        delimiter: ";",
        encoding: "latin1",
      });
    } catch {
      throw new BVError(
        `DATASUS SINASC: Dados FTP podem nao estar disponiveis via HTTP. Arquivos originais em formato DBC requerem conversao especial. Use o TABNET online em ${DATASUS_CSV_BASE} como alternativa.`,
        "datasus",
      );
    }
  }

  private async parseCsvDir<T extends Record<string, string>>(dir: string): Promise<T[]> {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(dir);
    const csvFiles = entries.filter((f) => f.toLowerCase().endsWith(".csv"));

    const allRecords: T[] = [];
    for (const csvFile of csvFiles) {
      const records = await parseCsvFile<T>(join(dir, csvFile), {
        delimiter: ";",
        encoding: "latin1",
      });
      allRecords.push(...records);
    }
    return allRecords;
  }

  private validateAno(ano: number): void {
    if (!Number.isInteger(ano) || ano < 1996 || ano > new Date().getFullYear()) {
      throw new BVValidationError(
        "ano",
        `must be an integer between 1996 and ${new Date().getFullYear()}`,
        "datasus",
      );
    }
  }
}
