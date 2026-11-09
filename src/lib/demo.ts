// Dados de demonstração. Não há banco: tudo vive em memória e volta ao
// estado inicial quando a página é recarregada. As datas são relativas a "hoje"
// para que a demonstração funcione em qualquer dia.

import { somarDias } from "./datas";
import { areaHa, poligonoEmMetros } from "./geo";
import type {
  Fazenda,
  GeoJsonPolygon,
  LeituraNdvi,
  Lotacao,
  Movimentacao,
  Piquete,
  PrevisaoClima,
  Rebanho,
  StatusMovimentacao,
} from "./tipos";

export interface Base {
  fazenda: Fazenda;
  piquetes: Piquete[];
  lotacao: Lotacao[];
  ndvi: LeituraNdvi[];
  clima: PrevisaoClima;
  historico: Movimentacao[];
}

export const USUARIO = { nome: "Técnico Maneja", email: "tecnico@maneja.app" };

const FAZENDA_ID = "faz-marcinho";
const ORIGEM: [number, number] = [-9.6205, -35.9695];

function piquete(id: string, nome: string, vegetacao: string, geometria: GeoJsonPolygon): Piquete {
  return { id, fazenda_id: FAZENDA_ID, nome, vegetacao, geometria, area_ha: areaHa(geometria) };
}

// Uma leitura por semana; `valores` vai da mais antiga para a mais recente.
function serie(piquete_id: string, hoje: string, ultimaHaDias: number, valores: number[]): LeituraNdvi[] {
  return valores.map((valor, i) => ({
    piquete_id,
    data: somarDias(hoje, -ultimaHaDias - 7 * (valores.length - 1 - i)),
    valor,
  }));
}

export function baseInicial(hoje: string): Base {
  const fazenda: Fazenda = { id: FAZENDA_ID, nome: "Fazenda do Marcinho", timezone: "America/Maceio" };

  const piquetes: Piquete[] = [
    piquete("pq-abobora", "Piquete Abóbora", "Marandu",
      poligonoEmMetros(ORIGEM, [[-250, -10], [-150, 130], [-40, 95], [70, 20], [-15, -165]])),
    piquete("pq-jerimum", "Piquete Jerimum", "Tifton 85",
      poligonoEmMetros(ORIGEM, [[70, 20], [190, -55], [105, -240], [-15, -165]])),
    piquete("pq-macarrao", "Piquete Macarrão", "Marandu",
      poligonoEmMetros(ORIGEM, [[-130, 165], [-20, 390], [270, 225], [160, 0], [80, 45], [-35, 125]])),
    piquete("pq-feijao", "Piquete Feijão", "Mombaça",
      poligonoEmMetros(ORIGEM, [[190, -55], [400, -60], [380, -260], [105, -240]])),
    piquete("pq-milho", "Piquete Milho", "Marandu",
      poligonoEmMetros(ORIGEM, [[190, -55], [160, 0], [270, 225], [490, 150], [400, -60]])),
  ];

  const ndvi: LeituraNdvi[] = [
    // degradando: o gado está aqui há sete semanas e precisa sair
    ...serie("pq-abobora", hoje, 2, [0.66, 0.63, 0.6, 0.55, 0.49, 0.44, 0.37, 0.29]),
    // passando do ponto, mas pequeno demais para o rebanho que precisa sair
    ...serie("pq-jerimum", hoje, 2, [0.7, 0.73, 0.76, 0.78, 0.8, 0.81, 0.83, 0.84]),
    // melhor destino, com a última leitura atrasada: a confiança cai para média
    ...serie("pq-macarrao", hoje, 9, [0.33, 0.42, 0.5, 0.58, 0.63, 0.69, 0.73, 0.76]),
    // recuperando depois que o gado saiu
    ...serie("pq-feijao", hoje, 2, [0.24, 0.28, 0.34, 0.4, 0.46, 0.52, 0.58, 0.63]),
    ...serie("pq-milho", hoje, 2, [0.58, 0.47, 0.34, 0.4, 0.47, 0.52, 0.54, 0.55]),
  ];

  const lotacao: Lotacao[] = [
    { piquete_id: "pq-abobora", fazenda_id: FAZENDA_ID, bois: 12, vacas: 6, bezerros: 5, desde: somarDias(hoje, -51) },
    { piquete_id: "pq-milho", fazenda_id: FAZENDA_ID, bois: 0, vacas: 18, bezerros: 10, desde: somarDias(hoje, -58) },
  ];

  const chuvas = [0, 2, 48, 12, 0, 0, 5];
  const minimas = [22, 22, 21, 21, 22, 23, 23];
  const maximas = [31, 30, 26, 27, 30, 32, 31];
  const clima: PrevisaoClima = {
    fazenda_id: FAZENDA_ID,
    dias: chuvas.map((chuva_mm, i) => ({
      data: somarDias(hoje, i),
      chuva_mm,
      temp_min_c: minimas[i],
      temp_max_c: maximas[i],
    })),
  };

  const nome = (id: string) => piquetes.find((p) => p.id === id)!.nome;
  const passado = (
    haDias: number,
    status: StatusMovimentacao,
    origem: string,
    destino: string,
    recomendado: string,
    rebanho: Rebanho,
    ndvi_origem: number,
    ndvi_destino: number,
    motivo: string,
  ): Movimentacao => ({
    id: `mov-demo-${haDias}`,
    data: somarDias(hoje, -haDias),
    rebanho,
    piquete_origem_id: origem,
    piquete_origem_nome: nome(origem),
    piquete_destino_id: destino,
    piquete_destino_nome: nome(destino),
    ndvi_origem,
    ndvi_destino,
    motivo,
    confianca: "alta",
    motivo_confianca: "última leitura de NDVI há 2 dias no destino",
    status,
    destino_trocado: status === "trocada",
    destino_recomendado_nome: nome(recomendado),
  });

  const vacas: Rebanho = { bois: 0, vacas: 18, bezerros: 10 };
  const historico: Movimentacao[] = [
    passado(37, "recusada", "pq-milho", "pq-macarrao", "pq-macarrao", vacas, 0.34, 0.58,
      "Piquete Milho estava com NDVI 0,34, abaixo de 0,35. Piquete Macarrão era o livre apto com NDVI mais alto."),
    passado(51, "aceita", "pq-feijao", "pq-abobora", "pq-abobora", { bois: 12, vacas: 6, bezerros: 5 }, 0.24, 0.66,
      "Piquete Feijão estava com NDVI 0,24, abaixo de 0,35. Piquete Abóbora era o livre apto com NDVI mais alto."),
    passado(58, "trocada", "pq-macarrao", "pq-milho", "pq-abobora", vacas, 0.33, 0.6,
      "Piquete Macarrão estava com NDVI 0,33, abaixo de 0,35. Piquete Abóbora era o livre apto com NDVI mais alto."),
  ];

  return { fazenda, piquetes, lotacao, ndvi, clima, historico };
}
