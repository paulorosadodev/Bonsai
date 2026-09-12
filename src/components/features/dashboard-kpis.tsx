"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Layers, CreditCard, ArrowUpRight, Tag, X, ChevronDown, MapPin } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { BudgetKpi, DashboardKpis, DashboardSpecificTagTotal, DashboardTopDestination } from "@/lib/data/types";
import type { SpecificTagOption } from "@/lib/domain/catalog";
import { formatBrl } from "@/lib/domain/money";
import { formatCivilDate } from "./params";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { DynamicIcon } from "./transaction-visuals";
import { scrollBottomIntoViewIfNeeded } from "@/lib/ui/scroll";

function ChartViewport({ className, height, width, clickable = false, children }: { className: string; height?: number; width?: string; clickable?: boolean; children: ReactNode }) {
    const ready = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );

    return (
        <div className={cn("outline-none", clickable && "cursor-pointer", className)} style={{ height, width }} aria-hidden>
            {ready ? children : null}
        </div>
    );
}

export function BudgetBar({ budget, periodKind }: { budget: BudgetKpi; periodKind: "month" | "year" }) {
    if (budget.budgetCents === null) {
        return (
            <div className="flex items-center justify-between border-t border-surface-raised/70 pt-2 text-xs">
                <span className="text-muted">{periodKind === "year" ? "Orçamento Anual" : "Orçamento Mensal"}</span>
                <Link href="/ajustes" className="text-violet hover:underline flex items-center gap-1 font-medium">
                    + Definir teto
                </Link>
            </div>
        );
    }

    const pct = budget.percentage ?? 0;
    const isExceeded = budget.isExceeded;
    const isWarning = pct >= 80 && !isExceeded;

    return (
        <div className="flex flex-col gap-1.5 border-t border-surface-raised/70 pt-2">
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted tabular">Teto: {formatBrl(budget.budgetCents)}</span>
                <span className={cn("font-semibold tabular", isExceeded ? "text-danger" : isWarning ? "text-warning" : "text-mint")}>{pct}% consumido</span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                <div
                    className={cn("h-full rounded-full transition-all duration-500", isExceeded ? "bg-danger" : isWarning ? "bg-warning" : "bg-linear-to-r from-mint to-violet")}
                    style={{
                        width: `${Math.min(100, Math.max(0, pct))}%`,
                    }}
                />
            </div>

            <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">{isExceeded ? "Excedeu em" : "Disponível"}</span>
                <span className={cn("font-semibold tabular", isExceeded ? "text-danger" : "text-text")}>{budget.remainingCents !== null ? (isExceeded ? `+${formatBrl(Math.abs(budget.remainingCents))}` : formatBrl(budget.remainingCents)) : ""}</span>
            </div>
        </div>
    );
}

interface DashboardKpisSectionProps {
    kpis: DashboardKpis;
    periodKind?: "month" | "year";
    specificTags?: SpecificTagOption[];
    className?: string;
}

