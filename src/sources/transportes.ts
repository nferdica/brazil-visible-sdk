import { Source } from "./base";

// ── ANAC Types ────────────────────────────────────────────────────

export interface AnacVooParams {
  ano?: number;
  mes?: number;
  empresa?: string;
}

export interface AnacVoo {
  ano: number;
  mes: number;
  empresa: string;
  origem: string;
  destino: string;
  passageiros: number;
  carga: number;
  [key: string]: string | number;
}

// ── PRF Types ─────────────────────────────────────────────────────

export interface PrfAcidenteParams {
  ano?: number;
  uf?: string;
}

export interface PrfAcidente {
  id: number;
  dataInversa: string;
  dia_semana: string;
  horario: string;
  uf: string;
  br: string;
  km: string;
  municipio: string;
  causa_acidente: string;
  tipo_acidente: string;
  classificacao_acidente: string;
  fase_dia: string;
  sentido_via: string;
  condicao_metereologica: string;
  tipo_pista: string;
  tracado_via: string;
  pessoas: number;
  mortos: number;
  feridos_leves: number;
  feridos_graves: number;
  veiculos: number;
  [key: string]: string | number;
}

// ── DENATRAN Types ────────────────────────────────────────────────

export interface DenatranFrotaParams {
  ano?: number;
  mes?: number;
  uf?: string;
}

export interface DenatranFrota {
  ano: number;
  mes: number;
  uf: string;
  municipio: string;
  tipoVeiculo: string;
  quantidade: number;
  [key: string]: string | number;
}

// ── DNIT Types ───────────────────────────────────────────────────

export interface DnitParams {
  uf?: string;
  tipo?: string;
  pagina?: number;
}

export interface DnitRodovia {
  codigo: string;
  nome: string;
  uf: string;
  extensaoKm: string;
  tipoTrecho: string;
  superficie: string;
  situacao: string;
  [key: string]: string;
}

// ── ANTT Types ───────────────────────────────────────────────────

export interface AnttParams {
  q?: string;
  rows?: number;
  pagina?: number;
}

export interface AnttConcessao {
  rodovia: string;
  concessionaria: string;
  trechoInicial: string;
  trechoFinal: string;
  extensaoKm: string;
  uf: string;
  pedagios: string;
  [key: string]: string;
}

// ── Source ─────────────────────────────────────────────────────────

export class TransportesSource extends Source {
  readonly name = "Transportes";
  readonly baseUrl = "https://dados.gov.br/dados/api/publico/conjuntos-dados";

  async anacVoos(params?: AnacVooParams): Promise<AnacVoo[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.ano !== undefined) {
      queryParams.ano = params.ano;
    }
    if (params?.mes !== undefined) {
      queryParams.mes = params.mes;
    }
    if (params?.empresa !== undefined) {
      queryParams.empresa = params.empresa;
    }

    return this.client.get<AnacVoo[]>(`${this.baseUrl}/anac-voos`, {
      params: queryParams,
    });
  }

  async prfAcidentes(params?: PrfAcidenteParams): Promise<PrfAcidente[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.ano !== undefined) {
      queryParams.ano = params.ano;
    }
    if (params?.uf !== undefined) {
      queryParams.uf = params.uf;
    }

    return this.client.get<PrfAcidente[]>(`${this.baseUrl}/prf-acidentes`, {
      params: queryParams,
    });
  }

  async denatranFrota(params?: DenatranFrotaParams): Promise<DenatranFrota[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.ano !== undefined) {
      queryParams.ano = params.ano;
    }
    if (params?.mes !== undefined) {
      queryParams.mes = params.mes;
    }
    if (params?.uf !== undefined) {
      queryParams.uf = params.uf;
    }

    return this.client.get<DenatranFrota[]>(`${this.baseUrl}/denatran-frota`, {
      params: queryParams,
    });
  }

  async dnit(params?: DnitParams): Promise<DnitRodovia[]> {
    const queryParams: Record<string, string | number | undefined> = {
      id: "dnit-rodovias",
    };

    if (params?.uf !== undefined) {
      queryParams.uf = params.uf;
    }
    if (params?.tipo !== undefined) {
      queryParams.tipo = params.tipo;
    }
    if (params?.pagina !== undefined) {
      queryParams.pagina = params.pagina;
    }

    return this.client.get<DnitRodovia[]>(this.baseUrl, {
      params: queryParams,
    });
  }

  async antt(params?: AnttParams): Promise<AnttConcessao[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.q !== undefined) {
      queryParams.q = params.q;
    }
    if (params?.rows !== undefined) {
      queryParams.rows = params.rows;
    }
    if (params?.pagina !== undefined) {
      queryParams.pagina = params.pagina;
    }

    return this.client.get<AnttConcessao[]>(
      "https://dados.antt.gov.br/dataset/api/3/action/package_search",
      { params: queryParams },
    );
  }
}
