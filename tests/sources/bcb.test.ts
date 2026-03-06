import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { BVValidationError } from "../../src/errors";
import { BcbSource } from "../../src/sources/bcb";
import { server } from "../helpers/setup";

const client = new BVClient({ maxRetries: 0 });
const bcb = new BcbSource({ client });

describe("BcbSource", () => {
  it("has correct name and baseUrl", () => {
    expect(bcb.name).toBe("Banco Central do Brasil");
    expect(bcb.baseUrl).toBe("https://api.bcb.gov.br");
  });

  describe("sgs", () => {
    it("fetches a series and normalizes the response", async () => {
      server.use(
        http.get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("formato")).toBe("json");
          expect(url.searchParams.get("dataInicial")).toBe("01/01/2024");
          expect(url.searchParams.get("dataFinal")).toBe("31/01/2024");
          return HttpResponse.json([
            { data: "02/01/2024", valor: "0.043739" },
            { data: "03/01/2024", valor: "0.043739" },
          ]);
        }),
      );

      const result = await bcb.sgs({
        serie: 11,
        dataInicial: "2024-01-01",
        dataFinal: "2024-01-31",
      });

      expect(result).toEqual([
        { data: "2024-01-02", valor: 0.043739 },
        { data: "2024-01-03", valor: 0.043739 },
      ]);
    });

    it("fetches a series without date range", async () => {
      server.use(
        http.get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("formato")).toBe("json");
          expect(url.searchParams.has("dataInicial")).toBe(false);
          return HttpResponse.json([{ data: "01/01/2024", valor: "0.56" }]);
        }),
      );

      const result = await bcb.sgs({ serie: 433 });
      expect(result).toEqual([{ data: "2024-01-01", valor: 0.56 }]);
    });

    it("throws BVValidationError for invalid serie", async () => {
      await expect(bcb.sgs({ serie: -1 })).rejects.toThrow(BVValidationError);
      await expect(bcb.sgs({ serie: 0 })).rejects.toThrow(BVValidationError);
    });

    it("handles null valor gracefully", async () => {
      server.use(
        http.get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados", () => {
          return HttpResponse.json([{ data: "02/01/2024", valor: null }]);
        }),
      );

      const result = await bcb.sgs({ serie: 11 });
      expect(result).toEqual([{ data: "2024-01-02", valor: null }]);
    });
  });

  describe("expectativas", () => {
    it("fetches OLINDA market expectations", async () => {
      server.use(
        http.get(
          "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativaMercadoMensais",
          ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get("$format")).toBe("json");
            expect(url.searchParams.get("$top")).toBe("5");
            expect(url.searchParams.get("$filter")).toContain("IPCA");
            return HttpResponse.json({
              "@odata.context": "...",
              value: [
                {
                  Indicador: "IPCA",
                  Data: "2024-01-15",
                  DataReferencia: "01/2024",
                  Media: 0.49,
                  Mediana: 0.5,
                  DesvioPadrao: 0.08,
                  Minimo: 0.3,
                  Maximo: 0.68,
                  numeroRespondentes: 30,
                  baseCalculo: 1,
                },
              ],
            });
          },
        ),
      );

      const result = await bcb.expectativas({ indicador: "IPCA", top: 5 });
      expect(result).toHaveLength(1);
      expect(result[0]?.Indicador).toBe("IPCA");
      expect(result[0]?.Media).toBe(0.49);
    });
  });

  describe("ifdata", () => {
    const ifdataUrl = "https://olinda.bcb.gov.br/olinda/servico/IF.data/versao/v1/odata/IfData";

    const mockItem = {
      CodInst: "1234",
      NomeInst: "Banco Teste",
      AnoBase: 2023,
      CodConta: "100",
      NomeConta: "Ativo Total",
      Valor: "999999.99",
    };

    it("fetches IF.data with codInst and anoBase filters", async () => {
      server.use(
        http.get(ifdataUrl, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("$format")).toBe("json");
          expect(url.searchParams.get("$filter")).toBe("CodInst eq '1234' and AnoBase eq 2023");
          return HttpResponse.json({
            "@odata.context": "...",
            value: [mockItem],
          });
        }),
      );

      const result = await bcb.ifdata({ codInst: "1234", anoBase: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.CodInst).toBe("1234");
      expect(result[0]?.NomeInst).toBe("Banco Teste");
      expect(result[0]?.AnoBase).toBe(2023);
    });

    it("fetches IF.data with custom filter and top/skip", async () => {
      server.use(
        http.get(ifdataUrl, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("$format")).toBe("json");
          expect(url.searchParams.get("$top")).toBe("10");
          expect(url.searchParams.get("$skip")).toBe("5");
          expect(url.searchParams.get("$filter")).toBe("AnoBase eq 2022");
          return HttpResponse.json({
            "@odata.context": "...",
            value: [mockItem],
          });
        }),
      );

      const result = await bcb.ifdata({
        filter: "AnoBase eq 2022",
        top: 10,
        skip: 5,
      });
      expect(result).toHaveLength(1);
    });

    it("fetches IF.data with no params", async () => {
      server.use(
        http.get(ifdataUrl, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("$format")).toBe("json");
          expect(url.searchParams.has("$filter")).toBe(false);
          expect(url.searchParams.has("$top")).toBe(false);
          return HttpResponse.json({
            "@odata.context": "...",
            value: [mockItem, mockItem],
          });
        }),
      );

      const result = await bcb.ifdata();
      expect(result).toHaveLength(2);
    });

    it("applies orderBy param", async () => {
      server.use(
        http.get(ifdataUrl, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("$orderby")).toBe("AnoBase desc");
          return HttpResponse.json({
            "@odata.context": "...",
            value: [],
          });
        }),
      );

      const result = await bcb.ifdata({ orderBy: "AnoBase desc" });
      expect(result).toEqual([]);
    });
  });
});
