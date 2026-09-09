"use client";

import { useOptimistic, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useFinancePending } from "@/components/layout/finance-pending";
import { formatYearLabel, shiftYear } from "./params";

export function YearSwitcher({ year }: { year: number }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { pending, pendingKind, start } = useFinancePending();
    const [optimisticYear, setOptimisticYear] = useOptimistic(year);
    const [pendingDirection, setPendingDirection] = useState<-1 | 1 | null>(null);

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

    return (
        <nav aria-label="Ano" className="flex items-center justify-between gap-2">
            <Link
                href={prevHref}
                aria-label="Ano anterior"
                className="inline-flex size-11 items-center justify-center rounded-xl text-orchid transition-colors hover:bg-surface-raised/40 focus-visible:outline-2 focus-visible:outline-violet"
                aria-busy={isYearPending && pendingDirection === -1 ? true : undefined}
                onClick={(e) => {
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    navigateToYear(prevYear, prevHref, -1);
                }}
            >
                {isYearPending && pendingDirection === -1 ? <LoaderCircle className="size-6 animate-spin text-orchid" aria-hidden /> : <ChevronLeft className="size-6" aria-hidden />}
            </Link>
            <h1 className="text-center text-2xl font-bold tracking-tight">{formatYearLabel(optimisticYear)}</h1>
            <Link
                href={nextHref}
                aria-label="Próximo ano"
                className="inline-flex size-11 items-center justify-center rounded-xl text-orchid transition-colors hover:bg-surface-raised/40 focus-visible:outline-2 focus-visible:outline-violet"
                aria-busy={isYearPending && pendingDirection === 1 ? true : undefined}
                onClick={(e) => {
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    navigateToYear(nextYear, nextHref, 1);
                }}
            >
                {isYearPending && pendingDirection === 1 ? <LoaderCircle className="size-6 animate-spin text-orchid" aria-hidden /> : <ChevronRight className="size-6" aria-hidden />}
            </Link>
        </nav>
    );
}
