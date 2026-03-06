import { getConfig } from "../config";
import { BVValidationError } from "../errors";
import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface CadinParams {
  cpfCnpj?: string;
  nomeDevedor?: string;
  orgao?: string;
}

export interface CadinItem {
  cpfCnpj: string;
  nomeDevedor: string;
  orgaoCredor: string;
  valorInscrito: number;
  dataInscricao: string;
  situacao: string;
  [key: string]: string | number;
}

export interface SiorgParams {
  codigo?: string;
  nome?: string;
  esfera?: string;
}

export interface SiorgOrgao {
  codigo: string;
  nome: string;
  sigla: string;
  esfera: string;
  poder: string;
  naturezaJuridica: string;
  orgaoSuperior: string;
  situacao: string;
  [key: string]: string;
}

export interface SiapeServidorParams {
  orgao?: string;
  cargo?: string;
}

export interface SiapeServidor {
  nome: string;
  orgao: string;
  cargo: string;
  funcao: string;
  situacao: string;
  remuneracaoBasica: number;
  totalRendimentos: number;
  [key: string]: string | number;
}

// ── Source ──────────────────────────────────────────────────────────

export class GovernamentaisSource extends Source {
  readonly name = "APIs Governamentais";
  readonly baseUrl = "https://dados.gov.br/dados/api/publico";

  /** Query the CADIN federal debtors registry. */
  async cadin(params?: CadinParams): Promise<CadinItem[]> {
    return this.client.get<CadinItem[]>(`${this.baseUrl}/cadin`, {
      params: {
        cpfCnpj: params?.cpfCnpj,
        nomeDevedor: params?.nomeDevedor,
        orgao: params?.orgao,
      },
    });
  }

  /** Query the SIORG federal organizational structure registry. */
  async siorg(params?: SiorgParams): Promise<SiorgOrgao[]> {
    return this.client.get<SiorgOrgao[]>(
      "https://estruturaorganizacional.dados.gov.br/api/unidades",
      {
        params: {
          codigo: params?.codigo,
          nome: params?.nome,
          esfera: params?.esfera,
        },
      },
    );
  }

  /** Query SIAPE federal civil servant payroll data. */
  async siape(params?: SiapeServidorParams): Promise<SiapeServidor[]> {
    const apiKey = getConfig().apiKeys?.cgu;
    if (!apiKey) {
      throw new BVValidationError(
        "apiKey",
        "CGU API key required for Portal da Transparencia. Configure via configure({ apiKeys: { cgu: '...' } })",
        "governamentais",
      );
    }

    return this.client.get<SiapeServidor[]>(
      "https://api.portaldatransparencia.gov.br/api-de-dados/servidores",
      {
        headers: { "chave-api-dados": apiKey },
        params: {
          orgaoServidores: params?.orgao,
          cargo: params?.cargo,
        },
      },
    );
  }
}
