"use client";

import { useOptimistic, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useFinancePending } from "@/components/layout/finance-pending";
import { MonthCalendarPicker } from "@/components/ui/month-calendar-picker";
import { cn } from "@/components/ui/cn";
import { formatMonthLabel, shiftMonth, splitMonthLabel } from "./params";

export function MonthSwitcher({ month }: { month: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { pending, pendingKind, start } = useFinancePending();
    const [optimisticMonth, setOptimisticMonth] = useOptimistic(month);
    const [pendingDirection, setPendingDirection] = useState<-1 | 1 | null>(null);

    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarMode, setCalendarMode] = useState<"months" | "years">("months");

    const isMonthPending = pending && pendingKind === "month";

    const prevMonth = shiftMonth(optimisticMonth, -1);
    const nextMonth = shiftMonth(optimisticMonth, 1);

    const { monthName, year: currentYear } = splitMonthLabel(optimisticMonth);

    const hrefFor = (targetMonth: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("month", targetMonth);
        const query = params.toString();
        return query ? `${pathname}?${query}` : pathname;
    };

    const prevHref = hrefFor(prevMonth);
    const nextHref = hrefFor(nextMonth);

    const navigateToMonth = (targetMonth: string, targetHref: string, direction: -1 | 1) => {
        setPendingDirection(direction);
        start(() => {
            setOptimisticMonth(targetMonth);
            router.push(targetHref, { scroll: false });
        }, "month");
    };

    const handleOpenMonths = () => {
        setCalendarMode("months");
        setIsCalendarOpen(true);
    };

    const handleOpenYears = () => {
        setCalendarMode("years");
        setIsCalendarOpen(true);
    };

    const handleSelectTargetMonth = (targetMonth: string) => {
        if (targetMonth === optimisticMonth) {
            setIsCalendarOpen(false);
            return;
        }
        const targetHref = hrefFor(targetMonth);
        const direction = targetMonth > optimisticMonth ? 1 : -1;
        navigateToMonth(targetMonth, targetHref, direction);
        setIsCalendarOpen(false);
    };

    return (
        <nav aria-label="Competência" className="flex items-center justify-between gap-2">
            <Link
                href={prevHref}
                aria-label="Mês anterior"
                className="inline-flex size-11 items-center justify-center rounded-xl text-orchid transition-colors hover:bg-surface-raised/40 focus-visible:outline-2 focus-visible:outline-violet active:scale-95"
                aria-busy={isMonthPending && pendingDirection === -1 ? true : undefined}
                onClick={(e) => {
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    setIsCalendarOpen(false);
                    navigateToMonth(prevMonth, prevHref, -1);
                }}
            >
                {isMonthPending && pendingDirection === -1 ? <LoaderCircle className="size-6 animate-spin text-orchid" aria-hidden /> : <ChevronLeft className="size-6" aria-hidden />}
            </Link>

            {/* Cabeçalho de Competência com Mês e Ano Clicáveis */}
            <div className="relative flex items-center justify-center">
                <h1 className="sr-only">{formatMonthLabel(optimisticMonth)}</h1>

                <div className={cn("group/trigger flex items-center gap-1 rounded-2xl border border-transparent p-1 transition-all duration-150", isCalendarOpen ? "border-violet/30 bg-surface-raised/80 shadow-[0_0_15px_rgba(167,139,250,0.15)]" : "hover:border-white/5 hover:bg-surface/50")}>
                    <button type="button" onClick={handleOpenMonths} className="rounded-xl px-2 py-0.5 text-2xl font-bold tracking-tight text-text transition-all duration-150 hover:bg-surface-raised hover:text-orchid active:scale-95 focus-visible:outline-2 focus-visible:outline-violet" aria-label={`Mês: ${monthName}. Clique para abrir o calendário de seleção de meses`} aria-expanded={isCalendarOpen && calendarMode === "months"} aria-haspopup="dialog">
                        {monthName}
                    </button>

                    <span className="select-none text-base font-normal text-muted/60">de</span>

                    <button type="button" onClick={handleOpenYears} className="tabular rounded-xl px-2 py-0.5 text-2xl font-bold tracking-tight text-text transition-all duration-150 hover:bg-surface-raised hover:text-orchid active:scale-95 focus-visible:outline-2 focus-visible:outline-violet" aria-label={`Ano: ${currentYear}. Clique para abrir a seleção de anos`} aria-expanded={isCalendarOpen && calendarMode === "years"} aria-haspopup="dialog">
                        {currentYear}
                    </button>
                </div>

                <MonthCalendarPicker value={optimisticMonth} isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onSelect={handleSelectTargetMonth} initialMode={calendarMode} />
            </div>

            <Link
                href={nextHref}
                aria-label="Próximo mês"
                className="inline-flex size-11 items-center justify-center rounded-xl text-orchid transition-colors hover:bg-surface-raised/40 focus-visible:outline-2 focus-visible:outline-violet active:scale-95"
                aria-busy={isMonthPending && pendingDirection === 1 ? true : undefined}
                onClick={(e) => {
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    setIsCalendarOpen(false);
                    navigateToMonth(nextMonth, nextHref, 1);
                }}
            >
                {isMonthPending && pendingDirection === 1 ? <LoaderCircle className="size-6 animate-spin text-orchid" aria-hidden /> : <ChevronRight className="size-6" aria-hidden />}
            </Link>
        </nav>
    );
}
