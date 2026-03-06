import { BVValidationError } from "../errors";
import { Source } from "./base";

// ── Localidades Types ──────────────────────────────────────────────

export interface Regiao {
  id: number;
  sigla: string;
  nome: string;
}

export interface Estado {
  id: number;
  sigla: string;
  nome: string;
  regiao: Regiao;
}

export interface Mesorregiao {
  id: number;
  nome: string;
  UF: Estado;
}

export interface Microrregiao {
  id: number;
  nome: string;
  mesorregiao: Mesorregiao;
}

export interface Municipio {
  id: number;
  nome: string;
  microrregiao: Microrregiao;
}

export interface Distrito {
  id: number;
  nome: string;
  municipio: Municipio;
}

// ── Agregados Types ────────────────────────────────────────────────

export interface AgregadosParams {
  tabela: number;
  periodos: string;
  variaveis?: number[];
  localidades: string;
}

export interface AgregadoVariavel {
  id: string;
  variavel: string;
  unidade: string;
  resultados: AgregadoResultado[];
}

export interface AgregadoResultado {
  classificacoes: AgregadoClassificacao[];
  series: AgregadoSerie[];
}

export interface AgregadoClassificacao {
  id: string;
  nome: string;
  categoria: Record<string, string>;
}

export interface AgregadoSerie {
  localidade: {
    id: string;
    nivel: { id: string; nome: string };
    nome: string;
  };
  serie: Record<string, number | null>;
}

export interface AgregadoMetadados {
  id: number;
  nome: string;
  URL: string;
  pesquisa: string;
  assunto: string;
  periodicidade: {
    frequencia: string;
    inicio: number;
    fim: number;
  };
  nivelTerritorial: {
    Administrativo: string[];
    Especial: string[];
    IBGE: string[];
  };
  variaveis: { id: number; nome: string; unidade: string }[];
  classificacoes: unknown[];
}

// ── Nomes Types ────────────────────────────────────────────────────

export interface NomesParams {
  nome: string;
  localidade?: number;
  sexo?: "M" | "F";
}

export interface NomeFrequencia {
  nome: string;
  sexo: string | null;
  localidade: string;
  res: { periodo: string; frequencia: number }[];
}

export interface NomesRankingParams {
  localidade?: number;
  sexo?: "M" | "F";
}

export interface NomeRanking {
  localidade: string;
  sexo: string | null;
  res: { nome: string; frequencia: number; ranking: number }[];
}

// ── Raw API Types (internal) ───────────────────────────────────────

interface RawAgregadoSerie {
  localidade: {
    id: string;
    nivel: { id: string; nome: string };
    nome: string;
  };
  serie: Record<string, string | null>;
}

interface RawAgregadoResultado {
  classificacoes: AgregadoClassificacao[];
  series: RawAgregadoSerie[];
}

interface RawAgregadoVariavel {
  id: string;
  variavel: string;
  unidade: string;
  resultados: RawAgregadoResultado[];
}

// ── Helpers ────────────────────────────────────────────────────────

function convertSerieValue(value: string | null): number | null {
  if (value === null || value === "..." || value === "-") {
    return null;
  }
  return Number(value);
}

function convertRawAgregado(raw: RawAgregadoVariavel[]): AgregadoVariavel[] {
  return raw.map((variable) => ({
    id: variable.id,
    variavel: variable.variavel,
    unidade: variable.unidade,
    resultados: variable.resultados.map((resultado) => ({
      classificacoes: resultado.classificacoes,
      series: resultado.series.map((s) => ({
        localidade: s.localidade,
        serie: Object.fromEntries(
          Object.entries(s.serie).map(([period, value]) => [period, convertSerieValue(value)]),
        ),
      })),
    })),
  }));
}

// ── Source ──────────────────────────────────────────────────────────

export class IbgeSource extends Source {
  readonly name = "IBGE";
  readonly baseUrl = "https://servicodados.ibge.gov.br";

