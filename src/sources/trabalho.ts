import { join } from "node:path";
import { type FileCache, getDefaultCache } from "../cache";
import { download, extractZip } from "../download";
import { BVValidationError } from "../errors";
import { parseCsvFile } from "../parsers";
import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface TrabalhoDownloadParams {
  ano: number;
}

export interface CagedItem {
  competencia: string;
  regiao: string;
  uf: string;
  municipio: string;
  secao: string;
  subclasse: string;
  saldomovimentacao: string;
  admissoes: string;
  desligamentos: string;
  graudeinstrucao: string;
  idade: string;
  sexo: string;
  racacor: string;
  tipo_empregador: string;
  tipo_estabelecimento: string;
  tipo_movimentacao: string;
  tipo_deficiencia: string;
  indtrabintermitente: string;
  indtrabparcial: string;
  salario: string;
  horascontratuais: string;
  fonte: string;
  [key: string]: string;
}

export interface RaisEstabelecimento {
  "Bairros SP": string;
  "Bairros Fortaleza": string;
  "Bairros RJ": string;
  "Causa Afastamento 1": string;
  "Causa Afastamento 2": string;
  "Causa Afastamento 3": string;
  CNAE_2_0_Classe: string;
  CNAE_2_0_Subclasse: string;
  CBO_Ocupacao_2002: string;
  Faixa_Etaria: string;
  Faixa_Hora_Contrat: string;
  Faixa_Remun_Dezem_SM: string;
  Faixa_Remun_Media_SM: string;
  Faixa_Tempo_Emprego: string;
  Grau_Instrucao_2005_2017: string;
  Ind_CEI_Vinculado: string;
  Ind_Simples: string;
  Municipio: string;
  Municipio_Trab: string;
  Nacionalidade: string;
  Natureza_Juridica: string;
  Ind_Portador_Defic: string;
  Qtd_Dias_Afastamento: string;
  Raca_Cor: string;
  Rem_Dezembro_Nom: string;
  Rem_Dezembro_SM: string;
  Rem_Media_Nom: string;
  Rem_Media_SM: string;
  Sexo_Trabalhador: string;
  Tamanho_Estabelecimento: string;
  Tempo_Emprego: string;
  Tipo_Admissao: string;
  Tipo_Estab: string;
  Tipo_Defic: string;
  Tipo_Vinculo: string;
  IBGE_Subsetor: string;
  Vl_Remun_Dezembro_Nom: string;
  Vl_Remun_Dezembro_SM: string;
  Vl_Remun_Media_Nom: string;
  Vl_Remun_Media_SM: string;
  Ano_Chegada_Brasil: string;
  [key: string]: string;
}

// ── Source ──────────────────────────────────────────────────────────

const CAGED_HTTP_BASE = "https://bi.mte.gov.br/bgcaged";

export class TrabalhoSource extends Source {
  readonly name = "Trabalho";
  readonly baseUrl = "https://bi.mte.gov.br";
  private readonly cache: FileCache;

  constructor(config?: {
    client?: InstanceType<typeof import("../client").BVClient>;
    cache?: FileCache;
  }) {
    super(config);
    this.cache = config?.cache ?? getDefaultCache();
  }

  /** Download and parse CAGED formal employment data for a given year. */
  async caged(params: TrabalhoDownloadParams): Promise<CagedItem[]> {
    this.validateAno(params.ano, 2020, "CAGED Novo");

    const cacheKey = `trabalho-caged-${params.ano}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<CagedItem>(cached);
    }

    const url = `${CAGED_HTTP_BASE}/caged_download/${params.ano}/cagedmov${params.ano}.zip`;

    const downloadDir = join(this.cache.getCacheDir(), cacheKey);
    const filePath = await download(url, {
      destDir: downloadDir,
      filename: `cagedmov${params.ano}.zip`,
    });

    const extractDir = join(downloadDir, "extracted");
    await extractZip(filePath, extractDir);
    await this.cache.put(cacheKey, extractDir);

    return this.parseCsvDir<CagedItem>(extractDir);
  }

  /** Download and parse RAIS annual social information report for a given year. */
  async rais(params: TrabalhoDownloadParams): Promise<RaisEstabelecimento[]> {
    this.validateAno(params.ano, 2002, "RAIS");

    const cacheKey = `trabalho-rais-${params.ano}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<RaisEstabelecimento>(cached);
    }

    const url = `${CAGED_HTTP_BASE}/rais_download/${params.ano}/RAIS_VINC_PUB_${params.ano}.zip`;

    const downloadDir = join(this.cache.getCacheDir(), cacheKey);
    const filePath = await download(url, {
      destDir: downloadDir,
      filename: `RAIS_VINC_PUB_${params.ano}.zip`,
    });

    const extractDir = join(downloadDir, "extracted");
    await extractZip(filePath, extractDir);
    await this.cache.put(cacheKey, extractDir);

    return this.parseCsvDir<RaisEstabelecimento>(extractDir);
  }

  // ── Private Helpers ──────────────────────────────────────────

  private async parseCsvDir<T extends Record<string, string>>(dir: string): Promise<T[]> {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(dir);
    const csvFiles = entries.filter(
      (f) => f.toLowerCase().endsWith(".csv") || f.toLowerCase().endsWith(".txt"),
    );

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

  private validateAno(ano: number, minYear: number, label: string): void {
    if (!Number.isInteger(ano) || ano < minYear || ano > new Date().getFullYear()) {
      throw new BVValidationError(
        "ano",
        `must be an integer between ${minYear} and ${new Date().getFullYear()} for ${label}`,
        "trabalho",
      );
    }
  }
}
