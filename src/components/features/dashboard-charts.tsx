"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { formatBrl } from "@/lib/domain/money";
import type { DashboardCategoryTotal, DashboardHistoryPoint } from "@/lib/data/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/select";
import { formatAxisMonth, formatMonthLabel } from "./params";
import { DynamicIcon } from "./transaction-visuals";

type TooltipRow = {
    title: string;
    fill: string;
    amountCents: number;
    icon?: string;
};

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: TooltipRow }> }) {
    if (!active || !payload?.[0]?.payload) {
        return null;
    }

    const row = payload[0].payload;

    return (
        <div className="flex min-w-40 gap-2.5 rounded-xl border border-surface-raised bg-surface px-3 py-2 shadow-[0_12px_32px_rgb(8_5_16/0.55)]">
            {row.icon ? <DynamicIcon name={row.icon} className="mt-0.5 size-4 shrink-0" style={{ color: row.fill }} /> : <span className="w-0.5 shrink-0 self-stretch rounded-full" style={{ background: row.fill }} aria-hidden />}
            <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-xs font-medium text-muted">{row.title}</p>
                <p className="tabular text-sm font-semibold text-text">{formatBrl(row.amountCents)}</p>
            </div>
        </div>
    );
}

const tooltipWrapperStyle = { outline: "none", zIndex: 20 };
const tooltipContentStyle = { background: "transparent", border: "none", padding: 0, boxShadow: "none" };
const tooltipCursor = { fill: "rgba(167, 139, 250, 0.12)" };

function ChartViewport({ className, height, width, children }: { className: string; height?: number; width?: string; children: ReactNode }) {
    const ready = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );

    return (
        <div className={cn("outline-none", className)} style={{ height, width }} aria-hidden>
            {ready ? children : null}
        </div>
    );
}

export function CategoryChart({ items, selectedCategoryId }: { items: DashboardCategoryTotal[]; selectedCategoryId?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const reduce = useReducedMotion();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();

    const rows = items
        .filter((item) => item.amountCents > 0)
        .map((item) => ({
            ...item,
            label: item.name,
            title: item.name,
            fill: item.color,
        }))
        .sort((a, b) => b.amountCents - a.amountCents);

    const selectedRow = selectedCategoryId ? rows.find((r) => r.categoryId === selectedCategoryId) : null;

    const handleSelectCategory = useCallback(
        (categoryId: string) => {
            const nextParams = new URLSearchParams(searchParams.toString());
            const isCurrentlySelected = selectedCategoryId === categoryId;

            if (isCurrentlySelected) {
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
        [pathname, router, searchParams, selectedCategoryId, startTransition],
    );

    if (rows.length === 0) {
        return (
            <Card>
                <p className="text-sm text-muted">Nenhum gasto por categoria neste mês.</p>
            </Card>
        );
    }

    return (
        <Card
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsOpen((prev) => !prev);
                }
            }}
            className="flex flex-col gap-3 cursor-pointer select-none transition-colors hover:bg-surface-raised/20 outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-lg font-bold text-text">Por Categoria</h2>
                    {selectedRow ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelectCategory(selectedRow.categoryId);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-violet/15 px-2.5 py-0.5 text-xs font-medium text-violet border border-violet/30 hover:bg-violet/25 transition-colors cursor-pointer"
                            title="Remover filtro de categoria"
                        >
                            <span className="size-2 rounded-full shrink-0" style={{ background: selectedRow.fill }} />
                            <span className="truncate max-w-28">{selectedRow.name}</span>
                            <X className="size-3 shrink-0" />
                        </button>
                    ) : null}
                </div>
                <ChevronDown className={cn("size-4 text-muted transition-transform duration-200", isOpen && "rotate-180 text-violet")} aria-hidden />
            </div>

            <ChartViewport className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={rows}
                        layout="vertical"
                        margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
                        onClick={(state, event) => {
                            event?.stopPropagation?.();
                            const index = typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : typeof state?.activeIndex === "number" ? state.activeIndex : -1;
                            if (index >= 0 && rows[index]) {
                                handleSelectCategory(rows[index].categoryId);
                            } else if (state?.activeLabel) {
                                const row = rows.find((r) => r.label === state.activeLabel);
                                if (row) {
                                    handleSelectCategory(row.categoryId);
                                }
                            }
                        }}
                    >
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="label" width={92} tick={{ fill: "var(--muted)", fontSize: 12, cursor: "pointer" }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={tooltipCursor} content={<ChartTooltip />} wrapperStyle={tooltipWrapperStyle} contentStyle={tooltipContentStyle} />
                        <Bar dataKey="amountCents" radius={[0, 8, 8, 0]} isAnimationActive={!reduce} maxBarSize={22} cursor="pointer">
                            {rows.map((row) => {
                                const isSelected = selectedCategoryId === row.categoryId;
                                const isDimmed = Boolean(selectedCategoryId && !isSelected);

                                return (
                                    <Cell
                                        key={row.categoryId}
                                        fill={row.fill}
                                        cursor="pointer"
                                        opacity={isDimmed ? 0.35 : 1}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectCategory(row.categoryId);
                                        }}
                                        style={{
                                            transition: "opacity 200ms ease, filter 200ms ease",
                                            filter: isSelected ? "drop-shadow(0 0 6px rgba(167, 139, 250, 0.45))" : undefined,
                                        }}
                                    />
                                );
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartViewport>

            {isOpen ? (
                <ul className="flex flex-col gap-1 border-t border-surface-raised/70 pt-3">
                    {rows.map((row) => (
                        <CategoryLegendItem key={row.categoryId} row={row} isSelected={row.categoryId === selectedCategoryId} onSelect={() => handleSelectCategory(row.categoryId)} />
                    ))}
                </ul>
            ) : null}
        </Card>
    );
}

function CategoryLegendItem({ row, isSelected, onSelect }: { row: { categoryId: string; label: string; fill: string; icon: string; amountCents: number }; isSelected: boolean; onSelect: () => void }) {
    return (
        <li>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                }}
                className={cn("flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-sm transition-all text-left outline-none focus-visible:ring-1 focus-visible:ring-violet", isSelected ? "bg-surface-raised font-medium ring-1 ring-violet/50" : "hover:bg-surface-raised/50")}
            >
                <span className={cn("inline-flex items-center gap-2", isSelected ? "text-text font-medium" : "text-muted")}>
                    <DynamicIcon name={row.icon} className="size-4" style={{ color: row.fill }} />
                    {row.label}
                </span>
                <div className="flex items-center gap-2">
                    <span className="tabular text-text">{formatBrl(row.amountCents)}</span>
                    {isSelected ? <span className="text-[11px] font-semibold text-violet bg-violet/10 px-1.5 py-0.5 rounded-md">Ativo</span> : null}
                </div>
            </button>
        </li>
    );
}

