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
export { FileCache, getDefaultCache, resetDefaultCache } from "./cache";
export type { CacheOptions, CacheEntry } from "./cache";
export { download, extractZip, extractGzip } from "./download";
export type { DownloadOptions, DownloadProgress } from "./download";
export { parseCsvFile, parseCsvString } from "./parsers";
export type { CsvParseOptions } from "./parsers";
export { TseSource } from "./sources/tse";
export type {
  TseDownloadParams,
  Candidatura,
  BemCandidato,
  Filiado,
  ResultadoVotacao,
} from "./sources/tse";
export { ReceitaSource } from "./sources/receita";
export type {
  ReceitaDownloadParams,
  Empresa,
  Estabelecimento,
  Socio,
  SimplesNacional,
} from "./sources/receita";
export { InepSource } from "./sources/inep";
export type {
  InepDownloadParams,
  EnemMicrodado,
  CensoEscolarEscola,
  CensoSuperiorIes,
} from "./sources/inep";
export { TrabalhoSource } from "./sources/trabalho";
export type {
  TrabalhoDownloadParams,
  CagedItem,
  RaisEstabelecimento,
} from "./sources/trabalho";
export { MercadoSource } from "./sources/mercado";
export type {
  CvmYearParams,
  DfpItem,
  ItrItem,
  CiaAberta,
  FundoInvestimento,
} from "./sources/mercado";

import { BcbSource } from "./sources/bcb";
import { CguSource } from "./sources/cgu";
import { IbgeSource } from "./sources/ibge";
import { InepSource } from "./sources/inep";
import { IpeaSource } from "./sources/ipea";
import { MercadoSource } from "./sources/mercado";
import { ReceitaSource } from "./sources/receita";
import { TesouroSource } from "./sources/tesouro";
import { TrabalhoSource } from "./sources/trabalho";
import { TseSource } from "./sources/tse";

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

/** Pre-instantiated TSE source for convenience. Downloads data on first call. */
export const tse = new TseSource();

/** Pre-instantiated Receita Federal source for convenience. Downloads data on first call. */
export const receita = new ReceitaSource();

/** Pre-instantiated INEP source for convenience. Downloads data on first call. */
export const inepData = new InepSource();

/** Pre-instantiated Trabalho source for convenience. Downloads data on first call. */
export const trabalho = new TrabalhoSource();

/** Pre-instantiated CVM/Mercado source for convenience. Downloads data on first call. */
export const mercado = new MercadoSource();
