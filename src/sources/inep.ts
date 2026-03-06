import { join } from "node:path";
import { type FileCache, getDefaultCache } from "../cache";
import { download, extractZip } from "../download";
import { BVValidationError } from "../errors";
import { parseCsvFile } from "../parsers";
import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface InepDownloadParams {
  ano: number;
}

export interface EnemMicrodado {
  NU_INSCRICAO: string;
  NU_ANO: string;
  CO_MUNICIPIO_RESIDENCIA: string;
  NO_MUNICIPIO_RESIDENCIA: string;
  CO_UF_RESIDENCIA: string;
  SG_UF_RESIDENCIA: string;
  NU_IDADE: string;
  TP_SEXO: string;
  TP_ESTADO_CIVIL: string;
  TP_COR_RACA: string;
  TP_NACIONALIDADE: string;
  TP_ST_CONCLUSAO: string;
  TP_ANO_CONCLUIU: string;
  TP_ESCOLA: string;
  TP_ENSINO: string;
  IN_TREINEIRO: string;
  CO_MUNICIPIO_ESC: string;
  NO_MUNICIPIO_ESC: string;
  CO_UF_ESC: string;
  SG_UF_ESC: string;
  TP_DEPENDENCIA_ADM_ESC: string;
  TP_LOCALIZACAO_ESC: string;
  TP_SIT_FUNC_ESC: string;
  CO_MUNICIPIO_PROVA: string;
  NO_MUNICIPIO_PROVA: string;
  CO_UF_PROVA: string;
  SG_UF_PROVA: string;
  TP_PRESENCA_CN: string;
  TP_PRESENCA_CH: string;
  TP_PRESENCA_LC: string;
  TP_PRESENCA_MT: string;
  NU_NOTA_CN: string;
  NU_NOTA_CH: string;
  NU_NOTA_LC: string;
  NU_NOTA_MT: string;
  TP_STATUS_REDACAO: string;
  NU_NOTA_REDACAO: string;
  [key: string]: string;
}

export interface CensoEscolarEscola {
  NU_ANO_CENSO: string;
  CO_ENTIDADE: string;
  NO_ENTIDADE: string;
  CO_ORGAO_REGIONAL: string;
  TP_DEPENDENCIA: string;
  TP_LOCALIZACAO: string;
  TP_CATEGORIA_ESCOLA_PRIVADA: string;
  CO_MUNICIPIO: string;
  NO_MUNICIPIO: string;
  CO_UF: string;
  SG_UF: string;
  CO_MESORREGIAO: string;
  NO_MESORREGIAO: string;
  CO_MICRORREGIAO: string;
  NO_MICRORREGIAO: string;
  TP_SITUACAO_FUNCIONAMENTO: string;
  DT_ANO_LETIVO_INICIO: string;
  DT_ANO_LETIVO_TERMINO: string;
  IN_AGUA_POTAVEL: string;
  IN_ENERGIA_REDE_PUBLICA: string;
  IN_ESGOTO_REDE_PUBLICA: string;
  IN_LIXO_COLETA_PERIODICA: string;
  IN_SALA_DIRETORIA: string;
  IN_SALA_PROFESSOR: string;
  IN_LABORATORIO_INFORMATICA: string;
  IN_LABORATORIO_CIENCIAS: string;
  IN_SALA_ATENDIMENTO_ESPECIAL: string;
  IN_QUADRA_ESPORTES: string;
  IN_SALA_LEITURA: string;
  IN_PARQUE_INFANTIL: string;
  IN_PATIO_COBERTO: string;
  IN_PATIO_DESCOBERTO: string;
  IN_BIBLIOTECA: string;
  IN_BANHEIRO: string;
  IN_BANHEIRO_PNE: string;
  IN_COMPUTADOR: string;
  IN_INTERNET: string;
  IN_BANDA_LARGA: string;
  QT_SALAS_EXISTENTES: string;
  QT_SALAS_UTILIZADAS: string;
  QT_FUNCIONARIOS: string;
  QT_COMPUTADORES: string;
  QT_COMP_ALUNO: string;
  [key: string]: string;
}

export interface FndeRepasse {
  ANO: string;
  MES: string;
  UF: string;
  MUNICIPIO: string;
  PROGRAMA: string;
  ACAO: string;
  VALOR_TOTAL: string;
  [key: string]: string;
}

export interface CensoSuperiorIes {
  NU_ANO_CENSO: string;
  CO_IES: string;
  NO_IES: string;
  SG_IES: string;
  CO_MANTENEDORA: string;
  CO_MUNICIPIO_IES: string;
  NO_MUNICIPIO_IES: string;
  CO_UF_IES: string;
  SG_UF_IES: string;
  NO_REGIAO_IES: string;
  TP_ORGANIZACAO_ACADEMICA: string;
  TP_CATEGORIA_ADMINISTRATIVA: string;
  QT_TEC_TOTAL: string;
  QT_DOC_TOTAL: string;
  QT_DOC_EX: string;
  IN_ACESSO_PORTAL_CAPES: string;
  IN_ACESSO_OUTRAS_BASES: string;
  IN_ASSINA_OUTRA_BASE: string;
  QT_LIVRO_ELETRONICO: string;
  QT_PERIODICO_ELETRONICO: string;
  [key: string]: string;
}

