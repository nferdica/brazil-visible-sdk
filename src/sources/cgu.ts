import { getConfig } from "../config";
import { BVValidationError } from "../errors";
import { Source } from "./base";

// ── Pagination ────────────────────────────────────────────────────

export interface CguPaginationParams {
  pagina?: number;
  tamanhoPagina?: number;
}

// ── CEIS Types ────────────────────────────────────────────────────

export interface CeisParams extends CguPaginationParams {
  cnpjSancionado?: string;
  nomeSancionado?: string;
  orgaoSancionador?: string;
}

export interface CeisItem {
  id: number;
  cnpjSancionado: string;
  nomeSancionado: string;
  razaoSocialEmpresa: string;
  nomeFantasiaEmpresa: string;
  dataInicioSancao: string;
  dataFimSancao: string;
  orgaoSancionador: string;
  tipoSancao: string;
}

// ── CNEP Types ────────────────────────────────────────────────────

export interface CnepParams extends CguPaginationParams {
  cnpjSancionado?: string;
  nomeSancionado?: string;
  orgaoSancionador?: string;
}

export interface CnepItem {
  id: number;
  cnpjSancionado: string;
  nomeSancionado: string;
  razaoSocialEmpresa: string;
  nomeFantasiaEmpresa: string;
  dataInicioSancao: string;
  dataFimSancao: string;
  orgaoSancionador: string;
  tipoSancao: string;
}

// ── CEPIM Types ───────────────────────────────────────────────────

export interface CepimParams extends CguPaginationParams {
  cnpjSancionado?: string;
  nomeSancionado?: string;
  orgaoSuperior?: string;
}

export interface CepimItem {
  id: number;
  cnpjSancionado: string;
  nomeSancionado: string;
  razaoSocialEmpresa: string;
  orgaoSuperior: string;
  orgaoMaximo: string;
  motivoImpedimento: string;
}

// ── Contratos Types ───────────────────────────────────────────────

export interface ContratosParams extends CguPaginationParams {
  codigoOrgao?: string;
  dataInicial?: string;
  dataFinal?: string;
  cpfCnpj?: string;
}

export interface ContratoItem {
  id: number;
  dataVigenciaInicio: string;
  dataVigenciaFim: string;
  codigoOrgao: string;
  nomeOrgao: string;
  objeto: string;
  valorInicial: number;
  cpfCnpj: string;
  nomeContratado: string;
  modalidadeLicitacao: string;
}

// ── Servidores Types ──────────────────────────────────────────────

export interface ServidoresParams extends CguPaginationParams {
  orgaoServidores?: string;
  orgaoExercicio?: string;
}

export interface ServidorItem {
  id: number;
  cpf: string;
  nome: string;
  orgaoServidores: string;
  orgaoExercicio: string;
  cargo: string;
  funcao: string;
  situacaoVinculo: string;
}

// ── Source ─────────────────────────────────────────────────────────

export class CguSource extends Source {
  readonly name = "CGU Portal da Transparência";
  readonly baseUrl = "https://api.portaldatransparencia.gov.br/api-de-dados";

  private getAuthHeaders(): Record<string, string> {
    const apiKey = getConfig().apiKeys.cgu;
    if (!apiKey) {
      throw new BVValidationError(
        "apiKey",
        "CGU API key is required. Use configure({ apiKeys: { cgu: 'your-key' } }) or set BV_CGU_API_KEY env var.",
        "cgu",
      );
    }
    return { "chave-api-dados": apiKey };
  }

  private buildParams(
    params?: CguPaginationParams & Record<string, string | number | undefined>,
  ): Record<string, string | number | undefined> {
    return {
      pagina: params?.pagina ?? 1,
      tamanhoPagina: params?.tamanhoPagina ?? 15,
      ...params,
    };
  }

  async ceis(params?: CeisParams): Promise<CeisItem[]> {
    return this.client.get<CeisItem[]>(`${this.baseUrl}/ceis`, {
      headers: this.getAuthHeaders(),
      params: this.buildParams(params),
    });
  }

  async cnep(params?: CnepParams): Promise<CnepItem[]> {
    return this.client.get<CnepItem[]>(`${this.baseUrl}/cnep`, {
      headers: this.getAuthHeaders(),
      params: this.buildParams(params),
    });
  }

  async cepim(params?: CepimParams): Promise<CepimItem[]> {
    return this.client.get<CepimItem[]>(`${this.baseUrl}/cepim`, {
      headers: this.getAuthHeaders(),
      params: this.buildParams(params),
    });
  }

  async contratos(params?: ContratosParams): Promise<ContratoItem[]> {
    return this.client.get<ContratoItem[]>(`${this.baseUrl}/contratos`, {
      headers: this.getAuthHeaders(),
      params: this.buildParams(params),
    });
  }

  async servidores(params?: ServidoresParams): Promise<ServidorItem[]> {
    return this.client.get<ServidorItem[]>(`${this.baseUrl}/servidores`, {
      headers: this.getAuthHeaders(),
      params: this.buildParams(params),
    });
  }
}