  private readonly localidadesBase = `${this.baseUrl}/api/v1/localidades`;
  private readonly agregadosBase = `${this.baseUrl}/api/v3/agregados`;
  private readonly nomesBase = `${this.baseUrl}/api/v2/censos/nomes`;

  // ── Localidades ────────────────────────────────────────────────

  async regioes(): Promise<Regiao[]> {
    return this.client.get<Regiao[]>(`${this.localidadesBase}/regioes`);
  }

  async estados(params?: { regiao?: number }): Promise<Estado[]> {
    const path = params?.regiao
      ? `${this.localidadesBase}/regioes/${params.regiao}/estados`
      : `${this.localidadesBase}/estados`;
    return this.client.get<Estado[]>(path);
  }

  async mesorregioes(params?: { uf?: number }): Promise<Mesorregiao[]> {
    const path = params?.uf
      ? `${this.localidadesBase}/estados/${params.uf}/mesorregioes`
      : `${this.localidadesBase}/mesorregioes`;
    return this.client.get<Mesorregiao[]>(path);
  }

  async microrregioes(params?: { uf?: number }): Promise<Microrregiao[]> {
    const path = params?.uf
      ? `${this.localidadesBase}/estados/${params.uf}/microrregioes`
      : `${this.localidadesBase}/microrregioes`;
    return this.client.get<Microrregiao[]>(path);
  }

  async municipios(params?: { uf?: number }): Promise<Municipio[]> {
    const path = params?.uf
      ? `${this.localidadesBase}/estados/${params.uf}/municipios`
      : `${this.localidadesBase}/municipios`;
    return this.client.get<Municipio[]>(path);
  }

  async distritos(params?: { uf?: number }): Promise<Distrito[]> {
    const path = params?.uf
      ? `${this.localidadesBase}/estados/${params.uf}/distritos`
      : `${this.localidadesBase}/distritos`;
    return this.client.get<Distrito[]>(path);
  }

  // ── Agregados ──────────────────────────────────────────────────

  async agregados(params: AgregadosParams): Promise<AgregadoVariavel[]> {
    this.validateTabela(params.tabela);

    const variaveis = params.variaveis ? params.variaveis.join("|") : "all";

    const url = `${this.agregadosBase}/${params.tabela}/periodos/${params.periodos}/variaveis/${variaveis}`;

    const raw = await this.client.get<RawAgregadoVariavel[]>(url, {
      params: { localidades: params.localidades },
    });

    return convertRawAgregado(raw);
  }

  async agregadosMetadados(tabela: number): Promise<AgregadoMetadados> {
    this.validateTabela(tabela);
    return this.client.get<AgregadoMetadados>(`${this.agregadosBase}/${tabela}/metadados`);
  }

  // ── Nomes ──────────────────────────────────────────────────────

  async nomes(params: NomesParams): Promise<NomeFrequencia[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params.localidade !== undefined) {
      queryParams.localidade = params.localidade;
    }
    if (params.sexo !== undefined) {
      queryParams.sexo = params.sexo;
    }

    return this.client.get<NomeFrequencia[]>(`${this.nomesBase}/${params.nome}`, {
      params: queryParams,
    });
  }

  async nomesRanking(params?: NomesRankingParams): Promise<NomeRanking[]> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.localidade !== undefined) {
      queryParams.localidade = params.localidade;
    }
    if (params?.sexo !== undefined) {
      queryParams.sexo = params.sexo;
    }

    return this.client.get<NomeRanking[]>(`${this.nomesBase}/ranking`, {
      params: queryParams,
    });
  }

  // ── Validation ─────────────────────────────────────────────────

  private validateTabela(tabela: number): void {
    if (!Number.isInteger(tabela) || tabela <= 0) {
      throw new BVValidationError("tabela", "must be a positive integer", "ibge");
    }
  }
}
