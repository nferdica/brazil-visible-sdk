import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface DouSearchParams {
  q: string;
  dataPublicacao?: string;
  secao?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

export interface DouItem {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  dataPublicacao: string;
  secao: string;
  orgao: string;
  tipoAto: string;
  url: string;
  [key: string]: string;
}

export interface DoeSearchParams {
  q: string;
  estado: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface DoeItem {
  id: string;
  titulo: string;
  conteudo: string;
  dataPublicacao: string;
  estado: string;
  orgao: string;
  url: string;
  [key: string]: string;
}

// ── Source ──────────────────────────────────────────────────────────

export class DiariosSource extends Source {
  readonly name = "Diários Oficiais";
  readonly baseUrl = "https://www.in.gov.br/servicos/diario-oficial-da-uniao";

  async dou(params: DouSearchParams): Promise<DouItem[]> {
    return this.client.get<DouItem[]>("https://www.in.gov.br/leiturajornal", {
      params: {
        q: params.q,
        dataPublicacao: params.dataPublicacao,
        secao: params.secao,
        pagina: params.pagina ?? 1,
        tamanhoPagina: params.tamanhoPagina ?? 20,
      },
    });
  }

  async doe(params: DoeSearchParams): Promise<DoeItem[]> {
    return this.client.get<DoeItem[]>(
      `https://dados.gov.br/dados/api/publico/conjuntos-dados/diarios-oficiais/${params.estado}`,
      {
        params: {
          q: params.q,
          dataInicio: params.dataInicio,
          dataFim: params.dataFim,
        },
      },
    );
  }
}
