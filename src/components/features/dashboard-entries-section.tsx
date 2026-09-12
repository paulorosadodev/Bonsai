"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, CreditCard, QrCode, ReceiptText, Repeat } from "lucide-react";
import { paymentMethodLabels, type CategoryOption, type GeneralTagOption, type SpecificTagOption } from "@/lib/domain/catalog";
import { formatBrl } from "@/lib/domain/money";
import type { DashboardEntryItem } from "@/lib/data/types";
import { withReturnUrl } from "@/lib/navigation/return-url";
import { recordNavigationState, useRestoreScroll } from "@/lib/navigation/scroll-restoration";
import type { TransactionFilters as TransactionFiltersType } from "@/lib/domain/schemas";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDayMonth } from "./params";
import { TransactionFilters } from "./transaction-filters";
import { getItemVisual } from "./transaction-visuals";

function getPaymentInfo(item: DashboardEntryItem) {
    if (item.isMixedPayment) {
        return { label: "Misto", isPix: false, isMixed: true };
    }
    if (item.paymentMethod === "pix") {
        return { label: "PIX", isPix: true, isMixed: false };
    }
    if (item.installmentCount > 1) {
        if (item.subEntries && item.subEntries.length > 1) {
            return { label: "Cartão parcelado", isPix: false, isMixed: false };
        }
        return { label: `Cartão ${item.installmentNumber}/${item.installmentCount}`, isPix: false, isMixed: false };
    }
    return { label: "Cartão à vista", isPix: false, isMixed: false };
}

