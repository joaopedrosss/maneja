// Estado da aplicação de demonstração (substitui a API e o banco).
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { gerarRecomendacao } from "./agente";
import { hojeNaFazenda } from "./datas";
import { baseInicial, USUARIO, type Base } from "./demo";
import { areaHa } from "./geo";
import { lotacaoDe, totalAnimais } from "./rebanho";
import type { Fazenda, GeoJsonPolygon, PlanoManejo, Rebanho } from "./tipos";

export interface EstadoDemo extends Base {
  planos: Record<string, PlanoManejo>; // fazenda_id → plano atual
}

export type DadosFazenda = Pick<Fazenda, "nome">;

export interface NovoPiquete {
  nome: string;
  vegetacao: string;
  geometria: GeoJsonPolygon;
}

interface Contexto {
  usuario: typeof USUARIO;
  estado: EstadoDemo;
  fazendas: Fazenda[];
  fazenda: Fazenda | null;
  hoje: string;
  selecionar: (id: string) => void;
  salvarFazenda: (dados: DadosFazenda) => void;
  criarPiquete: (dados: NovoPiquete) => string;
  atualizarGeometria: (piqueteId: string, geometria: GeoJsonPolygon) => void;
  desativarPiquete: (piqueteId: string) => string | null;
  gerarPlano: () => Promise<PlanoManejo>;
  salvarLotacao: (piqueteId: string, rebanho: Rebanho) => void;
  executarMovimentacao: (movimentacaoId: string, destinoId?: string) => string | null;
}

const ContextoFazenda = createContext<Contexto | null>(null);

const FUSO = "America/Maceio";
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

function recomendar(base: Base, fazendaId: string, hoje: string, agora?: Date): PlanoManejo {
  return gerarRecomendacao(
    {
      piquetes: base.piquetes.filter((p) => p.fazenda_id === fazendaId),
      ndvi: base.ndvi,
      clima: { ...base.clima, fazenda_id: fazendaId },
      lotacao: base.lotacao.filter((l) => l.fazenda_id === fazendaId),
      historico: base.historico,
    },
    hoje,
    agora,
  );
}

function estadoInicial(): EstadoDemo {
  const hoje = hojeNaFazenda(FUSO);
  const base = baseInicial(hoje);
  // a Fazenda do Marcinho já começa com um plano; o Sítio Boa Vista ainda não
  const geradoAs = new Date();
  geradoAs.setHours(7, 48, 0, 0);
  const plano = recomendar(base, "faz-marcinho", hoje, geradoAs);
  return { ...base, planos: { "faz-marcinho": plano } };
}

