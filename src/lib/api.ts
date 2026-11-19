// Cliente da API do Maneja (backend/). Só é usado quando VITE_API_URL está definida;
// sem ela o front roda no modo demonstração (dados de demo.ts), como antes (decisão D7).

import type { Base } from "./demo";
import type { Fazenda, GeoJsonPolygon, Lotacao, Movimentacao, Piquete, PlanoManejo, Rebanho } from "./tipos";

export const API_URL: string = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
export const USAR_API = API_URL !== "";

export class ErroApi extends Error {
  readonly status: number;
  readonly motivos: string[];

  constructor(status: number, motivos: string[]) {
    super(motivos.join("; "));
    this.status = status;
    this.motivos = motivos;
  }
}

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi(0, [`não foi possível falar com a API em ${API_URL}`]);
  }
  if (resposta.status === 204) return undefined as T;
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const detalhe = dados?.detail;
    const motivos = Array.isArray(detalhe)
      ? detalhe.map((d: unknown) => (typeof d === "string" ? d : JSON.stringify(d)))
      : [typeof detalhe === "string" ? detalhe : `erro ${resposta.status}`];
    throw new ErroApi(resposta.status, motivos);
  }
  return dados as T;
}

export interface BaseApi extends Base {
  plano: PlanoManejo | null;
}

export async function carregarBase(): Promise<BaseApi> {
  const [fazenda, piquetes, lotacao, ndvi, clima, historico] = await Promise.all([
    chamar<Fazenda>("GET", "/fazenda"),
    chamar<Piquete[]>("GET", "/piquetes"),
    chamar<Lotacao[]>("GET", "/lotacao"),
    chamar<Base["ndvi"]>("GET", "/ndvi"),
    chamar<Base["clima"]>("GET", "/clima"),
    chamar<Movimentacao[]>("GET", "/historico"),
  ]);
  const plano = await chamar<PlanoManejo>("GET", "/plano").catch((e: unknown) => {
    if (e instanceof ErroApi && e.status === 404) return null;
    throw e;
  });
  return { fazenda, piquetes, lotacao, ndvi, clima, historico, plano };
}

export const api = {
  gerarPlano: () => chamar<PlanoManejo>("POST", "/plano"),
  aceitar: (id: string, destinoId?: string) =>
    chamar<Movimentacao>("POST", `/movimentacoes/${id}/aceitar`, destinoId ? { destino_id: destinoId } : undefined),
  recusar: (id: string) => chamar<Movimentacao>("POST", `/movimentacoes/${id}/recusar`),
  salvarFazenda: (nome: string) => chamar<Fazenda>("PUT", "/fazenda", { nome }),
  criarPiquete: (nome: string, vegetacao: string, geometria: GeoJsonPolygon) =>
    chamar<Piquete>("POST", "/piquetes", { nome, vegetacao, geometria }),
  atualizarGeometria: (id: string, geometria: GeoJsonPolygon) => chamar<Piquete>("PUT", `/piquetes/${id}`, { geometria }),
  removerPiquete: (id: string) => chamar<void>("DELETE", `/piquetes/${id}`),
  salvarLotacao: (piqueteId: string, r: Rebanho) => chamar<Lotacao>("PUT", `/lotacao/${piqueteId}`, r),
};

export function mensagemDeErro(e: unknown): string {
  return e instanceof ErroApi ? e.motivos.join("; ") : "erro inesperado";
}
