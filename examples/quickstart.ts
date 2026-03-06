/**
 * Brazil Visible SDK — Exemplo rápido de uso
 *
 * Execute com: npx tsx examples/quickstart.ts
 */

import { bcb, cgu, configure, ibge, ipea, tesouro } from "brazilvisible";

async function main() {
  // ── Banco Central ────────────────────────────────────────────
  // Taxa Selic diária (últimos 5 dias úteis)
  const selic = await bcb.sgs({
    serie: 11,
    dataInicial: "2024-01-01",
    dataFinal: "2024-01-05",
  });
  console.log("Selic:", selic);

  // Expectativas de mercado (IPCA)
  const expectativas = await bcb.expectativas({
    indicador: "IPCA",
    top: 3,
  });
  console.log("Expectativas IPCA:", expectativas);

  // ── IBGE ─────────────────────────────────────────────────────
  // Estados brasileiros
  const estados = await ibge.estados();
  console.log(`Total de estados: ${estados.length}`);

  // Municípios de São Paulo
  const municipiosSP = await ibge.municipios({ uf: 35 });
  console.log(`Municípios em SP: ${municipiosSP.length}`);

  // População estimada do Brasil
  const populacao = await ibge.agregados({
    tabela: 6579,
    periodos: "-6",
    variaveis: [9324],
    localidades: "N1",
  });
  console.log("População:", populacao[0]?.resultados[0]?.series[0]?.serie);

  // Ranking de nomes mais comuns
  const nomes = await ibge.nomesRanking();
  console.log("Nomes mais comuns:", nomes[0]?.res.slice(0, 5));

  // ── Tesouro Nacional ─────────────────────────────────────────
  // Entes federativos (estados)
  const entes = await tesouro.entes({ esfera: "E" });
  console.log(`Entes estaduais: ${entes.length}`);

  // ── IPEA ─────────────────────────────────────────────────────
  // Série temporal do IPCA (últimos 5 registros)
  const ipca = await ipea.series({
    codigo: "PRECOS12_IPCA12",
    top: 5,
    orderBy: "VALDATA desc",
  });
  console.log("IPCA (IPEA):", ipca);

  // ── CGU (requer API key) ─────────────────────────────────────
  // Descomente e configure sua chave para usar:
  //
  // configure({ apiKeys: { cgu: "sua-chave-aqui" } });
  // const sancionadas = await cgu.ceis();
  // console.log("Empresas sancionadas:", sancionadas.length);
  //
  // const contratos = await cgu.contratos({ codigoOrgao: "25000" });
  // console.log("Contratos:", contratos.length);
}

main().catch(console.error);
