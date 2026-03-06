import { Source } from "./base";

// ── PRODES Types (Deforestation — INPE) ──────────────────────────

export interface ProdesParams {
  ano?: number;
  estado?: string;
}

export interface ProdesItem {
  ano: number;
  estado: string;
  municipio: string;
  areaDesmatadaKm2: number;
  bioma: string;
  [key: string]: string | number;
}

// ── DETER Types (Real-time Alerts — INPE) ────────────────────────

export interface DeterParams {
  dataInicial?: string;
  dataFinal?: string;
  estado?: string;
}

export interface DeterAlerta {
  data: string;
  estado: string;
  municipio: string;
  areaKm2: number;
  bioma: string;
  satelite: string;
  [key: string]: string | number;
}

// ── Focos de Calor Types (Fire Hotspots — INPE) ─────────────────

export interface FocosCalorParams {
  pais?: string;
  estado?: string;
  diasPretendidos?: number;
}

export interface FocoCalor {
  datahora: string;
  latitude: number;
  longitude: number;
  estado: string;
  municipio: string;
  bioma: string;
  satelite: string;
  frp: number;
  [key: string]: string | number;
}

// ── IBAMA Types (Environmental Fines) ────────────────────────────

export interface IbamaMultasParams {
  cpfCnpj?: string;
  uf?: string;
  municipio?: string;
}

export interface IbamaMulta {
  id: number;
  dataAuto: string;
  cpfCnpj: string;
  nomeInfrator: string;
  uf: string;
  municipio: string;
  descricaoInfracao: string;
  valorMulta: number;
  statusDebito: string;
  [key: string]: string | number;
}

// ── Source ────────────────────────────────────────────────────────

export class AmbienteSource extends Source {
  readonly name = "Meio Ambiente";
  readonly baseUrl = "https://terrabrasilis.dpi.inpe.br/api";

  private readonly focosBaseUrl = "https://api.focos.inpe.br";
  private readonly ibamaBaseUrl = "https://dados.ibama.gov.br/dados";

  // ── PRODES — Deforestation data ───────────────────────────────

  async prodes(params?: ProdesParams): Promise<ProdesItem[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.ano !== undefined) {
      queryParams.ano = params.ano;
    }
    if (params?.estado !== undefined) {
      queryParams.estado = params.estado;
    }

    return this.client.get<ProdesItem[]>(`${this.baseUrl}/v1/prodes`, {
      params: queryParams,
    });
  }

  // ── DETER — Real-time deforestation alerts ────────────────────

  async deter(params?: DeterParams): Promise<DeterAlerta[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.dataInicial !== undefined) {
      queryParams.dataInicial = params.dataInicial;
    }
    if (params?.dataFinal !== undefined) {
      queryParams.dataFinal = params.dataFinal;
    }
    if (params?.estado !== undefined) {
      queryParams.estado = params.estado;
    }

    return this.client.get<DeterAlerta[]>(`${this.baseUrl}/v1/deter`, {
      params: queryParams,
    });
  }

  // ── Focos de Calor — Fire hotspots ────────────────────────────

  async focosCalor(params?: FocosCalorParams): Promise<FocoCalor[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.pais !== undefined) {
      queryParams.pais = params.pais;
    }
    if (params?.estado !== undefined) {
      queryParams.estado = params.estado;
    }
    if (params?.diasPretendidos !== undefined) {
      queryParams.diasPretendidos = params.diasPretendidos;
    }

    return this.client.get<FocoCalor[]>(this.focosBaseUrl, {
      params: queryParams,
    });
  }

  // ── IBAMA — Environmental fines ───────────────────────────────

  async ibamaMultas(params?: IbamaMultasParams): Promise<IbamaMulta[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.cpfCnpj !== undefined) {
      queryParams.cpfCnpj = params.cpfCnpj;
    }
    if (params?.uf !== undefined) {
      queryParams.uf = params.uf;
    }
    if (params?.municipio !== undefined) {
      queryParams.municipio = params.municipio;
    }

    return this.client.get<IbamaMulta[]>(`${this.ibamaBaseUrl}/multas`, {
      params: queryParams,
    });
  }
}
