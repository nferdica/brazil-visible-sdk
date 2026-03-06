import { bcb, ibge, ipea, tesouro } from "@brazilvisible/sdk";

async function main() {
  const selic = await bcb.sgs({
    serie: 11,
    dataInicial: "2024-01-01",
    dataFinal: "2024-01-05",
  });
  console.log("Selic:", selic);

  const expectativas = await bcb.expectativas({
    indicador: "IPCA",
    top: 3,
  });
  console.log("Expectativas IPCA:", expectativas);

  const estados = await ibge.estados();
  console.log(`Total de estados: ${estados.length}`);

  const municipiosSP = await ibge.municipios({ uf: 35 });
  console.log(`Municipios em SP: ${municipiosSP.length}`);

  const populacao = await ibge.agregados({
    tabela: 6579,
    periodos: "-6",
    variaveis: [9324],
    localidades: "N1",
  });
  console.log("Populacao:", populacao[0]?.resultados[0]?.series[0]?.serie);

  const nomes = await ibge.nomesRanking();
  console.log("Nomes mais comuns:", nomes[0]?.res.slice(0, 5));

  const entes = await tesouro.entes({ esfera: "E" });
  console.log(`Entes estaduais: ${entes.length}`);

  const ipca = await ipea.series({
    codigo: "PRECOS12_IPCA12",
    top: 5,
    orderBy: "VALDATA desc",
  });
  console.log("IPCA (IPEA):", ipca);
}

main().catch(console.error);
