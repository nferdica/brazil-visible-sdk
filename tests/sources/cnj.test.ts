import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { BVClient } from "../../src/client";
import { BVError } from "../../src/errors";
import { CnjSource } from "../../src/sources/cnj";
import { server } from "../helpers/setup";

const client = new BVClient({ maxRetries: 0 });

describe("CnjSource", () => {
  const cnj = new CnjSource({ client });

  it("has correct name and baseUrl", () => {
    expect(cnj.name).toBe("CNJ");
    expect(cnj.authRequired).toBe(true);
  });

  describe("datajud", () => {
    it("throws informative error about required registration", async () => {
      await expect(cnj.datajud()).rejects.toThrow(BVError);
      await expect(cnj.datajud()).rejects.toThrow(/cadastro especial/);
    });
  });

  describe("justicaNumeros", () => {
    it("fetches justice indicators", async () => {
      server.use(
        http.get("https://paineis.cnj.jus.br/QvAJAXZfc/opendoc.htm", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("ano")).toBe("2023");
          return HttpResponse.json([
            {
              ano: 2023,
              ramo: "Justica Federal",
              tribunal: "TRF1",
              indicador: "Casos Novos",
              valor: 1200000,
            },
          ]);
        }),
      );

      const result = await cnj.justicaNumeros({ ano: 2023 });
      expect(result).toHaveLength(1);
      expect(result[0]?.tribunal).toBe("TRF1");
    });
  });
});
