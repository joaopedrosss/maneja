export type Confianca = "alta" | "media" | "baixa";
export type SituacaoPiquete = "ocupado" | "descansando";

export interface Fazenda {
  id: string;
  cliente_nome: string;
  nome: string;
  timezone: string;
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface Piquete {
  id: string;
  fazenda_id: string;
  nome: string;
  geometria: GeoJsonPolygon;
  area_ha: number;
  vegetacao: string; // espécie ou tipo de capim
}

export interface Lote {
  id: string;
  fazenda_id: string;
  nome: string;
  n_animais: number;
  peso_medio_kg: number;
  piquete_atual_id: string | null;
  desde: string | null; // data em que entrou no piquete atual
}

export interface LeituraNdvi {
  piquete_id: string;
  data: string;
  valor: number; // 0 … 1
}

export interface PrevisaoDia {
  data: string;
  chuva_mm: number;
  temp_min_c: number;
  temp_max_c: number;
}

export interface PrevisaoClima {
  fazenda_id: string;
  dias: PrevisaoDia[]; // 7 dias, a partir de hoje
}

export type StatusMovimentacao = "pendente" | "realizada";

export interface Movimentacao {
  id: string;
  data: string;
  lote_id: string;
  lote_nome: string;
  n_animais: number;
  piquete_origem_id: string | null;
  piquete_origem_nome: string | null;
  piquete_destino_id: string;
  piquete_destino_nome: string;
  ndvi_origem: number | null;
  ndvi_destino: number;
  motivo: string;
  confianca: Confianca;
  motivo_confianca: string;
  status: StatusMovimentacao;
  destino_trocado: boolean; // o técnico escolheu outro piquete
}

export type TipoAlerta =
  | "sem_piquete_apto"
  | "passando_do_ponto"
  | "pronto_para_pastejo"
  | "falta_capim"
  | "alerta_clima";

export interface Alerta {
  tipo: TipoAlerta;
  data: string;
  texto: string;
  confianca: Confianca;
  motivo_confianca: string;
}

export interface ResumoPiquete {
  piquete_id: string;
  nome: string;
  vegetacao: string;
  area_ha: number;
  situacao: SituacaoPiquete;
  lote_atual_nome: string | null;
  ndvi: number | null; // leitura mais recente
  data_ndvi: string | null;
  confianca: Confianca;
  motivo_confianca: string;
}

export interface PlanoManejo {
  id: string;
  fazenda_id: string;
  data_geracao: string; // instante ISO
  data_inicio: string;
  horizonte_dias: number;
  movimentacoes: Movimentacao[];
  alertas: Alerta[];
}
