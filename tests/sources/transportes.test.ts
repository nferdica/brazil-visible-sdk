import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { TransportesSource } from "../../src/sources/transportes";
import { server } from "../helpers/setup";

const client = new BVClient({ maxRetries: 0 });
const transportes = new TransportesSource({ client });

const BASE = "https://dados.gov.br/dados/api/publico/conjuntos-dados";

describe("TransportesSource", () => {
  it("has correct name and baseUrl", () => {
    expect(transportes.name).toBe("Transportes");
    expect(transportes.baseUrl).toBe(BASE);
  });

  describe("anacVoos", () => {
    it("returns aviation data without params", async () => {
      server.use(
        http.get(`${BASE}/anac-voos`, () => {
          return HttpResponse.json([
            {
              ano: 2024,
              mes: 1,
              empresa: "LATAM",
              origem: "GRU",
              destino: "GIG",
              passageiros: 15200,
              carga: 3400,
            },
            {
              ano: 2024,
              mes: 1,
              empresa: "GOL",
              origem: "CGH",
              destino: "SDU",
              passageiros: 12800,
              carga: 2100,
            },
          ]);
        }),
      );

      const result = await transportes.anacVoos();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ano: 2024,
        mes: 1,
        empresa: "LATAM",
        origem: "GRU",
        destino: "GIG",
        passageiros: 15200,
        carga: 3400,
      });
      expect(result[1]?.empresa).toBe("GOL");
    });

    it("passes query params when provided", async () => {
      server.use(
        http.get(`${BASE}/anac-voos`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("ano")).toBe("2024");
          expect(url.searchParams.get("mes")).toBe("6");
          expect(url.searchParams.get("empresa")).toBe("LATAM");
          return HttpResponse.json([
            {
              ano: 2024,
              mes: 6,
              empresa: "LATAM",
              origem: "GRU",
              destino: "MIA",
              passageiros: 28500,
              carga: 8700,
            },
          ]);
        }),
      );

      const result = await transportes.anacVoos({ ano: 2024, mes: 6, empresa: "LATAM" });
      expect(result).toHaveLength(1);
      expect(result[0]?.passageiros).toBe(28500);
    });
  });

  describe("prfAcidentes", () => {
    it("returns accident data without params", async () => {
      server.use(
        http.get(`${BASE}/prf-acidentes`, () => {
          return HttpResponse.json([
            {
              id: 1001,
              dataInversa: "2024-03-15",
              dia_semana: "sexta-feira",
              horario: "14:30:00",
              uf: "SP",
              br: "116",
              km: "402",
              municipio: "Guarulhos",
              causa_acidente: "Falta de atenção",
              tipo_acidente: "Colisão traseira",
              classificacao_acidente: "Com Vítimas Feridas",
              fase_dia: "Pleno dia",
              sentido_via: "Crescente",
              condicao_metereologica: "Céu Claro",
              tipo_pista: "Dupla",
              tracado_via: "Reta",
              pessoas: 4,
              mortos: 0,
              feridos_leves: 2,
              feridos_graves: 0,
              veiculos: 2,
            },
          ]);
        }),
      );

      const result = await transportes.prfAcidentes();
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(1001);
      expect(result[0]?.uf).toBe("SP");
      expect(result[0]?.mortos).toBe(0);
      expect(result[0]?.feridos_leves).toBe(2);
      expect(result[0]?.municipio).toBe("Guarulhos");
    });

    it("passes query params when provided", async () => {
      server.use(
        http.get(`${BASE}/prf-acidentes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("ano")).toBe("2024");
          expect(url.searchParams.get("uf")).toBe("MG");
          return HttpResponse.json([
            {
              id: 2002,
              dataInversa: "2024-07-20",
              dia_semana: "sábado",
              horario: "08:15:00",
              uf: "MG",
              br: "040",
              km: "510",
              municipio: "Belo Horizonte",
              causa_acidente: "Velocidade incompatível",
              tipo_acidente: "Saída de leito carroçável",
              classificacao_acidente: "Com Vítimas Fatais",
              fase_dia: "Pleno dia",
              sentido_via: "Decrescente",
              condicao_metereologica: "Chuva",
              tipo_pista: "Simples",
              tracado_via: "Curva",
              pessoas: 2,
              mortos: 1,
              feridos_leves: 0,
              feridos_graves: 1,
              veiculos: 1,
            },
          ]);
        }),
      );

      const result = await transportes.prfAcidentes({ ano: 2024, uf: "MG" });
      expect(result).toHaveLength(1);
      expect(result[0]?.uf).toBe("MG");
      expect(result[0]?.mortos).toBe(1);
    });
  });

  describe("denatranFrota", () => {
    it("returns vehicle fleet data without params", async () => {
      server.use(
        http.get(`${BASE}/denatran-frota`, () => {
          return HttpResponse.json([
            {
              ano: 2024,
              mes: 3,
              uf: "SP",
              municipio: "São Paulo",
              tipoVeiculo: "Automóvel",
              quantidade: 8542310,
            },
            {
              ano: 2024,
              mes: 3,
              uf: "RJ",
              municipio: "Rio de Janeiro",
              tipoVeiculo: "Motocicleta",
              quantidade: 1234567,
            },
          ]);
        }),
      );

      const result = await transportes.denatranFrota();
      expect(result).toHaveLength(2);
      expect(result[0]?.uf).toBe("SP");
      expect(result[0]?.quantidade).toBe(8542310);
      expect(result[1]?.tipoVeiculo).toBe("Motocicleta");
    });

    it("passes query params when provided", async () => {
      server.use(
        http.get(`${BASE}/denatran-frota`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("ano")).toBe("2024");
          expect(url.searchParams.get("mes")).toBe("6");
          expect(url.searchParams.get("uf")).toBe("RS");
          return HttpResponse.json([
            {
              ano: 2024,
              mes: 6,
              uf: "RS",
              municipio: "Porto Alegre",
              tipoVeiculo: "Caminhão",
              quantidade: 98765,
            },
          ]);
        }),
      );

      const result = await transportes.denatranFrota({ ano: 2024, mes: 6, uf: "RS" });
      expect(result).toHaveLength(1);
      expect(result[0]?.municipio).toBe("Porto Alegre");
      expect(result[0]?.quantidade).toBe(98765);
    });
  });
});
