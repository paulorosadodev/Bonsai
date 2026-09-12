"use client";

import { useOptimistic, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useFinancePending } from "@/components/layout/finance-pending";
import { YearCalendarPicker } from "@/components/ui/year-calendar-picker";
import { cn } from "@/components/ui/cn";
import { formatYearLabel, shiftYear } from "./params";

export function YearSwitcher({ year }: { year: number }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { pending, pendingKind, start } = useFinancePending();
    const [optimisticYear, setOptimisticYear] = useOptimistic(year);
    const [pendingDirection, setPendingDirection] = useState<-1 | 1 | null>(null);

    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const isYearPending = pending && pendingKind === "year";

    const prevYear = shiftYear(optimisticYear, -1);
    const nextYear = shiftYear(optimisticYear, 1);

    const hrefFor = (targetYear: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", "annual");
        params.set("year", String(targetYear));
        params.delete("month");
        const query = params.toString();
        return query ? `${pathname}?${query}` : pathname;
    };

    const prevHref = hrefFor(prevYear);
    const nextHref = hrefFor(nextYear);

    const navigateToYear = (targetYear: number, targetHref: string, direction: -1 | 1) => {
        setPendingDirection(direction);
        start(() => {
            setOptimisticYear(targetYear);
            router.push(targetHref, { scroll: false });
        }, "year");
    };

    const handleSelectTargetYear = (targetYear: number) => {
        if (targetYear === optimisticYear) {
            setIsCalendarOpen(false);
            return;
        }
        const targetHref = hrefFor(targetYear);
        const direction = targetYear > optimisticYear ? 1 : -1;
        navigateToYear(targetYear, targetHref, direction);
        setIsCalendarOpen(false);
    };

    return (
        <nav aria-label="Ano" className="flex items-center justify-between gap-2">
            <Link
                href={prevHref}
                aria-label="Ano anterior"
                className="inline-flex size-11 items-center justify-center rounded-xl text-orchid transition-colors hover:bg-surface-raised/40 focus-visible:outline-2 focus-visible:outline-violet active:scale-95"
                aria-busy={isYearPending && pendingDirection === -1 ? true : undefined}
                onClick={(e) => {
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    setIsCalendarOpen(false);
                    navigateToYear(prevYear, prevHref, -1);
                }}
            >
                {isYearPending && pendingDirection === -1 ? <LoaderCircle className="size-6 animate-spin text-orchid" aria-hidden /> : <ChevronLeft className="size-6" aria-hidden />}
            </Link>

            {/* Cabeçalho de Ano Clicável */}
            <div className="relative flex items-center justify-center">
                <h1 className="sr-only">{formatYearLabel(optimisticYear)}</h1>

                <button
                    type="button"
                    onClick={() => setIsCalendarOpen((prev) => !prev)}
                    className={cn("tabular rounded-2xl px-4 py-1 text-2xl font-bold tracking-tight text-text transition-all duration-150 hover:bg-surface-raised hover:text-orchid active:scale-95 focus-visible:outline-2 focus-visible:outline-violet", isCalendarOpen ? "border border-violet/30 bg-surface-raised/80 shadow-[0_0_15px_rgba(167,139,250,0.15)]" : "border border-transparent hover:border-white/5")}
                    aria-label={`Ano: ${optimisticYear}. Clique para abrir o seletor de ano`}
                    aria-expanded={isCalendarOpen}
                    aria-haspopup="dialog"
                >
                    {optimisticYear}
                </button>

                <YearCalendarPicker year={optimisticYear} isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onSelect={handleSelectTargetYear} />
            </div>

            <Link
                href={nextHref}
                aria-label="Próximo ano"
                className="inline-flex size-11 items-center justify-center rounded-xl text-orchid transition-colors hover:bg-surface-raised/40 focus-visible:outline-2 focus-visible:outline-violet active:scale-95"
                aria-busy={isYearPending && pendingDirection === 1 ? true : undefined}
                onClick={(e) => {
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    setIsCalendarOpen(false);
                    navigateToYear(nextYear, nextHref, 1);
                }}
            >
                {isYearPending && pendingDirection === 1 ? <LoaderCircle className="size-6 animate-spin text-orchid" aria-hidden /> : <ChevronRight className="size-6" aria-hidden />}
            </Link>
        </nav>
    );
}
