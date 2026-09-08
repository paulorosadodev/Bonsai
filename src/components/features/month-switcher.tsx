"use client";

import { useOptimistic, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useFinancePending } from "@/components/layout/finance-pending";
import { formatMonthLabel, shiftMonth } from "./params";

export function MonthSwitcher({ month }: { month: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { pending, pendingKind, start } = useFinancePending();
    const [optimisticMonth, setOptimisticMonth] = useOptimistic(month);
    const [pendingDirection, setPendingDirection] = useState<-1 | 1 | null>(null);

    const isMonthPending = pending && pendingKind === "month";

    const prevMonth = shiftMonth(optimisticMonth, -1);
    const nextMonth = shiftMonth(optimisticMonth, 1);

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

    return (
        <nav aria-label="Competência" className="flex items-center justify-between gap-2">
            <Link
                href={prevHref}
                aria-label="Mês anterior"
                className="inline-flex size-11 items-center justify-center rounded-xl text-orchid"
                aria-busy={isMonthPending && pendingDirection === -1 ? true : undefined}
                onClick={(e) => {
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    navigateToMonth(prevMonth, prevHref, -1);
                }}
            >
                {isMonthPending && pendingDirection === -1 ? <LoaderCircle className="size-6 animate-spin text-orchid" aria-hidden /> : <ChevronLeft className="size-6" aria-hidden />}
            </Link>
            <h1 className="text-center text-2xl font-bold">{formatMonthLabel(optimisticMonth)}</h1>
            <Link
                href={nextHref}
                aria-label="Próximo mês"
                className="inline-flex size-11 items-center justify-center rounded-xl text-orchid"
                aria-busy={isMonthPending && pendingDirection === 1 ? true : undefined}
                onClick={(e) => {
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    navigateToMonth(nextMonth, nextHref, 1);
                }}
            >
                {isMonthPending && pendingDirection === 1 ? <LoaderCircle className="size-6 animate-spin text-orchid" aria-hidden /> : <ChevronRight className="size-6" aria-hidden />}
            </Link>
        </nav>
    );
}
