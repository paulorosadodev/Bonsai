"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, ReceiptText } from "lucide-react";
import { paymentMethodLabels, type CategoryOption, type GeneralTagOption, type SpecificTagOption } from "@/lib/domain/catalog";
import { formatBrl } from "@/lib/domain/money";
import type { DashboardEntryItem } from "@/lib/data/types";
import { withReturnUrl } from "@/lib/navigation/return-url";
import { recordNavigationState, useRestoreScroll } from "@/lib/navigation/scroll-restoration";
import type { TransactionFilters as TransactionFiltersType } from "@/lib/domain/schemas";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { VisualBadge } from "@/components/ui/visual-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCivilDate } from "./params";
import { TransactionFilters } from "./transaction-filters";
import { getItemVisual, paymentVisuals, recurringVisual, type TransactionVisual } from "./transaction-visuals";

const mixedPaymentVisual: TransactionVisual = {
    color: "#C084FC",
    icon: paymentVisuals.credit.icon,
};

function paymentLabel(item: DashboardEntryItem) {
    if (item.isMixedPayment) {
        return "Misto";
    }

    if (item.paymentMethod === "pix") {
        return paymentMethodLabels.pix;
    }

    if (item.installmentCount > 1) {
        if (item.subEntries && item.subEntries.length > 1) {
            return `${paymentMethodLabels.credit} parcelado`;
        }
        return `${paymentMethodLabels.credit} ${item.installmentNumber}/${item.installmentCount}`;
    }

    return `${paymentMethodLabels.credit} à vista`;
}

