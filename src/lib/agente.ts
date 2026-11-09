// Agente de manejo (versão de demonstração).
// Roda no navegador com regras simples sobre a leitura de NDVI mais recente de
// cada piquete e a previsão do tempo: decide quais piquetes precisam ser esvaziados e para onde devem ir.

import { CHUVA_FORTE_MM, resumoClima } from "./clima";
import { dataComDia, decimal } from "./datas";
import { confiancaDaLeitura, motivoConfianca, ultimaLeitura } from "./ndvi";
import { totalAnimais } from "./rebanho";
import type { Alerta, Fazenda, LeituraNdvi, Lotacao, Movimentacao, Piquete, PlanoManejo, PrevisaoClima } from "./tipos";

export interface Base {
  fazendas: Fazenda[];
  piquetes: Piquete[];
  lotacao: Lotacao[];
  ndvi: LeituraNdvi[];
  clima: PrevisaoClima;
  historico: Movimentacao[];
}

const HORIZONTE_DIAS = 7;
const NDVI_SAIDA = 0.35; // abaixo disto o gado precisa sair
const NDVI_ENTRADA = 0.5; // a partir disto o piquete pode receber gado
const NDVI_PASSANDO = 0.8; // acima disto o capim está passando do ponto
const NDVI_FALTA = 0.3; // abaixo disto falta capim
const SEMANA_SECA_MM = 5; // chuva total da semana abaixo disto

let sequencia = 0;
function novoId(prefixo: string): string {
  sequencia += 1;
  return `${prefixo}-${Date.now().toString(36)}-${sequencia}`;
}

export function gerarPlano(base: Base, fazendaId: string, hoje: string, agora = new Date()): PlanoManejo {
  const piquetes = base.piquetes.filter((p) => p.fazenda_id === fazendaId);
  const lotacao = base.lotacao.filter((l) => l.fazenda_id === fazendaId && totalAnimais(l) > 0);
  const leitura = (id: string) => ultimaLeitura(base.ndvi, id, hoje);
  const valor = (id: string) => leitura(id)?.valor ?? null;
  const conf = (id: string) => ({
    confianca: confiancaDaLeitura(leitura(id), hoje),
    motivo_confianca: motivoConfianca(leitura(id), hoje),
  });

  const ocupados = new Set(lotacao.map((l) => l.piquete_id));
  const movimentacoes: Movimentacao[] = [];
  const alertas: Alerta[] = [];
  const nome = (id: string) => piquetes.find((p) => p.id === id)!.nome;

  // não se move gado em dia de chuva forte: usa o primeiro dia sem ela
  const dataManejo = base.clima.dias.find((d) => d.chuva_mm < CHUVA_FORTE_MM)?.data ?? hoje;
  const avisoChuva = dataManejo === hoje ? "" : ` Adiado para ${dataComDia(dataManejo)} por causa da chuva forte.`;

  // os piquetes com NDVI mais baixo escolhem primeiro
  const fila = [...lotacao].sort((a, b) => (valor(a.piquete_id) ?? 1) - (valor(b.piquete_id) ?? 1));

  for (const l of fila) {
    const origem = l.piquete_id;
    const ndviOrigem = valor(origem);
    if (ndviOrigem === null || ndviOrigem >= NDVI_SAIDA) continue;

    const motivoSaida = `${nome(origem)} está com NDVI ${decimal(ndviOrigem, 2)}, abaixo de ${decimal(NDVI_SAIDA, 2)}`;

    const destino = piquetes
      .filter((p) => !ocupados.has(p.id) && (valor(p.id) ?? 0) >= NDVI_ENTRADA)
      .sort((a, b) => valor(b.id)! - valor(a.id)!)[0];

    if (!destino) {
      alertas.push({
        tipo: "sem_piquete_apto",
        data: hoje,
        texto: `${motivoSaida}, mas nenhum piquete livre tem NDVI suficiente. Considere suplementar ou reduzir a lotação.`,
        confianca: "media",
        motivo_confianca: "leituras de NDVI dos piquetes livres",
      });
      continue;
    }

    const ndviDestino = valor(destino.id)!;
    movimentacoes.push({
      id: novoId("mov"),
      data: dataManejo,
      rebanho: { bois: l.bois, vacas: l.vacas, bezerros: l.bezerros },
      piquete_origem_id: origem,
      piquete_origem_nome: nome(origem),
      piquete_destino_id: destino.id,
      piquete_destino_nome: destino.nome,
      ndvi_origem: ndviOrigem,
      ndvi_destino: ndviDestino,
      motivo: `${motivoSaida}. ${destino.nome} é o piquete livre com NDVI mais alto: ${decimal(ndviDestino, 2)}.${avisoChuva}`,
      ...conf(destino.id),
      motivo_confianca: `${motivoConfianca(leitura(destino.id), hoje)} no destino`,
      status: "pendente",
      destino_trocado: false,
    });
    ocupados.add(destino.id);
  }

  const destinos = new Set(movimentacoes.map((m) => m.piquete_destino_id));
  for (const p of piquetes) {
    const ndvi = valor(p.id);
    if (ndvi === null) continue;
    if (ndvi < NDVI_FALTA) {
      alertas.push({ tipo: "falta_capim", data: hoje, texto: `Falta capim em ${p.nome}: NDVI ${decimal(ndvi, 2)}.`, ...conf(p.id) });
    }
    if (ocupados.has(p.id) || destinos.has(p.id)) continue;
    if (ndvi >= NDVI_PASSANDO) {
      alertas.push({ tipo: "passando_do_ponto", data: hoje, texto: `${p.nome} está passando do ponto: NDVI ${decimal(ndvi, 2)}.`, ...conf(p.id) });
    } else if (ndvi >= NDVI_ENTRADA) {
      alertas.push({ tipo: "pronto_para_pastejo", data: hoje, texto: `${p.nome} está pronto para pastejo: NDVI ${decimal(ndvi, 2)}.`, ...conf(p.id) });
    }
  }

  const clima = resumoClima(base.clima);
  const confClima = { confianca: "media" as const, motivo_confianca: "previsão do tempo de 7 dias" };
  for (const d of clima.dias_chuva_forte) {
    alertas.push({
      tipo: "alerta_clima",
      data: d.data,
      texto: `Chuva forte prevista: ${decimal(d.chuva_mm, 0)} mm. Evite mover o gado neste dia.`,
      ...confClima,
    });
  }
  if (clima.chuva_total_mm < SEMANA_SECA_MM) {
    alertas.push({
      tipo: "alerta_clima",
      data: hoje,
      texto: `Semana seca: só ${decimal(clima.chuva_total_mm, 0)} mm previstos. O pasto deve rebrotar devagar.`,
      ...confClima,
    });
  }

  alertas.sort((a, b) => a.data.localeCompare(b.data));

  return {
    id: novoId("plano"),
    fazenda_id: fazendaId,
    data_geracao: agora.toISOString(),
    data_inicio: hoje,
    horizonte_dias: HORIZONTE_DIAS,
    movimentacoes,
    alertas,
  };
}
