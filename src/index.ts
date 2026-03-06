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

import { BcbSource } from "./sources/bcb";

/** Pre-instantiated BCB source for convenience. */
export const bcb = new BcbSource();
