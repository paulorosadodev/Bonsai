"use client";

import { useCallback, useId, useState, useTransition, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ChevronDown, ChevronUp, LoaderCircle, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { paymentMethodLabels, paymentMethods, type CategoryOption, type GeneralTagOption, type SpecificTagOption } from "@/lib/domain/catalog";
import type { TransactionFilters as TransactionFiltersType } from "@/lib/domain/schemas";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/select";
import { DynamicIcon } from "@/components/features/transaction-visuals";

interface TransactionFiltersProps {
    values: Pick<TransactionFiltersType, "month" | "category" | "paymentMethod" | "generalTag" | "specificTag" | "search" | "sort">;
    categories?: CategoryOption[];
    generalTags?: GeneralTagOption[];
    specificTags?: SpecificTagOption[];
    showPaymentMethod?: boolean;
    searchPlaceholder?: string;
}

export function TransactionFilters({ values, categories = [], generalTags = [], specificTags = [], showPaymentMethod = true, searchPlaceholder }: TransactionFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const categorySelectId = useId();
    const paymentSelectId = useId();
    const generalTagSelectId = useId();
    const specificTagSelectId = useId();
    const sortSelectId = useId();

    const [searchValue, setSearchValue] = useState(values.search ?? "");
    const [prevSearchProp, setPrevSearchProp] = useState(values.search);

    // Sync input when external search prop changes without an effect
    if (values.search !== prevSearchProp) {
        setPrevSearchProp(values.search);
        setSearchValue(values.search ?? "");
    }

    const activeCriteriaCount = [values.category, showPaymentMethod ? values.paymentMethod : null, values.generalTag, values.specificTag].filter(Boolean).length;

    const hasAnyActiveFilter = activeCriteriaCount > 0 || Boolean(values.search) || (values.sort && values.sort !== "date_desc");

    const [isExpanded, setIsExpanded] = useState(() => activeCriteriaCount > 0);
    const [prevCriteriaCount, setPrevCriteriaCount] = useState(activeCriteriaCount);

    if (activeCriteriaCount !== prevCriteriaCount) {
        setPrevCriteriaCount(activeCriteriaCount);
        if (activeCriteriaCount > 0) {
            setIsExpanded(true);
        }
    }

    const updateFilter = useCallback(
        (updates: Record<string, string | null | undefined>) => {
            const nextParams = new URLSearchParams(searchParams.toString());

            for (const [key, val] of Object.entries(updates)) {
                if (val === undefined || val === null || val === "" || (key === "sort" && val === "date_desc")) {
                    nextParams.delete(key);
                } else {
                    nextParams.set(key, val);
                }
            }

            const query = nextParams.toString();
            const href = query ? `${pathname}?${query}` : pathname;
            startTransition(() => {
                router.replace(href, { scroll: false });
            });
        },
        [pathname, router, searchParams, startTransition],
    );

    // Debounced search trigger
    useEffect(() => {
        const trimmed = searchValue.trim();
        const currentSearch = values.search ?? "";

        if (trimmed === currentSearch) {
            return;
        }

        const timer = setTimeout(() => {
            updateFilter({ search: trimmed || null });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchValue, values.search, updateFilter]);

    const handleClearSearch = () => {
        setSearchValue("");
        updateFilter({ search: null });
    };

    const handleClearAll = () => {
        setSearchValue("");
        const nextParams = new URLSearchParams();
        const month = searchParams.get("month");
        if (month) nextParams.set("month", month);
        const includeReimbursements = searchParams.get("includeReimbursements");
        if (includeReimbursements) nextParams.set("includeReimbursements", includeReimbursements);

        const query = nextParams.toString();
        const href = query ? `${pathname}?${query}` : pathname;
        startTransition(() => {
            router.replace(href, { scroll: false });
        });
    };

    // Filter specific tags based on selected category (if any)
    const availableSpecificTags = values.category ? specificTags.filter((tag) => tag.categoryId === values.category) : specificTags;

    return (
        <div className="flex flex-col gap-2">
            {/* Top row: Search input + Compact Sort dropdown */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    {isPending ? <LoaderCircle className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-orchid" aria-hidden /> : <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />}
                    <input type="search" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder={searchPlaceholder ?? "Buscar transação..."} className="h-10 w-full rounded-xl border-0 bg-surface pl-9 pr-8 text-sm text-text focus:outline-2 focus:outline-violet" aria-label={searchPlaceholder ?? "Buscar transações"} />
                    {searchValue ? (
                        <button type="button" onClick={handleClearSearch} aria-label="Limpar busca" className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-text transition-colors">
                            <X className="size-3.5" />
                        </button>
                    ) : null}
                </div>

                <div className="relative shrink-0">
                    <Select
                        id={sortSelectId}
                        size="sm"
                        value={values.sort ?? "date_desc"}
                        onChange={(val) => updateFilter({ sort: val })}
                        icon={<ArrowUpDown className="size-3.5 text-muted shrink-0" aria-hidden="true" />}
                        options={[
                            { value: "date_desc", label: "Mais recentes" },
                            { value: "date_asc", label: "Mais antigas" },
                            { value: "amount_desc", label: "Maior valor" },
                            { value: "amount_asc", label: "Menor valor" },
                        ]}
                        triggerClassName="w-36"
                        align="right"
                        aria-label="Ordenar transações"
                    />
                </div>
            </div>

            {/* Second row: Filter accordion toggle + Clear all button */}
            <div className="flex items-center justify-between">
                <button type="button" onClick={() => setIsExpanded((prev) => !prev)} aria-expanded={isExpanded} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors", activeCriteriaCount > 0 ? "bg-violet/15 text-orchid hover:bg-violet/25" : isExpanded ? "bg-surface-raised text-text" : "bg-surface text-muted hover:text-text")}>
                    <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                    <span>Filtros</span>
                    {activeCriteriaCount > 0 ? <span className="flex size-4 items-center justify-center rounded-full bg-violet text-[10px] font-bold text-ink">{activeCriteriaCount}</span> : null}
                    {isExpanded ? <ChevronUp className="size-3 text-muted" /> : <ChevronDown className="size-3 text-muted" />}
                </button>

                {hasAnyActiveFilter ? (
                    <button type="button" onClick={handleClearAll} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:text-danger transition-colors">
                        <RotateCcw className="size-3" aria-hidden="true" />
                        <span>Limpar filtros</span>
                    </button>
                ) : null}
            </div>

            {/* Expandable Advanced Filters (Category, Payment, General Tag, Specific Tag) */}
            {isExpanded && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Categoria */}
                    <Select
                        id={categorySelectId}
                        size="sm"
                        label="Categoria"
                        value={values.category ?? ""}
                        onChange={(newCat) => {
                            const isSpecificTagValid = !newCat || specificTags.some((t) => t.categoryId === newCat && t.id === values.specificTag);
                            updateFilter({
                                category: newCat || null,
                                specificTag: isSpecificTagValid ? values.specificTag : null,
                            });
                        }}
                        options={[
                            { value: "", label: "Todas" },
                            ...categories.map((c) => ({
                                value: c.id,
                                label: c.name,
                                color: c.color,
                                icon: <DynamicIcon name={c.icon} className="size-3.5" style={{ color: c.color }} />,
                            })),
                        ]}
                    />

                    {/* Pagamento */}
                    {showPaymentMethod && (
                        <Select
                            id={paymentSelectId}
                            size="sm"
                            label="Pagamento"
                            value={values.paymentMethod ?? ""}
                            onChange={(method) => updateFilter({ paymentMethod: method || null })}
                            options={[
                                { value: "", label: "Todos" },
                                ...paymentMethods.map((method) => ({
                                    value: method,
                                    label: paymentMethodLabels[method],
                                })),
                            ]}
                        />
                    )}

                    {/* Tag Geral */}
                    <Select
                        id={generalTagSelectId}
                        size="sm"
                        label="Tag Geral"
                        value={values.generalTag ?? ""}
                        onChange={(tagId) => updateFilter({ generalTag: tagId || null })}
                        options={[
                            { value: "", label: "Todas" },
                            ...generalTags.map((tag) => ({
                                value: tag.id,
                                label: tag.name,
                                color: tag.color,
                                icon: tag.icon ? <DynamicIcon name={tag.icon} className="size-3.5" style={{ color: tag.color }} /> : undefined,
                            })),
                        ]}
                    />

                    {/* Tag Específica */}
                    {availableSpecificTags.length > 0 && (
                        <Select
                            id={specificTagSelectId}
                            size="sm"
                            label="Tag Específica"
                            value={values.specificTag ?? ""}
                            onChange={(tagId) => updateFilter({ specificTag: tagId || null })}
                            options={[
                                { value: "", label: "Todas" },
                                ...availableSpecificTags.map((tag) => ({
                                    value: tag.id,
                                    label: tag.name,
                                    color: tag.color,
                                    icon: tag.icon ? <DynamicIcon name={tag.icon} className="size-3.5" style={{ color: tag.color }} /> : undefined,
                                })),
                            ]}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
