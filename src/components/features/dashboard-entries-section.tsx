"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { paymentMethodLabels, type CategoryOption, type GeneralTagOption, type SpecificTagOption } from "@/lib/domain/catalog";
import { formatBrl } from "@/lib/domain/money";
import type { DashboardEntryItem } from "@/lib/data/types";
import type { TransactionFilters as TransactionFiltersType } from "@/lib/domain/schemas";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { VisualBadge } from "@/components/ui/visual-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCivilDate } from "./params";
import { TransactionFilters } from "./transaction-filters";
import { getItemVisual, paymentVisuals, recurringVisual } from "./transaction-visuals";

function paymentLabel(item: DashboardEntryItem) {
    if (item.paymentMethod === "pix") {
        return paymentMethodLabels.pix;
    }

    if (item.installmentCount > 1) {
        return `${paymentMethodLabels.credit} ${item.installmentNumber}/${item.installmentCount}`;
    }

    return `${paymentMethodLabels.credit} à vista`;
}

interface DashboardEntriesSectionProps {
    entries: DashboardEntryItem[];
    totalCents: number;
    filteredTotalCents: number;
    filters: Pick<TransactionFiltersType, "month" | "category" | "paymentMethod" | "generalTag" | "specificTag" | "search" | "sort">;
    categories: CategoryOption[];
    generalTags: GeneralTagOption[];
    specificTags: SpecificTagOption[];
}

export function DashboardEntriesSection({
    entries,
    totalCents,
    filteredTotalCents,
    filters,
    categories,
    generalTags,
    specificTags,
}: DashboardEntriesSectionProps) {
    const hasActiveFilters = Boolean(
        filters.search ||
        filters.category ||
        filters.paymentMethod ||
        filters.generalTag ||
        filters.specificTag ||
        (filters.sort && filters.sort !== "date_desc")
    );

    const [userToggle, setUserToggle] = useState<boolean | null>(null);
    const [prevHasActiveFilters, setPrevHasActiveFilters] = useState(hasActiveFilters);

    if (hasActiveFilters !== prevHasActiveFilters) {
        setPrevHasActiveFilters(hasActiveFilters);
        setUserToggle(null);
    }

    const isOpen = userToggle !== null ? userToggle : hasActiveFilters;

    const handleToggle = () => {
        setUserToggle(!isOpen);
    };

    return (
        <section className="flex flex-col gap-3">
            <Card
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={handleToggle}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggle();
                    }
                }}
                className="flex flex-col gap-2 cursor-pointer select-none transition-colors hover:bg-surface-raised/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <h2 className="text-lg font-bold text-text">Composição dos Gastos</h2>
                        <p className="text-xs text-muted">
                            {entries.length === 1 ? "1 lançamento" : `${entries.length} lançamentos`} • {formatBrl(totalCents)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted">{isOpen ? "Ocultar" : "Ver todos"}</span>
                        <ChevronDown className={cn("size-5 text-muted transition-transform duration-200", isOpen && "rotate-180 text-violet")} aria-hidden />
                    </div>
                </div>
            </Card>

            {isOpen ? (
                <div className="flex flex-col gap-3">
                    <TransactionFilters
                        values={filters}
                        categories={categories}
                        generalTags={generalTags}
                        specificTags={specificTags}
                        showPaymentMethod={true}
                        searchPlaceholder="Buscar nos gastos do mês..."
                    />

                    {hasActiveFilters && entries.length > 0 ? (
                        <div className="flex items-center justify-between px-1 text-xs text-muted">
                            <span>
                                {entries.length} {entries.length === 1 ? "lançamento encontrado" : "lançamentos encontrados"}
                            </span>
                            <span className="font-medium text-text">
                                Total filtrado: {formatBrl(filteredTotalCents)}
                            </span>
                        </div>
                    ) : null}

                    {entries.length === 0 ? (
                        <EmptyState
                            title={hasActiveFilters ? "Nenhum lançamento neste filtro" : "Ainda não há lançamentos neste mês"}
                            description={hasActiveFilters ? "Tente ajustar ou limpar os filtros para ver outros gastos." : "Quando houver despesas ou parcelas neste mês, elas aparecem aqui."}
                        />
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {entries.map((item) => (
                                <li key={item.id}>
                                    <Link href={item.editHref} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 flex-col gap-1">
                                                <p className="font-medium text-text">{item.name}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted">
                                                    <span className="tabular">{formatCivilDate(item.purchaseDate)}</span>
                                                    {item.description ? (
                                                        <>
                                                            <span>•</span>
                                                            <span className="truncate max-w-48">{item.description}</span>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <p className="tabular font-medium text-text">{formatBrl(item.amountCents)}</p>
                                                <ChevronRight className="size-4 text-muted" aria-hidden />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <VisualBadge visual={paymentVisuals[item.paymentMethod]}>{paymentLabel(item)}</VisualBadge>
                                            <VisualBadge visual={getItemVisual(item.category)}>{item.category.name}</VisualBadge>
                                            {item.specificTag ? <VisualBadge visual={getItemVisual(item.specificTag)}>{item.specificTag.name}</VisualBadge> : null}
                                            {item.isRecurring ? <VisualBadge visual={recurringVisual}>Recorrente</VisualBadge> : null}
                                        </div>
                                        {item.generalTags.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {item.generalTags.map((tag) => (
                                                    <VisualBadge key={tag.id} visual={getItemVisual(tag)}>
                                                        {tag.name}
                                                    </VisualBadge>
                                                ))}
                                            </div>
                                        ) : null}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </section>
    );
}
