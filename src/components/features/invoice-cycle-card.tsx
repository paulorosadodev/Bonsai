import { CalendarClock, CheckCircle2, Sparkles } from "lucide-react";
import { formatDayMonth, formatMonthLabel } from "@/components/features/params";
import { getLiveBillingCycleState, type CivilDate } from "@/lib/domain/billing-cycle";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";

interface InvoiceCycleCardProps {
    closingDay: number;
    dueDay: number;
    today: CivilDate;
    className?: string;
}

function daysCountdownText(days: number): string {
    if (days === 0) return "hoje";
    if (days === 1) return "amanhã";
    if (days < 0) return `${Math.abs(days)}d atrás`;
    return `em ${days}d`;
}

export function InvoiceCycleCard({ closingDay, dueDay, today, className }: InvoiceCycleCardProps) {
    const cycle = getLiveBillingCycleState(today, closingDay, dueDay);

    const isClosingToday = cycle.kind === "closing_today";
    const isDueToday = cycle.kind === "due_today";
    const isPendingPayment = cycle.kind === "closed_pending_payment";

    const openMonthShort = formatMonthLabel(cycle.openMonth).split(" de ")[0];
    const prevMonthShort = formatMonthLabel(cycle.prevMonth).split(" de ")[0];

    // Status label & badge
    let statusPill = `Fatura Aberta • ${openMonthShort}`;
    let pillColor = "bg-mint/15 text-mint border-mint/30";
    let summaryText = `Compras caem em ${openMonthShort} e fecham ${daysCountdownText(cycle.daysUntilClosing)} (${formatDayMonth(cycle.openClosingDate)}).`;

    if (isClosingToday) {
        statusPill = "Fechamento Hoje • Melhor Dia!";
        pillColor = "bg-violet/20 text-orchid border-violet/40";
        summaryText = `Fatura de ${prevMonthShort} fechou hoje. Compras a partir de agora só vencem em ${formatDayMonth(cycle.openDueDate)}.`;
    } else if (isDueToday) {
        statusPill = `Vencimento Hoje • ${prevMonthShort}`;
        pillColor = "bg-warning/20 text-warning border-warning/40";
        summaryText = `A fatura de ${prevMonthShort} vence hoje (${formatDayMonth(cycle.prevDueDate)}). Novas compras entram em ${openMonthShort}.`;
    } else if (isPendingPayment) {
        statusPill = `Fatura Fechada • ${prevMonthShort}`;
        pillColor = "bg-orchid/15 text-orchid border-orchid/30";
        summaryText = `${prevMonthShort} vence ${daysCountdownText(cycle.daysUntilPrevDue)} (${formatDayMonth(cycle.prevDueDate)}). Novas compras em ${openMonthShort} fecham ${daysCountdownText(cycle.daysUntilClosing)}.`;
    }

    return (
        <Card role="region" aria-label="Status do calendário da fatura" className={cn("flex flex-col gap-2.5 border border-orchid/15 bg-surface px-3.5 py-3 shadow-xs", className)}>
            {/* Top row: Status pill + Today date */}
            <div className="flex items-center justify-between gap-2">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", pillColor)}>
                    <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
                    </span>
                    {statusPill}
                </span>

                <span className="text-[11px] font-medium text-muted tabular">Hoje: {formatDayMonth(today)}</span>
            </div>

            {/* Quick narrative summary */}
            <p className="text-[11px] leading-tight text-muted">{summaryText}</p>

            {/* Micro progress line */}
            <div className="relative h-1 w-full overflow-hidden rounded-full bg-surface-raised">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: `${cycle.cycleProgressPct}%`,
                        backgroundImage: "linear-gradient(to right, var(--violet), var(--mint))",
                    }}
                />
            </div>

            {/* Bottom row: Inline compact milestones */}
            <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] tabular">
                {/* Fechamento */}
                <div className="flex items-center gap-1 text-muted">
                    <CalendarClock className="size-3 text-violet shrink-0" aria-hidden />
                    <span>
                        Fecha: <strong className="font-semibold text-text">{formatDayMonth(cycle.openClosingDate)}</strong> ({daysCountdownText(cycle.daysUntilClosing)})
                    </span>
                </div>

                {/* Vencimento */}
                <div className="flex items-center gap-1 text-muted">
                    <CheckCircle2 className="size-3 text-mint shrink-0" aria-hidden />
                    <span>
                        {isPendingPayment || isDueToday ? "Pagar: " : "Vence: "}
                        <strong className="font-semibold text-text">{formatDayMonth(isPendingPayment || isDueToday ? cycle.prevDueDate : cycle.openDueDate)}</strong> ({daysCountdownText(isPendingPayment || isDueToday ? cycle.daysUntilPrevDue : cycle.daysUntilOpenDue)})
                    </span>
                </div>

                {/* Melhor dia */}
                <div className="hidden sm:flex items-center gap-1 text-muted">
                    <Sparkles className="size-3 text-orchid shrink-0" aria-hidden />
                    <span>
                        Melhor dia: <strong className="font-semibold text-orchid">{isClosingToday ? "Hoje!" : formatDayMonth(cycle.openClosingDate)}</strong>
                    </span>
                </div>
            </div>
        </Card>
    );
}
