# Brazil Visible SDK

SDK Python unificado para acesso a **93+ fontes de dados publicos brasileiros**.

Uma interface programatica unica sobre APIs REST, downloads CSV, FTP e portais do governo federal — feito para jornalistas de dados, pesquisadores e desenvolvedores civicos.

## Instalacao

```bash
pip install brazilvisible
```

Extras opcionais:

```bash
pip install brazilvisible[geo]      # geopandas para dados geoespaciais
pip install brazilvisible[datasus]  # pysus para arquivos DBC do DATASUS
pip install brazilvisible[all]      # tudo
```

## Uso rapido

```python
from brazilvisible import bcb, ibge

# Banco Central — serie temporal SGS
selic = bcb.sgs(serie=11, inicio="2024-01-01", fim="2024-12-31")
print(selic.head())

# IBGE — dados agregados
populacao = ibge.agregados(tabela=1301, periodos="2022", localidades="N1")
print(populacao.head())
```

### Com autenticacao (CGU)

```python
from brazilvisible import cgu, configure

configure(api_keys={"cgu": "sua-chave-aqui"})
# ou defina a env var: export BV_CGU_API_KEY=sua-chave-aqui

contratos = cgu.contratos(orgao="25000", ano=2024)
sancionadas = cgu.ceis()
```

### Cruzamento de dados

```python
from brazilvisible import cgu

# Empresas sancionadas que ainda vencem licitacoes
sancionadas = cgu.ceis()
contratos = cgu.contratos(ano=2024)
irregulares = sancionadas.merge(contratos, on="cnpj")
print(f"{len(irregulares)} contratos com empresas sancionadas")
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
pip install -e ".[dev]"
pytest
ruff check src/ tests/
mypy src/
```

## Projeto irmao

Este SDK e a camada programatica do [Brazil Visible](https://brazilvisible.org) — catalogo de documentacao com 93+ fontes de dados publicos brasileiros.

## Licenca

MIT
