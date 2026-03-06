import { join } from "node:path";
import { type FileCache, getDefaultCache } from "../cache";
import { download, extractZip } from "../download";
import { BVValidationError } from "../errors";
import { parseCsvFile } from "../parsers";
import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface ReceitaDownloadParams {
  chunk?: number; // 0-9, defaults to 0
}

export interface Empresa {
  CNPJ_BASICO: string;
  RAZAO_SOCIAL: string;
  NATUREZA_JURIDICA: string;
  QUALIFICACAO_RESPONSAVEL: string;
  CAPITAL_SOCIAL: string;
  PORTE_EMPRESA: string;
  ENTE_FEDERATIVO_RESPONSAVEL: string;
  [key: string]: string;
}

export interface Estabelecimento {
  CNPJ_BASICO: string;
  CNPJ_ORDEM: string;
  CNPJ_DV: string;
  IDENTIFICADOR_MATRIZ_FILIAL: string;
  NOME_FANTASIA: string;
  SITUACAO_CADASTRAL: string;
  DATA_SITUACAO_CADASTRAL: string;
  MOTIVO_SITUACAO_CADASTRAL: string;
  NOME_CIDADE_EXTERIOR: string;
  PAIS: string;
  DATA_INICIO_ATIVIDADE: string;
  CNAE_FISCAL_PRINCIPAL: string;
  CNAE_FISCAL_SECUNDARIA: string;
  TIPO_LOGRADOURO: string;
  LOGRADOURO: string;
  NUMERO: string;
  COMPLEMENTO: string;
  BAIRRO: string;
  CEP: string;
  UF: string;
  MUNICIPIO: string;
  DDD_1: string;
  TELEFONE_1: string;
  DDD_2: string;
  TELEFONE_2: string;
  DDD_FAX: string;
  FAX: string;
  CORREIO_ELETRONICO: string;
  SITUACAO_ESPECIAL: string;
  DATA_SITUACAO_ESPECIAL: string;
  [key: string]: string;
}

export interface Socio {
  CNPJ_BASICO: string;
  IDENTIFICADOR_SOCIO: string;
  NOME_SOCIO_RAZAO_SOCIAL: string;
  CPF_CNPJ_SOCIO: string;
  QUALIFICACAO_SOCIO: string;
  DATA_ENTRADA_SOCIEDADE: string;
  PAIS: string;
  REPRESENTANTE_LEGAL: string;
  NOME_REPRESENTANTE: string;
  QUALIFICACAO_REPRESENTANTE_LEGAL: string;
  FAIXA_ETARIA: string;
  [key: string]: string;
}

export interface SimplesNacional {
  CNPJ_BASICO: string;
  OPCAO_SIMPLES: string;
  DATA_OPCAO_SIMPLES: string;
  DATA_EXCLUSAO_SIMPLES: string;
  OPCAO_MEI: string;
  DATA_OPCAO_MEI: string;
  DATA_EXCLUSAO_MEI: string;
  [key: string]: string;
}

// ── Column Definitions (Receita CSVs have no header row) ──────────

const EMPRESA_COLUMNS: string[] = [
  "CNPJ_BASICO",
  "RAZAO_SOCIAL",
  "NATUREZA_JURIDICA",
  "QUALIFICACAO_RESPONSAVEL",
  "CAPITAL_SOCIAL",
  "PORTE_EMPRESA",
  "ENTE_FEDERATIVO_RESPONSAVEL",
];

const ESTABELECIMENTO_COLUMNS: string[] = [
  "CNPJ_BASICO",
  "CNPJ_ORDEM",
  "CNPJ_DV",
  "IDENTIFICADOR_MATRIZ_FILIAL",
  "NOME_FANTASIA",
  "SITUACAO_CADASTRAL",
  "DATA_SITUACAO_CADASTRAL",
  "MOTIVO_SITUACAO_CADASTRAL",
  "NOME_CIDADE_EXTERIOR",
  "PAIS",
  "DATA_INICIO_ATIVIDADE",
  "CNAE_FISCAL_PRINCIPAL",
  "CNAE_FISCAL_SECUNDARIA",
  "TIPO_LOGRADOURO",
  "LOGRADOURO",
  "NUMERO",
  "COMPLEMENTO",
  "BAIRRO",
  "CEP",
  "UF",
  "MUNICIPIO",
  "DDD_1",
  "TELEFONE_1",
  "DDD_2",
  "TELEFONE_2",
  "DDD_FAX",
  "FAX",
  "CORREIO_ELETRONICO",
  "SITUACAO_ESPECIAL",
  "DATA_SITUACAO_ESPECIAL",
];

