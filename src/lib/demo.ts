// Dados de demonstração. Não há banco: tudo vive em memória e volta ao
// estado inicial quando a página é recarregada. As datas são relativas a "hoje"
// para que a demonstração funcione em qualquer dia.

import type { Base } from "./agente";
import { somarDias } from "./datas";
import { areaHa, poligonoEmMetros } from "./geo";
import type { Cultivar, Fazenda, GeoJsonPolygon, Lote, Medicao, Piquete } from "./tipos";

export const USUARIO = { nome: "Técnico Maneja", email: "tecnico@maneja.app" };

const CULTIVARES: Cultivar[] = [
  { id: "marandu", nome: "Marandu", altura_entrada_cm: 30, altura_saida_cm: 15, crescimento_cm_dia: 1.3, altura_maxima_cm: 80 },
  { id: "mombaca", nome: "Mombaça", altura_entrada_cm: 90, altura_saida_cm: 45, crescimento_cm_dia: 3.2, altura_maxima_cm: 160 },
  { id: "tifton", nome: "Tifton 85", altura_entrada_cm: 25, altura_saida_cm: 10, crescimento_cm_dia: 1.4, altura_maxima_cm: 50 },
];

const ORIGEM_MARCINHO: [number, number] = [-9.6205, -35.9695];
const ORIGEM_BOA_VISTA: [number, number] = [-9.6125, -35.9835];

function piquete(
  id: string,
  fazenda_id: string,
  nome: string,
  cultivar_id: string,
  geometria: GeoJsonPolygon,
): Piquete {
  return { id, fazenda_id, nome, cultivar_id, geometria, area_ha: areaHa(geometria), metodo_pastejo: "rotacionado" };
}

export function baseInicial(hoje: string): Base {
  const fazendas: Fazenda[] = [
    {
      id: "faz-marcinho",
      cliente_nome: "Cliente Marcinho",
      nome: "Fazenda do Marcinho",
      timezone: "America/Maceio",
    },
    {
      id: "faz-boa-vista",
      cliente_nome: "Cliente Ana Lúcia",
      nome: "Sítio Boa Vista",
      timezone: "America/Maceio",
    },
  ];

  const piquetes: Piquete[] = [
    piquete("pq-abobora", "faz-marcinho", "Piquete Abóbora", "marandu",
      poligonoEmMetros(ORIGEM_MARCINHO, [[-250, -10], [-150, 130], [-40, 95], [70, 20], [-15, -165]])),
    piquete("pq-jerimum", "faz-marcinho", "Piquete Jerimum", "marandu",
      poligonoEmMetros(ORIGEM_MARCINHO, [[70, 20], [190, -55], [105, -240], [-15, -165]])),
    piquete("pq-macarrao", "faz-marcinho", "Piquete Macarrão", "marandu",
      poligonoEmMetros(ORIGEM_MARCINHO, [[-130, 165], [-20, 390], [270, 225], [160, 0], [80, 45], [-35, 125]])),

    piquete("pq-baixa", "faz-boa-vista", "Piquete da Baixa", "mombaca",
      poligonoEmMetros(ORIGEM_BOA_VISTA, [[-200, -120], [-200, 110], [0, 110], [0, -120]])),
    piquete("pq-alto", "faz-boa-vista", "Piquete do Alto", "mombaca",
      poligonoEmMetros(ORIGEM_BOA_VISTA, [[0, -120], [0, 110], [190, 130], [210, -110]])),
    piquete("pq-acude", "faz-boa-vista", "Piquete do Açude", "tifton",
      poligonoEmMetros(ORIGEM_BOA_VISTA, [[-200, 110], [-160, 260], [60, 250], [0, 110]])),
  ];

  const lotes: Lote[] = [
    { id: "lote-recria", fazenda_id: "faz-marcinho", nome: "Lote Recria", n_animais: 28, peso_medio_kg: 350,
      piquete_atual_id: "pq-abobora", desde: somarDias(hoje, -6) },
    { id: "lote-vacas", fazenda_id: "faz-boa-vista", nome: "Lote Vacas", n_animais: 30, peso_medio_kg: 450,
      piquete_atual_id: "pq-baixa", desde: somarDias(hoje, -4) },
  ];

  const medicoes: Medicao[] = [
    { piquete_id: "pq-abobora", data: somarDias(hoje, -6), altura_cm: 30, origem: "campo" },
    { piquete_id: "pq-jerimum", data: somarDias(hoje, -12), altura_cm: 25, origem: "campo" },
    { piquete_id: "pq-macarrao", data: somarDias(hoje, -20), altura_cm: 70, origem: "campo" },
    { piquete_id: "pq-baixa", data: somarDias(hoje, -4), altura_cm: 62, origem: "campo" },
    { piquete_id: "pq-alto", data: somarDias(hoje, -5), altura_cm: 84, origem: "campo" },
  ];

  return { fazendas, cultivares: CULTIVARES, piquetes, lotes, medicoes };
}
