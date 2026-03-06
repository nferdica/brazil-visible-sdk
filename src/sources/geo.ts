import { Source } from "./base";

// ── Types ──────────────────────────────────────────────────────────

export interface GeoMunicipioParams {
  codigo?: string;
  nome?: string;
}

export interface GeoMunicipio {
  tipo: string;
  geometria: {
    tipo: string;
    coordenadas: number[][][];
  };
  propriedades: {
    codigo: string;
    nome: string;
    uf: string;
    area: number;
    populacao: number;
    [key: string]: string | number;
  };
  [key: string]: unknown;
}

export interface GeoMalhaParams {
  resolucao?: number;
  qualidade?: string;
  formato?: string;
}

export interface WmsLayerParams {
  layer: string;
  bbox: string;
  width?: number;
  height?: number;
  format?: string;
}

export interface WmsCapabilities {
  layers: WmsLayer[];
  [key: string]: unknown;
}

export interface WmsLayer {
  name: string;
  title: string;
  abstract: string;
  bbox: number[];
  [key: string]: string | number | number[];
}

// ── Source ──────────────────────────────────────────────────────────

export class GeoSource extends Source {
  readonly name = "Dados Geoespaciais";
  readonly baseUrl = "https://servicodados.ibge.gov.br/api/v3/malhas";

  async municipios(params?: GeoMunicipioParams): Promise<GeoMunicipio[]> {
    return this.client.get<GeoMunicipio[]>(`${this.baseUrl}/municipios`, {
      params: {
        codigo: params?.codigo,
        nome: params?.nome,
        formato: "application/json",
      },
    });
  }

  async malha(codigoIbge: string, params?: GeoMalhaParams): Promise<unknown> {
    return this.client.get(`${this.baseUrl}/${codigoIbge}`, {
      params: {
        resolucao: params?.resolucao,
        qualidade: params?.qualidade,
        formato: params?.formato ?? "application/json",
      },
    });
  }

  async wmsCapabilities(serviceUrl: string): Promise<WmsCapabilities> {
    return this.client.get<WmsCapabilities>(serviceUrl, {
      params: {
        service: "WMS",
        request: "GetCapabilities",
      },
    });
  }

  async wmsGetMap(serviceUrl: string, params: WmsLayerParams): Promise<unknown> {
    return this.client.get(serviceUrl, {
      params: {
        service: "WMS",
        request: "GetMap",
        layers: params.layer,
        bbox: params.bbox,
        width: params.width ?? 800,
        height: params.height ?? 600,
        format: params.format ?? "image/png",
        srs: "EPSG:4326",
      },
    });
  }
}
