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

// ── CEAF Types ───────────────────────────────────────────────────

export interface CeafParams extends CguPaginationParams {
  cpfSancionado?: string;
  nomeSancionado?: string;
  orgaoLotacao?: string;
}

export interface CeafItem {
  id: number;
  cpfSancionado: string;
  nomeSancionado: string;
  orgaoLotacao: string;
  dataPublicacao: string;
  tipoSancao: string;
  fundamentacaoLegal: string;
}

// ── Emendas Types ────────────────────────────────────────────────

export interface EmendasParams extends CguPaginationParams {
  codigoEmenda?: string;
  nomeAutor?: string;
  ano?: number;
}

export interface EmendaItem {
  id: number;
  codigoEmenda: string;
  nomeAutor: string;
  tipoEmenda: string;
  localidadeDoGasto: string;
  funcao: string;
  subfuncao: string;
  valorEmpenhado: number;
  valorPago: number;
}

// ── Viagens Types ────────────────────────────────────────────────

export interface ViagensParams extends CguPaginationParams {
  codigoOrgao?: string;
  cpfBeneficiario?: string;
  dataIdaDe?: string;
  dataIdaAte?: string;
}

export interface ViagemItem {
  id: number;
  codigoOrgao: string;
  nomeOrgao: string;
  cpfBeneficiario: string;
  nomeBeneficiario: string;
  dataIda: string;
  dataRetorno: string;
  destino: string;
  motivo: string;
  valorDiarias: number;
  valorPassagens: number;
  valorOutros: number;
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

  private paginationParams(
    params?: CguPaginationParams,
  ): Record<string, string | number | undefined> {
    return {
      pagina: params?.pagina ?? 1,
      tamanhoPagina: params?.tamanhoPagina ?? 15,
    };
  }

  /** Query the CEIS registry of sanctioned companies. */
  async ceis(params?: CeisParams): Promise<CeisItem[]> {
    return this.client.get<CeisItem[]>(`${this.baseUrl}/ceis`, {
      headers: this.getAuthHeaders(),
      params: {
        ...this.paginationParams(params),
        cnpjSancionado: params?.cnpjSancionado,
        nomeSancionado: params?.nomeSancionado,
        orgaoSancionador: params?.orgaoSancionador,
      },
    });
  }

  /** Query the CNEP registry of penalized companies. */
  async cnep(params?: CnepParams): Promise<CnepItem[]> {
    return this.client.get<CnepItem[]>(`${this.baseUrl}/cnep`, {
      headers: this.getAuthHeaders(),
      params: {
        ...this.paginationParams(params),
        cnpjSancionado: params?.cnpjSancionado,
        nomeSancionado: params?.nomeSancionado,
        orgaoSancionador: params?.orgaoSancionador,
      },
    });
  }

  /** Query the CEPIM registry of entities barred from federal transfers. */
  async cepim(params?: CepimParams): Promise<CepimItem[]> {
    return this.client.get<CepimItem[]>(`${this.baseUrl}/cepim`, {
      headers: this.getAuthHeaders(),
      params: {
        ...this.paginationParams(params),
        cnpjSancionado: params?.cnpjSancionado,
        nomeSancionado: params?.nomeSancionado,
        orgaoSuperior: params?.orgaoSuperior,
      },
    });
  }

  /** Query federal government contracts from the Transparency Portal. */
  async contratos(params?: ContratosParams): Promise<ContratoItem[]> {
    return this.client.get<ContratoItem[]>(`${this.baseUrl}/contratos`, {
      headers: this.getAuthHeaders(),
      params: {
        ...this.paginationParams(params),
        codigoOrgao: params?.codigoOrgao,
        dataInicial: params?.dataInicial,
        dataFinal: params?.dataFinal,
        cpfCnpj: params?.cpfCnpj,
      },
    });
  }

  /** Query federal civil servants from the Transparency Portal. */
  async servidores(params?: ServidoresParams): Promise<ServidorItem[]> {
    return this.client.get<ServidorItem[]>(`${this.baseUrl}/servidores`, {
      headers: this.getAuthHeaders(),
      params: {
        ...this.paginationParams(params),
        orgaoServidores: params?.orgaoServidores,
        orgaoExercicio: params?.orgaoExercicio,
      },
    });
  }

  /** Query the CEAF registry of expelled federal employees. */
  async ceaf(params?: CeafParams): Promise<CeafItem[]> {
    return this.client.get<CeafItem[]>(`${this.baseUrl}/ceaf`, {
      headers: this.getAuthHeaders(),
      params: {
        ...this.paginationParams(params),
        cpfSancionado: params?.cpfSancionado,
        nomeSancionado: params?.nomeSancionado,
        orgaoLotacao: params?.orgaoLotacao,
      },
    });
  }

  /** Query parliamentary budget amendments from the Transparency Portal. */
  async emendas(params?: EmendasParams): Promise<EmendaItem[]> {
    return this.client.get<EmendaItem[]>(`${this.baseUrl}/emendas`, {
      headers: this.getAuthHeaders(),
      params: {
        ...this.paginationParams(params),
        codigoEmenda: params?.codigoEmenda,
        nomeAutor: params?.nomeAutor,
        ano: params?.ano,
      },
    });
  }

  /** Query government travel expenses from the Transparency Portal. */
  async viagens(params?: ViagensParams): Promise<ViagemItem[]> {
    return this.client.get<ViagemItem[]>(`${this.baseUrl}/viagens`, {
      headers: this.getAuthHeaders(),
      params: {
        ...this.paginationParams(params),
        codigoOrgao: params?.codigoOrgao,
        cpfBeneficiario: params?.cpfBeneficiario,
        dataIdaDe: params?.dataIdaDe,
        dataIdaAte: params?.dataIdaAte,
      },
    });
  }
}