function DashboardEntryCard({ item, returnUrl, isExpanded, onToggleExpand }: { item: DashboardEntryItem; returnUrl?: string; isExpanded: boolean; onToggleExpand: () => void }) {
    const hasSubEntries = Boolean(item.subEntries && item.subEntries.length > 1);

    const dateDisplay = item.dateRangeLabel ?? formatCivilDate(item.purchaseDate);

    if (!hasSubEntries) {
        return (
            <Link id={`entry-${item.id}`} href={withReturnUrl(item.editHref, returnUrl)} onClick={() => returnUrl && recordNavigationState(returnUrl, item.id)} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                        <p className="font-medium text-text">{item.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted">
                            <span className="tabular">{dateDisplay}</span>
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
                    <VisualBadge visual={item.isMixedPayment ? mixedPaymentVisual : paymentVisuals[item.paymentMethod]}>{paymentLabel(item)}</VisualBadge>
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
        );
    }

    return (
        <div id={`entry-${item.id}`} className="flex flex-col rounded-2xl bg-surface p-4 transition-colors hover:bg-surface-raised/40 border border-surface-raised/40">
            <div
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={onToggleExpand}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onToggleExpand();
                    }
                }}
                className="flex flex-col gap-3 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet rounded-xl"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                        <p className="font-medium text-text">{item.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted">
                            <span className="tabular">{dateDisplay}</span>
                            {item.description && (!hasSubEntries || item.installmentCount > 1) ? (
                                <>
                                    <span>•</span>
                                    <span className="truncate max-w-48">{item.description}</span>
                                </>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <p className="tabular font-medium text-text">{formatBrl(item.amountCents)}</p>
                        <ChevronDown className={cn("size-4 text-muted transition-transform duration-200", isExpanded && "rotate-180 text-violet")} aria-hidden />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <VisualBadge visual={item.isMixedPayment ? mixedPaymentVisual : paymentVisuals[item.paymentMethod]}>{paymentLabel(item)}</VisualBadge>
                    <VisualBadge visual={getItemVisual(item.category)}>{item.category.name}</VisualBadge>
                    {item.specificTag ? <VisualBadge visual={getItemVisual(item.specificTag)}>{item.specificTag.name}</VisualBadge> : null}
                    {item.consolidatedBadge ? <VisualBadge visual={recurringVisual}>{item.consolidatedBadge}</VisualBadge> : item.isRecurring ? <VisualBadge visual={recurringVisual}>Recorrente</VisualBadge> : null}
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
            </div>

            {isExpanded && item.subEntries ? (
                <div className="mt-3 flex flex-col gap-2 border-t border-surface-raised/70 pt-3">
                    <div className="flex items-center justify-between gap-2 px-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{item.isRecurring ? `Meses no ano (${item.subEntries.length})` : item.installmentCount > 1 ? `Parcelas no ano (${item.subEntries.length})` : `Compras no ano (${item.subEntries.length})`}</span>
                        {item.isRecurring || item.installmentCount > 1 ? (
                            <Link href={withReturnUrl(item.editHref, returnUrl)} onClick={() => returnUrl && recordNavigationState(returnUrl, item.id)} className="inline-flex items-center gap-1 text-xs font-medium text-violet hover:underline">
                                <span>{item.isRecurring ? "Editar recorrência" : "Editar transação"}</span>
                                <ChevronRight className="size-3" />
                            </Link>
                        ) : null}
                    </div>

                    <ul className="flex flex-col gap-1">
                        {item.subEntries.map((sub) => (
                            <li key={sub.id}>
                                <Link id={`sub-${sub.id}`} href={withReturnUrl(sub.editHref, returnUrl)} onClick={() => returnUrl && recordNavigationState(returnUrl, item.id)} className="flex items-center justify-between gap-2 rounded-xl bg-surface-raised/30 px-3 py-1.5 text-xs transition-colors hover:bg-surface-raised/70">
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span className="text-text font-medium shrink-0">{sub.label}</span>
                                        {sub.paymentMethod && !item.isRecurring && item.installmentCount <= 1 ? <span className="rounded bg-surface-raised/80 px-1.5 py-0.5 text-[10px] font-medium text-muted shrink-0">{paymentMethodLabels[sub.paymentMethod]}</span> : null}
                                        {sub.description ? <span className="truncate text-[11px] text-muted">• {sub.description}</span> : null}
                                        {sub.isForecast ? <span className="rounded bg-orchid/10 px-1.5 py-0.5 text-[10px] font-medium text-orchid shrink-0">Previsto</span> : null}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="tabular font-semibold text-text">{formatBrl(sub.amountCents)}</span>
                                        <ChevronRight className="size-3 text-muted" />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}

interface DashboardEntriesSectionProps {
    entries: DashboardEntryItem[];
    totalCents: number;
    filteredTotalCents: number;
    filters: Pick<TransactionFiltersType, "month" | "year" | "category" | "paymentMethod" | "generalTag" | "specificTag" | "search" | "sort">;
    categories: CategoryOption[];
    generalTags: GeneralTagOption[];
    specificTags: SpecificTagOption[];
    periodKind?: "month" | "year";
}

const PAGE_SIZE = 20;

export function DashboardEntriesSection({ entries, totalCents, filteredTotalCents, filters, categories, generalTags, specificTags, periodKind = "month" }: DashboardEntriesSectionProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();
    const currentUrl = queryString ? `${pathname}?${queryString}` : pathname;

    useRestoreScroll(currentUrl);

    const hasActiveFilters = Boolean(filters.search || filters.category || filters.paymentMethod || filters.generalTag || filters.specificTag || (filters.sort && filters.sort !== "date_desc"));

    const savedPage = useSyncExternalStore(
        () => () => {},
        () => {
            try {
                const val = sessionStorage.getItem(`bonsai_dashboard_page_${currentUrl}`);
                const p = Number(val);
                return p >= 1 ? p : 1;
            } catch {
                return 1;
            }
        },
        () => 1,
    );

    const savedExpandedJson = useSyncExternalStore(
        () => () => {},
        () => {
            try {
                return sessionStorage.getItem("bonsai_expanded_cards") ?? "[]";
            } catch {
                return "[]";
            }
        },
        () => "[]",
    );

    const [pageOverride, setPageOverride] = useState<number | null>(null);
    const [expandedIdsOverride, setExpandedIdsOverride] = useState<string[] | null>(null);

    const page = pageOverride ?? savedPage;
    const expandedIds =
        expandedIdsOverride ??
        (() => {
            try {
                return JSON.parse(savedExpandedJson) as string[];
            } catch {
                return [];
            }
        })();

    const toggleCardExpand = (id: string) => {
        const next = expandedIds.includes(id) ? expandedIds.filter((x) => x !== id) : [...expandedIds, id];
        setExpandedIdsOverride(next);
        try {
            sessionStorage.setItem("bonsai_expanded_cards", JSON.stringify(next));
        } catch {}
    };

    const sectionRef = useRef<HTMLElement>(null);
    const prevScrolledCategoryRef = useRef(filters.category);

    const filterKey = `${filters.month ?? ""}-${filters.year ?? ""}-${filters.category ?? ""}-${filters.paymentMethod ?? ""}-${filters.generalTag ?? ""}-${filters.specificTag ?? ""}-${filters.search ?? ""}-${filters.sort ?? ""}`;
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
    if (filterKey !== prevFilterKey) {
        setPrevFilterKey(filterKey);
        setPageOverride(1);
    }

    useEffect(() => {
        if (filters.category && filters.category !== prevScrolledCategoryRef.current) {
            const timer = setTimeout(() => {
                sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 60);
            return () => clearTimeout(timer);
        }
        prevScrolledCategoryRef.current = filters.category;
    }, [filters.category]);

    const totalPages = Math.ceil(entries.length / PAGE_SIZE);
    const paginatedEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const changePage = (newPage: number) => {
        setPageOverride(newPage);
        try {
            sessionStorage.setItem(`bonsai_dashboard_page_${currentUrl}`, String(newPage));
        } catch {}
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <section ref={sectionRef} id="composicao-gastos" className="flex flex-col gap-3 scroll-mt-20">
            <Card className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex items-center gap-2.5">
                            <ReceiptText className="size-5 text-violet shrink-0" aria-hidden />
                            <h2 className="text-lg font-bold text-text">Composição dos Gastos</h2>
                        </div>
                        <p className="text-xs text-muted">
                            {entries.length === 1 ? "1 lançamento" : `${entries.length} lançamentos`} • {formatBrl(totalCents)}
                        </p>
                    </div>
                </div>
            </Card>

            <div className="flex flex-col gap-3">
                <TransactionFilters values={filters} categories={categories} generalTags={generalTags} specificTags={specificTags} showPaymentMethod={true} searchPlaceholder={periodKind === "year" ? "Buscar nos gastos do ano..." : "Buscar nos gastos do mês..."} />

                {hasActiveFilters && entries.length > 0 ? (
                    <div className="flex items-center justify-between px-1 text-xs text-muted">
                        <span>
                            {entries.length} {entries.length === 1 ? "lançamento encontrado" : "lançamentos encontrados"}
                        </span>
                        <span className="font-medium text-text">Total filtrado: {formatBrl(filteredTotalCents)}</span>
                    </div>
                ) : null}

                {entries.length === 0 ? (
                    <EmptyState title={hasActiveFilters ? "Nenhum lançamento neste filtro" : periodKind === "year" ? "Ainda não há lançamentos neste ano" : "Ainda não há lançamentos neste mês"} description={hasActiveFilters ? "Tente ajustar ou limpar os filtros para ver outros gastos." : periodKind === "year" ? "Quando houver despesas ou parcelas neste ano, elas aparecem aqui." : "Quando houver despesas ou parcelas neste mês, elas aparecem aqui."} />
                ) : (
                    <>
                        <ul className="flex flex-col gap-3">
                            {paginatedEntries.map((item) => (
                                <li key={item.id}>
                                    <DashboardEntryCard item={item} returnUrl={currentUrl} isExpanded={expandedIds.includes(item.id)} onToggleExpand={() => toggleCardExpand(item.id)} />
                                </li>
                            ))}
                        </ul>

                        {totalPages > 1 ? (
                            <div className="flex items-center justify-between gap-2 px-1 pt-1">
                                <button type="button" disabled={page <= 1} onClick={() => changePage(Math.max(1, page - 1))} className="inline-flex items-center gap-1 rounded-xl bg-surface px-3.5 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-surface-raised disabled:opacity-35 disabled:pointer-events-none cursor-pointer border border-surface-raised/80">
                                    Anterior
                                </button>
                                <span className="text-xs text-muted tabular">
                                    Página {page} de {totalPages} ({entries.length} lançamentos)
                                </span>
                                <button type="button" disabled={page >= totalPages} onClick={() => changePage(Math.min(totalPages, page + 1))} className="inline-flex items-center gap-1 rounded-xl bg-surface px-3.5 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-surface-raised disabled:opacity-35 disabled:pointer-events-none cursor-pointer border border-surface-raised/80">
                                    Próxima
                                </button>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </section>
    );
}
