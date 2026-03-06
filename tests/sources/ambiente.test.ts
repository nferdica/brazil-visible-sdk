import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { AmbienteSource } from "../../src/sources/ambiente";
import { server } from "../helpers/setup";

const client = new BVClient({ maxRetries: 0 });
const ambiente = new AmbienteSource({ client });

const TERRABRASILIS_BASE = "https://terrabrasilis.dpi.inpe.br/api";
const FOCOS_BASE = "https://api.focos.inpe.br";
const IBAMA_BASE = "https://dados.ibama.gov.br/dados";
const CAR_BASE = "https://car.gov.br/publico/api/imoveis";
const UC_BASE = "https://api.dados.gov.br/v1/conjuntos-dados/unidades-de-conservacao/recursos";
const ANA_BASE = "https://dadosabertos.ana.gov.br/api/3/action/package_search";

describe("AmbienteSource", () => {
  it("has correct name and baseUrl", () => {
    expect(ambiente.name).toBe("Meio Ambiente");
    expect(ambiente.baseUrl).toBe("https://terrabrasilis.dpi.inpe.br/api");
  });

  describe("prodes", () => {
    it("returns deforestation data", async () => {
      server.use(
        http.get(`${TERRABRASILIS_BASE}/v1/prodes`, () => {
          return HttpResponse.json([
            {
              ano: 2023,
              estado: "PA",
              municipio: "Altamira",
              areaDesmatadaKm2: 125.4,
              bioma: "Amazonia",
            },
            {
              ano: 2023,
              estado: "MT",
              municipio: "Colniza",
              areaDesmatadaKm2: 98.7,
              bioma: "Amazonia",
            },
          ]);
        }),
      );

      const result = await ambiente.prodes();
      expect(result).toHaveLength(2);
      expect(result[0]?.estado).toBe("PA");
      expect(result[0]?.areaDesmatadaKm2).toBe(125.4);
      expect(result[1]?.municipio).toBe("Colniza");
    });

    it("passes query params", async () => {
      server.use(
        http.get(`${TERRABRASILIS_BASE}/v1/prodes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("ano")).toBe("2022");
          expect(url.searchParams.get("estado")).toBe("AM");
          return HttpResponse.json([
            {
              ano: 2022,
              estado: "AM",
              municipio: "Manaus",
              areaDesmatadaKm2: 45.2,
              bioma: "Amazonia",
            },
          ]);
        }),
      );

      const result = await ambiente.prodes({ ano: 2022, estado: "AM" });
      expect(result).toHaveLength(1);
      expect(result[0]?.ano).toBe(2022);
      expect(result[0]?.estado).toBe("AM");
    });
  });

  describe("deter", () => {
    it("returns deforestation alerts", async () => {
      server.use(
        http.get(`${TERRABRASILIS_BASE}/v1/deter`, () => {
          return HttpResponse.json([
            {
              data: "2024-01-15",
              estado: "RO",
              municipio: "Porto Velho",
              areaKm2: 3.2,
              bioma: "Amazonia",
              satelite: "DETER-B",
            },
          ]);
        }),
      );

      const result = await ambiente.deter();
      expect(result).toHaveLength(1);
      expect(result[0]?.estado).toBe("RO");
      expect(result[0]?.areaKm2).toBe(3.2);
      expect(result[0]?.satelite).toBe("DETER-B");
    });

    it("passes date and state params", async () => {
      server.use(
        http.get(`${TERRABRASILIS_BASE}/v1/deter`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("dataInicial")).toBe("2024-01-01");
          expect(url.searchParams.get("dataFinal")).toBe("2024-01-31");
          expect(url.searchParams.get("estado")).toBe("PA");
          return HttpResponse.json([]);
        }),
      );

      const result = await ambiente.deter({
        dataInicial: "2024-01-01",
        dataFinal: "2024-01-31",
        estado: "PA",
      });
      expect(result).toEqual([]);
    });
  });

  describe("focosCalor", () => {
    it("returns fire hotspot data", async () => {
      server.use(
        http.get(FOCOS_BASE, () => {
          return HttpResponse.json([
            {
              datahora: "2024-08-15T14:30:00",
              latitude: -3.1234,
              longitude: -60.5678,
              estado: "AM",
              municipio: "Manaus",
              bioma: "Amazonia",
              satelite: "AQUA_M-T",
              frp: 42.5,
            },
          ]);
        }),
      );

      const result = await ambiente.focosCalor();
      expect(result).toHaveLength(1);
      expect(result[0]?.latitude).toBe(-3.1234);
      expect(result[0]?.longitude).toBe(-60.5678);
      expect(result[0]?.frp).toBe(42.5);
      expect(result[0]?.bioma).toBe("Amazonia");
    });

    it("passes query params", async () => {
      server.use(
        http.get(FOCOS_BASE, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("pais")).toBe("Brazil");
          expect(url.searchParams.get("estado")).toBe("MT");
          expect(url.searchParams.get("diasPretendidos")).toBe("7");
          return HttpResponse.json([]);
        }),
      );

      const result = await ambiente.focosCalor({
        pais: "Brazil",
        estado: "MT",
        diasPretendidos: 7,
      });
      expect(result).toEqual([]);
    });
  });

  describe("ibamaMultas", () => {
    it("returns environmental fines", async () => {
      server.use(
        http.get(`${IBAMA_BASE}/multas`, () => {
          return HttpResponse.json([
            {
              id: 1001,
              dataAuto: "2024-03-10",
              cpfCnpj: "12345678000199",
              nomeInfrator: "Madeireira XYZ LTDA",
              uf: "PA",
              municipio: "Maraba",
              descricaoInfracao: "Desmatamento ilegal em area protegida",
              valorMulta: 500000.0,
              statusDebito: "Pendente",
            },
          ]);
        }),
      );

      const result = await ambiente.ibamaMultas();
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(1001);
      expect(result[0]?.nomeInfrator).toBe("Madeireira XYZ LTDA");
      expect(result[0]?.valorMulta).toBe(500000.0);
      expect(result[0]?.statusDebito).toBe("Pendente");
    });

    it("passes query params", async () => {
      server.use(
        http.get(`${IBAMA_BASE}/multas`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("uf")).toBe("MT");
          expect(url.searchParams.get("municipio")).toBe("Cuiaba");
          return HttpResponse.json([]);
        }),
      );

      const result = await ambiente.ibamaMultas({ uf: "MT", municipio: "Cuiaba" });
      expect(result).toEqual([]);
    });
  });

  describe("car", () => {
    it("returns rural property data", async () => {
      server.use(
        http.get(CAR_BASE, () => {
          return HttpResponse.json([
            {
              codigoImovel: "PA-1500602-001",
              municipio: "Altamira",
              uf: "PA",
              areaImovel: "250.5",
              situacao: "Ativo",
              tipoImovel: "IRU",
            },
            {
              codigoImovel: "MT-5100201-003",
              municipio: "Cuiaba",
              uf: "MT",
              areaImovel: "1200.0",
              situacao: "Pendente",
              tipoImovel: "IRU",
            },
          ]);
        }),
      );

      const result = await ambiente.car();
      expect(result).toHaveLength(2);
      expect(result[0]?.codigoImovel).toBe("PA-1500602-001");
      expect(result[0]?.uf).toBe("PA");
      expect(result[0]?.areaImovel).toBe("250.5");
      expect(result[1]?.municipio).toBe("Cuiaba");
    });

    it("passes query params", async () => {
      server.use(
        http.get(CAR_BASE, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("uf")).toBe("MT");
          expect(url.searchParams.get("municipio")).toBe("5100201");
          expect(url.searchParams.get("pagina")).toBe("1");
          expect(url.searchParams.get("tamanhoPagina")).toBe("50");
          return HttpResponse.json([]);
        }),
      );

      const result = await ambiente.car({
        uf: "MT",
        municipio: "5100201",
        pagina: 1,
        tamanhoPagina: 50,
      });
      expect(result).toEqual([]);
    });
  });

  describe("unidadesConservacao", () => {
    it("returns conservation unit data", async () => {
      server.use(
        http.get(UC_BASE, () => {
          return HttpResponse.json([
            {
              nome: "Parque Nacional da Amazonia",
              categoria: "Parque Nacional",
              uf: "PA",
              esfera: "Federal",
              areaHa: "1089439",
              anoCreiacao: "1974",
              biomaIbge: "Amazonia",
            },
          ]);
        }),
      );

      const result = await ambiente.unidadesConservacao();
      expect(result).toHaveLength(1);
      expect(result[0]?.nome).toBe("Parque Nacional da Amazonia");
      expect(result[0]?.categoria).toBe("Parque Nacional");
      expect(result[0]?.esfera).toBe("Federal");
      expect(result[0]?.areaHa).toBe("1089439");
    });

    it("passes query params", async () => {
      server.use(
        http.get(UC_BASE, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("categoria")).toBe("Parque Nacional");
          expect(url.searchParams.get("uf")).toBe("AM");
          expect(url.searchParams.get("esfera")).toBe("Federal");
          return HttpResponse.json([]);
        }),
      );

      const result = await ambiente.unidadesConservacao({
        categoria: "Parque Nacional",
        uf: "AM",
        esfera: "Federal",
      });
      expect(result).toEqual([]);
    });
  });

  describe("recursosHidricos", () => {
    it("returns water resources data, unwrapping CKAN response", async () => {
      server.use(
        http.get(ANA_BASE, () => {
          return HttpResponse.json({
            result: {
              results: [
                {
                  nome: "Rio Amazonas",
                  codigo: "001",
                  rio: "Amazonas",
                  bacia: "Amazonica",
                  subBacia: "Alto Amazonas",
                  uf: "AM",
                  municipio: "Manaus",
                },
                {
                  nome: "Rio Sao Francisco",
                  codigo: "002",
                  rio: "Sao Francisco",
                  bacia: "Sao Francisco",
                  subBacia: "Alto Sao Francisco",
                  uf: "MG",
                  municipio: "Tres Marias",
                },
              ],
            },
          });
        }),
      );

      const result = await ambiente.recursosHidricos();
      expect(result).toHaveLength(2);
      expect(result[0]?.nome).toBe("Rio Amazonas");
      expect(result[0]?.bacia).toBe("Amazonica");
      expect(result[1]?.rio).toBe("Sao Francisco");
      expect(result[1]?.uf).toBe("MG");
    });

    it("passes query params", async () => {
      server.use(
        http.get(ANA_BASE, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("rio amazonas");
          expect(url.searchParams.get("rows")).toBe("10");
          return HttpResponse.json({
            result: {
              results: [],
            },
          });
        }),
      );

      const result = await ambiente.recursosHidricos({
        q: "rio amazonas",
        rows: 10,
      });
      expect(result).toEqual([]);
    });
  });
});
