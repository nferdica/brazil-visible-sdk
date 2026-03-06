import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { DiariosSource } from "../../src/sources/diarios";
import { server } from "../helpers/setup";

const client = new BVClient({ maxRetries: 0 });

describe("DiariosSource", () => {
  const diarios = new DiariosSource({ client });

  it("has correct name and baseUrl", () => {
    expect(diarios.name).toBe("Diários Oficiais");
  });

  describe("dou", () => {
    it("searches DOU articles", async () => {
      server.use(
        http.get("https://www.in.gov.br/leiturajornal", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("licitacao");
          return HttpResponse.json([
            {
              id: "dou-001",
              titulo: "Aviso de Licitacao",
              resumo: "Pregao eletronico n. 01/2024",
              conteudo: "Conteudo completo...",
              dataPublicacao: "2024-03-01",
              secao: "3",
              orgao: "Ministerio da Saude",
              tipoAto: "Aviso de Licitacao",
              url: "https://www.in.gov.br/dou/001",
            },
          ]);
        }),
      );

      const result = await diarios.dou({ q: "licitacao" });
      expect(result).toHaveLength(1);
      expect(result[0]?.titulo).toBe("Aviso de Licitacao");
      expect(result[0]?.secao).toBe("3");
    });
  });

  describe("doe", () => {
    it("searches state official gazettes", async () => {
      server.use(
        http.get(
          "https://dados.gov.br/dados/api/publico/conjuntos-dados/diarios-oficiais/SP",
          ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get("q")).toBe("nomeacao");
            return HttpResponse.json([
              {
                id: "doe-sp-001",
                titulo: "Nomeacao de Servidores",
                conteudo: "Nomeacao...",
                dataPublicacao: "2024-02-15",
                estado: "SP",
                orgao: "Governo do Estado de SP",
                url: "https://doe.sp.gov.br/001",
              },
            ]);
          },
        ),
      );

      const result = await diarios.doe({ q: "nomeacao", estado: "SP" });
      expect(result).toHaveLength(1);
      expect(result[0]?.estado).toBe("SP");
    });
  });
});