export function DashboardKpisSection({ kpis, specificTags = [], className }: DashboardKpisSectionProps) {
    const { fixedVsVariable, paymentDistribution } = kpis;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();

    const bySpecificTag = kpis.bySpecificTag ?? [];
    const totalTagsCents = bySpecificTag.reduce((sum, tag) => sum + tag.amountCents, 0);

    const uberTag = (specificTags ?? []).find((t) => t.name.toLowerCase() === "uber" || (t as { slug?: string }).slug === "uber") ?? bySpecificTag.find((t) => t.name.toLowerCase() === "uber");
    const uberTagId = uberTag ? ("id" in uberTag ? uberTag.id : uberTag.tagId) : null;

    const selectedTagId = searchParams.get("specificTag");
    const selectedCategoryId = searchParams.get("category");
    const [isFixedVsVariableOpen, setIsFixedVsVariableOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isTopExpensesOpen, setIsTopExpensesOpen] = useState(false);
    const [isTagsListOpen, setIsTagsListOpen] = useState(() => Boolean(selectedTagId));
    const [isTopDestinationsOpen, setIsTopDestinationsOpen] = useState(false);
    const asideRef = useRef<HTMLElement>(null);
    const fixedVsVariableCardRef = useRef<HTMLDivElement>(null);
    const paymentCardRef = useRef<HTMLDivElement>(null);
    const topExpensesCardRef = useRef<HTMLDivElement>(null);
    const tagsListCardRef = useRef<HTMLDivElement>(null);
    const topDestinationsCardRef = useRef<HTMLDivElement>(null);
    const activeTagItem = selectedTagId ? bySpecificTag.find((t) => t.tagId === selectedTagId) : null;

    const topDestinations: DashboardTopDestination[] = kpis.topDestinations ?? [];
    const selectedSearch = searchParams.get("search");

    const handleSelectCategory = useCallback(
        (categoryId: string) => {
            const nextParams = new URLSearchParams(searchParams.toString());
            if (nextParams.get("category") === categoryId) {
                nextParams.delete("category");
            } else {
                nextParams.set("category", categoryId);
            }
            const query = nextParams.toString();
            const href = query ? `${pathname}?${query}` : pathname;
            startTransition(() => {
                router.replace(href, { scroll: false });
            });
        },
        [pathname, router, searchParams, startTransition],
    );

    const handleSelectDestination = useCallback(
        (destName: string) => {
            const nextParams = new URLSearchParams(searchParams.toString());
            const isCurrentlySelected = nextParams.get("search") === destName && (!uberTagId || nextParams.get("specificTag") === uberTagId);

            if (isCurrentlySelected) {
                nextParams.delete("search");
                if (uberTagId && nextParams.get("specificTag") === uberTagId) {
                    nextParams.delete("specificTag");
                }
            } else {
                nextParams.set("search", destName);
                if (uberTagId) {
                    nextParams.set("specificTag", uberTagId);
                    setIsTagsListOpen(true);
                }
            }
            const query = nextParams.toString();
            const href = query ? `${pathname}?${query}` : pathname;
            startTransition(() => {
                router.replace(href, { scroll: false });
            });
        },
        [pathname, router, searchParams, startTransition, uberTagId],
    );

    useEffect(() => {
        const aside = asideRef.current;
        if (!aside) return;

        const updateOffset = () => {
            const asideHeight = aside.offsetHeight;
            const viewportHeight = window.innerHeight;
            const topDefaultPx = 72; // 4.5rem
            const bottomPaddingPx = 32;

            if (asideHeight + topDefaultPx > viewportHeight) {
                const offset = viewportHeight - asideHeight - bottomPaddingPx;
                aside.style.top = `${offset}px`;
            } else {
                aside.style.top = "4.5rem";
            }
        };

        updateOffset();
        window.addEventListener("resize", updateOffset);
        return () => window.removeEventListener("resize", updateOffset);
    }, [isFixedVsVariableOpen, isPaymentOpen, isTopExpensesOpen, isTagsListOpen, isTopDestinationsOpen, bySpecificTag.length, topDestinations.length]);

    const handleToggleFixedVsVariable = useCallback(() => {
        setIsFixedVsVariableOpen((prev) => {
            const next = !prev;
            if (next) {
                scrollBottomIntoViewIfNeeded(fixedVsVariableCardRef.current);
            }
            return next;
        });
    }, []);

    const handleTogglePayment = useCallback(() => {
        setIsPaymentOpen((prev) => {
            const next = !prev;
            if (next) {
                scrollBottomIntoViewIfNeeded(paymentCardRef.current);
            }
            return next;
        });
    }, []);

    const handleToggleTopExpenses = useCallback(() => {
        setIsTopExpensesOpen((prev) => {
            const next = !prev;
            if (next) {
                scrollBottomIntoViewIfNeeded(topExpensesCardRef.current);
            }
            return next;
        });
    }, []);

    const handleToggleTagsList = useCallback(() => {
        setIsTagsListOpen((prev) => {
            const next = !prev;
            if (next) {
                scrollBottomIntoViewIfNeeded(tagsListCardRef.current);
            }
            return next;
        });
    }, []);

    const handleToggleTopDestinations = useCallback(() => {
        setIsTopDestinationsOpen((prev) => {
            const next = !prev;
            if (next) {
                scrollBottomIntoViewIfNeeded(topDestinationsCardRef.current);
            }
            return next;
        });
    }, []);

    const handleSelectTag = useCallback(
        (tagId: string) => {
            setIsTagsListOpen(true);
            scrollBottomIntoViewIfNeeded(tagsListCardRef.current);
            const nextParams = new URLSearchParams(searchParams.toString());
            if (nextParams.get("specificTag") === tagId) {
                nextParams.delete("specificTag");
                if (uberTagId && tagId === uberTagId) {
                    nextParams.delete("search");
                }
            } else {
                nextParams.set("specificTag", tagId);
            }
            const query = nextParams.toString();
            const href = query ? `${pathname}?${query}` : pathname;
            startTransition(() => {
                router.replace(href, { scroll: false });
            });
        },
        [pathname, router, searchParams, startTransition, uberTagId],
    );

    const expenses = kpis.largestExpenses && kpis.largestExpenses.length > 0 ? kpis.largestExpenses : kpis.largestExpense ? [kpis.largestExpense] : [];
    const visibleExpenses = isTopExpensesOpen ? expenses.slice(0, 10) : expenses.slice(0, 5);
    const visibleDestinations = isTopDestinationsOpen ? topDestinations.slice(0, 10) : topDestinations.slice(0, 5);

    return (
        <aside ref={asideRef} className={cn("flex flex-col gap-3 lg:sticky lg:top-18 transition-[top] duration-150", className)}>
            {/* 1. Fixos vs. Variáveis */}
            <Card ref={fixedVsVariableCardRef} className="flex flex-col justify-between gap-1.5 p-2.5 sm:p-3 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <button type="button" aria-expanded={isFixedVsVariableOpen} onClick={handleToggleFixedVsVariable} className="flex flex-1 items-center justify-between gap-2 text-left cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet rounded-lg py-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Layers className="size-3.5 shrink-0 text-orchid" />
                            <span className="text-xs font-semibold text-text truncate">Fixos / Variáveis</span>
                        </div>
                        <ChevronDown className={cn("size-4 text-muted transition-transform duration-200 shrink-0", isFixedVsVariableOpen && "rotate-180 text-orchid")} aria-hidden />
                    </button>
                </div>

                <div className="my-0.5 flex flex-col gap-1">
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                        <div className="bg-violet transition-all duration-300" style={{ width: `${fixedVsVariable.fixedPercentage}%` }} />
                        <div className="bg-mint transition-all duration-300" style={{ width: `${fixedVsVariable.variablePercentage}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] tabular font-medium">
                        <span className="text-violet truncate">{fixedVsVariable.fixedPercentage}% Fixo</span>
                        <span className="text-mint truncate">{fixedVsVariable.variablePercentage}% Variável</span>
                    </div>
                </div>

                <div className="border-t border-surface-raised/60 pt-1 flex items-center justify-between text-[10px] sm:text-[11px] tabular">
                    <span className="text-violet truncate">
                        Fixo: <span className="text-white font-medium">{formatBrl(fixedVsVariable.fixedCents)}</span>
                    </span>
                    <span className="text-mint truncate">
                        Variável: <span className="text-white font-medium">{formatBrl(fixedVsVariable.variableCents)}</span>
                    </span>
                </div>

                {isFixedVsVariableOpen && (
                    <div className="mt-1 pt-1.5 border-t border-surface-raised/50 flex flex-col gap-2.5">
                        {(fixedVsVariable.fixedCategories ?? []).length > 0 && (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-violet px-0.5">
                                    <span>Fixos</span>
                                    <span className="tabular font-medium text-muted">{formatBrl(fixedVsVariable.fixedCents)}</span>
                                </div>
                                <div className="flex flex-col divide-y divide-surface-raised/30">
                                    {(fixedVsVariable.fixedCategories ?? []).map((item) => {
                                        const isSelected = item.isTag ? selectedTagId === item.id : selectedCategoryId === item.id;
                                        return (
                                            <button key={item.id} type="button" onClick={() => (item.isTag ? handleSelectTag(item.id) : handleSelectCategory(item.id))} className={cn("flex items-center justify-between gap-2 py-1.5 px-1.5 rounded-lg text-left transition-colors cursor-pointer outline-none hover:bg-surface-raised/50", isSelected && "bg-violet/15 text-violet font-medium")} title={`Filtrar por ${item.name}`}>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {item.icon ? <DynamicIcon name={item.icon} className="size-3.5 shrink-0" style={{ color: item.color }} /> : <span className="size-2 rounded-full shrink-0" style={{ background: item.color }} />}
                                                    <span className="text-xs truncate text-text" title={item.name}>
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted tabular">{item.percentage}%</span>
                                                </div>
                                                <span className="text-xs tabular font-medium text-white shrink-0">{formatBrl(item.amountCents)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {(fixedVsVariable.variableCategories ?? []).length > 0 && (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-mint px-0.5">
                                    <span>Variáveis</span>
                                    <span className="tabular font-medium text-muted">{formatBrl(fixedVsVariable.variableCents)}</span>
                                </div>
                                <div className="flex flex-col divide-y divide-surface-raised/30">
                                    {(fixedVsVariable.variableCategories ?? []).map((item) => {
                                        const isSelected = item.isTag ? selectedTagId === item.id : selectedCategoryId === item.id;
                                        return (
                                            <button key={item.id} type="button" onClick={() => (item.isTag ? handleSelectTag(item.id) : handleSelectCategory(item.id))} className={cn("flex items-center justify-between gap-2 py-1.5 px-1.5 rounded-lg text-left transition-colors cursor-pointer outline-none hover:bg-surface-raised/50", isSelected && "bg-mint/15 text-mint font-medium")} title={`Filtrar por ${item.name}`}>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {item.icon ? <DynamicIcon name={item.icon} className="size-3.5 shrink-0" style={{ color: item.color }} /> : <span className="size-2 rounded-full shrink-0" style={{ background: item.color }} />}
                                                    <span className="text-xs truncate text-text" title={item.name}>
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted tabular">{item.percentage}%</span>
                                                </div>
                                                <span className="text-xs tabular font-medium text-white shrink-0">{formatBrl(item.amountCents)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* 2. Meio de Pagamento */}
            <Card ref={paymentCardRef} className="flex flex-col justify-between gap-1.5 p-2.5 sm:p-3 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <button type="button" aria-expanded={isPaymentOpen} onClick={handleTogglePayment} className="flex flex-1 items-center justify-between gap-2 text-left cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet rounded-lg py-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <CreditCard className="size-3.5 shrink-0 text-sky-400" />
                            <span className="text-xs font-semibold text-text truncate">Pagamento</span>
                        </div>
                        <ChevronDown className={cn("size-4 text-muted transition-transform duration-200 shrink-0", isPaymentOpen && "rotate-180 text-sky-400")} aria-hidden />
                    </button>
                </div>

                <div className="my-0.5 flex flex-col gap-1">
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                        <div className="bg-sky-400 transition-all duration-300" style={{ width: `${paymentDistribution.creditPercentage}%` }} />
                        <div className="bg-mint transition-all duration-300" style={{ width: `${paymentDistribution.pixPercentage}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] tabular font-medium">
                        <span className="text-sky-400 truncate">{paymentDistribution.creditPercentage}% Cartão</span>
                        <span className="text-mint truncate">{paymentDistribution.pixPercentage}% Pix</span>
                    </div>
                </div>

                <div className="border-t border-surface-raised/60 pt-1 flex items-center justify-between text-[10px] sm:text-[11px] tabular">
                    <span className="text-sky-400 truncate">
                        Cartão: <span className="text-white font-medium">{formatBrl(paymentDistribution.creditCents)}</span>
                    </span>
                    <span className="text-mint truncate">
                        Pix: <span className="text-white font-medium">{formatBrl(paymentDistribution.pixCents)}</span>
                    </span>
                </div>

                {isPaymentOpen && (
                    <div className="mt-1 pt-1.5 border-t border-surface-raised/50 flex flex-col gap-2.5">
                        <div className="flex items-start justify-between gap-2 text-[10px] tabular">
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-muted truncate">
                                    À vista: <span className="text-text font-medium">{formatBrl(paymentDistribution.creditSingleCents)}</span> ({paymentDistribution.creditSinglePercentage}%)
                                </span>
                                <span className="text-muted truncate">
                                    Parcelado: <span className="text-text font-medium">{formatBrl(paymentDistribution.creditInstallmentsCents)}</span> ({paymentDistribution.creditInstallmentsPercentage}%)
                                </span>
                            </div>
                            <div className="flex flex-col items-end min-w-0 text-right gap-0.5">
                                <span className="text-muted truncate">
                                    <span className="text-text font-medium">{paymentDistribution.pixCount}</span> {paymentDistribution.pixCount === 1 ? "pix realizado" : "pix realizados"}
                                </span>
                                <span className="text-muted truncate">
                                    Média: <span className="text-text font-medium">{formatBrl(paymentDistribution.pixAverageCents)}</span>
                                </span>
                            </div>
                        </div>

                        {(paymentDistribution.creditCategories ?? []).length > 0 && (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-sky-400 px-0.5">
                                    <span>Cartão</span>
                                    <span className="tabular font-medium text-muted">{formatBrl(paymentDistribution.creditCents)}</span>
                                </div>
                                <div className="flex flex-col divide-y divide-surface-raised/30">
                                    {(paymentDistribution.creditCategories ?? []).map((item) => {
                                        const isSelected = item.isTag ? selectedTagId === item.id : selectedCategoryId === item.id;
                                        return (
                                            <button key={item.id} type="button" onClick={() => (item.isTag ? handleSelectTag(item.id) : handleSelectCategory(item.id))} className={cn("flex items-center justify-between gap-2 py-1.5 px-1.5 rounded-lg text-left transition-colors cursor-pointer outline-none hover:bg-surface-raised/50", isSelected && "bg-sky-400/15 text-sky-400 font-medium")} title={`Filtrar por ${item.name}`}>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {item.icon ? <DynamicIcon name={item.icon} className="size-3.5 shrink-0" style={{ color: item.color }} /> : <span className="size-2 rounded-full shrink-0" style={{ background: item.color }} />}
                                                    <span className="text-xs truncate text-text" title={item.name}>
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted tabular">{item.percentage}%</span>
                                                </div>
                                                <span className="text-xs tabular font-medium text-white shrink-0">{formatBrl(item.amountCents)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {(paymentDistribution.pixCategories ?? []).length > 0 && (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-mint px-0.5">
                                    <span>Pix</span>
                                    <span className="tabular font-medium text-muted">{formatBrl(paymentDistribution.pixCents)}</span>
                                </div>
                                <div className="flex flex-col divide-y divide-surface-raised/30">
                                    {(paymentDistribution.pixCategories ?? []).map((item) => {
                                        const isSelected = item.isTag ? selectedTagId === item.id : selectedCategoryId === item.id;
                                        return (
                                            <button key={item.id} type="button" onClick={() => (item.isTag ? handleSelectTag(item.id) : handleSelectCategory(item.id))} className={cn("flex items-center justify-between gap-2 py-1.5 px-1.5 rounded-lg text-left transition-colors cursor-pointer outline-none hover:bg-surface-raised/50", isSelected && "bg-mint/15 text-mint font-medium")} title={`Filtrar por ${item.name}`}>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {item.icon ? <DynamicIcon name={item.icon} className="size-3.5 shrink-0" style={{ color: item.color }} /> : <span className="size-2 rounded-full shrink-0" style={{ background: item.color }} />}
                                                    <span className="text-xs truncate text-text" title={item.name}>
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted tabular">{item.percentage}%</span>
                                                </div>
                                                <span className="text-xs tabular font-medium text-white shrink-0">{formatBrl(item.amountCents)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* 3. Top 5 / Top 10 Gastos */}
            <Card ref={topExpensesCardRef} className="flex flex-col gap-2 p-2.5 sm:p-3 min-w-0">
                <div className="flex items-center justify-between gap-1 min-w-0">
                    {expenses.length > 5 ? (
                        <button type="button" aria-expanded={isTopExpensesOpen} onClick={handleToggleTopExpenses} className="flex flex-1 items-center justify-between gap-2 text-left cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet rounded-lg py-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <ArrowUpRight className="size-3.5 shrink-0 text-danger" />
                                <span className="text-xs font-semibold text-text truncate">{isTopExpensesOpen ? "Top 10 Gastos" : "Top 5 Gastos"}</span>
                            </div>
                            <ChevronDown className={cn("size-4 text-muted transition-transform duration-200 shrink-0", isTopExpensesOpen && "rotate-180 text-danger")} aria-hidden />
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <ArrowUpRight className="size-3.5 shrink-0 text-danger" />
                            <span className="text-xs font-semibold text-text truncate">Top 5 Gastos</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col divide-y divide-surface-raised/60">
                    {visibleExpenses.length > 0 ? (
                        visibleExpenses.map((expense, idx) => (
                            <div key={`${expense.name}-${expense.date}-${idx}`} className="flex items-center justify-between gap-2 py-1.5 first:pt-0.5 last:pb-0 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[10px] font-semibold text-muted tabular">{idx + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        {expense.editHref ? (
                                            <Link href={expense.editHref} className="block truncate text-xs font-medium text-text hover:text-white hover:underline" title={expense.name}>
                                                {expense.name}
                                            </Link>
                                        ) : (
                                            <p className="truncate text-xs font-medium text-text" title={expense.name}>
                                                {expense.name}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-1 text-[10px] text-muted truncate">
                                            <span className="tabular">{formatCivilDate(expense.date)}</span>
                                            {expense.badgeLabel && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-orchid truncate max-w-28">{expense.badgeLabel}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold tabular text-white shrink-0">{formatBrl(expense.amountCents)}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted py-1">Sem gastos no período</p>
                    )}
                </div>
            </Card>

            {/* 4. Gráfico de Pizza: Tags Específicas */}
            <Card ref={tagsListCardRef} className="flex flex-col gap-2.5 p-2.5 sm:p-3 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <button type="button" aria-expanded={isTagsListOpen} onClick={handleToggleTagsList} className="flex flex-1 items-center justify-between gap-2 text-left cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet rounded-lg py-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Tag className="size-3.5 shrink-0 text-violet" />
                            <span className="text-xs font-semibold text-text truncate">Tags Específicas</span>
                            {activeTagItem ? (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectTag(activeTagItem.tagId);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.stopPropagation();
                                            handleSelectTag(activeTagItem.tagId);
                                        }
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full bg-violet/15 px-2 py-0.5 text-[10px] font-medium text-violet border border-violet/30 hover:bg-violet/25 transition-colors cursor-pointer shrink-0 ml-1"
                                    title="Limpar filtro de tag"
                                >
                                    <span className="truncate max-w-20">{activeTagItem.name}</span>
                                    <X className="size-2.5 shrink-0" />
                                </span>
                            ) : null}
                        </div>
                        <ChevronDown className={cn("size-4 text-muted transition-transform duration-200 shrink-0", isTagsListOpen && "rotate-180 text-violet")} aria-hidden />
                    </button>
                </div>

                {bySpecificTag.length === 0 ? (
                    <p className="text-xs text-muted py-3 text-center">Nenhum gasto com tag específica</p>
                ) : (
                    <>
                        {/* Donut Chart: Sempre Visível */}
                        <div className="relative flex items-center justify-center my-1">
                            <ChartViewport className="h-44 w-full" clickable>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={bySpecificTag}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={2}
                                            dataKey="amountCents"
                                            stroke="transparent"
                                            onClick={(entry) => {
                                                if (entry && "tagId" in entry && typeof entry.tagId === "string") {
                                                    handleSelectTag(entry.tagId);
                                                }
                                            }}
                                        >
                                            {bySpecificTag.map((entry) => (
                                                <Cell key={entry.tagId} fill={entry.color || "#A78BFA"} opacity={selectedTagId && selectedTagId !== entry.tagId ? 0.35 : 1} className="cursor-pointer transition-opacity duration-200 outline-none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            wrapperStyle={{ outline: "none", zIndex: 30 }}
                                            contentStyle={{ background: "transparent", border: "none", padding: 0, boxShadow: "none" }}
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.[0]?.payload) return null;
                                                const item = payload[0].payload as DashboardSpecificTagTotal;
                                                return (
                                                    <div className="flex min-w-40 gap-2.5 rounded-xl border border-surface-raised bg-surface px-3 py-2 shadow-[0_12px_32px_rgb(8_5_16/0.55)]">
                                                        {item.icon ? <DynamicIcon name={item.icon} className="mt-0.5 size-4 shrink-0" style={{ color: item.color }} /> : <span className="w-0.5 shrink-0 self-stretch rounded-full" style={{ background: item.color }} aria-hidden />}
                                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-xs font-medium text-muted truncate">{item.name}</p>
                                                                <span className="text-[10px] font-semibold text-violet">{item.percentage}%</span>
                                                            </div>
                                                            <p className="tabular text-sm font-semibold text-text">{formatBrl(item.amountCents)}</p>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartViewport>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                                <span className="text-[9px] text-muted uppercase tracking-wider font-semibold">Total Tags</span>
                                <span className="text-xs font-bold text-white tabular">{formatBrl(totalTagsCents)}</span>
                            </div>
                        </div>

                        {/* Listagem de Tags: Expandível via clique no cabeçalho */}
                        {isTagsListOpen && (
                            <div className="mt-1 pt-1.5 border-t border-surface-raised/50">
                                <div className="flex flex-col divide-y divide-surface-raised/30">
                                    {bySpecificTag.map((item) => {
                                        const isSelected = selectedTagId === item.tagId;
                                        return (
                                            <button key={item.tagId} type="button" onClick={() => handleSelectTag(item.tagId)} className={cn("flex items-center justify-between gap-2 py-2 px-1.5 rounded-lg text-left transition-colors cursor-pointer outline-none hover:bg-surface-raised/50", isSelected && "bg-violet/15 text-violet font-medium")} title={`Filtrar por ${item.name}`}>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {item.icon ? <DynamicIcon name={item.icon} className="size-3.5 shrink-0" style={{ color: item.color }} /> : <span className="size-2 rounded-full shrink-0" style={{ background: item.color }} />}
                                                    <span className="text-xs truncate text-text" title={item.name}>
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted tabular">{item.percentage}%</span>
                                                </div>
                                                <span className="text-xs tabular font-medium text-white shrink-0">{formatBrl(item.amountCents)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* 5. Top 5 / Top 10 Destinos (Uber) */}
            <Card ref={topDestinationsCardRef} className="flex flex-col gap-2 p-2.5 sm:p-3 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                    {topDestinations.length > 5 ? (
                        <button type="button" aria-expanded={isTopDestinationsOpen} onClick={handleToggleTopDestinations} className="flex flex-1 items-center justify-between gap-2 text-left cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet rounded-lg py-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="size-3.5 shrink-0 text-emerald-400" />
                                <span className="text-xs font-semibold text-text truncate">{isTopDestinationsOpen ? "Top 10 Destinos (Uber)" : "Top 5 Destinos (Uber)"}</span>
                                {selectedSearch && (!uberTagId || selectedTagId === uberTagId) ? (
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectDestination(selectedSearch);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.stopPropagation();
                                                handleSelectDestination(selectedSearch);
                                            }
                                        }}
                                        className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/25 transition-colors cursor-pointer shrink-0 ml-1"
                                        title="Limpar filtro de destino"
                                    >
                                        <span className="truncate max-w-20">{selectedSearch}</span>
                                        <X className="size-2.5 shrink-0" />
                                    </span>
                                ) : null}
                            </div>
                            <ChevronDown className={cn("size-4 text-muted transition-transform duration-200 shrink-0", isTopDestinationsOpen && "rotate-180 text-emerald-400")} aria-hidden />
                        </button>
                    ) : (
                        <div className="flex flex-1 items-center justify-between gap-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="size-3.5 shrink-0 text-emerald-400" />
                                <span className="text-xs font-semibold text-text truncate">Top 5 Destinos (Uber)</span>
                                {selectedSearch && (!uberTagId || selectedTagId === uberTagId) ? (
                                    <button type="button" onClick={() => handleSelectDestination(selectedSearch)} className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/25 transition-colors cursor-pointer shrink-0 ml-1" title="Limpar filtro de destino">
                                        <span className="truncate max-w-20">{selectedSearch}</span>
                                        <X className="size-2.5 shrink-0" />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col divide-y divide-surface-raised/60">
                    {visibleDestinations.length > 0 ? (
                        visibleDestinations.map((dest, idx) => {
                            const isSelected = selectedSearch === dest.name && (!uberTagId || selectedTagId === uberTagId);
                            return (
                                <button key={dest.locationId} type="button" onClick={() => handleSelectDestination(dest.name)} className={cn("flex items-center justify-between gap-2 py-1.5 first:pt-0.5 last:pb-0 px-1 rounded-lg text-left transition-colors cursor-pointer outline-none hover:bg-surface-raised/50", isSelected && "bg-emerald-400/15 text-emerald-400 font-medium")} title={`Filtrar transações para ${dest.name}`}>
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[10px] font-semibold text-muted tabular">{idx + 1}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-medium text-text" title={dest.name}>
                                                {dest.name}
                                            </p>
                                            <div className="flex items-center gap-1 text-[10px] text-muted truncate">
                                                <span className="tabular">
                                                    {dest.count} {dest.count === 1 ? "corrida" : "corridas"}
                                                </span>
                                                <span>•</span>
                                                <span className="text-emerald-400 font-medium tabular">{dest.percentage}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold tabular text-white shrink-0">{formatBrl(dest.amountCents)}</span>
                                </button>
                            );
                        })
                    ) : (
                        <p className="text-xs text-muted py-1">Nenhum gasto com destino no período</p>
                    )}
                </div>
            </Card>
        </aside>
    );
}
