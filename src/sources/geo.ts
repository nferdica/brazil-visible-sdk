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

export interface CprmParams {
  typeName: string;
  maxFeatures?: number;
  cqlFilter?: string;
}

export interface CprmFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: unknown;
  [key: string]: unknown;
}

export interface IncraParams {
  typeName: string;
  maxFeatures?: number;
  cqlFilter?: string;
}

export interface IncraFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: unknown;
  [key: string]: unknown;
}

export interface IndeParams {
  typeName: string;
  maxFeatures?: number;
  cqlFilter?: string;
}

export interface IndeFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: unknown;
  [key: string]: unknown;
}

export interface InpeSateliteParams {
  satellite?: string;
  sensor?: string;
  startDate?: string;
  endDate?: string;
  bbox?: string;
}

export interface InpeImagem {
  id: string;
  satellite: string;
  sensor: string;
  date: string;
  cloudCover: string;
  path: string;
  row: string;
  thumbUrl: string;
  downloadUrl: string;
  [key: string]: string;
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

  private async wfsGetFeature<T>(
    baseUrl: string,
    params: { typeName: string; maxFeatures?: number; cqlFilter?: string },
  ): Promise<T[]> {
    const response = await this.client.get<{
      type: string;
      features: T[];
    }>(baseUrl, {
      params: {
        service: "WFS",
        version: "2.0.0",
        request: "GetFeature",
        outputFormat: "application/json",
        typeName: params.typeName,
        maxFeatures: params.maxFeatures,
        CQL_FILTER: params.cqlFilter,
      },
    });

    return response.features;
  }

  async cprm(params: CprmParams): Promise<CprmFeature[]> {
    return this.wfsGetFeature<CprmFeature>("https://geosgb.cprm.gov.br/geoserver/wfs", params);
  }

  async incra(params: IncraParams): Promise<IncraFeature[]> {
    return this.wfsGetFeature<IncraFeature>(
      "https://acervofundiario.incra.gov.br/acervo/geoserver/wfs",
      params,
    );
  }

  async inde(params: IndeParams): Promise<IndeFeature[]> {
    return this.wfsGetFeature<IndeFeature>("https://inde.gov.br/geoserver/wfs", params);
  }

  async inpeSatelite(params?: InpeSateliteParams): Promise<InpeImagem[]> {
    return this.client.get<InpeImagem[]>("https://www.dgi.inpe.br/catalogo/explore", {
      params: {
        satellite: params?.satellite,
        sensor: params?.sensor,
        startDate: params?.startDate,
        endDate: params?.endDate,
        bbox: params?.bbox,
      },
    });
  }
}
