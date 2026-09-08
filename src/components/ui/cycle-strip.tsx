import { formatDayMonth } from "@/components/features/params";
import { createCivilDate, lastDayOfMonth, type CivilDate } from "@/lib/domain/billing-cycle";
import { cn } from "./cn";

function civilUtc(civil: string) {
    const [year, month, day] = civil.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
}

const itemPriority = { today: 1, close: 2, due: 3 };

export function CycleStrip({ month, closingDay, dueDay, today, className }: { month?: string; closingDay: number; dueDay: number; today: CivilDate; className?: string }) {
    const activeMonth = month ?? today.slice(0, 7);
    const [year, monthNum] = activeMonth.split("-").map(Number);
    const totalDays = lastDayOfMonth(year, monthNum);

    const startDate = createCivilDate(year, monthNum, 1);
    const endDate = createCivilDate(year, monthNum, totalDays);

    const closingDayClamped = Math.min(closingDay, totalDays);
    const dueDayClamped = Math.min(dueDay, totalDays);
    const closingDate = createCivilDate(year, monthNum, closingDayClamped);
    const dueDate = createCivilDate(year, monthNum, dueDayClamped);

    const startUtc = civilUtc(startDate);
    const endUtc = civilUtc(endDate);
    const span = endUtc - startUtc;

    const closePct = span > 0 ? ((civilUtc(closingDate) - startUtc) / span) * 100 : 50;
    const duePct = span > 0 ? ((civilUtc(dueDate) - startUtc) / span) * 100 : 50;

    // Se hoje for anterior ao mês selecionado, fica travado na esquerda (0%).
    // Se hoje for posterior ao mês selecionado, fica travado na direita (100%).
    const rawTodayPct = span > 0 ? ((civilUtc(today) - startUtc) / span) * 100 : 50;
    const todayPct = Math.max(0, Math.min(100, rawTodayPct));

    const fillStart = Math.min(closePct, duePct);
    const fillWidth = Math.abs(duePct - closePct);
    const fill = closePct < duePct ? "linear-gradient(to right, var(--violet), var(--orchid))" : "linear-gradient(to right, var(--orchid), var(--violet))";

    const labels = [
        { key: "today", utc: civilUtc(today), swatch: "bg-mint", text: "text-mint", caption: "Hoje", date: today },
        { key: "close", utc: civilUtc(closingDate), swatch: "bg-violet", text: "text-text", caption: "Fecha", date: closingDate },
        { key: "due", utc: civilUtc(dueDate), swatch: "bg-orchid", text: "text-text", caption: "Vence", date: dueDate },
    ].toSorted((a, b) => a.utc - b.utc || itemPriority[a.key as keyof typeof itemPriority] - itemPriority[b.key as keyof typeof itemPriority]);

    return (
        <section aria-label="Ciclo da fatura" className={cn("rounded-2xl bg-surface px-3 py-3", className)}>
            <p className="sr-only">{`Ciclo da fatura: fecha ${formatDayMonth(closingDate)}, vence ${formatDayMonth(dueDate)}. Hoje é ${formatDayMonth(today)}.`}</p>
            <div className="mb-1 flex items-center justify-between px-1 text-[11px] font-medium text-muted/60 tabular">
                <span>01</span>
                <span>{String(totalDays).padStart(2, "0")}</span>
            </div>
            <div className="relative h-4" aria-hidden>
                <div className="absolute inset-y-0 left-2 right-2">
                    <div className="absolute inset-x-0 top-1.5 h-1 rounded-full bg-surface-raised" />
                    <div className="absolute top-1.5 h-1 rounded-full" style={{ left: `${fillStart}%`, width: `${fillWidth}%`, backgroundImage: fill }} />
                    <span className="absolute top-0 size-4 -translate-x-1/2 rounded-full bg-violet shadow-xs" style={{ left: `${closePct}%` }} title={`Fecha: ${formatDayMonth(closingDate)}`} />
                    <span className="absolute top-0 size-4 -translate-x-1/2 rounded-full bg-orchid shadow-xs" style={{ left: `${duePct}%` }} title={`Vence: ${formatDayMonth(dueDate)}`} />
                    <span className="absolute top-0.5 z-10 size-3 -translate-x-1/2 rounded-full bg-mint ring-2 ring-surface shadow-xs transition-all duration-300" style={{ left: `${todayPct}%` }} title={`Hoje: ${formatDayMonth(today)}`} />
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
