# Brazil Visible SDK

SDK TypeScript unificado para acesso a **93+ fontes de dados publicos brasileiros**.

Uma interface programatica unica sobre APIs REST, downloads CSV, FTP e portais do governo federal — feito para jornalistas de dados, pesquisadores e desenvolvedores civicos.

## Instalacao

```bash
npm install brazilvisible
```

Compativel com **Node.js >=18**, **Deno**, **Bun** e **browsers** (fontes REST).

## Uso rapido

```typescript
import { bcb, ibge } from "brazilvisible";

// Banco Central — serie temporal SGS
const selic = await bcb.sgs({ serie: 11, inicio: "2024-01-01", fim: "2024-12-31" });
console.log(selic);

// IBGE — dados agregados
const populacao = await ibge.agregados({ tabela: 1301, periodos: "2022", localidades: "N1" });
console.log(populacao);
```

### Com autenticacao (CGU)

```typescript
import { cgu, configure } from "brazilvisible";

configure({ apiKeys: { cgu: "sua-chave-aqui" } });
// ou defina a env var: export BV_CGU_API_KEY=sua-chave-aqui

const contratos = await cgu.contratos({ orgao: "25000", ano: 2024 });
const sancionadas = await cgu.ceis();
```

### Cruzamento de dados

```typescript
import { cgu } from "brazilvisible";

// Empresas sancionadas que ainda vencem licitacoes
const sancionadas = await cgu.ceis();
const contratos = await cgu.contratos({ ano: 2024 });

const cnpjsSancionados = new Set(sancionadas.map((s) => s.cnpj));
const irregulares = contratos.filter((c) => cnpjsSancionados.has(c.cnpj));
console.log(`${irregulares.length} contratos com empresas sancionadas`);
```

## Fontes disponiveis

| Modulo | Fontes | Tipo |
|--------|--------|------|
| `ibge` | Agregados, Censo, PNAD, PIB Municipal, IPCA | REST |
| `bcb` | SGS (Cambio, Juros, Credito, PIX, Reservas...), IFData | REST |
| `cgu` | CEIS, CNEP, CEPIM, Contratos, Servidores, Emendas | REST |
| `tesouro` | SICONFI, SIAFI, SIOP | REST |
| `tse` | Candidaturas, Resultados, Bens, Filiados | Download |
| `receita` | CNPJ, QSA, Estabelecimentos, Simples | Download |
| `datasus` | CNES, SIH, SIM, SINAN, SINASC | FTP |
| ... | [+16 modulos](./AGENTS.md) | Misto |

Veja a lista completa em [AGENTS.md](./AGENTS.md#referencia-rapida--fontes-por-modulo).

## Desenvolvimento

```bash
git clone git@github.com:brazilvisible/brazil-visible-sdk.git
cd brazil-visible-sdk
npm install
npm run build
npm test
npm run lint
npm run typecheck
```

## Projeto irmao

Este SDK e a camada programatica do [Brazil Visible](https://brazilvisible.org) — catalogo de documentacao com 93+ fontes de dados publicos brasileiros.

## Licenca

MIT
