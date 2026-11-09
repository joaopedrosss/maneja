// Agente de manejo (versão de demonstração).
// Roda no navegador com regras simples sobre NDVI, clima e lotação: decide quais
// piquetes precisam ser esvaziados e para onde o rebanho deve ir.

import { CHUVA_FORTE_MM, resumoClima } from "./clima";
import { dataComDia, decimal, diasEntre } from "./datas";
import { confiancaDaLeitura, motivoConfianca, ultimaLeitura } from "./ndvi";
import { totalAnimais } from "./rebanho";
import { NDVI_MINIMO_DESTINO, validarMovimento } from "./regras";
import type { Alerta, LeituraNdvi, Lotacao, Movimentacao, Piquete, PlanoManejo, PrevisaoClima } from "./tipos";

export interface EntradaAgente {
  piquetes: Piquete[];
  ndvi: LeituraNdvi[];
  clima: PrevisaoClima;
  lotacao: Lotacao[];
  historico: Movimentacao[];
}

const HORIZONTE_DIAS = 7;
const NDVI_SAIDA = 0.35; // abaixo disto o gado precisa sair
const NDVI_PASSANDO = 0.8; // acima disto o capim está passando do ponto
const NDVI_FALTA = 0.3; // abaixo disto falta capim
const SEMANA_SECA_MM = 5; // chuva total da semana abaixo disto
const RECUSA_VALE_DIAS = 7; // uma rota recusada não volta a ser sugerida neste prazo

let sequencia = 0;
function novoId(prefixo: string): string {
  sequencia += 1;
  return `${prefixo}-${Date.now().toString(36)}-${sequencia}`;
}

