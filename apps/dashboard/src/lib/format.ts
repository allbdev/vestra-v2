/** BRL money formatter. Pass already-converted decimal (e.g. 1234.56). */
export function formatMoney(value: number, locale = "pt-BR", currency = "BRL"): string {
  return value.toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Compact BRL — short form for chart axis ticks.
 * 1234 → "R$ 1,2k" · 1_500_000 → "R$ 1,5M" · negatives keep sign.
 */
export function formatMoneyCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

  if (abs >= 1_000_000_000) return `${sign}R$ ${fmt(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}R$ ${fmt(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}R$ ${fmt(abs / 1_000)}k`;
  return `${sign}R$ ${fmt(abs)}`;
}

/** UTC-safe ISO -> dd/mm/yyyy. Mirrors @vestra/ui DateDisplay logic. */
export function formatDateBR(date: string | Date): string {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** UTC date YYYY-MM-DD from a Date — never shifts with TZ. */
export function toDateInputValue(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
