import { join } from "node:path";
import { type FileCache, getDefaultCache } from "../cache";
import { download, extractZip } from "../download";
import { BVValidationError } from "../errors";
import { parseCsvFile } from "../parsers";
import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface TseDownloadParams {
  ano: number;
  estado?: string;
}

export interface Candidatura {
  DT_GERACAO: string;
  HH_GERACAO: string;
  ANO_ELEICAO: string;
  CD_TIPO_ELEICAO: string;
  NM_TIPO_ELEICAO: string;
  NR_TURNO: string;
  CD_ELEICAO: string;
  DS_ELEICAO: string;
  SG_UF: string;
  SG_UE: string;
  NM_UE: string;
  CD_CARGO: string;
  DS_CARGO: string;
  SQ_CANDIDATO: string;
  NR_CANDIDATO: string;
  NM_CANDIDATO: string;
  NM_URNA_CANDIDATO: string;
  NM_SOCIAL_CANDIDATO: string;
  NR_CPF_CANDIDATO: string;
  NM_EMAIL: string;
  CD_SITUACAO_CANDIDATURA: string;
  DS_SITUACAO_CANDIDATURA: string;
  CD_DETALHE_SITUACAO_CAND: string;
  DS_DETALHE_SITUACAO_CAND: string;
  TP_AGREMIACAO: string;
  NR_PARTIDO: string;
  SG_PARTIDO: string;
  NM_PARTIDO: string;
  DT_NASCIMENTO: string;
  NR_TITULO_ELEITORAL_CANDIDATO: string;
  NR_IDADE_DATA_POSSE: string;
  CD_GENERO: string;
  DS_GENERO: string;
  CD_GRAU_INSTRUCAO: string;
  DS_GRAU_INSTRUCAO: string;
  CD_ESTADO_CIVIL: string;
  DS_ESTADO_CIVIL: string;
  CD_COR_RACA: string;
  DS_COR_RACA: string;
  CD_OCUPACAO: string;
  DS_OCUPACAO: string;
  CD_MUNICIPIO_NASCIMENTO: string;
  NM_MUNICIPIO_NASCIMENTO: string;
  SG_UF_NASCIMENTO: string;
  CD_SIT_TOT_TURNO: string;
  DS_SIT_TOT_TURNO: string;
  [key: string]: string;
}

export interface BemCandidato {
  DT_GERACAO: string;
  HH_GERACAO: string;
  ANO_ELEICAO: string;
  CD_TIPO_ELEICAO: string;
  NM_TIPO_ELEICAO: string;
  SG_UF: string;
  SG_UE: string;
  NM_UE: string;
  SQ_CANDIDATO: string;
  NR_ORDEM_CANDIDATO: string;
  CD_TIPO_BEM_CANDIDATO: string;
  DS_TIPO_BEM_CANDIDATO: string;
  DS_BEM_CANDIDATO: string;
  VR_BEM_CANDIDATO: string;
  [key: string]: string;
}

export interface Filiado {
  DT_GERACAO: string;
  HH_GERACAO: string;
  NR_PARTIDO: string;
  SG_PARTIDO: string;
  NM_PARTIDO: string;
  DT_EXTRACAO: string;
  TP_FILIACAO: string;
  NR_FILIADO: string;
  NM_FILIADO: string;
  TP_SITUACAO_REGISTRO: string;
  DT_FILIACAO: string;
  DT_DESFILIACAO: string;
  DT_CANCELAMENTO: string;
  DT_REGULARIZACAO: string;
  CD_MUNICIPIO: string;
  NM_MUNICIPIO: string;
  SG_UF: string;
  CD_SECAO_ELEITORAL: string;
  CD_ZONA_ELEITORAL: string;
  [key: string]: string;
}

export interface ResultadoVotacao {
  DT_GERACAO: string;
  HH_GERACAO: string;
  ANO_ELEICAO: string;
  CD_TIPO_ELEICAO: string;
  NM_TIPO_ELEICAO: string;
  NR_TURNO: string;
  CD_ELEICAO: string;
  DS_ELEICAO: string;
  SG_UF: string;
  SG_UE: string;
  NM_UE: string;
  CD_MUNICIPIO: string;
  NM_MUNICIPIO: string;
  NR_ZONA: string;
  CD_CARGO: string;
  DS_CARGO: string;
  SQ_CANDIDATO: string;
  NR_CANDIDATO: string;
  NM_CANDIDATO: string;
  NM_URNA_CANDIDATO: string;
  NR_PARTIDO: string;
  SG_PARTIDO: string;
  NM_PARTIDO: string;
  QT_VOTOS_NOMINAIS: string;
  CD_SIT_TOT_TURNO: string;
  DS_SIT_TOT_TURNO: string;
  [key: string]: string;
}

export interface PrestacaoConta {
  SQ_CANDIDATO: string;
  NR_CPF_CNPJ_DOADOR: string;
  NM_DOADOR: string;
  VR_RECEITA: string;
  DS_ORIGEM_RECEITA: string;
  DS_NATUREZA_RECEITA: string;
  [key: string]: string;
}

export interface Eleitor {
  NR_ZONA: string;
  NR_SECAO: string;
  CD_MUNICIPIO: string;
  NM_MUNICIPIO: string;
  SG_UF: string;
  QT_ELEITORES_PERFIL: string;
  CD_GENERO: string;
  CD_FAIXA_ETARIA: string;
  CD_GRAU_ESCOLARIDADE: string;
  [key: string]: string;
}