// ── URL Builders ──────────────────────────────────────────────────

const INEP_BASE = "https://download.inep.gov.br/microdados";

const FNDE_CSV_URL =
  "https://www.fnde.gov.br/dadosabertos/dataset/recursos-repassados-fnde/resource/fnde_repasses.csv";

function enemUrl(ano: number): string {
  return `${INEP_BASE}/microdados_enem_${ano}.zip`;
}

function censoEscolarUrl(ano: number): string {
  return `${INEP_BASE}/microdados_educacao_basica_${ano}.zip`;
}

function censoSuperiorUrl(ano: number): string {
  return `${INEP_BASE}/microdados_censo_da_educacao_superior_${ano}.zip`;
}

// ── Source ──────────────────────────────────────────────────────────

export class InepSource extends Source {
  readonly name = "INEP";
  readonly baseUrl = "https://download.inep.gov.br";
  private readonly cache: FileCache;

  constructor(config?: {
    client?: InstanceType<typeof import("../client").BVClient>;
    cache?: FileCache;
  }) {
    super(config);
    this.cache = config?.cache ?? getDefaultCache();
  }

  async enem(params: InepDownloadParams): Promise<EnemMicrodado[]> {
    this.validateAno(params.ano, 1998, "ENEM");
    return this.downloadAndParse<EnemMicrodado>(enemUrl(params.ano), `inep-enem-${params.ano}`);
  }

  async censoEscolar(params: InepDownloadParams): Promise<CensoEscolarEscola[]> {
    this.validateAno(params.ano, 2007, "Censo Escolar");
    return this.downloadAndParse<CensoEscolarEscola>(
      censoEscolarUrl(params.ano),
      `inep-censo-escolar-${params.ano}`,
    );
  }

  async censoSuperior(params: InepDownloadParams): Promise<CensoSuperiorIes[]> {
    this.validateAno(params.ano, 2009, "Censo Superior");
    return this.downloadAndParse<CensoSuperiorIes>(
      censoSuperiorUrl(params.ano),
      `inep-censo-superior-${params.ano}`,
    );
  }

  async fnde(): Promise<FndeRepasse[]> {
    const cacheKey = "inep-fnde";
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return parseCsvFile<FndeRepasse>(join(cached, "fnde_repasses.csv"), {
        delimiter: ";",
        encoding: "latin1",
      });
    }

    const downloadDir = join(this.cache.getCacheDir(), cacheKey);
    const csvPath = await download(FNDE_CSV_URL, {
      destDir: downloadDir,
      filename: "fnde_repasses.csv",
    });

    await this.cache.put(cacheKey, downloadDir);

    return parseCsvFile<FndeRepasse>(csvPath, {
      delimiter: ";",
      encoding: "latin1",
    });
  }

  // ── Private Helpers ──────────────────────────────────────────

  private async downloadAndParse<T extends Record<string, string>>(
    url: string,
    cacheKey: string,
  ): Promise<T[]> {
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<T>(cached);
    }

    const downloadDir = join(this.cache.getCacheDir(), cacheKey);
    const zipPath = await download(url, {
      destDir: downloadDir,
      filename: `${cacheKey}.zip`,
    });

    const extractDir = join(downloadDir, "extracted");
    await extractZip(zipPath, extractDir);
    await this.cache.put(cacheKey, extractDir);

    return this.parseCsvDir<T>(extractDir);
  }

  private async parseCsvDir<T extends Record<string, string>>(dir: string): Promise<T[]> {
    const files = await this.findCsvFiles(dir);

    const allRecords: T[] = [];
    for (const csvFile of files) {
      const records = await parseCsvFile<T>(csvFile, {
        delimiter: ";",
        encoding: "latin1",
      });
      allRecords.push(...records);
    }
    return allRecords;
  }

  private async findCsvFiles(dir: string): Promise<string[]> {
    const { readdir, stat } = await import("node:fs/promises");
    const entries = await readdir(dir);
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const s = await stat(fullPath);
      if (s.isDirectory()) {
        files.push(...(await this.findCsvFiles(fullPath)));
      } else if (entry.toLowerCase().endsWith(".csv")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  private validateAno(ano: number, minYear: number, label: string): void {
    if (!Number.isInteger(ano) || ano < minYear || ano > new Date().getFullYear()) {
      throw new BVValidationError(
        "ano",
        `must be an integer between ${minYear} and ${new Date().getFullYear()} for ${label}`,
        "inep",
      );
    }
  }
}
