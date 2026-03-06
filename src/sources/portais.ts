import { getConfig } from "../config";
import { BVValidationError } from "../errors";
import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface DadosAbertosSearchParams {
  q?: string;
  organizacao?: string;
  grupos?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

export interface ConjuntoDados {
  id: string;
  titulo: string;
  descricao: string;
  organizacao: string;
  temas: string[];
  formatos: string[];
  dataAtualizacao: string;
  url: string;
  [key: string]: string | string[];
}

export interface RecursoParams {
  conjuntoId: string;
}

export interface Recurso {
  id: string;
  nome: string;
  descricao: string;
  formato: string;
  url: string;
  tamanho: number;
  dataAtualizacao: string;
  [key: string]: string | number;
}

export interface BaseDadosParams {
  q?: string;
  rows?: number;
  start?: number;
}

export interface BaseDadosDataset {
  id: string;
  name: string;
  title: string;
  organization: string;
  notes: string;
  num_resources: number;
  [key: string]: string | number;
}

export interface TesouroTransparenteParams {
  ano?: number;
  orgao?: string;
}

export interface ExecucaoOrcamentaria {
  ano: number;
  orgao: string;
  unidadeOrcamentaria: string;
  funcao: string;
  subfuncao: string;
  programa: string;
  acao: string;
  valorEmpenhado: number;
  valorLiquidado: number;
  valorPago: number;
  [key: string]: string | number;
}

// ── Source ──────────────────────────────────────────────────────────

export class PortaisSource extends Source {
  readonly name = "Portais de Dados Abertos";
  readonly baseUrl = "https://dados.gov.br/dados/api/publico";

  /** Search open data datasets on dados.gov.br. */
  async buscarConjuntos(params?: DadosAbertosSearchParams): Promise<ConjuntoDados[]> {
    const response = await this.client.get<{ result: ConjuntoDados[] }>(
      `${this.baseUrl}/conjuntos-dados`,
      {
        params: {
          q: params?.q,
          organizacao: params?.organizacao,
          grupos: params?.grupos,
          pagina: params?.pagina ?? 1,
          tamanhoPagina: params?.tamanhoPagina ?? 20,
        },
      },
    );
    return response.result ?? response;
  }

  /** List resources (files/APIs) for a given dataset on dados.gov.br. */
  async recursos(params: RecursoParams): Promise<Recurso[]> {
    const response = await this.client.get<{ result: Recurso[] }>(
      `${this.baseUrl}/conjuntos-dados/${params.conjuntoId}/recursos`,
    );
    return response.result ?? response;
  }

  /** Search datasets on Base dos Dados platform. */
  async baseDados(params?: BaseDadosParams): Promise<BaseDadosDataset[]> {
    const response = await this.client.get<{
      success: boolean;
      result: { results: BaseDadosDataset[] };
    }>("https://basedosdados.org/api/3/action/package_search", {
      params: {
        q: params?.q,
        rows: params?.rows,
        start: params?.start,
      },
    });
    return response.result.results;
  }

  /** Fetch federal budget execution data from the Transparency Portal. */
  async execucaoOrcamentaria(params?: TesouroTransparenteParams): Promise<ExecucaoOrcamentaria[]> {
    const apiKey = getConfig().apiKeys?.cgu;
    if (!apiKey) {
      throw new BVValidationError(
        "apiKey",
        "CGU API key required for Portal da Transparencia. Configure via configure({ apiKeys: { cgu: '...' } })",
        "portais",
      );
    }

    return this.client.get<ExecucaoOrcamentaria[]>(
      "https://api.portaldatransparencia.gov.br/api-de-dados/despesas/por-orgao",
      {
        headers: { "chave-api-dados": apiKey },
        params: {
          ano: params?.ano,
          orgao: params?.orgao,
        },
      },
    );
  }
}
