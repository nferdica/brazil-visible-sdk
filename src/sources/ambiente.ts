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

// ── CAR Types (Cadastro Ambiental Rural) ────────────────────────

export interface CarParams {
  uf?: string;
  municipio?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

export interface CarImovel {
  codigoImovel: string;
  municipio: string;
  uf: string;
  areaImovel: string;
  situacao: string;
  tipoImovel: string;
  [key: string]: string;
}

// ── Unidades de Conservação Types (ICMBio) ──────────────────────

export interface UcParams {
  categoria?: string;
  uf?: string;
  esfera?: string;
}

export interface UnidadeConservacao {
  nome: string;
  categoria: string;
  uf: string;
  esfera: string;
  areaHa: string;
  anoCriacao: string;
  biomaIbge: string;
  [key: string]: string;
}

// ── Recursos Hídricos Types (ANA) ──────────────────────────────

export interface RecursosHidricosParams {
  q?: string;
  rows?: number;
}

export interface RecursoHidrico {
  nome: string;
  codigo: string;
  rio: string;
  bacia: string;
  subBacia: string;
  uf: string;
  municipio: string;
  [key: string]: string;
}

interface CkanResponse {
  result: {
    results: RecursoHidrico[];
  };
}

// ── Source ────────────────────────────────────────────────────────

export class AmbienteSource extends Source {
  readonly name = "Meio Ambiente";
  readonly baseUrl = "https://terrabrasilis.dpi.inpe.br/api";

  private readonly focosBaseUrl = "https://api.focos.inpe.br";
  private readonly ibamaBaseUrl = "https://dados.ibama.gov.br/dados";
  private readonly carBaseUrl = "https://car.gov.br/publico/api/imoveis";
  private readonly ucBaseUrl =
    "https://api.dados.gov.br/v1/conjuntos-dados/unidades-de-conservacao/recursos";
  private readonly anaBaseUrl = "https://dadosabertos.ana.gov.br/api/3/action/package_search";

  // ── PRODES — Deforestation data ───────────────────────────────

  /** Fetch PRODES annual deforestation data from INPE. */
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

  /** Fetch DETER real-time deforestation alerts from INPE. */
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

  /** Fetch active fire hotspot data from INPE. */
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

  /** Fetch IBAMA environmental fines records. */
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

  // ── CAR — Cadastro Ambiental Rural ──────────────────────────────

  /** Fetch rural property registrations from the CAR system. */
  async car(params?: CarParams): Promise<CarImovel[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.uf !== undefined) {
      queryParams.uf = params.uf;
    }
    if (params?.municipio !== undefined) {
      queryParams.municipio = params.municipio;
    }
    if (params?.pagina !== undefined) {
      queryParams.pagina = params.pagina;
    }
    if (params?.tamanhoPagina !== undefined) {
      queryParams.tamanhoPagina = params.tamanhoPagina;
    }

    return this.client.get<CarImovel[]>(this.carBaseUrl, {
      params: queryParams,
    });
  }

  // ── Unidades de Conservação — Conservation Units (ICMBio) ──────

  /** Fetch conservation unit data from ICMBio. */
  async unidadesConservacao(params?: UcParams): Promise<UnidadeConservacao[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.categoria !== undefined) {
      queryParams.categoria = params.categoria;
    }
    if (params?.uf !== undefined) {
      queryParams.uf = params.uf;
    }
    if (params?.esfera !== undefined) {
      queryParams.esfera = params.esfera;
    }

    return this.client.get<UnidadeConservacao[]>(this.ucBaseUrl, {
      params: queryParams,
    });
  }

  // ── Recursos Hídricos — Water Resources (ANA) ─────────────────

  /** Search water resources datasets from ANA. */
  async recursosHidricos(params?: RecursosHidricosParams): Promise<RecursoHidrico[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.q !== undefined) {
      queryParams.q = params.q;
    }
    if (params?.rows !== undefined) {
      queryParams.rows = params.rows;
    }

    const response = await this.client.get<CkanResponse>(this.anaBaseUrl, {
      params: queryParams,
    });

    return response.result.results;
  }
}
