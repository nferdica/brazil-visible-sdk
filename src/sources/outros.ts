import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

// ANS — Agência Nacional de Saúde Suplementar
export interface AnsOperadoraParams {
  registro?: string;
  razaoSocial?: string;
  uf?: string;
}

export interface AnsOperadora {
  registroAns: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  modalidade: string;
  uf: string;
  municipio: string;
  beneficiarios: number;
  situacao: string;
  [key: string]: string | number;
}

// ANTAQ — Agência Nacional de Transportes Aquaviários
export interface AntaqPortoParams {
  codigo?: string;
  nome?: string;
  uf?: string;
}

export interface AntaqPorto {
  codigo: string;
  nome: string;
  uf: string;
  municipio: string;
  tipoInstalacao: string;
  situacao: string;
  latitude: number;
  longitude: number;
  [key: string]: string | number;
}

// ANCINE — Agência Nacional do Cinema
export interface AncineProjeto {
  salic: string;
  titulo: string;
  proponente: string;
  cnpjProponente: string;
  segmento: string;
  situacao: string;
  valorAprovado: number;
  valorCaptado: number;
  [key: string]: string | number;
}

// ── Source ──────────────────────────────────────────────────────────

export class OutrosSource extends Source {
  readonly name = "Outras Agências";
  readonly baseUrl = "https://dados.gov.br/dados/api/publico";

  /** Fetch ANS health insurance operators registry. */
  async ansOperadoras(params?: AnsOperadoraParams): Promise<AnsOperadora[]> {
    return this.client.get<AnsOperadora[]>(
      "https://dadosabertos.ans.gov.br/api/3/action/datastore_search",
      {
        params: {
          registro: params?.registro,
          razaoSocial: params?.razaoSocial,
          uf: params?.uf,
        },
      },
    );
  }

  /** Fetch ANTAQ port facilities registry. */
  async antaqPortos(params?: AntaqPortoParams): Promise<AntaqPorto[]> {
    return this.client.get<AntaqPorto[]>("https://web.antaq.gov.br/api/portos", {
      params: {
        codigo: params?.codigo,
        nome: params?.nome,
        uf: params?.uf,
      },
    });
  }

  /** Fetch ANCINE audiovisual projects registry. */
  async ancineProjetos(): Promise<AncineProjeto[]> {
    return this.client.get<AncineProjeto[]>("https://api.ancine.gov.br/projetos");
  }
}
