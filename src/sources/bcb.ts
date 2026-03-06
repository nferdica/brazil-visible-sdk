import { BVValidationError } from "../errors";
import { Source, type SourceConfig } from "./base";

export interface SgsParams {
  serie: number;
  dataInicial?: string;
  dataFinal?: string;
}

export interface SgsSerie {
  data: string;
  valor: number | null;
}

export interface ExpectativasParams {
  indicador: string;
  top?: number;
  skip?: number;
  filter?: string;
  orderBy?: string;
}

export interface ExpectativaMercado {
  Indicador: string;
  Data: string;
  DataReferencia: string;
  Media: number;
  Mediana: number;
  DesvioPadrao: number;
  Minimo: number;
  Maximo: number;
  numeroRespondentes: number;
  baseCalculo: number;
}

interface SgsRawEntry {
  data: string;
  valor: string | null;
}

interface OlindaResponse<T> {
  "@odata.context": string;
  value: T[];
}

function isoToBr(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function brToIso(br: string): string {
  const [day, month, year] = br.split("/");
  return `${year}-${month}-${day}`;
}

export class BcbSource extends Source {
  readonly name = "Banco Central do Brasil";
  readonly baseUrl = "https://api.bcb.gov.br";

  async sgs(params: SgsParams): Promise<SgsSerie[]> {
    if (!Number.isInteger(params.serie) || params.serie <= 0) {
      throw new BVValidationError("serie", "must be a positive integer", "bcb");
    }

    const queryParams: Record<string, string> = { formato: "json" };

    if (params.dataInicial) {
      queryParams.dataInicial = isoToBr(params.dataInicial);
    }
    if (params.dataFinal) {
      queryParams.dataFinal = isoToBr(params.dataFinal);
    }

    const raw = await this.client.get<SgsRawEntry[]>(
      `${this.baseUrl}/dados/serie/bcdata.sgs.${params.serie}/dados`,
      { params: queryParams },
    );

    return raw.map((entry) => ({
      data: brToIso(entry.data),
      valor: entry.valor !== null ? Number(entry.valor) : null,
    }));
  }

  async expectativas(params: ExpectativasParams): Promise<ExpectativaMercado[]> {
    const queryParams: Record<string, string> = { $format: "json" };

    if (params.top !== undefined) {
      queryParams.$top = String(params.top);
    }
    if (params.skip !== undefined) {
      queryParams.$skip = String(params.skip);
    }
    if (params.filter) {
      queryParams.$filter = params.filter;
    } else {
      queryParams.$filter = `Indicador eq '${params.indicador}'`;
    }
    if (params.orderBy) {
      queryParams.$orderby = params.orderBy;
    }

    const response = await this.client.get<OlindaResponse<ExpectativaMercado>>(
      "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativaMercadoMensais",
      { params: queryParams },
    );

    return response.value;
  }
}
