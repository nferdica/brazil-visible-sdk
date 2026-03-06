import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { SegurancaSource } from "../../src/sources/seguranca";
import { server } from "../helpers/setup";

const BASE_URL = "https://dados.gov.br/dados/api/publico/conjuntos-dados";
const client = new BVClient({ maxRetries: 0 });

describe("SegurancaSource", () => {
  const seguranca = new SegurancaSource({ client });

  it("has correct name and baseUrl", () => {
    expect(seguranca.name).toBe("SINESP");
    expect(seguranca.baseUrl).toBe(BASE_URL);
  });

  describe("ocorrencias", () => {
    it("returns criminal occurrence data", async () => {
      server.use(
        http.get(`${BASE_URL}/seguranca-publica/ocorrencias`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("uf")).toBe("SP");
          return HttpResponse.json([
            {
              ano: 2024,
              mes: 1,
              uf: "SP",
              municipio: "Sao Paulo",
              tipoCrime: "Homicidio Doloso",
              quantidade: 150,
            },
          ]);
        }),
      );

      const result = await seguranca.ocorrencias({ uf: "SP" });
      expect(result).toHaveLength(1);
      expect(result[0]?.tipoCrime).toBe("Homicidio Doloso");
      expect(result[0]?.quantidade).toBe(150);
    });
  });

  describe("indicadores", () => {
    it("returns security indicators", async () => {
      server.use(
        http.get(`${BASE_URL}/seguranca-publica/indicadores`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("ano")).toBe("2023");
          return HttpResponse.json([
            {
              ano: 2023,
              uf: "RJ",
              indicador: "Homicidio Doloso",
              valor: 3500,
              taxaPor100Mil: 20.5,
            },
          ]);
        }),
      );

      const result = await seguranca.indicadores({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.uf).toBe("RJ");
      expect(result[0]?.taxaPor100Mil).toBe(20.5);
    });
  });
});
