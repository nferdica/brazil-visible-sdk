# Brazil Visible SDK — Claude Code Instructions

> Para visao completa do projeto, arquitetura e plano de implementacao, consulte [AGENTS.md](./AGENTS.md).

## Project Overview
Python SDK for unified access to 93+ Brazilian public data sources. Wraps REST APIs, CSV downloads, FTP archives and geospatial services behind a single `import brazilvisible` interface.

## Key Commands
- `pip install -e ".[dev]"` — install in development mode
- `pytest` — run tests
- `pytest -m "not integration"` — run only unit tests (no network)
- `ruff check src/ tests/` — lint
- `ruff format src/ tests/` — format
- `mypy src/` — type check (strict mode)

## Tech Stack
- **Language**: Python >=3.10
- **HTTP**: httpx (async-ready)
- **Data**: pandas DataFrames
- **Retry**: tenacity
- **Build**: hatchling (src layout)
- **Test**: pytest + respx (httpx mocking)
- **Lint/Format**: ruff
- **Types**: mypy (strict)
- **Optional**: geopandas (geo), pysus (datasus)

## Project Structure
- `src/brazilvisible/` — main package
- `src/brazilvisible/sources/` — one module per source group (ibge.py, bcb.py, cgu.py, etc.)
- `src/brazilvisible/_client.py` — shared HTTP client
- `src/brazilvisible/_types.py` — shared types
- `src/brazilvisible/_exceptions.py` — error hierarchy
- `src/brazilvisible/_download.py` — download + decompression utilities
- `src/brazilvisible/_cache.py` — local response/download cache
- `src/brazilvisible/_parsers.py` — format parsers (CSV, JSON, XML)
- `tests/` — pytest test suite
- `examples/` — usage examples

## Conventions
- Code language: English (function names, variables, docstrings)
- Public docs language: PT-BR (README, examples, user-facing error messages)
- Commits: conventional commits in English (feat:, fix:, docs:, test:)
- Branches: `main` = releases, `develop` = development
- Code style: ruff, 88 cols, double quotes
- Docstrings: Google style
- Type hints: required on all public functions
- Every source module must implement the `Source` abstract base class from `_base.py`
- All HTTP responses must return `pandas.DataFrame` by default
- Tests must use mocked HTTP responses (respx), never real network calls in unit tests
- Integration tests marked with `@pytest.mark.integration`

## Adding a New Source
1. Create `src/brazilvisible/sources/<name>.py`
2. Implement `Source` subclass with typed methods
3. Re-export from `src/brazilvisible/__init__.py`
4. Add tests in `tests/sources/test_<name>.py`
5. Add example in `examples/`
6. Run: `ruff check`, `mypy src/`, `pytest`
7. Commit: `feat: add <source> module`
