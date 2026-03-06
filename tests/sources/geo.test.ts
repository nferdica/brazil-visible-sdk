import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { GeoSource } from "../../src/sources/geo";
import { server } from "../helpers/setup";

const BASE_URL = "https://servicodados.ibge.gov.br/api/v3/malhas";
const client = new BVClient({ maxRetries: 0 });

describe("GeoSource", () => {
  const geo = new GeoSource({ client });

  it("has correct name and baseUrl", () => {
    expect(geo.name).toBe("Dados Geoespaciais");
    expect(geo.baseUrl).toBe(BASE_URL);
  });

  describe("municipios", () => {
    it("returns municipality geojson data", async () => {
      server.use(
        http.get(`${BASE_URL}/municipios`, () => {
          return HttpResponse.json([
            {
              tipo: "Feature",
              geometria: {
                tipo: "Polygon",
                coordenadas: [
                  [
                    [-46.63, -23.55],
                    [-46.64, -23.56],
                    [-46.63, -23.55],
                  ],
                ],
              },
              propriedades: {
                codigo: "3550308",
                nome: "Sao Paulo",
                uf: "SP",
                area: 1521.11,
                populacao: 12325000,
              },
            },
          ]);
        }),
      );

      const result = await geo.municipios();
      expect(result).toHaveLength(1);
      expect(result[0]?.propriedades.nome).toBe("Sao Paulo");
      expect(result[0]?.propriedades.uf).toBe("SP");
    });
  });

  describe("malha", () => {
    it("returns mesh data for a given IBGE code", async () => {
      server.use(
        http.get(`${BASE_URL}/3550308`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("formato")).toBe("application/json");
          return HttpResponse.json({
            type: "FeatureCollection",
            features: [],
          });
        }),
      );

      const result = await geo.malha("3550308");
      expect(result).toHaveProperty("type", "FeatureCollection");
    });
  });

  describe("wmsCapabilities", () => {
    it("fetches WMS capabilities", async () => {
      server.use(
        http.get("https://geoservicos.ibge.gov.br/geoserver/wms", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("service")).toBe("WMS");
          expect(url.searchParams.get("request")).toBe("GetCapabilities");
          return HttpResponse.json({
            layers: [
              {
                name: "municipios",
                title: "Municipios do Brasil",
                abstract: "Malha municipal",
                bbox: [-73.9, -33.75, -34.8, 5.27],
              },
            ],
          });
        }),
      );

      const result = await geo.wmsCapabilities("https://geoservicos.ibge.gov.br/geoserver/wms");
      expect(result.layers).toHaveLength(1);
      expect(result.layers[0]?.name).toBe("municipios");
    });
  });

  describe("cprm", () => {
    it("fetches CPRM geological features via WFS", async () => {
      server.use(
        http.get("https://geosgb.cprm.gov.br/geoserver/wfs", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("service")).toBe("WFS");
          expect(url.searchParams.get("version")).toBe("2.0.0");
          expect(url.searchParams.get("request")).toBe("GetFeature");
          expect(url.searchParams.get("outputFormat")).toBe("application/json");
          expect(url.searchParams.get("typeName")).toBe("geologia:unidades_litoestratigraficas");
          expect(url.searchParams.get("maxFeatures")).toBe("10");
          return HttpResponse.json({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { sigla: "K2bc", nome: "Formacao Bauru" },
                geometry: { type: "Point", coordinates: [-49.5, -22.3] },
              },
            ],
          });
        }),
      );

      const result = await geo.cprm({
        typeName: "geologia:unidades_litoestratigraficas",
        maxFeatures: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.properties.sigla).toBe("K2bc");
    });

    it("passes CQL_FILTER when provided", async () => {
      server.use(
        http.get("https://geosgb.cprm.gov.br/geoserver/wfs", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("CQL_FILTER")).toBe("sigla='K2bc'");
          return HttpResponse.json({
            type: "FeatureCollection",
            features: [],
          });
        }),
      );

      const result = await geo.cprm({
        typeName: "geologia:unidades_litoestratigraficas",
        cqlFilter: "sigla='K2bc'",
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("incra", () => {
    it("fetches INCRA land registry features via WFS", async () => {
      server.use(
        http.get("https://acervofundiario.incra.gov.br/acervo/geoserver/wfs", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("service")).toBe("WFS");
          expect(url.searchParams.get("request")).toBe("GetFeature");
          expect(url.searchParams.get("typeName")).toBe("acervo:assentamentos");
          return HttpResponse.json({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { nome: "PA Eldorado", area_ha: 1500 },
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [-50, -12],
                      [-49, -12],
                      [-49, -11],
                      [-50, -12],
                    ],
                  ],
                },
              },
            ],
          });
        }),
      );

      const result = await geo.incra({ typeName: "acervo:assentamentos" });
      expect(result).toHaveLength(1);
      expect(result[0]?.properties.nome).toBe("PA Eldorado");
    });
  });

  describe("inde", () => {
    it("fetches INDE spatial features via WFS", async () => {
      server.use(
        http.get("https://inde.gov.br/geoserver/wfs", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("service")).toBe("WFS");
          expect(url.searchParams.get("request")).toBe("GetFeature");
          expect(url.searchParams.get("typeName")).toBe("inde:rodovias");
          expect(url.searchParams.get("maxFeatures")).toBe("5");
          return HttpResponse.json({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { nome: "BR-101", jurisdicao: "Federal" },
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [-43.1, -22.9],
                    [-43.2, -23.0],
                  ],
                },
              },
              {
                type: "Feature",
                properties: { nome: "BR-116", jurisdicao: "Federal" },
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [-43.3, -22.8],
                    [-43.4, -22.9],
                  ],
                },
              },
            ],
          });
        }),
      );

      const result = await geo.inde({ typeName: "inde:rodovias", maxFeatures: 5 });
      expect(result).toHaveLength(2);
      expect(result[0]?.properties.nome).toBe("BR-101");
      expect(result[1]?.properties.nome).toBe("BR-116");
    });
  });

  describe("inpeSatelite", () => {
    it("fetches INPE satellite image metadata", async () => {
      server.use(
        http.get("https://www.dgi.inpe.br/catalogo/explore", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("satellite")).toBe("CBERS4A");
          expect(url.searchParams.get("sensor")).toBe("WPM");
          expect(url.searchParams.get("startDate")).toBe("2025-01-01");
          expect(url.searchParams.get("endDate")).toBe("2025-01-31");
          return HttpResponse.json([
            {
              id: "CBERS4A_WPM_20250115",
              satellite: "CBERS4A",
              sensor: "WPM",
              date: "2025-01-15",
              cloudCover: "10",
              path: "215",
              row: "076",
              thumbUrl: "https://www.dgi.inpe.br/thumb/CBERS4A_WPM_20250115.png",
              downloadUrl: "https://www.dgi.inpe.br/download/CBERS4A_WPM_20250115.tif",
            },
          ]);
        }),
      );

      const result = await geo.inpeSatelite({
        satellite: "CBERS4A",
        sensor: "WPM",
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("CBERS4A_WPM_20250115");
      expect(result[0]?.satellite).toBe("CBERS4A");
      expect(result[0]?.cloudCover).toBe("10");
    });

    it("works with no parameters", async () => {
      server.use(
        http.get("https://www.dgi.inpe.br/catalogo/explore", () => {
          return HttpResponse.json([]);
        }),
      );

      const result = await geo.inpeSatelite();
      expect(result).toHaveLength(0);
    });
  });
});
