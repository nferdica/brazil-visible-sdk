import { join } from "node:path";
import { type FileCache, getDefaultCache } from "../cache";
import { download } from "../download";
import { BVValidationError } from "../errors";
import { parseCsvFile } from "../parsers";
import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface ReguladorasDownloadParams {
  ano?: number;
}

export interface AnatelAcesso {
  ano: string;
  mes: string;
  uf: string;
  municipio: string;
  codigo_ibge: string;
  tecnologia: string;
  acessos: string;
  [key: string]: string;
}

export interface AneelTarifa {
  dat_inicio_vigencia: string;
  dat_fim_vigencia: string;
  dsc_classe: string;
  dsc_subclasse: string;
  nom_distribuidora: string;
  sig_agente: string;
  vlr_tarifa: string;
  vlr_componente_te: string;
  vlr_componente_tusd: string;
  dsc_modalidade_tarifaria: string;
  [key: string]: string;
}

export interface AnpCombustivel {
  regiao: string;
  estado: string;
  municipio: string;
  revenda: string;
  cnpj: string;
  produto: string;
  data_coleta: string;
  valor_venda: string;
  valor_compra: string;
  unidade_medida: string;
  bandeira: string;
  [key: string]: string;
}

export interface AnvisaMedicamento {
  categoria_regulatoria: string;
  nome_produto: string;
  processo: string;
  empresa: string;
  cnpj: string;
  principio_ativo: string;
  data_publicacao: string;
  situacao: string;
  [key: string]: string;
}

// ── URL Builders ──────────────────────────────────────────────────

function anatelCsvUrl(ano: number): string {
  return `https://www.anatel.gov.br/dadosabertos/paineis_de_dados/acessos/acessos_banda_larga_fixa_${ano}.csv`;
}

function aneelCsvUrl(ano: number): string {
  return `https://dadosabertos.aneel.gov.br/dataset/tarifas-homologadas/tarifas_${ano}.csv`;
}

function anpCsvUrl(ano: number): string {
  return `https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/dsas/ca/ca-${ano}-01.csv`;
}

const ANVISA_CSV_URL = "https://dados.anvisa.gov.br/dados/MEDICAMENTOS.csv";

// ── Source ──────────────────────────────────────────────────────────

export class ReguladorasSource extends Source {
  readonly name = "Reguladoras";
  readonly baseUrl = "https://dados.gov.br";
  private readonly cache: FileCache;

  constructor(config?: {
    client?: InstanceType<typeof import("../client").BVClient>;
    cache?: FileCache;
  }) {
    super(config);
    this.cache = config?.cache ?? getDefaultCache();
  }

  async anatelAcessos(params?: ReguladorasDownloadParams): Promise<AnatelAcesso[]> {
    const ano = params?.ano ?? new Date().getFullYear();
    this.validateAno(ano);
    const url = anatelCsvUrl(ano);
    return this.downloadCsvAndParse<AnatelAcesso>(url, `reguladoras-anatel-${ano}`);
  }

  async aneelTarifas(params?: ReguladorasDownloadParams): Promise<AneelTarifa[]> {
    const ano = params?.ano ?? new Date().getFullYear();
    this.validateAno(ano);
    const url = aneelCsvUrl(ano);
    return this.downloadCsvAndParse<AneelTarifa>(url, `reguladoras-aneel-${ano}`);
  }

  async anpCombustiveis(params?: ReguladorasDownloadParams): Promise<AnpCombustivel[]> {
    const ano = params?.ano ?? new Date().getFullYear();
    this.validateAno(ano);
    const url = anpCsvUrl(ano);
    return this.downloadCsvAndParse<AnpCombustivel>(url, `reguladoras-anp-${ano}`);
  }

  async anvisaMedicamentos(): Promise<AnvisaMedicamento[]> {
    return this.downloadCsvAndParse<AnvisaMedicamento>(
      ANVISA_CSV_URL,
      "reguladoras-anvisa-medicamentos",
    );
  }

  // ── Private Helpers ──────────────────────────────────────────

  private async downloadCsvAndParse<T extends Record<string, string>>(
    url: string,
    cacheKey: string,
  ): Promise<T[]> {
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return parseCsvFile<T>(cached, {
        delimiter: ";",
        encoding: "latin1",
      });
    }

    const downloadDir = join(this.cache.getCacheDir(), cacheKey);
    const csvPath = await download(url, {
      destDir: downloadDir,
      filename: `${cacheKey}.csv`,
    });

    await this.cache.put(cacheKey, csvPath);

    return parseCsvFile<T>(csvPath, {
      delimiter: ";",
      encoding: "latin1",
    });
  }

  private validateAno(ano: number): void {
    if (!Number.isInteger(ano) || ano < 2000 || ano > new Date().getFullYear()) {
      throw new BVValidationError(
        "ano",
        `must be an integer between 2000 and ${new Date().getFullYear()}`,
        "reguladoras",
      );
    }
  }
}
