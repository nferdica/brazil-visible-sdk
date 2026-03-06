import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { configure, resetConfig } from "../../src/config";
import { PortaisSource } from "../../src/sources/portais";
import { server } from "../helpers/setup";

const BASE_URL = "https://dados.gov.br/dados/api/publico";
const client = new BVClient({ maxRetries: 0 });

describe("PortaisSource", () => {
  const portais = new PortaisSource({ client });

  it("has correct name and baseUrl", () => {
    expect(portais.name).toBe("Portais de Dados Abertos");
    expect(portais.baseUrl).toBe(BASE_URL);
  });

  describe("buscarConjuntos", () => {
    it("searches datasets by keyword", async () => {
      server.use(
        http.get(`${BASE_URL}/conjuntos-dados`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("saude");
          expect(url.searchParams.get("pagina")).toBe("1");
          return HttpResponse.json({
            result: [
              {
                id: "ds-001",
                titulo: "Dados de Saude",
                descricao: "Indicadores de saude publica",
                organizacao: "Ministerio da Saude",
                temas: ["saude"],
                formatos: ["csv", "json"],
                dataAtualizacao: "2024-01-15",
                url: "https://dados.gov.br/dataset/saude",
              },
            ],
          });
        }),
      );

      const result = await portais.buscarConjuntos({ q: "saude" });
      expect(result).toHaveLength(1);
      expect(result[0]?.titulo).toBe("Dados de Saude");
      expect(result[0]?.organizacao).toBe("Ministerio da Saude");
    });
  });

  describe("recursos", () => {
    it("lists resources for a dataset", async () => {
      server.use(
        http.get(`${BASE_URL}/conjuntos-dados/ds-001/recursos`, () => {
          return HttpResponse.json({
            result: [
              {
                id: "res-001",
                nome: "dados-2024.csv",
                descricao: "Dados do ano 2024",
                formato: "csv",
                url: "https://dados.gov.br/download/dados-2024.csv",
                tamanho: 1048576,
                dataAtualizacao: "2024-01-15",
              },
            ],
          });
        }),
      );

      const result = await portais.recursos({ conjuntoId: "ds-001" });
      expect(result).toHaveLength(1);
      expect(result[0]?.nome).toBe("dados-2024.csv");
      expect(result[0]?.formato).toBe("csv");
    });
  });

  describe("baseDados", () => {
    it("searches Base dos Dados datasets", async () => {
      server.use(
        http.get("https://basedosdados.org/api/3/action/package_search", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("educacao");
          expect(url.searchParams.get("rows")).toBe("10");
          return HttpResponse.json({
            success: true,
            result: {
              results: [
                {
                  id: "bd-001",
                  name: "educacao-basica",
                  title: "Educacao Basica",
                  organization: "INEP",
                  notes: "Dados de educacao basica no Brasil",
                  num_resources: 3,
                },
              ],
            },
          });
        }),
      );

      const result = await portais.baseDados({ q: "educacao", rows: 10 });
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Educacao Basica");
      expect(result[0]?.organization).toBe("INEP");
      expect(result[0]?.num_resources).toBe(3);
    });

    it("returns datasets without params", async () => {
      server.use(
        http.get("https://basedosdados.org/api/3/action/package_search", () => {
          return HttpResponse.json({
            success: true,
            result: {
              results: [
                {
                  id: "bd-002",
                  name: "pib-municipal",
                  title: "PIB Municipal",
                  organization: "IBGE",
                  notes: "PIB por municipio",
                  num_resources: 1,
                },
              ],
            },
          });
        }),
      );

      const result = await portais.baseDados();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("pib-municipal");
    });
  });

  describe("execucaoOrcamentaria", () => {
    beforeEach(() => {
      configure({ apiKeys: { cgu: "test-api-key" } });
    });

    afterEach(() => {
      resetConfig();
    });

    it("returns budget execution data", async () => {
      server.use(
        http.get(
          "https://api.portaldatransparencia.gov.br/api-de-dados/despesas/por-orgao",
          ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get("ano")).toBe("2024");
            return HttpResponse.json([
              {
                ano: 2024,
                orgao: "Ministerio da Saude",
                unidadeOrcamentaria: "Hospital Federal",
                funcao: "Saude",
                subfuncao: "Atencao Basica",
                programa: "SUS",
                acao: "Manutencao",
                valorEmpenhado: 5000000,
                valorLiquidado: 4500000,
                valorPago: 4000000,
              },
            ]);
          },
        ),
      );

      const result = await portais.execucaoOrcamentaria({ ano: 2024 });
      expect(result).toHaveLength(1);
      expect(result[0]?.orgao).toBe("Ministerio da Saude");
      expect(result[0]?.valorPago).toBe(4000000);
    });
  });
});
