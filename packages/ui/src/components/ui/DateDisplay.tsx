export interface DateDisplayProps {
  date: string | Date;
  locale?: string;
  className?: string;
}

/**
 * UTC-based date formatter. Avoids TZ drift on `@db.Date` columns
 * ("2026-01-30T00:00:00.000Z" -> 30/01/2026 regardless of viewer TZ).
 */
export function DateDisplay({ date, locale = "pt-BR", className }: DateDisplayProps) {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();

  const formatted =
    locale === "pt-BR" ? `${day}/${month}/${year}` : `${year}-${month}-${day}`;

  return <span className={className}>{formatted}</span>;
}
