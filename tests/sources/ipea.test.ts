import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { IpeaSource } from "../../src/sources/ipea";
import { server } from "../helpers/setup";

const client = new BVClient({ maxRetries: 0 });
const ipea = new IpeaSource({ client });

const BASE = "https://ipeadata.gov.br/api/odata4";

describe("IpeaSource", () => {
  it("has correct name and baseUrl", () => {
    expect(ipea.name).toBe("IPEA");
    expect(ipea.baseUrl).toBe(BASE);
  });

  describe("series", () => {
    it("fetches time series and extracts value array", async () => {
      server.use(
        http.get(`${BASE}/:odata`, ({ request, params }) => {
          expect(params.odata).toBe("ValoresSerie(SERCODIGO='PRECOS12_IPCA12')");
          const url = new URL(request.url);
          expect(url.searchParams.get("$format")).toBe("json");
          return HttpResponse.json({
            "@odata.context": "https://ipeadata.gov.br/api/odata4/$metadata#ValoresSerie",
            value: [
              {
                SERCODIGO: "PRECOS12_IPCA12",
                VALDATA: "2024-01-01T00:00:00-03:00",
                VALVALOR: 4.51,
                NIVNOME: "",
                TERCODIGO: "",
              },
              {
                SERCODIGO: "PRECOS12_IPCA12",
                VALDATA: "2024-02-01T00:00:00-03:00",
                VALVALOR: 4.5,
                NIVNOME: "",
                TERCODIGO: "",
              },
            ],
          });
        }),
      );

      const result = await ipea.series({ codigo: "PRECOS12_IPCA12" });
      expect(result).toHaveLength(2);
      expect(result[0]?.SERCODIGO).toBe("PRECOS12_IPCA12");
      expect(result[0]?.VALVALOR).toBe(4.51);
      expect(result[1]?.VALVALOR).toBe(4.5);
    });

    it("passes OData query params ($top, $skip, $orderby)", async () => {
      server.use(
        http.get(`${BASE}/:odata`, ({ request, params }) => {
          expect(params.odata).toBe("ValoresSerie(SERCODIGO='PRECOS12_IPCA12')");
          const url = new URL(request.url);
          expect(url.searchParams.get("$top")).toBe("5");
          expect(url.searchParams.get("$skip")).toBe("10");
          expect(url.searchParams.get("$orderby")).toBe("VALDATA desc");
          expect(url.searchParams.get("$format")).toBe("json");
          return HttpResponse.json({
            "@odata.context": "...",
            value: [
              {
                SERCODIGO: "PRECOS12_IPCA12",
                VALDATA: "2024-12-01T00:00:00-03:00",
                VALVALOR: 4.83,
                NIVNOME: "",
                TERCODIGO: "",
              },
            ],
          });
        }),
      );

      const result = await ipea.series({
        codigo: "PRECOS12_IPCA12",
        top: 5,
        skip: 10,
        orderBy: "VALDATA desc",
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.VALVALOR).toBe(4.83);
    });
  });

  describe("metadados", () => {
    it("lists all metadata with pagination", async () => {
      server.use(
        http.get(`${BASE}/Metadados`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("$top")).toBe("10");
          expect(url.searchParams.get("$skip")).toBe("0");
          return HttpResponse.json({
            "@odata.context": "https://ipeadata.gov.br/api/odata4/$metadata#Metadados",
            value: [
              {
                SERCODIGO: "PRECOS12_IPCA12",
                SERNOME: "IPCA - geral - índice (dez. 1993 = 100)",
                SERCOMENTARIO: "Comentario",
                SERATUALIZACAO: "2024-01-15T00:00:00-03:00",
                BASNOME: "Macroeconômico",
                FNTSIGLA: "IBGE/SNIPC",
                FNTNOME: "IBGE, Sistema Nacional de Índices de Preços ao Consumidor",
                FNTURL: "http://www.ibge.gov.br",
                PERNOME: "Mensal",
                UNINOME: "(%)",
                MULNOME: "",
                SERSTATUS: "A",
                TEMCODIGO: 10,
                SERTEMBR: "Preços",
              },
            ],
          });
        }),
      );

      const result = await ipea.metadados({ top: 10, skip: 0 });
      expect(result).toHaveLength(1);
      expect(result[0]?.SERCODIGO).toBe("PRECOS12_IPCA12");
      expect(result[0]?.SERNOME).toBe("IPCA - geral - índice (dez. 1993 = 100)");
      expect(result[0]?.FNTSIGLA).toBe("IBGE/SNIPC");
    });

    it("fetches single series metadata and wraps in array", async () => {
      server.use(
        http.get(`${BASE}/:odata`, ({ params }) => {
          expect(params.odata).toBe("Metadados('PRECOS12_IPCA12')");
          return HttpResponse.json({
            "@odata.context": "https://ipeadata.gov.br/api/odata4/$metadata#Metadados/$entity",
            SERCODIGO: "PRECOS12_IPCA12",
            SERNOME: "IPCA - geral - índice (dez. 1993 = 100)",
            SERCOMENTARIO: "Comentario",
            SERATUALIZACAO: "2024-01-15T00:00:00-03:00",
            BASNOME: "Macroeconômico",
            FNTSIGLA: "IBGE/SNIPC",
            FNTNOME: "IBGE, Sistema Nacional de Índices de Preços ao Consumidor",
            FNTURL: "http://www.ibge.gov.br",
            PERNOME: "Mensal",
            UNINOME: "(%)",
            MULNOME: "",
            SERSTATUS: "A",
            TEMCODIGO: 10,
            SERTEMBR: "Preços",
          });
        }),
      );

      const result = await ipea.metadados({ codigo: "PRECOS12_IPCA12" });
      expect(result).toHaveLength(1);
      expect(result[0]?.SERCODIGO).toBe("PRECOS12_IPCA12");
      expect(result[0]?.SERNOME).toBe("IPCA - geral - índice (dez. 1993 = 100)");
    });
  });
});