const SOCIO_COLUMNS: string[] = [
  "CNPJ_BASICO",
  "IDENTIFICADOR_SOCIO",
  "NOME_SOCIO_RAZAO_SOCIAL",
  "CPF_CNPJ_SOCIO",
  "QUALIFICACAO_SOCIO",
  "DATA_ENTRADA_SOCIEDADE",
  "PAIS",
  "REPRESENTANTE_LEGAL",
  "NOME_REPRESENTANTE",
  "QUALIFICACAO_REPRESENTANTE_LEGAL",
  "FAIXA_ETARIA",
];

const SIMPLES_COLUMNS: string[] = [
  "CNPJ_BASICO",
  "OPCAO_SIMPLES",
  "DATA_OPCAO_SIMPLES",
  "DATA_EXCLUSAO_SIMPLES",
  "OPCAO_MEI",
  "DATA_OPCAO_MEI",
  "DATA_EXCLUSAO_MEI",
];

// ── URL Builder ──────────────────────────────────────────────────

const RECEITA_BASE = "https://dadosabertos.rfb.gov.br/CNPJ";

function receitaZipUrl(dataset: string, chunk?: number): string {
  const suffix = chunk !== undefined ? String(chunk) : "";
  return `${RECEITA_BASE}/${dataset}${suffix}.zip`;
}

// ── Source ──────────────────────────────────────────────────────────

export class ReceitaSource extends Source {
  readonly name = "Receita Federal";
  readonly baseUrl = "https://dadosabertos.rfb.gov.br";
  private readonly cache: FileCache;

  constructor(config?: {
    client?: InstanceType<typeof import("../client").BVClient>;
    cache?: FileCache;
  }) {
    super(config);
    this.cache = config?.cache ?? getDefaultCache();
  }

  async empresas(params?: ReceitaDownloadParams): Promise<Empresa[]> {
    const chunk = params?.chunk ?? 0;
    this.validateChunk(chunk);
    const url = receitaZipUrl("Empresas", chunk);
    return this.downloadAndParse<Empresa>(url, `receita-empresas-${chunk}`, EMPRESA_COLUMNS);
  }

  async estabelecimentos(params?: ReceitaDownloadParams): Promise<Estabelecimento[]> {
    const chunk = params?.chunk ?? 0;
    this.validateChunk(chunk);
    const url = receitaZipUrl("Estabelecimentos", chunk);
    return this.downloadAndParse<Estabelecimento>(
      url,
      `receita-estabelecimentos-${chunk}`,
      ESTABELECIMENTO_COLUMNS,
    );
  }

  async socios(params?: ReceitaDownloadParams): Promise<Socio[]> {
    const chunk = params?.chunk ?? 0;
    this.validateChunk(chunk);
    const url = receitaZipUrl("Socios", chunk);
    return this.downloadAndParse<Socio>(url, `receita-socios-${chunk}`, SOCIO_COLUMNS);
  }

  async simples(): Promise<SimplesNacional[]> {
    const url = receitaZipUrl("Simples");
    return this.downloadAndParse<SimplesNacional>(url, "receita-simples", SIMPLES_COLUMNS);
  }

  // ── Private Helpers ──────────────────────────────────────────

  private async downloadAndParse<T extends Record<string, string>>(
    url: string,
    cacheKey: string,
    columns: string[],
  ): Promise<T[]> {
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseReceitaCsvDir<T>(cached, columns);
    }

    const zipPath = await download(url, {
      destDir: join(this.cache.getCacheDir(), cacheKey),
      filename: `${cacheKey}.zip`,
    });

    const extractDir = join(this.cache.getCacheDir(), cacheKey, "extracted");
    await extractZip(zipPath, extractDir);
    await this.cache.put(cacheKey, extractDir);

    return this.parseReceitaCsvDir<T>(extractDir, columns);
  }

  private async parseReceitaCsvDir<T extends Record<string, string>>(
    dir: string,
    columns: string[],
  ): Promise<T[]> {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(dir);

    // Receita Federal ZIPs contain CSV data files (various extensions)
    const csvFiles = entries.filter((f) => !f.endsWith(".zip") && !f.startsWith("."));

    const allRecords: T[] = [];

    for (const csvFile of csvFiles) {
      const records = await parseCsvFile<T>(join(dir, csvFile), {
        delimiter: ";",
        encoding: "latin1",
        columns,
      });
      allRecords.push(...records);
    }

    return allRecords;
  }

  private validateChunk(chunk: number): void {
    if (!Number.isInteger(chunk) || chunk < 0 || chunk > 9) {
      throw new BVValidationError("chunk", "must be an integer between 0 and 9", "receita");
    }
  }
}
