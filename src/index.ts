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
export { TesouroSource } from "./sources/tesouro";
export type {
  EntesParams,
  Ente,
  RreoParams,
  RreoItem,
  RgfParams,
  RgfItem,
} from "./sources/tesouro";
export { IpeaSource } from "./sources/ipea";
export type {
  IpeaSeriesParams,
  IpeaValor,
  IpeaMetadadosParams,
  IpeaMetadado,
} from "./sources/ipea";
export { CguSource } from "./sources/cgu";
export type {
  CguPaginationParams,
  CeisParams,
  CeisItem,
  CnepParams,
  CnepItem,
  CepimParams,
  CepimItem,
  ContratosParams,
  ContratoItem,
  ServidoresParams,
  ServidorItem,
} from "./sources/cgu";

import { BcbSource } from "./sources/bcb";
import { CguSource } from "./sources/cgu";
import { IbgeSource } from "./sources/ibge";
import { IpeaSource } from "./sources/ipea";
import { TesouroSource } from "./sources/tesouro";

/** Pre-instantiated BCB source for convenience. */
export const bcb = new BcbSource();

/** Pre-instantiated IBGE source for convenience. */
export const ibge = new IbgeSource();

/** Pre-instantiated Tesouro Nacional source for convenience. */
export const tesouro = new TesouroSource();

/** Pre-instantiated IPEA source for convenience. */
export const ipea = new IpeaSource();

/** Pre-instantiated CGU source for convenience. Requires API key configuration. */
export const cgu = new CguSource();
