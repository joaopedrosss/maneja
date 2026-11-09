// Agente de manejo (versão de demonstração).
// Roda no navegador com regras simples: estima a altura do capim a partir da última
// medição, simula os próximos dias e recomenda para onde cada lote deve ir.

import { dataCurta, decimal, diasEntre, haQuanto, somarDias } from "./datas";
import type {
  Alerta,
  Confianca,
  Cultivar,
  Fazenda,
  Lote,
  Medicao,
  Movimentacao,
  PedidoValidacao,
  Piquete,
  PlanoManejo,
  ResumoPiquete,
} from "./tipos";

export interface Base {
  fazendas: Fazenda[];
  cultivares: Cultivar[];
  piquetes: Piquete[];
  lotes: Lote[];
  medicoes: Medicao[];
}

export const KG_POR_UA = 450;
const CONSUMO_CM_POR_UA_HA_DIA = 0.7;
const HORIZONTE_DIAS = 7;
const MEDICAO_VELHA_DIAS = 14;

export function uaDoLote(lote: Pick<Lote, "n_animais" | "peso_medio_kg">): number {
  return (lote.n_animais * lote.peso_medio_kg) / KG_POR_UA;
}

// ---------- modelo de crescimento e consumo ----------

function crescer(altura: number, c: Cultivar): number {
  return altura + c.crescimento_cm_dia * Math.max(0, 1 - altura / c.altura_maxima_cm);
}

function umDia(altura: number, c: Cultivar, areaHa: number, uaNoPiquete: number): number {
  const cresceu = crescer(altura, c);
  if (uaNoPiquete <= 0) return cresceu;
  const consumo = (CONSUMO_CM_POR_UA_HA_DIA * uaNoPiquete) / areaHa;
  // o gado não rapa abaixo de ~40% da altura de saída
  return Math.max(c.altura_saida_cm * 0.4, cresceu - consumo);
}

function projetar(altura: number, c: Cultivar, areaHa: number, ua: number, dias: number): number {
  let h = altura;
  for (let i = 0; i < dias; i++) h = umDia(h, c, areaHa, ua);
  return h;
}

// ---------- consultas ----------

function cultivarDe(base: Base, p: Piquete): Cultivar {
  return base.cultivares.find((c) => c.id === p.cultivar_id)!;
}

function ultimaMedicao(base: Base, piqueteId: string, ate: string, soCampo = false): Medicao | null {
  let melhor: Medicao | null = null;
  for (const m of base.medicoes) {
    if (m.piquete_id !== piqueteId || m.data > ate) continue;
    if (soCampo && m.origem !== "campo") continue;
    if (melhor === null || m.data >= melhor.data) melhor = m;
  }
  return melhor;
}

export function alturaEm(base: Base, p: Piquete, data: string): number | null {
  const m = ultimaMedicao(base, p.id, data);
  if (m === null) return null;
  const c = cultivarDe(base, p);
  const lotesAqui = base.lotes.filter((l) => l.piquete_atual_id === p.id);
  let h = m.altura_cm;
  for (let i = 0; i < diasEntre(m.data, data); i++) {
    const dia = somarDias(m.data, i);
    const ua = lotesAqui
      .filter((l) => l.desde === null || l.desde <= dia)
      .reduce((s, l) => s + uaDoLote(l), 0);
    h = umDia(h, c, p.area_ha, ua);
  }
  return h;
}

function confiancaPelaIdade(dias: number | null): Confianca {
  if (dias === null) return "baixa";
  if (dias <= 7) return "alta";
  if (dias <= MEDICAO_VELHA_DIAS) return "media";
  return "baixa";
}

function motivoConfianca(dias: number | null): string {
  return dias === null ? "sem medição em campo" : `última medição em campo ${haQuanto(dias)}`;
}

export function resumoPiquetes(base: Base, fazendaId: string, hoje: string): ResumoPiquete[] {
  return base.piquetes
    .filter((p) => p.fazenda_id === fazendaId)
    .map((p) => {
      const c = cultivarDe(base, p);
      const lote = base.lotes.find((l) => l.piquete_atual_id === p.id) ?? null;
      const campo = ultimaMedicao(base, p.id, hoje, true);
      const idade = campo ? diasEntre(campo.data, hoje) : null;
      return {
        piquete_id: p.id,
        nome: p.nome,
        cultivar_nome: c.nome,
        area_ha: p.area_ha,
        metodo_pastejo: p.metodo_pastejo,
        situacao: lote ? "ocupado" : "descansando",
        lote_atual_nome: lote?.nome ?? null,
        altura_hoje_cm: alturaEm(base, p, hoje),
        altura_entrada_alvo_cm: c.altura_entrada_cm,
        altura_saida_alvo_cm: c.altura_saida_cm,
        ultima_medicao_campo: campo,
        confianca: confiancaPelaIdade(idade),
        motivo_confianca: motivoConfianca(idade),
      };
    });
}

