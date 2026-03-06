import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface OcorrenciasParams {
  uf?: string;
  municipio?: string;
  ano?: number;
}

export interface OcorrenciaCriminal {
  ano: number;
  mes: number;
  uf: string;
  municipio: string;
  tipoCrime: string;
  quantidade: number;
  [key: string]: string | number;
}

export interface IndicadorParams {
  uf?: string;
  ano?: number;
}

export interface IndicadorSeguranca {
  ano: number;
  uf: string;
  indicador: string;
  valor: number;
  taxaPor100Mil: number;
  [key: string]: string | number;
}

// ── Source ──────────────────────────────────────────────────────────

export class SegurancaSource extends Source {
  readonly name = "SINESP";
  readonly baseUrl = "https://dados.gov.br/dados/api/publico/conjuntos-dados";

  /** Fetch criminal occurrence records from SINESP. */
  async ocorrencias(params?: OcorrenciasParams): Promise<OcorrenciaCriminal[]> {
    return this.client.get<OcorrenciaCriminal[]>(`${this.baseUrl}/seguranca-publica/ocorrencias`, {
      params: {
        uf: params?.uf,
        municipio: params?.municipio,
        ano: params?.ano,
      },
    });
  }

  /** Fetch public safety statistical indicators from SINESP. */
  async indicadores(params?: IndicadorParams): Promise<IndicadorSeguranca[]> {
    return this.client.get<IndicadorSeguranca[]>(`${this.baseUrl}/seguranca-publica/indicadores`, {
      params: {
        uf: params?.uf,
        ano: params?.ano,
      },
    });
  }
}
