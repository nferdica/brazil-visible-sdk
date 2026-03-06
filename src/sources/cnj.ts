import { BVError } from "../errors";
import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface DataJudParams {
  tribunal?: string;
  classe?: string;
  assunto?: string;
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

export interface DataJudProcesso {
  numeroProcesso: string;
  classeProcessual: string;
  assunto: string;
  tribunal: string;
  dataAjuizamento: string;
  orgaoJulgador: string;
  grau: string;
  nivelSigilo: number;
  [key: string]: string | number;
}

export interface JusticaNumerosParams {
  ano?: number;
  ramo?: string;
  tribunal?: string;
}

export interface JusticaIndicador {
  ano: number;
  ramo: string;
  tribunal: string;
  indicador: string;
  valor: number;
  [key: string]: string | number;
}

// ── Source ──────────────────────────────────────────────────────────

export class CnjSource extends Source {
  readonly name = "CNJ";
  readonly baseUrl = "https://datajud-wiki.cnj.jus.br/api";
  readonly authRequired = true;

  /** Query DataJud court proceedings (requires CNJ registration). */
  async datajud(_params?: DataJudParams): Promise<DataJudProcesso[]> {
    throw new BVError(
      "DataJud requer cadastro especial no CNJ. " +
        "Registre-se em https://datajud-wiki.cnj.jus.br/ para obter credenciais. " +
        "Suporte completo sera adicionado em versao futura.",
      "cnj",
    );
  }

  /** Fetch Justica em Numeros statistical indicators from CNJ. */
  async justicaNumeros(params?: JusticaNumerosParams): Promise<JusticaIndicador[]> {
    return this.client.get<JusticaIndicador[]>("https://paineis.cnj.jus.br/QvAJAXZfc/opendoc.htm", {
      params: {
        ano: params?.ano,
        ramo: params?.ramo,
        tribunal: params?.tribunal,
      },
    });
  }
}
