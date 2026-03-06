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

  async cadin(params?: CadinParams): Promise<CadinItem[]> {
    return this.client.get<CadinItem[]>(`${this.baseUrl}/cadin`, {
      params: {
        cpfCnpj: params?.cpfCnpj,
        nomeDevedor: params?.nomeDevedor,
        orgao: params?.orgao,
      },
    });
  }

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

  async siape(params?: SiapeServidorParams): Promise<SiapeServidor[]> {
    return this.client.get<SiapeServidor[]>(
      "https://api.portaldatransparencia.gov.br/api-de-dados/servidores",
      {
        params: {
          orgaoServidores: params?.orgao,
          cargo: params?.cargo,
        },
      },
    );
  }
}
