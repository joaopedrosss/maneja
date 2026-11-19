// Regras determinísticas de validação. Toda movimentação, sugerida pelo agente ou
// escolhida à mão, passa por validarMovimento antes de aparecer ou ser registrada.
// Cada regra devolve o motivo da reprovação, ou null quando aprova.

import { decimal } from "./datas";
import { ultimaLeitura } from "./ndvi";
import { lotacaoDe } from "./rebanho";
import type { LeituraNdvi, Lotacao, Piquete, Rebanho } from "./tipos";

export const NDVI_MINIMO_DESTINO = 0.5;
export const UA_MAX_POR_HA = 6;

const UA_POR_CATEGORIA: Record<keyof Rebanho, number> = { bois: 1, vacas: 1, bezerros: 0.4 };

export function uaDoRebanho(r: Rebanho): number {
  return r.bois * UA_POR_CATEGORIA.bois + r.vacas * UA_POR_CATEGORIA.vacas + r.bezerros * UA_POR_CATEGORIA.bezerros;
}

export interface DadosValidacao {
  piquetes: Piquete[];
  ndvi: LeituraNdvi[];
  lotacao: Lotacao[];
  hoje: string;
}

export function destinoExiste(piquetes: Piquete[], destinoId: string): string | null {
  return piquetes.some((p) => p.id === destinoId) ? null : "o piquete de destino não existe mais";
}

export function destinoLivre(lotacao: Lotacao[], destino: Piquete): string | null {
  return lotacaoDe(lotacao, destino.id) ? `${destino.nome} já está ocupado` : null;
}

export function ndviAcimaDoMinimo(ndvi: LeituraNdvi[], destino: Piquete, hoje: string): string | null {
  const leitura = ultimaLeitura(ndvi, destino.id, hoje);
  if (leitura === null) return `${destino.nome} não tem leitura de NDVI`;
  if (leitura.valor < NDVI_MINIMO_DESTINO) {
    return `${destino.nome} tem NDVI ${decimal(leitura.valor, 2)}, abaixo do mínimo de ${decimal(NDVI_MINIMO_DESTINO, 2)}`;
  }
  return null;
}

export function rebanhoCabeNaArea(rebanho: Rebanho, destino: Piquete): string | null {
  const ua = uaDoRebanho(rebanho);
  const maximo = destino.area_ha * UA_MAX_POR_HA;
  if (ua <= maximo) return null;
  return `o rebanho (${decimal(ua, 1)} UA) não cabe em ${destino.nome} (máximo de ${decimal(maximo, 1)} UA em ${decimal(destino.area_ha, 2)} ha)`;
}

// Lista vazia = movimentação aprovada.
export function validarMovimento(destinoId: string, rebanho: Rebanho, dados: DadosValidacao): string[] {
  const inexistente = destinoExiste(dados.piquetes, destinoId);
  if (inexistente !== null) return [inexistente];
  const destino = dados.piquetes.find((p) => p.id === destinoId)!;
  return [
    destinoLivre(dados.lotacao, destino),
    ndviAcimaDoMinimo(dados.ndvi, destino, dados.hoje),
    rebanhoCabeNaArea(rebanho, destino),
  ].filter((motivo) => motivo !== null);
}
