/**
 * Brazil Visible SDK — Acesso unificado a 93+ fontes de dados publicos brasileiros.
 */

export const VERSION = "0.1.0";

export { configure, getConfig } from "./config";
export type { BVConfig } from "./config";
export { BVClient } from "./client";
export type { BVClientOptions } from "./client";
export { BVError, BVHttpError, BVTimeoutError, BVValidationError } from "./errors";
export { BcbSource } from "./sources/bcb";
export type { SgsParams, SgsSerie, ExpectativasParams, ExpectativaMercado } from "./sources/bcb";
export { IbgeSource } from "./sources/ibge";
export type {
  Regiao,
  Estado,
  Mesorregiao,
  Microrregiao,
  Municipio,
  Distrito,
  AgregadosParams,
  AgregadoVariavel,
  AgregadoResultado,
  AgregadoClassificacao,
  AgregadoSerie,
  AgregadoMetadados,
  NomesParams,
  NomeFrequencia,
  NomesRankingParams,
  NomeRanking,
} from "./sources/ibge";

import { BcbSource } from "./sources/bcb";
import { IbgeSource } from "./sources/ibge";

/** Pre-instantiated BCB source for convenience. */
export const bcb = new BcbSource();

/** Pre-instantiated IBGE source for convenience. */
export const ibge = new IbgeSource();