function DashboardEntryCard({ item, returnUrl, isExpanded, onToggleExpand }: { item: DashboardEntryItem; returnUrl?: string; isExpanded: boolean; onToggleExpand: () => void }) {
    const hasSubEntries = Boolean(item.subEntries && item.subEntries.length > 1);
    const visual = getItemVisual(item.category);
    const CategoryIcon = visual.icon;
    const categoryColor = visual.color;

    const dateDisplay = item.dateRangeLabel ?? formatDayMonth(item.purchaseDate);
    const paymentInfo = getPaymentInfo(item);

    const mainRow = (
        <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                {/* Left Anchor: Category Avatar */}
                <div
                    className="relative flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105"
                    style={{
                        backgroundColor: `color-mix(in srgb, ${categoryColor} 14%, var(--surface-raised))`,
                        color: categoryColor,
                        border: `1px solid color-mix(in srgb, ${categoryColor} 25%, transparent)`,
                    }}
                >
                    <CategoryIcon className="size-5" aria-hidden />
                </div>

                {/* Center Content */}
                <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-sm font-medium text-text transition-colors group-hover:text-violet">{item.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                        <span className="tabular font-medium text-text/80">{dateDisplay}</span>
                        <span className="text-muted/40">•</span>
                        <span>{item.category.name}</span>
                        {item.specificTag ? (
                            <>
                                <span className="text-muted/40">•</span>
                                <span className="text-muted/90">{item.specificTag.name}</span>
                            </>
                        ) : null}

                        {/* Payment micro-indicator */}
                        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide", paymentInfo.isPix ? "bg-mint/10 text-mint" : paymentInfo.isMixed ? "bg-orchid/10 text-orchid" : "bg-sky-400/10 text-sky-300")}>
                            {paymentInfo.isPix ? <QrCode className="size-2.5" aria-hidden /> : <CreditCard className="size-2.5" aria-hidden />}
                            <span>{paymentInfo.label}</span>
                        </span>

                        {/* Recurring / Consolidated micro-indicator */}
                        {item.consolidatedBadge ? (
                            <span className="inline-flex items-center gap-1 rounded bg-orchid/10 px-1.5 py-0.5 text-[10px] font-medium text-orchid">
                                <Repeat className="size-2.5" aria-hidden />
                                <span>{item.consolidatedBadge}</span>
                            </span>
                        ) : item.isRecurring ? (
                            <span className="inline-flex items-center gap-1 rounded bg-orchid/10 px-1.5 py-0.5 text-[10px] font-medium text-orchid" title="Despesa recorrente">
                                <Repeat className="size-2.5" aria-hidden />
                                <span>Recorrente</span>
                            </span>
                        ) : null}

                        {/* General tags */}
                        {item.generalTags.length > 0 ? (
                            <>
                                <span className="text-muted/40">•</span>
                                <span className="text-muted/70">{item.generalTags.map((t) => t.name).join(", ")}</span>
                            </>
                        ) : null}

                        {/* Description */}
                        {item.description && (!hasSubEntries || item.installmentCount > 1) ? (
                            <>
                                <span className="text-muted/40">•</span>
                                <span className="truncate max-w-40 text-muted/60">{item.description}</span>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <div className="flex shrink-0 items-center gap-2">
                <div className="flex flex-col items-end">
                    {item.grossAmountCents && item.grossAmountCents > item.amountCents ? <span className="tabular text-xs text-muted/60 line-through">{formatBrl(item.grossAmountCents)}</span> : null}
                    <p className="tabular text-sm font-semibold text-text">{formatBrl(item.amountCents)}</p>
                </div>
                {hasSubEntries ? <ChevronDown className={cn("size-4 text-muted/50 transition-transform duration-200", isExpanded && "rotate-180 text-violet")} aria-hidden /> : <ChevronRight className="size-4 text-muted/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted" aria-hidden />}
            </div>
        </div>
    );

    if (!hasSubEntries) {
        return (
            <Link id={`entry-${item.id}`} href={withReturnUrl(item.editHref, returnUrl)} onClick={() => returnUrl && recordNavigationState(returnUrl, item.id)} className="group block transition-colors hover:bg-surface-raised/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet">
                {mainRow}
            </Link>
        );
    }

    return (
        <div id={`entry-${item.id}`} className="transition-colors">
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
                className="group block cursor-pointer select-none transition-colors hover:bg-surface-raised/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet"
            >
                {mainRow}
            </div>

            {isExpanded && item.subEntries ? (
                <div className="flex flex-col gap-2 bg-surface-raised/20 border-t border-surface-raised/50 p-3 pl-12">
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
                                <Link id={`sub-${sub.id}`} href={withReturnUrl(sub.editHref, returnUrl)} onClick={() => returnUrl && recordNavigationState(returnUrl, item.id)} className="flex items-center justify-between gap-2 rounded-xl bg-surface/60 px-3 py-2 text-xs transition-colors hover:bg-surface-raised/80">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className="font-medium text-text shrink-0">{sub.label}</span>
                                        {sub.paymentMethod && !item.isRecurring && item.installmentCount <= 1 ? <span className="rounded bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-muted shrink-0">{paymentMethodLabels[sub.paymentMethod]}</span> : null}
                                        {sub.description ? <span className="truncate text-[11px] text-muted">• {sub.description}</span> : null}
                                        {sub.isForecast ? <span className="rounded bg-orchid/10 px-1.5 py-0.5 text-[10px] font-medium text-orchid shrink-0">Previsto</span> : null}
                                    </span>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        {sub.grossAmountCents && sub.grossAmountCents > sub.amountCents ? <span className="tabular text-[11px] text-muted/60 line-through">{formatBrl(sub.grossAmountCents)}</span> : null}
                                        <span className="tabular font-semibold text-text">{formatBrl(sub.amountCents)}</span>
                                        <ChevronRight className="size-3 text-muted/60" />
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
                        <div className="overflow-hidden rounded-2xl border border-surface-raised/40 bg-surface shadow-xs">
                            <div className="divide-y divide-surface-raised/40">
                                {paginatedEntries.map((item) => (
                                    <DashboardEntryCard key={item.id} item={item} returnUrl={currentUrl} isExpanded={expandedIds.includes(item.id)} onToggleExpand={() => toggleCardExpand(item.id)} />
                                ))}
                            </div>
                        </div>

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