export function gerarRecomendacao(
  { piquetes, ndvi, clima, lotacao, historico }: EntradaAgente,
  hoje: string,
  agora = new Date(),
): PlanoManejo {
  // PONTO DE TROCA: quando houver backend, tudo o que decide destinos e alertas aqui
  // vira uma chamada à API, que monta o contexto e consulta o Gemini. A resposta deve
  // continuar passando por validarMovimento (regras.ts) antes de chegar à tela.
  const ocupacao = lotacao.filter((l) => totalAnimais(l) > 0);
  const leitura = (id: string) => ultimaLeitura(ndvi, id, hoje);
  const valor = (id: string) => leitura(id)?.valor ?? null;
  const nome = (id: string) => piquetes.find((p) => p.id === id)!.nome;
  const conf = (id: string) => ({
    confianca: confiancaDaLeitura(leitura(id), hoje),
    motivo_confianca: motivoConfianca(leitura(id), hoje),
  });
  const recusadaHaPouco = (origem: string, destino: string) =>
    historico.some(
      (m) =>
        m.status === "recusada" &&
        m.piquete_origem_id === origem &&
        m.piquete_destino_id === destino &&
        diasEntre(m.data, hoje) <= RECUSA_VALE_DIAS,
    );

  // não se move gado em dia de chuva forte: usa o primeiro dia sem ela
  const dataManejo = clima.dias.find((d) => d.chuva_mm < CHUVA_FORTE_MM)?.data ?? hoje;
  const avisoChuva = dataManejo === hoje ? "" : ` Adiado para ${dataComDia(dataManejo)} por causa da chuva forte.`;

  const movimentacoes: Movimentacao[] = [];
  const alertas: Alerta[] = [];
  // cada destino escolhido fica reservado para os próximos da fila
  let lotacaoPrevista = ocupacao;

  // os piquetes com NDVI mais baixo escolhem primeiro
  const fila = [...ocupacao].sort((a, b) => (valor(a.piquete_id) ?? 1) - (valor(b.piquete_id) ?? 1));

  for (const l of fila) {
    const origem = l.piquete_id;
    const ndviOrigem = valor(origem);
    if (ndviOrigem === null || ndviOrigem >= NDVI_SAIDA) continue;

    const rebanho = { bois: l.bois, vacas: l.vacas, bezerros: l.bezerros };
    const motivoSaida = `${nome(origem)} está com NDVI ${decimal(ndviOrigem, 2)}, abaixo de ${decimal(NDVI_SAIDA, 2)}`;
    const candidatos = piquetes
      .filter((p) => p.id !== origem && !lotacaoPrevista.some((x) => x.piquete_id === p.id) && valor(p.id) !== null)
      .sort((a, b) => valor(b.id)! - valor(a.id)!);

    // o candidato com NDVI mais alto que passar nas regras; os reprovados viram explicação
    const descartes: string[] = [];
    let destino: Piquete | undefined;
    for (const candidato of candidatos) {
      if (recusadaHaPouco(origem, candidato.id)) {
        descartes.push(`${candidato.nome} foi recusado há pouco`);
        continue;
      }
      const falhas = validarMovimento(candidato.id, rebanho, { piquetes, ndvi, lotacao: lotacaoPrevista, hoje });
      if (falhas.length === 0) {
        destino = candidato;
        break;
      }
      descartes.push(...falhas);
    }
    const explicacao = descartes.length > 0 ? ` Descartado: ${descartes.join("; ")}.` : "";

    if (!destino) {
      alertas.push({
        tipo: "sem_piquete_apto",
        data: hoje,
        texto: `${motivoSaida}, mas nenhum piquete livre pode receber o rebanho. Considere suplementar ou reduzir a lotação.${explicacao}`,
        confianca: "media",
        motivo_confianca: "leituras de NDVI dos piquetes livres",
      });
      continue;
    }

    const ndviDestino = valor(destino.id)!;
    movimentacoes.push({
      id: novoId("mov"),
      data: dataManejo,
      rebanho,
      piquete_origem_id: origem,
      piquete_origem_nome: nome(origem),
      piquete_destino_id: destino.id,
      piquete_destino_nome: destino.nome,
      ndvi_origem: ndviOrigem,
      ndvi_destino: ndviDestino,
      motivo: `${motivoSaida}. ${destino.nome} é o piquete livre apto com NDVI mais alto: ${decimal(ndviDestino, 2)}.${explicacao}${avisoChuva}`,
      confianca: confiancaDaLeitura(leitura(destino.id), hoje),
      motivo_confianca: `${motivoConfianca(leitura(destino.id), hoje)} no destino`,
      status: "pendente",
      destino_trocado: false,
    });
    lotacaoPrevista = [...lotacaoPrevista, { ...l, piquete_id: destino.id }];
  }

  // ---------- alertas sobre os piquetes ----------
  const ocupados = new Set(ocupacao.map((l) => l.piquete_id));
  const destinos = new Set(movimentacoes.map((m) => m.piquete_destino_id));
  for (const p of piquetes) {
    const v = valor(p.id);
    if (v === null) continue;
    if (v < NDVI_FALTA) {
      alertas.push({ tipo: "falta_capim", data: hoje, texto: `Falta capim em ${p.nome}: NDVI ${decimal(v, 2)}.`, ...conf(p.id) });
    }
    if (ocupados.has(p.id) || destinos.has(p.id)) continue;
    if (v >= NDVI_PASSANDO) {
      alertas.push({ tipo: "passando_do_ponto", data: hoje, texto: `${p.nome} está passando do ponto: NDVI ${decimal(v, 2)}.`, ...conf(p.id) });
    } else if (v >= NDVI_MINIMO_DESTINO) {
      alertas.push({ tipo: "pronto_para_pastejo", data: hoje, texto: `${p.nome} está pronto para pastejo: NDVI ${decimal(v, 2)}.`, ...conf(p.id) });
    }
  }

  // ---------- alertas de clima ----------
  const semana = resumoClima(clima);
  const confClima = { confianca: "media" as const, motivo_confianca: "previsão do tempo de 7 dias" };
  for (const d of semana.dias_chuva_forte) {
    alertas.push({
      tipo: "alerta_clima",
      data: d.data,
      texto: `Chuva forte prevista: ${decimal(d.chuva_mm, 0)} mm. Evite mover o gado neste dia.`,
      ...confClima,
    });
  }
  if (semana.chuva_total_mm < SEMANA_SECA_MM) {
    alertas.push({
      tipo: "alerta_clima",
      data: hoje,
      texto: `Semana seca: só ${decimal(semana.chuva_total_mm, 0)} mm previstos. O pasto deve rebrotar devagar.`,
      ...confClima,
    });
  }

  alertas.sort((a, b) => a.data.localeCompare(b.data));

  return {
    id: novoId("plano"),
    fazenda_id: clima.fazenda_id,
    data_geracao: agora.toISOString(),
    data_inicio: hoje,
    horizonte_dias: HORIZONTE_DIAS,
    movimentacoes,
    alertas,
  };
}
