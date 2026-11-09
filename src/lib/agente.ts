// Agente de manejo (versão de demonstração).
// Roda no navegador com regras simples sobre a leitura de NDVI mais recente de
// cada piquete: decide quais lotes precisam sair e para onde devem ir.

import { decimal } from "./datas";
import { confiancaDaLeitura, motivoConfianca, ultimaLeitura } from "./ndvi";
import type { Alerta, Fazenda, LeituraNdvi, Lote, Movimentacao, Piquete, PlanoManejo } from "./tipos";

export interface Base {
  fazendas: Fazenda[];
  piquetes: Piquete[];
  lotes: Lote[];
  ndvi: LeituraNdvi[];
}

const HORIZONTE_DIAS = 7;
const NDVI_SAIDA = 0.35; // abaixo disto o gado precisa sair
const NDVI_ENTRADA = 0.5; // a partir disto o piquete pode receber gado
const NDVI_PASSANDO = 0.8; // acima disto o capim está passando do ponto
const NDVI_FALTA = 0.3; // abaixo disto falta capim

let sequencia = 0;
function novoId(prefixo: string): string {
  sequencia += 1;
  return `${prefixo}-${Date.now().toString(36)}-${sequencia}`;
}

export function gerarPlano(base: Base, fazendaId: string, hoje: string, agora = new Date()): PlanoManejo {
  const piquetes = base.piquetes.filter((p) => p.fazenda_id === fazendaId);
  const lotes = base.lotes.filter((l) => l.fazenda_id === fazendaId);
  const leitura = (id: string) => ultimaLeitura(base.ndvi, id, hoje);
  const valor = (id: string | null) => (id === null ? null : leitura(id)?.valor ?? null);
  const conf = (id: string) => ({
    confianca: confiancaDaLeitura(leitura(id), hoje),
    motivo_confianca: motivoConfianca(leitura(id), hoje),
  });

  const ocupados = new Set(lotes.map((l) => l.piquete_atual_id));
  const movimentacoes: Movimentacao[] = [];
  const alertas: Alerta[] = [];
  const nome = (id: string) => piquetes.find((p) => p.id === id)!.nome;

  // lotes nos piquetes com NDVI mais baixo escolhem primeiro
  const fila = [...lotes].sort((a, b) => (valor(a.piquete_atual_id) ?? -1) - (valor(b.piquete_atual_id) ?? -1));

  for (const lote of fila) {
    const origem = lote.piquete_atual_id;
    const ndviOrigem = valor(origem);
    if (origem !== null && (ndviOrigem === null || ndviOrigem >= NDVI_SAIDA)) continue;

    const motivoSaida = origem === null
      ? `${lote.nome} está sem piquete`
      : `${nome(origem)} está com NDVI ${decimal(ndviOrigem!, 2)}, abaixo de ${decimal(NDVI_SAIDA, 2)}`;

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
      data: hoje,
      lote_id: lote.id,
      lote_nome: lote.nome,
      n_animais: lote.n_animais,
      piquete_origem_id: origem,
      piquete_origem_nome: origem ? nome(origem) : null,
      piquete_destino_id: destino.id,
      piquete_destino_nome: destino.nome,
      ndvi_origem: ndviOrigem,
      ndvi_destino: ndviDestino,
      motivo: `${motivoSaida}. ${destino.nome} é o piquete livre com NDVI mais alto: ${decimal(ndviDestino, 2)}.`,
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
