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
});
