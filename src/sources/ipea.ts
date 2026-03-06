import { Source } from "./base";

// ── Series Types ─────────────────────────────────────────────────

export interface IpeaSeriesParams {
  codigo: string;
  top?: number;
  skip?: number;
  orderBy?: string;
}

export interface IpeaValor {
  SERCODIGO: string;
  VALDATA: string;
  VALVALOR: number;
  NIVNOME: string;
  TERCODIGO: string;
}

// ── Metadados Types ──────────────────────────────────────────────

export interface IpeaMetadadosParams {
  codigo?: string;
  top?: number;
  skip?: number;
}

export interface IpeaMetadado {
  SERCODIGO: string;
  SERNOME: string;
  SERCOMENTARIO: string;
  SERATUALIZACAO: string;
  BASNOME: string;
  FNTSIGLA: string;
  FNTNOME: string;
  FNTURL: string;
  PERNOME: string;
  UNINOME: string;
  MULNOME: string;
  SERSTATUS: string;
  TEMCODIGO: number;
  SERTEMBR: string;
}

// ── OData Response Wrapper ───────────────────────────────────────

interface ODataResponse<T> {
  "@odata.context": string;
  value: T[];
}

// ── Source ────────────────────────────────────────────────────────

export class IpeaSource extends Source {
  readonly name = "IPEA";
  readonly baseUrl = "https://ipeadata.gov.br/api/odata4";

  /** Fetch time series values from IPEA's macroeconomic database. */
  async series(params: IpeaSeriesParams): Promise<IpeaValor[]> {
    const queryParams: Record<string, string | number | undefined> = {
      $format: "json",
    };

    if (params.top !== undefined) {
      queryParams.$top = params.top;
    }
    if (params.skip !== undefined) {
      queryParams.$skip = params.skip;
    }
    if (params.orderBy !== undefined) {
      queryParams.$orderby = params.orderBy;
    }

    const response = await this.client.get<ODataResponse<IpeaValor>>(
      `${this.baseUrl}/ValoresSerie(SERCODIGO='${params.codigo}')`,
      { params: queryParams },
    );

    return response.value;
  }

  /** Fetch metadata for IPEA series, optionally filtered by series code. */
  async metadados(params?: IpeaMetadadosParams): Promise<IpeaMetadado[]> {
    if (params?.codigo) {
      const response = await this.client.get<IpeaMetadado & { "@odata.context": string }>(
        `${this.baseUrl}/Metadados('${params.codigo}')`,
      );

      const { "@odata.context": _, ...metadado } = response;
      return [metadado as IpeaMetadado];
    }

    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.top !== undefined) {
      queryParams.$top = params.top;
    }
    if (params?.skip !== undefined) {
      queryParams.$skip = params.skip;
    }

    const response = await this.client.get<ODataResponse<IpeaMetadado>>(
      `${this.baseUrl}/Metadados`,
      { params: queryParams },
    );

    return response.value;
  }
}
