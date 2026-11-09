// Datas de calendário ("2026-11-09") não são instantes: tudo em UTC ao meio-dia
// para preservar o dia em qualquer fuso.

function meioDia(data: string): Date {
  return new Date(`${data}T12:00:00Z`);
}

export function dataCurta(data: string): string {
  return meioDia(data).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
}

export function dataComDia(data: string): string {
  return meioDia(data)
    .toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" })
    .replace(".,", "")
    .replace(".", "");
}

export function hojeNaFazenda(timeZone: string, agora = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)!.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function somarDias(data: string, dias: number): string {
  const d = meioDia(data);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(inicio: string, fim: string): number {
  return Math.round((meioDia(fim).getTime() - meioDia(inicio).getTime()) / 86_400_000);
}

// 0 = segunda … 6 = domingo (mesma convenção do cadastro da fazenda)
export function diaDaSemana(data: string): number {
  return (meioDia(data).getUTCDay() + 6) % 7;
}

export function fimDoPlano(inicio: string, horizonteDias: number): string {
  return somarDias(inicio, horizonteDias - 1);
}

export function decimal(valor: number, casas: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function haQuanto(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  return `há ${dias} dias`;
}
