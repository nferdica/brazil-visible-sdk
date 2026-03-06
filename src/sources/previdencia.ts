import { join } from "node:path";
import { type FileCache, getDefaultCache } from "../cache";
import { download } from "../download";
import { BVValidationError } from "../errors";
import { parseCsvFile } from "../parsers";
import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface PrevidenciaDownloadParams {
  ano: number;
}

export interface BeneficioConcedido {
  competencia: string;
  uf: string;
  municipio: string;
  especie: string;
  qtd_beneficios: string;
  valor_total: string;
  [key: string]: string;
}

export interface FundoPensao {
  cnpb: string;
  nome_plano: string;
  sigla_efpc: string;
  nome_efpc: string;
  cnpj_efpc: string;
  uf: string;
  situacao: string;
  tipo_plano: string;
  modalidade: string;
  qtd_participantes: string;
  [key: string]: string;
}

// ── Source ──────────────────────────────────────────────────────────

export class PrevidenciaSource extends Source {
  readonly name = "Previdência";
  readonly baseUrl = "https://dadosabertos.dataprev.gov.br";
  private readonly cache: FileCache;

  constructor(config?: {
    client?: InstanceType<typeof import("../client").BVClient>;
    cache?: FileCache;
  }) {
    super(config);
    this.cache = config?.cache ?? getDefaultCache();
  }

  /** Download and parse social security benefits data for a given year. */
  async beneficios(params: PrevidenciaDownloadParams): Promise<BeneficioConcedido[]> {
    this.validateAno(params.ano);

    const cacheKey = `prev-beneficios-${params.ano}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<BeneficioConcedido>(cached);
    }

    const url = `${this.baseUrl}/dataset/beneficios-concedidos-${params.ano}.csv`;
    const downloadDir = join(this.cache.getCacheDir(), cacheKey);
    const filePath = await download(url, {
      destDir: downloadDir,
      filename: `beneficios_${params.ano}.csv`,
    });

    await this.cache.put(cacheKey, downloadDir);

    return parseCsvFile<BeneficioConcedido>(filePath, {
      delimiter: ";",
      encoding: "latin1",
    });
  }

  /** Download and parse the PREVIC pension fund registry. */
  async fundosPensao(): Promise<FundoPensao[]> {
    const cacheKey = "prev-fundos-pensao";
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.parseCsvDir<FundoPensao>(cached);
    }

    const url = `${this.baseUrl}/dataset/previc-fundos-pensao.csv`;
    const downloadDir = join(this.cache.getCacheDir(), cacheKey);
    const filePath = await download(url, {
      destDir: downloadDir,
      filename: "fundos_pensao.csv",
    });

    await this.cache.put(cacheKey, downloadDir);

    return parseCsvFile<FundoPensao>(filePath, {
      delimiter: ";",
      encoding: "latin1",
    });
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
    if (!Number.isInteger(ano) || ano < 2010 || ano > new Date().getFullYear()) {
      throw new BVValidationError(
        "ano",
        `must be an integer between 2010 and ${new Date().getFullYear()}`,
        "previdencia",
      );
    }
  }
}
