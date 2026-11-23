import type { Lotacao, Rebanho } from "./tipos";

export const REBANHO_VAZIO: Rebanho = { bois: 0, vacas: 0, bezerros: 0 };

export function totalAnimais(r: Rebanho): number {
  return r.bois + r.vacas + r.bezerros;
}

function categoria(n: number, singular: string, plural: string): string | null {
  if (n === 0) return null;
  return `${n} ${n === 1 ? singular : plural}`;
}

export function descreverRebanho(r: Rebanho): string {
  const partes = [
    categoria(r.bois, "boi", "bois"),
    categoria(r.vacas, "vaca", "vacas"),
    categoria(r.bezerros, "bezerro", "bezerros"),
  ].filter((p) => p !== null);
  return partes.length > 0 ? partes.join(", ") : "sem animais";
}

// Piquete sem linha de lotação, ou com total 0, está livre.
export function lotacaoDe(lotacao: Lotacao[], piqueteId: string): Lotacao | null {
  return lotacao.find((l) => l.piquete_id === piqueteId && totalAnimais(l) > 0) ?? null;
}
