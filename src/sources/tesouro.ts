import { Source } from "./base";

// ── Entes Types ──────────────────────────────────────────────────

export interface EntesParams {
  anoReferencia?: number;
  esfera?: "E" | "M" | "U";
  uf?: string;
}

export interface Ente {
  cod_ibge: number;
  ente: string;
  capital: string;
  regiao: string;
  uf: string;
  esfera: string;
  exercicio: number;
  populacao: number;
  cnpj: string;
}

// ── RREO Types ───────────────────────────────────────────────────

export interface RreoParams {
  exercicio: number;
  periodo: number;
  ente: number;
  anexo?: string;
}

export interface RreoItem {
  exercicio: number;
  demonstrativo: string;
  periodo: number;
  periodicidade: string;
  instituicao: string;
  cod_ibge: number;
  uf: string;
  populacao: number;
  anexo: string;
  esfera: string;
  rotulo: string;
  coluna: string;
  cod_conta: string;
  conta: string;
  valor: number;
}

// ── RGF Types ────────────────────────────────────────────────────

export interface RgfParams {
  exercicio: number;
  periodicidade: "Q" | "S";
  periodo: number;
  ente: number;
  anexo?: string;
}

export interface RgfItem {
  exercicio: number;
  demonstrativo: string;
  periodo: number;
  periodicidade: string;
  instituicao: string;
  cod_ibge: number;
  uf: string;
  populacao: number;
  anexo: string;
  esfera: string;
  rotulo: string;
  coluna: string;
  cod_conta: string;
  conta: string;
  valor: number;
}

// ── SICONFI Wrapper Response ─────────────────────────────────────

interface SiconfiResponse<T> {
  items: T[];
  hasMore: boolean;
  limit: number;
  offset: number;
  count: number;
  links: unknown[];
}

// ── Source ────────────────────────────────────────────────────────

export class TesouroSource extends Source {
  readonly name = "Tesouro Nacional";
  readonly baseUrl = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";

  async entes(params?: EntesParams): Promise<Ente[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.anoReferencia !== undefined) {
      queryParams.an_referencia = params.anoReferencia;
    }
    if (params?.esfera !== undefined) {
      queryParams.id_esfera = params.esfera;
    }
    if (params?.uf !== undefined) {
      queryParams.uf = params.uf;
    }

    const response = await this.client.get<SiconfiResponse<Ente>>(`${this.baseUrl}/entes`, {
      params: queryParams,
    });

    return response.items;
  }

  async rreo(params: RreoParams): Promise<RreoItem[]> {
    const queryParams: Record<string, string | number | undefined> = {
      an_exercicio: params.exercicio,
      nr_periodo: params.periodo,
      co_tipo_demonstrativo: "RREO",
      id_ente: params.ente,
    };

    if (params.anexo !== undefined) {
      queryParams.no_anexo = params.anexo;
    }

    const response = await this.client.get<SiconfiResponse<RreoItem>>(`${this.baseUrl}/rreo`, {
      params: queryParams,
    });

    return response.items;
  }

  async rgf(params: RgfParams): Promise<RgfItem[]> {
    const queryParams: Record<string, string | number | undefined> = {
      an_exercicio: params.exercicio,
      in_periodicidade: params.periodicidade,
      nr_periodo: params.periodo,
      co_tipo_demonstrativo: "RGF",
      id_ente: params.ente,
    };

    if (params.anexo !== undefined) {
      queryParams.no_anexo = params.anexo;
    }

    const response = await this.client.get<SiconfiResponse<RgfItem>>(`${this.baseUrl}/rgf`, {
      params: queryParams,
    });

    return response.items;
  }
}
