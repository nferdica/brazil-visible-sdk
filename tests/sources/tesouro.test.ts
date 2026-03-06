import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { TesouroSource } from "../../src/sources/tesouro";
import { server } from "../helpers/setup";

const client = new BVClient({ maxRetries: 0 });
const tesouro = new TesouroSource({ client });

const BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";

describe("TesouroSource", () => {
  it("has correct name and baseUrl", () => {
    expect(tesouro.name).toBe("Tesouro Nacional");
    expect(tesouro.baseUrl).toBe(BASE);
  });

  describe("entes", () => {
    it("returns items from wrapped response", async () => {
      server.use(
        http.get(`${BASE}/entes`, () => {
          return HttpResponse.json({
            items: [
              {
                cod_ibge: 3550308,
                ente: "São Paulo",
                capital: "1",
                regiao: "Sudeste",
                uf: "SP",
                esfera: "M",
                exercicio: 2024,
                populacao: 12325232,
                cnpj: "46395000/0001-39",
              },
            ],
            hasMore: false,
            limit: 5000,
            offset: 0,
            count: 1,
            links: [],
          });
        }),
      );

      const result = await tesouro.entes();
      expect(result).toHaveLength(1);
      expect(result[0]?.cod_ibge).toBe(3550308);
      expect(result[0]?.ente).toBe("São Paulo");
      expect(result[0]?.esfera).toBe("M");
    });

    it("passes query params correctly", async () => {
      server.use(
        http.get(`${BASE}/entes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("an_referencia")).toBe("2024");
          expect(url.searchParams.get("id_esfera")).toBe("E");
          expect(url.searchParams.get("uf")).toBe("SP");
          return HttpResponse.json({
            items: [
              {
                cod_ibge: 35,
                ente: "São Paulo",
                capital: "",
                regiao: "Sudeste",
                uf: "SP",
                esfera: "E",
                exercicio: 2024,
                populacao: 46649132,
                cnpj: "46379400/0001-50",
              },
            ],
            hasMore: false,
            limit: 5000,
            offset: 0,
            count: 1,
            links: [],
          });
        }),
      );

      const result = await tesouro.entes({
        anoReferencia: 2024,
        esfera: "E",
        uf: "SP",
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.uf).toBe("SP");
      expect(result[0]?.esfera).toBe("E");
    });
  });

  describe("rreo", () => {
    it("builds correct URL with all params and extracts items", async () => {
      server.use(
        http.get(`${BASE}/rreo`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("an_exercicio")).toBe("2024");
          expect(url.searchParams.get("nr_periodo")).toBe("1");
          expect(url.searchParams.get("co_tipo_demonstrativo")).toBe("RREO");
          expect(url.searchParams.get("id_ente")).toBe("3550308");
          expect(url.searchParams.get("no_anexo")).toBe("RREO-Anexo 01");
          return HttpResponse.json({
            items: [
              {
                exercicio: 2024,
                demonstrativo: "RREO",
                periodo: 1,
                periodicidade: "B",
                instituicao: "Prefeitura Municipal",
                cod_ibge: 3550308,
                uf: "SP",
                populacao: 12325232,
                anexo: "RREO-Anexo 01",
                esfera: "M",
                rotulo: "Receitas Correntes",
                coluna: "PREVISÃO ATUALIZADA",
                cod_conta: "1.0.0.0.00.0.0",
                conta: "RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)",
                valor: 12345678.9,
              },
            ],
            hasMore: false,
            limit: 5000,
            offset: 0,
            count: 1,
            links: [],
          });
        }),
      );

      const result = await tesouro.rreo({
        exercicio: 2024,
        periodo: 1,
        ente: 3550308,
        anexo: "RREO-Anexo 01",
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.exercicio).toBe(2024);
      expect(result[0]?.demonstrativo).toBe("RREO");
      expect(result[0]?.cod_ibge).toBe(3550308);
      expect(result[0]?.valor).toBe(12345678.9);
    });
  });

  describe("rgf", () => {
    it("builds correct URL with all params and extracts items", async () => {
      server.use(
        http.get(`${BASE}/rgf`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("an_exercicio")).toBe("2024");
          expect(url.searchParams.get("in_periodicidade")).toBe("Q");
          expect(url.searchParams.get("nr_periodo")).toBe("2");
          expect(url.searchParams.get("co_tipo_demonstrativo")).toBe("RGF");
          expect(url.searchParams.get("id_ente")).toBe("3550308");
          expect(url.searchParams.get("no_anexo")).toBe("RGF-Anexo 01");
          return HttpResponse.json({
            items: [
              {
                exercicio: 2024,
                demonstrativo: "RGF",
                periodo: 2,
                periodicidade: "Q",
                instituicao: "Prefeitura Municipal",
                cod_ibge: 3550308,
                uf: "SP",
                populacao: 12325232,
                anexo: "RGF-Anexo 01",
                esfera: "M",
                rotulo: "Despesa Total com Pessoal",
                coluna: "VALOR",
                cod_conta: "1.0.0.0",
                conta: "DESPESA TOTAL COM PESSOAL",
                valor: 9876543.21,
              },
            ],
            hasMore: false,
            limit: 5000,
            offset: 0,
            count: 1,
            links: [],
          });
        }),
      );

      const result = await tesouro.rgf({
        exercicio: 2024,
        periodicidade: "Q",
        periodo: 2,
        ente: 3550308,
        anexo: "RGF-Anexo 01",
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.exercicio).toBe(2024);
      expect(result[0]?.demonstrativo).toBe("RGF");
      expect(result[0]?.periodicidade).toBe("Q");
      expect(result[0]?.valor).toBe(9876543.21);
    });
  });
});
