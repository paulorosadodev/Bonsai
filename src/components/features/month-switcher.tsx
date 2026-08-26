import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthLabel, shiftMonth } from "./params";

export function MonthSwitcher({ month, hrefFor }: { month: string; hrefFor: (month: string) => string }) {
    return (
        <nav aria-label="Competência" className="flex items-center justify-between gap-2">
            <Link href={hrefFor(shiftMonth(month, -1))} aria-label="Mês anterior" className="inline-flex size-11 items-center justify-center rounded-xl text-orchid">
                <ChevronLeft className="size-6" aria-hidden />
            </Link>
            <h1 className="text-center text-2xl font-bold">{formatMonthLabel(month)}</h1>
            <Link href={hrefFor(shiftMonth(month, 1))} aria-label="Próximo mês" className="inline-flex size-11 items-center justify-center rounded-xl text-orchid">
                <ChevronRight className="size-6" aria-hidden />
            </Link>
        </nav>
    );
}
