export type Confianca = "alta" | "media" | "baixa";
export type MetodoPastejo = "continuo" | "rotacionado";
export type SituacaoPiquete = "ocupado" | "descansando";

export interface Fazenda {
  id: string;
  cliente_nome: string;
  nome: string;
  timezone: string;
  funcionarios_disponiveis: number;
  animais_por_funcionario_dia: number;
  dias_preferenciais_manejo: number[]; // 0 = segunda … 6 = domingo
  envio_plano_dia: number; // 0 = segunda … 6 = domingo
  envio_plano_hora: number; // 0 … 23, hora local da fazenda
  telegram_token: string;
  telegram_vinculado: boolean;
}

export interface Cultivar {
  id: string;
  nome: string;
  altura_entrada_cm: number;
  altura_saida_cm: number;
  crescimento_cm_dia: number; // taxa de crescimento com o pasto baixo
  altura_maxima_cm: number; // o crescimento desacelera até parar aqui
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
  cultivar_id: string;
  metodo_pastejo: MetodoPastejo;
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

export interface Medicao {
  piquete_id: string;
  data: string;
  altura_cm: number;
  origem: "campo" | "estimativa"; // "estimativa" = registrada pelo sistema ao mover um lote
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
  altura_destino_cm: number;
  altura_entrada_alvo_cm: number;
  dias_previstos: number;
  motivo: string;
  confianca: Confianca;
  motivo_confianca: string;
  status: StatusMovimentacao;
  destino_trocado: boolean; // o técnico escolheu outro piquete
}

export type TipoAlerta =
  | "sem_piquete_apto"
  | "capacidade_excedida"
  | "sem_dia_de_manejo"
  | "passando_do_ponto"
  | "pronto_para_pastejo"
  | "falta_capim"
  | "sem_medicao";

export interface Alerta {
  tipo: TipoAlerta;
  data: string;
  texto: string;
  confianca: Confianca;
  motivo_confianca: string;
}

export interface PedidoValidacao {
  piquete_id: string;
  piquete_nome: string;
  motivo: string;
}

export interface ResumoPiquete {
  piquete_id: string;
  nome: string;
  cultivar_nome: string;
  area_ha: number;
  metodo_pastejo: MetodoPastejo;
  situacao: SituacaoPiquete;
  lote_atual_nome: string | null;
  altura_hoje_cm: number | null;
  altura_entrada_alvo_cm: number;
  altura_saida_alvo_cm: number;
  ultima_medicao_campo: Medicao | null;
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
  pedidos_validacao: PedidoValidacao[];
}
