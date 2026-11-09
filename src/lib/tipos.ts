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

export interface Rebanho {
  bois: number;
  vacas: number;
  bezerros: number;
}

export interface Lotacao extends Rebanho {
  piquete_id: string;
  fazenda_id: string;
  desde: string | null; // data em que o gado entrou no piquete
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

export type StatusMovimentacao = "pendente" | "aceita" | "recusada" | "trocada";

export interface Movimentacao {
  id: string;
  data: string;
  rebanho: Rebanho;
  piquete_origem_id: string;
  piquete_origem_nome: string;
  piquete_destino_id: string;
  piquete_destino_nome: string;
  ndvi_origem: number;
  ndvi_destino: number;
  motivo: string;
  confianca: Confianca;
  motivo_confianca: string;
  status: StatusMovimentacao;
  destino_trocado: boolean; // foi escolhido outro piquete no lugar do recomendado
  destino_recomendado_nome: string;
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
  rebanho: Rebanho | null; // null = piquete livre
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
