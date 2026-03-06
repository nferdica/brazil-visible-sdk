# Brazil Visible SDK — AGENTS.md

> Este documento e o briefing completo para implementacao do SDK. Qualquer sessao Claude Code neste repositorio deve comecar lendo este arquivo.

## Visao Geral

SDK Python unificado para acesso a 93+ fontes de dados publicos brasileiros. Oferece uma interface programatica unica sobre APIs REST, downloads CSV, FTP e portais do governo federal.

**Proposta de valor**: Ninguem unificou o acesso a dados publicos brasileiros num unico pacote. Existem SDKs isolados por orgao (python-bcb, pysus, sidra), mas nenhum que cubra o ecossistema inteiro. Este SDK resolve isso.

**Repositorio irmao**: [brazil-visible](https://github.com/nferdica/brazil-visible) — catalogo de documentacao com 92 APIs mapeadas em frontmatter YAML estruturado (url_base, formato_dados, campos_chave, tipo_acesso, autenticacao). Esse frontmatter e a base de configuracao do SDK.

---

## Publico-Alvo

1. **Jornalistas de dados** — Abraji, Agencia Publica, Fiquem Sabendo. Querem cruzar bases sem perder horas com boilerplate.
2. **Pesquisadores academicos** — ciencia politica, economia, saude publica. Cada mestrando reinventa o acesso a IBGE/DATASUS.
3. **Desenvolvedores civicos** — comunidade br/acc, civic hackers. Querem construir ferramentas de fiscalizacao sem gastar tempo em ETL.

---

## Arquitetura

### Principios

- **Uma interface, muitas fontes**: `from brazilvisible import ibge` — independente se a fonte e REST, CSV ou FTP
- **DataFrame-first**: Toda resposta retorna `pandas.DataFrame` por padrao (com opcao de dict/JSON)
- **Zero config para 80% dos casos**: 80% das APIs nao exigem autenticacao
- **Fail-fast com mensagens claras**: Se uma API esta fora do ar, erro descritivo com link para o health check
- **Tipagem completa**: Type hints em todo o codebase, compativel com mypy strict

### Estrutura do Pacote

```
src/
  brazilvisible/
    __init__.py           # Re-exports publicos (ibge, bcb, cgu, etc.)
    _client.py            # Cliente HTTP base (httpx, retries, rate limiting, user-agent)
    _types.py             # Tipos compartilhados (BVResponse, Pagination, etc.)
    _cache.py             # Cache local opcional (respostas, downloads)
    _download.py          # Utilitarios para download + descompressao (ZIP, GZ)
    _parsers.py           # Parsers de formato (CSV, JSON, XML, DBC, XLS)
    _exceptions.py        # Hierarquia de excecoes (BVError, SourceOfflineError, AuthRequiredError)
    py.typed              # Marker PEP 561
    sources/
      __init__.py
      _base.py            # Classe abstrata Source com interface padrao
      ibge.py             # IBGE (Sidra, Agregados, Censos)
      bcb.py              # Banco Central (SGS series, IFData)
      cgu.py              # CGU Portal da Transparencia (CEIS, CNEP, CEPIM, contratos, servidores, emendas, viagens)
      receita.py          # Receita Federal (CNPJ, QSA, Estabelecimentos, Simples)
      tse.py              # TSE (candidaturas, resultados, prestacao de contas, bens, filiados, boletins, eleitorado)
      tesouro.py          # Tesouro Nacional (SICONFI, SIAFI, SIOP)
      inep.py             # INEP/Educacao (ENEM, Censo Escolar, Censo Superior, FNDE)
      datasus.py          # DATASUS (TabNet, CNES, SIH, SIM, SINAN, SINASC)
      cnj.py              # CNJ (DataJud, BNMP, SisbaJud, Justica em Numeros)
      ambiente.py         # Meio Ambiente (PRODES, DETER, CAR, focos calor, IBAMA, unidades conservacao, recursos hidricos)
      trabalho.py         # Trabalho (RAIS, CAGED)
      previdencia.py      # Previdencia (INSS, PREVIC)
      mercado.py          # Mercado Financeiro (CVM DFP/ITR, CVM Administradores, CVM Fatos Relevantes, B3)
      ipea.py             # IPEA (IpeaData)
      transportes.py      # Transportes (ANAC, PRF, DNIT, ANTT, DENATRAN)
      reguladoras.py      # Agencias Reguladoras (ANATEL, ANEEL, ANP, ANVISA)
      geo.py              # Dados Geoespaciais (IBGE Geociencias, CPRM, INCRA, INDE, INPE)
      diarios.py          # Diarios Oficiais (DOU, DOEs estaduais)
      governamentais.py   # APIs Governamentais (CADIN, SIAPE, SIORG)
      seguranca.py        # Seguranca Publica (SINESP)
      outros.py           # Outros (ANS, ANTAQ, ANCINE)
      portais.py          # Portais Centrais (Portal Dados Abertos, Base dos Dados, Tesouro Transparente, Portal Transparencia)
tests/
  __init__.py
  conftest.py             # Fixtures compartilhadas (mock HTTP, sample DataFrames)
  test_client.py
  test_parsers.py
  sources/
    test_ibge.py
    test_bcb.py
    test_cgu.py
    ...
examples/
  quickstart.py           # Exemplo minimo de uso
  cruzamento_licitacoes_sancoes.py  # Receita de cruzamento adaptada
```

### Classe Base Source

Toda fonte implementa esta interface:

```python
from abc import ABC, abstractmethod
import pandas as pd
from brazilvisible._client import BVClient
from brazilvisible._types import BVResponse

class Source(ABC):
    """Classe base para todas as fontes de dados."""

    def __init__(self, client: BVClient | None = None):
        self._client = client or BVClient()

    @property
    @abstractmethod
    def name(self) -> str:
        """Nome legivel da fonte (ex: 'IBGE Agregados')."""
        ...

    @property
    @abstractmethod
    def base_url(self) -> str:
        """URL base da API/fonte."""
        ...

    @property
    def auth_required(self) -> bool:
        """Se a fonte exige autenticacao. Default: False."""
        return False
```

### Cliente HTTP

```python
import httpx

class BVClient:
    """Cliente HTTP compartilhado com retry, rate limiting e headers padrao."""

    DEFAULT_HEADERS = {
        "User-Agent": "BrazilVisibleSDK/0.1 (https://brazilvisible.org)",
        "Accept": "application/json, text/csv, */*",
    }

    def __init__(
        self,
        timeout: float = 30.0,
        max_retries: int = 3,
        api_keys: dict[str, str] | None = None,
    ):
        ...
```

A chave `api_keys` e um dict de `{source_name: key}`, ex: `{"cgu": "abc123"}`. Configuravel tambem via env vars: `BV_CGU_API_KEY`, `BV_GOV_BR_TOKEN`, etc.

---

## Mapeamento de APIs por Padrao de Acesso

### REST APIs (41 fontes) — Fase 1 Priority

Estas sao wrappers HTTP diretos. A resposta ja vem em JSON, basta parsear.

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

O SDK baixa o arquivo, descompacta, e retorna DataFrame.

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
- Requer: ftplib + pysus/read-dbc para converter DBC -> DataFrame

### Geoespacial (8 fontes) — Fase 3

- INCRA, CPRM, INDE, INPE Satelite — WMS/WFS/Shapefile/GeoTIFF
- Requer: geopandas, fiona (extras opcionais)

### Web-Only sem API (3 fontes) — Fase 3 ou skip

- TabNet DATASUS, Power BI MTE — sem API programatica direta
- Considerar scraping ou marcar como "nao suportado no SDK"

---

## Fases de Implementacao

### Fase 1 — REST APIs (prioridade maxima)

**Objetivo**: SDK funcional com as 41 REST APIs mais uteis.

**Entregaveis**:
1. `_client.py` — Cliente HTTP com httpx, retry, timeout, rate limiting
2. `_types.py` — BVResponse, paginacao
3. `_exceptions.py` — Hierarquia de erros
4. Modulos de source: `ibge.py`, `bcb.py`, `cgu.py`, `tesouro.py`, `ipea.py`, `cnj.py`
5. Testes unitarios com respostas mockadas (httpx + respx ou pytest-httpx)
6. `examples/quickstart.py`

**Interface alvo**:
```python
from brazilvisible import ibge, bcb, cgu

# IBGE — series agregadas
pop = ibge.agregados(tabela=1301, periodos="2022", localidades="N1")

# Banco Central — series temporais SGS
selic = bcb.sgs(serie=11, inicio="2024-01-01", fim="2024-12-31")
ipca = bcb.sgs(serie=433)

# CGU Portal da Transparencia (requer API key)
from brazilvisible import configure
configure(api_keys={"cgu": "sua-chave-aqui"})
# ou: export BV_CGU_API_KEY=sua-chave-aqui

contratos = cgu.contratos(orgao="25000", ano=2024)
sancionadas = cgu.ceis()
servidores = cgu.servidores(orgao="25000")
```

**Criterios de pronto**:
- [ ] `pip install brazilvisible` funciona
- [ ] Pelo menos 6 modulos de fonte funcionais (ibge, bcb, cgu, tesouro, ipea, cnj)
- [ ] Tipagem completa (mypy strict passa)
- [ ] Testes com cobertura >80%
- [ ] Documentacao basica no README

### Fase 2 — Download Sources

**Objetivo**: Adicionar fontes que dependem de download CSV/ZIP.

**Entregaveis**:
1. `_download.py` — Download com progress, resume, descompressao ZIP/GZ
2. `_cache.py` — Cache local de downloads (evitar re-download)
3. Modulos: `tse.py`, `receita.py`, `inep.py`, `trabalho.py`, `previdencia.py`, `mercado.py`, `reguladoras.py`

**Interface alvo**:
```python
from brazilvisible import tse, receita

# TSE — candidaturas (baixa ZIP, descompacta, retorna DataFrame)
candidatos = tse.candidaturas(ano=2022, estado="SP")

# Receita Federal — CNPJ (arquivo grande, cache local)
empresa = receita.cnpj("12345678000100")
socios = receita.qsa(cnpj="12345678000100")
```

**Desafios**:
- Arquivos da Receita Federal sao enormes (>1GB compactado, ~30GB descompactado)
- Precisa de estrategia de cache e busca incremental
- Download com progress bar (tqdm ou rich)

### Fase 3 — Fontes Especializadas

**Objetivo**: DATASUS (FTP/DBC), geoespacial (WMS/WFS), e integracao com health check.

**Entregaveis**:
1. `datasus.py` — acesso FTP + conversao DBC->DataFrame
2. `geo.py` — WMS/WFS com geopandas (extra opcional: `pip install brazilvisible[geo]`)
3. Integracao com `health.json` do Brazil Visible para status em tempo real

**Extras opcionais (pyproject.toml)**:
```toml
[project.optional-dependencies]
geo = ["geopandas>=0.14", "fiona>=1.9"]
datasus = ["pysus>=0.2"]
all = ["brazilvisible[geo,datasus]"]
```

---

## Decisoes Tecnicas

### Dependencias Core
- **httpx** — HTTP client async-ready (nao requests, que e sincrono-only)
- **pandas** — DataFrames (dependencia principal)
- **tenacity** — Retry com backoff (mais flexivel que httpx retry nativo)

### Dependencias Opcionais
- **geopandas** + **fiona** — para fontes geoespaciais (extra `[geo]`)
- **pysus** — para DATASUS DBC (extra `[datasus]`)
- **tqdm** ou **rich** — progress bars para downloads grandes (extra `[cli]`)

### Versionamento
- SemVer (0.x enquanto a API nao estabilizar)
- Changelog com conventional commits

### Testes
- **pytest** + **respx** (mock HTTP para httpx)
- Testes unitarios: respostas mockadas, sem rede
- Testes de integracao (marcados `@pytest.mark.integration`): chamadas reais, opcionais em CI

### CI/CD
- GitHub Actions: lint (ruff), type check (mypy), test (pytest), build
- Publish no PyPI via trusted publishers

### Packaging
- **hatchling** como build backend (moderno, rapido)
- src layout (`src/brazilvisible/`)
- Python >=3.10

---

## Relacao com Brazil Visible (site)

O SDK e o site sao projetos complementares:

| Aspecto | Site (brazil-visible) | SDK (brazil-visible-sdk) |
|---------|----------------------|-------------------------|
| **Linguagem** | TypeScript/Next.js | Python |
| **Proposito** | Documentacao para humanos | Acesso programatico |
| **Dados** | Frontmatter YAML (92 fontes) | Codigo que consome as fontes |
| **Health check** | Gera `health.json` a cada 6h | Consome `health.json` para status |
| **Publico** | Navegadores web | Desenvolvedores/scripts |

O frontmatter do site (`url_base`, `formato_dados`, `campos_chave`, `tipo_acesso`, `autenticacao`) e a "especificacao" que o SDK implementa. Mudancas no site devem ser refletidas no SDK e vice-versa.

---

## Convencoes

- **Lingua do codigo**: Ingles (nomes de funcoes, variaveis, docstrings)
- **Lingua da documentacao publica**: PT-BR (README, exemplos, mensagens de erro para usuario)
- **Commits**: Conventional commits em ingles (`feat:`, `fix:`, `docs:`, `test:`)
- **Branch**: `main` = releases, `develop` = desenvolvimento
- **Code style**: Ruff (linter + formatter), 88 cols, double quotes
- **Docstrings**: Google style
- **Type hints**: Obrigatorios em toda funcao publica

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
| `geo` | IBGE Geo, CPRM, INCRA, INDE, INPE | WMS/WFS/Shapefile | Nao |
| `diarios` | DOU, DOEs | REST/Download | Nao |
| `governamentais` | CADIN, SIAPE, SIORG | REST | Varia |
| `seguranca` | SINESP | REST | Nao |
| `outros` | ANS, ANTAQ, ANCINE | REST/Download | Nao |
| `portais` | Portal Dados Abertos, Base dos Dados, Tesouro Transparente, Portal Transparencia | REST | Nao |
