import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { formatBrl } from "@/lib/domain/money";
import { cn } from "@/components/ui/cn";

export function MonthComparison({ currentCents, previousCents, className }: { currentCents: number; previousCents: number; className?: string }) {
    if (previousCents === 0 && currentCents === 0) {
        return (
            <span title="Sem gastos no mês anterior" className={cn("inline-flex items-baseline gap-1 text-xs tabular text-muted", className)}>
                <Minus className="size-3 self-center shrink-0" aria-hidden />
                <span>0%</span>
            </span>
        );
    }

    if (previousCents === 0 && currentCents > 0) {
        return (
            <span title="Mês anterior sem registros" className={cn("inline-flex items-baseline gap-1 text-sm font-semibold tabular text-danger", className)}>
                <TrendingUp className="size-3.5 self-center shrink-0" aria-hidden />
                <span className="text-xs font-normal text-muted">(+{formatBrl(currentCents)})</span>
            </span>
        );
    }

    if (previousCents > 0 && currentCents === 0) {
        return (
            <span title="Redução de 100% em relação ao mês anterior" className={cn("inline-flex items-baseline gap-1 text-sm font-semibold tabular text-mint", className)}>
                <TrendingDown className="size-3.5 self-center shrink-0" aria-hidden />
                <span>-100%</span>
                <span className="text-xs font-normal text-muted">(-{formatBrl(previousCents)})</span>
            </span>
        );
    }

    const diff = currentCents - previousCents;

    if (diff > 0) {
        const percent = Math.round((diff / previousCents) * 100);
        return (
            <span title={`+${percent}% (+${formatBrl(diff)}) em relação ao mês anterior`} className={cn("inline-flex items-baseline gap-1 text-sm font-semibold tabular text-danger", className)}>
                <TrendingUp className="size-3.5 self-center shrink-0" aria-hidden />
                <span>+{percent}%</span>
                <span className="text-xs font-normal text-muted">(+{formatBrl(diff)})</span>
            </span>
        );
    }

    if (diff < 0) {
        const absDiff = Math.abs(diff);
        const percent = Math.round((absDiff / previousCents) * 100);
        return (
            <span title={`-${percent}% (-${formatBrl(absDiff)}) em relação ao mês anterior`} className={cn("inline-flex items-baseline gap-1 text-sm font-semibold tabular text-mint", className)}>
                <TrendingDown className="size-3.5 self-center shrink-0" aria-hidden />
                <span>-{percent}%</span>
                <span className="text-xs font-normal text-muted">(-{formatBrl(absDiff)})</span>
            </span>
        );
    }

    return (
        <span title="Mesmo valor do mês anterior" className={cn("inline-flex items-baseline gap-1 text-xs tabular text-muted", className)}>
            <Minus className="size-3 self-center shrink-0" aria-hidden />
            <span>0%</span>
        </span>
    );
}
