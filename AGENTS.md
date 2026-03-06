# Brazil Visible SDK — AGENTS.md

> Este documento e o briefing completo para implementacao do SDK. Qualquer sessao Claude Code neste repositorio deve comecar lendo este arquivo.

## Visao Geral

SDK TypeScript unificado para acesso a 93+ fontes de dados publicos brasileiros. Oferece uma interface programatica unica sobre APIs REST, downloads CSV, FTP e portais do governo federal.

**Proposta de valor**: Ninguem unificou o acesso a dados publicos brasileiros num unico pacote. Existem SDKs isolados por orgao (python-bcb, pysus, sidra), mas nenhum em TypeScript/JavaScript que cubra o ecossistema inteiro. Este SDK resolve isso — e alcanca o maior ecossistema de desenvolvedores do mundo.

**Repositorio irmao**: [Brazil Visible](https://github.com/nferdica/brazil-visible) — catalogo de documentacao com 92 APIs mapeadas em frontmatter YAML estruturado (url_base, formato_dados, campos_chave, tipo_acesso, autenticacao). Esse frontmatter e a base de configuracao do SDK.

---

## Publico-Alvo

1. **Jornalistas de dados** — Abraji, Agencia Publica, Fiquem Sabendo. Querem cruzar bases sem perder horas com boilerplate.
2. **Pesquisadores academicos** — ciencia politica, economia, saude publica. Scripts rapidos em Node/Deno/Bun.
3. **Desenvolvedores civicos** — civic hackers. Querem construir ferramentas de fiscalizacao com tipagem forte e ecossistema npm.
4. **Desenvolvedores fullstack** — ja usam TypeScript no front e no back, agora podem acessar dados publicos nativamente.

---

## Arquitetura

### Principios

- **Uma interface, muitas fontes**: `import { ibge, bcb } from '@brazilvisible/sdk'` — independente se a fonte e REST, CSV ou FTP
- **Typed-first**: Toda resposta retorna arrays tipados `T[]` com interfaces completas para cada fonte
- **Zero config para 80% dos casos**: 80% das APIs nao exigem autenticacao
- **Zero deps HTTP**: Usa `fetch` nativo (Node >=18) — sem axios, got ou undici no core
- **Fail-fast com mensagens claras**: Se uma API esta fora do ar, erro descritivo com link para o health check
- **Tree-shakeable**: Importar `ibge` nao puxa codigo de `datasus`

### Estrutura do Pacote

```
src/
  index.ts                # Re-exports publicos (ibge, bcb, cgu, etc.)
  client.ts               # Cliente HTTP base (fetch, retries, rate limiting, user-agent)
  types.ts                # Tipos compartilhados (BVResponse, Pagination, etc.)
  cache.ts                # Cache local opcional (respostas, downloads)
  download.ts             # Utilitarios para download + descompressao (ZIP, GZ)
  parsers.ts              # Parsers de formato (CSV, JSON, XML)
  errors.ts               # Hierarquia de excecoes (BVError, SourceOfflineError, AuthRequiredError)
  config.ts               # Configuracao global (API keys, timeouts)
  sources/
    index.ts              # Re-exports de todos os sources
    base.ts               # Interface abstrata Source
    ibge.ts               # IBGE (Sidra, Agregados, Censos)
    bcb.ts                # Banco Central (SGS series, IFData)
    cgu.ts                # CGU Portal da Transparencia (CEIS, CNEP, CEPIM, contratos, servidores, emendas, viagens)
    receita.ts            # Receita Federal (CNPJ, QSA, Estabelecimentos, Simples)
    tse.ts                # TSE (candidaturas, resultados, prestacao de contas, bens, filiados, boletins, eleitorado)
    tesouro.ts            # Tesouro Nacional (SICONFI, SIAFI, SIOP)
    inep.ts               # INEP/Educacao (ENEM, Censo Escolar, Censo Superior, FNDE)
    datasus.ts            # DATASUS (TabNet, CNES, SIH, SIM, SINAN, SINASC)
    cnj.ts                # CNJ (DataJud, BNMP, SisbaJud, Justica em Numeros)
    ambiente.ts           # Meio Ambiente (PRODES, DETER, CAR, focos calor, IBAMA, UC, recursos hidricos)
    trabalho.ts           # Trabalho (RAIS, CAGED)
    previdencia.ts        # Previdencia (INSS, PREVIC)
    mercado.ts            # Mercado Financeiro (CVM DFP/ITR, CVM Administradores, CVM Fatos Relevantes, B3)
    ipea.ts               # IPEA (IpeaData)
    transportes.ts        # Transportes (ANAC, PRF, DNIT, ANTT, DENATRAN)
    reguladoras.ts        # Agencias Reguladoras (ANATEL, ANEEL, ANP, ANVISA)
    geo.ts                # Dados Geoespaciais (IBGE Geociencias, CPRM, INCRA, INDE, INPE)
    diarios.ts            # Diarios Oficiais (DOU, DOEs estaduais)
    governamentais.ts     # APIs Governamentais (CADIN, SIAPE, SIORG)
    seguranca.ts          # Seguranca Publica (SINESP)
    outros.ts             # Outros (ANS, ANTAQ, ANCINE)
    portais.ts            # Portais Centrais (Portal Dados Abertos, Base dos Dados, Tesouro Transparente, Portal Transparencia)
tests/
  sources/
    ibge.test.ts
    bcb.test.ts
    cgu.test.ts
    ...
  client.test.ts
  parsers.test.ts
examples/
  quickstart.ts           # Exemplo minimo de uso
  cruzamento-licitacoes-sancoes.ts  # Receita de cruzamento adaptada
```

### Interface Source (base abstrata)

Toda fonte implementa esta interface:

```typescript
import type { BVClient } from "../client";

export interface SourceConfig {
  client?: BVClient;
}

export abstract class Source {
  protected client: BVClient;

  constructor(config?: SourceConfig) {
    this.client = config?.client ?? getDefaultClient();
  }

  /** Nome legivel da fonte (ex: 'IBGE Agregados'). */
  abstract readonly name: string;

  /** URL base da API/fonte. */
  abstract readonly baseUrl: string;

  /** Se a fonte exige autenticacao. Default: false. */
  readonly authRequired: boolean = false;
}
```

### Cliente HTTP

```typescript
export interface BVClientConfig {
  timeout?: number;       // ms, default 30000
  maxRetries?: number;    // default 3
  apiKeys?: Record<string, string>;
}

export class BVClient {
  static readonly DEFAULT_HEADERS: Record<string, string> = {
    "User-Agent": "brazilvisible-sdk/0.1 (https://brazilvisible.org)",
    "Accept": "application/json, text/csv, */*",
  };

  constructor(config?: BVClientConfig) { /* ... */ }

  async get<T>(url: string, options?: RequestOptions): Promise<T> { /* ... */ }
  async post<T>(url: string, body: unknown, options?: RequestOptions): Promise<T> { /* ... */ }
}
```

A chave `apiKeys` e um `Record<string, string>` de `{sourceName: key}`, ex: `{ cgu: "abc123" }`. Configuravel tambem via env vars: `BV_CGU_API_KEY`, `BV_GOV_BR_TOKEN`, etc.

### Retorno de Dados

Em vez de DataFrames (conceito Python), o SDK retorna **arrays tipados**:

```typescript
// Cada fonte define suas interfaces de retorno
interface SgsSerie {
  data: string;
  valor: number;
}

// Uso
const selic: SgsSerie[] = await bcb.sgs({ serie: 11, inicio: "2024-01-01" });
```

Para quem precisa de analise tabular, os arrays sao compatíveis com bibliotecas como `danfojs`, `arquero`, ou simplesmente `Array.prototype.filter/map/reduce`.

---

## Mapeamento de APIs por Padrao de Acesso

### REST APIs (41 fontes) — Fase 1 Priority

Wrappers HTTP diretos. A resposta ja vem em JSON, basta parsear e tipar.

**Sem autenticacao:**
- IBGE Agregados/Sidra (servicodados.ibge.gov.br)
- BCB SGS — 7 series (dadosabertos.bcb.gov.br)
- BCB IFData
- Tesouro SICONFI, SIAFI, SIOP (apidatalake.tesouro.gov.br)
- IPEA IpeaData
- CNJ DataJud, Justica em Numeros
- IBGE Geociencias

**Com API Key (header):**
- CGU Portal da Transparencia — 8 endpoints (api.portaldatransparencia.gov.br)
  - CEIS, CNEP, CEPIM, CEAF, contratos, servidores, emendas, viagens
  - Header: `chave-api-dados`

**Com OAuth/cadastro:**
- BNMP (Gov.br Prata/Ouro)
- SisbaJud (certificado digital)

### Download CSV/ZIP (31 fontes) — Fase 2

O SDK baixa o arquivo, descompacta, parseia CSV e retorna array tipado.

- TSE — 7 bases (dadosabertos.tse.jus.br) — ZIP com CSVs
- Receita Federal — 4 bases (cnpj, qsa, estabelecimentos, simples) — ZIP com CSVs grandes (>1GB)
- INEP — 4 bases (enem, censos) — ZIP com CSVs
- RAIS, CAGED — ZIP com CSVs
- INSS, PREVIC — CSV/XLSX
- CVM — 3 bases — CSV
- B3 — CSV
- Agencias reguladoras (ANATEL, ANEEL, ANP, ANVISA) — CSV/XLSX

### FTP + Formato Legacy (5 fontes) — Fase 3

- DATASUS (SIM, SIH, SINAN, SINASC, CNES) — FTP com arquivos .dbc/.dbf
- Requer: parser DBC customizado ou wrapper para binario nativo

### Geoespacial (8 fontes) — Fase 3

- INCRA, CPRM, INDE, INPE Satelite — WMS/WFS/Shapefile/GeoTIFF
- Requer: libs geoespaciais (potencialmente via extra opcional)

### Web-Only sem API (3 fontes) — Fase 3 ou skip

- TabNet DATASUS, Power BI MTE — sem API programatica direta
- Considerar scraping ou marcar como "nao suportado no SDK"

---

## Fases de Implementacao

### Fase 1 — REST APIs (prioridade maxima)

**Objetivo**: SDK funcional com as 41 REST APIs mais uteis.

**Entregaveis**:
1. `client.ts` — Cliente HTTP com fetch nativo, retry, timeout, rate limiting
2. `types.ts` — Tipos compartilhados, paginacao
3. `errors.ts` — Hierarquia de erros
4. Modulos de source: `ibge.ts`, `bcb.ts`, `cgu.ts`, `tesouro.ts`, `ipea.ts`, `cnj.ts`
5. Testes unitarios com respostas mockadas (vitest + msw)
6. `examples/quickstart.ts`

**Interface alvo**:
```typescript
import { ibge, bcb, cgu, configure } from "@brazilvisible/sdk";

// IBGE — series agregadas
const pop = await ibge.agregados({ tabela: 1301, periodos: "2022", localidades: "N1" });

// Banco Central — series temporais SGS
const selic = await bcb.sgs({ serie: 11, inicio: "2024-01-01", fim: "2024-12-31" });
const ipca = await bcb.sgs({ serie: 433 });

// CGU Portal da Transparencia (requer API key)
configure({ apiKeys: { cgu: "sua-chave-aqui" } });
// ou: export BV_CGU_API_KEY=sua-chave-aqui

const contratos = await cgu.contratos({ orgao: "25000", ano: 2024 });
const sancionadas = await cgu.ceis();
const servidores = await cgu.servidores({ orgao: "25000" });
```

**Criterios de pronto**:
- [ ] `npm install @brazilvisible/sdk` funciona
- [ ] Pelo menos 6 modulos de fonte funcionais (ibge, bcb, cgu, tesouro, ipea, cnj)
- [ ] Tipagem completa (tsc strict passa)
- [ ] Testes com cobertura >80%
- [ ] Documentacao basica no README

### Fase 2 — Download Sources

**Objetivo**: Adicionar fontes que dependem de download CSV/ZIP.

**Entregaveis**:
1. `download.ts` — Download com progress, resume, descompressao ZIP/GZ (Node streams)
2. `cache.ts` — Cache local de downloads (evitar re-download)
3. `parsers.ts` — CSV parser robusto (encoding latin1, separadores variados)
4. Modulos: `tse.ts`, `receita.ts`, `inep.ts`, `trabalho.ts`, `previdencia.ts`, `mercado.ts`, `reguladoras.ts`

**Interface alvo**:
```typescript
import { tse, receita } from "@brazilvisible/sdk";

// TSE — candidaturas (baixa ZIP, descompacta, retorna array tipado)
const candidatos = await tse.candidaturas({ ano: 2022, estado: "SP" });

// Receita Federal — CNPJ (arquivo grande, cache local)
const empresa = await receita.cnpj("12345678000100");
const socios = await receita.qsa({ cnpj: "12345678000100" });
```

**Desafios**:
- Arquivos da Receita Federal sao enormes (>1GB compactado, ~30GB descompactado)
- Precisa de estrategia de cache e streaming (Node.js streams)
- Encoding ISO-8859-1 em muitos CSVs do governo

### Fase 3 — Fontes Especializadas

**Objetivo**: DATASUS (FTP/DBC), geoespacial (WMS/WFS), e integracao com health check.

**Entregaveis**:
1. `datasus.ts` — acesso FTP + conversao DBC (parser binario ou wrapper WASM)
2. `geo.ts` — WMS/WFS (retorna GeoJSON)
3. Integracao com `health.json` do Brazil Visible para status em tempo real

---

## Decisoes Tecnicas

### Dependencias Core
- **Nenhuma para HTTP** — `fetch` nativo (Node >=18, Deno, Bun, browsers)
- **csv-parse** — Parser CSV robusto para Node.js (streaming, encoding)
- Retry e rate limiting implementados internamente (logica simples, evita deps)

### Dependencias Dev
- **typescript** >=5.5 — compilador
- **tsup** — Bundler para libs (ESM + CJS + declarations)
- **vitest** — Test runner (rapido, TS-nativo, compativel com Jest API)
- **msw** — Mock Service Worker (intercepta fetch para testes)
- **biome** — Linter + formatter (substitui ESLint + Prettier, rapido)

### Compatibilidade de Runtime
- **Node.js** >=18 (fetch nativo, AbortController, streams)
- **Deno** — compativel via npm specifiers
- **Bun** — compativel nativamente
- **Browser** — fontes REST funcionam (download/FTP nao, por limitacao de plataforma)

### Output Format
- **ESM** — `import { bcb } from '@brazilvisible/sdk'`
- **CJS** — `const { bcb } = require('@brazilvisible/sdk')`
- **Types** — `.d.ts` declarations incluidas
- Gerado via `tsup` com `dts: true`

### Versionamento
- SemVer (0.x enquanto a API nao estabilizar)
- Changelog com conventional commits

### Testes
- **vitest** — runner principal
- **msw** (Mock Service Worker) — intercepta `fetch` para testes unitarios
- Testes unitarios: respostas mockadas, sem rede
- Testes de integracao (sufixo `.integration.test.ts`): chamadas reais, opcionais em CI

### CI/CD
- GitHub Actions: lint (biome), type check (tsc), test (vitest), build (tsup)
- Publish no npm via provenance (npm publish --provenance)

### Packaging
- **tsup** como bundler (rapido, zero-config para libs)
- src layout (`src/`)
- Dual package (ESM + CJS)
- `"type": "module"` no package.json

---

## Relacao com Brazil Visible (site)

O SDK e o site sao projetos complementares:

| Aspecto | Site (Brazil Visible) | SDK (@brazilvisible/sdk) |
|---------|----------------------|-------------------------|
| **Linguagem** | TypeScript/Next.js | TypeScript/Node.js |
| **Proposito** | Documentacao para humanos | Acesso programatico |
| **Dados** | Frontmatter YAML (92 fontes) | Codigo que consome as fontes |
| **Health check** | Gera `health.json` a cada 6h | Consome `health.json` para status |
| **Publico** | Navegadores web | Desenvolvedores/scripts |

O frontmatter do site (`url_base`, `formato_dados`, `campos_chave`, `tipo_acesso`, `autenticacao`) e a "especificacao" que o SDK implementa. Mudancas no site devem ser refletidas no SDK e vice-versa.

---

## Convencoes

- **Lingua do codigo**: Ingles (nomes de funcoes, variaveis, JSDoc)
- **Lingua da documentacao publica**: PT-BR (README, exemplos, mensagens de erro para usuario)
- **Commits**: Conventional commits em ingles (`feat:`, `fix:`, `docs:`, `test:`)
- **Branch**: `main` = releases, `develop` = desenvolvimento
- **Code style**: Biome (linter + formatter), double quotes, semicolons, 2-space indent
- **Docs em codigo**: JSDoc (nao TSDoc) — mais simples, suporte universal
- **Type safety**: `strict: true` no tsconfig, sem `any` explicito
- **Naming**: camelCase para funcoes/variaveis, PascalCase para tipos/classes, kebab-case para arquivos

---

## Referencia Rapida — Fontes por Modulo

| Modulo | Fontes | Tipo | Auth |
|--------|--------|------|------|
| `ibge` | Agregados, Censo Demografico, PNAD, PIB Municipal, IPCA | REST | Nao |
| `bcb` | SGS (Cambio, Juros, IPCA, Credito, PIX, Reservas, Base Monetaria, Meios Pagamento), IFData | REST | Nao |
| `cgu` | CEIS, CNEP, CEPIM, CEAF, Contratos, Servidores, Emendas, Viagens | REST | API Key |
| `tesouro` | SICONFI, SIAFI, SIOP | REST | Nao |
| `ipea` | IpeaData | REST | Nao |
| `cnj` | DataJud, BNMP, SisbaJud, Justica em Numeros | REST | Varia |
| `tse` | Candidaturas, Resultados, Prestacao Contas, Bens, Filiados, Boletins, Eleitorado | Download CSV | Nao |
| `receita` | CNPJ, QSA, Estabelecimentos, Simples Nacional | Download CSV | Nao |
| `inep` | ENEM, Censo Escolar, Censo Superior, FNDE | Download CSV | Nao |
| `datasus` | TabNet, CNES, SIH, SIM, SINAN, SINASC | FTP/DBC | Nao |
| `ambiente` | PRODES, DETER, CAR, Focos Calor, IBAMA, UC, Recursos Hidricos | Misto | Nao |
| `trabalho` | RAIS, CAGED | Download CSV | Nao |
| `previdencia` | INSS, PREVIC | Download CSV | Nao |
| `mercado` | CVM DFP/ITR, CVM Admin, CVM Fatos, B3 | Download CSV | Nao |
| `transportes` | ANAC, PRF, DNIT, ANTT, DENATRAN | Misto | Nao |
| `reguladoras` | ANATEL, ANEEL, ANP, ANVISA | Download CSV | Nao |
| `geo` | IBGE Geo, CPRM, INCRA, INDE, INPE | WMS/WFS/GeoJSON | Nao |
| `diarios` | DOU, DOEs | REST/Download | Nao |
| `governamentais` | CADIN, SIAPE, SIORG | REST | Varia |
| `seguranca` | SINESP | REST | Nao |
| `outros` | ANS, ANTAQ, ANCINE | REST/Download | Nao |
| `portais` | Portal Dados Abertos, Base dos Dados, Tesouro Transparente, Portal Transparencia | REST | Nao |
