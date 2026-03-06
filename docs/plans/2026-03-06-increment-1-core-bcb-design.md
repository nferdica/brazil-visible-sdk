# Increment 1 — Core Infrastructure + BCB Source

> Design approved on 2026-03-06

## Goal

Deliver a working SDK with the core HTTP client, error hierarchy, configuration system, and the BCB (Banco Central) source module as first concrete implementation. This validates the full architecture end-to-end before scaling to more sources.

## Scope

### Core modules
- `src/errors.ts` — BVError hierarchy
- `src/types.ts` — shared types (RequestOptions, BVResponse)
- `src/config.ts` — configure(), getConfig(), env var support
- `src/client.ts` — BVClient (fetch + retry + timeout + default headers)
- `src/sources/base.ts` — abstract Source class

### First source
- `src/sources/bcb.ts` — BCB SGS series + OLINDA OData

### Tests
- `tests/helpers/setup.ts` — msw server setup
- `tests/client.test.ts` — HTTP client tests
- `tests/errors.test.ts` — error hierarchy tests
- `tests/sources/bcb.test.ts` — BCB source tests

### Re-exports
- `src/sources/index.ts` — re-export sources
- `src/index.ts` — public API surface

## API Discovery

### BCB SGS (verified)
- **Endpoint**: `GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.{id}/dados`
- **Params**: `formato=json`, `dataInicial=dd/mm/yyyy`, `dataFinal=dd/mm/yyyy`
- **Response**: `[{ "data": "dd/mm/yyyy", "valor": "0.043739" }]`
- **Notes**: `valor` is a string; `Accept: application/json` header required; daily series limited to 10-year window

### BCB OLINDA (verified)
- **Endpoint**: `GET https://olinda.bcb.gov.br/olinda/servico/{service}/versao/v1/odata/{entity}`
- **Params**: OData (`$top`, `$skip`, `$filter`, `$format=json`, `$orderby`)
- **Response**: `{ "@odata.context": "...", "value": [...] }`

## Design Decisions

1. **String-to-number conversion**: SDK converts `valor: "0.043739"` to `valor: number` — users get clean data
2. **Date normalization**: SDK accepts ISO dates (`"2024-01-01"`) and converts to BCB format (`"01/01/2024"`) internally
3. **Date output**: Returns `data` as string in ISO format (`"2024-01-02"`) — predictable, serializable
4. **Retry**: Exponential backoff, default 3 attempts, only on 5xx and network errors
5. **Timeout**: AbortController, default 30s
6. **No rate limiting in v0.1**: Added later if needed
7. **Singleton default client**: Sources use a shared default client; users can inject a custom one

## Error Hierarchy

```
BVError (base — extends Error)
├── BVHttpError        — HTTP status != 2xx (statusCode, responseBody)
├── BVTimeoutError     — fetch aborted by timeout
├── BVValidationError  — invalid params before making request
└── BVSourceOfflineError — source known to be offline
```

All errors include `source: string` to identify origin (e.g., `"bcb"`).

## Target Interface

```typescript
import { bcb, configure } from "@bracc/sdk";

// SGS time series
const selic = await bcb.sgs({ serie: 11, dataInicial: "2024-01-01", dataFinal: "2024-01-31" });
// => SgsSerie[] = [{ data: "2024-01-02", valor: 0.043739 }, ...]

// Multiple series
const ipca = await bcb.sgs({ serie: 433 });

// OLINDA market expectations
const expectativas = await bcb.expectativas({ indicador: "IPCA", top: 10 });
```

## Out of Scope
- Download/CSV sources (Phase 2)
- FTP/DBC sources (Phase 3)
- Cache layer
- Other REST sources (ibge, cgu, etc. — next increments)