export interface BoletimUrna {
  SG_UF: string;
  CD_MUNICIPIO: string;
  NR_ZONA: string;
  NR_SECAO: string;
  NR_VOTAVEL: string;
  QT_VOTOS: string;
  DS_CARGO: string;
  [key: string]: string;
}

// ── URL Builders ──────────────────────────────────────────────────

const TSE_CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele";

function tseZipUrl(dataset: string, ano: number): string {
  return `${TSE_CDN}/${dataset}/${dataset}_${ano}.zip`;
}

function tseFilliadosZipUrl(partido: string, estado: string): string {
  return `${TSE_CDN}/filiados/filiados_${partido}_${estado}.zip`;
}

// ── Source ──────────────────────────────────────────────────────────

export class TseSource extends Source {
  readonly name = "TSE";
  readonly baseUrl = "https://cdn.tse.jus.br";
  private readonly cache: FileCache;

  constructor(config?: {
    client?: InstanceType<typeof import("../client").BVClient>;
    cache?: FileCache;
  }) {
    super(config);
    this.cache = config?.cache ?? getDefaultCache();
  }

  async candidaturas(params: TseDownloadParams): Promise<Candidatura[]> {
    this.validateAno(params.ano);
    const url = tseZipUrl("consulta_cand", params.ano);
    return this.downloadAndParse<Candidatura>(url, `tse-cand-${params.ano}`, params);
  }

  async bens(params: TseDownloadParams): Promise<BemCandidato[]> {
    this.validateAno(params.ano);
    const url = tseZipUrl("bem_candidato", params.ano);
    return this.downloadAndParse<BemCandidato>(url, `tse-bens-${params.ano}`, params);
  }

  async resultados(params: TseDownloadParams): Promise<ResultadoVotacao[]> {
    this.validateAno(params.ano);
    const url = tseZipUrl("votacao_candidato_munzona", params.ano);
    return this.downloadAndParse<ResultadoVotacao>(url, `tse-result-${params.ano}`, params);
  }

  async prestacaoContas(params: TseDownloadParams): Promise<PrestacaoConta[]> {
    this.validateAno(params.ano);
    const url = tseZipUrl("prestacao_contas", params.ano);
    return this.downloadAndParse<PrestacaoConta>(url, `tse-prestacao-${params.ano}`, params);
  }

  async eleitorado(params: TseDownloadParams): Promise<Eleitor[]> {
    this.validateAno(params.ano);
    const url = tseZipUrl("eleitorado", params.ano);
    return this.downloadAndParse<Eleitor>(url, `tse-eleitorado-${params.ano}`, params);
  }

  async boletins(params: TseDownloadParams): Promise<BoletimUrna[]> {
    this.validateAno(params.ano);
    const url = tseZipUrl("boletim_urna", params.ano);
    return this.downloadAndParse<BoletimUrna>(url, `tse-boletim-${params.ano}`, params);
  }

  async filiados(params: { partido: string; estado: string }): Promise<Filiado[]> {
    if (!params.partido || !params.estado) {
      throw new BVValidationError("partido/estado", "must be provided", "tse");
    }

    const partido = params.partido.toUpperCase();
    const estado = params.estado.toUpperCase();

    const url = tseFilliadosZipUrl(partido, estado);
    const cacheKey = `tse-filiados-${partido}-${estado}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseTseCsvDir<Filiado>(cached);
    }

    const zipPath = await download(url, {
      destDir: join(this.cache.getCacheDir(), cacheKey),
      filename: `filiados_${partido}_${estado}.zip`,
    });

    const extractDir = join(this.cache.getCacheDir(), cacheKey, "extracted");
    await extractZip(zipPath, extractDir);
    await this.cache.put(cacheKey, extractDir);

    return this.parseTseCsvDir<Filiado>(extractDir);
  }

  // ── Private Helpers ──────────────────────────────────────────

  private async downloadAndParse<T extends Record<string, string>>(
    url: string,
    cacheKey: string,
    params: TseDownloadParams,
  ): Promise<T[]> {
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseTseCsvDir<T>(cached, params.estado);
    }

    const zipPath = await download(url, {
      destDir: join(this.cache.getCacheDir(), cacheKey),
      filename: `${cacheKey}.zip`,
    });

    const extractDir = join(this.cache.getCacheDir(), cacheKey, "extracted");
    await extractZip(zipPath, extractDir);
    await this.cache.put(cacheKey, extractDir);

    return this.parseTseCsvDir<T>(extractDir, params.estado);
  }

  private async parseTseCsvDir<T extends Record<string, string>>(
    dir: string,
    estado?: string,
  ): Promise<T[]> {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(dir);

    const csvFiles = entries
      .filter((f) => f.endsWith(".csv"))
      .filter((f) => {
        if (!estado) return true;
        const upper = estado.toUpperCase();
        return f.toUpperCase().includes(`_${upper}.`) || f.toUpperCase().includes(`_${upper}_`);
      });

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
    if (!Number.isInteger(ano) || ano < 1998 || ano > new Date().getFullYear()) {
      throw new BVValidationError(
        "ano",
        `must be an integer between 1998 and ${new Date().getFullYear()}`,
        "tse",
      );
    }
  }
}
