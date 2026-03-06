# Brazil Visible SDK

SDK TypeScript unificado para acesso a **93+ fontes de dados publicos brasileiros**.

Uma interface programatica unica sobre APIs REST, downloads CSV, FTP e portais do governo federal — feito para jornalistas de dados, pesquisadores e desenvolvedores civicos.

## Instalacao

```bash
npm install brazil-visible
```

Compativel com **Node.js >=18**, **Deno**, **Bun** e **browsers** (fontes REST).

## Uso rapido

```typescript
import { bcb, ibge } from "brazil-visible";

// Banco Central — serie temporal SGS
const selic = await bcb.sgs({ serie: 11, inicio: "2024-01-01", fim: "2024-12-31" });
console.log(selic);

// IBGE — dados agregados
const populacao = await ibge.agregados({ tabela: 1301, periodos: "2022", localidades: "N1" });
console.log(populacao);
```

### Com autenticacao (CGU)

```typescript
import { cgu, configure } from "brazil-visible";

configure({ apiKeys: { cgu: "sua-chave-aqui" } });
// ou defina a env var: export BV_CGU_API_KEY=sua-chave-aqui

const contratos = await cgu.contratos({ orgao: "25000", ano: 2024 });
const sancionadas = await cgu.ceis();
```

### Download de dados (TSE, Receita, etc.)

```typescript
import { tse, receita } from "brazil-visible";

// TSE — candidaturas (baixa ZIP, descompacta, retorna array tipado)
const candidatos = await tse.candidaturas({ ano: 2022, estado: "SP" });
console.log(`${candidatos.length} candidaturas em SP`);

// Receita Federal — empresas por CNPJ
const empresas = await receita.empresas({ chunk: 0 });
```

### Cruzamento de dados

```typescript
import { cgu } from "brazil-visible";

// Empresas sancionadas que ainda vencem licitacoes
const sancionadas = await cgu.ceis();
const contratos = await cgu.contratos({ ano: 2024 });

const cnpjsSancionados = new Set(sancionadas.map((s) => s.cnpj));
const irregulares = contratos.filter((c) => cnpjsSancionados.has(c.cnpj));
console.log(`${irregulares.length} contratos com empresas sancionadas`);
```

## Fontes disponiveis (22 modulos)

### REST APIs

| Modulo | Import | Metodos | Auth |
|--------|--------|---------|------|
| **BCB** | `bcb` | `sgs`, `expectativas` | Nao |
| **IBGE** | `ibge` | `estados`, `municipios`, `distritos`, `regioes`, `mesorregioes`, `microrregioes`, `agregados`, `agregadosMetadados`, `nomes`, `nomesRanking` | Nao |
| **Tesouro** | `tesouro` | `entes`, `rreo`, `rgf` | Nao |
| **IPEA** | `ipea` | `series`, `metadados` | Nao |
| **CGU** | `cgu` | `ceis`, `cnep`, `cepim`, `ceaf`, `contratos`, `servidores`, `emendas`, `viagens` | API Key |
| **Seguranca** | `seguranca` | `ocorrencias`, `indicadores` | Nao |
| **Portais** | `portais` | `buscarConjuntos`, `recursos`, `execucaoOrcamentaria` | Nao |
| **Ambiente** | `ambiente` | `prodes`, `deter`, `focosCalor`, `ibamaMultas` | Nao |
| **Transportes** | `transportes` | `anacVoos`, `prfAcidentes`, `denatranFrota` | Nao |
| **Diarios** | `diarios` | `dou`, `doe` | Nao |
| **Governamentais** | `governamentais` | `cadin`, `siorg`, `siape` | Nao |
| **Outros** | `outros` | `ansOperadoras`, `antaqPortos`, `ancineProjetos` | Nao |
| **CNJ** | `cnj` | `justicaNumeros`, `datajud`\* | Varia |

### Download CSV/ZIP

| Modulo | Import | Metodos | Formato |
|--------|--------|---------|---------|
| **TSE** | `tse` | `candidaturas`, `bensCandidatos`, `resultados`, `filiados` | ZIP/CSV |
| **Receita** | `receita` | `empresas`, `estabelecimentos`, `socios`, `simplesNacional` | ZIP/CSV |
| **Mercado/CVM** | `mercado` | `dfp`, `itr`, `ciasAbertas`, `fundosInvestimento` | ZIP/CSV |
| **INEP** | `inepData` | `enem`, `censoEscolar`, `censoSuperior` | ZIP/CSV |
| **Trabalho** | `trabalho` | `caged`, `rais` | ZIP/CSV |
| **Previdencia** | `previdencia` | `beneficios`, `fundosPensao` | CSV |
| **Reguladoras** | `reguladoras` | `anatel`, `aneel`, `anp`, `anvisa` | CSV |

### Especializados

| Modulo | Import | Metodos | Notas |
|--------|--------|---------|-------|
| **DATASUS** | `datasus` | `cnes`, `sim`, `sih` | FTP/DBC — fallback informativo |
| **Geo** | `geo` | `municipios`, `malha`, `wmsCapabilities`, `wmsGetMap` | WMS/WFS/GeoJSON |

\* `datajud` requer cadastro especial no CNJ — o metodo orienta sobre como obter acesso.

## Configuracao

```typescript
import { configure } from "brazil-visible";

configure({
  timeout: 60000,        // timeout HTTP em ms (default: 30000)
  maxRetries: 5,         // tentativas de retry (default: 3)
  apiKeys: {
    cgu: "sua-chave",    // ou env var BV_CGU_API_KEY
  },
});
```

## Desenvolvimento

```bash
git clone git@github.com:brazilvisible/brazil-visible-sdk.git
cd brazil-visible-sdk
npm install
npm run build       # ESM + CJS + .d.ts
npm test            # 179 testes
npm run lint        # biome
npm run typecheck   # tsc --noEmit
```

## Projeto irmao

Este SDK e a camada programatica do [Brazil Visible](https://brazilvisible.org) — catalogo de documentacao com 93+ fontes de dados publicos brasileiros.

## Licenca

MIT
