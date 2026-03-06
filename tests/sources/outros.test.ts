import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { OutrosSource } from "../../src/sources/outros";
import { server } from "../helpers/setup";

const client = new BVClient({ maxRetries: 0 });

describe("OutrosSource", () => {
  const outros = new OutrosSource({ client });

  it("has correct name and baseUrl", () => {
    expect(outros.name).toBe("Outras Agências");
  });

  describe("ansOperadoras", () => {
    it("returns health insurance operators", async () => {
      server.use(
        http.get("https://dadosabertos.ans.gov.br/api/3/action/datastore_search", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("uf")).toBe("SP");
          return HttpResponse.json([
            {
              registroAns: "000001",
              cnpj: "12345678000100",
              razaoSocial: "Operadora Saude SA",
              nomeFantasia: "Saude Plus",
              modalidade: "Medicina de Grupo",
              uf: "SP",
              municipio: "Sao Paulo",
              beneficiarios: 150000,
              situacao: "Ativa",
            },
          ]);
        }),
      );

      const result = await outros.ansOperadoras({ uf: "SP" });
      expect(result).toHaveLength(1);
      expect(result[0]?.razaoSocial).toBe("Operadora Saude SA");
      expect(result[0]?.beneficiarios).toBe(150000);
    });
  });

  describe("antaqPortos", () => {
    it("returns port data", async () => {
      server.use(
        http.get("https://web.antaq.gov.br/api/portos", () => {
          return HttpResponse.json([
            {
              codigo: "BRSSZ",
              nome: "Porto de Santos",
              uf: "SP",
              municipio: "Santos",
              tipoInstalacao: "Porto Organizado",
              situacao: "Ativo",
              latitude: -23.9544,
              longitude: -46.3128,
            },
          ]);
        }),
      );

      const result = await outros.antaqPortos();
      expect(result).toHaveLength(1);
      expect(result[0]?.nome).toBe("Porto de Santos");
    });
  });

  describe("ancineProjetos", () => {
    it("returns cinema projects", async () => {
      server.use(
        http.get("https://api.ancine.gov.br/projetos", () => {
          return HttpResponse.json([
            {
              salic: "24-0001",
              titulo: "Filme Brasileiro",
              proponente: "Produtora XYZ",
              cnpjProponente: "11111111000100",
              segmento: "Longa-metragem",
              situacao: "Aprovado",
              valorAprovado: 2000000,
              valorCaptado: 1500000,
            },
          ]);
        }),
      );

      const result = await outros.ancineProjetos();
      expect(result).toHaveLength(1);
      expect(result[0]?.titulo).toBe("Filme Brasileiro");
      expect(result[0]?.valorAprovado).toBe(2000000);
    });
  });
});
