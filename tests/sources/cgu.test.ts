import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { configure, resetConfig } from "../../src/config";
import { BVValidationError } from "../../src/errors";
import { CguSource } from "../../src/sources/cgu";
import { server } from "../helpers/setup";

const BASE_URL = "https://api.portaldatransparencia.gov.br/api-de-dados";
const client = new BVClient({ maxRetries: 0 });

describe("CguSource", () => {
  let cgu: CguSource;

  beforeEach(() => {
    configure({ apiKeys: { cgu: "test-key" } });
    cgu = new CguSource({ client });
  });

  afterEach(() => {
    resetConfig();
  });

  it("has correct name and baseUrl", () => {
    expect(cgu.name).toBe("CGU Portal da Transparência");
    expect(cgu.baseUrl).toBe(BASE_URL);
  });

  describe("ceis", () => {
    it("returns data with auth header", async () => {
      server.use(
        http.get(`${BASE_URL}/ceis`, ({ request }) => {
          expect(request.headers.get("chave-api-dados")).toBe("test-key");
          const url = new URL(request.url);
          expect(url.searchParams.get("pagina")).toBe("1");
          expect(url.searchParams.get("tamanhoPagina")).toBe("15");
          return HttpResponse.json([
            {
              id: 1,
              cnpjSancionado: "00000000000100",
              nomeSancionado: "Empresa Teste",
              razaoSocialEmpresa: "Empresa Teste LTDA",
              nomeFantasiaEmpresa: "Teste",
              dataInicioSancao: "2024-01-01",
              dataFimSancao: "2024-12-31",
              orgaoSancionador: "CGU",
              tipoSancao: "Inidoneidade",
            },
          ]);
        }),
      );

      const result = await cgu.ceis();
      expect(result).toHaveLength(1);
      expect(result[0]?.cnpjSancionado).toBe("00000000000100");
      expect(result[0]?.nomeSancionado).toBe("Empresa Teste");
    });

    it("passes query params", async () => {
      server.use(
        http.get(`${BASE_URL}/ceis`, ({ request }) => {
          expect(request.headers.get("chave-api-dados")).toBe("test-key");
          const url = new URL(request.url);
          expect(url.searchParams.get("cnpjSancionado")).toBe("12345678000199");
          expect(url.searchParams.get("pagina")).toBe("2");
          expect(url.searchParams.get("tamanhoPagina")).toBe("10");
          return HttpResponse.json([]);
        }),
      );

      const result = await cgu.ceis({
        cnpjSancionado: "12345678000199",
        pagina: 2,
        tamanhoPagina: 10,
      });
      expect(result).toEqual([]);
    });
  });

  describe("cnep", () => {
    it("returns data", async () => {
      server.use(
        http.get(`${BASE_URL}/cnep`, ({ request }) => {
          expect(request.headers.get("chave-api-dados")).toBe("test-key");
          return HttpResponse.json([
            {
              id: 10,
              cnpjSancionado: "11111111000100",
              nomeSancionado: "Empresa Punida",
              razaoSocialEmpresa: "Empresa Punida SA",
              nomeFantasiaEmpresa: "Punida",
              dataInicioSancao: "2023-06-01",
              dataFimSancao: "2025-06-01",
              orgaoSancionador: "TCU",
              tipoSancao: "Multa",
            },
          ]);
        }),
      );

      const result = await cgu.cnep();
      expect(result).toHaveLength(1);
      expect(result[0]?.nomeSancionado).toBe("Empresa Punida");
    });
  });

  describe("cepim", () => {
    it("returns data", async () => {
      server.use(
        http.get(`${BASE_URL}/cepim`, ({ request }) => {
          expect(request.headers.get("chave-api-dados")).toBe("test-key");
          return HttpResponse.json([
            {
              id: 20,
              cnpjSancionado: "22222222000100",
              nomeSancionado: "ONG Impedida",
              razaoSocialEmpresa: "ONG Impedida LTDA",
              orgaoSuperior: "Ministerio da Educacao",
              orgaoMaximo: "Governo Federal",
              motivoImpedimento: "Irregularidade na prestacao de contas",
            },
          ]);
        }),
      );

      const result = await cgu.cepim();
      expect(result).toHaveLength(1);
      expect(result[0]?.nomeSancionado).toBe("ONG Impedida");
      expect(result[0]?.orgaoSuperior).toBe("Ministerio da Educacao");
    });
  });

  describe("contratos", () => {
    it("passes params correctly", async () => {
      server.use(
        http.get(`${BASE_URL}/contratos`, ({ request }) => {
          expect(request.headers.get("chave-api-dados")).toBe("test-key");
          const url = new URL(request.url);
          expect(url.searchParams.get("codigoOrgao")).toBe("25000");
          expect(url.searchParams.get("pagina")).toBe("1");
          expect(url.searchParams.get("tamanhoPagina")).toBe("15");
          return HttpResponse.json([
            {
              id: 100,
              dataVigenciaInicio: "2024-01-01",
              dataVigenciaFim: "2024-12-31",
              codigoOrgao: "25000",
              nomeOrgao: "Ministerio da Saude",
              objeto: "Aquisicao de equipamentos",
              valorInicial: 1500000.0,
              cpfCnpj: "33333333000100",
              nomeContratado: "Fornecedor XYZ",
              modalidadeLicitacao: "Pregao Eletronico",
            },
          ]);
        }),
      );

      const result = await cgu.contratos({ codigoOrgao: "25000" });
      expect(result).toHaveLength(1);
      expect(result[0]?.nomeOrgao).toBe("Ministerio da Saude");
      expect(result[0]?.valorInicial).toBe(1500000.0);
    });
  });

  describe("servidores", () => {
    it("returns data", async () => {
      server.use(
        http.get(`${BASE_URL}/servidores`, ({ request }) => {
          expect(request.headers.get("chave-api-dados")).toBe("test-key");
          return HttpResponse.json([
            {
              id: 200,
              cpf: "***000000**",
              nome: "Servidor Teste",
              orgaoServidores: "Ministerio da Fazenda",
              orgaoExercicio: "Receita Federal",
              cargo: "Auditor Fiscal",
              funcao: "Chefe de Divisao",
              situacaoVinculo: "Ativo",
            },
          ]);
        }),
      );

      const result = await cgu.servidores();
      expect(result).toHaveLength(1);
      expect(result[0]?.nome).toBe("Servidor Teste");
      expect(result[0]?.cargo).toBe("Auditor Fiscal");
    });
  });

  describe("ceaf", () => {
    it("returns data with auth header", async () => {
      server.use(
        http.get(`${BASE_URL}/ceaf`, ({ request }) => {
          expect(request.headers.get("chave-api-dados")).toBe("test-key");
          return HttpResponse.json([
            {
              id: 300,
              cpfSancionado: "***111222**",
              nomeSancionado: "Servidor Sancionado",
              orgaoLotacao: "Ministerio da Saude",
              dataPublicacao: "2024-01-15",
              tipoSancao: "Demissao",
              fundamentacaoLegal: "Art. 132, I",
            },
          ]);
        }),
      );

      const result = await cgu.ceaf();
      expect(result).toHaveLength(1);
      expect(result[0]?.nomeSancionado).toBe("Servidor Sancionado");
      expect(result[0]?.tipoSancao).toBe("Demissao");
    });
  });

  describe("emendas", () => {
    it("returns data with params", async () => {
      server.use(
        http.get(`${BASE_URL}/emendas`, ({ request }) => {
          expect(request.headers.get("chave-api-dados")).toBe("test-key");
          const url = new URL(request.url);
          expect(url.searchParams.get("ano")).toBe("2024");
          return HttpResponse.json([
            {
              id: 400,
              codigoEmenda: "12345",
              nomeAutor: "Deputado Teste",
              tipoEmenda: "Individual",
              localidadeDoGasto: "Sao Paulo - SP",
              funcao: "Saude",
              subfuncao: "Atencao Basica",
              valorEmpenhado: 500000.0,
              valorPago: 250000.0,
            },
          ]);
        }),
      );

      const result = await cgu.emendas({ ano: 2024 });
      expect(result).toHaveLength(1);
      expect(result[0]?.nomeAutor).toBe("Deputado Teste");
      expect(result[0]?.valorEmpenhado).toBe(500000.0);
    });
  });

  describe("viagens", () => {
    it("returns data with params", async () => {
      server.use(
        http.get(`${BASE_URL}/viagens`, ({ request }) => {
          expect(request.headers.get("chave-api-dados")).toBe("test-key");
          const url = new URL(request.url);
          expect(url.searchParams.get("codigoOrgao")).toBe("25000");
          return HttpResponse.json([
            {
              id: 500,
              codigoOrgao: "25000",
              nomeOrgao: "Ministerio da Saude",
              cpfBeneficiario: "***333444**",
              nomeBeneficiario: "Viajante Teste",
              dataIda: "2024-03-01",
              dataRetorno: "2024-03-05",
              destino: "Brasilia/DF",
              motivo: "Reuniao tecnica",
              valorDiarias: 2500.0,
              valorPassagens: 1800.0,
              valorOutros: 200.0,
            },
          ]);
        }),
      );

      const result = await cgu.viagens({ codigoOrgao: "25000" });
      expect(result).toHaveLength(1);
      expect(result[0]?.nomeBeneficiario).toBe("Viajante Teste");
      expect(result[0]?.destino).toBe("Brasilia/DF");
      expect(result[0]?.valorDiarias).toBe(2500.0);
    });
  });

  describe("auth validation", () => {
    it("throws BVValidationError when no API key configured", async () => {
      resetConfig();
      const unauthCgu = new CguSource({ client });

      await expect(unauthCgu.ceis()).rejects.toThrow(BVValidationError);
      await expect(unauthCgu.ceis()).rejects.toThrow(/CGU API key is required/);
    });
  });
});
