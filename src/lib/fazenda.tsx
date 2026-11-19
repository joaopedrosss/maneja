// Estado da aplicação. Com VITE_API_URL definida, tudo vem da API (backend/);
// sem ela, roda o modo demonstração em memória (decisão D7, SPEC-010).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, carregarBase, EVENTO_SESSAO_EXPIRADA, lerToken, mensagemDeErro, sair, USAR_API, API_URL } from "./api";
import Login from "../paginas/Login";
import { gerarRecomendacao } from "./agente";
import { hojeNaFazenda } from "./datas";
import { baseInicial, USUARIO, type Base } from "./demo";
import { areaHa } from "./geo";
import { ultimaLeitura } from "./ndvi";
import { lotacaoDe, totalAnimais } from "./rebanho";
import { validarMovimento } from "./regras";
import type { Fazenda, GeoJsonPolygon, Movimentacao, PlanoManejo, Rebanho } from "./tipos";

export interface EstadoDemo extends Base {
  plano: PlanoManejo | null;
}

export type DadosFazenda = Pick<Fazenda, "nome">;

export interface NovoPiquete {
  nome: string;
  vegetacao: string;
  geometria: GeoJsonPolygon;
}

// As ações devolvem uma mensagem de erro (ou null) quando podem ser recusadas.
interface Contexto {
  modo: "api" | "demo";
  usuario: typeof USUARIO;
  estado: EstadoDemo;
  fazenda: Fazenda;
  hoje: string;
  salvarFazenda: (dados: DadosFazenda) => Promise<string | null>;
  criarPiquete: (dados: NovoPiquete) => Promise<string>;
  atualizarGeometria: (piqueteId: string, geometria: GeoJsonPolygon) => Promise<string | null>;
  desativarPiquete: (piqueteId: string) => Promise<string | null>;
  gerarPlano: () => Promise<PlanoManejo>;
  salvarLotacao: (piqueteId: string, rebanho: Rebanho) => Promise<string | null>;
  executarMovimentacao: (movimentacaoId: string, destinoId?: string) => Promise<string | null>;
  recusarMovimentacao: (movimentacaoId: string) => Promise<string | null>;
  sair?: () => void; // só no modo API
}

const ContextoFazenda = createContext<Contexto | null>(null);

const FUSO = "America/Maceio";
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

function recomendar(base: Base, hoje: string, agora?: Date): PlanoManejo {
  const { piquetes, ndvi, clima, lotacao, historico } = base;
  return gerarRecomendacao({ piquetes, ndvi, clima, lotacao, historico }, hoje, agora);
}

function comMovimentacao(plano: PlanoManejo, mov: Movimentacao): PlanoManejo {
  return { ...plano, movimentacoes: plano.movimentacoes.map((m) => (m.id === mov.id ? mov : m)) };
}

function estadoInicial(): EstadoDemo {
  const hoje = hojeNaFazenda(FUSO);
  const base = baseInicial(hoje);
  // a demonstração já começa com um plano
  const geradoAs = new Date();
  geradoAs.setHours(7, 48, 0, 0);
  return { ...base, plano: recomendar(base, hoje, geradoAs) };
}

