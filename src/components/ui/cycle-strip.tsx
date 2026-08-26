import { formatDayMonth } from "@/components/features/params";
import { getPurchaseInvoiceCycle, type CivilDate } from "@/lib/domain/billing-cycle";
import { cn } from "./cn";

function civilUtc(civil: string) {
    const [year, month, day] = civil.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
}

function datePercent(value: string, start: number, span: number) {
    if (span === 0) {
        return 50;
    }

    return ((civilUtc(value) - start) / span) * 100;
}

export function CycleStrip({ closingDay, dueDay, today, className }: { closingDay: number; dueDay: number; today: CivilDate; className?: string }) {
    const { closingDate, dueDate } = getPurchaseInvoiceCycle(today, closingDay, dueDay);
    const start = Math.min(civilUtc(today), civilUtc(closingDate), civilUtc(dueDate));
    const end = Math.max(civilUtc(today), civilUtc(closingDate), civilUtc(dueDate));
    const span = end - start;
    const closePct = datePercent(closingDate, start, span);
    const duePct = datePercent(dueDate, start, span);
    const todayPct = datePercent(today, start, span);
    const fillStart = Math.min(closePct, duePct);
    const fill = "linear-gradient(to right, var(--violet), var(--orchid))";
    const labels = [
        { key: "today", utc: civilUtc(today), swatch: "bg-mint", text: "text-mint", caption: "Hoje", date: today },
        { key: "close", utc: civilUtc(closingDate), swatch: "bg-violet", text: "text-text", caption: "Fecha", date: closingDate },
        { key: "due", utc: civilUtc(dueDate), swatch: "bg-orchid", text: "text-text", caption: "Vence", date: dueDate },
    ].toSorted((a, b) => a.utc - b.utc);

    return (
        <section aria-label="Ciclo da fatura" className={cn("rounded-2xl bg-surface px-3 py-3", className)}>
            <p className="sr-only">{`Ciclo da fatura da compra de hoje: fecha ${formatDayMonth(closingDate)}, vence ${formatDayMonth(dueDate)}. Hoje é ${formatDayMonth(today)}.`}</p>
            <div className="relative h-4" aria-hidden>
                <div className="absolute inset-y-0 left-2 right-2">
                    <div className="absolute inset-x-0 top-1.5 h-1 rounded-full bg-surface-raised" />
                    <div className="absolute top-1.5 h-1 rounded-full" style={{ left: `${fillStart}%`, width: `${Math.abs(duePct - closePct)}%`, backgroundImage: fill }} />
                    <span className="absolute top-0 size-4 -translate-x-1/2 rounded-full bg-violet" style={{ left: `${closePct}%` }} />
                    <span className="absolute top-0 size-4 -translate-x-1/2 rounded-full bg-orchid" style={{ left: `${duePct}%` }} />
                    <span className="absolute top-0.5 size-3 -translate-x-1/2 rounded-full bg-mint ring-2 ring-surface" style={{ left: `${todayPct}%` }} />
                </div>
            </div>
            <div className="mt-2 flex items-start justify-between gap-1 text-xs text-muted">
                {labels.map((item) => (
                    <span key={item.key} className="inline-flex min-w-0 items-baseline gap-1.5 tabular">
                        <span className={cn("size-2 shrink-0 self-center rounded-full", item.swatch)} aria-hidden />
                        <span>
                            {item.caption} <span className={cn("font-semibold", item.text)}>{formatDayMonth(item.date)}</span>
                        </span>
                    </span>
                ))}
            </div>
        </section>
    );
}