const HISTORY_RANGES = [
    { value: "6", label: "6 meses" },
    { value: "12", label: "12 meses" },
    { value: "24", label: "24 meses" },
    { value: "all", label: "Todos" },
] as const;

type HistoryRange = (typeof HISTORY_RANGES)[number]["value"];
const DEFAULT_HISTORY_RANGE: HistoryRange = "6";
const HISTORY_COLUMN_WIDTH = 52;

function isHistoryRange(value: string): value is HistoryRange {
    return HISTORY_RANGES.some((option) => option.value === value);
}

function visibleHistory(items: DashboardHistoryPoint[], range: HistoryRange) {
    const rows = items.filter((item) => item.amountCents > 0).toSorted((a, b) => a.month.localeCompare(b.month));

    if (range === "all") {
        return rows;
    }

    return rows.slice(-Number(range));
}

export function HistoryChart({ items }: { items: DashboardHistoryPoint[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const reduce = useReducedMotion();
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [range, setRange] = useState<HistoryRange>(DEFAULT_HISTORY_RANGE);
    const rows = visibleHistory(items, range).map((item) => ({
        ...item,
        label: formatAxisMonth(item.month),
        title: formatMonthLabel(item.month),
        fill: "var(--violet)",
    }));

    useEffect(() => {
        const node = scrollerRef.current;

        if (node) {
            node.scrollLeft = node.scrollWidth;
        }
    }, [range, rows.length]);

    if (items.every((item) => item.amountCents <= 0)) {
        return null;
    }

    return (
        <Card
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsOpen((prev) => !prev);
                }
            }}
            className="flex flex-col gap-3 cursor-pointer select-none transition-colors hover:bg-surface-raised/20 outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-text">Histórico Mensal</h2>
                <div className="flex items-center gap-2">
                    <div className="w-28 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Select
                            id="historyRange"
                            aria-label="Meses"
                            value={range}
                            size="sm"
                            onChange={(value) => {
                                if (isHistoryRange(value)) {
                                    setRange(value);
                                }
                            }}
                            triggerClassName="bg-surface-raised py-1 text-xs"
                        >
                            {HISTORY_RANGES.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <ChevronDown className={cn("size-4 text-muted transition-transform duration-200", isOpen && "rotate-180 text-violet")} aria-hidden />
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="text-sm text-muted">Ainda não há histórico mensal.</p>
            ) : (
                <>
                    <div ref={scrollerRef} className="overflow-x-auto overscroll-x-contain">
                        <ChartViewport className="h-48 min-w-full" width={`max(100%, ${rows.length * HISTORY_COLUMN_WIDTH}px)`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                                    <XAxis dataKey="label" interval={0} tick={{ fill: "var(--muted)", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip cursor={tooltipCursor} content={<ChartTooltip />} wrapperStyle={tooltipWrapperStyle} contentStyle={tooltipContentStyle} />
                                    <Bar dataKey="amountCents" fill="var(--violet)" radius={[8, 8, 0, 0]} isAnimationActive={!reduce} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartViewport>
                    </div>

                    {isOpen ? (
                        <ol className="flex flex-col gap-2 border-t border-surface-raised/70 pt-3">
                            {rows.map((row) => (
                                <li key={row.month} className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-text">{row.title}</span>
                                    <span className="tabular text-sm font-semibold text-text">{formatBrl(row.amountCents)}</span>
                                </li>
                            ))}
                        </ol>
                    ) : null}
                </>
            )}
        </Card>
    );
}
