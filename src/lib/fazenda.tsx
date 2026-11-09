// Estado da aplicação de demonstração (substitui a API e o banco).
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { gerarPlano as gerarPlanoAgente, type Base } from "./agente";
import { hojeNaFazenda } from "./datas";
import { baseInicial, USUARIO } from "./demo";
import { areaHa } from "./geo";
import type { Fazenda, GeoJsonPolygon, PlanoManejo } from "./tipos";

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
  executarMovimentacao: (movimentacaoId: string, destinoId?: string) => string | null;
}

const ContextoFazenda = createContext<Contexto | null>(null);

const FUSO = "America/Maceio";
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

function estadoInicial(): EstadoDemo {
  const hoje = hojeNaFazenda(FUSO);
  const base = baseInicial(hoje);
  // a Fazenda do Marcinho já começa com um plano; o Sítio Boa Vista ainda não
  const geradoAs = new Date();
  geradoAs.setHours(7, 48, 0, 0);
  const plano = gerarPlanoAgente(base, "faz-marcinho", hoje, geradoAs);
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
    const lote = atual.current.lotes.find((l) => l.piquete_atual_id === piqueteId);
    if (lote) return `${lote.nome} está neste piquete. Mova o lote antes de desativar.`;
    alterar((e) => ({ ...e, piquetes: e.piquetes.filter((p) => p.id !== piqueteId) }));
    return null;
  }

  async function gerarPlano(): Promise<PlanoManejo> {
    const alvo = fazendaId;
    await espera(1600); // simula a consulta ao NDVI, ao clima e o tempo de análise do agente
    const plano = gerarPlanoAgente(atual.current, alvo, hoje);
    alterar((e) => ({ ...e, planos: { ...e.planos, [alvo]: plano } }));
    return plano;
  }

  // Aceitar a recomendação (ou escolher outro destino) registra a movimentação:
  // o lote passa a ocupar o destino a partir de hoje e o mapa se atualiza.
  function executarMovimentacao(movimentacaoId: string, destinoId?: string): string | null {
    const e = atual.current;
    const plano = e.planos[fazendaId];
    const mov = plano?.movimentacoes.find((m) => m.id === movimentacaoId);
    if (!plano || !mov) return "Movimentação não encontrada.";
    const destino = e.piquetes.find((p) => p.id === (destinoId ?? mov.piquete_destino_id));
    if (!destino) return "Piquete de destino não existe mais.";
    const lote = e.lotes.find((l) => l.id === mov.lote_id);
    if (!lote) return "Lote não encontrado.";
    const outro = e.lotes.find((l) => l.piquete_atual_id === destino.id && l.id !== lote.id);
    if (outro) return `${destino.nome} já está ocupado pelo ${outro.nome}.`;
    if (lote.piquete_atual_id === destino.id) return `${lote.nome} já está em ${destino.nome}.`;

    alterar((s) => ({
      ...s,
      lotes: s.lotes.map((l) => (l.id === lote.id ? { ...l, piquete_atual_id: destino.id, desde: hoje } : l)),
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