function ProviderDemo({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoDemo>(estadoInicial);
  // cópia síncrona do estado: `alterar` é o único caminho de escrita e a mantém em dia
  const atual = useRef(estado);

  const fazenda = estado.fazenda;
  const fazendaId = fazenda.id;
  const hoje = hojeNaFazenda(fazenda.timezone);

  function alterar(transformar: (e: EstadoDemo) => EstadoDemo): void {
    atual.current = transformar(atual.current);
    setEstado(atual.current);
  }

  async function salvarFazenda(dados: DadosFazenda): Promise<string | null> {
    alterar((e) => ({ ...e, fazenda: { ...e.fazenda, ...dados } }));
    return null;
  }

  async function criarPiquete(dados: NovoPiquete): Promise<string> {
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

  async function atualizarGeometria(piqueteId: string, geometria: GeoJsonPolygon): Promise<string | null> {
    alterar((e) => ({
      ...e,
      piquetes: e.piquetes.map((p) =>
        p.id === piqueteId ? { ...p, geometria, area_ha: areaHa(geometria) } : p,
      ),
    }));
    return null;
  }

  async function desativarPiquete(piqueteId: string): Promise<string | null> {
    if (lotacaoDe(atual.current.lotacao, piqueteId)) return "Há gado neste piquete. Mova os animais antes de desativar.";
    alterar((e) => ({
      ...e,
      piquetes: e.piquetes.filter((p) => p.id !== piqueteId),
      ndvi: e.ndvi.filter((l) => l.piquete_id !== piqueteId),
      lotacao: e.lotacao.filter((l) => l.piquete_id !== piqueteId),
    }));
    return null;
  }

  async function salvarLotacao(piqueteId: string, rebanho: Rebanho): Promise<string | null> {
    alterar((e) => {
      const outras = e.lotacao.filter((l) => l.piquete_id !== piqueteId);
      if (totalAnimais(rebanho) === 0) return { ...e, lotacao: outras };
      const desde = lotacaoDe(e.lotacao, piqueteId)?.desde ?? hoje;
      return { ...e, lotacao: [...outras, { piquete_id: piqueteId, fazenda_id: fazendaId, ...rebanho, desde }] };
    });
    return null;
  }

  async function gerarPlano(): Promise<PlanoManejo> {
    await espera(1600); // simula a consulta ao NDVI, ao clima e o tempo de análise do agente
    const plano = recomendar(atual.current, hoje);
    alterar((e) => ({ ...e, plano }));
    return plano;
  }

  // Aceitar a recomendação (ou escolher outro destino) registra a movimentação:
  // o rebanho passa a ocupar o destino a partir de hoje e o mapa se atualiza.
  async function executarMovimentacao(movimentacaoId: string, destinoId?: string): Promise<string | null> {
    const e = atual.current;
    const plano = e.plano;
    const mov = plano?.movimentacoes.find((m) => m.id === movimentacaoId);
    if (!plano || !mov) return "Movimentação não encontrada.";
    const origem = lotacaoDe(e.lotacao, mov.piquete_origem_id);
    if (!origem) return "O piquete de origem está sem animais. Gere um novo plano.";

    const destinoFinal = destinoId ?? mov.piquete_destino_id;
    const rebanho = { bois: origem.bois, vacas: origem.vacas, bezerros: origem.bezerros };
    const falhas = validarMovimento(destinoFinal, rebanho, { piquetes: e.piquetes, ndvi: e.ndvi, lotacao: e.lotacao, hoje });
    if (falhas.length > 0) return `Não dá para mover: ${falhas.join("; ")}.`;

    const destino = e.piquetes.find((p) => p.id === destinoFinal)!;
    const trocado = destino.id !== mov.piquete_destino_id;
    const registrada: Movimentacao = {
      ...mov,
      rebanho,
      status: trocado ? "trocada" : "aceita",
      destino_trocado: trocado,
      piquete_destino_id: destino.id,
      piquete_destino_nome: destino.nome,
      ndvi_destino: ultimaLeitura(e.ndvi, destino.id, hoje)!.valor,
    };
    alterar((s) => ({
      ...s,
      lotacao: s.lotacao.map((l) => (l === origem ? { ...l, piquete_id: destino.id, desde: hoje } : l)),
      historico: [{ ...registrada, data: hoje }, ...s.historico],
      plano: comMovimentacao(plano, registrada),
    }));
    return null;
  }

  async function recusarMovimentacao(movimentacaoId: string): Promise<string | null> {
    const plano = atual.current.plano;
    const mov = plano?.movimentacoes.find((m) => m.id === movimentacaoId);
    if (!plano || !mov) return "Movimentação não encontrada.";
    const recusada: Movimentacao = { ...mov, status: "recusada" };
    alterar((s) => ({
      ...s,
      historico: [{ ...recusada, data: hoje }, ...s.historico],
      plano: comMovimentacao(plano, recusada),
    }));
    return null;
  }

  return (
    <ContextoFazenda.Provider
      value={{
        modo: "demo",
        usuario: USUARIO,
        estado,
        fazenda,
        hoje,
        salvarFazenda,
        criarPiquete,
        atualizarGeometria,
        desativarPiquete,
        gerarPlano,
        salvarLotacao,
        executarMovimentacao,
        recusarMovimentacao,
      }}
    >
      {children}
    </ContextoFazenda.Provider>
  );
}

// ---------- modo API ----------

function ProviderApi({ children }: { children: ReactNode }) {
  const [logado, setLogado] = useState(() => lerToken() !== null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoDemo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async (): Promise<EstadoDemo> => {
    const base = await carregarBase();
    setEstado(base);
    setErro(null);
    return base;
  }, []);

  // 401 em qualquer chamada: volta para o login (critério de qualidade 4.2)
  useEffect(() => {
    const expirou = () => {
      setLogado(false);
      setEstado(null);
      setAviso("Sua sessão expirou. Entre de novo.");
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
  }, []);

  useEffect(() => {
    if (!logado) return;
    recarregar().catch((e: unknown) => setErro(mensagemDeErro(e)));
  }, [logado, recarregar]);

  if (!logado) {
    return <Login aviso={aviso} aoEntrar={() => { setAviso(null); setErro(null); setLogado(true); }} />;
  }

  if (erro !== null && estado === null) {
    return (
      <div className="aviso-alerta" role="alert" style={{ margin: 24 }}>
        Não foi possível carregar os dados: {erro}. Confira se o backend está rodando em {API_URL}
        {" "}(<code>cd backend && uv run uvicorn maneja.api:app --reload</code>).
      </div>
    );
  }
  if (estado === null) return <p style={{ margin: 24 }}>Carregando dados da fazenda…</p>;

  // executa a ação na API e recarrega tudo; devolve a mensagem de erro, se houver
  async function acao(fazer: () => Promise<unknown>): Promise<string | null> {
    try {
      await fazer();
      await recarregar();
      return null;
    } catch (e) {
      return mensagemDeErro(e);
    }
  }

  const fazenda = estado.fazenda;
  const valor: Contexto = {
    modo: "api",
    usuario: USUARIO,
    estado,
    fazenda,
    hoje: hojeNaFazenda(fazenda.timezone),
    salvarFazenda: (dados) => acao(() => api.salvarFazenda(dados.nome)),
    criarPiquete: async (dados) => {
      const piquete = await api.criarPiquete(dados.nome.trim(), dados.vegetacao.trim(), dados.geometria);
      await recarregar();
      return piquete.id;
    },
    atualizarGeometria: (id, geometria) => acao(() => api.atualizarGeometria(id, geometria)),
    desativarPiquete: (id) => acao(() => api.removerPiquete(id)),
    gerarPlano: async () => {
      const plano = await api.gerarPlano();
      await recarregar();
      return plano;
    },
    salvarLotacao: (id, rebanho) => acao(() => api.salvarLotacao(id, rebanho)),
    executarMovimentacao: (id, destinoId) => acao(() => api.aceitar(id, destinoId)),
    recusarMovimentacao: (id) => acao(() => api.recusar(id)),
    sair: () => {
      sair();
      setEstado(null);
      setLogado(false);
    },
  };
  return <ContextoFazenda.Provider value={valor}>{children}</ContextoFazenda.Provider>;
}

export function FazendaProvider({ children }: { children: ReactNode }) {
  return USAR_API ? <ProviderApi>{children}</ProviderApi> : <ProviderDemo>{children}</ProviderDemo>;
}

export function useFazenda(): Contexto {
  const ctx = useContext(ContextoFazenda);
  if (ctx === null) throw new Error("useFazenda fora do FazendaProvider");
  return ctx;
}
