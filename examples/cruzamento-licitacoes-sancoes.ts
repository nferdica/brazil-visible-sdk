/**
 * Brazil Visible SDK — Cruzamento: licitacoes x sancoes
 *
 * Identifica empresas sancionadas (CEIS) que possuem contratos ativos
 * com o governo federal. Util para fiscalizacao e jornalismo de dados.
 *
 * Requisitos:
 *   - API key da CGU: https://portaldatransparencia.gov.br/api-de-dados
 *   - Defina a env var: export BV_CGU_API_KEY=sua-chave-aqui
 *
 * Execute com: npx tsx examples/cruzamento-licitacoes-sancoes.ts
 */

import { cgu, configure } from "brazil-visible";

async function main() {
  // Configura chave via env var (ou passe diretamente)
  const apiKey = process.env.BV_CGU_API_KEY;
  if (!apiKey) {
    console.error("Defina BV_CGU_API_KEY para executar este exemplo.");
    console.error("Obtenha sua chave em: https://portaldatransparencia.gov.br/api-de-dados");
    process.exit(1);
  }

  configure({ apiKeys: { cgu: apiKey } });

  console.log("Buscando empresas sancionadas (CEIS)...");
  const sancionadas = await cgu.ceis({ pagina: 1 });
  console.log(`  ${sancionadas.length} registros encontrados`);

  console.log("Buscando contratos federais...");
  const contratos = await cgu.contratos({ pagina: 1 });
  console.log(`  ${contratos.length} contratos encontrados`);

  // Cruzamento: CNPJs sancionados presentes em contratos
  const cnpjsSancionados = new Set(
    sancionadas.map((s) => s.cnpj).filter(Boolean),
  );

  const irregulares = contratos.filter(
    (c) => c.cnpj && cnpjsSancionados.has(c.cnpj),
  );

  console.log("\n--- Resultado do cruzamento ---");
  console.log(`Empresas sancionadas: ${cnpjsSancionados.size}`);
  console.log(`Contratos analisados: ${contratos.length}`);
  console.log(`Contratos com empresas sancionadas: ${irregulares.length}`);

  if (irregulares.length > 0) {
    console.log("\nContratos irregulares encontrados:");
    for (const contrato of irregulares.slice(0, 10)) {
      console.log(`  CNPJ: ${contrato.cnpj} — ${contrato.objeto ?? "sem descricao"}`);
    }
    if (irregulares.length > 10) {
      console.log(`  ... e mais ${irregulares.length - 10} contratos`);
    }
  } else {
    console.log("\nNenhuma irregularidade encontrada nesta amostra.");
    console.log("(Nota: esta e apenas a primeira pagina de resultados.)");
  }
}

main().catch(console.error);
