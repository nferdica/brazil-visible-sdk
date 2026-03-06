import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { GovernamentaisSource } from "../../src/sources/governamentais";
import { server } from "../helpers/setup";

const BASE_URL = "https://dados.gov.br/dados/api/publico";
const client = new BVClient({ maxRetries: 0 });

describe("GovernamentaisSource", () => {
  const gov = new GovernamentaisSource({ client });

  it("has correct name and baseUrl", () => {
    expect(gov.name).toBe("APIs Governamentais");
    expect(gov.baseUrl).toBe(BASE_URL);
  });

  describe("cadin", () => {
    it("searches CADIN debtors", async () => {
      server.use(
        http.get(`${BASE_URL}/cadin`, () => {
          return HttpResponse.json([
            {
              cpfCnpj: "12345678000100",
              nomeDevedor: "Empresa Devedora",
              orgaoCredor: "Receita Federal",
              valorInscrito: 500000,
              dataInscricao: "2023-06-01",
              situacao: "Ativo",
            },
          ]);
        }),
      );

      const result = await gov.cadin();
      expect(result).toHaveLength(1);
      expect(result[0]?.nomeDevedor).toBe("Empresa Devedora");
      expect(result[0]?.valorInscrito).toBe(500000);
    });
  });

  describe("siorg", () => {
    it("lists government agencies", async () => {
      server.use(
        http.get("https://estruturaorganizacional.dados.gov.br/api/unidades", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("esfera")).toBe("federal");
          return HttpResponse.json([
            {
              codigo: "25000",
              nome: "Ministerio da Saude",
              sigla: "MS",
              esfera: "federal",
              poder: "Executivo",
              naturezaJuridica: "Administracao Direta",
              orgaoSuperior: "Presidencia da Republica",
              situacao: "Ativo",
            },
          ]);
        }),
      );

      const result = await gov.siorg({ esfera: "federal" });
      expect(result).toHaveLength(1);
      expect(result[0]?.nome).toBe("Ministerio da Saude");
      expect(result[0]?.sigla).toBe("MS");
    });
  });

  describe("siape", () => {
    it("returns federal employees data", async () => {
      server.use(
        http.get("https://api.portaldatransparencia.gov.br/api-de-dados/servidores", () => {
          return HttpResponse.json([
            {
              nome: "Servidor Federal",
              orgao: "Ministerio da Fazenda",
              cargo: "Analista",
              funcao: "Coordenador",
              situacao: "Ativo",
              remuneracaoBasica: 12000,
              totalRendimentos: 18000,
            },
          ]);
        }),
      );

      const result = await gov.siape();
      expect(result).toHaveLength(1);
      expect(result[0]?.nome).toBe("Servidor Federal");
      expect(result[0]?.totalRendimentos).toBe(18000);
    });
  });
});
