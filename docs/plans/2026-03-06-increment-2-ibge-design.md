# Increment 2 — IBGE Source Module

> Design approved on 2026-03-06

## Goal

Add the IBGE (Instituto Brasileiro de Geografia e Estatística) source module with comprehensive coverage of its 3 public APIs: Localidades, Agregados (Sidra), and Nomes.

## API Discovery (verified)

### Localidades API (`/api/v1/localidades/`)
- **Regiões**: `GET /regioes` → `[{ id, sigla, nome }]`
- **Estados**: `GET /estados` → `[{ id, sigla, nome, regiao }]`
- **Estados por região**: `GET /estados/{id}` or `/regioes/{id}/estados`
- **Mesorregiões**: `GET /mesorregioes` → `[{ id, nome, UF }]`
- **Microrregiões**: `GET /microrregioes` → `[{ id, nome, mesorregiao }]`
- **Regiões intermediárias**: `GET /regioes-intermediarias` → `[{ id, nome, UF }]`
- **Regiões imediatas**: `GET /regioes-imediatas` → `[{ id, nome, regiao-intermediaria }]`
- **Municípios**: `GET /municipios` or `/estados/{id}/municipios` → `[{ id, nome, microrregiao }]`
- **Distritos**: `GET /distritos` → `[{ id, nome, municipio }]`
- **Subdistritos**: `GET /subdistritos` → `[{ id, nome, distrito }]`

### Agregados API (`/api/v3/agregados/`)
- **Listar pesquisas**: `GET /agregados` → `[{ id, nome, agregados: [...] }]`
- **Metadados de tabela**: `GET /agregados/{tabela}/metadados` → `{ id, nome, periodicidade, variaveis, classificacoes }`
- **Dados**: `GET /agregados/{tabela}/periodos/{p}/variaveis/{v}?localidades={l}` → response with nested structure
- **Response format**: `[{ id, variavel, unidade, resultados: [{ classificacoes, series: [{ localidade, serie: { "2024": "value" } }] }] }]`
- **Values are strings** — need numeric conversion
- **Localidades format**: `N1` (Brasil), `N2` (região), `N3[35]` (estado SP), `N6[3550308]` (município)
- **Períodos format**: `202312` (specific), `-6` (last 6), `all` (todos)

### Nomes API (`/api/v2/censos/nomes/`)
- **Frequência por nome**: `GET /nomes/{nome}` → `[{ nome, sexo, localidade, res: [{ periodo, frequencia }] }]`
- **Ranking**: `GET /nomes/ranking?localidade={id}` → `[{ localidade, res: [{ nome, frequencia, ranking }] }]`

## Target Interface

```typescript
import { ibge } from "@bracc/sdk";

// === Localidades ===
const estados = await ibge.estados();
const municipiosSP = await ibge.municipios({ uf: 35 });
const regioes = await ibge.regioes();
const mesorregioes = await ibge.mesorregioes({ uf: 35 });
const microrregioes = await ibge.microrregioes({ uf: 35 });
const distritos = await ibge.distritos({ uf: 35 });

// === Agregados (Sidra) ===
const pop = await ibge.agregados({
  tabela: 6579,
  periodos: "-6",
  variaveis: [9324],
  localidades: "N1",
});

const ipca = await ibge.agregados({
  tabela: 7060,
  periodos: "202312",
  variaveis: [63],
  localidades: "N1",
});

const metadados = await ibge.agregadosMetadados(6579);

// === Nomes (Censo) ===
const joao = await ibge.nomes({ nome: "João" });
const ranking = await ibge.nomesRanking({ localidade: 35 });
```

## Design Decisions

1. **Localidades**: Return raw IBGE response — structure is already clean and well-typed
2. **Agregados**: Return raw IBGE nested structure with string→number conversion on `serie` values
3. **Nomes**: Return raw IBGE response — simple structure
4. **No flattening**: Keep IBGE's nested structure (users expect it, docs reference it)
5. **Localidade string format**: Accept IBGE's format directly (`"N1"`, `"N3[35]"`) — no abstraction layer
6. **All methods on single class**: `IbgeSource` with methods grouped by API domain

## Files

```
src/sources/ibge.ts        — IbgeSource class
tests/sources/ibge.test.ts — tests with MSW
src/sources/index.ts       — add IbgeSource re-export
src/index.ts               — add ibge convenience export
```
