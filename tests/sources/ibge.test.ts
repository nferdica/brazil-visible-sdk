import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { BVValidationError } from "../../src/errors";
import { IbgeSource } from "../../src/sources/ibge";
import { server } from "../helpers/setup";

const client = new BVClient({ maxRetries: 0 });
const ibge = new IbgeSource({ client });

describe("IbgeSource", () => {
  it("has correct name and baseUrl", () => {
    expect(ibge.name).toBe("IBGE");
    expect(ibge.baseUrl).toBe("https://servicodados.ibge.gov.br");
  });

  describe("Localidades", () => {
    it("regioes() returns typed array", async () => {
      server.use(
        http.get("https://servicodados.ibge.gov.br/api/v1/localidades/regioes", () => {
          return HttpResponse.json([
            { id: 1, sigla: "N", nome: "Norte" },
            { id: 3, sigla: "SE", nome: "Sudeste" },
          ]);
        }),
      );

      const result = await ibge.regioes();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1, sigla: "N", nome: "Norte" });
      expect(result[1]).toEqual({ id: 3, sigla: "SE", nome: "Sudeste" });
    });

    it("estados() returns all states", async () => {
      server.use(
        http.get("https://servicodados.ibge.gov.br/api/v1/localidades/estados", () => {
          return HttpResponse.json([
            {
              id: 35,
              sigla: "SP",
              nome: "São Paulo",
              regiao: { id: 3, sigla: "SE", nome: "Sudeste" },
            },
          ]);
        }),
      );

      const result = await ibge.estados();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 35,
        sigla: "SP",
        nome: "São Paulo",
        regiao: { id: 3, sigla: "SE", nome: "Sudeste" },
      });
    });

    it("estados({ regiao: 3 }) filters by region using different URL path", async () => {
      server.use(
        http.get("https://servicodados.ibge.gov.br/api/v1/localidades/regioes/3/estados", () => {
          return HttpResponse.json([
            {
              id: 35,
              sigla: "SP",
              nome: "São Paulo",
              regiao: { id: 3, sigla: "SE", nome: "Sudeste" },
            },
            {
              id: 33,
              sigla: "RJ",
              nome: "Rio de Janeiro",
              regiao: { id: 3, sigla: "SE", nome: "Sudeste" },
            },
          ]);
        }),
      );

      const result = await ibge.estados({ regiao: 3 });
      expect(result).toHaveLength(2);
      expect(result[0]?.sigla).toBe("SP");
      expect(result[1]?.sigla).toBe("RJ");
    });

    it("municipios({ uf: 35 }) filters by UF", async () => {
      server.use(
        http.get(
          "https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios",
          () => {
            return HttpResponse.json([
              {
                id: 3550308,
                nome: "São Paulo",
                microrregiao: {
                  id: 35061,
                  nome: "São Paulo",
                  mesorregiao: {
                    id: 3515,
                    nome: "Metropolitana de São Paulo",
                    UF: {
                      id: 35,
                      sigla: "SP",
                      nome: "São Paulo",
                      regiao: { id: 3, sigla: "SE", nome: "Sudeste" },
                    },
                  },
                },
              },
            ]);
          },
        ),
      );

      const result = await ibge.municipios({ uf: 35 });
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(3550308);
      expect(result[0]?.nome).toBe("São Paulo");
      expect(result[0]?.microrregiao.mesorregiao.UF.sigla).toBe("SP");
    });

    it("distritos() returns all districts", async () => {
      server.use(
        http.get("https://servicodados.ibge.gov.br/api/v1/localidades/distritos", () => {
          return HttpResponse.json([
            {
              id: 355030801,
              nome: "São Paulo",
              municipio: {
                id: 3550308,
                nome: "São Paulo",
                microrregiao: {
                  id: 35061,
                  nome: "São Paulo",
                  mesorregiao: {
                    id: 3515,
                    nome: "Metropolitana de São Paulo",
                    UF: {
                      id: 35,
                      sigla: "SP",
                      nome: "São Paulo",
                      regiao: { id: 3, sigla: "SE", nome: "Sudeste" },
                    },
                  },
                },
              },
            },
          ]);
        }),
      );

      const result = await ibge.distritos();
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(355030801);
      expect(result[0]?.municipio.id).toBe(3550308);
    });
  });

  describe("Agregados", () => {
    it("agregados() builds correct URL and converts string values to numbers", async () => {
      server.use(
        http.get(
          "https://servicodados.ibge.gov.br/api/v3/agregados/9324/periodos/202312/variaveis/9324",
          ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get("localidades")).toBe("N1");
            return HttpResponse.json([
              {
                id: "9324",
                variavel: "População residente estimada",
                unidade: "Pessoas",
                resultados: [
                  {
                    classificacoes: [],
                    series: [
                      {
                        localidade: {
                          id: "1",
                          nivel: { id: "N1", nome: "Brasil" },
                          nome: "Brasil",
                        },
                        serie: { "2024": "212583750", "2025": "213421037" },
                      },
                    ],
                  },
                ],
              },
            ]);
          },
        ),
      );

      const result = await ibge.agregados({
        tabela: 9324,
        periodos: "202312",
        variaveis: [9324],
        localidades: "N1",
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("9324");
      expect(result[0]?.variavel).toBe("População residente estimada");
      const serie = result[0]?.resultados[0]?.series[0]?.serie;
      expect(serie?.["2024"]).toBe(212583750);
      expect(serie?.["2025"]).toBe(213421037);
    });

    it("agregados() without variaveis uses 'all' in path", async () => {
      server.use(
        http.get(
          "https://servicodados.ibge.gov.br/api/v3/agregados/9324/periodos/-6/variaveis/all",
          ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get("localidades")).toBe("N3[35]");
            return HttpResponse.json([
              {
                id: "9324",
                variavel: "População residente estimada",
                unidade: "Pessoas",
                resultados: [
                  {
                    classificacoes: [],
                    series: [
                      {
                        localidade: {
                          id: "35",
                          nivel: { id: "N3", nome: "Unidade da Federação" },
                          nome: "São Paulo",
                        },
                        serie: { "2024": "46649132" },
                      },
                    ],
                  },
                ],
              },
            ]);
          },
        ),
      );

      const result = await ibge.agregados({
        tabela: 9324,
        periodos: "-6",
        localidades: "N3[35]",
      });

      expect(result).toHaveLength(1);
      const serie = result[0]?.resultados[0]?.series[0]?.serie;
      expect(serie?.["2024"]).toBe(46649132);
    });

    it("agregados() converts '...' and '-' values to null", async () => {
      server.use(
        http.get(
          "https://servicodados.ibge.gov.br/api/v3/agregados/1000/periodos/all/variaveis/all",
          () => {
            return HttpResponse.json([
              {
                id: "1000",
                variavel: "Test",
                unidade: "Un",
                resultados: [
                  {
                    classificacoes: [],
                    series: [
                      {
                        localidade: {
                          id: "1",
                          nivel: { id: "N1", nome: "Brasil" },
                          nome: "Brasil",
                        },
                        serie: {
                          "2020": "...",
                          "2021": "-",
                          "2022": "100",
                          "2023": null,
                        },
                      },
                    ],
                  },
                ],
              },
            ]);
          },
        ),
      );

      const result = await ibge.agregados({
        tabela: 1000,
        periodos: "all",
        localidades: "N1",
      });

      const serie = result[0]?.resultados[0]?.series[0]?.serie;
      expect(serie?.["2020"]).toBeNull();
      expect(serie?.["2021"]).toBeNull();
      expect(serie?.["2022"]).toBe(100);
      expect(serie?.["2023"]).toBeNull();
    });

    it("agregadosMetadados() returns metadata", async () => {
      server.use(
        http.get("https://servicodados.ibge.gov.br/api/v3/agregados/9324/metadados", () => {
          return HttpResponse.json({
            id: 9324,
            nome: "Estimativas de população",
            URL: "https://sidra.ibge.gov.br/tabela/9324",
            pesquisa: "Estimativas de População",
            assunto: "População",
            periodicidade: {
              frequencia: "anual",
              inicio: 2001,
              fim: 2025,
            },
            nivelTerritorial: {
              Administrativo: ["N1", "N2", "N3"],
              Especial: [],
              IBGE: [],
            },
            variaveis: [
              {
                id: 9324,
                nome: "População residente estimada",
                unidade: "Pessoas",
              },
            ],
            classificacoes: [],
          });
        }),
      );

      const result = await ibge.agregadosMetadados(9324);
      expect(result.id).toBe(9324);
      expect(result.nome).toBe("Estimativas de população");
      expect(result.periodicidade.frequencia).toBe("anual");
      expect(result.variaveis).toHaveLength(1);
    });

    it("rejects tabela <= 0", async () => {
      await expect(
        ibge.agregados({
          tabela: 0,
          periodos: "202312",
          localidades: "N1",
        }),
      ).rejects.toThrow(BVValidationError);

      await expect(
        ibge.agregados({
          tabela: -5,
          periodos: "202312",
          localidades: "N1",
        }),
      ).rejects.toThrow(BVValidationError);

      await expect(ibge.agregadosMetadados(0)).rejects.toThrow(BVValidationError);
    });
  });

  describe("Nomes", () => {
    it("nomes({ nome: 'João' }) returns frequency data", async () => {
      server.use(
        http.get("https://servicodados.ibge.gov.br/api/v2/censos/nomes/Jo%C3%A3o", () => {
          return HttpResponse.json([
            {
              nome: "JOAO",
              sexo: null,
              localidade: "BR",
              res: [{ periodo: "[2000,2010[", frequencia: 794118 }],
            },
          ]);
        }),
      );

      const result = await ibge.nomes({ nome: "João" });
      expect(result).toHaveLength(1);
      expect(result[0]?.nome).toBe("JOAO");
      expect(result[0]?.res[0]?.frequencia).toBe(794118);
    });

    it("nomes({ nome: 'Maria', localidade: 35 }) passes query params", async () => {
      server.use(
        http.get("https://servicodados.ibge.gov.br/api/v2/censos/nomes/Maria", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("localidade")).toBe("35");
          return HttpResponse.json([
            {
              nome: "MARIA",
              sexo: null,
              localidade: "35",
              res: [{ periodo: "[2000,2010[", frequencia: 336681 }],
            },
          ]);
        }),
      );

      const result = await ibge.nomes({ nome: "Maria", localidade: 35 });
      expect(result).toHaveLength(1);
      expect(result[0]?.localidade).toBe("35");
    });

    it("nomes() passes sexo query param", async () => {
      server.use(
        http.get("https://servicodados.ibge.gov.br/api/v2/censos/nomes/Ana", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("sexo")).toBe("F");
          return HttpResponse.json([
            {
              nome: "ANA",
              sexo: "F",
              localidade: "BR",
              res: [{ periodo: "[2000,2010[", frequencia: 553892 }],
            },
          ]);
        }),
      );

      const result = await ibge.nomes({ nome: "Ana", sexo: "F" });
      expect(result).toHaveLength(1);
      expect(result[0]?.sexo).toBe("F");
    });

    it("nomesRanking() returns ranking", async () => {
      server.use(
        http.get("https://servicodados.ibge.gov.br/api/v2/censos/nomes/ranking", () => {
          return HttpResponse.json([
            {
              localidade: "BR",
              sexo: null,
              res: [
                { nome: "MARIA", frequencia: 11734129, ranking: 1 },
                { nome: "JOSE", frequencia: 5754529, ranking: 2 },
              ],
            },
          ]);
        }),
      );

      const result = await ibge.nomesRanking();
      expect(result).toHaveLength(1);
      expect(result[0]?.res).toHaveLength(2);
      expect(result[0]?.res[0]?.nome).toBe("MARIA");
      expect(result[0]?.res[0]?.ranking).toBe(1);
    });

    it("nomesRanking({ localidade: 35 }) filters by location", async () => {
      server.use(
        http.get("https://servicodados.ibge.gov.br/api/v2/censos/nomes/ranking", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("localidade")).toBe("35");
          return HttpResponse.json([
            {
              localidade: "35",
              sexo: null,
              res: [{ nome: "MARIA", frequencia: 2143232, ranking: 1 }],
            },
          ]);
        }),
      );

      const result = await ibge.nomesRanking({ localidade: 35 });
      expect(result).toHaveLength(1);
      expect(result[0]?.localidade).toBe("35");
    });

    it("nomesRanking({ sexo: 'M' }) filters by sex", async () => {
      server.use(
        http.get("https://servicodados.ibge.gov.br/api/v2/censos/nomes/ranking", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("sexo")).toBe("M");
          return HttpResponse.json([
            {
              localidade: "BR",
              sexo: "M",
              res: [{ nome: "JOSE", frequencia: 5754529, ranking: 1 }],
            },
          ]);
        }),
      );

      const result = await ibge.nomesRanking({ sexo: "M" });
      expect(result).toHaveLength(1);
      expect(result[0]?.sexo).toBe("M");
    });
  });
});