export function FazendaProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoDemo>(estadoInicial);
  const [fazendaId, setFazendaId] = useState<string>("faz-marcinho");
  // cópia síncrona do estado: `alterar` é o único caminho de escrita e a mantém em dia
  const atual = useRef(estado);

  const fazenda = estado.fazendas.find((f) => f.id === fazendaId) ?? null;
  const hoje = hojeNaFazenda(fazenda?.timezone ?? FUSO);

  function alterar(transformar: (e: EstadoDemo) => EstadoDemo): void {
    atual.current = transformar(atual.current);
    setEstado(atual.current);
  }

  function salvarFazenda(dados: DadosFazenda): void {
    alterar((e) => ({
      ...e,
      fazendas: e.fazendas.map((f) => (f.id === fazendaId ? { ...f, ...dados } : f)),
    }));
  }

  function criarPiquete(dados: NovoPiquete): string {
    const id = `pq-${Date.now().toString(36)}`;
    alterar((e) => ({
      ...e,
      piquetes: [
        ...e.piquetes,
        {
          id,
          fazenda_id: fazendaId,
          nome: dados.nome.trim(),
          vegetacao: dados.vegetacao.trim(),
          geometria: dados.geometria,
          area_ha: areaHa(dados.geometria),
        },
      ],
    }));
    return id;
  }

  function atualizarGeometria(piqueteId: string, geometria: GeoJsonPolygon): void {
    alterar((e) => ({
      ...e,
      piquetes: e.piquetes.map((p) =>
        p.id === piqueteId ? { ...p, geometria, area_ha: areaHa(geometria) } : p,
      ),
    }));
  }

  function desativarPiquete(piqueteId: string): string | null {
    if (lotacaoDe(atual.current.lotacao, piqueteId)) return "Há gado neste piquete. Mova os animais antes de desativar.";
    alterar((e) => ({
      ...e,
      piquetes: e.piquetes.filter((p) => p.id !== piqueteId),
      ndvi: e.ndvi.filter((l) => l.piquete_id !== piqueteId),
      lotacao: e.lotacao.filter((l) => l.piquete_id !== piqueteId),
    }));
    return null;
  }

  function salvarLotacao(piqueteId: string, rebanho: Rebanho): void {
    alterar((e) => {
      const outras = e.lotacao.filter((l) => l.piquete_id !== piqueteId);
      if (totalAnimais(rebanho) === 0) return { ...e, lotacao: outras };
      const desde = lotacaoDe(e.lotacao, piqueteId)?.desde ?? hoje;
      return { ...e, lotacao: [...outras, { piquete_id: piqueteId, fazenda_id: fazendaId, ...rebanho, desde }] };
    });
  }

  async function gerarPlano(): Promise<PlanoManejo> {
    const alvo = fazendaId;
    await espera(1600); // simula a consulta ao NDVI, ao clima e o tempo de análise do agente
    const plano = recomendar(atual.current, alvo, hoje);
    alterar((e) => ({ ...e, planos: { ...e.planos, [alvo]: plano } }));
    return plano;
  }

  // Aceitar a recomendação (ou escolher outro destino) registra a movimentação:
  // o rebanho passa a ocupar o destino a partir de hoje e o mapa se atualiza.
  function executarMovimentacao(movimentacaoId: string, destinoId?: string): string | null {
    const e = atual.current;
    const plano = e.planos[fazendaId];
    const mov = plano?.movimentacoes.find((m) => m.id === movimentacaoId);
    if (!plano || !mov) return "Movimentação não encontrada.";
    const destino = e.piquetes.find((p) => p.id === (destinoId ?? mov.piquete_destino_id));
    if (!destino) return "Piquete de destino não existe mais.";
    const origem = lotacaoDe(e.lotacao, mov.piquete_origem_id);
    if (!origem) return "O piquete de origem está sem animais. Gere um novo plano.";
    if (lotacaoDe(e.lotacao, destino.id)) return `${destino.nome} já está ocupado.`;

    alterar((s) => ({
      ...s,
      lotacao: s.lotacao.map((l) => (l === origem ? { ...l, piquete_id: destino.id, desde: hoje } : l)),
      planos: {
        ...s.planos,
        [fazendaId]: {
          ...plano,
          movimentacoes: plano.movimentacoes.map((m) =>
            m.id === mov.id
              ? {
                  ...m,
                  status: "realizada",
                  destino_trocado: destino.id !== mov.piquete_destino_id,
                  piquete_destino_id: destino.id,
                  piquete_destino_nome: destino.nome,
                }
              : m,
          ),
        },
      },
    }));
    return null;
  }

  return (
    <ContextoFazenda.Provider
      value={{
        usuario: USUARIO,
        estado,
        fazendas: estado.fazendas,
        fazenda,
        hoje,
        selecionar: setFazendaId,
        salvarFazenda,
        criarPiquete,
        atualizarGeometria,
        desativarPiquete,
        gerarPlano,
        salvarLotacao,
        executarMovimentacao,
      }}
    >
      {children}
    </ContextoFazenda.Provider>
  );
}

export function useFazenda(): Contexto {
  const ctx = useContext(ContextoFazenda);
  if (ctx === null) throw new Error("useFazenda fora do FazendaProvider");
  return ctx;
}