// ---------- geração do plano ----------

let sequencia = 0;
function novoId(prefixo: string): string {
  sequencia += 1;
  return `${prefixo}-${Date.now().toString(36)}-${sequencia}`;
}

export function gerarPlano(base: Base, fazendaId: string, hoje: string, agora = new Date()): PlanoManejo {
  const piquetes = base.piquetes.filter((p) => p.fazenda_id === fazendaId);
  const lotes = base.lotes.filter((l) => l.fazenda_id === fazendaId);
  const porId = new Map(piquetes.map((p) => [p.id, p]));
  const cultivar = (id: string) => cultivarDe(base, porId.get(id)!);
  const nome = (id: string) => porId.get(id)!.nome;

  const idadeCampo = new Map<string, number | null>(
    piquetes.map((p) => {
      const m = ultimaMedicao(base, p.id, hoje, true);
      return [p.id, m ? diasEntre(m.data, hoje) : null];
    }),
  );

  // estado simulado
  const altura = new Map<string, number>();
  for (const p of piquetes) {
    const h = alturaEm(base, p, hoje);
    if (h !== null) altura.set(p.id, h);
  }
  const ondeEsta = new Map<string, string | null>(lotes.map((l) => [l.id, l.piquete_atual_id]));
  const historicoAltura = new Map<string, number[]>(piquetes.map((p) => [p.id, []]));

  const movimentacoes: Movimentacao[] = [];
  const alertas: Alerta[] = [];
  const jaAlertado = new Set<string>();
  const alertar = (chave: string, alerta: Alerta) => {
    if (jaAlertado.has(chave)) return;
    jaAlertado.add(chave);
    alertas.push(alerta);
  };

  const uaEm = (piqueteId: string) =>
    lotes.filter((l) => ondeEsta.get(l.id) === piqueteId).reduce((s, l) => s + uaDoLote(l), 0);
  const ocupado = (piqueteId: string) => lotes.some((l) => ondeEsta.get(l.id) === piqueteId);

  for (let d = 0; d < HORIZONTE_DIAS; d++) {
    const data = somarDias(hoje, d);
    for (const p of piquetes) historicoAltura.get(p.id)!.push(altura.get(p.id) ?? NaN);


    // lotes mais apertados primeiro
    const fila = [...lotes].sort((a, b) => {
      const folga = (l: Lote) => {
        const pid = ondeEsta.get(l.id);
        if (!pid || !altura.has(pid)) return -Infinity;
        return altura.get(pid)! - cultivar(pid).altura_saida_cm;
      };
      return folga(a) - folga(b);
    });

    for (const lote of fila) {
      const origem = ondeEsta.get(lote.id) ?? null;
      let precisaSair: boolean;
      let motivoSaida: string;

      if (origem === null) {
        precisaSair = true;
        motivoSaida = `${lote.nome} está sem piquete`;
      } else {
        const hOrigem = altura.get(origem);
        if (hOrigem === undefined) continue; // sem medição: não dá para estimar
        const c = cultivar(origem);
        const hAmanha = projetar(hOrigem, c, porId.get(origem)!.area_ha, uaEm(origem), 1);
        precisaSair = hAmanha <= c.altura_saida_cm;
        motivoSaida = `${nome(origem)} está com ${decimal(hOrigem, 0)} cm e chega à altura de saída (${c.altura_saida_cm} cm) até amanhã`;
      }
      if (!precisaSair) continue;

      const candidatos = piquetes
        .filter((p) => p.id !== origem && !ocupado(p.id) && altura.has(p.id))
        .filter((p) => altura.get(p.id)! >= cultivar(p.id).altura_entrada_cm)
        .sort((a, b) => altura.get(b.id)! - altura.get(a.id)!);

      if (candidatos.length === 0) {
        alertar(`apto-${lote.id}`, {
          tipo: "sem_piquete_apto",
          data,
          texto: `${motivoSaida}, mas nenhum piquete está pronto para receber o lote. Considere suplementar ou reduzir a lotação.`,
          confianca: "media",
          motivo_confianca: "estimativa de crescimento dos piquetes em descanso",
        });
        continue;
      }
      const destino = candidatos[0];
      const cDest = cultivar(destino.id);
      const hDest = altura.get(destino.id)!;
      const ua = uaDoLote(lote);
      let dias = 0;
      for (let h = hDest; h > cDest.altura_saida_cm && dias < 60; dias++) {
        h = umDia(h, cDest, destino.area_ha, ua);
      }
      const idade = idadeCampo.get(destino.id) ?? null;
      movimentacoes.push({
        id: novoId("mov"),
        data,
        lote_id: lote.id,
        lote_nome: lote.nome,
        n_animais: lote.n_animais,
        piquete_origem_id: origem,
        piquete_origem_nome: origem ? nome(origem) : null,
        piquete_destino_id: destino.id,
        piquete_destino_nome: destino.nome,
        altura_destino_cm: hDest,
        altura_entrada_alvo_cm: cDest.altura_entrada_cm,
        dias_previstos: Math.max(1, dias),
        motivo: `${motivoSaida}. ${destino.nome} é o piquete com mais capim disponível: ${decimal(hDest, 0)} cm (entrada ${cDest.altura_entrada_cm} cm).`,
        confianca: confiancaPelaIdade(idade),
        motivo_confianca: `${motivoConfianca(idade)} no destino`,
        status: "pendente",
        destino_trocado: false,
      });
      ondeEsta.set(lote.id, destino.id);
    }

    // avança um dia
    for (const p of piquetes) {
      const h = altura.get(p.id);
      if (h !== undefined) altura.set(p.id, umDia(h, cultivar(p.id), p.area_ha, uaEm(p.id)));
    }
  }

  // ---------- alertas sobre os piquetes ----------
  const destinos = new Set(movimentacoes.map((m) => m.piquete_destino_id));
  const ocupadosHoje = new Set(lotes.map((l) => l.piquete_atual_id).filter(Boolean));

  for (const p of piquetes) {
    const c = cultivar(p.id);
    const serie = historicoAltura.get(p.id)!;
    const idade = idadeCampo.get(p.id) ?? null;
    const conf = { confianca: confiancaPelaIdade(idade), motivo_confianca: motivoConfianca(idade) };

    if (Number.isNaN(serie[0])) {
      alertas.push({
        tipo: "sem_medicao",
        data: hoje,
        texto: `${p.nome} ainda não tem nenhuma medição de altura: não dá para estimar o capim.`,
        ...conf,
      });
      continue;
    }
    if (ocupadosHoje.has(p.id) || destinos.has(p.id)) continue;

    if (serie[0] >= c.altura_entrada_cm * 1.5) {
      alertas.push({
        tipo: "passando_do_ponto",
        data: hoje,
        texto: `${p.nome} está passando do ponto: ${decimal(serie[0], 0)} cm em ${dataCurta(hoje)} (entrada ${c.altura_entrada_cm} cm).`,
        ...conf,
      });
      continue;
    }
    const dia = serie.findIndex((h) => h >= c.altura_entrada_cm);
    if (dia === 0) {
      alertas.push({ tipo: "pronto_para_pastejo", data: hoje, texto: `${p.nome} já está pronto para pastejo.`, ...conf });
    } else if (dia > 0) {
      const data = somarDias(hoje, dia);
      alertas.push({
        tipo: "pronto_para_pastejo",
        data,
        texto: `${p.nome} fica pronto para pastejo em ${dataCurta(data)}.`,
        ...conf,
      });
    }
  }

  // balanço de capim da fazenda: quanto o pasto cresce frente ao que os animais comem
  const consumo = lotes.reduce((s, l) => s + CONSUMO_CM_POR_UA_HA_DIA * uaDoLote(l), 0);
  const crescimento = piquetes.reduce((s, p) => {
    const c = cultivar(p.id);
    const h = altura.get(p.id) ?? c.altura_entrada_cm;
    return s + (crescer(h, c) - h) * p.area_ha;
  }, 0);
  if (consumo > 0 && crescimento < consumo) {
    alertas.push({
      tipo: "falta_capim",
      data: hoje,
      texto: `Falta capim na fazenda: o pasto cresce ${Math.round((crescimento / consumo) * 100)}% do que os animais comem.`,
      confianca: "media",
      motivo_confianca: "estimativa de crescimento e consumo",
    });
  }

  alertas.sort((a, b) => a.data.localeCompare(b.data));

  const pedidos_validacao: PedidoValidacao[] = piquetes
    .filter((p) => {
      const idade = idadeCampo.get(p.id) ?? null;
      return idade === null || idade > MEDICAO_VELHA_DIAS;
    })
    .map((p) => {
      const idade = idadeCampo.get(p.id) ?? null;
      return {
        piquete_id: p.id,
        piquete_nome: p.nome,
        motivo:
          idade === null
            ? "Ainda não há medição em campo. Meça a altura média do capim."
            : `Última medição em campo ${haQuanto(idade)}. Meça a altura média para confirmar a estimativa.`,
      };
    });

  return {
    id: novoId("plano"),
    fazenda_id: fazendaId,
    data_geracao: agora.toISOString(),
    data_inicio: hoje,
    horizonte_dias: HORIZONTE_DIAS,
    movimentacoes,
    alertas,
    pedidos_validacao,
  };
}
